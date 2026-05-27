import { useState } from 'react';
import { emojiFor } from './format';
import { colorFor } from './categoryColors';
import { merchantLogoUrl } from './merchantLogo';

// Transaction row icon: real brand logo when we recognize the merchant,
// otherwise the category emoji inside a color-coded ring.
export default function TxnIcon({ txn }) {
  const cat = txn.category || 'Other';
  const [failed, setFailed] = useState(false);
  const logo = merchantLogoUrl(txn.merchant_name, txn.name);

  if (logo && !failed) {
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
          src={logo}
          alt=""
          width={36}
          height={36}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setFailed(true)}
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
