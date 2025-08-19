export function normalizeEscapes(input: string): string {
  return input.replace(/\\n/g, "\n");
}
