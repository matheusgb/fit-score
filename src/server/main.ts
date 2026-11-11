import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { loadExamples, loadRubric } from './data.js';

// Funciona de src/server (tsx) e de dist/server (compilado): a raiz do projeto fica dois níveis acima.
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const rubricPath = process.env.RUBRIC_PATH ?? `${root}rubric/default.yaml`;

const app = buildApp({
  rubric: loadRubric(rubricPath),
  examples: loadExamples(`${root}fixtures`),
  webDir: `${root}dist/web`,
  logger: true,
});

app.listen({ port, host }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
