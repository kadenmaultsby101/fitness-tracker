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
// Peer-to-peer / wallet transfers — usually Bills (paying back a friend, rent
// to a roommate, etc.) but we can't tell purpose, so categorize as Other only
// if we can't infer better.
const PEER_PAYMENT_PATTERN = /(\bvenmo\b|cash app|cashapp|\bzelle\b|paypal|wise|remitly|western union|^p2p\b)/i;
// Catch-all keyword patterns that fire only when nothing else matched —
// these handle generic merchant names that Plaid mislabels or leaves blank.
const FOOD_KEYWORDS = /(restaurant|cafe|coffee|kitchen|grill|bistro|deli|bakery|pizzeria|bar & grill|pub|tavern|food|gastropub|izakaya|trattoria|cantina|taqueria|brasserie|burger|sushi|ramen|pho |dim sum|hibachi|teriyaki|noodle|donut|bagel|sandwich|salad|smoothie|juice|tea|boba|brewery|wine bar|cocktail|hookah)/i;
const TRANSPORT_KEYWORDS = /(\bgas\b|fuel|petrol|airport|parking|park & |toll road|toll bridge|transit|metro|subway station|train|airline|airways|flights|car wash|auto repair|tire|mechanic|oil change|emissions|^dmv|tag office|garage)/i;
const SHOPPING_KEYWORDS = /(market(?!place)|store|shop|outlet|boutique|emporium|mart\b|warehouse|outfitter|apparel|clothing|fashion|jewelers|jewelry|watches|electronics|hardware|garden|nursery|furniture|home goods|bookstore|stationery|toys|gift)/i;
const HOUSING_KEYWORDS = /(apartments?|condominium|residence|management co|^apt |^apts |co.?op|townhom)/i;
const ENTERTAINMENT_KEYWORDS = /(theatre|theater|cinema|movie|concert|festival|nightclub|venue|club\b|lounge|comedy|arcade|bowl|billiard|pool hall|escape|trivia|karaoke|paintball|laser tag|escape room|stadium|arena|amphitheater|park\b)/i;
const BILLS_KEYWORDS = /(utility|electric|gas company|natural gas|water company|sewer|trash|cable|internet provider|wireless|cellular|phone bill|tuition|loan svc|servicing|credit union|^irs\b|^edd\b|^ftb\b|tax payment|hospital|medical center|urgent care|orthodont|dental|veterinarian|^dr\.? |clinic)/i;

