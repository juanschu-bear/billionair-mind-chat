# Contributing to Billionair Mind Chat

Thank you for your interest in contributing! Here's how you can help.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Run** the dev server: `npm run dev` (requires [Vercel CLI](https://vercel.com/docs/cli))

## Project Structure

```
billionair-mind-chat/
├── api/              # Vercel serverless functions
│   ├── send.js       # Chat message handler (Claude/GPT)
│   ├── tts.js        # ElevenLabs text-to-speech
│   ├── voices.js     # ElevenLabs voice library
│   ├── history.js    # Conversation history
│   └── clear.js      # Clear conversation
├── public/           # Static frontend files (served by Vercel)
│   ├── index.html    # Main HTML
│   ├── app.js        # Frontend application logic
│   ├── style.css     # Styles
│   ├── base.css      # Reset/base styles
│   └── assets/       # CEO avatars
├── vercel.json       # Vercel configuration
└── package.json
```

## Development

### Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- An API key from Anthropic or OpenAI
- (Optional) ElevenLabs API key for voice features

### Running Locally

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment

No `.env` file is needed. API keys are entered by the user in the browser and sent per-request. They are never stored on disk.

## Making Changes

1. Create a **feature branch**: `git checkout -b feature/your-feature`
2. Make your changes
3. Test locally with `npm run dev`
4. **Commit** with a clear message
5. **Push** and open a Pull Request

### Commit Messages

Use clear, descriptive commit messages:
- `Add voice selection dropdown in settings`
- `Fix settings modal scroll on mobile`
- `Update CEO system prompts for better responses`

## What to Contribute

- Bug fixes
- New CEO personalities
- UI/UX improvements
- Accessibility improvements
- Translations / i18n
- Documentation
- Performance optimizations

## Code Style

- Vanilla JS (no frameworks) for the frontend
- Keep it simple — avoid unnecessary abstractions
- Follow the existing code patterns
- Test on mobile (the app is mobile-first)

## Reporting Issues

Use [GitHub Issues](https://github.com/juanschu-bear/billionair-mind-chat/issues) to report bugs or request features. Please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and device info
- Screenshots if applicable

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
