import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from 'plaid';

const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

export const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

export { Products, CountryCode };

export function plaidErrorMessage(err) {
  return (
    err?.response?.data?.error_message ||
    err?.response?.data?.error_code ||
    err?.message ||
    'Unknown Plaid error'
  );
}

// Translate Plaid's transaction category (either the legacy "category" array
// or the newer personal_finance_category) into Vela's canonical category set.
// Vela categories: Housing, Food & Dining, Transport, Shopping, Subscriptions,
// Entertainment, Bills, Income, Investment, Other.
//
// We also pattern-match the merchant/name as a fallback for transactions
// where Plaid returns no category (common with debit card swipes).
// Credit-card payment first: a transaction whose name contains "payment",
// "pmt", "autopay", "thank you" (Plaid uses these for card payments), or
// a transaction Plaid categorized as a credit-card payment, is a bill —
// NOT investing, even if the destination is Robinhood/Fidelity (paying off
// their credit card). This must run BEFORE the investment check.
const PAYMENT_PATTERN = /(payment|^pmt$|\bpmt\b|autopay|thank you|epay)/i;

const SUBSCRIPTION_MERCHANTS = /(netflix|hulu|spotify|apple\.com\/bill|apple\.com\/itunes|youtube premium|youtube music|disney\+|disney plus|hbo|max\.com|paramount|peacock|prime video|chatgpt|openai|anthropic|claude|github|notion|figma|dropbox|icloud|google one|microsoft 365|adobe|canva|grammarly|nordvpn|expressvpn|onlyfans|patreon|substack|medium|audible|kindle unlimited|nytimes|wsj|the athletic)/i;
const FOOD_MERCHANTS = /(starbucks|chipotle|chick-?fil-?a|mcdonald|wendy|burger king|taco bell|subway|domino|pizza hut|papa john|panera|sweetgreen|shake shack|cava|five guys|kfc|in.?n.?out|whataburger|dunkin|peet|blue bottle|krispy kreme|panda express|jersey mike|jimmy john|qdoba|raising cane|popeye|arby|wing stop|smashburger|jack in the box|hardee|carl.?s jr|sonic drive|dairy queen|baskin|cold stone|ben and jerry|einstein bagel|jamba|smoothie king|tropical smoothie|tst.? ?\*|trader joe|whole foods|safeway|kroger|publix|aldi|sprouts|wegmans|albertson|food lion|stop & shop|harris teeter|h-e-b|h.e.b|fresh market|natural grocers|grocery|supermarket|farmer.?s market|cafe|coffee|restaurant|grill|kitchen|deli|bistro|brewery|tavern|diner|eatery|bakery|sushi|ramen|noodle|thai |indian |chinese |mexican |vietnamese )/i;
const TRANSPORT_MERCHANTS = /(uber|lyft|chevron|shell oil|exxon|mobil|^bp\b|speedway|sunoco|costco gas|wawa|7.?eleven|valero|ampm|circle k|qt |quiktrip|amtrak|delta air|united air|american air|southwest|jetblue|alaska air|spirit air|frontier|allegiant|hawaiian air|airbnb|vrbo|marriott|hilton|hyatt|holiday inn|sheraton|courtyard|hampton inn|best western|tesla supercharge|electrify america|parking|toll|metro|mta |transit|caltrain|bart|septa|wmata|nj transit|amtrak|enterprise rent|hertz|avis|budget rent|turo|zipcar)/i;
const SHOPPING_MERCHANTS = /(amazon|amzn mktp|walmart|target|costco wholesale|best buy|home depot|lowe.?s|ikea|macy|nordstrom|kohl|tj maxx|t\.j\. maxx|marshalls|ross dress|sephora|ulta|nike|adidas|lululemon|^gap |^gap\.com|old navy|h&m|zara|uniqlo|shein|temu|etsy|wayfair|crate.?and.?barrel|west elm|pottery barn|bed bath|williams sonoma|rei |dick.?s sporting|footlocker|abercrombie|hollister|american eagle|forever 21|barnes.?and.?noble|the home|^kmart\b)/i;
const HOUSING_MERCHANTS = /(rent|mortgage|hoa |property mgmt|landlord|leasing|apartments|housing)/i;
const BILLS_MERCHANTS = /(verizon|t.?mobile|at&t|sprint|xfinity|comcast|spectrum|att fiber|google fiber|cox |starlink|pg&e|coned|duke energy|^edison|^southern california edison|tampa electric|insurance|aetna|cigna|kaiser|unitedhealth|blue cross|blue shield|geico|allstate|state farm|progressive|liberty mutual|hospital|clinic|pharmacy|cvs |walgreens|rite aid|laboratory corp|labcorp|quest diagnostic|water dept|water utility|gas utility|electric bill|trash service|sanitation|^irs |dmv |tax service)/i;
const INVESTMENT_MERCHANTS = /(robinhood|fidelity|vanguard|schwab|coinbase|kraken|binance|wealthfront|betterment|m1 finance|public\.com|^etrade|ameritrade|sofi invest|webull|^acorns\b)/i;
const ENTERTAINMENT_MERCHANTS = /(amc theatre|regal cinema|cinemark|movie tavern|alamo drafthouse|stubhub|ticketmaster|^ax\b|eventbrite|^vivid seats|^seatgeek|fandango|^golf |bowling|paintball|escape room|arcade|^topgolf|six flags|disneyland|disney world|universal studios|^zoo |aquarium|museum|concert|festival|nightclub|venue|gymnastics|fitness|^gym\b|equinox|planet fitness|24 hour fitness|crunch fitness|orangetheory|soulcycle|^pilates|yoga studio|peloton)/i;

