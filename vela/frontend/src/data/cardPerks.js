// Credit-card monthly perks database (v1, hardcoded).
//
// Only cards with *real monthly credits worth tracking* — adding a card
// here with no monthly perks would just clutter the UI. As of early 2026:
//
//   amex_gold              $34 / month potential (Uber, Grubhub, Dunkin, Resy)
//   amex_platinum          $72.95 / month potential
//   chase_sapphire_reserve $5  / month potential (DoorDash credit)
//   marriott_bonvoy_brilliant $25 / month (Marriott dining)
//   hilton_aspire          $50 / month (Hilton F&B)
//
// Detection runs against transaction merchant_name + name with case-
// insensitive regex. Patterns deliberately broad (e.g. /uber/) so Uber
// Eats, Uber X, Uber Cash all count toward the credit.
//
// Future expansion (v2): cards we don't have here go through a Sage-powered
// AI lookup flow that proposes credits + caches them in a Supabase
// card_products table. This v1 file is just the "always-on" seed set.

const r = (re) => (t) => re.test(`${t.merchant_name || ''} ${t.name || ''}`);

export const CARD_PERKS = {
  amex_gold: {
    productId: 'amex_gold',
    name: 'Amex Gold',
    fullName: 'American Express Gold',
    issuer: 'amex',
    annualFee: 325,
    plaidPatterns: [
      /amex.*gold/i, /american express.*gold/i, /\bgold card\b/i, /\bgold rewards\b/i,
    ],
    monthlyCredits: [
      { id: 'uber',    label: 'Uber Cash',         amount: 10, detect: r(/\buber\b/i) },
      { id: 'grubhub', label: 'Grubhub / Seamless', amount: 10, detect: r(/grubhub|seamless/i) },
      { id: 'dunkin',  label: 'Dunkin',            amount: 7,  detect: r(/dunkin/i) },
      { id: 'resy',    label: 'Resy',              amount: 7,  detect: r(/\bresy\b/i) },
    ],
  },

  amex_platinum: {
    productId: 'amex_platinum',
    name: 'Amex Platinum',
    fullName: 'American Express Platinum',
    issuer: 'amex',
    annualFee: 695,
    plaidPatterns: [
      /amex.*platinum/i, /american express.*platinum/i, /\bplatinum card\b/i,
    ],
    monthlyCredits: [
      { id: 'uber',          label: 'Uber Cash',          amount: 15,    detect: r(/\buber\b/i) },
      { id: 'digital_ent',   label: 'Digital Entertainment', amount: 20, detect: r(/peacock|disney\+|hulu|nytimes|wsj|wall street journal|paramount|sirius/i) },
      { id: 'walmart_plus',  label: 'Walmart+',           amount: 12.95, detect: r(/walmart.*\+|walmart plus|walmart membership/i) },
      { id: 'equinox',       label: 'Equinox',            amount: 25,    detect: r(/equinox/i) },
    ],
  },

  chase_sapphire_reserve: {
    productId: 'chase_sapphire_reserve',
    name: 'Chase Sapphire Reserve',
    fullName: 'Chase Sapphire Reserve',
    issuer: 'chase',
    annualFee: 550,
    plaidPatterns: [
      /sapphire.*reserve/i, /chase.*reserve/i,
    ],
    monthlyCredits: [
      { id: 'doordash', label: 'DoorDash credit', amount: 5, detect: r(/doordash|caviar/i) },
    ],
  },

  marriott_bonvoy_brilliant: {
    productId: 'marriott_bonvoy_brilliant',
    name: 'Marriott Brilliant',
    fullName: 'Marriott Bonvoy Brilliant Amex',
    issuer: 'amex',
    annualFee: 650,
    plaidPatterns: [
      /marriott.*brilliant/i, /bonvoy.*brilliant/i,
    ],
    monthlyCredits: [
      { id: 'marriott_dining', label: 'Marriott dining', amount: 25, detect: r(/marriott|sheraton|westin|ritz.?carlton|w hotel|st regis|aloft|courtyard/i) },
    ],
  },

  hilton_aspire: {
    productId: 'hilton_aspire',
    name: 'Hilton Aspire',
    fullName: 'Hilton Honors Aspire Amex',
    issuer: 'amex',
    annualFee: 550,
    plaidPatterns: [
      /hilton.*aspire/i, /aspire card/i,
    ],
    monthlyCredits: [
      { id: 'hilton_fb', label: 'Hilton F&B', amount: 50, detect: r(/hilton|conrad|waldorf|hampton|embassy suites|doubletree|home2 suites|tru by hilton|tapestry|curio/i) },
    ],
  },
};

// Total monthly potential value for a card (helps the UI show "$X potential").
export function monthlyPotential(productId) {
  const card = CARD_PERKS[productId];
  if (!card) return 0;
  return card.monthlyCredits.reduce((s, c) => s + Number(c.amount || 0), 0);
}

// Try to guess which product a Plaid account is, based on its name/official_name.
// Returns productId or null if no confident match.
export function autodetectProduct(account) {
  if (!account || account.type !== 'credit') return null;
  const hay = `${account.name || ''} ${account.official_name || ''}`;
  for (const [productId, card] of Object.entries(CARD_PERKS)) {
    for (const pattern of card.plaidPatterns) {
      if (pattern.test(hay)) return productId;
    }
  }
  return null;
}

// Lightweight list view for the picker.
export const CARD_LIST = Object.values(CARD_PERKS).map((c) => ({
  productId: c.productId,
  name: c.name,
  fullName: c.fullName,
  issuer: c.issuer,
}));
