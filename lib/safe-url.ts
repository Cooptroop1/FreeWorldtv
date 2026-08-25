export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function clampList<T>(input: unknown, max = 200): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, max) as T[];
}
