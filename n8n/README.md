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

## Importable contact alert template

Import `contact-alert-workflow.json` into n8n, then:
1. Create an HTTP Header Auth credential and set a long random header value.
2. Attach that credential to the Contact Webhook node.
3. Add your Telegram credential and set your private chat ID in the Telegram Notification node.
4. In Supabase, configure a Database Webhook for INSERT on `public.contact_messages` to call the n8n Production webhook URL.
5. Send the same header value from the Supabase webhook configuration.
6. Test with a dummy contact record, then activate the workflow.

The exported workflow is intentionally inactive and contains credential placeholders. Do not activate it until both credentials are configured. Treat contact form details as private; only send notifications to your own private channel.
