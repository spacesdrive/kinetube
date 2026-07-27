import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getJSON, postJSON, postJSONStrict, postRequest, deleteRequest } from '../api';

function mockFetchOnce(status, body) {
  window.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('getJSON', () => {
  beforeEach(() => { mockFetchOnce(200, { path: '/downloads' }); });

  it('issues a plain GET and returns the parsed body', async () => {
    const data = await getJSON('/api/dialog/folder');
    expect(window.fetch).toHaveBeenCalledWith('/api/dialog/folder');
    expect(data).toEqual({ path: '/downloads' });
  });

  it('returns the parsed body even on a non-2xx response, without throwing', async () => {
    mockFetchOnce(404, { valid: false });
    await expect(getJSON('/api/validate-path?dir=x')).resolves.toEqual({ valid: false });
  });
});

describe('postRequest', () => {
  it('sends a JSON-encoded POST with the correct headers', async () => {
    mockFetchOnce(200, { status: 'success' });
    await postRequest('/api/instagram/login', { username: 'a', password: 'b' });
    expect(window.fetch).toHaveBeenCalledWith('/api/instagram/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'a', password: 'b' }),
    });
  });
});

describe('postJSON', () => {
  it('returns the parsed body without throwing on failure', async () => {
    mockFetchOnce(400, { status: 'error', message: 'Invalid code.' });
    const data = await postJSON('/api/instagram/login/2fa', { code: '000000' });
    expect(data).toEqual({ status: 'error', message: 'Invalid code.' });
  });
});

describe('postJSONStrict', () => {
  it('resolves with the parsed body on success', async () => {
    mockFetchOnce(200, { title: 'A video' });
    await expect(postJSONStrict('/api/info', { url: 'https://youtu.be/x' })).resolves.toEqual({ title: 'A video' });
  });

  it('throws using the error/hint/detail fields on failure', async () => {
    mockFetchOnce(400, { error: 'Invalid URL', hint: 'Paste a full YouTube link' });
    await expect(postJSONStrict('/api/info', { url: 'bad' })).rejects.toThrow('Invalid URL — Paste a full YouTube link');
  });

  it('falls back to the provided message when the body has no error fields', async () => {
    mockFetchOnce(500, {});
    await expect(postJSONStrict('/api/info', { url: 'x' }, 'Failed to fetch info')).rejects.toThrow('Failed to fetch info');
  });

  it('falls back to a generic message when none is provided', async () => {
    mockFetchOnce(500, {});
    await expect(postJSONStrict('/api/info', { url: 'x' })).rejects.toThrow('Request failed.');
  });
});

describe('deleteRequest', () => {
  it('sends a DELETE request to the given path', async () => {
    mockFetchOnce(200, {});
    await deleteRequest('/api/instagram/accounts/someuser');
    expect(window.fetch).toHaveBeenCalledWith('/api/instagram/accounts/someuser', { method: 'DELETE' });
  });
});
