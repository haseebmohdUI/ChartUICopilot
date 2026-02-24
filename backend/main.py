import re
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok"}


AZURE_ENDPOINT = os.getenv("AZURE_ANTHROPIC_URL")
AZURE_KEY = os.getenv("AZURE_ANTHROPIC_KEY")
DEPLOYMENT_NAME = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a data visualization expert. Given an Apollo GraphQL cache snapshot and a user question, generate a recharts JSX snippet.

CRITICAL RULES:
- A variable called `data` is ALREADY defined and available at runtime. It is an Apollo cache object (NOT an array). USE IT DIRECTLY.
- The cache has a `ROOT_QUERY` key containing query results. Each query result has `__data` (the actual data) and `__timestamp`.
- You MUST extract the relevant array or object from the cache before charting. For example: `const programs = data.ROOT_QUERY["allProgramFirstTestNumber:..."].__data;`
- NEVER define your own data arrays with hardcoded values. NEVER write `const chartData = [{...}, ...]`. Always derive from `data`.
- Return ONLY a JSX code block (```jsx ... ```) followed by a brief explanation
- Use recharts components: ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
- Wrap everything in <ResponsiveContainer width="100%" height={400}>
- Use nice colors from this palette: #8884d8, #82ca9d, #ffc658, #ff7300, #0088fe, #00c49f, #ffbb28, #ff8042
- Do NOT import anything — all components are available as globals
- The JSX must be a single expression, OR variable declarations followed by a JSX expression in parentheses
- When accessing cache keys that contain JSON parameters (e.g. `allProgramFirstTestNumber:{"input":{...}}`), use the EXACT key string provided in the schema description.

EXAMPLE extracting from cache and charting:
```jsx
const queryKey = Object.keys(data.ROOT_QUERY).find(k => k.startsWith("allProgramFirstTestNumber"));
const programs = queryKey ? data.ROOT_QUERY[queryKey].__data : [];
const top10 = [...programs].sort((a, b) => b.passed - a.passed).slice(0, 10);

(<ResponsiveContainer width="100%" height={400}>
  <BarChart data={top10}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="programname" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="passed" fill="#82ca9d" />
    <Bar dataKey="failed" fill="#ff7300" />
  </BarChart>
</ResponsiveContainer>)
```
"""


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    data: dict
    messages: list[MessageItem] = []


class ChatResponse(BaseModel):
    text: str
    jsx: str


# Use a simple test endpoint to verify LLM connection
@app.get("/api/test-llm")
def test_llm():
    from anthropic import AnthropicFoundry

    try:
        client = AnthropicFoundry(
            api_key=AZURE_KEY,
            base_url=AZURE_ENDPOINT,
        )
        response = client.messages.create(
            model=DEPLOYMENT_NAME,
            messages=[{"role": "user", "content": "Say hello in one word"}],
            max_tokens=32,
        )
        return {"response": response.content[0].text}
    except Exception as e:
        return {"error": str(e), "type": type(e).__name__}


# Use sync def (not async) so FastAPI runs it in a threadpool,
# preventing the synchronous SDK call from blocking the server
@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    from anthropic import AnthropicFoundry

    if not AZURE_ENDPOINT or not AZURE_KEY:
        raise HTTPException(status_code=500, detail="Azure Anthropic credentials not configured")

    import json

    # Build a schema summary of the Apollo cache for the LLM
    root_query = req.data.get("ROOT_QUERY", {})
    schema_lines = []
    sample_data = {}
    for key, value in root_query.items():
        if key == "__typename":
            continue
        if isinstance(value, dict) and "__data" in value:
            d = value["__data"]
            if isinstance(d, list):
                schema_lines.append(f'- `{key}`: array of {len(d)} items')
                if d:
                    schema_lines.append(f'  Fields: {list(d[0].keys()) if isinstance(d[0], dict) else "primitive"}')
                    schema_lines.append(f'  Sample: {json.dumps(d[0], default=str)[:300]}')
                    sample_data[key] = d[:2]
            elif isinstance(d, dict):
                schema_lines.append(f'- `{key}`: object with keys {list(d.keys())}')
                sample_data[key] = d
            else:
                schema_lines.append(f'- `{key}`: {type(d).__name__} = {str(d)[:100]}')
        elif isinstance(value, dict):
            schema_lines.append(f'- `{key}`: object with keys {list(value.keys())}')

    schema_description = "\n".join(schema_lines)

    user_message = f"""The `data` variable is an Apollo GraphQL cache object. Access data via `data.ROOT_QUERY["<queryKey>"].__data`.

Available queries in ROOT_QUERY:
{schema_description}

Sample data (first 2 records per query):
{json.dumps(sample_data, indent=2, default=str)[:3000]}

User question: {req.question}"""

    try:
        client = AnthropicFoundry(
            api_key=AZURE_KEY,
            base_url=AZURE_ENDPOINT,
        )

        # Build conversation history + current message
        api_messages = []
        for m in req.messages:
            api_role = "assistant" if m.role == "chartagent" else m.role
            api_messages.append({"role": api_role, "content": m.content})
        api_messages.append({"role": "user", "content": user_message})

        response = client.messages.create(
            model=DEPLOYMENT_NAME,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=api_messages,
        )

        full_text = response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {type(e).__name__}: {str(e)}")

    # Extract JSX from code fences
    jsx = ""
    text = full_text
    match = re.search(r"```(?:jsx|tsx)?\s*\n(.*?)```", full_text, re.DOTALL)
    if match:
        jsx = match.group(1).strip()
        text = full_text[match.end():].strip()
        if not text:
            text = full_text[:match.start()].strip()

    return ChatResponse(text=text, jsx=jsx)
