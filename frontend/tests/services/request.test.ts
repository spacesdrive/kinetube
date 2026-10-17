import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request, requestNoContent } from '@/services/request';

afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('calls the versioned API and returns the parsed body', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [], total: 0 })));
    vi.stubGlobal('fetch', fetchMock);

    expect(await request('/downloads')).toEqual({ data: [], total: 0 });
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('/api/v1/downloads');
  });

  it("throws an ApiError with the backend's code and message for a non-2xx answer", async () => {
    const body = { success: false, code: 'NOT_FOUND', message: "That download doesn't exist.", requestId: 'r1' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 404 })));

    const failure = await request('/downloads/x').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND', message: "That download doesn't exist." });
  });

  it('explains an answer that is not the error shape instead of showing raw text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 500 })));
    await expect(request('/tools')).rejects.toThrow('status 500');
  });

  it('says the backend could not be reached when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(request('/tools')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('accepts a 204 answer with no body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(requestNoContent('/downloads/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
