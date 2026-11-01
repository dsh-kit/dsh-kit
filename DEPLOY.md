# Deploy

The public site is a **Cloudflare Worker with static assets**. Wrangler uploads `docs/.vitepress/dist`; there is no
Pages build-output setting and no dashboard project to create.

## One-time setup

1. Create a Cloudflare API token with:
   - Account → Workers Scripts → Edit
   - Zone → DNS → Edit (for the custom domain)
   - Account → Account Settings → Read
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Run **deploy-cloudflare** once from the Actions tab. The first run creates the Worker and attaches the custom
   domain from `wrangler.jsonc`; Cloudflare creates the DNS record and certificate.

After that, every push to `main` that touches `docs/**` builds and deploys automatically. No manual build output path
is involved.

## Local fallback

```bash
pnpm docs:build
npx wrangler@4.156.0 login
npx wrangler@4.156.0 deploy
```

Do not enable Cloudflare Access on the production domain: it is a public documentation site. Use Access only for
preview deployments.
