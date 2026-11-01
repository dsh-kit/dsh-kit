# Deploy

The public site is deployed to Cloudflare Pages from GitHub Actions.

## One-time setup

1. Create a Cloudflare API token with:
   - Account → Cloudflare Pages → Edit
   - Zone → DNS → Edit (for the custom domain)
   - Account → Account Settings → Read
2. Add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Run **deploy-cloudflare** once from the Actions tab. The first run creates the `dsh-kit` Pages project.
4. In Cloudflare Pages → `dsh-kit` → Custom domains, add `dsh-kit.dev`.

After that, every push to `main` that touches `docs/**` builds and deploys automatically. No manual build output path
is involved.

## Local fallback

```bash
pnpm docs:build
npx wrangler@4.156.0 login
npx wrangler@4.156.0 pages deploy docs/.vitepress/dist --project-name dsh-kit --branch main
```

Do not enable Cloudflare Access on the production domain: it is a public documentation site. Use Access only for
preview deployments.
