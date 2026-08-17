// Fallback backdrop for match cards with no team logos — picked per-match (not per-position)
// so cards don't visibly repeat the same pattern across different rails/sections.
export const CARD_FALLBACK_BACKGROUNDS = [
  'radial-gradient(circle at 20% 25%, #4a1f52 0%, transparent 55%), radial-gradient(circle at 82% 75%, #10233f 0%, transparent 55%)',
  'radial-gradient(circle at 18% 75%, #1a2f52 0%, transparent 55%), radial-gradient(circle at 80% 22%, #4a1f2e 0%, transparent 55%)',
  'radial-gradient(circle at 25% 20%, #123a3a 0%, transparent 55%), radial-gradient(circle at 78% 78%, #3a1f4a 0%, transparent 55%)',
  'radial-gradient(circle at 22% 78%, #4a2c12 0%, transparent 55%), radial-gradient(circle at 78% 24%, #12233f 0%, transparent 55%)',
  'radial-gradient(circle at 24% 22%, #123f2c 0%, transparent 55%), radial-gradient(circle at 80% 80%, #4a1f3a 0%, transparent 55%)',
  'radial-gradient(circle at 20% 80%, #3f2c12 0%, transparent 55%), radial-gradient(circle at 80% 20%, #1f2c4a 0%, transparent 55%)',
  'radial-gradient(circle at 26% 24%, #4a1f1f 0%, transparent 55%), radial-gradient(circle at 76% 76%, #123a4a 0%, transparent 55%)',
  'radial-gradient(circle at 22% 76%, #2c124a 0%, transparent 55%), radial-gradient(circle at 78% 24%, #123f2c 0%, transparent 55%)'
];

export function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
