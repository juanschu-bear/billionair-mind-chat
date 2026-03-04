module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { elevenlabs_key } = req.body;

  if (!elevenlabs_key) {
    return res.status(400).json({ error: 'ElevenLabs API key required' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': elevenlabs_key
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: `ElevenLabs error: ${errorData.detail?.message || response.statusText}`
      });
    }

    const data = await response.json();
    const voices = (data.voices || []).map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category || 'unknown',
      preview_url: v.preview_url || null
    }));

    return res.status(200).json({ voices });
  } catch (err) {
    return res.status(500).json({ error: `Voices error: ${err.message}` });
  }
};
