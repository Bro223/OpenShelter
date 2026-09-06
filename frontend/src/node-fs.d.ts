/**
 * Test-only minimal typing for the node surface used by
 * design-tokens.spec.ts (filesystem walk + cwd). Declared locally so the
 * test build needs no @types/node dependency.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}

declare const process: {
  cwd(): string;
};
