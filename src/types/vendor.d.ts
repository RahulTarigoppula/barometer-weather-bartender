declare module 'tracery-grammar' {
  interface TraceryGrammar {
    flatten(rule: string): string;
    addModifiers(mods: Record<string, (s: string, params?: string[]) => string>): void;
  }
  const tracery: {
    createGrammar(raw: Record<string, string[]>): TraceryGrammar;
    setRng(rng: () => number): void;
    baseEngModifiers: Record<string, (s: string, params?: string[]) => string>;
  };
  export default tracery;
}

declare const __APP_VERSION__: string;
