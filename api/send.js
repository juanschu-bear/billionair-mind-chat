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

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server config error: Supabase environment variables missing.' });
  }

  try {
    const ceo = CEO_PROFILES[ceo_id];
    const userHash = crypto.createHash('md5').update(user_id || 'anonymous').digest('hex').slice(0, 12);

    // Load existing conversation from Supabase (try with summary fields, fallback without)
    let row = null;
    let summaryColumnsAvailable = true;

    const { data: fullRow, error: fullError } = await supabase
      .from('conversations')
      .select('messages, conversation_summary, summary_count')
      .eq('user_hash', userHash)
      .eq('ceo_id', ceo_id)
      .single();

    if (fullError && fullError.message && fullError.message.includes('does not exist')) {
      // Summary columns not available yet — fall back to basic query
      summaryColumnsAvailable = false;
      const { data: basicRow, error: basicError } = await supabase
        .from('conversations')
        .select('messages')
        .eq('user_hash', userHash)
        .eq('ceo_id', ceo_id)
        .single();

      if (basicError && basicError.code !== 'PGRST116') {
        return res.status(500).json({ error: `Supabase load error: ${basicError.message}` });
      }
      row = basicRow;
    } else if (fullError && fullError.code !== 'PGRST116') {
      return res.status(500).json({ error: `Supabase load error: ${fullError.message}` });
    } else {
      row = fullRow;
    }

    let messages = row?.messages || [];
    const existingSummary = summaryColumnsAvailable ? (row?.conversation_summary || null) : null;
    const summaryCount = summaryColumnsAvailable ? (row?.summary_count || 0) : 0;

    messages.push({ role: 'user', content: message });

    // --- PROMPT INJECTION: Load user profile + conversation summary ---
    let enrichedSystem = ceo.system;

    // Load user profile if exists
    const { data: profileRow } = await supabase
      .from('user_profiles')
      .select('profile')
      .eq('user_hash', userHash)
      .single();

    if (profileRow?.profile && Object.keys(profileRow.profile).length > 0) {
      const profile = profileRow.profile;
      enrichedSystem += `\n\n[User Context — use naturally, never reference directly]\n`;
      if (profile.interests) enrichedSystem += `Interests: ${profile.interests}\n`;
      if (profile.recurring_topics) enrichedSystem += `Recurring topics: ${profile.recurring_topics}\n`;
      if (profile.projects) enrichedSystem += `Projects: ${profile.projects}\n`;
      if (profile.style) enrichedSystem += `Communication style: ${profile.style}\n`;
    }

    if (existingSummary) {
      enrichedSystem += `\n\n[Last conversation context — continue naturally]\n${existingSummary}`;
    }

    // --- Call AI API with enriched prompt ---
    let responseText;
    if (provider === 'openai') {
      responseText = await callOpenAI(api_key, enrichedSystem, messages);
    } else {
      responseText = await callAnthropic(api_key, enrichedSystem, messages);
    }

    messages.push({ role: 'assistant', content: responseText });

    // Keep last 30 messages
    if (messages.length > 30) {
      messages = messages.slice(-30);
    }

    // --- SMART SUMMARY: Evaluate and generate if warranted ---
    let newSummary = existingSummary;
    let newSummaryCount = summaryCount;

    if (shouldGenerateSummary(messages)) {
      const summaryResult = await generateSummary(api_key, provider, messages, existingSummary);
      if (summaryResult) {
        newSummary = summaryResult;
        newSummaryCount = summaryCount + 1;
      }
    }

    // Upsert conversation to Supabase
    const upsertData = {
      user_hash: userHash,
      ceo_id: ceo_id,
      messages,
      updated_at: new Date().toISOString()
    };
    if (summaryColumnsAvailable) {
      upsertData.conversation_summary = newSummary;
      upsertData.summary_count = newSummaryCount;
    }

    const { error: saveError } = await supabase
      .from('conversations')
      .upsert(upsertData, { onConflict: 'user_hash,ceo_id' });

    if (saveError) {
      return res.status(500).json({ error: `Supabase save error: ${saveError.message}` });
    }

    // --- USER PROFILE: Update every 5th meaningful summary ---
    if (newSummaryCount > summaryCount && newSummaryCount % 5 === 0) {
      generateUserProfile(api_key, provider, userHash).catch(() => {});
    }

    return res.status(200).json({ response: responseText, ceo_name: ceo.name });
  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
};

