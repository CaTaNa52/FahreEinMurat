// Crash concept: every impact is graded by speed. Light contact is a bump, medium
// contact bounces the scooter and damages it, hard contact throws the rider off.
// Damage adds up to a total loss, which tows the scooter to the garage.
export const DAMAGE_MAX = 100;
export const TOW_FEE = 250;
export const REPAIR_PRICE = 2;         // coins per damage point

// Car contact, graded by closing speed in m/s.
export function impactOutcome(closing) {
  if (closing < 2.2) return { kind: 'bump', damage: closing > .8 ? 2 : 0 };
  if (closing < 8.5) return { kind: 'hit', damage: Math.round(6 + closing * 2.4) };
  return { kind: 'crash', damage: Math.round(22 + closing * 1.6) };
}
// Walls, lamps, trees: only real speed hurts.
export function wallOutcome(speed) {
  const s = Math.abs(speed);
  if (s < 6) return { kind: 'none', damage: 0 };
  if (s < 13.5) return { kind: 'hit', damage: Math.round(3 + (s - 6) * 1.6) };
  return { kind: 'crash', damage: Math.round(18 + (s - 13.5) * 1.5) };
}
export const applyDamage = (damage, amount) => Math.max(0, Math.min(DAMAGE_MAX, damage + amount));
export const isTotaled = damage => damage >= DAMAGE_MAX;
// A battered scooter is slower: an incentive to visit the garage.
export const speedCap = (damage, top) => damage >= 70 ? top * .7 : damage >= 40 ? top * .88 : top;
export const repairCost = damage => Math.ceil(damage) * REPAIR_PRICE;
export function damageLabel(damage) {
  if (damage >= 70) return 'SCHROTTREIF';
  if (damage >= 40) return 'ANGESCHLAGEN';
  if (damage > 0) return 'KRATZER';
  return 'WIE NEU';
}
