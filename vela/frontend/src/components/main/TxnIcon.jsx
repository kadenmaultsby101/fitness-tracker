import { useState } from 'react';
import { emojiFor } from './format';
import { colorFor } from './categoryColors';
import { merchantDomain } from './merchantLogo';

// Transaction row icon. Logo source priority:
//   1. Plaid's enriched logo_url (best — what Monarch/Origin use)
//   2. A logo derived from Plaid's website / our merchant→domain map,
//      via Google's favicon service (cleaner 'not found' behavior than
//      DuckDuckGo, which returns a gray placeholder)
//   3. Category emoji in a colored ring
function domainFromWebsite(website) {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export default function TxnIcon({ txn }) {
  const cat = txn.category || 'Other';
  const [stage, setStage] = useState(0); // 0 = plaid logo, 1 = favicon, 2 = emoji

  const plaidLogo = txn.logo_url || null;
  const domain = domainFromWebsite(txn.merchant_website) || merchantDomain(txn.merchant_name, txn.name);
  const faviconLogo = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  // Pick current src based on stage + what's available.
  let src = null;
  if (stage === 0 && plaidLogo) src = plaidLogo;
  else if (stage <= 1 && faviconLogo) src = faviconLogo;

  if (src) {
    return (
      <div
        className="txn-em"
        style={{
          padding: 0,
          overflow: 'hidden',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={src}
          alt=""
          width={36}
          height={36}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setStage((s) => (s === 0 && faviconLogo ? 1 : 2))}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="txn-em" style={{ boxShadow: `inset 0 0 0 1.5px ${colorFor(cat)}` }}>
      {emojiFor(cat, txn.subcategory)}
    </div>
  );
}
