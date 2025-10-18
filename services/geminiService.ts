import { GoogleGenAI, GenerateContentResponse, Type, Modality, GenerateImagesResponse } from "@google/genai";
import type { Insights, SearchFilters, GeneratedImage, SummaryLength, ResultTone, ResultFormat, PodcastDuration, PodcastScriptLine, Source, FactCheckResult, SourceType, ChatMessage } from '../types';

function getAiClient(): GoogleGenAI {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        throw new Error("الرجاء إدخال مفتاح Gemini API الخاص بك أولاً.");
    }
    return new GoogleGenAI({ apiKey });
}

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
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

const buildSearchSystemInstruction = (): string => {
    return `
**CRITICAL INSTRUCTION: You are a fact-based search engine. Your ONLY permitted task is to answer the user's query based on the provided Google Search results. Your output MUST be in Arabic.**

**NON-NEGOTIABLE CITATION RULES:**
1.  EVERY factual statement you make MUST be immediately followed by a citation number in the format \`[number]\`. Example: The sky is blue [1].
2.  A factual statement is any piece of information that is not common knowledge, such as names, dates, statistics, events, or specific claims.
3.  If a sentence contains multiple facts from different sources, cite each one. Example: The capital of Egypt is Cairo [1], and its population exceeds 9 million [2].
4.  You MUST NOT present any information that is not directly supported by a source from the grounding tool. If you cannot find a source for a piece of information, you MUST NOT include it in your response.
5.  Failure to cite a factual statement is a critical error. Before finalizing your response, you MUST perform a self-correction pass to ensure every single fact is cited.

**RESPONSE FORMAT:**
- Use Markdown for formatting.
- The final response MUST be ONLY the answer with citations. Do not add any introductory or concluding text outside of the direct answer.
`.trim();
};

const buildUserQuery = (query: string, filters: SearchFilters): string => {
    const initialInstructions = `
**استعلام المستخدم:**
"${query}"

---

**متطلبات الإجابة الإضافية (يجب الالتزام بها أيضًا):**
`;

    const constraints: string[] = [];
    const languageMap: { [key: string]: string } = { 'ar': 'العربية', 'en': 'الإنجليزية', 'fr': 'الفرنسية' };
    const summaryInstructions: { [key in SummaryLength]: string } = {
        brief: "قدم ملخصًا موجزًا.",
        normal: "قدم إجابة متوازنة.",
        detailed: "قدم إجابة مفصلة وشاملة.",
    };
    const timeConstraints: { [key: string]: string } = {
        day: "في آخر 24 ساعة",
        week: "في الأسبوع الماضي",
        month: "في الشهر الماضي",
    };
    const toneMap: { [key in ResultTone]: string } = {
        '': '', 'professional': 'احترافية ورسمية', 'casual': 'ودودة وغير رسمية', 'academic': 'أكاديمية', 'simple': 'بسيطة ومباشرة'
    };
    const formatMap: { [key in ResultFormat]: string } = {
        '': '', 'paragraphs': 'فقرات نصية', 'bullets': 'نقاط موجزة (bullet points)', 'table': 'جدول للمقارنة (إذا كان مناسبًا)'
    };
    const sourceTypeMap: { [key in SourceType]: string } = {
        'any': '',
        'news': 'المواقع الإخبارية',
        'academic': 'الأبحاث والمقالات العلمية',
        'government': 'المواقع الحكومية',
    };


    constraints.push(summaryInstructions[filters.summaryLength] || summaryInstructions.normal);
    constraints.push('**التنسيق:** قم بتنسيق الإجابة باستخدام Markdown. استخدم العناوين (مثل `## عنوان رئيسي`) والقوائم النقطية (`* نقطة`) عند الضرورة.');
    constraints.push(`**اللغة:** يجب أن تكون الإجابة النهائية باللغة "${languageMap[filters.resultLanguage] || 'العربية'}".`);
    if (filters.minSources > 0) constraints.push(`يجب أن تستند الإجابة إلى ${filters.minSources} مصادر ويب مختلفة على الأقل.`);
    if (filters.exactPhrase) constraints.push(`يجب أن تحتوي الإجابة على العبارة الدقيقة "${filters.exactPhrase}".`);
    if (filters.excludeWord) constraints.push(`تجنب ذكر أي معلومات تتعلق بـ "${filters.excludeWord}".`);
    if (filters.location) constraints.push(`ركز البحث على النتائج المتعلقة بـ "${filters.location}".`);
    if (filters.timeRange && timeConstraints[filters.timeRange]) constraints.push(`ابحث فقط عن معلومات ${timeConstraints[filters.timeRange]}.`);
    if (filters.resultTone && toneMap[filters.resultTone]) constraints.push(`يجب أن تكون نبرة الإجابة ${toneMap[filters.resultTone]}.`);
    if (filters.resultFormat && formatMap[filters.resultFormat]) constraints.push(`قم بتنسيق الإجابة النهائية على شكل ${formatMap[filters.resultFormat]}.`);
    if (filters.sourceType && sourceTypeMap[filters.sourceType]) constraints.push(`ركز البحث على ${sourceTypeMap[filters.sourceType]} فقط.`);
    if (filters.siteSearch) constraints.push(`يجب أن تكون جميع النتائج من الموقع التالي فقط: ${filters.siteSearch.trim()}.`);
    
    const finalReminder = "تذكر، القاعدة الأهم هي الاستشهاد بكل معلومة. تحقق جيدًا من إجابتك قبل إرسالها للتأكد من وجود استشهادات مثل [1] و [2] في النص.";

    const finalPrompt = initialInstructions + '\n' + constraints.map(c => `- ${c}`).join('\n') + `\n\n**${finalReminder}**`;

    return finalPrompt;
};

