## 2026-02-23 — Project Setup: React + Vite + shadcn Frontend

**Problem**
Needed a frontend scaffold with login, chat UI, data paste page, and routing.

**Prompt (summary)**
Build a React + Vite + shadcn app with authentication, chat interface, sidebar, and a JSON data paste page.

**Key Output**
- Created login page with hardcoded credentials and Redux auth slice
- Built chat UI with `ChatPage`, `ChatMessage`, `ChatInput`, `ChatSidebar` components
- Added `DataPage` for pasting JSON data, validates and stores in `localStorage` (`chartai-json-data`)
- Set up protected routes: `/login`, `/chat`, `/data`

**Decision / Action**
Kept the frontend as-is and moved on to building the backend pipeline.

---

## 2026-02-23 — Backend + LLM Pipeline: FastAPI + Azure Anthropic

**Problem**
Need a backend that receives a user question + raw JSON data, sends it to Claude via Azure AI Foundry, and returns JSX (recharts code) for the frontend to render.

**Prompt (summary)**
Implement FastAPI backend calling Azure-hosted Anthropic API (AnthropicFoundry SDK), returning JSX chart code.

**Key Output**
- Created `backend/main.py` with FastAPI, CORS, and `POST /api/chat` endpoint
- Uses `AnthropicFoundry` SDK with Azure endpoint and API key from `.env`
- System prompt instructs Claude to return recharts JSX using a `data` variable (no imports , no hardcoded data)
- Parses response: extracts JSX from code fences, returns `{ text, jsx }`

**Decision / Action**
Backend is working — `/api/test-llm` confirmed LLM responds, `/api/chat` returns JSX strings.

---

## 2026-02-23 — Frontend Chart Rendering: Babel Standalone + Dynamic JSX

**Problem**
Need to take the JSX string from the backend and render it as a live recharts chart in the chat UI.

**Prompt (summary)**
Add Babel standalone for JSX transformation, create `renderChart` utility, update ChatMessage and ChatPage to render charts.

**Key Output**
- Added `@babel/standalone` CDN script in `index.html`
- Created `src/lib/renderChart.ts`: transforms JSX string via Babel, injects React + Recharts + data via `new Function`
- Updated `ChatMessage.tsx`: added `jsx?` field, `ChartErrorBoundary`, `ChartRenderer` component
- Updated `ChatPage.tsx`: fetches `/api/chat`, loading state, data from localStorage or `rawData.json` fallback

**Decision / Action**
Full pipeline working: question → backend → Claude → JSX → Babel transform → chart renders in UI.

---

## 2026-02-23 — Debugging: CORS, Port Conflicts, Python Version Issues

**Problem**
Multiple issues getting frontend and backend to communicate: CORS errors, 404s, module not found.

**Prompt (summary)**
Debug and fix CORS, port conflicts (node process on 8000), and Python version mismatch for anthropic SDK.

**Key Output**
- Added Vite proxy (`/api` → `http://localhost:8000`) to bypass CORS entirely
- Discovered a rogue node process on port 8000 causing `"Route not found"` — killed it
- `pip3` installed to Python 3.9 but uvicorn runs Python 3.13 — had to install with `/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -m pip install`
- Azure API returned 401 — switched from raw `httpx` to `AnthropicFoundry` SDK with correct base URL (`/anthropic/`) and deployment name (`claude-sonnet-4-6`)

**Decision / Action**
All issues resolved. Backend serves on 8000, frontend proxies through Vite on 5174, LLM responds correctly.

---

## 2026-02-23 — Added Context7 MCP Server


**Problem**
Wanted to add the Context7 MCP server to Claude Code for up-to-date library documentation lookups.

**Prompt (summary)**
Add Context7 MCP to the project.

**Key Output**
- Created `.mcp.json` at project root with `context7` server config
- Uses `npx -y @upstash/context7-mcp@latest` as the command

**Decision / Action**
MCP config added. Requires Claude Code session restart to activate.

---

## 2026-02-24 — Fix: Markdown Rendering for Assistant Text

**Problem**
The assistant's explanation text was displaying as raw markdown (e.g. `**bold**`, `- bullet`) instead of rendered HTML.

**Prompt (summary)**
Add markdown rendering to ChatMessage for assistant responses.

**Key Output**
- Installed `react-markdown` package
- Wrapped assistant `content` in `<ReactMarkdown>` with `prose prose-invert prose-sm` styling
- Text now renders with proper formatting (bold, lists, code, etc.)

**Decision / Action**
Markdown rendering working for all assistant messages.

---

## 2026-02-24 — Fix: Chart Not Rendering (LLM Hardcoding Data)

**Problem**
The LLM was generating `const chartData = [...]` with hardcoded incomplete data instead of using the runtime-injected `data` variable, resulting in empty/broken charts.

**Prompt (summary)**
Strengthen the system prompt so the LLM uses the `data` variable directly and never defines its own data.

**Key Output**
- Rewrote the system prompt with explicit `CRITICAL RULES` — NEVER define your own data, `data` is already available
- Added two concrete examples: one using `data` directly, one with derived variables (`const sorted = [...data].sort(...)`)
- Improved `renderChart.ts` to strip leftover markdown fences and import statements from JSX
- Added console logging (`[renderChart]`) for debugging Babel transforms in browser DevTools
- Widened assistant message container to 90% when charts are present

**Decision / Action**
System prompt updated. Charts should now use the injected `data` variable with all 37+ program records.
