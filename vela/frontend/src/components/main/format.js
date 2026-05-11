// Money / date helpers shared across the main app pages.

export const money = (n, dec = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: dec,
  }).format(Number(n) || 0);

export const moneyAbs = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(Number(n) || 0));

const TODAY = new Date();

export function relDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  const today = new Date(TODAY);
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - target) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}d ago`;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CATEGORY_EMOJI = {
  housing: '🏠',
  rent: '🏠',
  'food and drink': '🍽',
  'food & dining': '🍽',
  food: '🍽',
  groceries: '🛒',
  restaurant: '🍽',
  dining: '🍽',
  transport: '🚗',
  travel: '✈️',
  shopping: '🛍',
  subscriptions: '📺',
  entertainment: '🎬',
  bills: '💡',
  utilities: '💡',
  income: '💼',
  payroll: '💼',
  deposit: '💰',
  investment: '📈',
  transfer: '↔︎',
  loan: '🏦',
  healthcare: '🩺',
  service: '🔧',
  other: '◇',
};

export function emojiFor(category, subcategory) {
  const k = (category || '').toLowerCase();
  if (CATEGORY_EMOJI[k]) return CATEGORY_EMOJI[k];
  const sk = (subcategory || '').toLowerCase();
  for (const key of Object.keys(CATEGORY_EMOJI)) {
    if (k.includes(key) || sk.includes(key)) return CATEGORY_EMOJI[key];
  }
  return '◇';
}

export function displayAccountName(a) {
  if (!a) return 'Account';
  return a.name || a.official_name || a.subtype || 'Account';
}
