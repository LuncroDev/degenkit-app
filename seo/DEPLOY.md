# Deploying DegenKit

The site is static HTML/CSS/JS plus one serverless function (`netlify/functions/upload.mjs`).
Deploy it from this repository with Netlify (Add new site → Import from Git). Netlify reads `netlify.toml`.

## Environment variables (Netlify → Site configuration → Environment variables)

| Name | What it is |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_BUCKET` | R2 bucket name |
| `R2_ACCESS_KEY_ID` | R2 API token access key (Object Read & Write on that bucket only) |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_PUBLIC_URL` | Public base URL of the bucket, for example `https://pub-xxxx.r2.dev` |

These are used only by the upload function. They are never sent to the browser.

## Database

Run `rotate_admin_passcode.sql` once in the Supabase SQL editor (after replacing the placeholder with your own passcode), then `free_wallets_setup.sql`. The admin panel asks for the passcode when needed; it is not stored in the site.

## Rebuilding generated pages

```
python3 seo/apply_seo.py && python3 seo/add_guides.py && python3 blog-src/build.py && python3 docs-src/build.py && python3 tools-src/build.py
```
