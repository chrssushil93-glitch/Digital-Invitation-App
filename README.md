# Nimantran

Animated digital invitations in English, Hindi and Marathi. Hosts create an invitation, share one link, and see views and RSVPs. Guests need no account.

Built with Next.js 14 (App Router) and Supabase (Postgres and email sign-in).

## What is in here

| Path | What it is |
| --- | --- |
| `app/` | Landing page, host login, studio (editor, share link, dashboard, CSV export), public guest page `/i/[slug]`, API routes for RSVPs and view tracking |
| `lib/` | Designs, translations, Supabase clients |
| `supabase/schema.sql` | Tables and row level security policies |
| `prototype/nimantran.html` | The original single-file concept page, kept for reference |

## Set up

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`, then run `supabase/guest_functions.sql`.
3. In Authentication, URL configuration, set the Site URL to your site address and add `<your site>/auth/callback` to the redirect URLs.
4. Copy `.env.example` to `.env.local` and fill in the two Supabase values and `NEXT_PUBLIC_SITE_URL`.
5. Run:

```bash
npm install
npm run dev
```

Open http://localhost:3000, go to Log in, and use the email link to enter the studio.

## Deploy on Vercel

Import the repository, add the environment variables from `.env.example`, and deploy. Set `NEXT_PUBLIC_SITE_URL` to the production address and add it to the Supabase redirect URLs.

## How data is protected

- Hosts can only read and change their own invitations, replies and views (row level security).
- Guests never touch the tables directly. They use three database functions (`get_public_invite`, `submit_rsvp`, `record_view`) that validate input and run with the table owner's rights. The app needs only the public URL and anon key. There is no secret key anywhere in this project.
- A guest reply is identified by invitation and name. Sending again with the same name updates that reply, so anyone with the link could overwrite a reply made under the same name. That is acceptable for invitations, but it is not suitable for anything needing verified identity.
- The guest link is unlisted but not secret. Anyone who has it can open the invitation and reply.
- Views are counted once per visitor per 30 minutes, using a cookie. The host's own previews are not counted.

## Not built yet

Payments and pricing checkout, more designs and languages, the Monday email report, video and PDF export, and rate limiting on the guest endpoints.
