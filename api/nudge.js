const { supabase } = require('../lib/supabase');
const { CEO_PROFILES } = require('../lib/ceo-profiles');
const webpush = require('web-push');

// VAPID keys — set these as Vercel environment variables
// Generate once with: npx web-push generate-vapid-keys
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@billionair-mind.chat';

module.exports = async function handler(req, res) {
  // Protect: only allow GET (Vercel cron) or POST with cron secret
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  try {
    // 1. Get all users with push subscriptions
    const { data: subs, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_hash, subscription');

    if (subError || !subs || subs.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscriptions' });
    }

    let sentCount = 0;

    for (const sub of subs) {
      // 2. Find conversations with summaries for this user
      const { data: convos, error: convoError } = await supabase
        .from('conversations')
        .select('ceo_id, conversation_summary, updated_at')
        .eq('user_hash', sub.user_hash)
        .not('conversation_summary', 'is', null)
        .order('updated_at', { ascending: false });

      // Skip if summary columns don't exist yet
      if (convoError && convoError.message && convoError.message.includes('does not exist')) continue;
      if (!convos || convos.length === 0) continue;

      // 3. Check which conversations are "stale" (>24h since last message) but have substance
      const now = new Date();
      const staleCandidates = convos.filter(c => {
        const lastUpdate = new Date(c.updated_at);
        const hoursSince = (now - lastUpdate) / (1000 * 60 * 60);
        return hoursSince >= 24 && hoursSince <= 168; // between 1-7 days old
      });

      if (staleCandidates.length === 0) continue;

      // 4. Check nudge log — don't nudge the same CEO within 48h
      const recentCutoff = new Date(now - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentNudges } = await supabase
        .from('nudge_log')
        .select('ceo_id')
        .eq('user_hash', sub.user_hash)
        .gte('sent_at', recentCutoff);

      const recentlySentCeoIds = new Set((recentNudges || []).map(n => n.ceo_id));

      // Filter out recently nudged CEOs
      const eligible = staleCandidates.filter(c => !recentlySentCeoIds.has(c.ceo_id));
      if (eligible.length === 0) continue;

      // 5. Pick one random conversation to nudge about
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      const ceoProfile = CEO_PROFILES[pick.ceo_id];
      if (!ceoProfile) continue;

      // 6. Generate a nudge message based on the summary
      const nudgeText = generateNudge(ceoProfile.name, pick.conversation_summary);

      // 7. Send push notification
      const payload = JSON.stringify({
        title: ceoProfile.name,
        body: nudgeText,
        ceo_id: pick.ceo_id,
        tag: `nudge-${pick.ceo_id}`,
        url: `/?open=${pick.ceo_id}`
      });

      try {
        await webpush.sendNotification(sub.subscription, payload);
        sentCount++;

        // 8. Log the nudge
        await supabase.from('nudge_log').insert({
          user_hash: sub.user_hash,
          ceo_id: pick.ceo_id,
          nudge_text: nudgeText,
          sent_at: new Date().toISOString()
        });
      } catch (pushErr) {
        // If subscription is invalid/expired, remove it
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('user_hash', sub.user_hash);
        }
      }
    }

    return res.status(200).json({ sent: sentCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Generate a short, in-character nudge from the conversation summary
function generateNudge(ceoName, summary) {
  // Extract key topics from summary to make it contextual
  const topicPatterns = [
    /(?:discussed|talking about|working on|building|planning|interested in|asked about)\s+(.+?)(?:\.|,|$)/i,
    /(?:project|startup|product|idea|business|app|platform)\s*(?:called|named|about|for)?\s+(.+?)(?:\.|,|$)/i,
    /(?:pricing|funding|launch|growth|hiring|scaling|deployment)\b/i
  ];

  let topic = null;
  for (const pattern of topicPatterns) {
    const match = summary.match(pattern);
    if (match) {
      topic = match[1] || match[0];
      topic = topic.trim().replace(/^(the|a|an)\s+/i, '').slice(0, 50);
      break;
    }
  }

  // Nudge templates — casual, in-character
  const templates = topic ? [
    `Hey, how's it going with ${topic}? Would love to hear an update.`,
    `Been thinking about our conversation on ${topic} — any progress?`,
    `Quick check-in: how did things go with ${topic}?`,
    `Yo, what happened with ${topic}? Fill me in.`,
    `Still on my mind — how's ${topic} coming along?`
  ] : [
    `Hey, haven't heard from you in a while. What are you working on?`,
    `What's new? Got any projects I should know about?`,
    `Checking in — anything you want to bounce off me?`,
    `Been a minute. What's keeping you busy?`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}
