import { GenerateImagesResponse, Modality } from "@google/genai";
import type { GeneratedImage } from '../../types';
import { getAiClient, withRetry } from './core';

export async function generateImages(query: string, numberOfImages: number = 4): Promise<GeneratedImage[]> {
  const ai = getAiClient();
  const apiCall = () => ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `Photorealistic image of: ${query}. Focus on high detail and cinematic lighting.`,
    config: {
      numberOfImages: numberOfImages,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    },
  });

  try {
    const response = await withRetry<GenerateImagesResponse>(apiCall);
    return response.generatedImages.map(img => ({
      imageBytes: img.image.imageBytes,
      altText: img.altText || query, // Use alt text from API or fallback to query
    }));
  } catch (error) {
    console.error("Error generating images:", error);
    if (error instanceof Error && (error.message.includes('429') || error.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
       throw new Error("لقد تجاوزت حد الطلبات. يرجى المحاولة مرة أخرى لاحقًا.");
    }
    throw error;
  }
}

export async function describeImage(base64Image: string): Promise<string> {
    const ai = getAiClient();
    const prompt = "أنت خبير في وصف الصور للمكفوفين. صف الصورة التالية باللغة العربية وصفاً تفصيلياً ودقيقاً ومختصراً في جملة واحدة. اذكر العناصر الرئيسية، الألوان، والأجواء العامة التي تساعد على تخيل المشهد بوضوح.";
    
    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };
    const textPart = {
        text: prompt
    };

    const apiCall = async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    };
    
    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error("Error describing image:", error);
        throw error;
    }
}

export async function editImage(base64ImageData: string, mimeType: string, prompt: string): Promise<string> {
    const ai = getAiClient();

    const imagePart = {
        inlineData: {
            mimeType,
            data: base64ImageData,
        },
    };
    const textPart = {
        text: prompt,
    };

    const apiCall = async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data found in the response from the edit image API.");
    };

    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
}
