import { GenerateContentResponse } from "@google/genai";
import type { ChatMessage } from '../../types';
import { getAiClient, withRetry } from './core';
import { decode, decodeAudioData } from '../../utils/audio';
import { searchWithGemini } from './webSearch';
import { generateImages, describeImage } from './image';
import { generateSpeech } from './audio';

export async function generateVideoDescription(
    videoBase64: string,
    videoMimeType: string,
): Promise<string> {
    const ai = getAiClient();
    const prompt = "صف هذا الفيديو بالتفصيل باللغة العربية. ماذا يحدث ومن هم الأشخاص وما هي البيئة المحيطة؟ قدم وصفًا شاملاً كنقطة انطلاق للمحادثة.";

    const videoPart = {
        inlineData: {
            mimeType: videoMimeType,
            data: videoBase64,
        },
    };

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ parts: [videoPart, { text: prompt }] }],
    });

    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        return response.text;
    } catch (error) {
        console.error("Error in generateVideoDescription:", error);
        throw error;
    }
}


export async function chatOnVideoContentStream(
    videoBase64: string,
    videoMimeType: string,
    history: ChatMessage[],
    newMessage: string
): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAiClient();
    const systemInstruction = `أنت مساعد ذكاء اصطناعي مفيد يجيب على الأسئلة بناءً على محتوى الفيديو المقدم فقط.
يجب أن تكون إجاباتك باللغة العربية.
إذا لم يتم العثور على إجابة السؤال في الفيديو، يجب أن تذكر بوضوح أن المعلومات غير متوفرة في الفيديو المقدم.
لا تستخدم أي معرفة خارجية أو تضع افتراضات تتجاوز محتوى الفيديو.`;

    const formattedHistory = history.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));

    const videoPart = {
        inlineData: {
            mimeType: videoMimeType,
            data: videoBase64,
        },
    };
    
    // Attach the video to the latest user message for context
    const newUserMessage = { 
        role: 'user' as const, 
        parts: [{ text: newMessage }, videoPart] 
    };

    const contents = [...formattedHistory, newUserMessage];

    const apiCall = () => ai.models.generateContentStream({
        model: "gemini-2.5-pro",
        contents,
        config: {
            systemInstruction,
        },
    });

    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error("Error in chatOnVideoContentStream after retries:", error);
        if (error instanceof Error && (error.message.includes('429') || error.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
           throw new Error("لقد تجاوزت حد الطلبات. يرجى المحاولة مرة أخرى لاحقًا.");
        }
        throw error;
    }
}

export async function summarizeTextForNewsScript(text: string, durationInSeconds: number): Promise<string> {
    const ai = getAiClient();
    const estimatedWords = durationInSeconds * 2.5; // ~150 words per minute
    const prompt = `You are a news script writer for a short video report.
    Summarize the following text into a concise and engaging news script.
    The script should be approximately ${estimatedWords} words long.
    The language must be Arabic.
    The output must be only the script text, without any titles or introductions.

    Text to summarize:
    ---
    ${text}
    ---
    `;
    const apiCall = async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    };
    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error("Error in summarizeTextForNewsScript:", error);
        throw error;
    }
}


// --- Agent Video Generation Tool ---

interface Scene {
    sentence: string;
    description: string;
    base64Image: string;
    duration: number;
}

async function assembleVideoWithBrowserAPI(scenes: Scene[], audioData: Uint8Array): Promise<string> {
    const WIDTH = 1280;
    const HEIGHT = 720;

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const audioCtx = new AudioContext({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(audioData, audioCtx, 24000, 1);
    const audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    const audioDestination = audioCtx.createMediaStreamDestination();
    audioSource.connect(audioDestination);
    const audioStream = audioDestination.stream;
    const totalAudioDuration = audioBuffer.duration;

    const videoStream = canvas.captureStream(30);

    const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
    ]);

    const mimeType = 'video/webm; codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
         throw new Error("متصفحك لا يدعم ترميز الفيديو المطلوب (WebM with VP9/Opus).");
    }
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const recordedChunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    const recordingPromise = new Promise<string>((resolve, reject) => {
        recorder.onstop = () => {
            try {
                const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoBlob);
            } catch (err) {
                reject(err);
            } finally {
                audioCtx.close();
            }
        };
        recorder.onerror = (event) => {
            reject((event as any).error || new Error('MediaRecorder error'));
        };
    });

    audioSource.start(0);
    recorder.start();

    let elapsedTime = 0;
    for (const scene of scenes) {
        setTimeout(() => {
            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                const scale = Math.min(WIDTH / img.width, HEIGHT / img.height);
                const x = (WIDTH - img.width * scale) / 2;
                const y = (HEIGHT - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            };
            img.src = `data:image/jpeg;base64,${scene.base64Image}`;
        }, elapsedTime * 1000);
        elapsedTime += scene.duration;
    }

    setTimeout(() => {
        if (recorder.state === 'recording') {
            recorder.stop();
        }
    }, totalAudioDuration * 1000 + 500);

    return recordingPromise;
};

export async function generateVideoFileFromTopic(topic: string, durationInSeconds: number = 30): Promise<string> {
    // 1. Search for news
    const searchStream = await searchWithGemini(topic, { summaryLength: 'detailed' } as any);
    let newsText = '';
    for await (const chunk of searchStream) { newsText += chunk.text; }
    if (!newsText.trim()) throw new Error("لم يتم العثور على معلومات كافية حول هذا الموضوع.");

    // 2. Create script
    const script = await summarizeTextForNewsScript(newsText, durationInSeconds);
    const sentences = script.split(/(?<=[.?!؟])\s+/).filter(s => s.trim());
    if (sentences.length === 0) throw new Error("فشل في إنشاء سيناريو من المعلومات.");

    // 3. Generate audio & get its duration
    const base64Audio = await generateSpeech(script, 'Zephyr');
    const audioData = decode(base64Audio);

    const tempAudioCtx = new AudioContext({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(audioData, tempAudioCtx, 24000, 1);
    const totalAudioDuration = audioBuffer.duration;
    await tempAudioCtx.close();
    
    // 4. Generate images for each sentence
    const scenes: Scene[] = [];
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const imageResult = await generateImages(`Dramatic, cinematic news report style image for: ${sentence}`, 1);
        if (!imageResult || imageResult.length === 0) throw new Error(`فشل في توليد صورة للمشهد ${i+1}.`);
        const base64Image = imageResult[0].imageBytes;
        const description = await describeImage(base64Image); // For accessibility, though not used in video
        const sentenceDuration = (sentence.length / script.length) * totalAudioDuration;
        scenes.push({ sentence, description, base64Image, duration: sentenceDuration });
    }
    
    // 5. Assemble video using browser APIs
    return await assembleVideoWithBrowserAPI(scenes, audioData);
}