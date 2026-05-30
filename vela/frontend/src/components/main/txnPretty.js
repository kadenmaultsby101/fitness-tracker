// Shared helpers for displaying transactions cleanly:
//   - prettyName(t, isTransfer)  → human-readable row name
//   - detectIssuer(name)         → e.g. 'Discover', 'Amex'
//   - isTransferOrPaydown(t, a)  → flag for credit-card paydowns / transfers
// Used by both TransactionsView and HomePage so the row formatting is
// consistent across the app.

export function isTransferOrPaydown(t, account) {
  if (!account) return false;
  const amt = Number(t.amount);
  if ((account.type === 'credit' || account.type === 'loan') && amt < 0) return true;
  const name = `${t.merchant_name || ''} ${t.name || ''}`.toLowerCase();
  if (/(\bpayment\b|\bpmt\b|autopay|e-?pay).*(card|credit|amex|chase|discover|visa|capital one|citi)/.test(name)) return true;
  if (/(amex|chase|discover|visa|capital one|citi).*(payment|pmt|autopay)/.test(name)) return true;
  return false;
}

export function detectIssuer(name) {
  const n = (name || '').toLowerCase();
  if (/discover/.test(n)) return 'Discover';
  if (/\bamex\b|american express/.test(n)) return 'Amex';
  if (/chase/.test(n)) return 'Chase';
  if (/capital\s*one/.test(n)) return 'Capital One';
  if (/citi/.test(n)) return 'Citi';
  if (/visa/.test(n)) return 'Visa';
  if (/mastercard|master\s*card/.test(n)) return 'Mastercard';
  if (/robinhood/.test(n)) return 'Robinhood';
  return null;
}

// Human-readable row name. Plaid sometimes returns bank-feed strings like
// "ORIG CO NAME:DISCOVER CO ENTRY DESCR:E-PAYMENT…". For detected transfers
// we hard-label by the issuer; otherwise we strip known noise prefixes from
// the raw name and keep merchant_name as-is when present.
export function prettyName(t, isTransfer) {
  const raw = (t.merchant_name || t.name || '').trim();
  if (isTransfer) {
    const issuer = detectIssuer(raw);
    return issuer ? `${issuer} Payment` : 'Credit Card Payment';
  }
  if (!t.merchant_name) {
    return raw
      .replace(/\bORIG\s+CO\s+NAME:?/i, '')
      .replace(/\bCO\s+ENTRY\s+DESCR:?/i, '')
      .replace(/\bDESCR:?/i, '')
      .replace(/\bENTRY:?/i, '')
      .replace(/\bWEB\s+ID:?\s*\d+/i, '')
      .replace(/\bORIG\s+ID:?\s*\d+/i, '')
      .replace(/\bSEC:[A-Z]+/i, '')
      .replace(/\bIND\s+ID:?\s*\d+/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      || raw;
  }
  return raw;
}
