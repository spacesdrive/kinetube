const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { downloadFileWithProgress } = require('../utils/download');

// Spins up a throwaway local HTTP server so these tests exercise the real
// redirect-following/streaming code path without touching the network.
function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function serverUrl(server, urlPath = '/') {
  return `http://127.0.0.1:${server.address().port}${urlPath}`;
}

function tmpDest() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kinetube-download-test-')), 'out.bin');
}

describe('downloadFileWithProgress', () => {
  test('downloads a file and reports progress up to 100%', async () => {
    const body = Buffer.from('x'.repeat(10_000));
    const server = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Length': body.length });
      res.end(body);
    });
    const dest = tmpDest();
    const events = [];

    try {
      await downloadFileWithProgress(serverUrl(server), dest, (p) => events.push(p));

      assert.ok(fs.existsSync(dest));
      assert.deepEqual(fs.readFileSync(dest), body);
      assert.ok(events.length > 0, 'onProgress should fire at least once');
      const last = events[events.length - 1];
      assert.equal(last.total, body.length);
      assert.equal(last.downloaded, body.length);
      assert.equal(last.percent, 100);
    } finally {
      server.close();
      fs.rmSync(path.dirname(dest), { recursive: true, force: true });
    }
  });

  test('follows redirects before downloading', async () => {
    const body = Buffer.from('redirected content');
    const server = await startServer((req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/final' });
        res.end();
      } else {
        res.writeHead(200, { 'Content-Length': body.length });
        res.end(body);
      }
    });
    const dest = tmpDest();

    try {
      await downloadFileWithProgress(serverUrl(server, '/start'), dest);
      assert.deepEqual(fs.readFileSync(dest), body);
    } finally {
      server.close();
      fs.rmSync(path.dirname(dest), { recursive: true, force: true });
    }
  });

  test('rejects after exhausting the redirect limit', async () => {
    const server = await startServer((req, res) => {
      res.writeHead(302, { Location: '/loop' });
      res.end();
    });
    const dest = tmpDest();

    try {
      await assert.rejects(
        downloadFileWithProgress(serverUrl(server, '/loop'), dest, null, 2),
        /Too many redirects/,
      );
      assert.ok(!fs.existsSync(dest), 'partial file should be cleaned up on failure');
    } finally {
      server.close();
      fs.rmSync(path.dirname(dest), { recursive: true, force: true });
    }
  });

  test('rejects on a non-200 response and does not leave a partial file', async () => {
    const server = await startServer((req, res) => {
      res.writeHead(404);
      res.end('not found');
    });
    const dest = tmpDest();

    try {
      await assert.rejects(
        downloadFileWithProgress(serverUrl(server), dest),
        /HTTP 404/,
      );
      assert.ok(!fs.existsSync(dest));
    } finally {
      server.close();
      fs.rmSync(path.dirname(dest), { recursive: true, force: true });
    }
  });

  test('rejects and cleans up the partial file when the connection drops mid-response', async () => {
    const server = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Length': '10000' });
      res.write('partial');
      res.socket.destroy();
    });
    const dest = tmpDest();

    try {
      await assert.rejects(downloadFileWithProgress(serverUrl(server), dest));
      assert.ok(!fs.existsSync(dest), 'partial file should be cleaned up when the response errors mid-stream');
    } finally {
      server.close();
      fs.rmSync(path.dirname(dest), { recursive: true, force: true });
    }
  });

  test('rejects when the destination directory does not exist', async () => {
    const body = Buffer.from('data');
    const server = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Length': body.length });
      res.end(body);
    });

    try {
      await assert.rejects(
        downloadFileWithProgress(serverUrl(server), path.join(os.tmpdir(), 'kinetube-nonexistent-dir', 'out.bin')),
      );
    } finally {
      server.close();
    }
  });
});
