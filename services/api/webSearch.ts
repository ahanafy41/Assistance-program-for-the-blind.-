import { GenerateContentResponse, Type } from "@google/genai";
import type { SearchFilters, SummaryLength, ResultTone, ResultFormat, SourceType } from '../../types';
import { getAiClient, withRetry } from './core';

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

/**
 * Performs a web search and returns the complete aggregated text result.
 * Useful for agentic workflows that need the full context before proceeding.
 * @param query The search query.
 * @returns The full text result from the search.
 */
export async function performWebSearch(query: string): Promise<string> {
    // Use default filters for a general search
    const defaultFilters: SearchFilters = {
        exactPhrase: '', excludeWord: '', timeRange: '', location: '',
        summaryLength: 'detailed', resultLanguage: 'ar', minSources: 0,
        resultTone: '', resultFormat: 'paragraphs', sourceType: 'any', siteSearch: ''
    };

    try {
        const stream = await searchWithGemini(query, defaultFilters);
        let fullText = '';
        for await (const chunk of stream) {
            fullText += chunk.text;
        }
        return fullText.trim();
    } catch (error) {
        console.error("Error in performWebSearch:", error);
        throw error; // Re-throw to be handled by the agent
    }
}
