// Headless smoke test: launch the real Electron app (main process, preload, renderer)
// and check that the window loads src/index.html. Needs a display: in the container it
// runs under xvfb-run (see the Dockerfile's CMD); locally run `xvfb-run -a npm test`,
// or plain `npm test` on a desktop.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const electron = require('electron'); // the path to the Electron binary

test('the app opens its window and renders index.html', () => {
  const args = [path.join(__dirname, '..')];
  // Chromium's sandbox needs a setuid helper or user namespaces, which a container
  // usually has neither of; the smoke test does not exercise it.
  if (process.env.ELECTRON_NO_SANDBOX === '1') args.unshift('--no-sandbox');
  const r = spawnSync(electron, args, {
    env: { ...process.env, QODE_SMOKE_TEST: '1' },
    encoding: 'utf8',
    timeout: 60000,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  assert.equal(r.status, 0, `electron exited ${r.status} (${r.signal ?? 'no signal'}):\n${out}`);
  assert.match(r.stdout, /SMOKE_OK title="Hello World!" h1=".*Hello World!"/);
});
