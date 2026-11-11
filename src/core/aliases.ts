import { normalize } from './text.js';

/**
 * Agrupa nomes equivalentes (por exemplo "typescript" e "ts") sob uma forma canônica.
 * Os grupos vêm da rubrica, então a equivalência é visível e editável.
 */
export class AliasResolver {
  private readonly canonicalByTerm = new Map<string, string>();
  private readonly variantsByCanonical = new Map<string, string[]>();

  constructor(aliases: Record<string, string[]>) {
    for (const [canonicalName, others] of Object.entries(aliases)) {
      const canonical = normalize(canonicalName);
      const variants = [canonical, ...others.map(normalize)];
      this.variantsByCanonical.set(canonical, variants);
      for (const variant of variants) {
        this.canonicalByTerm.set(variant, canonical);
      }
    }
  }

  canonical(name: string): string {
    const normalized = normalize(name);
    return this.canonicalByTerm.get(normalized) ?? normalized;
  }

  variants(name: string): string[] {
    const canonical = this.canonical(name);
    return this.variantsByCanonical.get(canonical) ?? [canonical];
  }
}
