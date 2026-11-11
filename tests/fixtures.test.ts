import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('../fixtures/', import.meta.url);
const files = readdirSync(dir).filter((file) => file.endsWith('.json'));

/**
 * Guarda de privacidade: o repositório só pode conter dados sintéticos.
 * Não prova que um dado real nunca entrou, mas barra os sinais mais comuns
 * (e-mail, telefone, link, empresa sem a marca "Exemplo") e exige a nota de exemplo.
 */
describe('fixtures sintéticas', () => {
  it('há fixtures para verificar', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files)('%s traz a nota "EXEMPLO SINTÉTICO"', (file) => {
    const data = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { note?: string };
    expect(data.note).toMatch(/^EXEMPLO SINTÉTICO/);
  });

  it.each(files)('%s não contém e-mail, telefone ou link', (file) => {
    const text = readFileSync(new URL(file, dir), 'utf8');
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text).not.toMatch(/https?:\/\/|www\./i);
    expect(text).not.toMatch(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/);
  });

  it.each(files.filter((file) => file.startsWith('job-')))('%s usa empresa "Exemplo"', (file) => {
    const data = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { company?: string };
    expect(data.company).toMatch(/^Empresa Exemplo /);
  });
});
