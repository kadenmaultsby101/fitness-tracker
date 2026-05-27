// Map a Plaid merchant/transaction name to a brand domain so we can pull
// a real logo (via Clearbit's free logo CDN). Falls back to null when we
// don't recognize the merchant — the caller then shows the category emoji.
//
// Clearbit logo URL: https://logo.clearbit.com/<domain>  (free, no key)

const MERCHANT_DOMAINS = [
  // Food & coffee
  [/starbucks/i, 'starbucks.com'],
  [/chipotle/i, 'chipotle.com'],
  [/chick-?fil-?a/i, 'chick-fil-a.com'],
  [/mcdonald/i, 'mcdonalds.com'],
  [/wendy/i, 'wendys.com'],
  [/burger king/i, 'bk.com'],
  [/taco bell/i, 'tacobell.com'],
  [/subway/i, 'subway.com'],
  [/domino/i, 'dominos.com'],
  [/panera/i, 'panerabread.com'],
  [/sweetgreen/i, 'sweetgreen.com'],
  [/shake shack/i, 'shakeshack.com'],
  [/\bcava\b/i, 'cava.com'],
  [/five guys/i, 'fiveguys.com'],
  [/\bkfc\b/i, 'kfc.com'],
  [/dunkin/i, 'dunkindonuts.com'],
  [/panda express/i, 'pandaexpress.com'],
  [/jersey mike/i, 'jerseymikes.com'],
  [/raising cane/i, 'raisingcanes.com'],
  [/popeye/i, 'popeyes.com'],
  [/in.?n.?out/i, 'in-n-out.com'],
  [/whataburger/i, 'whataburger.com'],
  [/krispy kreme/i, 'krispykreme.com'],
  [/jamba/i, 'jamba.com'],
  // Grocery
  [/trader joe/i, 'traderjoes.com'],
  [/whole foods/i, 'wholefoodsmarket.com'],
  [/safeway/i, 'safeway.com'],
  [/kroger/i, 'kroger.com'],
  [/publix/i, 'publix.com'],
  [/\baldi\b/i, 'aldi.us'],
  [/sprouts/i, 'sprouts.com'],
  [/wegmans/i, 'wegmans.com'],
  [/albertson/i, 'albertsons.com'],
  [/trader joe/i, 'traderjoes.com'],
  [/h-?e-?b/i, 'heb.com'],
  // Shopping
  [/amazon|amzn/i, 'amazon.com'],
  [/walmart/i, 'walmart.com'],
  [/target/i, 'target.com'],
  [/costco/i, 'costco.com'],
  [/best buy/i, 'bestbuy.com'],
  [/home depot/i, 'homedepot.com'],
  [/lowe.?s/i, 'lowes.com'],
  [/\bikea\b/i, 'ikea.com'],
  [/macy/i, 'macys.com'],
  [/nordstrom/i, 'nordstrom.com'],
  [/\bnike\b/i, 'nike.com'],
  [/adidas/i, 'adidas.com'],
  [/lululemon/i, 'lululemon.com'],
  [/sephora/i, 'sephora.com'],
  [/\bulta\b/i, 'ulta.com'],
  [/wayfair/i, 'wayfair.com'],
  [/\brei\b/i, 'rei.com'],
  [/etsy/i, 'etsy.com'],
  [/\bgap\b/i, 'gap.com'],
  [/old navy/i, 'oldnavy.com'],
  [/h&m/i, 'hm.com'],
  [/zara/i, 'zara.com'],
  [/uniqlo/i, 'uniqlo.com'],
  // Subscriptions / tech
  [/netflix/i, 'netflix.com'],
  [/spotify/i, 'spotify.com'],
  [/hulu/i, 'hulu.com'],
  [/disney/i, 'disneyplus.com'],
  [/\bhbo|max\.com/i, 'max.com'],
  [/youtube/i, 'youtube.com'],
  [/apple\.com|itunes/i, 'apple.com'],
  [/chatgpt|openai/i, 'openai.com'],
  [/anthropic|claude/i, 'anthropic.com'],
  [/github/i, 'github.com'],
  [/notion/i, 'notion.so'],
  [/figma/i, 'figma.com'],
  [/dropbox/i, 'dropbox.com'],
  [/adobe/i, 'adobe.com'],
  [/audible/i, 'audible.com'],
  // Transport / travel
  [/\buber\b/i, 'uber.com'],
  [/lyft/i, 'lyft.com'],
  [/chevron/i, 'chevron.com'],
  [/shell/i, 'shell.com'],
  [/exxon/i, 'exxon.com'],
  [/\bmobil\b/i, 'exxonmobil.com'],
  [/\bbp\b/i, 'bp.com'],
  [/\b7.?eleven\b/i, '7-eleven.com'],
  [/delta air/i, 'delta.com'],
  [/united air/i, 'united.com'],
  [/american air/i, 'aa.com'],
  [/southwest/i, 'southwest.com'],
  [/jetblue/i, 'jetblue.com'],
  [/airbnb/i, 'airbnb.com'],
  [/marriott/i, 'marriott.com'],
  [/hilton/i, 'hilton.com'],
  [/tesla/i, 'tesla.com'],
  // Bills / telecom
  [/verizon/i, 'verizon.com'],
  [/t.?mobile/i, 't-mobile.com'],
  [/at&t|att fiber/i, 'att.com'],
  [/xfinity|comcast/i, 'xfinity.com'],
  [/spectrum/i, 'spectrum.com'],
  // Investment / fintech
  [/robinhood/i, 'robinhood.com'],
  [/fidelity/i, 'fidelity.com'],
  [/vanguard/i, 'vanguard.com'],
  [/schwab/i, 'schwab.com'],
  [/coinbase/i, 'coinbase.com'],
  [/venmo/i, 'venmo.com'],
  [/paypal/i, 'paypal.com'],
  [/cash app/i, 'cash.app'],
];

export function merchantDomain(merchantName, name) {
  const s = `${merchantName || ''} ${name || ''}`;
  for (const [re, domain] of MERCHANT_DOMAINS) {
    if (re.test(s)) return domain;
  }
  return null;
}

export function merchantLogoUrl(merchantName, name) {
  const domain = merchantDomain(merchantName, name);
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}
