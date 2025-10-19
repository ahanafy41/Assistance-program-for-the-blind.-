import { GoogleGenAI } from "@google/genai";

export function getAiClient(): GoogleGenAI {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        throw new Error("الرجاء إدخال مفتاح Gemini API الخاص بك أولاً.");
    }
    return new GoogleGenAI({ apiKey });
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

export async function withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
  let lastError: Error = new Error("API call failed after maximum retries.");
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.toString();
      
      if (errorMessage.includes('429') || errorMessage.toUpperCase().includes('RESOURCE_EXHAUSTED')) {
        if (i < MAX_RETRIES - 1) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, i) + Math.random() * 500;
          console.warn(`Rate limit error detected. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${i + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

/**
 * Checks if a given error is likely an API key validation error from the SDK.
 * @param error The error object to check.
 * @returns True if the error is related to an invalid API key, false otherwise.
 */
export function isApiKeyError(error: unknown): boolean {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        // Keywords from Gemini API for invalid/denied keys
        return msg.includes('api key not valid') || 
               msg.includes('api_key_invalid') ||
               msg.includes('permission_denied') || // permission denied often means bad key
               msg.includes('api key service disabled');
    }
    return false;
}
