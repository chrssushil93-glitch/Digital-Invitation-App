# Nimantran

Animated digital invitations in English, Hindi and Marathi. Hosts design an invitation for free, pay once with Razorpay to publish it, share one link, and see views and RSVPs. Guests need no account.

Built with Next.js 14 (App Router), Supabase (Postgres and sign-in) and Razorpay.

## How it works

1. **Design**: pick a template, fill in names, date and venue. The live preview carries a logo watermark until the invitation is paid for. No account needed to start.
2. **Save**: saving asks the host to sign in (password, emailed link, or Google). The invitation is stored as a private draft.
3. **Pay and publish**: the host pays the template's price through Razorpay Checkout. The server checks Razorpay's signature, then publishes the invitation.
4. **Share**: the guest link appears with Copy and WhatsApp buttons. Replies and views update live in the studio.

Guests can open only published invitations. A draft's link shows "not available".

## What is in here

| Path | What it is |
| --- | --- |
| `app/` | Landing page, login, public editor `/create`, studio (dashboard, editor, payment, sharing, replies, CSV), guest page `/i/[slug]`, API routes |
| `app/api/pay/` | Razorpay: create order, verify payment, webhook |
| `components/` | Editor, live preview with watermark, pay button, share card, header |
| `lib/` | Designs and prices, translations, Supabase clients, Razorpay helpers |
| `public/brand/logo.svg` | The logo tiled over unpaid previews. Replace it with your own |
| `supabase/setup.sql` | The whole database: tables, row level security, guest and payment functions |
| `prototype/nimantran.html` | The original single-file concept page, kept for reference |

## Set up

### 1. Database (Supabase)

Open your Supabase project, **SQL Editor → New query**, paste **all** of `supabase/setup.sql`, and press **Run**. It is safe to run again whenever this file changes.

Invitations that existed before payments were added stay live; new ones start as drafts.

### 2. Sign-in (Supabase → Authentication)

- **URL configuration**: set the Site URL to your site address and add `<your site>/**` to the redirect URLs.
- **Email**: Supabase's built-in email only sends to members of your Supabase team, about two emails an hour. Real hosts need one of:
  - custom SMTP (Authentication → Emails → SMTP settings, for example with Resend or Brevo), which makes emailed sign-in links and confirmations work for everyone; or
  - turn **off** "Confirm email" (Authentication → Sign In / Providers → Email) so hosts can create an account with a password and start straight away.
- **Google** (optional): enable the Google provider with a Google Cloud OAuth client. The "Continue with Google" button appears on the login page automatically once it is on.

### 3. Payments (Razorpay)

1. In the Razorpay dashboard, create API keys (start with Test mode).
2. Add a webhook: URL `<your site>/api/pay/webhook`, events `payment.captured` and `order.paid`, with a secret of your choice.
3. Prices come from `lib/designs.ts` (`p`, in rupees) and are charged per invitation.

### 4. Environment variables

Copy `.env.example` to `.env.local` (and add the same values in Vercel → Settings → Environment Variables):

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project settings → API |
| `NEXT_PUBLIC_SITE_URL` | Your site address, used in guest links |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API keys → service_role / secret. Server only |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay → API keys. Server only |
| `RAZORPAY_WEBHOOK_SECRET` | The secret you set on the Razorpay webhook |

### 5. Check it

```bash
npm install
npm run dev
```

Open `/api/health`. Every line should say `ok`. Anything else names the missing step.

### 6. Your logo

Replace `public/brand/logo.svg` with your logo (keep the file name). To use a PNG instead, put it in `public/brand/` and change `WATERMARK_LOGO` in `lib/brand.ts`.

## How data is protected

- Hosts can only read and change their own invitations, replies, views and payments (row level security).
- Hosts can change only an invitation's text and design. The payment columns (`status`, `paid_amount`, `published_at`) can be set only by the `confirm_payment` database function, which only the server's service role may call, and only after Razorpay's signature checks out. Nobody can publish without paying, even by calling the database directly.
- The amount charged is worked out on the server from the template's price, never sent by the browser.
- After publishing, a host can switch only to templates that cost the same or less than they paid.
- Guests never touch the tables directly. They use three database functions (`get_public_invite`, `submit_rsvp`, `record_view`) that validate input, run with the table owner's rights, and only serve published invitations.
- Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are read only by server code and never sent to the browser.
- A guest reply is identified by invitation and name. Sending again with the same name updates that reply, so anyone with the link could overwrite a reply made under the same name. That is acceptable for invitations, but it is not suitable for anything needing verified identity.
- The guest link is unlisted but not secret. Anyone who has it can open the invitation and reply.
- Views are counted once per visitor per 30 minutes, using a cookie. The host's own previews are not counted.

## Not built yet

More designs and languages, refunds from the studio, the Monday email report, video and PDF export, and rate limiting on the guest endpoints.

## 3D model credits (CC BY 4.0)
- Old wooden Door by Ellie3D (Sketchfab)
- 700511 Classic Osgona chandelier by LIGHTSTAR GROUP (Sketchfab)

Original uploads live in `source-assets/`; only optimised copies ship from `public/`.
