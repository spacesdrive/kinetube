// lets electron-builder unpack winCodeSign on Windows without symlink rights by skipping darwin/ (see RELEASE.md)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sevenZipDir = path.join(import.meta.dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64');
const originalExe = path.join(sevenZipDir, '7za.exe');
const realExe = path.join(sevenZipDir, '7za-real.exe');

// csc.exe ships with the .NET Framework on every supported Windows install
const CSC_CANDIDATES = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
];

// forwards every argument unchanged and adds -xr!darwin to extract and list commands
const WRAPPER_SOURCE = `
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

class SevenZipWrapper {
    static int Main(string[] args) {
        string dir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
        string real = Path.Combine(dir, "7za-real.exe");
        var list = new List<string>(args);
        bool isExtract = list.Count > 0 && (list[0] == "x" || list[0] == "e" || list[0] == "l");
        if (isExtract) list.Add("-xr!darwin");

        var arguments = new StringBuilder();
        foreach (var arg in list) {
            if (arguments.Length > 0) arguments.Append(' ');
            bool needsQuotes = arg.IndexOf(' ') >= 0;
            if (needsQuotes) arguments.Append('"');
            arguments.Append(arg);
            if (needsQuotes) arguments.Append('"');
        }

        var process = Process.Start(new ProcessStartInfo { FileName = real, Arguments = arguments.ToString(), UseShellExecute = false });
        process.WaitForExit();
        return process.ExitCode;
    }
}
`.trim();

function stop(message: string, exitCode: number): never {
  const write = exitCode === 0 ? console.log : console.error;
  write(message);
  process.exit(exitCode);
}

function compileWrapper(cscExe: string): string {
  const sourcePath = path.join(os.tmpdir(), 'SevenZipWrapper.cs');
  const exePath = path.join(os.tmpdir(), '7za-wrapper.exe');
  fs.writeFileSync(sourcePath, WRAPPER_SOURCE, 'utf8');
  execFileSync(cscExe, ['/nologo', `/out:${exePath}`, '/target:exe', sourcePath], { stdio: 'inherit' });
  if (!fs.existsSync(exePath)) stop(`The compiled wrapper wasn't found at ${exePath}.`, 1);
  return exePath;
}

function patch(): void {
  if (process.platform !== 'win32') stop('Not Windows, so 7-Zip needs no patch.', 0);
  if (fs.existsSync(realExe)) stop('7za.exe is already patched.', 0);
  if (!fs.existsSync(originalExe)) stop('7za.exe was not found, so there is nothing to patch.', 0);

  const cscExe = CSC_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!cscExe) stop("csc.exe wasn't found, so the 7-Zip wrapper can't be compiled. Install the .NET Framework 4.", 1);

  const wrapperExe = compileWrapper(cscExe);
  fs.renameSync(originalExe, realExe);
  fs.copyFileSync(wrapperExe, originalExe);
  console.log('7za.exe patched: extractions skip the macOS darwin/ folder, so electron-builder needs no symlink rights.');
}

patch();
