# Atul Netam Portfolio 2.0

This upgrade keeps the current GitHub Pages site and adds a Supabase-powered admin dashboard, database-managed projects, contact inbox, and a protected AI assistant.

## What is included

- Floating Hindi/English AI assistant
- Supabase email/password admin login
- Project create/edit/delete and publish toggle
- Editable profile summary
- Contact form and admin inbox
- Public page displays published projects from Supabase
- Row Level Security (RLS) on every public table
- Server-side OpenAI Responses API call (key never sent to browser)
- AI message size validation, strict origin check, and hourly per-IP quota
- Existing GitHub Actions YouTube/news sync remains enabled
- PWA/offline support from the earlier upgrade

## 1. Configure the frontend

Edit `assets/js/config.js` and set:
- `supabaseUrl`: your Supabase project URL
- `supabasePublishableKey`: your project's publishable key (legacy anon key is supported)

Only publishable/anon keys may appear in browser code. Never put a service-role/secret key or OpenAI key in GitHub Pages files.

## 2. Configure Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. In Authentication, create your own email/password user.
4. Turn off public sign-ups if the dashboard is intended for one administrator only.
5. Replace `YOUR_ADMIN_EMAIL` in the final SQL seed statement with the email used for your admin account, then run that statement.
6. Set the Auth Site URL and Redirect URLs to:
   - `https://atulnetam750.github.io/atul-netam-portfolio/`
   - `https://atulnetam750.github.io/atul-netam-portfolio/admin/`

## 3. Deploy the AI Edge Function

Add these secrets in Supabase Dashboard → Edge Functions → Secrets:
- `OPENAI_API_KEY`: your private OpenAI API key
- `AI_RATE_LIMIT_SALT`: a long random secret

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Function runtime. Do not copy the service-role key into the website.

From the repository root, with the Supabase CLI installed and linked to your project:
```bash
supabase functions deploy ai-assistant
```

The function calls the OpenAI Responses API. API usage may incur separate charges. If you do not configure these secrets, the rest of the portfolio still works; the AI assistant will show a setup message.

## 4. Admin dashboard

Open `https://atulnetam750.github.io/atul-netam-portfolio/admin/` and sign in with the Auth user you seeded in `admin_users`.

You can:
- Edit headline, about text, and public work location
- Add, edit, publish/unpublish, and delete projects
- Read contact form submissions and mark them as read

## 5. GitHub Pages and automation

The existing `.github/workflows/auto-fixer.yml` keeps the 2-hour YouTube/IBC24 sync. `.github/workflows/portfolio-quality.yml` checks JavaScript syntax and validates the feed JSON on pushes and pull requests.

GitHub Pages serves static frontend files only. Supabase runs the database and AI Edge Function.

## 6. n8n automation

See `n8n/README.md`. Suggested flows:
- Supabase contact-message insert → Telegram/email notification
- Scheduled website health check → failure notification
- Draft content → manual approval → publish to Supabase

Use n8n Credentials for all server-side keys. Never put secrets in browser code. Require human approval before publishing public content.

## Privacy

The public portfolio should show only broad work location (Narayanpur, Chhattisgarh). Do not publish home address, personal phone numbers, date of birth, passwords, or API secrets.