const SUBSCRIPTION_MERCHANTS = /(netflix|hulu|spotify|apple\.com\/bill|apple\.com\/itunes|youtube premium|youtube music|disney\+|disney plus|hbo|max\.com|paramount|peacock|prime video|chatgpt|openai|anthropic|claude|github|notion|figma|dropbox|icloud|google one|microsoft 365|adobe|canva|grammarly|nordvpn|expressvpn|onlyfans|patreon|substack|medium|audible|kindle unlimited|nytimes|wsj|the athletic)/i;
const FOOD_MERCHANTS = /(starbucks|chipotle|chick-?fil-?a|mcdonald|wendy|burger king|taco bell|subway|domino|pizza hut|papa john|panera|sweetgreen|shake shack|cava|five guys|kfc|in.?n.?out|whataburger|dunkin|peet|blue bottle|krispy kreme|panda express|jersey mike|jimmy john|qdoba|raising cane|popeye|arby|wing stop|smashburger|jack in the box|hardee|carl.?s jr|sonic drive|dairy queen|baskin|cold stone|ben and jerry|einstein bagel|jamba|smoothie king|tropical smoothie|tst.? ?\*|trader joe|whole foods|safeway|kroger|publix|aldi|sprouts|wegmans|albertson|food lion|stop & shop|harris teeter|h-e-b|h.e.b|fresh market|natural grocers|grocery|supermarket|farmer.?s market|cafe|coffee|restaurant|grill|kitchen|deli|bistro|brewery|tavern|diner|eatery|bakery|sushi|ramen|noodle|thai |indian |chinese |mexican |vietnamese )/i;
const TRANSPORT_MERCHANTS = /(uber|lyft|chevron|shell oil|exxon|mobil|^bp\b|speedway|sunoco|costco gas|wawa|7.?eleven|valero|ampm|circle k|qt |quiktrip|amtrak|delta air|united air|american air|southwest|jetblue|alaska air|spirit air|frontier|allegiant|hawaiian air|airbnb|vrbo|marriott|hilton|hyatt|holiday inn|sheraton|courtyard|hampton inn|best western|tesla supercharge|electrify america|parking|toll|metro|mta |transit|caltrain|bart|septa|wmata|nj transit|amtrak|enterprise rent|hertz|avis|budget rent|turo|zipcar)/i;
const SHOPPING_MERCHANTS = /(amazon|amzn mktp|walmart|target|costco wholesale|best buy|home depot|lowe.?s|ikea|macy|nordstrom|kohl|tj maxx|t\.j\. maxx|marshalls|ross dress|sephora|ulta|nike|adidas|lululemon|^gap |^gap\.com|old navy|h&m|zara|uniqlo|shein|temu|etsy|wayfair|crate.?and.?barrel|west elm|pottery barn|bed bath|williams sonoma|rei |dick.?s sporting|footlocker|abercrombie|hollister|american eagle|forever 21|barnes.?and.?noble|the home|^kmart\b)/i;
const HOUSING_MERCHANTS = /(rent|mortgage|hoa |property mgmt|landlord|leasing|apartments|housing)/i;
const BILLS_MERCHANTS = /(verizon|t.?mobile|at&t|sprint|xfinity|comcast|spectrum|att fiber|google fiber|cox |starlink|pg&e|coned|duke energy|^edison|^southern california edison|tampa electric|insurance|aetna|cigna|kaiser|unitedhealth|blue cross|blue shield|geico|allstate|state farm|progressive|liberty mutual|hospital|clinic|pharmacy|cvs |walgreens|rite aid|laboratory corp|labcorp|quest diagnostic|water dept|water utility|gas utility|electric bill|trash service|sanitation|^irs |dmv |tax service)/i;
const INVESTMENT_MERCHANTS = /(robinhood|fidelity|vanguard|schwab|coinbase|kraken|binance|wealthfront|betterment|m1 finance|public\.com|^etrade|ameritrade|sofi invest|webull|^acorns\b)/i;
const ENTERTAINMENT_MERCHANTS = /(amc theatre|regal cinema|cinemark|movie tavern|alamo drafthouse|stubhub|ticketmaster|^ax\b|eventbrite|^vivid seats|^seatgeek|fandango|^golf |bowling|paintball|escape room|arcade|^topgolf|six flags|disneyland|disney world|universal studios|^zoo |aquarium|museum|concert|festival|nightclub|venue|gymnastics|fitness|^gym\b|equinox|planet fitness|24 hour fitness|crunch fitness|orangetheory|soulcycle|^pilates|yoga studio|peloton)/i;

