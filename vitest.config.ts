import { defineConfig } from 'vitest/config';

// Config própria: o vite.config.ts usa root "web", e os testes ficam em tests/.
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
