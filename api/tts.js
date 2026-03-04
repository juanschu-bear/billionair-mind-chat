module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, ceo_id, elevenlabs_key, voice_id } = req.body;

  if (!elevenlabs_key) {
    return res.status(400).json({ error: 'ElevenLabs API key required' });
  }

  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  // Default ElevenLabs voice IDs - replace with cloned voice IDs for each CEO
  const CEO_VOICES = {
    'elon-musk': 'TxGEqnHWrfWFTfGW9XjX',       // Josh
    'tim-cook': 'pNInz6obpgDQGcFmaJgB',          // Adam
    'sam-altman': 'ErXwobaYiN019PkySvjV',         // Antoni
    'satya-nadella': 'yoZ06aMxZJJ28mfd3POQ',      // Sam
    'jensen-huang': 'VR6AewLTigWG4xSOukaG',       // Arnold
    'mark-zuckerberg': 'ZQe5CZNOzWyzPSCn5a3c',    // James
    'sundar-pichai': 'ODq5zmih8GrVes37Dizd',       // Patrick
    'jeff-bezos': 'N2lVS1w4EtoT3dr4eOWO',         // Callum
  };

  // Use custom voice_id if provided, otherwise fall back to defaults
  const voiceId = voice_id || CEO_VOICES[ceo_id] || 'pNInz6obpgDQGcFmaJgB';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabs_key
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: `ElevenLabs error: ${errorData.detail?.message || response.statusText}`
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({ audio: base64, content_type: 'audio/mpeg' });
  } catch (err) {
    return res.status(500).json({ error: `TTS error: ${err.message}` });
  }
};
