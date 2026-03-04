# Security Policy

## Architecture

Billionair Mind Chat is designed with a security-first approach:

- **API keys are never stored on disk.** They are kept in browser memory (localStorage) and sent per-request to the serverless API.
- **Serverless functions** act as a proxy. User API keys are forwarded to Anthropic/OpenAI/ElevenLabs and never logged.
- **No database credentials** are exposed to the frontend.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **join@onioko.com**

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive an acknowledgment within 48 hours, and we will work with you to resolve the issue promptly.

## Scope

The following are in scope:
- XSS, CSRF, or injection vulnerabilities in the frontend or API
- API key exposure or leakage
- Authentication/authorization bypasses
- Server-side vulnerabilities in Vercel serverless functions

The following are out of scope:
- Vulnerabilities in third-party services (Anthropic, OpenAI, ElevenLabs, Vercel)
- Social engineering attacks
- Denial of service attacks
- Issues requiring physical access to a user's device

## Best Practices for Users

- Use separate API keys with limited permissions when possible
- Do not share your session URL (it contains your user ID)
- Clear your browser data after using the app on shared devices
