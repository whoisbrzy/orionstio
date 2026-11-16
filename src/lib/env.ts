/** Read a server-side environment variable at request time. */
export function env(name: string): string | undefined {
  const value = process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
  return value && value.length > 0 ? value : undefined;
}
