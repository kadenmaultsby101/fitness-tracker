// Credit-card monthly + recurring perks database (v1, hardcoded).
//
// Each credit declares its own `frequency` so we don't pretend semi-annual
// credits like Amex Gold's Resy are monthly. Supported frequencies:
//
//   'monthly'      — resets the 1st of each calendar month
//   'quarterly'    — resets Jan 1 / Apr 1 / Jul 1 / Oct 1
//   'semi_annual'  — resets Jan 1 / Jul 1
//   'annual'       — resets Jan 1
//
// Detection runs against transaction merchant_name + name with case-
// insensitive regex. Patterns deliberately broad (e.g. /uber/) so Uber
// Eats, Uber X, Uber Cash all count toward the credit.
//
// Future expansion (v2): cards we don't have here go through a Sage-powered
// AI lookup that proposes credits + caches them in a Supabase
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
    credits: [
      { id: 'uber',    label: 'Uber Cash',          amount: 10, frequency: 'monthly',     detect: r(/\buber\b/i) },
      { id: 'grubhub', label: 'Grubhub / Seamless', amount: 10, frequency: 'monthly',     detect: r(/grubhub|seamless/i) },
      { id: 'dunkin',  label: 'Dunkin',             amount: 7,  frequency: 'monthly',     detect: r(/dunkin/i) },
      { id: 'resy',    label: 'Resy',               amount: 25, frequency: 'semi_annual', detect: r(/\bresy\b/i) },
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
    credits: [
      { id: 'uber',         label: 'Uber Cash',             amount: 15,    frequency: 'monthly',     detect: r(/\buber\b/i) },
      { id: 'digital_ent',  label: 'Digital Entertainment', amount: 20,    frequency: 'monthly',     detect: r(/peacock|disney\+|hulu|nytimes|wsj|wall street journal|paramount|sirius/i) },
      { id: 'walmart_plus', label: 'Walmart+',              amount: 12.95, frequency: 'monthly',     detect: r(/walmart.*\+|walmart plus|walmart membership/i) },
      { id: 'equinox',      label: 'Equinox',               amount: 25,    frequency: 'monthly',     detect: r(/equinox/i) },
      { id: 'saks',         label: 'Saks Fifth Avenue',     amount: 50,    frequency: 'semi_annual', detect: r(/saks/i) },
      { id: 'airline_fee',  label: 'Airline incidentals',   amount: 200,   frequency: 'annual',      detect: r(/baggage|seat select|inflight|wifi|airline fee/i) },
      { id: 'clear',        label: 'CLEAR Plus',            amount: 189,   frequency: 'annual',      detect: r(/\bclear\b/i) },
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
    credits: [
      { id: 'doordash',   label: 'DoorDash credit', amount: 5,   frequency: 'monthly', detect: r(/doordash|caviar/i) },
      { id: 'travel_300', label: 'Travel credit',   amount: 300, frequency: 'annual',  detect: r(/airline|hotel|rental car|amtrak|cruise|booking\.com|expedia|uber|lyft|taxi|tolls|parking/i) },
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
    credits: [
      { id: 'marriott_dining', label: 'Marriott dining', amount: 25, frequency: 'monthly', detect: r(/marriott|sheraton|westin|ritz.?carlton|w hotel|st regis|aloft|courtyard/i) },
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
    credits: [
      { id: 'hilton_fb', label: 'Hilton F&B', amount: 50, frequency: 'monthly', detect: r(/hilton|conrad|waldorf|hampton|embassy suites|doubletree|home2 suites|tru by hilton|tapestry|curio/i) },
    ],
  },
};

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
