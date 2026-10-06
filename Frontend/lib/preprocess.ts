export function dimensions(width: number, height: number) {
  const scale = Math.min(
    2400 / Math.max(width, height),
    Math.max(1, 1000 / Math.max(width, height)),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function suggestLanguage(text: string, confidence: number) {
  return /[\u0900-\u097f]/u.test(text) || confidence < 65;
}
