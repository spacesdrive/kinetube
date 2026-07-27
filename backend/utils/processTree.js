const { spawn } = require('child_process');

// yt-dlp's Windows and macOS/Linux builds are PyInstaller "onefile" binaries:
// the process Node spawns is a launcher that unpacks itself and starts a
// second, separate OS process to do the actual download work, then just
// waits on it. A plain proc.kill() only ends the launcher - the real yt-dlp
// process is left running, orphaned and completely unaffected, which is why
// naive cancel/pause implementations appear to silently do nothing until the
// download finishes on its own. Killing the whole process tree reaches the
// real worker too.
//
// Windows has no process-group concept for a plain spawn(), so `taskkill`'s
// /T (tree) flag is used instead. On macOS/Linux the caller must spawn the
// target with `detached: true`, which makes it the leader of a new process
// group; killing the negative PID sends the signal to that whole group.
function killProcessTree(proc) {
  if (!proc || proc.pid == null) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { windowsHide: true }).on('error', () => {});
  } else {
    try { process.kill(-proc.pid, 'SIGTERM'); } catch { /* already exited */ }
  }
}

module.exports = { killProcessTree };
