import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { API } from '../lib/apiUrl';

async function fetchInsights(type, ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error('Not signed in.');
    const res = await fetch(`${API}/api/insights`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

// Fetches a proactive insights section ('briefing' or 'weekly') once, when
// `enabled` is true. Silent on failure — proactive features should never
// break the page.
export function useInsights(type, enabled) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetchInsights(type)
      .then((body) => { if (!cancelled) setData(body); })
      .catch((err) => { if (!cancelled) console.warn('[vela] insights failed', err?.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, enabled]);

  return { data, loading };
}
