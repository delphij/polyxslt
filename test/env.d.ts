// The subset of Vite's import.meta used by the tests.
interface ImportMeta {
  glob<T>(
    pattern: string,
    options: { query?: string; import: string; eager: true },
  ): Record<string, T>;
}
