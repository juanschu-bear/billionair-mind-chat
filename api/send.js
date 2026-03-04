const { supabase } = require('../lib/supabase');
const { CEO_PROFILES } = require('../lib/ceo-profiles');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, ceo_id, message, api_key, provider } = req.body;

  if (!api_key) {
    return res.status(400).json({ error: 'API key required. Please set your API key in settings.' });
  }

  if (!CEO_PROFILES[ceo_id]) {
    return res.status(400).json({ error: 'Unknown CEO' });
  }

  const ceo = CEO_PROFILES[ceo_id];
  const userHash = crypto.createHash('md5').update(user_id || 'anonymous').digest('hex').slice(0, 12);

  // Load existing conversation from Supabase
  const { data: row } = await supabase
    .from('conversations')
    .select('messages')
    .eq('user_hash', userHash)
    .eq('ceo_id', ceo_id)
    .single();

  let messages = row?.messages || [];
  messages.push({ role: 'user', content: message });

  // Call AI API
  let responseText;
  if (provider === 'openai') {
    responseText = await callOpenAI(api_key, ceo.system, messages);
  } else {
    responseText = await callAnthropic(api_key, ceo.system, messages);
  }

  messages.push({ role: 'assistant', content: responseText });

  // Keep last 30 messages
  if (messages.length > 30) {
    messages = messages.slice(-30);
  }

  // Upsert conversation to Supabase
  await supabase
    .from('conversations')
    .upsert(
      { user_hash: userHash, ceo_id: ceo_id, messages, updated_at: new Date().toISOString() },
      { onConflict: 'user_hash,ceo_id' }
    );

  return res.status(200).json({ response: responseText, ceo_name: ceo.name });
};

async function callAnthropic(apiKey, systemPrompt, messages) {
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return `API error: ${result.error?.message || response.status}`;
    }
    return result.content[0].text;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

async function callOpenAI(apiKey, systemPrompt, messages) {
  const oaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }))
  ];

  const payload = {
    model: 'gpt-4o',
    max_tokens: 300,
    messages: oaiMessages
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      return `API error: ${result.error?.message || response.status}`;
    }
    return result.choices[0].message.content;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}
