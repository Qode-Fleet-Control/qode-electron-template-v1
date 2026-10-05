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
      xvfb xauth ca-certificates \
      libgtk-3-0 libnss3 libasound2 libgbm1 libxss1 libxtst6 libatk-bridge2.0-0 \
      libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libcups2 libsecret-1-0 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
USER node
# npm ci also runs electron's postinstall, which downloads the Electron binary.
RUN npm ci
COPY --chown=node:node . .
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1280x800x24", "npm", "test"]
