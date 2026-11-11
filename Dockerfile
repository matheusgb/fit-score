FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json tsconfig.web.json vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY rubric ./rubric
COPY fixtures ./fixtures
USER node
EXPOSE 3000
CMD ["node", "dist/server/main.js"]
