# Imagen Models for Image Generation

Imagen is Google's high-fidelity image generation model, capable of generating realistic and high-quality images from text prompts.

## Generating Images

Here is a basic example of how to generate images using the Python SDK.

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_images(
    model='imagen-4.0-generate-001',
    prompt='Robot holding a red skateboard',
    config=types.GenerateImagesConfig(
        number_of_images=4,
    )
)

for generated_image in response.generated_images:
  # To display in a notebook or save, you would process the image data
  # For example: display(generated_image.image)
  pass
```

## Configuration Parameters

You can control the image generation process with the following parameters:

*   **`numberOfImages`**: The number of images to generate (1 to 4).
*   **`imageSize`**: The size of the generated image (e.g., 1K, 2K).
*   **`aspectRatio`**: The aspect ratio of the image ("1:1", "3:4", "4:3", "9:16", "16:9").
*   **`personGeneration`**: Control whether images of people can be generated ("dont_allow", "allow_adult", "allow_all").

## Prompt Guide Basics

A good prompt is descriptive and clear. Consider these three elements:

1.  **Subject**: The main object, person, or scene.
2.  **Context and Background**: The environment where the subject is placed.
3.  **Style**: The artistic style of the image (e.g., painting, photograph, sketch, charcoal drawing).

Iteration is key. Start with a simple idea and refine your prompt by adding more details.

### Generating Text in Images

Imagen can incorporate text into images. For best results:
*   Keep text short (under 25 characters).
*   Use a few distinct phrases.
*   Guide the placement and inspire the font style through your prompt.

## Available Imagen Models

| Model Version | Model Code                       | Key Features          |
| ------------- | -------------------------------- | --------------------- |
| **Imagen 4**  | `imagen-4.0-generate-001`        | Standard generation   |
|               | `imagen-4.0-ultra-generate-001`  | Highest quality       |
|               | `imagen-4.0-fast-generate-001`   | Optimized for speed   |
| **Imagen 3**  | `imagen-3.0-generate-002`        | Previous generation   |
