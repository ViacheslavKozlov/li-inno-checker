# syntax=docker/dockerfile:1

# Pinned to the SAME Playwright version as package.json so the Chromium build
# and OS dependencies baked into the image match the npm package exactly.
# Bump this tag together with the "playwright" dependency.
ARG PLAYWRIGHT_VERSION=v1.61.0

############################
# Build stage: compile TS -> JS (needs devDependencies)
############################
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

############################
# Runtime stage: production deps + compiled output only
############################
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble AS runtime
WORKDIR /app

# Chromium runs as root in this image, so it needs --no-sandbox; the checker
# enables the container flags off this var (see src/config/env.ts).
ENV NODE_ENV=production \
    BROWSER_NO_SANDBOX=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Ensure the Chromium build for THIS playwright version is present (no-op if the
# base image already shipped it; cheap safety net against revision drift).
RUN npx playwright install chromium

COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
