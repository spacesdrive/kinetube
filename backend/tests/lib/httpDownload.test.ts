import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { describe, test } from 'node:test';

import { downloadFileWithProgress } from '../../src/lib/httpDownload.ts';
import { makeTempDir, removeDir } from '../fixtures/tempDir.ts';

import type { AddressInfo } from 'node:net';
import type { TransferProgress } from '@shared/api.ts';

// a throwaway local server, so the real redirect and streaming code runs without the network
async function withServer(handler: http.RequestListener, run: (baseUrl: string, dir: string) => Promise<void>): Promise<void> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const dir = makeTempDir('kinetube-download-test-');
  try {
    await run(`http://127.0.0.1:${port}`, dir);
  } finally {
    server.close();
    removeDir(dir);
  }
}

describe('downloadFileWithProgress', () => {
  test('a file downloads completely and progress reaches 100 percent', async () => {
    const body = Buffer.from('x'.repeat(10_000));
    await withServer((_req, res) => res.writeHead(200, { 'Content-Length': body.length }).end(body), async (baseUrl, dir) => {
      const destination = path.join(dir, 'out.bin');
      const events: TransferProgress[] = [];

      await downloadFileWithProgress(baseUrl, destination, (progress) => events.push(progress));

      assert.deepEqual(fs.readFileSync(destination), body);
      const last = events.at(-1);
      assert.equal(last?.totalBytes, body.length);
      assert.equal(last?.downloadedBytes, body.length);
      assert.equal(last?.percent, 100);
    });
  });

  test('redirects are followed before the file is written', async () => {
    const body = Buffer.from('redirected content');
    const handler: http.RequestListener = (req, res) => {
      if (req.url === '/start') res.writeHead(302, { Location: '/final' }).end();
      else res.writeHead(200, { 'Content-Length': body.length }).end(body);
    };
    await withServer(handler, async (baseUrl, dir) => {
      const destination = path.join(dir, 'out.bin');
      await downloadFileWithProgress(`${baseUrl}/start`, destination);
      assert.deepEqual(fs.readFileSync(destination), body);
    });
  });

  test('a redirect loop stops at the limit and leaves no partial file', async () => {
    await withServer((_req, res) => res.writeHead(302, { Location: '/loop' }).end(), async (baseUrl, dir) => {
      const destination = path.join(dir, 'out.bin');
      await assert.rejects(downloadFileWithProgress(`${baseUrl}/loop`, destination, undefined, 2), /Too many redirects/);
      assert.equal(fs.existsSync(destination), false);
    });
  });

  test('a non-200 answer fails with its status and leaves no partial file', async () => {
    await withServer((_req, res) => res.writeHead(404).end('not found'), async (baseUrl, dir) => {
      const destination = path.join(dir, 'out.bin');
      await assert.rejects(downloadFileWithProgress(baseUrl, destination), /HTTP 404/);
      assert.equal(fs.existsSync(destination), false);
    });
  });

  test('a connection that drops mid-file fails and the partial file is removed', async () => {
    const handler: http.RequestListener = (_req, res) => {
      res.writeHead(200, { 'Content-Length': '10000' });
      res.write('partial');
      res.socket?.destroy();
    };
    await withServer(handler, async (baseUrl, dir) => {
      const destination = path.join(dir, 'out.bin');
      await assert.rejects(downloadFileWithProgress(baseUrl, destination));
      assert.equal(fs.existsSync(destination), false);
    });
  });

  test('a destination folder that does not exist makes the download fail', async () => {
    await withServer((_req, res) => res.writeHead(200, { 'Content-Length': 4 }).end('data'), async (baseUrl, dir) => {
      await assert.rejects(downloadFileWithProgress(baseUrl, path.join(dir, 'missing', 'out.bin')));
    });
  });
});
