/**
 * Patches 7za.exe so electron-builder can build on Windows without
 * symlink privileges (Developer Mode / admin not required).
 *
 * Problem: The winCodeSign archive contains macOS dylib symlinks.
 *          Windows can't create symlinks without elevated privileges,
 *          so 7-zip exits with code 2 (error) and electron-builder fails.
 *
 * Fix: Replace 7za.exe with a thin C# wrapper that appends `-xr!darwin`
 *      to every extraction call, skipping the macOS directory entirely.
 *      The darwin/ folder is never used on Windows builds anyway.
 *
 * Run once after `npm install`:  node scripts/patch-7zip.js
 * The postinstall script in package.json runs it automatically.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

if (process.platform !== 'win32') {
  console.log('Not Windows — patch not needed.');
  process.exit(0);
}

const sevenZipDir = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64');
const origExe     = path.join(sevenZipDir, '7za.exe');
const realExe     = path.join(sevenZipDir, '7za-real.exe');

if (!fs.existsSync(origExe) && !fs.existsSync(realExe)) {
  console.log('7za.exe not found — nothing to patch.');
  process.exit(0);
}

if (fs.existsSync(realExe)) {
  console.log('✅  7za.exe already patched, skipping.');
  process.exit(0);
}

// ── Locate csc.exe (ships with .NET Framework on all Windows installs) ─────────
const CSC_CANDIDATES = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
];
const cscExe = CSC_CANDIDATES.find(p => fs.existsSync(p));
if (!cscExe) {
  console.error('❌  csc.exe not found. Cannot compile wrapper.');
  process.exit(1);
}

// ── C# source ─────────────────────────────────────────────────────────────────
// Strategy: forward ALL original args unchanged, but append -xr!darwin to
// any `x` (extract) command.  This excludes the darwin/ sub-tree which
// contains macOS dylib symlinks that Windows cannot create without privileges.
const cs = `
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

class SevenZipWrapper {
    static int Main(string[] args) {
        string dir  = Path.GetDirectoryName(
                          System.Reflection.Assembly.GetExecutingAssembly().Location);
        string real = Path.Combine(dir, "7za-real.exe");

        var list = new List<string>(args);

        // When extracting (first arg is x/e/l), exclude the darwin/ directory.
        // That directory only holds macOS signing libs with symlinks —
        // they are never needed for Windows builds.
        bool isExtract = list.Count > 0 &&
                         (list[0] == "x" || list[0] == "e" || list[0] == "l");
        if (isExtract) {
            list.Add("-xr!darwin");
        }

        // Rebuild argument string, quoting args that contain spaces.
        var sb = new StringBuilder();
        foreach (var a in list) {
            if (sb.Length > 0) sb.Append(' ');
            bool q = a.IndexOf(' ') >= 0;
            if (q) sb.Append('"');
            sb.Append(a);
            if (q) sb.Append('"');
        }

        var psi = new ProcessStartInfo {
            FileName        = real,
            Arguments       = sb.ToString(),
            UseShellExecute = false,
            CreateNoWindow  = false,
        };
        var proc = Process.Start(psi);
        proc.WaitForExit();
        return proc.ExitCode;
    }
}
`.trim();

// ── Compile ────────────────────────────────────────────────────────────────────
const tmpCs  = path.join(os.tmpdir(), 'SevenZipWrapper.cs');
const tmpExe = path.join(os.tmpdir(), '7za-wrapper.exe');

fs.writeFileSync(tmpCs, cs, 'utf8');

try {
  execSync(`"${cscExe}" /nologo /out:"${tmpExe}" /target:exe "${tmpCs}"`, { stdio: 'inherit' });
} catch {
  console.error('❌  Compilation failed.');
  process.exit(1);
}

if (!fs.existsSync(tmpExe)) {
  console.error('❌  Compiled exe not found at', tmpExe);
  process.exit(1);
}

// ── Swap ───────────────────────────────────────────────────────────────────────
fs.renameSync(origExe, realExe);
fs.copyFileSync(tmpExe, origExe);

console.log('✅  7za.exe patched — macOS darwin/ directory excluded from all extractions.');
console.log('   electron-builder will now build without needing symlink privileges.');
