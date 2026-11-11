import { describe, expect, it } from 'vitest';
import { containsTerm, findEvidence, normalize } from '../src/core/text.js';

describe('normalize', () => {
  it('remove acentos, põe em minúsculas e colapsa espaços', () => {
    expect(normalize('  Integração   CONTÍNUA ')).toBe('integracao continua');
  });
});

describe('containsTerm', () => {
  it.each([
    ['Usamos Go, Kafka e PostgreSQL.', 'go', true],
    ['Usamos Google Cloud.', 'go', false],
    ['Stack: C++ e Rust', 'c++', true],
    ['A API roda em Node.js sobre PostgreSQL.', 'node.js', true],
    ['Pipeline de CI/CD no GitHub Actions', 'ci/cd', true],
    ['Experiência com reactive programming', 'react', false],
    ['Inglês avançado', 'ingles', true],
    ['qualquer texto', '', false],
  ])('%j com o termo %j devolve %s', (text, term, expected) => {
    expect(containsTerm(text, term)).toBe(expected);
  });
});

describe('findEvidence', () => {
  const description = 'Primeira frase sem nada. A API roda em Node.js sobre PostgreSQL. Docker faz parte do dia a dia.';

  it('devolve a primeira frase que cita o termo', () => {
    expect(findEvidence(description, ['postgresql'])).toBe('A API roda em Node.js sobre PostgreSQL.');
  });

  it('aceita qualquer variante', () => {
    expect(findEvidence(description, ['containers', 'docker'])).toBe('Docker faz parte do dia a dia.');
  });

  it('devolve undefined quando a descrição não cita o termo', () => {
    expect(findEvidence(description, ['kafka'])).toBeUndefined();
  });
});