// Plaid's newer `personal_finance_category` field — exhaustive list of
// primaries from Plaid's taxonomy. Maps cleanly to Vela's buckets. We
// PREFER this over the legacy `category` array when present (Plaid is
// migrating to PFC and it's far more accurate).
const PFC_TO_VELA = {
  INCOME:                   'Income',
  TRANSFER_IN:              'Investment', // overridden to Bills on credit accounts
  TRANSFER_OUT:             'Investment',
  LOAN_PAYMENTS:            'Bills',
  BANK_FEES:                'Bills',
  ENTERTAINMENT:            'Entertainment',
  FOOD_AND_DRINK:           'Food & Dining',
  GENERAL_MERCHANDISE:      'Shopping',
  HOME_IMPROVEMENT:         'Housing',
  MEDICAL:                  'Bills',
  PERSONAL_CARE:            'Shopping',
  GENERAL_SERVICES:         'Bills',
  GOVERNMENT_AND_NON_PROFIT:'Bills',
  TRANSPORTATION:           'Transport',
  TRAVEL:                   'Transport',
  RENT_AND_UTILITIES:       'Housing',
};

export function mapToVelaCategory(plaidPrimary, _plaidSecondary, name, merchantName, accountType, pfcPrimary, pfcDetailed) {
  const merchant = (merchantName || name || '').toLowerCase();
  const txnName = (name || '').toLowerCase();

  // PAYMENT detection wins over everything — "ROBINHOOD PAYMENT" must
  // never become Investment or Food.
  if (PAYMENT_PATTERN.test(merchant) || PAYMENT_PATTERN.test(txnName)) {
    return 'Bills';
  }

  // Specific detailed PFC overrides for the rare cases where the primary
  // would mislead us (e.g. RENT_AND_UTILITIES_TELEPHONE belongs to Bills,
  // not Housing).
  if (pfcDetailed) {
    const d = pfcDetailed.toUpperCase();
    if (d.includes('TELEPHONE') || d.includes('INTERNET') || d.includes('WATER') ||
        d.includes('GAS_AND_ELECTRICITY') || d.includes('SEWAGE')) {
      return 'Bills';
    }
    if (d.includes('SUBSCRIPTION') || d.includes('DIGITAL')) {
      return 'Subscriptions';
    }
    if (d.includes('GROCERIES') || d.includes('FAST_FOOD') || d.includes('COFFEE') ||
        d.includes('RESTAURANT') || d.includes('BEER_WINE_AND_LIQUOR') ||
        d.includes('VENDING_MACHINES')) {
      return 'Food & Dining';
    }
    if (d.includes('GAS_STATIONS') || d.includes('PARKING') || d.includes('TAXIS') ||
        d.includes('TOLLS') || d.includes('PUBLIC_TRANSIT') || d.includes('BIKES_AND_SCOOTERS')) {
      return 'Transport';
    }
    if (d.includes('FLIGHT') || d.includes('LODGING') || d.includes('RENTAL_CARS')) {
      return 'Transport';
    }
  }

  // Merchant overrides — pattern-matched chains we know are mis-bucketed.
  if (FOOD_MERCHANTS.test(merchant)) return 'Food & Dining';
  if (SUBSCRIPTION_MERCHANTS.test(merchant)) return 'Subscriptions';
  if (TRANSPORT_MERCHANTS.test(merchant)) return 'Transport';
  if (HOUSING_MERCHANTS.test(merchant)) return 'Housing';
  if (BILLS_MERCHANTS.test(merchant)) return 'Bills';
  if (ENTERTAINMENT_MERCHANTS.test(merchant)) return 'Entertainment';
  if (INVESTMENT_MERCHANTS.test(merchant)) return 'Investment';
  if (SHOPPING_MERCHANTS.test(merchant)) return 'Shopping';

  // Plaid's PFC primary — clean mapping table. Preferred over legacy.
  if (pfcPrimary && PFC_TO_VELA[pfcPrimary]) {
    let mapped = PFC_TO_VELA[pfcPrimary];
    // TRANSFER on a credit account = payment-in = Bills, not Investment.
    if ((pfcPrimary === 'TRANSFER_IN' || pfcPrimary === 'TRANSFER_OUT') && accountType === 'credit') {
      mapped = 'Bills';
    }
    return mapped;
  }

  // Legacy `category` fallback for older accounts/items.
  if (!plaidPrimary) return 'Other';
  const p = plaidPrimary.toLowerCase();
  if (p.includes('credit_card') || p.includes('loan_payment')) return 'Bills';
  if (p.includes('food') || p.includes('drink') || p.includes('restaurant')) return 'Food & Dining';
  if (p.includes('travel') || p.includes('transport')) return 'Transport';
  if (p.includes('shop') || p.includes('merchandise')) return 'Shopping';
  if (p.includes('recreation') || p.includes('entertainment')) return 'Entertainment';
  if (p.includes('rent') || p.includes('utilities') || p.includes('home_improvement')) return 'Housing';
  if (p.includes('service') || p.includes('payment') || p.includes('fees') ||
      p.includes('medical') || p.includes('healthcare') || p.includes('government')) return 'Bills';
  if (p.includes('transfer')) return accountType === 'credit' ? 'Bills' : 'Investment';
  if (p.includes('income') || p.includes('payroll')) return 'Income';
  return 'Other';
}

