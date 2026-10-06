# Built by .github/workflows/deploy.yml (context ., file Dockerfile) and pushed
# to Artifact Registry. Adapted from the fleet's node stack pack.
#
# A JOB image, not a server: Electron is a desktop runtime, so there is nothing to
# serve on $PORT. The default command runs the headless smoke test
# (test/smoke.test.js) under a virtual X display (xvfb-run) and exits 0 when the
# app's window opened and rendered src/index.html.
#
# Deviations from the pack, and why:
#   - Debian (bookworm-slim), not alpine: the prebuilt Electron binary links glibc
#     and the GTK/NSS/X11 libraries installed below.
#   - ELECTRON_NO_SANDBOX=1: Chromium's sandbox needs a setuid chrome-sandbox or
#     unprivileged user namespaces, which a container does not give it.
#   - packaging (`npm run make`) is not run here: it targets desktop installers
#     (squirrel/deb/rpm/zip), which the fleet does not deploy.

FROM node:22-bookworm-slim AS runtime
ARG BUILD_ID=""
ENV BUILD_ID=$BUILD_ID ELECTRON_NO_SANDBOX=1 ELECTRON_DISABLE_SECURITY_WARNINGS=1 CI=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      xvfb xauth ca-certificates tini \
      libgtk-3-0 libnss3 libasound2 libgbm1 libxss1 libxtst6 libatk-bridge2.0-0 \
      libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libcups2 libsecret-1-0 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# WORKDIR is created by root; the node user installs into it.
RUN chown node:node /app
COPY --chown=node:node package.json package-lock.json ./
USER node
# Electron 44 has no postinstall: the binary is fetched on first use, which would put a
# download inside every test run (and fail offline). Fetch it at build time instead.
RUN npm ci && node node_modules/electron/install.js
COPY --chown=node:node . .
# tini as PID 1: xvfb-run waits for Xvfb's SIGUSR1, and as PID 1 itself it never got it —
# the job hung silently. Under tini it is an ordinary child.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1280x800x24", "npm", "test"]
