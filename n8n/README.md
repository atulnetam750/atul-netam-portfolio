# n8n Automation Starter

This folder contains the workflow design notes for connecting the portfolio to n8n.

## Suggested workflows

1. **Contact form alert** — Supabase Database Webhook on `contact_messages` INSERT → validate payload → send an email/Telegram notification.
2. **Portfolio content review** — manual webhook trigger → draft text → human approval → update the project record through Supabase.
3. **Health check** — scheduled HTTP Request to the live portfolio → check HTTP 200 → notify on failure.

## Security

- Store Supabase URL and a dedicated server-side key in n8n Credentials, never in a browser node or GitHub Pages JavaScript.
- Do not expose an unauthenticated workflow webhook that can send messages or modify data.
- Require an approval step before publishing public content.
- Keep contact data private; only send the minimum fields needed for notification.
