// ISO 6346 container numbers: owner code (3 letters) + category (U, J or Z) + 6-digit serial + check digit.

const ID = /^[A-Z]{3}[UJZ]\d{7}$/;

/** Letter values skip multiples of 11: A = 10, B = 12 … K = 21, L = 23 … U = 32, V = 34 … Z = 38. */
function charValue(c: string): number {
  if (c >= '0' && c <= '9') return Number(c);
  let v = 10;
  for (let code = 65; code < c.charCodeAt(0); code++) {
    v++;
    if (v % 11 === 0) v++;
  }
  return v;
}

/** Check digit for the first 10 characters: Σ value × 2^i, mod 11, mod 10. */
export function checkDigit(first10: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += charValue(first10.charAt(i)) * 2 ** i;
  return (sum % 11) % 10;
}

export function isValidContainerId(id: string): boolean {
  return ID.test(id) && checkDigit(id.slice(0, 10)) === Number(id.charAt(10));
}

/** Builds a valid number from a 4-letter prefix (e.g. "MSKU") and a serial 0 … 999999. */
export function makeContainerId(prefix: string, serial: number): string {
  const first10 = `${prefix}${String(serial).padStart(6, '0')}`;
  return `${first10}${checkDigit(first10)}`;
}
