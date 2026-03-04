# Billionair Mind Chat

An iMessage-style chat app that lets you have conversations with 8 of the world's most influential tech CEOs -- powered by AI (Claude Sonnet or GPT-4o).

## Features

- **8 Tech CEOs** with unique personality profiles: Elon Musk, Tim Cook, Sam Altman, Satya Nadella, Jensen Huang, Mark Zuckerberg, Sundar Pichai, Jeff Bezos
- **Dual AI support** -- switch between Anthropic Claude and OpenAI GPT-4o in settings
- **iOS-style design** -- message bubbles, typing indicator, view transitions, backdrop blur
- **Dark mode** -- automatic via system preference or manual toggle
- **Search** -- filter CEOs in real time
- **Persistent conversations** -- chat history stored in Supabase (PostgreSQL)
- **No API key on disk** -- keys stay in browser memory only, sent per request

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML / CSS / JavaScript (no framework) |
| Backend | Node.js Serverless Functions (Vercel) |
| AI APIs | Anthropic Claude API, OpenAI API |
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
│   ├── history.js          # GET /api/history -- load conversation history
│   └── clear.js            # DELETE /api/clear -- delete conversation
├── lib/
│   ├── supabase.js         # Supabase client
│   └── ceo-profiles.js     # CEO system prompts
├── package.json
├── vercel.json             # Vercel routing config
└── supabase-schema.sql     # Database schema (run once in Supabase SQL Editor)
```

## Prerequisites

- **Vercel account** -- [vercel.com](https://vercel.com)
- **Supabase account** -- [supabase.com](https://supabase.com)
- **API key** from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com)

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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/send` | Send a message and get an AI response |
| `GET` | `/api/history?user_id=...&ceo_id=...` | Load conversation history |
| `DELETE` | `/api/clear` | Delete a conversation |

## License

No license file present. Please add one if needed.
