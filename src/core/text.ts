/** Minúsculas, sem acentos, espaços colapsados. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Casa o termo como palavra inteira: não pode haver letra ou dígito colado antes ou depois.
 * Assim "go" não casa com "google", mas casa com "Go," e "c++" casa com "C++".
 * Limite conhecido: não distingue "Go" (linguagem) de "go" (verbo em inglês).
 */
export function containsTerm(text: string, term: string): boolean {
  const needle = normalize(term);
  if (needle === '') return false;
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`, 'u');
  return pattern.test(normalize(text));
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** Primeiro trecho da descrição que cita qualquer uma das variantes do termo. */
export function findEvidence(description: string, variants: string[]): string | undefined {
  return splitSentences(description).find((sentence) =>
    variants.some((variant) => containsTerm(sentence, variant)),
  );
}