export function isoDateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function mapPlaidAccountIds(supabase, userId, plaidAccountIds) {
  if (plaidAccountIds.length === 0) return {};
  const { data, error } = await supabase
    .from('accounts')
    .select('id, plaid_account_id')
    .eq('user_id', userId)
    .in('plaid_account_id', plaidAccountIds);
  if (error) throw error;
  return Object.fromEntries(data.map((r) => [r.plaid_account_id, r.id]));
}

export async function fetchAllTransactions(accessToken, startDate, endDate) {
  const pageSize = 500;
  const out = [];
  let offset = 0;
  while (true) {
    const { data } = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: pageSize, offset },
    });
    out.push(...data.transactions);
    if (out.length >= data.total_transactions) break;
    offset += pageSize;
    if (offset > 5000) break;
  }
  return out;
}

export async function upsertAccountsFromPlaid(supabase, userId, plaidItemRowId, plaidAccounts) {
  if (plaidAccounts.length === 0) return [];
  const rows = plaidAccounts.map((a) => ({
    user_id: userId,
    plaid_item_id: plaidItemRowId,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name,
    type: a.type,
    subtype: a.subtype,
    balance_current: a.balances?.current ?? null,
    balance_available: a.balances?.available ?? null,
    currency: a.balances?.iso_currency_code || 'USD',
    mask: a.mask,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from('accounts')
    .upsert(rows, { onConflict: 'plaid_account_id' })
    .select('id, plaid_account_id');
  if (error) throw error;
  return data;
}

export async function upsertTransactionsFromPlaid(supabase, userId, plaidTxns) {
  if (plaidTxns.length === 0) return 0;
  const plaidAccountIds = [...new Set(plaidTxns.map((t) => t.account_id))];
  const accountIdMap = await mapPlaidAccountIds(supabase, userId, plaidAccountIds);

  // Pull account types in the same query so we can detect credit-card
  // accounts and route their inflows (= payments) to Bills.
  const { data: accountTypeRows } = await supabase
    .from('accounts')
    .select('plaid_account_id, type')
    .eq('user_id', userId)
    .in('plaid_account_id', plaidAccountIds);
  const accountTypeByPlaidId = Object.fromEntries(
    (accountTypeRows || []).map((r) => [r.plaid_account_id, r.type])
  );

  const rows = plaidTxns
    .map((t) => {
      const accountId = accountIdMap[t.account_id];
      if (!accountId) return null;
      const [primary, secondary] = t.category || [];
      const pfcPrimary = t.personal_finance_category?.primary || null;
      const pfcDetailed = t.personal_finance_category?.detailed || null;
      const accountType = accountTypeByPlaidId[t.account_id];

      let velaCategory;
      // On a credit card account, a negative-amount transaction is a payment
      // INTO the card (reducing balance owed). That's a Bills transfer, not
      // a spend.
      if (accountType === 'credit' && Number(t.amount) < 0) {
        velaCategory = 'Bills';
      } else {
        velaCategory = mapToVelaCategory(
          primary, secondary, t.name, t.merchant_name, accountType,
          pfcPrimary, pfcDetailed
        );
      }

      // Keep the most informative subcategory string for display ("Pizza" beats
      // "FOOD_AND_DRINK_FAST_FOOD" beats "Restaurants" beats nothing).
      const subForDisplay = secondary || (pfcDetailed
        ? pfcDetailed.replace(/^[A-Z_]+_/, '').replace(/_/g, ' ').toLowerCase()
        : null) || primary || null;

      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: t.transaction_id,
        name: t.name,
        merchant_name: t.merchant_name,
        amount: t.amount,
        category: velaCategory,
        subcategory: subForDisplay,
        date: t.date,
        pending: Boolean(t.pending),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return 0;
  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' });
  if (error) throw error;
  return rows.length;
}
