# Grounding with Google Search

Grounding with Google Search connects the Gemini model to real-time web content. This allows Gemini to provide more accurate answers and cite verifiable sources beyond its training data. This is a crucial tool for building AI agents that need access to up-to-date information.

## How It Works

When you enable the `google_search` tool, the model automatically handles the entire workflow:
1.  **Prompt Analysis**: The model analyzes the user's prompt to determine if a web search would improve the answer.
2.  **Google Search**: If needed, the model generates and executes one or more search queries.
3.  **Processing**: The model processes the search results, synthesizes the information, and formulates a response.
4.  **Grounded Response**: The API returns the final answer along with `groundingMetadata`, which includes the search queries and web sources used.

## Enabling the Google Search Tool

Enabling the tool is straightforward. You simply include it in the `tools` configuration of your API call.

### Python Example

```python
from google import genai
from google.genai import types

client = genai.Client()

# Define the Google Search tool
grounding_tool = types.Tool(
    google_search=types.GoogleSearch()
)

# Configure the model to use the tool
config = types.GenerateContentConfig(
    tools=[grounding_tool]
)

# Make the API call
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Who won the euro 2024?",
    config=config,
)

print(response.text)
```

## Understanding the Response and Citations

A grounded response includes a `groundingMetadata` field, which is essential for verifying claims and building a citation experience.

The metadata contains:
*   **`webSearchQueries`**: The actual search queries the model used.
*   **`groundingChunks`**: An array of web sources (URI and title).
*   **`groundingSupports`**: Data that links specific segments of the model's text response back to the `groundingChunks`.

You can use this structured data to add inline, clickable citations to your application's output, building user trust.

## Supported Models

This tool is supported by most of the recent Gemini models, including:
*   Gemini 2.5 Pro
*   Gemini 2.5 Flash
*   Gemini 2.5 Flash-Lite
*   Gemini 2.0 Flash
