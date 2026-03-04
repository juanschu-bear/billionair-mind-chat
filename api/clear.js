const { supabase } = require('../lib/supabase');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, ceo_id } = req.body;
  const userHash = crypto.createHash('md5').update(user_id || 'anonymous').digest('hex').slice(0, 12);

  await supabase
    .from('conversations')
    .delete()
    .eq('user_hash', userHash)
    .eq('ceo_id', ceo_id);

  return res.status(200).json({ status: 'cleared' });
};
