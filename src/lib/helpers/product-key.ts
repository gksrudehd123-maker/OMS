export function generateProductKey(name: string, optionInfo: string): string {
  return `${name.trim()}|${(optionInfo || '').trim()}`;
}
