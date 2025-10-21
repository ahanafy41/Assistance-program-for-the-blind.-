# Text Embeddings with Gemini

The Gemini API provides text embedding models to generate numerical representations (embeddings) for words, phrases, and sentences. These embeddings are foundational for advanced NLP tasks like semantic search, classification, and Retrieval-Augmented Generation (RAG).

## Generating Embeddings

You can generate embeddings for a single piece of text or a batch of texts using the `embed_content` method.

### Python Example

```python
from google import genai

client = genai.Client()

# Generate embedding for a single query
result_single = client.models.embed_content(
    model="gemini-embedding-001",
    contents="What is the meaning of life?"
)
print("Single Embedding:", result_single.embeddings)

# Generate embeddings for multiple texts at once
result_batch = client.models.embed_content(
    model="gemini-embedding-001",
    contents=[
        "What is the meaning of life?",
        "What is the purpose of existence?",
        "How do I bake a cake?"
    ]
)
print("Batch Embeddings:", result_batch.embeddings)
```

## Optimizing with Task Type

To improve performance for specific use cases, you can specify a `task_type`. This optimizes the embeddings for the intended task.

| Task Type             | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `SEMANTIC_SIMILARITY` | Optimized to assess text similarity.                         |
| `CLASSIFICATION`      | Optimized to classify texts according to preset labels.      |
| `RETRIEVAL_DOCUMENT`  | Optimized for documents that will be searched/retrieved.       |
| `RETRIEVAL_QUERY`     | Optimized for the search query itself.                       |
| `QUESTION_ANSWERING`  | Optimized for a question to find a document containing the answer. |

### Example with Task Type

```python
from google.genai import types

result = client.models.embed_content(
    model="gemini-embedding-001",
    contents=texts,
    config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY")
)
```

## Controlling Embedding Size

The `gemini-embedding-001` model uses Matryoshka Representation Learning (MRL), allowing you to truncate the embedding to a smaller size without significant quality loss. This can save storage and improve computational efficiency.

You can control this with the `output_dimensionality` parameter. Recommended sizes are `768`, `1536`, or the default `3072`.

```python
result = client.models.embed_content(
    model="gemini-embedding-001",
    contents="What is the meaning of life?",
    config=types.EmbedContentConfig(output_dimensionality=768)
)
```

## Available Model

*   **Model Code**: `gemini-embedding-001`
*   **Input Token Limit**: 2,048 tokens
