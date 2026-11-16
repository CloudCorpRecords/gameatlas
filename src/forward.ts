/**
 * gameatlas core: a forwarding client for the hosted
 * Legends of Learning catalogue MCP server.
 *
 * No catalogue data lives on this machine. tools/list is
 * answered from the literal definitions below, which
 * reproduce a live capture of the upstream server word
 * for word (name, title, description and inputSchema
 * exactly as captured). A tools/call travels upstream
 * over a streamable-HTTP JSON-RPC session: an initialize
 * POST, a notifications/initialized POST, then the
 * tools/call POST, carrying the Mcp-Session-Id response
 * header on later requests when the upstream issues one.
 * The session opens lazily on the first forwarded call
 * and is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://app.legendsoflearning.com/mcp and may be
 * replaced with the LEGENDSOFLEARNING_MCP_URL
 * environment variable (that override is a labelled
 * reconstruction). The registry record declares NO
 * headers on the remote: no auth header is ever sent,
 * under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out — become an isError result
 * whose text begins with `gameatlas error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://app.legendsoflearning.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/legendsoflearning-tools-original.json;  */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "legends_search_games",
    "title": "Search Legends of Learning games",
    "description": "Searches the public Legends of Learning game catalog (curriculum-aligned learning games for grades K-12 in math, science, and social studies).\n\nArguments (all optional): `query` free-text matches game titles and vocabulary; `grades` narrows to games for those grade levels (integers, 0 = kindergarten through 12); `game_type` is one of \"instructional\", \"question\", or \"simulation\"; `learning_objective_ids` narrows to games aligned to those learning objectives (get ids from legends_browse_standards); `page` (default 1) and `page_size` (default 10, max 25) paginate.\n\nReturns `games` (each with id, title, description, image, estimated_duration in minutes, type, grades served, teacher/student ratings, and the game's public url) plus `page`, `page_size`, `total_entries`, and `total_pages`.\n\nExample: {\"query\": \"fractions\", \"grades\": [3, 4], \"page_size\": 5} finds up to five 3rd-4th grade games about fractions.\n",
    "inputSchema": {
      "additionalProperties": false,
      "properties": {
        "game_type": {
          "enum": [
            "instructional",
            "question",
            "simulation"
          ],
          "type": "string"
        },
        "grades": {
          "description": "Grade levels to include; 0 means kindergarten",
          "items": {
            "maximum": 12,
            "minimum": 0,
            "type": "integer"
          },
          "type": "array"
        },
        "learning_objective_ids": {
          "description": "Learning objective ids from legends_browse_standards",
          "items": {
            "type": "integer"
          },
          "type": "array"
        },
        "page": {
          "default": 1,
          "minimum": 1,
          "type": "integer"
        },
        "page_size": {
          "default": 10,
          "maximum": 25,
          "minimum": 1,
          "type": "integer"
        },
        "query": {
          "description": "Free-text search over game titles and vocabulary",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "legends_browse_standards",
    "title": "Browse curriculum standards",
    "description": "Browses the public Legends of Learning curriculum taxonomy.\n\nWithout `standard_set`, lists the public standard sets (e.g. id \"NGSS\" for Next Generation Science Standards, \"CCSS\" for Common Core math), each with id, name, and subject_area; `query` filters them by name.\n\nWith `standard_set` (a set id from the list above), lists the standards in that set. Each standard has id, code (e.g. \"2.OA.A.1\" or an NGSS code), title, description, grades (\"k\" and \"1\"-\"12\"), and subject. Use a standard's id in legends_search_games' `learning_objective_ids` to find games aligned to it. `query` free-text matches code, title, and description; `grade` (integer, 0 = kindergarten) narrows to one grade level.\n\n`page` (default 1) and `page_size` (default 10, max 25) paginate both modes.\n\nExample: {\"standard_set\": \"CCSS\", \"grade\": 2, \"query\": \"addition\"} finds 2nd-grade Common Core standards about addition.\n",
    "inputSchema": {
      "additionalProperties": false,
      "properties": {
        "grade": {
          "description": "Only standards for this grade level; 0 means kindergarten",
          "maximum": 12,
          "minimum": 0,
          "type": "integer"
        },
        "page": {
          "default": 1,
          "minimum": 1,
          "type": "integer"
        },
        "page_size": {
          "default": 10,
          "maximum": 25,
          "minimum": 1,
          "type": "integer"
        },
        "query": {
          "description": "Free-text filter (set names, or standard codes/titles/descriptions)",
          "type": "string"
        },
        "standard_set": {
          "description": "A standard set id (e.g. \"NGSS\", \"CCSS\"); omit to list the sets",
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "legends_get_game",
    "title": "Get a Legends of Learning game",
    "description": "Fetches the full public detail for one Legends of Learning game by its numeric id (from legends_search_games).\n\nReturns the game's id, title, description, image, estimated_duration in minutes, type, grades served, teacher/student ratings, instructions, vocabulary, discussion questions, capability flags (supports_ipad, supports_tts, multi_language, saves_progress), lexile_level, the public url, and `learning_objectives` — the standards the game is aligned to, each with id, title, code, and standard_set.\n\nExample: {\"game_id\": 1445} returns that game, or an error result if no such game is publicly available.\n",
    "inputSchema": {
      "additionalProperties": false,
      "properties": {
        "game_id": {
          "description": "Numeric game id, e.g. from legends_search_games results",
          "type": "integer"
        }
      },
      "required": [
        "game_id"
      ],
      "type": "object"
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured full surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `gameatlas error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class GameatlasClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).LEGENDSOFLEARNING_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the remote:
    // no Authorization (or any other auth) header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "gameatlas", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): GameatlasClient {
  return new GameatlasClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new GameatlasClient(deps).callTool(name, args);
}
