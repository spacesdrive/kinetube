import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { NotSupportedError, UpstreamError } from '../../src/lib/errors.ts';
import { createFolderService } from '../../src/services/folderService.ts';
import { NO_LINUX_PICKER } from '../../src/services/folders/linuxPicker.ts';

import type { ProcessResult, ProcessRunner } from '../../src/lib/runProcess.ts';

type FakeAnswer = Partial<ProcessResult> | 'missing';

interface FakeRunner {
  run: ProcessRunner;
  commands: string[];
  argsOf(command: string): string[];
}

// each command answers as scripted; "missing" fails to start the way spawn does when a program is not installed
function createFakeRunner(answers: Record<string, FakeAnswer>): FakeRunner {
  const calls: { command: string; args: string[] }[] = [];
  const run: ProcessRunner = async (command, args) => {
    calls.push({ command, args });
    const answer = answers[command] ?? 'missing';
    if (answer === 'missing') throw Object.assign(new Error(`spawn ${command} ENOENT`), { code: 'ENOENT' });
    return { exitCode: 0, stdout: '', stderr: '', isTimedOut: false, ...answer };
  };
  return {
    run,
    get commands() {
      return calls.map((call) => call.command);
    },
    argsOf: (command) => calls.find((call) => call.command === command)?.args ?? [],
  };
}

describe('folderService.pick', () => {
  describe('on Windows', () => {
    test('the chosen folder comes back from the PowerShell dialog', async () => {
      const runner = createFakeRunner({ powershell: { stdout: 'C:\\Users\\you\\Videos\r\n' } });
      assert.deepEqual(await createFolderService('win32', runner.run).pick(), { path: 'C:\\Users\\you\\Videos' });
      assert.ok(runner.argsOf('powershell').includes('-EncodedCommand'));
    });

    test('closing the dialog gives no folder', async () => {
      const runner = createFakeRunner({ powershell: { stdout: '' } });
      assert.deepEqual(await createFolderService('win32', runner.run).pick(), { path: null });
    });

    test('a missing PowerShell says to type the path', async () => {
      const runner = createFakeRunner({});
      await assert.rejects(createFolderService('win32', runner.run).pick(), NotSupportedError);
    });
  });

  describe('on macOS', () => {
    test('the chosen folder comes back from osascript without its trailing slash', async () => {
      const runner = createFakeRunner({ osascript: { stdout: '/Users/you/Movies/\n' } });
      assert.deepEqual(await createFolderService('darwin', runner.run).pick(), { path: '/Users/you/Movies' });
      assert.match(runner.argsOf('osascript').join(' '), /POSIX path of \(choose folder with prompt "Select Download Folder"\)/);
    });

    test('pressing Cancel gives no folder', async () => {
      const stderr = '0:76: execution error: User canceled. (-128)\n';
      const runner = createFakeRunner({ osascript: { exitCode: 1, stderr } });
      assert.deepEqual(await createFolderService('darwin', runner.run).pick(), { path: null });
    });

    test('any other osascript failure is reported with its reason', async () => {
      const runner = createFakeRunner({ osascript: { exitCode: 1, stderr: 'execution error: Not authorized to send Apple events. (-1743)' } });
      await assert.rejects(createFolderService('darwin', runner.run).pick(), (error: unknown) => {
        return error instanceof UpstreamError && /Not authorized/.test(error.message) && /Type the folder path/.test(error.message);
      });
    });
  });

  describe('on Linux', () => {
    test('zenity is tried first and its folder comes back', async () => {
      const runner = createFakeRunner({ zenity: { stdout: '/home/you/Videos\n' }, kdialog: { stdout: '/elsewhere\n' } });
      assert.deepEqual(await createFolderService('linux', runner.run).pick(), { path: '/home/you/Videos' });
      assert.deepEqual(runner.commands, ['zenity']);
      assert.ok(runner.argsOf('zenity').includes('--directory'));
    });

    test('kdialog is used when zenity is not installed', async () => {
      const runner = createFakeRunner({ kdialog: { stdout: '/home/you/Videos\n' } });
      assert.deepEqual(await createFolderService('linux', runner.run).pick(), { path: '/home/you/Videos' });
      assert.deepEqual(runner.commands, ['zenity', 'kdialog']);
      assert.equal(runner.argsOf('kdialog')[0], '--getexistingdirectory');
    });

    test('closing the dialog gives no folder and does not open the other picker', async () => {
      const runner = createFakeRunner({ zenity: { exitCode: 1 }, kdialog: { stdout: '/elsewhere\n' } });
      assert.deepEqual(await createFolderService('linux', runner.run).pick(), { path: null });
      assert.deepEqual(runner.commands, ['zenity']);
    });

    test('with neither tool installed the error says to install one or type the path', async () => {
      const runner = createFakeRunner({});
      await assert.rejects(createFolderService('linux', runner.run).pick(), (error: unknown) => {
        return error instanceof NotSupportedError && error.message === NO_LINUX_PICKER;
      });
    });

    test('a picker that crashes is reported with its last error line', async () => {
      const runner = createFakeRunner({ zenity: { exitCode: 255, stderr: 'Gtk-WARNING: cannot open display: :0\n' } });
      await assert.rejects(createFolderService('linux', runner.run).pick(), (error: unknown) => {
        return error instanceof UpstreamError && /cannot open display/.test(error.message);
      });
    });
  });

  test('a picker left open until the timeout gives no folder', async () => {
    const runner = createFakeRunner({ zenity: { exitCode: null, isTimedOut: true } });
    assert.deepEqual(await createFolderService('linux', runner.run).pick(), { path: null });
  });

  test('any other system answers that the picker is not supported', async () => {
    const runner = createFakeRunner({});
    await assert.rejects(createFolderService('freebsd', runner.run).pick(), NotSupportedError);
    assert.deepEqual(runner.commands, []);
  });
});
