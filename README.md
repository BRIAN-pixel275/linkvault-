# Link Vault

A private, single-user link organizer for Google Photos, Google Drive, and other URLs. It stores only encrypted link metadata; the referenced files remain hosted by Google.

## Local setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. In Supabase Authentication, create the owner's account, then disable public sign-ups. Require TOTP MFA in the Supabase Auth MFA settings and configure your app's site URL/redirect URLs.
3. Copy `.env.example` to `.env` and fill in the project URL and publishable/anon key. These values are public client configuration; never put a service-role key in the app.
4. Run `npm install`, then `npm run dev`.

The app gates the vault on Supabase assurance level `aal2`. Users without an enrolled TOTP factor are sent through TOTP enrollment at first sign-in. Save the recovery key offline during vault setup.

## Deployment

Deploy as a Vite static site to Vercel or Netlify. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment. The repository includes security headers for both hosts. Add the production URL to Supabase's allowed redirect URLs. Keep sign-ups disabled after creating the owner account.

## Encryption model

Each record is AES-256-GCM encrypted in the browser with a fresh 12-byte IV. PBKDF2-SHA-256 at 600,000 rounds derives the AES key from the master passphrase and a random per-user salt. The recovery key wraps that same key with AES-GCM. The server receives ciphertext, IV, salt, and recovery-wrapped key only. Passphrase, plaintext, and the live CryptoKey are not intentionally persisted by the app.

The browser's Supabase client does persist its authentication session so a signed-in user can use the app; the vault key and decrypted link data are not put in browser storage by app code. Browser memory cannot be reliably zeroed by JavaScript, so locking drops references and clears React state; garbage collection timing is controlled by the browser.

## Owner account and single-user operation

The schema enforces row ownership but does not itself limit the project to one account. Disable sign-ups in Supabase Auth after the owner account is created. Do not expose a service-role key in the browser. The anon/publishable key is designed to be public and is restricted by RLS.
