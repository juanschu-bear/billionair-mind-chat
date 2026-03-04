const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, ceo_id } = req.query;
  const userHash = crypto.createHash('md5').update(user_id || 'anonymous').digest('hex').slice(0, 12);

  const { data: row } = await supabase
    .from('conversations')
    .select('messages')
    .eq('user_hash', userHash)
    .eq('ceo_id', ceo_id)
    .single();

  let messages = row?.messages || [];

  // Return last 20 messages
  if (messages.length > 20) {
    messages = messages.slice(-20);
  }

  return res.status(200).json({ messages });
};
