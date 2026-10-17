// starts Electron without the ELECTRON_RUN_AS_NODE that editor terminals leak, which breaks electron-updater (ADR-018)

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

// the electron package's main export is the path to its binary
const electronPath = createRequire(import.meta.url)('electron') as string;

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['--no-deprecation', path.join(import.meta.dirname, '..')], { stdio: 'inherit', env });

child.on('exit', (exitCode) => process.exit(exitCode ?? 0));
child.on('error', (error) => {
  console.error(`Couldn't start Electron: ${error.message}`);
  process.exit(1);
});
