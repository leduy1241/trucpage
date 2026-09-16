export function splitResponse(text: string, maxChunks = 3, maxLength = 500): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > maxLength && chunks.length < maxChunks - 1) {
    const window = rest.slice(0, maxLength + 1);
    const candidates = [window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "), window.lastIndexOf("\n"), window.lastIndexOf(" ")];
    const cut = Math.max(...candidates);
    const at = cut > maxLength * 0.4 ? cut + (window[cut] === "\n" ? 0 : 1) : maxLength;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}
