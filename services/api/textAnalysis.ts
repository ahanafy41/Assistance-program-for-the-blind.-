import { GenerateContentResponse, Type } from "@google/genai";
import type { Insights, FactCheckResult } from '../../types';
import { getAiClient, withRetry } from './core';

export async function analyzeTextWithGemini(text: string): Promise<Insights> {
  const ai = getAiClient();
  const prompt = `Analyze the following Arabic text to extract comprehensive insights. Text to analyze: --- ${text} --- Provide the analysis in a structured JSON format.`;

  const apiCall = () => ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, description: 'Overall sentiment: "Positive", "Neutral", "Negative", or "Mixed".' },
          keywords: { type: Type.ARRAY, description: 'Top 5 relevant Arabic keywords.', items: { type: Type.STRING } },
          entities: {
            type: Type.ARRAY,
            description: 'List of named entities.',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, description: '"Person", "Organization", "Location", or "Other".' }
              },
              required: ["name", "type"]
            }
          },
          summaryPoints: { type: Type.ARRAY, description: '3-4 key summary bullet points in Arabic.', items: { type: Type.STRING } },
          trendiness: { type: Type.STRING, description: 'Trendiness of the topic: "Trending", "Stable", "Niche", "Unspecified".' }
        },
        required: ["sentiment", "keywords", "entities", "summaryPoints", "trendiness"]
      }
    },
  });

   try {
    const response = await withRetry<GenerateContentResponse>(apiCall);
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing text:", error);
    throw error;
  }
}

export async function getRelatedQuestions(query: string): Promise<string[]> {
  const ai = getAiClient();
  const prompt = `Based on the search query "${query}", generate 3 related questions in Arabic that a user might ask next. Provide only the questions in a JSON array of strings.`;
  const apiCall = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      },
    });
    try {
        const json = JSON.parse(response.text);
        return json.questions || [];
    } catch {
        return [];
    }
  };
  try {
    return await withRetry(apiCall);
  } catch (error) {
    console.error("Error fetching related questions:", error);
    return []; // Return empty array on failure
  }
}

export async function factCheckText(text: string): Promise<FactCheckResult> {
    const ai = getAiClient();
    const prompt = `
    You are a fact-checking expert. Analyze the following Arabic text and identify the main factual claims.
    For each claim, determine if it is well-supported, only supported by a single source (making it less reliable), or if there are conflicting reports.
    Provide a brief explanation for your reasoning if a claim is not well-supported.
    Finally, give an overall confidence score for the entire text.

    Text to analyze:
    ---
    ${text}
    ---

    Respond ONLY with a JSON object in the specified format.
    `;

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro", // Use a more powerful model for reasoning
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    overallConfidence: { type: Type.STRING, description: '"High", "Medium", or "Conflicting"' },
                    claims: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                claim: { type: Type.STRING, description: "The factual claim being checked." },
                                status: { type: Type.STRING, description: '"Well-supported", "Single source", or "Conflicting".' },
                                explanation: { type: Type.STRING, description: "Brief explanation for status, especially if not well-supported." }
                            },
                            required: ["claim", "status"]
                        }
                    }
                },
                required: ["overallConfidence", "claims"]
            }
        },
        tools: [{ googleSearch: {} }] // Ground the fact-checking in search
    });

    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error in factCheckText:", error);
        throw error;
    }
}

export async function summarizeText(text: string, detailLevel: 'brief' | 'detailed'): Promise<string> {
    const ai = getAiClient();
    const prompt = `Please summarize the following text. The summary should be ${detailLevel}.
The response must be in Arabic.

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
        console.error("Error in summarizeText:", error);
        throw error;
    }
}
