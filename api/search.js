const { supabase } = require('../lib/supabase');
const { CEO_PROFILES } = require('../lib/ceo-profiles');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  const userHash = crypto.createHash('md5').update(user_id || 'anonymous').digest('hex').slice(0, 12);
  const query = q.trim().toLowerCase();

  try {
    // Load all conversations for this user
    const { data: rows, error } = await supabase
      .from('conversations')
      .select('ceo_id, messages')
      .eq('user_hash', userHash);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = [];

    for (const row of rows) {
      const ceoId = row.ceo_id;
      const ceo = CEO_PROFILES[ceoId];
      if (!ceo || !row.messages) continue;

      for (let i = 0; i < row.messages.length; i++) {
        const msg = row.messages[i];
        if (!msg.content) continue;

        if (msg.content.toLowerCase().includes(query)) {
          // Extract snippet around the match
          const idx = msg.content.toLowerCase().indexOf(query);
          const start = Math.max(0, idx - 40);
          const end = Math.min(msg.content.length, idx + query.length + 60);
          let snippet = msg.content.substring(start, end);
          if (start > 0) snippet = '...' + snippet;
          if (end < msg.content.length) snippet = snippet + '...';

          results.push({
            ceo_id: ceoId,
            ceo_name: ceo.name,
            role: msg.role,
            snippet,
            message_index: i
          });

          // Limit to 20 results total
          if (results.length >= 20) break;
        }
      }
      if (results.length >= 20) break;
    }

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
