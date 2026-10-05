const UPPER = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const LOWER = [...'abcdefghijklmnopqrstuvwxyz'];
const NUMERALS = [...'0123456789'];

// The characters a level's tray offers, set by the level's `charset`.
// Levels without one are uppercase. Mixed pairs each capital with its
// lowercase (Aa Bb Cc …) so either is easy to find.
export const CHARSETS = {
  upper: { label: 'Uppercase', chars: UPPER },
  lower: { label: 'Lowercase', chars: LOWER },
  numerals: { label: 'Numerals', chars: NUMERALS },
  mixed: { label: 'Mixed', chars: UPPER.flatMap((c, i) => [c, LOWER[i]]) },
};

export const DEFAULT_CHARSET = 'upper';

export function charsetOf(level) {
  return level?.charset ?? DEFAULT_CHARSET;
}

export function charsFor(level) {
  return (CHARSETS[charsetOf(level)] ?? CHARSETS[DEFAULT_CHARSET]).chars;
}
