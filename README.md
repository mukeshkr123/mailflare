<img src="public/icon-192.png" alt="Mailflare" width="96" />


# Mailflare

A self-hosted alternative to Google Workspace. Setup **custom domain Emails**, **Calendar, Drive, Booking** and **built-in AI agents**.

Run it on Cloudflare or Docker. Send and receive with Cloudflare, Resend or Amazon SES. Store files in R2, Backblaze B2 or AWS S3. Use D1, Postgres, MySQL or Turso for the database.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hieunc229/mailflare)

## Screenshots

<table>
  <tr>
    <td align="center"><img src="screenshots/1.png" alt="Inbox" width="320"><br>Inbox</td>
    <td align="center"><img src="screenshots/2.png" alt="Manage domains" width="320"><br>Domains</td>
    <td align="center"><img src="screenshots/3.png" alt="Manage inboxes" width="320"><br>Mailboxes</td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/4.png" alt="Calendar" width="320"><br>Calendar</td>
    <td align="center"><img src="screenshots/5.png" alt="Booking" width="320"><br>Booking</td>
    <td align="center"><img src="screenshots/6.png" alt="Drive" width="320"><br>Drive</td>
  </tr>
</table>

### Sponsors

<a target="_blank" href="https://sequenzy.com/?ref=hieunc229/mailflare"><img height="80" src="sponsors/sequenzy.png" alt="Sequenzy"></a>
&nbsp;
<a target="_blank" href="https://drivemug.com/?ref=hieunc229/mailflare"><img height="80" src="sponsors/drivemug.png" alt="Drivemug"></a>

Want to support Mailflare? [Become a sponsor](https://store.paymug.co/buy/mailflare-sponsor).

## Features

### Apps

- **Email**: Custom domain mailboxes, personal or shared, with access you control. Send and receive with Cloudflare Email, Resend or Amazon SES.
- **Routing rules**: Store, forward, reject or sort incoming mail.
- **Calendar**: Repeating events with time zones. Attendees get email invitations.
- **Booking**: Share a public link so anyone can book a free time on your calendar.
- **Drive**: Store and share files.
- **AI agents**: Search mail, draft replies and manage events. Connect other AI tools over MCP.

### Technical

- **Databases**: Cloudflare D1 (default), PostgreSQL, MySQL, Turso / libSQL, or a local SQLite file. Set `DATABASE_URL` to switch. Works with Supabase, Neon, PlanetScale, TiDB and more. See [Databases](docs/databases.md).
- **File storage**: Cloudflare R2, Backblaze B2 or AWS S3.
- **Hosting**: Cloudflare Workers or a single Docker container.
- **Admin**: Users, API keys, webhooks, audit logs and backups.
- **Import**: Bring in mail from IMAP, Gmail Takeout, `.eml` and `.mbox` files.

Mailflare currently supports 34 languages, including English, Português (Brasil), Português (Portugal), Español, Français, Deutsch, Italiano, Nederlands, Polski, Українська, Русский, Türkçe, 中文（简体）, 日本語, 한국어, Bahasa Indonesia, Bahasa Melayu, Tiếng Việt, ไทย, हिन्दी, বাংলা, मराठी, తెలుగు, தமிழ், ગુજરાતી, ಕನ್ನಡ, മലയാളം, ਪੰਜਾਬੀ, සිංහල, Kiswahili, Hausa, plus العربية, اردو and فارسی (right-to-left).

## Cost

You can receive and send mail for free.

- **Receiving**: Cloudflare Email Routing is free.
- **Sending**: Use the free tier of Resend (3,000 emails a month) or Amazon SES. Cloudflare's own sending needs the $5/month Paid Worker plan.

New Amazon SES accounts start in a sandbox. Ask AWS for production access to lift it. Prices change, so check [Resend](https://resend.com/pricing), [Amazon SES](https://aws.amazon.com/ses/pricing/) and [Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).

## Deploy

1. **Deploy the app.** Click **Deploy to Cloudflare**. Keep the app name `mailflare`, or it will break.
2. **Finish setup privately.** Set the `SETUP_SECRET` Worker secret, open `/setup`, enter it and create your admin account.
3. **Connect a domain.** Add a domain from the same Cloudflare account, then create your first mailbox.

> **Use separate, scoped credentials.** Keep the deployment token in your deployment environment. Store a separate runtime `CF_TOKEN` as a Worker secret, restricted to the account and zones used by Mailflare. Grant Zone Read, DNS Edit and Email Routing Rules Edit only for those zones; add account Email Sending Edit only when using Cloudflare sending. See the deployment guide for feature-specific permissions. Avoid Global API Keys and all-account/all-zone access.
>
> **Protect initial setup.** Generate a secret with `openssl rand -hex 32`, store it as the Worker secret `SETUP_SECRET`, and enter it at `/setup`. Keep the app private until setup is complete. You can remove the secret after the first administrator is created.

More options: [deployment guide](docs/deployment.md).

### Deploy with an AI agent

Paste this into an AI agent that has terminal access (Claude Code, Codex, Cursor and similar):

```text
Install Mailflare for me from https://github.com/hieunc229/mailflare on my Cloudflare account.

1. Read README.md, docs/deployment.md and wrangler.jsonc first.
2. Ask me for my Cloudflare account ID and two API tokens, using a secret input:
   a deploy token (for Wrangler) and a runtime token (the Worker secret CF_TOKEN).
   Never print them, commit them, or pass them as command arguments.
3. Keep the Worker name exactly "mailflare". Create or reuse the D1 database
   "mailflare", the R2 bucket "mailflare-raw", and the queues "mailflare-inbound",
   "mailflare-outbound" and "mailflare-agent".
4. Install dependencies and run `npm run validate`. Generate a 32-byte hex setup
   secret through a secure input flow. Run `npm run deploy`, and set CF_TOKEN and
   SETUP_SECRET as Worker secrets. Never print or commit their values.
   Do not run remote database migrations yourself. The /setup page does that.
5. Give me the app URL and anything I still need to do. I will open /setup, create
   the admin account and connect my domain.
```

Token permissions and more options: [deployment guide](docs/deployment.md#deploy-with-an-ai-coding-agent).

### Self-host with Docker

Runs as one container on any server, with SQLite and local files.

```bash
cp .env.docker.example .env.docker
# Set SETUP_SECRET in .env.docker to a fresh `openssl rand -hex 32` value.
docker compose up -d --build
```

See [self-hosting](docs/self-hosting.md).

## Local development

```bash
cp .dev.vars.example .dev.vars
npm ci
# Set SETUP_SECRET in .dev.vars to a fresh `openssl rand -hex 32` value.
npm run db:migrate:local
npm run dev
```

Add your Cloudflare credentials to `.dev.vars`, then open [localhost:3000](http://localhost:3000). Run `npm run db:seed` to load sample data.

- `npm run build`: build the Worker
- `npm run deploy`: build and deploy
- `npm run validate`: type check, lint, run tests and build the Worker
- Updates are manual: review upstream changes before applying and deploying them.

A schema change needs a migration for each database type. See [Databases](docs/databases.md#migrations).

## Documentation

- [Deployment and configuration](docs/deployment.md)
- [Databases](docs/databases.md)
- [Sending and receiving providers](docs/providers.md)
- [API and integrations](docs/api.md)
- [Email assistant and MCP](docs/email-assistant-and-mcp.md)
- [Adding a language](docs/localization.md)
- [Troubleshooting](docs/troubleshooting.md)

## License

See [LICENSE](LICENSE).
