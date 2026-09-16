<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:menged-development-rules -->
# Menged Transit & Engineering Discipline Rules

1. **GTFS Platform Cluster Spatial Matching**:
   * GTFS stops at major hubs consist of multiple platform node IDs. Always match routes using a spatial buffer radius ($\ge 500\text{m}$) around origin/destination coordinates rather than single `stop_id` equality.

2. **Data Trust Model Transparency**:
   * Label data explicitly: GTFS static graph = `VERIFIED`, Fares = `ESTIMATED`, GTFS-RT live tracking = `UNAVAILABLE`. Never invent or fabricate mock transport data.

3. **Bun Execution & Git Hygiene**:
   * Execute scripts using `bun run`. Keep `bun.lock` in `.gitignore` when contributing alongside `package-lock.json`.
<!-- END:menged-development-rules -->
