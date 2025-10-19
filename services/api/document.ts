import { GenerateContentResponse, Type } from "@google/genai";
import type { ChatMessage } from '../../types';
import { getAiClient, withRetry } from './core';
import mammoth from 'mammoth';

// Helper function to convert data URL to ArrayBuffer
async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch data URL');
    }
    return await response.arrayBuffer();
}

export async function extractWordContent(docxDataUrl: string): Promise<string> {
    try {
        const arrayBuffer = await dataUrlToArrayBuffer(docxDataUrl);
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value || "No text could be extracted from the document.";
    } catch (error) {
        console.error("Error extracting Word content:", error);
        throw new Error("Failed to read content from the Word document.");
    }
}


/**
 * Gets the total number of pages in a PDF file.
 * @param pdfBase64 The base64 encoded string of the PDF file.
 * @param mimeType The MIME type of the file.
 * @returns A promise that resolves to the number of pages.
 */
export async function getPdfPageCount(pdfBase64: string, mimeType: string): Promise<number> {
    const ai = getAiClient();
    const prompt = "Analyze this document and return only a JSON object with the total number of pages. Example: {\"pageCount\": 15}";
    
    const filePart = {
        inlineData: { mimeType, data: pdfBase64 },
    };

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ parts: [filePart, { text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    pageCount: { type: Type.NUMBER }
                },
                required: ["pageCount"]
            }
        }
    });
    
    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        const result = JSON.parse(response.text);
        if (typeof result.pageCount === 'number' && result.pageCount > 0) {
            return result.pageCount;
        }
        throw new Error("Could not determine page count from model response.");
    } catch (error) {
        console.error("Error in getPdfPageCount:", error);
        throw new Error("فشل في تحديد عدد صفحات ملف PDF.");
    }
}

/**
 * Extracts the text content from a specified range of pages of a PDF in a single API call.
 * It uses OCR capabilities for scanned pages.
 * @param pdfBase64 The base64 encoded string of the PDF file.
 * @param mimeType The MIME type of the file.
 * @param startPage The starting page number (1-indexed).
 * @param endPage The ending page number.
 * @returns A promise that resolves to an array of strings, where each string is the content of a page.
 */
export async function extractPdfPagesContentInRange(
    pdfBase64: string,
    mimeType: string,
    startPage: number,
    endPage: number
): Promise<string[]> {
    const ai = getAiClient();
    const prompt = `From the document provided, extract all text content from page ${startPage} to page ${endPage} inclusive. If a page contains an image of text, perform OCR to extract the text.
Return the result as a single JSON object with one key: "pages". The value of "pages" should be an array of strings, where each string is the full text content of one page, in order from page ${startPage} to ${endPage}.
Example for pages 2 to 3: {"pages": ["Content of page 2...", "Content of page 3..."]}`;

    const filePart = {
        inlineData: { mimeType, data: pdfBase64 },
    };

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [{ parts: [filePart, { text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    pages: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["pages"]
            }
        }
    });
    
    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        const result = JSON.parse(response.text);
        if (result.pages && Array.isArray(result.pages)) {
            if (result.pages.length !== (endPage - startPage + 1)) {
                 console.warn(`Model returned ${result.pages.length} pages, but expected ${endPage - startPage + 1}. The content might be incomplete or the model miscounted.`);
            }
            return result.pages;
        }
        throw new Error("Invalid response format from model.");
    } catch (error) {
        console.error(`Error in extractPdfPagesContentInRange:`, error);
        throw new Error(`فشل في استخراج محتوى الصفحات المحددة.`);
    }
}


/**
 * Streams responses for a chat conversation based on a page range within a PDF file.
 * This function handles both text-based and image-based (scanned) PDFs.
 * @param pdfBase64 The base64 encoded string of the PDF file.
 * @param mimeType The MIME type of the file.
 * @param history The previous chat messages.
 * @param newMessage The new message from the user.
 * @param startPage The starting page number (1-indexed).
 * @param endPage The ending page number.
 * @returns An async generator that yields chat response chunks.
 */
export async function chatOnPdfContentStream(
    pdfBase64: string,
    mimeType: string,
    history: ChatMessage[],
    newMessage: string,
    startPage: number,
    endPage: number
): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAiClient();
    const systemInstruction = `You are a helpful AI assistant that answers questions based ONLY on the provided PDF document.
CRITICAL: You must focus your analysis exclusively on the content from page ${startPage} to page ${endPage}.
The document may contain scanned pages with images of text; you must perform OCR to read them.
Your answers must be in Arabic.
If the answer to a question is not found within the specified page range, you must clearly state that the information is not available in those pages.
Do not use any external knowledge.

The PDF file is provided with the user's message.
`;

    const formattedHistory = history.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));

    const filePart = {
        inlineData: { mimeType, data: pdfBase64 },
    };
    
    const contents = [...formattedHistory, { role: 'user' as const, parts: [{ text: newMessage }, filePart] }];

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
        console.error("Error in chatOnPdfContentStream:", error);
        throw error;
    }
}


/**
 * Streams responses for a chat conversation based on the content of a text-based file.
 * @param fileContent The text content of the file to be used as context.
 * @param history The previous chat messages.
 * @param newMessage The new message from the user.
 * @returns An async generator that yields chat response chunks.
 */
export async function chatOnFileContentStream(
    fileContent: string,
    history: ChatMessage[],
    newMessage: string
): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAiClient();
    const systemInstruction = `You are a helpful AI assistant that answers questions based ONLY on the provided document content.
Your answers must be in Arabic.
If the answer to a question is not found within the document, you must clearly state that the information is not available in the provided document.
Do not use any external knowledge or make assumptions beyond the document's content.

Here is the document content:
---
${fileContent}
---
`;

    const formattedHistory = history.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));

    const contents = [...formattedHistory, { role: 'user' as const, parts: [{ text: newMessage }] }];

    const apiCall = () => ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
        config: {
            systemInstruction,
        },
    });

    try {
        return await withRetry(apiCall);
    } catch (error) {
        console.error("Error in chatOnFileContentStream after retries:", error);
        if (error instanceof Error && (error.message.includes('429') || error.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
           throw new Error("لقد تجاوزت حد الطلبات. يجرى المحاولة مرة أخرى لاحقًا.");
        }
        throw error;
    }
}