# Code Execution Tool

The Gemini API provides a code execution tool that enables the model to generate and run Python code. This allows the model to perform complex calculations, solve math problems, and analyze data, learning iteratively from the code's output.

## How It Works

When the `code_execution` tool is enabled, the model can choose to write and execute Python code to help answer a user's prompt. The response from the API will then contain a sequence of parts:
1.  `text`: The model's explanation of its plan.
2.  `executableCode`: The Python code the model has generated.
3.  `codeExecutionResult`: The output from running the code.
4.  `text`: The final, user-facing answer derived from the code's result.

## Enabling Code Execution

To enable the tool, you simply add it to the `tools` configuration in your API call.

### Python Example

```python
from google import genai
from google.genai import types

client = genai.Client()

# Enable the code execution tool
config = types.GenerateContentConfig(
    tools=[types.Tool(code_execution=types.ToolCodeExecution)]
)

# Ask a question that requires calculation
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="What is the sum of the first 50 prime numbers? "
             "Generate and run code for the calculation.",
    config=config,
)

# The response will contain the code and its result
for part in response.candidates[0].content.parts:
    if part.executable_code is not None:
        print("--- Code ---")
        print(part.executable_code.code)
    if part.code_execution_result is not None:
        print("--- Result ---")
        print(part.code_execution_result.output)
    if part.text is not None and "sum" in part.text:
         print("--- Final Answer ---")
         print(part.text)
```

## Advanced Features: I/O

For `Gemini 2.0 Flash` and newer models, code execution supports:
*   **File Input**: You can upload text or CSV files and ask the model to analyze them using code.
*   **Graph Output**: The model can use Python libraries like `Matplotlib` to generate charts and graphs, which are returned as inline images in the response.

## Supported Libraries

The code execution environment comes with a wide range of pre-installed Python libraries, including:
*   `pandas`
*   `numpy`
*   `scipy`
*   `scikit-learn`
*   `matplotlib`
*   `seaborn`
*   And many more for various data processing and visualization tasks.
