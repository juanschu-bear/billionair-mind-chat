const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  // GET ?vapid=1 → return VAPID public key for client-side subscription
  if (req.method === 'GET') {
    const vapidKey = process.env.VAPID_PUBLIC_KEY;
    if (!vapidKey) return res.status(200).json({ vapid_public_key: null });
    return res.status(200).json({ vapid_public_key: vapidKey });
  }

  if (req.method === 'DELETE') {
    // Unsubscribe
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const userHash = crypto.createHash('md5').update(user_id).digest('hex').slice(0, 12);
    await supabase.from('push_subscriptions').delete().eq('user_hash', userHash);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, subscription } = req.body;

  if (!user_id || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'user_id and subscription required' });
  }

  const userHash = crypto.createHash('md5').update(user_id).digest('hex').slice(0, 12);

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_hash: userHash,
        subscription,
        created_at: new Date().toISOString()
      },
      { onConflict: 'user_hash' }
    );

  if (error) {
    return res.status(500).json({ error: `Supabase error: ${error.message}` });
  }

  return res.status(200).json({ ok: true });
};
