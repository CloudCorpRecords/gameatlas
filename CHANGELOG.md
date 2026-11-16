# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Legends of Learning catalogue MCP server. The three captured full-surface tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `legends_search_games`, `legends_browse_standards`, `legends_get_game` — the full captured surface, 3 of 3 tools, with the upstream `legends_` name prefix served verbatim.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `gameatlas error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `LEGENDSOFLEARNING_MCP_URL`. The registry record declares no headers on the remote, so no auth header is ever sent.
