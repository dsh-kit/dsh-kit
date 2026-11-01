# For agents

`dsh-kit` is designed to be used by coding agents, not only read by them.

## Start here

1. Read the one-page setup prompt: <https://dsh-kit.dev/agent-setup/prompt.md>
2. Install the skill:

   ```bash
   npx -y skills add dsh-kit/dsh-kit --skill dsh-kit --yes --global
   ```

3. Read the machine-readable index: <https://dsh-kit.dev/llms.txt>
4. When working in this repository, read `AGENTS.md` first.

## What is discoverable

| Entry | How it is found |
| --- | --- |
| `AGENTS.md` | Read automatically by most coding agents when the repository is opened |
| `skills/dsh-kit` | After `skills add`; not loaded from a clone by itself |
| `llms.txt` | Fetched when the agent supports the convention or is pointed at the URL |
| `agent-setup/prompt.md` | A single URL a human or agent can open |
| Tutorial | Linked from the README, docs nav and `llms.txt` |

## Guardrails

- Run local generation and verification freely.
- Ask before publishing to npm, pushing a release tag, or changing a public deployment.
- Never put tokens, private paths or customer data into the repository or generated docs.
- Do not use undocumented DSH APIs.
