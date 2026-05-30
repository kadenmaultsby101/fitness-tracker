// Maps Plaid account IDs to the canonical credit-card productId from
// cardPerks.js. Used by the perks tracker to know which credits to look for
// on each credit account.
//
// v1 stores the mapping in localStorage (per-browser). When v2 ships, this
// moves to a Supabase column on accounts; the API of this file stays the
// same so consumers don't need to change.
//
// Distinguished states for an account:
//   - mapped to a productId we have data for → tracker shows perks
//   - mapped to '__none__'                    → user said "no perks card",
//                                                tracker hides this account
//   - no mapping yet                          → tracker prompts to confirm

import { autodetectProduct } from '../data/cardPerks';

const STORAGE_KEY = 'vela:cardProducts';
export const NO_PERKS = '__none__';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* private mode — ignore */ }
}

// Get the productId for an account. Falls back to autodetect from the
// Plaid name if the user hasn't picked one yet. Returns null if neither
// resolves — UI should then prompt the user.
export function getProductId(account) {
  if (!account) return null;
  const map = readAll();
  if (map[account.id]) return map[account.id]; // includes NO_PERKS
  const auto = autodetectProduct(account);
  return auto || null;
}

// Pick a productId (or NO_PERKS) for an account. Persists.
export function setProductId(accountId, productId) {
  if (!accountId) return;
  const map = readAll();
  map[accountId] = productId;
  writeAll(map);
}

// Clear a saved choice (back to autodetect / unmapped).
export function clearProductId(accountId) {
  const map = readAll();
  delete map[accountId];
  writeAll(map);
}

// Was this productId stored explicitly (user confirmed) vs autodetected?
// Useful for the UI to show "Auto-detected — confirm?" labels.
export function isExplicitlyMapped(accountId) {
  const map = readAll();
  return Object.prototype.hasOwnProperty.call(map, accountId);
}