export async function searchWithGemini(query: string, filters: SearchFilters): Promise<AsyncGenerator<GenerateContentResponse>> {
  const ai = getAiClient();
  const systemInstruction = buildSearchSystemInstruction();
  const userQuery = buildUserQuery(query, filters);
  
  const apiCall = () => ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: userQuery,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
    },
  });

  try {
    return await withRetry(apiCall);
  } catch (error) {
    console.error("Error in searchWithGemini after retries:", error);
    if (error instanceof Error && (error.message.includes('429') || error.message.toUpperCase().includes('RESOURCE_EXHAUSTED'))) {
       throw new Error("لقد تجاوزت حد الطلبات. يرجى المحاولة مرة أخرى لاحقًا.");
    }
    throw error;
  }
}

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

export async function extractTextFromPdf(
    base64Pdf: string,
    mimeType: string
): Promise<{ pageNumber: number; content: string }[]> {
    const ai = getAiClient();
    const prompt = `
    Analyze the provided PDF document page by page.
    Extract all text content from each page.
    If a page contains images, you MUST perform OCR to extract any text within those images.
    Combine the regular text and the OCR text for each page.
    Return the result as a JSON object. You MUST NOT return any text outside of the JSON object.
    If a page has no text, return an empty string for its content.
    The response must be in Arabic.
    `;

    const filePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Pdf,
        },
    };

    const apiCall = () => ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [ { parts: [ filePart, { text: prompt } ] } ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    pages: {
                        type: Type.ARRAY,
                        description: 'An array where each object represents a page in the PDF.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                pageNumber: {
                                    type: Type.INTEGER,
                                    description: 'The page number, starting from 1.'
                                },
                                content: {
                                    type: Type.STRING,
                                    description: 'The full extracted text content of the page, including from images.'
                                }
                            },
                            required: ["pageNumber", "content"]
                        }
                    }
                },
                required: ["pages"]
            }
        },
    });

    try {
        const response = await withRetry<GenerateContentResponse>(apiCall);
        const result = JSON.parse(response.text);
        return result.pages || [];
    } catch (error) {
        console.error("Error in extractTextFromPdf:", error);
        throw error;
    }
}

export async function chatOnFileContentStream(
    fileContent: string,
    history: ChatMessage[],
    newMessage: string
): Promise<AsyncGenerator<GenerateContentResponse>> {
    const ai = getAiClient();
    const systemInstruction = `You are a helpful AI assistant that answers questions based ONLY on the provided document content.
Your responses must be in Arabic.
If the answer to a question cannot be found in the document, you must clearly state that the information is not available in the provided text.
Do not use any external knowledge or make assumptions beyond the text.

--- DOCUMENT CONTENT ---
${fileContent}
--- END DOCUMENT CONTENT ---`;

    const formattedHistory = history.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));

    const contents = [...formattedHistory, { role: 'user', parts: [{ text: newMessage }] }];

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
           throw new Error("لقد تجاوزت حد الطلبات. يرجى المحاولة مرة أخرى لاحقًا.");
        }
        throw error;
    }
}


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