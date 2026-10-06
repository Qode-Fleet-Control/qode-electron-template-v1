// Headless smoke test: launch the real Electron app (main process, preload, renderer)
// and check that the window loads src/index.html. Needs a display: in the container it
// runs under xvfb-run (see the Dockerfile's CMD); locally run `xvfb-run -a npm test`,
// or plain `npm test` on a desktop.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const electron = require('electron'); // the path to the Electron binary

// Finish on the main process's EXIT, not on its pipes closing. Electron's helper
// processes (zygote, GPU) inherit stdout/stderr and can hold them open after the main
// process is gone, so spawnSync — which waits for the pipes — never returned.
function runApp(args, env, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(electron, args, { env, detached: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const killGroup = () => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
    const timer = setTimeout(() => { killGroup(); }, timeoutMs);
    child.on('exit', (status, signal) => {
      clearTimeout(timer);
      // Let the last bytes already in the pipes arrive, then reap the helpers.
      setTimeout(() => { killGroup(); resolve({ status, signal, stdout, stderr }); }, 500);
    });
  });
}

test('the app opens its window and renders index.html', async () => {
  const args = [path.join(__dirname, '..')];
  // Chromium's sandbox needs a setuid helper or user namespaces, which a container
  // usually has neither of; the smoke test does not exercise it.
  if (process.env.ELECTRON_NO_SANDBOX === '1') args.unshift('--no-sandbox');
  const r = await runApp(args, { ...process.env, QODE_SMOKE_TEST: '1' }, 60000);
  const out = `${r.stdout}\n${r.stderr}`;
  assert.equal(r.status, 0, `electron exited ${r.status} (${r.signal ?? 'no signal'}):\n${out}`);
  assert.match(r.stdout, /SMOKE_OK title="Hello World!" h1=".*Hello World!"/);
});
