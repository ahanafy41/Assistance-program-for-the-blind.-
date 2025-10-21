# Lyria RealTime for Music Generation

Lyria RealTime is a state-of-the-art, real-time, streaming music generation model. It allows for interactive creation and continuous steering of instrumental music. This model is currently **experimental**.

## How It Works

Lyria RealTime uses a persistent, bidirectional, low-latency streaming connection via **WebSockets**. This is different from a standard request/response API. You establish a connection, send prompts and configuration changes, and receive a continuous stream of audio data.

## Generating and Controlling Music

The process involves:
1.  Connecting to the Lyria model to start a session.
2.  Setting initial prompts and configuration.
3.  Starting the audio stream (`play()`).
4.  Receiving and processing audio chunks as they arrive.
5.  (Optional) Sending new prompts or configuration changes to steer the music in real-time.

### Basic Python Example

```python
import asyncio
from google import genai
from google.genai import types

client = genai.Client(http_options={'api_version': 'v1alpha'})

async def main():
    async def receive_audio(session):
        """Example background task to process incoming audio."""
        while True:
            async for message in session.receive():
                audio_data = message.server_content.audio_chunks[0].data
                # Here you would process or play the audio_data
                await asyncio.sleep(10**-12)

    async with client.aio.live.music.connect(model='models/lyria-realtime-exp') as session:
        # Set initial prompts
        await session.set_weighted_prompts(
            prompts=[types.WeightedPrompt(text='minimal techno', weight=1.0)]
        )
        # Set initial configuration
        await session.set_music_generation_config(
            config=types.LiveMusicGenerationConfig(bpm=90, temperature=1.0)
        )
        # Start streaming music
        await session.play()

if __name__ == "__main__":
    asyncio.run(main())
```

## Steering Music in Real-Time

While the stream is active, you can send new prompts or configurations to alter the generated music.

*   **Changing Prompts**: Send new `WeightedPrompt` messages to smoothly transition the music.
    ```python
    await session.set_weighted_prompts(
      prompts=[
        {"text": "Piano", "weight": 2.0},
        types.WeightedPrompt(text="Meditation", weight=0.5),
      ]
    )
    ```
*   **Updating Configuration**: You can change parameters like `bpm`, `density`, `brightness`, and `scale`. Note that for drastic changes like `bpm` or `scale`, you must call `reset_context()` for the changes to take effect.

## Prompting Guide

You can prompt Lyria with a wide variety of terms:
*   **Instruments**: `808 Hip Hop Beat`, `Accordion`, `Cello`, `Moog Oscillations`, `Sitar`, `TR-909 Drum Machine`.
*   **Music Genre**: `Afrobeat`, `Baroque`, `Bluegrass`, `Deep House`, `Dubstep`, `Lo-Fi Hip Hop`, `Psytrance`, `Synthpop`.
*   **Mood/Description**: `Ambient`, `Bright Tones`, `Crunchy Distortion`, `Dreamy`, `Funky`, `Glitchy Effects`, `Upbeat`.

## Key Technical Details

*   **Output Format**: Raw 16-bit PCM Audio
*   **Sample Rate**: 48kHz
*   **Channels**: 2 (Stereo)
*   **Model**: `models/lyria-realtime-exp` (Experimental)
