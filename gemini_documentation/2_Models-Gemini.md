# Gemini Models

This document provides an overview of the available Gemini models, their capabilities, and specifications.

## Gemini 2.5 Pro

**Our state-of-the-art thinking model**, capable of reasoning over complex problems in code, math, and STEM, as well as analyzing large datasets, codebases, and documents using long context.

| Property              | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Model code**        | `gemini-2.5-pro`                                  |
| **Supported data**    | **Inputs:** Audio, images, video, text, and PDF<br>**Output:** Text |
| **Token limits**      | **Input:** 1,048,576<br>**Output:** 65,536         |
| **Capabilities**      | Function calling, Code execution, Search grounding, etc. |
| **Knowledge cutoff**  | January 2025                                      |

---

## Gemini 2.5 Flash

**Our best model in terms of price-performance**, offering well-rounded capabilities. 2.5 Flash is best for large scale processing, low-latency, high volume tasks that require thinking, and agentic use cases.

| Property              | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Model code**        | `gemini-2.5-flash`                                |
| **Supported data**    | **Inputs:** Text, images, video, audio<br>**Output:** Text |
| **Token limits**      | **Input:** 1,048,576<br>**Output:** 65,536         |
| **Capabilities**      | Function calling, Code execution, Search grounding, etc. |
| **Knowledge cutoff**  | January 2025                                      |

---

## Gemini 2.5 Flash Image

For generating and editing images.

| Property              | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Model code**        | `gemini-2.5-flash-image`                          |
| **Supported data**    | **Inputs:** Images and text<br>**Output:** Images and text |
| **Token limits**      | **Input:** 32,768<br>**Output:** 32,768             |
| **Capabilities**      | Image generation, Structured outputs, etc.        |
| **Knowledge cutoff**  | June 2025                                         |

---

## Gemini 2.5 Flash TTS (Text-to-Speech)

For generating audio from text.

| Property              | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Model code**        | `gemini-2.5-flash-preview-tts`                    |
| **Supported data**    | **Inputs:** Text<br>**Output:** Audio              |
| **Token limits**      | **Input:** 8,000<br>**Output:** 16,000              |
| **Capabilities**      | Audio generation                                  |

---

## Gemini 2.5 Flash-Lite

**Our fastest flash model** optimized for cost-efficiency and high throughput.

| Property              | Description                                       |
| --------------------- | ------------------------------------------------- |
| **Model code**        | `gemini-2.5-flash-lite`                           |
| **Supported data**    | **Inputs:** Text, image, video, audio, PDF<br>**Output:** Text |
| **Token limits**      | **Input:** 1,048,576<br>**Output:** 65,536         |
| **Capabilities**      | Function calling, Code execution, Search grounding, etc. |
| **Knowledge cutoff**  | January 2025                                      |

---

## Model Version Patterns

Gemini models are available in different versions:

*   **Stable:** Recommended for production apps (e.g., `gemini-2.5-flash`).
*   **Preview:** Early access to new models, may have billing enabled.
*   **Latest:** Points to the most recent release, which could be stable, preview, or experimental.
*   **Experimental:** For feedback and early access, not recommended for production.
