# Electron template

Provisioned from [`Qode-Fleet-Control/fleet-template-v1`](https://github.com/Qode-Fleet-Control/fleet-template-v1) — the fleet
lifecycle contract (`bin/`, `fleet.conf`, deploy workflows, `compose.yaml`) with an Electron desktop app from Electron Forge's base template, with a headless smoke test that the container runs as a job laid on top.

**This repo is a job, not a service.** It serves no HTTP: `START_CMD` and `DOCKER_START_CMD` are
empty, nothing is published on `$PORT`, and `bin/run` builds and stops there. The image's default
command runs the job and exits 0 on success.

## Origin

    ELECTRON_SKIP_BINARY_DOWNLOAD=1 npx -p node@22 -p create-electron-app@8.0.1 -- create-electron-app init qode-electron-template-v1 --skip-git --package-manager npm

Generated 2026-10-05 with create-electron-app 8.0.1 (Electron 44.5.1); run under node 22.23 fetched by `npx -p node@22`, because Forge 8 needs node >= 22.13 and the host has 22.12 (host Node v22.12.0 / npm 10.9.0).

## Run it

### On the fleet

The fleet clones the repo, injects `PORT` (and the workspace's `DATABASE_URL`, `REDIS_URL`, ...) and runs
`bin/run`, which uses the docker runtime from `fleet.conf`: `docker compose build`, then nothing (a job has no start step).

### With docker

    docker compose build
    docker compose run --rm app     # runs the job; exit code = result

### Without docker

`FLEET_RUNTIME=process bin/run` runs the plain commands from `fleet.conf`:

| step | command |
|---|---|
| install | `npm install` |
| build | `(none)` |
| start | `(none — not a service)` |

Run the job without docker: `npm install && xvfb-run -a npm test` (needs Electron's GTK/NSS/X11 libraries; plain `npm test` on a desktop). `npm start` opens the app.

    ./bin/run       # install, build, start in the foreground
    ./bin/start     # start from existing build artifacts
    ./bin/restart   # rebuild and restart
    ./bin/stop      # stop whatever holds the port

See `docs/fleet-lifecycle.md` for the full contract.

## Deviations from the generator output

- Added a headless smoke test: `test/smoke.test.js` (`npm test` -> `node --test test/`) launches the real Electron binary with `QODE_SMOKE_TEST=1`; in that mode `src/index.js` waits for the window's `did-finish-load`, prints `SMOKE_OK title=... h1=...` and exits 0 (exit 1 on load failure or a 30 s timeout), and skips opening DevTools. Everything else in `src/` is stock.
- `package.json`: `author` / `description` replaced (the generator copies the local git identity into `author`), and the `test` script added.
- The image runs the test under `xvfb-run` on `node:22-bookworm-slim` with the GTK/NSS/X11 libraries Electron needs, with `ELECTRON_NO_SANDBOX=1` (the test adds `--no-sandbox`: a container has no setuid `chrome-sandbox` or user namespaces for Chromium's sandbox). Packaging (`npm run make`) is not run in the image.
- `node_modules/` from the generator's own `npm install` removed; its `package-lock.json` kept.
- Added the fleet files: `bin/` (lifecycle scripts), `fleet.conf`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example`, `.github/workflows/`, `docs/fleet-lifecycle.md`; fleet entries (`.fleet/`, `*.log`, ...) prepended to `.gitignore`.

## Verified

**Not yet verified in docker.** On 2026-10-05 the shared docker host's disk stayed at 0-2 GB free for over 3 hours (held by other workloads), so the image was never built; `verify.sh` / `docker compose run` must still be run before this is trusted.