// --- SMART SUMMARY TRIGGER ---
function shouldGenerateSummary(messages) {
  // Count back-and-forth exchanges (pairs of user+assistant)
  let exchanges = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1]?.role === 'assistant') {
      exchanges++;
    }
  }

  // Need at least 4 exchanges
  if (exchanges < 4) return false;

  // Check if recent messages have substance (not just greetings/small talk)
  const recentMessages = messages.slice(-8);
  const substantivePatterns = [
    /\b(how|what|why|when|should|could|would|can you|tell me|explain|advice|help|strategy|plan|build|grow|invest|revenue|product|team|hire|scale|funding|market|launch|idea|problem|challenge|decision|project)\b/i,
    /\b(think about|working on|started|building|trying to|looking for|struggling with|interested in|considering|planning to)\b/i,
    /\d+[kKmMbB%$]|\$\d/  // Numbers suggesting business/financial discussion
  ];

  const substantiveCount = recentMessages.filter(m =>
    substantivePatterns.some(p => p.test(m.content))
  ).length;

  // At least 3 of the last 8 messages should be substantive
  return substantiveCount >= 3;
}

// --- SUMMARY GENERATION ---
async function generateSummary(apiKey, provider, messages, existingSummary) {
  const summaryPrompt = `Summarize this conversation in 3-4 sentences max. Include: main topics discussed, any open questions, user's sentiment/intent, and any decisions or plans mentioned. Be concise and factual.${existingSummary ? `\n\nPrevious summary to update (integrate new info, don't repeat): ${existingSummary}` : ''}`;

  const condensed = messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');
  const summaryMessages = [
    { role: 'user', content: `${summaryPrompt}\n\n---\n${condensed}` }
  ];

  try {
    if (provider === 'openai') {
      return await callOpenAI(apiKey, 'You are a concise conversation summarizer. Output only the summary, nothing else. Max 4 sentences.', summaryMessages);
    } else {
      return await callAnthropic(apiKey, 'You are a concise conversation summarizer. Output only the summary, nothing else. Max 4 sentences.', summaryMessages);
    }
  } catch {
    return null;
  }
}

// --- USER PROFILE GENERATION ---
async function generateUserProfile(apiKey, provider, userHash) {
  // Load all conversation summaries for this user
  const { data: rows, error: profileLoadError } = await supabase
    .from('conversations')
    .select('ceo_id, conversation_summary, summary_count')
    .eq('user_hash', userHash)
    .not('conversation_summary', 'is', null);

  // If summary columns don't exist yet, skip profile generation
  if (profileLoadError && profileLoadError.message && profileLoadError.message.includes('does not exist')) return;
  if (!rows || rows.length === 0) return;

  const allSummaries = rows.map(r => `[${r.ceo_id}]: ${r.conversation_summary}`).join('\n\n');
  const totalSummaryCount = rows.reduce((sum, r) => sum + (r.summary_count || 0), 0);

  const profilePrompt = `Based on these conversation summaries across different CEOs, create a compact user profile (under 200 words). Return valid JSON with these fields:
- interests: comma-separated list of user's interests
- recurring_topics: topics that come up repeatedly
- projects: any ongoing projects or goals mentioned
- style: brief description of communication style (e.g. "direct and technical" or "curious, asks follow-up questions")

Summaries:\n${allSummaries}`;

  const profileMessages = [{ role: 'user', content: profilePrompt }];

  let profileText;
  try {
    if (provider === 'openai') {
      profileText = await callOpenAI(apiKey, 'You output only valid JSON. No markdown, no code fences.', profileMessages);
    } else {
      profileText = await callAnthropic(apiKey, 'You output only valid JSON. No markdown, no code fences.', profileMessages);
    }
  } catch {
    return;
  }

  // Parse JSON from response
  let profileJson;
  try {
    // Strip potential markdown code fences
    const cleaned = profileText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    profileJson = JSON.parse(cleaned);
  } catch {
    return;
  }

  // Upsert user profile
  await supabase
    .from('user_profiles')
    .upsert(
      {
        user_hash: userHash,
        profile: profileJson,
        summary_count: totalSummaryCount,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_hash' }
    );
}

// --- AI API CALLS ---
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
      const msg = result.error?.message || `Status ${response.status}`;
      if (response.status === 401) {
        return 'Invalid API key. Please check your Anthropic API key in settings.';
      }
      return `API error: ${msg}`;
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
      if (response.status === 401) {
        return 'Invalid API key. Please check your OpenAI API key in settings.';
      }
      return `API error: ${result.error?.message || `Status ${response.status}`}`;
    }
    return result.choices[0].message.content;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}
