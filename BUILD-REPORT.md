# BUILD REPORT — gameatlas

Clean-room rebuild of `com.legendsoflearning.app/catalog` v1.0.0
(remote-only MCP server at `https://app.legendsoflearning.com/mcp`),
built 2026-10-28 as a forwarding client. Package:
`@reneturcios/gameatlas` 0.1.0, registry name
`io.github.CloudCorpRecords/gameatlas`.

## Surface built

Full surface: **3 of 3 captured tools built**, no omissions.

| Tool | Required fields as served |
|------|---------------------------|
| `legends_search_games` | *(none — no `required` key)* |
| `legends_browse_standards` | *(none — no `required` key)* |
| `legends_get_game` | `game_id` |

The upstream `legends_` tool-name prefix is served verbatim.
Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured. Note the
captured inputSchemas carry **no `$schema` marker** (unlike
some other captures in this program); they carry
`additionalProperties: false` and `type: "object"`, and the
fixture governs on both points — tests assert the absence of
a `$schema` key rather than assuming one.

The tool literals were generated programmatically from
`harness/fixtures/legendsoflearning-tools-original.json` by
the script at `/tmp/laneb3-gameatlas-scratch/gen.py` (parse +
re-serialise, placeholder substitution into
`src/forward.ts` from the template in the same scratch dir)
— never retyped — and a post-generation check (the
registration-integrity test suite, plus the parity harness)
confirmed the served literals deep-equal the fixture's 3
tool objects, in order. Tools are registered via the MCP SDK
low-level Server API (`ListToolsRequestSchema` /
`CallToolRequestSchema` handlers), not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on the tools'
names (with the `legends_` prefix), titles, descriptions,
required fields (`legends_search_games` and
`legends_browse_standards` carry no `required` key;
`legends_get_game` requires `game_id`) and property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://app.legendsoflearning.com/mcp`.
- Env override `LEGENDSOFLEARNING_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent, under any environment. Tests assert that no
  `Authorization` header (and no `X-API-Key` header) is sent with an
  empty environment, with a `LEGENDSOFLEARNING_API_KEY`-style
  variable present, and with `AUTHORIZATION` / `API_KEY` /
  `LEGENDSOFLEARNING_TOKEN` variables present.
- Error rendering `gameatlas error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring `Mcp-Session-Id`
  when issued; plain-JSON and SSE replies are both parsed. The
  forwarding core takes an injectable fetch; tests stub the
  upstream — no live network calls in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3), then node_modules populated with
  `npm ci --ignore-scripts --offline`.
- Parses as JSON; `name` == `@reneturcios/gameatlas`.
- Package entries: **128**.
- sha256: `34df9a88926698c7d79036807d99af0600330d176b5adcf4e9094128c753cfbc`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Public learning-games catalogue: search
  K-8 games and browse curriculum standards." — **82 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/gameatlas:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/gameatlas"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/gameatlas`
  and its smoke test asserts the server name `gameatlas`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **65 tests, 65 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 3
   tools; plus session handling/reuse, env override, the
   no-Authorization-header assertions under every environment,
   verbatim argument forwarding and result pass-through including
   upstream isError, SSE parsing, error rendering, MCP-layer
   validation, and CLI behaviour).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/legendsoflearning-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/gameatlas/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/gameatlas/parity-out` → **verdict PASS, parity 100.0**
   (3/3 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
