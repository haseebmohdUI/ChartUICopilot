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

SYSTEM_PROMPT = """You are a data visualization expert. Given a JSON data payload and a user question, generate a recharts JSX snippet.

CRITICAL RULES:
- A variable called `data` is ALREADY defined and available at runtime. It contains the FULL JSON payload (with pageData, apolloCache, etc.). USE IT DIRECTLY.
- The payload has a `pageData.apolloCache` object where keys are GraphQL query strings and values are the query results.
- Apollo cache values may be indexed objects (keys "0", "1", "2", ...) representing array-like data. Convert them to arrays with `Object.values(data.pageData.apolloCache["queryKey"])`.
- NEVER define your own data arrays with hardcoded values. NEVER write `const chartData = [{...}, ...]`. Always derive from `data`.
- Return ONLY a JSX code block (```jsx ... ```). Do NOT include any text explanation — the summary will be generated separately from the computed data.
- IMPORTANT: Always name your final chart-ready array variable `chartData`. This is required so the runtime can extract the computed values for accurate text summaries.
- Use recharts components: ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ComposedChart, RadialBarChart, RadialBar, ZAxis
- Wrap everything in <ResponsiveContainer width="100%" height={400}>
- Use nice colors from this palette: #8884d8, #82ca9d, #ffc658, #ff7300, #0088fe, #00c49f, #ffbb28, #ff8042
- For BarCharts comparing many categories (>8 items), use `layout="vertical"` with `<YAxis dataKey="name" type="category" width={80} />` and `<XAxis type="number" />` so labels don't overlap. Sort data descending so highest values are at the top.
- For BarCharts with few categories (≤8), use the default horizontal layout with `<XAxis dataKey="name" angle={-30} textAnchor="end" height={60} />` if names are long.
- Always increase the ResponsiveContainer height for vertical bar charts: `height={Math.max(400, chartData.length * 30)}`
- Do NOT import anything — all components are available as globals
- The JSX must be a single expression, OR variable declarations followed by a JSX expression in parentheses
- When accessing cache keys that contain JSON parameters (e.g. `failRateHistory({"input":{...}})`), use the EXACT key string provided in the data.

CHART SELECTION GUIDE:
- BarChart → comparing discrete categories
- LineChart → trends over time
- AreaChart → volume/magnitude over time (use Area with fill and stroke)
- PieChart → part-of-whole (≤7 slices)
- ScatterChart → correlation between two numeric variables (use Scatter with ZAxis for bubble size)
- RadarChart → multi-attribute comparison of few items (wrap with PolarGrid, PolarAngleAxis, PolarRadiusAxis)
- ComposedChart → mixing Bar + Line + Area in one chart
- RadialBarChart → circular progress or single-metric comparison (use RadialBar)

EXAMPLE extracting from cache and charting (note: final array MUST be called `chartData`):
```jsx
const cacheKey = Object.keys(data.pageData.apolloCache).find(k => k.startsWith("failRateHistory"));
const rawData = cacheKey ? data.pageData.apolloCache[cacheKey] : {};
const chartData = Object.values(rawData).filter(d => d && typeof d === "object");

(<ResponsiveContainer width="100%" height={400}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="programyear" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="failRate" fill="#ff7300" name="Fail Rate" />
  </BarChart>
</ResponsiveContainer>)
```
"""


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    data: dict  # The full v2 JSON payload (pageData, apolloCache, etc.)
    messages: list[MessageItem] = []


class ChatResponse(BaseModel):
    text: str
    jsx: str


SUMMARIZE_PROMPT = """You are a data analyst writing an engaging insight summary. You are given the EXACT computed data that a chart is displaying, along with the user's original question.

Write a well-formatted markdown summary that answers the user's question using ONLY the provided computed data. Be precise — this data is the ground truth.

Formatting rules:
- Start with a short **bold heading** that captures the key insight (e.g. "**VFD Leads in Failure Rates**")
- Use **bold** for program names, key values, and important numbers
- Use bullet points or numbered lists to highlight top items (top 3-5)
- Add a brief closing sentence with an overall takeaway
- Keep it concise but visually scannable — not a wall of text
- Use percentage formatting where appropriate (e.g. "**18.7%**")"""


class SummarizeRequest(BaseModel):
    question: str
    chartData: list[dict]


class SummarizeResponse(BaseModel):
    text: str


class ChartRecommendation(BaseModel):
    chartType: str
    reason: str


class RecommendResponse(BaseModel):
    recommendations: list[ChartRecommendation]


RECOMMEND_PROMPT = """You are a data visualization advisor. Given a data schema and user question, suggest 2-3 chart types that would best visualize the answer.

Return ONLY a JSON array of objects with "chartType" and "reason" keys. No markdown, no code fences, just the JSON array.

Chart types to choose from:
- BarChart: comparing discrete categories
- LineChart: trends over time
- AreaChart: volume/magnitude over time
- PieChart: part-of-whole (≤7 slices)
- ScatterChart: correlation between two numeric variables
- RadarChart: multi-attribute comparison of few items
- ComposedChart: mixing Bar + Line + Area
- RadialBarChart: circular progress/single-metric comparison

Example response:
[{"chartType": "BarChart", "reason": "Best for comparing values across categories"}, {"chartType": "PieChart", "reason": "Shows proportion of each category in the whole"}]
"""



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

    data_json = json.dumps(req.data, default=str)

    user_message = f"""Here is the full JSON data payload. A variable called `data` containing this exact object is available at runtime.

{data_json}

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


@app.post("/api/chat/recommend", response_model=RecommendResponse)
def recommend(req: ChatRequest):
    from anthropic import AnthropicFoundry
    import json

    if not AZURE_ENDPOINT or not AZURE_KEY:
        return RecommendResponse(recommendations=[])

    try:
        data_json = json.dumps(req.data, default=str)

        user_message = f"""Here is the full JSON data payload:

{data_json}

User question: {req.question}

Suggest 2-3 chart types as a JSON array."""

        client = AnthropicFoundry(
            api_key=AZURE_KEY,
            base_url=AZURE_ENDPOINT,
        )

        response = client.messages.create(
            model=DEPLOYMENT_NAME,
            max_tokens=256,
            system=RECOMMEND_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw = response.content[0].text.strip()
        parsed = json.loads(raw)
        recommendations = [
            ChartRecommendation(chartType=item["chartType"], reason=item["reason"])
            for item in parsed
        ]
        return RecommendResponse(recommendations=recommendations)
    except Exception:
        return RecommendResponse(recommendations=[])


@app.post("/api/chat/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    from anthropic import AnthropicFoundry
    import json

    if not AZURE_ENDPOINT or not AZURE_KEY:
        return SummarizeResponse(text="")

    try:
        chart_json = json.dumps(req.chartData, default=str)

        user_message = f"""User question: {req.question}

Here is the exact computed data the chart is displaying (this is ground truth):
{chart_json}

Write an accurate summary answering the user's question based on this data."""

        client = AnthropicFoundry(
            api_key=AZURE_KEY,
            base_url=AZURE_ENDPOINT,
        )

        response = client.messages.create(
            model=DEPLOYMENT_NAME,
            max_tokens=512,
            system=SUMMARIZE_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        return SummarizeResponse(text=response.content[0].text.strip())
    except Exception:
        return SummarizeResponse(text="")
