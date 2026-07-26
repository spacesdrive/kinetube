# Guide: Adding or Extending a Managed External Tool

Use this when adding support for a new external binary (following the pattern of yt-dlp/ffmpeg/whisper.cpp/instaloader), or when extending an existing manager to support a platform it doesn't yet handle. Read `docs/architecture/backend/MANAGERS.md` and `docs/philosophy/CROSS_PLATFORM.md` first - the latter documents exactly why every existing manager is Windows-only and what fixing that requires.

## Decision Checklist Before Starting

1. **Does the tool publish prebuilt binaries for Windows, macOS, and Linux?** If not for all three, the manager must degrade gracefully on the missing platform (clear "not supported on this OS yet" error, not a silent hang or a crash) rather than pretending it's available.
2. **What's the asset naming convention per platform/arch?** (e.g. yt-dlp publishes `yt-dlp.exe`, `yt-dlp_macos`, `yt-dlp_linux` as separate assets on the same GitHub release)
3. **Does the binary need `chmod +x` after extraction on macOS/Linux?** Windows doesn't need this; POSIX does.
4. **Where does the writable install path come from?** Always `backend/utils/paths.js`'s `DOWNLOADS_DIR`/`MODELS_DIR` - never a path relative to the manager's own `__dirname`.

Record the answers in `DECISIONS.md` as a new ADR before writing code, matching the existing ADR format used for this project (see `DECISIONS.md`).

## File Checklist

| Action | File |
|---|---|
| Create or extend | `backend/utils/myToolManager.js` |
| Modify (if the tool needs a new route) | `backend/routes/myFeature.js` or an existing route file |
| Modify | `docs/architecture/backend/MANAGERS.md` |
| Modify | `docs/philosophy/CROSS_PLATFORM.md` (update the gap list - remove the tool once cross-platform, or note partial progress) |
| Modify | `DECISIONS.md` (new ADR) |
| Modify | `CHANGELOG.md` |

## Step 1: Platform-Aware Asset Resolution

```js
const os = require('os');

function getAssetUrl() {
    const platform = process.platform; // 'win32' | 'darwin' | 'linux'
    if (platform === 'win32')  return 'https://example.com/releases/tool-windows.zip';
    if (platform === 'darwin') return 'https://example.com/releases/tool-macos.zip';
    if (platform === 'linux')  return 'https://example.com/releases/tool-linux.zip';
    throw new Error(`No prebuilt binary available for platform: ${platform}`);
}

function getBinaryName() {
    return process.platform === 'win32' ? 'tool.exe' : 'tool';
}
```

Never assume `win32` - branch explicitly on all three platforms you intend to support, and fail loudly (a clear thrown error or `phase: 'error'` event) for any platform you don't.

## Step 2: Extraction and Permissions

```js
// after extracting the binary to DOWNLOADS_DIR:
if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
}
```

macOS-downloaded binaries may also be Gatekeeper-quarantined (`com.apple.quarantine` extended attribute) depending on how they were packaged upstream - research this via Parallel Search for the specific tool before assuming a plain download-and-chmod is sufficient.

## Step 3: Manager Function Shape

Match the existing contract from `docs/architecture/backend/MANAGERS.md`:

```js
function getToolPath() {
    const name = getBinaryName();
    const p = path.join(DOWNLOADS_DIR, name);
    return fs.existsSync(p) ? p : null;
}

function isToolReady() { return getToolPath() !== null; }

async function ensureTool(onEvent) {
    if (isToolReady()) {
        onEvent?.('phase', { tool: 'mytool', phase: 'done', message: 'already installed', skipped: true });
        return true;
    }
    try {
        onEvent?.('phase', { tool: 'mytool', phase: 'downloading', message: 'Downloading...' });
        await downloadFileWithProgress(getAssetUrl(), zipPath, (p) => onEvent?.('progress', { tool: 'mytool', ...p }));
        // extract, chmod if POSIX, verify the binary exists
        onEvent?.('phase', { tool: 'mytool', phase: 'done', message: 'installed successfully' });
        return true;
    } catch (err) {
        onEvent?.('phase', { tool: 'mytool', phase: 'error', message: err.message });
        return false;
    }
}

module.exports = { getToolPath, isToolReady, ensureTool };
```

## Step 4: Update the Cross-Platform Gap List

Every manager change should leave `docs/philosophy/CROSS_PLATFORM.md` accurate. If you fixed yt-dlp for macOS but not ffmpeg, say exactly that - partial progress recorded precisely is more useful than an optimistic "cross-platform support added" that isn't fully true yet.

## Step 5: Test

Automated tests should cover any pure logic extracted from the manager (asset URL selection given a mocked `process.platform`, binary name resolution). The download/extract/spawn path itself is verified manually per platform - see `docs/workflows/TESTING.md`'s manual checklist, and add a platform-specific row there if this tool introduces new manual steps.
