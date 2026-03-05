<p align="center">
  <img src="assets/bmc-icon-192.png" alt="Billionair Mind Chat" width="120">
</p>

<h1 align="center">Billionair Mind Chat</h1>

An iMessage-style chat app that lets you have conversations with 8 of the world's most influential tech CEOs -- powered by AI (Claude Sonnet or GPT-4o) with optional voice messages via ElevenLabs.

## Features

- **8 Tech CEOs** with unique personality profiles: Elon Musk, Tim Cook, Sam Altman, Satya Nadella, Jensen Huang, Mark Zuckerberg, Sundar Pichai, Jeff Bezos
- **Dual AI support** -- switch between Anthropic Claude and OpenAI GPT-4o in settings
- **Voice messages** -- record voice messages with the mic button; CEOs reply with their own voice (ElevenLabs TTS)
- **Voice library** -- load your ElevenLabs voices and assign any voice to each CEO
- **Transcribe** -- optionally reveal the text of any voice message
- **iOS-style design** -- message bubbles, typing indicator, view transitions, backdrop blur
- **Dark mode** -- automatic via system preference or manual toggle
- **Search** -- filter CEOs in real time
- **Conversation memory** -- smart summaries track meaningful conversations across sessions; CEOs remember your projects, interests, and ongoing topics without you repeating yourself
- **Global message search** -- search across all conversations to find any message from any CEO; results show highlighted snippets with direct links to the chat
- **Persistent conversations** -- chat history stored in Supabase (PostgreSQL)
- **No API key on disk** -- keys stay in browser memory only, sent per request

## How It Works

| Input method | What happens |
|-------------|-------------|
| **Type + Send** | You get a **text reply** (no voice, no ElevenLabs cost) |
| **Mic button** | Your voice is recorded as an **audio bubble**, transcribed for the AI, and the CEO replies with a **voice message** |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML / CSS / JavaScript (no framework) |
| Backend | Node.js Serverless Functions (Vercel) |
| AI APIs | Anthropic Claude API, OpenAI API |
| Voice | ElevenLabs Text-to-Speech, Web Speech API, MediaRecorder |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |

## Project Structure

```
billionair-mind-chat/
├── public/                 # Static frontend (served by Vercel)
│   ├── index.html          # SPA entry point
│   ├── app.js              # Frontend logic (state, events, API calls)
│   ├── style.css           # iOS-inspired styling
│   ├── base.css            # CSS reset
│   └── assets/             # CEO profile images (8 JPGs)
├── api/                    # Vercel Serverless Functions
│   ├── send.js             # POST /api/send -- send message, get AI response
│   ├── tts.js              # POST /api/tts -- text-to-speech via ElevenLabs
│   ├── voices.js           # POST /api/voices -- fetch ElevenLabs voice library
│   ├── history.js          # GET /api/history -- load conversation history
│   └── clear.js            # DELETE /api/clear -- delete conversation
├── lib/
│   ├── supabase.js         # Supabase client
│   └── ceo-profiles.js     # CEO system prompts
├── server.js               # Standalone Node server (for Docker / local use)
├── Dockerfile              # Container deployment
├── package.json
├── vercel.json             # Vercel routing config
└── supabase-schema.sql     # Database schema (run once in Supabase SQL Editor)
```

## Prerequisites

- **Vercel account** -- [vercel.com](https://vercel.com)
- **Supabase account** -- [supabase.com](https://supabase.com)
- **API key** from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com)
- **ElevenLabs API key** (optional) -- [elevenlabs.io](https://elevenlabs.io) for voice messages

## Setup

### 1. Supabase

1. Create a new project on [supabase.com](https://supabase.com)
2. Open the SQL Editor and run the contents of `supabase-schema.sql`
3. Go to **Settings > API** and copy your **Project URL** and **service_role key**

### 2. Vercel

1. Import this repo on [vercel.com](https://vercel.com/new)
2. Add these environment variables:
   - `SUPABASE_URL` -- your Supabase project URL
   - `SUPABASE_SERVICE_KEY` -- your Supabase service_role key
3. Deploy

### 3. Local Development

```bash
git clone https://github.com/juanschu-bear/billionair-mind-chat.git
cd billionair-mind-chat
npm install
npx vercel dev
```

Then open `http://localhost:3000`

### 4. Docker

```bash
docker build -t billionair-mind-chat .
docker run -p 3000:3000 billionair-mind-chat
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/send` | Send a message and get an AI response |
| `POST` | `/api/tts` | Convert text to speech via ElevenLabs |
| `POST` | `/api/voices` | Fetch available voices from ElevenLabs |
| `GET` | `/api/history?user_id=...&ceo_id=...` | Load conversation history |
| `DELETE` | `/api/clear` | Delete a conversation |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE) -- Copyright (c) 2025 Juan Schubert
