# Veo Models for Video Generation

Veo 3.1 is Google's state-of-the-art model for generating high-fidelity, 8-second 720p or 1080p videos with natively generated audio.

## Generating Videos (Text-to-Video)

Video generation is an asynchronous operation. You start a job, poll for its completion, and then download the result.

Here is a basic Python example:

```python
import time
from google import genai

client = genai.Client()

prompt = """A close up of two people staring at a cryptic drawing on a wall, torchlight flickering.
A man murmurs, 'This must be it. That's the secret code.'"""

# Start the generation job
operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt=prompt,
)

# Poll the operation status until the video is ready.
print("Waiting for video generation...")
while not operation.done:
    time.sleep(10)
    operation = client.operations.get(operation)

# Download the generated video.
generated_video = operation.response.generated_videos[0]
generated_video.video.save("generated_video.mp4")
print("Generated video saved to generated_video.mp4")
```

## Key Features of Veo 3.1

*   **Image-to-Video**: Provide an initial image to animate.
*   **Video Extension**: Extend previously Veo-generated videos by 7 seconds.
*   **Frame-specific Generation**: Generate a video by providing the first and last frames.
*   **Reference Images**: Use up to three images to guide the appearance of a subject (person, product, etc.) in the video.

## API Parameters

*   **`prompt`**: The text description for the video, which can include audio cues and dialogue.
*   **`negativePrompt`**: Describe what *not* to include in the video.
*   **`image` / `lastFrame`**: Used for image-to-video and interpolation.
*   **`aspectRatio`**: "16:9" or "9:16".
*   **`resolution`**: "720p" or "1080p".
*   **`durationSeconds`**: "4", "6", or "8".

## Prompting Guide

A good prompt includes:
1.  **Subject**: The main focus of the video.
2.  **Action**: What the subject is doing.
3.  **Style**: The creative direction (e.g., sci-fi, cartoon, film noir).
4.  **Camera & Composition**: (Optional) Camera movement and framing (e.g., aerial view, close-up).
5.  **Ambiance**: (Optional) Lighting and color tones (e.g., warm tones, night).
6.  **Audio Cues**: Describe dialogue in quotes, sound effects (SFX), and ambient noise.

## Available Veo Models

| Model Version         | Model Code                       | Key Features                             |
| --------------------- | -------------------------------- | ---------------------------------------- |
| **Veo 3.1 Preview**   | `veo-3.1-generate-preview`       | State-of-the-art, includes all new features. |
| **Veo 3.1 Fast Preview**| `veo-3.1-fast-generate-preview`  | Optimized for speed.                     |
| **Veo 3**             | `veo-3.0-generate-001`           | Stable version with native audio.        |
| **Veo 2**             | `veo-2.0-generate-001`           | Previous generation, silent videos only. |