// Plaid's `personal_finance_category` primaries. Note: TRANSFER_IN /
// TRANSFER_OUT default to Other because they're truly ambiguous (could
// be ATM cash, paying a friend, paying off a card from another account,
// moving money between own accounts, or actually investing). Investment
// requires explicit confirmation (see below).
const PFC_TO_VELA = {
  INCOME:                   'Income',
  TRANSFER_IN:              'Other',
  TRANSFER_OUT:             'Other',
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

// ATM / raw cash transfers — never categorize as anything specific. We
// can't tell what the cash was for. Routes to Other.
const ATM_PATTERN = /(\batm\b|cash deposit|cash withdrawal|cash advance|^deposit$|^withdrawal$|teller|branch deposit)/i;
// Explicit-investment signal: PFC detailed strings that confirm a real
// buy/sell/contribution. Without one of these, broker merchant matches
// fall through to Other to avoid mislabeling card payoffs.
const INVESTMENT_PFC_DETAILED = /(BUY|SELL|DIVIDEND|CONTRIBUTION|^TRANSFER.*INVESTMENT|SECURITIES|RETIREMENT)/i;

export function mapToVelaCategory(plaidPrimary, _plaidSecondary, name, merchantName, accountType, pfcPrimary, pfcDetailed) {
  const merchant = (merchantName || name || '').toLowerCase();
  const txnName = (name || '').toLowerCase();

  // PAYMENT detection wins over everything — "ROBINHOOD PAYMENT" must
  // never become Investment or Food.
  if (PAYMENT_PATTERN.test(merchant) || PAYMENT_PATTERN.test(txnName)) {
    return 'Bills';
  }
  // ATM / raw cash moves — always Other. We can't tell what the cash
  // was for, so don't pretend.
  if (ATM_PATTERN.test(merchant) || ATM_PATTERN.test(txnName)) {
    return 'Other';
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
  // Broker merchant alone is AMBIGUOUS (could be investing, could be
  // paying off a credit card linked to that broker, could be cash transfer).
  // Only call it Investment when Plaid's detailed PFC confirms a real
  // securities action.
  if (INVESTMENT_MERCHANTS.test(merchant)) {
    if (pfcDetailed && INVESTMENT_PFC_DETAILED.test(pfcDetailed)) return 'Investment';
    // Without explicit confirmation, fall through to Other.
    return 'Other';
  }
  if (SHOPPING_MERCHANTS.test(merchant)) return 'Shopping';

  // Plaid's PFC primary — clean mapping table. Preferred over legacy.
  // EXCEPTION: GENERAL_SERVICES is Plaid's own catch-all and routes too
  // much to "Other-ish" — try keyword fallbacks first before accepting it.
  if (pfcPrimary && PFC_TO_VELA[pfcPrimary] && pfcPrimary !== 'GENERAL_SERVICES') {
    let mapped = PFC_TO_VELA[pfcPrimary];
    if ((pfcPrimary === 'TRANSFER_IN' || pfcPrimary === 'TRANSFER_OUT') && accountType === 'credit') {
      mapped = 'Bills';
    }
    return mapped;
  }

  // Legacy `category` fallback for older accounts/items.
  if (plaidPrimary) {
    const p = plaidPrimary.toLowerCase();
    if (p.includes('credit_card') || p.includes('loan_payment')) return 'Bills';
    if (p.includes('food') || p.includes('drink') || p.includes('restaurant')) return 'Food & Dining';
    if (p.includes('travel') || p.includes('transport')) return 'Transport';
    if (p.includes('shop') || p.includes('merchandise')) return 'Shopping';
    if (p.includes('recreation') || p.includes('entertainment')) return 'Entertainment';
    if (p.includes('rent') || p.includes('utilities') || p.includes('home_improvement')) return 'Housing';
    if (p.includes('service') || p.includes('payment') || p.includes('fees') ||
        p.includes('medical') || p.includes('healthcare') || p.includes('government')) return 'Bills';
    if (p.includes('transfer')) return accountType === 'credit' ? 'Bills' : 'Other';
    if (p.includes('income') || p.includes('payroll')) return 'Income';
  }

  // Keyword catch-alls — last resort before "Other". These are generic
  // English patterns that catch local merchants Plaid doesn't recognize
  // (a small cafe with no chain, a regional gas station, etc.).
  if (FOOD_KEYWORDS.test(merchant) || FOOD_KEYWORDS.test(txnName)) return 'Food & Dining';
  if (TRANSPORT_KEYWORDS.test(merchant) || TRANSPORT_KEYWORDS.test(txnName)) return 'Transport';
  if (BILLS_KEYWORDS.test(merchant) || BILLS_KEYWORDS.test(txnName)) return 'Bills';
  if (HOUSING_KEYWORDS.test(merchant) || HOUSING_KEYWORDS.test(txnName)) return 'Housing';
  if (ENTERTAINMENT_KEYWORDS.test(merchant) || ENTERTAINMENT_KEYWORDS.test(txnName)) return 'Entertainment';
  if (SHOPPING_KEYWORDS.test(merchant) || SHOPPING_KEYWORDS.test(txnName)) return 'Shopping';

  // Peer payments — we genuinely don't know purpose. Bills is the most
  // common reason (rent split, paying friends back).
  if (PEER_PAYMENT_PATTERN.test(merchant) || PEER_PAYMENT_PATTERN.test(txnName)) return 'Bills';

  // Last resort. Log it so we can see what's still falling through and
  // patch the regex next round.
  console.info('[plaid] uncategorized → Other:', {
    name, merchantName, plaidPrimary, pfcPrimary, pfcDetailed,
  });
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
