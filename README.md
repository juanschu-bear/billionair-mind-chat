# Billionair Mind Chat

Chat-App im iMessage-Stil, mit der du dich mit 8 der einflussreichsten Tech-CEOs der Welt unterhalten kannst -- powered by AI (Claude Sonnet oder GPT-4o).

## Features

- **8 Tech-CEOs** mit individuellen Persoenlichkeitsprofilen: Elon Musk, Tim Cook, Sam Altman, Satya Nadella, Jensen Huang, Mark Zuckerberg, Sundar Pichai, Jeff Bezos
- **Dual-AI-Support** -- Anthropic Claude und OpenAI GPT-4o, wechselbar in den Settings
- **iOS-Design** -- Message-Bubbles, Typing-Indicator, View-Transitions, Backdrop-Blur
- **Dark Mode** -- automatisch via System-Preference oder manuell per Toggle
- **Suchfunktion** -- CEOs in Echtzeit filtern
- **Conversation History** -- Gespraeche werden serverseitig als JSON gespeichert
- **Kein API-Key auf Disk** -- Keys bleiben nur im Browser-Memory und werden per Request gesendet

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | Vanilla HTML / CSS / JavaScript (kein Framework) |
| Backend | Python 3 (CGI) |
| AI APIs | Anthropic Claude API, OpenAI API |
| Storage | JSON-Dateien auf dem Server (`/conversations/`) |
| Dependencies | Keine -- nur Python 3 Standardbibliothek + moderner Browser |

## Projektstruktur

```
billionair-mind-chat/
├── index.html          # SPA Einstiegspunkt
├── app.js              # Frontend-Logik (State, Events, API-Calls)
├── style.css           # iOS-inspiriertes Styling
├── base.css            # CSS Reset
├── assets/             # CEO-Profilbilder (8 JPGs)
└── cgi-bin/
    └── chat.py         # Python-Backend (API-Proxy + Conversation-Manager)
```

## Voraussetzungen

- **Python 3** auf dem Server installiert
- **Webserver mit CGI-Support** (z.B. Apache, lighttpd)
- **API-Key** von [Anthropic](https://console.anthropic.com) oder [OpenAI](https://platform.openai.com)

## Lokales Setup

```bash
# Repo clonen
git clone https://github.com/juanschu-bear/billionair-mind-chat.git
cd billionair-mind-chat

# CGI-Script ausfuehrbar machen
chmod +x cgi-bin/chat.py

# Python-Dev-Server starten (mit CGI-Support)
python3 -m http.server --cgi 8000
```

Dann im Browser oeffnen: `http://localhost:8000`

## API-Endpunkte (Backend)

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| `POST` | `/cgi-bin/chat.py/send` | Nachricht senden, AI-Antwort erhalten |
| `GET` | `/cgi-bin/chat.py/history?user_id=...&ceo_id=...` | Conversation History laden |
| `DELETE` | `/cgi-bin/chat.py/clear` | Conversation loeschen |

## Vercel Deployment -- Status

> **Nicht bereit fuer Vercel.**

Die App nutzt ein Python-CGI-Backend und dateibasierten Storage -- beides ist mit Vercel nicht kompatibel. Folgende Aenderungen waeren noetig:

### Was fehlt

1. **Backend umschreiben** -- `cgi-bin/chat.py` muesste als [Vercel Serverless Function](https://vercel.com/docs/functions/runtimes/python) unter `/api/` neu geschrieben werden (z.B. `api/chat.py` mit einem `handler(request)`-Pattern)
2. **Storage ersetzen** -- JSON-Dateien auf dem Filesystem funktionieren nicht auf Vercel (Serverless = ephemeral Filesystem). Alternativen: Vercel KV, Upstash Redis, Supabase, oder Conversations rein client-seitig im `localStorage` halten
3. **`vercel.json` erstellen** -- Routing-Config fuer statische Dateien + API-Routes
4. **Frontend-Fetch-URLs anpassen** -- von `cgi-bin/chat.py/send` auf `/api/chat` o.ae.

### Minimal-Aufwand fuer Vercel

| Schritt | Aufwand |
|---------|---------|
| API-Route als Serverless Function | ~1-2h |
| Storage auf localStorage umstellen (einfachste Loesung) | ~1h |
| `vercel.json` + URL-Anpassungen | ~30min |
| Testen & Debuggen | ~1h |

### Alternative: Statisches Frontend-Only

Wenn der API-Key direkt vom Browser an die AI-APIs gesendet wird (ohne Backend-Proxy), koennte das Frontend als reine Static Site auf Vercel deployed werden. Dafuer muesste die API-Kommunikation von `app.js` direkt an `api.anthropic.com` / `api.openai.com` gehen. **Nachteil:** CORS-Probleme -- die Anthropic API erlaubt keine direkten Browser-Requests.

## Lizenz

Kein Lizenzfile vorhanden. Bitte bei Bedarf hinzufuegen.
