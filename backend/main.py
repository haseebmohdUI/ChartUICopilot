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

SYSTEM_PROMPT = """You are a data visualization expert. Given JSON data and a user question, generate a recharts JSX snippet.

CRITICAL RULES:
- A variable called `data` is ALREADY defined and available at runtime. It is an array of objects with the EXACT fields from the JSON I provide. USE IT DIRECTLY.
- NEVER define your own data array. NEVER write `const chartData = [...]` or `const data = [...]`. The data is already there.
- You MAY create derived variables from `data`, for example: `const top5 = data.sort((a,b) => b.passed - a.passed).slice(0,5)`
- Return ONLY a JSX code block (```jsx ... ```) followed by a brief explanation
- Use recharts components: ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
- Wrap everything in <ResponsiveContainer width="100%" height={400}>
- Use nice colors from this palette: #8884d8, #82ca9d, #ffc658, #ff7300, #0088fe, #00c49f, #ffbb28, #ff8042
- Do NOT import anything — all components are available as globals
- The JSX must be a single expression, OR variable declarations followed by a JSX expression in parentheses

EXAMPLE using `data` directly (for a bar chart of passed vs failed):
```jsx
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="programname" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="passed" fill="#82ca9d" />
    <Bar dataKey="failed" fill="#ff7300" />
  </BarChart>
</ResponsiveContainer>
```

EXAMPLE with derived data (top 5 by pass rate):
```jsx
const sorted = [...data].sort((a, b) => b.passRate - a.passRate).slice(0, 5);

(<ResponsiveContainer width="100%" height={500}>
  <BarChart data={sorted}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="programname" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="passRate" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>)
```
"""


class ChatRequest(BaseModel):
    question: str
    data: list[dict]


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

    # Dynamically extract schema from the data
    fields = list(req.data[0].keys()) if req.data else []
    sample = req.data[0] if req.data else {}

    user_message = f"""The `data` variable is an array of {len(req.data)} objects.

Available fields: {fields}

Sample record (first item):
{sample}

Full data:
{req.data}

User question: {req.question}"""

    try:
        client = AnthropicFoundry(
            api_key=AZURE_KEY,
            base_url=AZURE_ENDPOINT,
        )

        response = client.messages.create(
            model=DEPLOYMENT_NAME,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
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
