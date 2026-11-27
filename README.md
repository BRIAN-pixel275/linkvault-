# Link Vault

A private, single-user link organizer for Google Photos, Google Drive, and other URLs. It stores only encrypted link metadata; the referenced files remain hosted by Google.

## Gallery experience

- Saved links appear as framed artworks inside a Nairobi heritage-inspired 3D room. The room uses CSS 3D transforms and requires no WebGL or graphics dependencies.
- Drag horizontally to look around the room, or focus the gallery and use the left/right arrow keys. On-screen arrows turn by 15 degrees.
- Use the `−` and `+` controls or keyboard `-` and `+` to zoom from 80% to 140%. Mobile screens start at 120% zoom and use a compact room layout.
- Selecting a frame opens its artwork view. Direct Google-hosted images and eligible Google Drive files are previewed when available; **Open original** always links to the saved URL. Google Photos sharing pages may require opening the original.
- Card artwork is decorative app content, not a preview or copy of the user's file. Local image sources and licenses are listed in [`ARTWORK_CREDITS.md`](ARTWORK_CREDITS.md).

## Local setup

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor. If the original schema is already installed, run [`20261125_vault_security_updates.sql`](supabase/migrations/20261125_vault_security_updates.sql) before deploying this version.
2. In Supabase Authentication, create the owner's account, then disable public sign-ups. Require TOTP MFA in the Supabase Auth MFA settings and configure your app's site URL/redirect URLs.
3. Copy `.env.example` to `.env` and fill in the project URL and publishable/anon key. These values are public client configuration; never put a service-role key in the app.
4. Run `npm install`, then `npm run dev`.

To preview the interface without contacting Supabase or writing data, run `npm run dev -- --host 127.0.0.1` and open `http://127.0.0.1:5173/?preview=1`. This local demo uses sample links and simulates sign-in, key verification, recovery, and diagnostics. It is visibly marked as a preview and does not validate your live Supabase setup.

Run `npm run build` to create the static production bundle in `dist/`.

The app gates the vault on Supabase assurance level `aal2`. Users without an enrolled TOTP factor are sent through TOTP enrollment at first sign-in. Save the recovery key offline during vault setup.

## Deployment

Deploy as a Vite static site to Vercel or Netlify. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment. The repository includes security headers for both hosts. Add the production URL to Supabase's allowed redirect URLs. Keep sign-ups disabled after creating the owner account.

## Encryption model

Each record is AES-256-GCM encrypted in the browser with a fresh 12-byte IV. PBKDF2-SHA-256 at 600,000 rounds derives the AES key from the master passphrase and a random per-user salt. The recovery key wraps that same key with AES-GCM. The server receives ciphertext, IV, salt, and recovery-wrapped key only. Passphrase, plaintext, and the live CryptoKey are not intentionally persisted by the app.

The browser's Supabase client does persist its authentication session so a signed-in user can use the app; the vault key and decrypted link data are not put in browser storage by app code. Browser memory cannot be reliably zeroed by JavaScript, so locking drops references and clears React state; garbage collection timing is controlled by the browser.

The `key_check` marker lets the client reject a wrong passphrase even when the vault contains no links. For existing vaults, the first correct passphrase unlock initializes that marker after validating a ciphertext record; if the older vault is empty, use its recovery key once to initialize verification. Recovery-based passphrase reset stages ciphertext in `next_payload`/`next_iv` and promotes it with the owner-scoped `finish_vault_key_rotation` SQL function in one database transaction.

## Owner account and single-user operation

The schema enforces row ownership but does not itself limit the project to one account. Disable sign-ups in Supabase Auth after the owner account is created. Do not expose a service-role key in the browser. The anon/publishable key is designed to be public and is restricted by RLS.
