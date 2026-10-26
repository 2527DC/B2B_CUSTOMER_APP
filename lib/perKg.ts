/**
 * Price per kg for B2B bags. The API sends `pack_kg` (kg in one bag) with each product and
 * variant; screens divide whichever price they show by it, so the rate follows bulk tiers too.
 */

/** Price of one kg when a bag of `packKg` costs `price`; null when either is missing. */
export function pricePerKg(price: number | null | undefined, packKg: number | null | undefined): number | null {
  const p = Number(price);
  if (!packKg || packKg <= 0 || !Number.isFinite(p) || p <= 0) return null;
  return p / packKg;
}

/** ₹44.23 for a rate; a whole-rupee rate drops the paise (₹60). */
export function formatRate(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const decimals = Number.isInteger(rounded) ? 0 : 2;
  return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** 26 → "26", 25.5 → "25.5" */
export function formatKg(kg: number): string {
  return String(Number(kg.toFixed(3)));
}
