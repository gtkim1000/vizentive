<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project backup rule

- When the user asks to "백업해줘", create both a local backup (source archive and Git bundle) and a remote backup on the configured Git remote (`origin`).
- Use the backup name supplied by the user. If no name is supplied, use a concise timestamped name.
- Do not treat a backup request as authorization to deploy the site or alter production data.
