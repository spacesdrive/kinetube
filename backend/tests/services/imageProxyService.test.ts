import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createImageProxyService, isAllowedImageHost } from '../../src/services/imageProxyService.ts';

function fakeFetch(responses: Record<string, Response>): typeof fetch {
  return async (input) => {
    const url = input instanceof URL ? input.toString() : String(input);
    const response = responses[url];
    if (!response) throw new Error(`unexpected fetch of ${url}`);
    return response;
  };
}

describe('isAllowedImageHost', () => {
  test('a listed CDN and its subdomains are allowed', () => {
    assert.equal(isAllowedImageHost('cdninstagram.com'), true);
    assert.equal(isAllowedImageHost('scontent-lhr8-1.cdninstagram.com'), true);
    assert.equal(isAllowedImageHost('i.ytimg.com'), true);
  });

  test('a host that only ends with a listed name is refused', () => {
    assert.equal(isAllowedImageHost('evilcdninstagram.com'), false);
    assert.equal(isAllowedImageHost('cdninstagram.com.evil.example'), false);
  });
});

describe('imageProxyService', () => {
  test('an image from an allowed host is passed through with its content type', async () => {
    const url = 'https://i.ytimg.com/vi/x/hqdefault.jpg';
    const service = createImageProxyService(fakeFetch({ [url]: new Response('jpeg bytes', { headers: { 'content-type': 'image/jpeg' } }) }));

    const image = await service.fetchImage(url);
    assert.equal(image.contentType, 'image/jpeg');
  });

  test('plain http and hosts off the list are refused before any request is made', async () => {
    const service = createImageProxyService(fakeFetch({}));
    await assert.rejects(service.fetchImage('http://i.ytimg.com/x.jpg'), { name: 'ForbiddenError' });
    await assert.rejects(service.fetchImage('https://evil.example/x.png'), { name: 'ForbiddenError' });
  });

  test('a redirect to a host off the list is refused', async () => {
    const url = 'https://i.ytimg.com/redirect.jpg';
    const redirect = new Response(null, { status: 302, headers: { location: 'https://169.254.169.254/latest/meta-data' } });
    await assert.rejects(createImageProxyService(fakeFetch({ [url]: redirect })).fetchImage(url), { name: 'ForbiddenError' });
  });

  test('an answer that is not an image is refused', async () => {
    const url = 'https://i.ytimg.com/page';
    const page = new Response('<html>', { headers: { 'content-type': 'text/html' } });
    await assert.rejects(createImageProxyService(fakeFetch({ [url]: page })).fetchImage(url), { name: 'UpstreamError' });
  });
});
