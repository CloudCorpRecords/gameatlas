# gameatlas

Finding a curriculum-aligned learning game for a specific grade and standard, without an account or a login. gameatlas is a local forwarding client for the hosted Legends of Learning MCP service: it answers `tools/list` on your own machine from the captured tool definitions and forwards every read to the service, returning the answers exactly as they come back.

Everything here is a published read over a public catalogue. You can search games by free text, grade level and game type, walk the public curriculum standards taxonomy (sets such as NGSS and CCSS, then the individual standards inside a set), and pull the full public detail for one game — its instructions, vocabulary, discussion questions and the standards it is aligned to. Nothing is submitted, enrolled or purchased by any tool in this package.

## The tools

The upstream tool names keep their `legends_` prefix, served verbatim:

- **`legends_search_games`** — Search the public game catalogue (grades K-12, math, science and social studies). All arguments are optional: `query` matches titles and vocabulary, `grades` filters by grade level (0 is kindergarten), `game_type` is one of `instructional`, `question` or `simulation`, and `learning_objective_ids` narrows to games aligned to standards found through the browse tool. `page` and `page_size` (max 25) paginate.
- **`legends_browse_standards`** — Browse the curriculum taxonomy. With no `standard_set`, it lists the public standard sets; with one, it lists that set's standards with their codes, titles and grades. `query` and `grade` filter, and `page` / `page_size` paginate both modes.
- **`legends_get_game`** — The full public detail for one game by its numeric `game_id` (the only required argument in the surface): description, image, estimated duration, ratings, instructions, vocabulary, discussion questions, capability flags, lexile level and aligned learning objectives.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/gameatlas mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "gameatlas": {
      "command": "npx",
      "args": ["-y", "@reneturcios/gameatlas", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/gameatlas
docker run --rm ghcr.io/cloudcorprecords/gameatlas legends_get_game '{"game_id":1445}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
gameatlas legends_search_games '{}'
gameatlas legends_search_games '{"query":"fractions","grades":[3,4],"page_size":5}'
gameatlas legends_browse_standards '{}'
gameatlas legends_browse_standards '{"standard_set":"CCSS","grade":2,"query":"addition"}'
gameatlas legends_get_game '{"game_id":1445}'
gameatlas --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `LEGENDSOFLEARNING_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://app.legendsoflearning.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The Legends of Learning registry record declares no headers on its remote, so gameatlas sends no authentication header of any kind — the reads are keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `gameatlas error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured full surface, exercises the session handshake and its reuse, asserts that no `Authorization` header is sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
