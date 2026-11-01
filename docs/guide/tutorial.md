# From zero to a working plugin

The end-to-end reference is [dsh-quicknote](https://github.com/dsh-kit/dsh-quicknote), a maintained plugin built
from this template: composer capture, a JSON API, four Agent tools and a sidebar page. This page is the short
version of that path.

## 1. Generate the project

```bash
pnpm create dsh-kit dsh-quicknote
cd dsh-quicknote
pnpm install
```

You get a host half, a client half, tests, a build, `AGENTS.md`, `llms.txt` and one verification command.

## 2. Host half

Keep the store separate from transport. In `src/host/store.ts`, one JSON file, atomic writes:

```ts
await mkdir(dirname(file), { recursive: true })
await writeFile(tmp, JSON.stringify({ notes }), { mode: 0o600 })
await rename(tmp, file)
```

Register the routes on the Host connection service; the client only sees JSON:

```ts
ctx.inject(['connection'], (scope) => {
  const registry = scope.get('connection').fetch
  registry.register({ path: '/api/quicknote/notes', methods: ['GET'], requestBody: 'buffered', fetch })
})
```

Expose the same store as tools for the model: `quicknote_add`, `quicknote_list`, `quicknote_done`,
`quicknote_delete`.

## 3. Client half

The composer button reads the active draft from the conversation service and opens a card:

```ts
const shell = ctx.get('conversation').input.shell(sessionId)
const draft = shell.state.getSnapshot().draft
```

The card saves through `fetch('/api/quicknote/notes/create')`. Saving never clears the draft unless the user
chooses the explicit **Save and clear draft** button; that is the difference between a convenience and losing
someone's text.

Register the pieces as slots:

```ts
ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ ... }, ComposerButton))
ctx.slots.inject('shell.overlay', () => ctx.slots.register({ ... }, Overlay))
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ ... }, Icon))
ctx.slots.inject('main', () => ctx.slots.register({ ... }, Page))
```

## 4. Prove it

```bash
pnpm verify
dsh plugin --profile web add link:$PWD
```

Then in DSH: click **Note** in the composer, save, open the sidebar page, mark the note done and delete it.
The real plugin's repository also contains the tests that cover the store and the client registration.

## 5. What the template deliberately leaves to you

- The product UI and copy.
- Whether notes are local-only or synced.
- The API shape and any additional tools.
- Publishing: see [PUBLISHING.md](https://github.com/dsh-kit/dsh-quicknote/blob/main/PUBLISHING.md) in the
  reference plugin.

The point of the template is that layout, build, types, tests and the copy-safe capture flow are already there;
the product is yours.

## 6. Debug loop

```bash
pnpm test          # one suite
pnpm verify        # the full gate
pnpm build         # regenerate lib/
```

After a client change, rebuild and restart DSH; the web shell caches the bundle per boot. Use
`dsh --profile <profile> --dump-config` to confirm the row and the client entry. Browser DevTools shows the
plugin's console errors; the Host log shows route/tool registration failures.

## 7. Publish

```bash
pnpm verify
git tag v0.1.0
```

Check the artifact with `npm pack --dry-run` before tagging.

Follow [PUBLISHING.md](https://github.com/dsh-kit/dsh-kit/blob/main/PUBLISHING.md): the GitHub repository owns
review and history, npm owns the artifact, and CI publishes with provenance after the tag.

## 8. Host it, document it, and apply for curation

- Push the plugin to its own GitHub repository.
- Give it its own documentation site (install, usage, reference), not a page on the dsh-kit site. The reference
  implementation builds one with VitePress: <https://github.com/dsh-kit/dsh-quicknote/tree/main/docs>.
- To join the curated list, read [CURATION.md](https://github.com/dsh-kit/dsh-kit/blob/main/CURATION.md) and open
  a **Plugin application** issue. The list is curated, not a marketplace.
