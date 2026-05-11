// Wrap a Promise in a timeout race so a hung Supabase call can't trap the
// user staring at a 'Saving…' button forever. Throws after `ms` if the
// inner promise hasn't settled.
export async function withTimeout(promise, ms = 8000, message = 'Network is slow — try again') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
