import { GenerateContentResponse, Modality, Type } from "@google/genai";
import type { PodcastDuration, PodcastScriptLine, ResultTone } from '../../types';
import { getAiClient, withRetry } from './core';
import { createWavBlob, decode } from '../../utils/audio';

export async function generateSpeech(text: string, voice: string): Promise<string> {
  const ai = getAiClient();
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say with a clear and professional tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        console.error("No audio data in TTS response:", response);
        throw new Error("فشل في توليد الصوت. لم يتم استلام بيانات صوتية.");
    }
    return base64Audio;
  };
  
  try {
    return await withRetry(apiCall);
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}

const getWordCountForDuration = (duration: PodcastDuration): number => {
    const wordsPerMinute = 150;
    const durationMap: Record<PodcastDuration, number> = { // minutes
        'short': 1,
        'medium': 3,
        'long': 5,
        'very-long': 10,
        'epic': 15,
    };
    return durationMap[duration] * wordsPerMinute;
}

export async function generatePodcastScript(
    topicText: string,
    duration: PodcastDuration,
    tone: ResultTone,
    dialect: string
): Promise<PodcastScriptLine[]> {
    const ai = getAiClient();
    const wordCount = getWordCountForDuration(duration);
    const toneDescription = tone === 'casual' ? 'friendly and conversational' :
                            tone === 'professional' ? 'formal and informative' :
                            tone === 'academic' ? 'detailed and academic' :
                            'simple and clear';

    const prompt = `
    You are a podcast scriptwriter. Write a conversational podcast script between two hosts, Joe (male) and Jane (female), discussing the following topic.
    The script should be approximately ${wordCount} words long.
    The tone of the conversation should be ${toneDescription}.
    The dialect should be ${dialect} Arabic.
    The conversation must be balanced between the two speakers.
    Start the conversation with a short introduction from Joe.
    End the conversation with a short outro from Jane.

    Topic:
    ---
    ${topicText}
    ---

    Respond ONLY with a JSON object.
    `;

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    script: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                speaker: { type: Type.STRING, description: '"Joe" or "Jane"' },
                                line: { type: Type.STRING, description: "The line of dialogue." }
                            },
                            required: ["speaker", "line"]
                        }
                    }
                },
                required: ["script"]
            }
        }
    });

    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        const result = JSON.parse(response.text);
        return result.script;
    } catch (error) {
        console.error("Error in generatePodcastScript:", error);
        throw error;
    }
}

export async function generateMultiSpeakerSpeech(script: PodcastScriptLine[], maleVoice: string, femaleVoice: string): Promise<string> {
  const ai = getAiClient();
  if (script.length === 0) {
    throw new Error("Cannot generate podcast from an empty script.");
  }

  // Construct the prompt from the script
  const prompt = `TTS the following conversation between Joe and Jane:\n` +
    script.map(line => `${line.speaker}: ${line.line}`).join('\n');

  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Joe', // The male speaker
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: maleVoice }
                }
              },
              {
                speaker: 'Jane', // The female speaker
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: femaleVoice }
                }
              }
            ]
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      console.error("No audio data in multi-speaker TTS response:", response);
      throw new Error("فشل في توليد صوت البودكاست. لم يتم استلام بيانات صوتية.");
    }
    return base64Audio;
  };

  try {
    return await withRetry(apiCall);
  } catch (error) {
    console.error("Error in generateMultiSpeakerSpeech after retries:", error);
    if (error instanceof Error && (error.message.includes('429') || error.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
       throw new Error("لقد تجاوزت حد الطلبات. يرجى المحاولة مرة أخرى لاحقًا.");
    }
    throw error;
  }
}

export async function transcribeAudio(
    audioBase64: string,
    audioMimeType: string,
): Promise<string> {
    const ai = getAiClient();
    const prompt = "Transcribe the following audio file accurately. Provide only the transcribed text. The language in the audio is Arabic.";

    const audioPart = {
        inlineData: {
            mimeType: audioMimeType,
            data: audioBase64,
        },
    };

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ parts: [audioPart, { text: prompt }] }],
    });

    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        return response.text;
    } catch (error) {
        console.error("Error in transcribeAudio:", error);
        throw new Error("فشل في نسخ الملف الصوتي.");
    }
}

export async function generateAudioFileFromText(text: string, voice: string): Promise<string> {
    const base64Audio = await generateSpeech(text, voice);
    const pcmData = decode(base64Audio);
    const wavBlob = createWavBlob(pcmData, 24000, 1);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(wavBlob);
    });
}