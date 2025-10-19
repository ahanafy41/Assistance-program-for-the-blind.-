import React, { useState, useCallback } from 'react';
import { SearchBar } from '../SearchBar';
import { ResultDisplay } from '../ResultDisplay';
import { SourceTicker } from '../SourceTicker';
import { InsightsPanel } from '../InsightsPanel';
import { SearchHistory } from '../SearchHistory';
import { SearchCategories } from '../SearchCategories';
import { LogoIcon } from '../icons';
import { searchWithGemini, analyzeTextWithGemini, getRelatedQuestions, generateImages, factCheckText } from '../../services/geminiService';
import type { Source, Insights, SearchFilters, GeneratedImage, FactCheckResult, SearchMode } from '../../types';
import { AdvancedFilters } from '../AdvancedFilters';
import { ImageResultDisplay } from '../ImageResultDisplay';
import { RelatedQuestions } from '../RelatedQuestions';
import { isApiKeyError } from '../../services/api/core';

interface MainSearchModeProps {
    searchMode: 'web' | 'image';
    history: string[];
    updateHistory: (query: string) => void;
    animatedPlaceholder: string;
    onApiKeyError: (message: string) => void;
}

export const MainSearchMode: React.FC<MainSearchModeProps> = ({ searchMode, history, updateHistory, animatedPlaceholder, onApiKeyError }) => {
    // Core state
    const [currentQuery, setCurrentQuery] = useState('');
    const [searchResult, setSearchResult] = useState('');
    const [sources, setSources] = useState<Source[]>([]);
    const [insights, setInsights] = useState<Insights | null>(null);
    const [factCheckData, setFactCheckData] = useState<FactCheckResult | null>(null);
    
    // Status state
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isFactChecking, setIsFactChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);
    
    // UI and Feature State
    const [isListening, setIsListening] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({
      exactPhrase: '', excludeWord: '', timeRange: '', location: '', summaryLength: 'normal',
      resultLanguage: 'ar', minSources: 0, resultTone: '', resultFormat: 'paragraphs',
      sourceType: 'any', siteSearch: ''
    });
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<string>('Kore'); // Default voice
  
    const resetState = () => {
        setError(null); setErrorDetails(null); setShowErrorDetails(false);
        setSearchResult(''); setSources([]); setInsights(null);
        setGeneratedImages([]); setRelatedQuestions([]); setFactCheckData(null);
    };
    
    const handleSearch = async (queryToSearch: string) => {
      const query = queryToSearch.trim();
      if (!query || isLoading) return;
      
      setSearchPerformed(true);
      setIsLoading(true);
      resetState();
      setCurrentQuery(query);
  
      try {
        if (searchMode === 'web') {
          await handleWebSearch(query);
        } else {
          await handleImageSearch(query);
        }
        updateHistory(query);
      } catch (err) {
          if (isApiKeyError(err)) {
              onApiKeyError('فشل التحقق من مفتاح API. قد يكون غير صالح أو منتهي الصلاحية. الرجاء إدخال مفتاح صحيح.');
          } else {
              const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
              setError(errorMessage);
              setErrorDetails(err instanceof Error ? err.stack || String(err) : String(err));
          }
          console.error(err);
      } finally {
          setIsLoading(false);
      }
    };
  
    const handleWebSearch = async (query: string) => {
      let fullText = '';
      const stream = await searchWithGemini(query, filters);
      const collectedSources = new Map<string, Source>();
  
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        fullText += chunkText;
        setSearchResult(current => current + chunkText);
  
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const newSourcesFromChunk = chunk.candidates[0].groundingMetadata.groundingChunks
                .map((c: any) => {
                    const snippet = c.retrievedContext?.text || c.snippet;
                    return { ...c.web, snippet };
                })
                .filter((s: any) => s && s.uri && s.title);
            
            let sourcesUpdated = false;
            for (const source of newSourcesFromChunk) {
                if (!collectedSources.has(source.uri)) {
                    collectedSources.set(source.uri, source);
                    sourcesUpdated = true;
                }
            }
  
            if (sourcesUpdated) {
                setSources(Array.from(collectedSources.values()));
            }
        }
      }
      if (fullText) {
        analyzeResult(fullText);
        fetchRelatedQuestions(query);
      }
    };
    
    const handleImageSearch = async (query: string) => {
        const images = await generateImages(query);
        setGeneratedImages(images);
    };
  
    const analyzeResult = useCallback(async (textToAnalyze: string) => {
      if (!textToAnalyze.trim()) return;
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeTextWithGemini(textToAnalyze);
        setInsights(analysis);
      } catch (err) {
        if (isApiKeyError(err)) {
            onApiKeyError('فشل التحقق من مفتاح API أثناء تحليل النص.');
        }
        console.error("Failed to analyze text:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }, [onApiKeyError]);
  
    const handleFactCheck = useCallback(async () => {
      if (!searchResult.trim() || isFactChecking) return;
      setIsFactChecking(true);
      setFactCheckData(null);
      try {
        const result = await factCheckText(searchResult);
        setFactCheckData(result);
      } catch (err) {
        if (isApiKeyError(err)) {
            onApiKeyError('فشل التحقق من مفتاح API أثناء تدقيق الحقائق.');
        }
        console.error("Failed to fact check text:", err);
      } finally {
        setIsFactChecking(false);
      }
    }, [searchResult, isFactChecking, onApiKeyError]);
  
    const fetchRelatedQuestions = useCallback(async (query: string) => {
        try {
            const questions = await getRelatedQuestions(query);
            setRelatedQuestions(questions);
        } catch(err) {
             if (isApiKeyError(err)) {
                onApiKeyError('فشل التحقق من مفتاح API أثناء جلب الأسئلة المشابهة.');
            }
            console.error("Failed to get related questions", err);
        }
    }, [onApiKeyError]);
  
    const handleVoiceSearch = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("متصفحك لا يدعم البحث الصوتي.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const speechResult = event.results[0][0].transcript;
            handleSearch(speechResult);
        };
        
        recognition.start();
    };

    return (
        <>
            <SearchBar 
                onSearch={handleSearch} 
                isLoading={isLoading} 
                initialPlaceholder={animatedPlaceholder} 
                onVoiceSearchClick={handleVoiceSearch}
                isListening={isListening}
                onToggleFilters={() => setShowFilters(!showFilters)}
            />

            {showFilters && <AdvancedFilters filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}
            
            {!searchPerformed && (
            <>
                <SearchCategories onCategorySelect={handleSearch} />
                <SearchHistory 
                    history={history}
                    onItemClick={handleSearch}
                    onClear={() => { 
                        // This logic needs to be handled in App.tsx
                        // for now, let's just clear visually. A prop would be better.
                        // For now, let's assume parent handles clearing state and localStorage
                    }}
                />
            </>
            )}

            {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg my-6">
                <div className="flex justify-between items-center">
                <strong>خطأ:</strong> {error}
                <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">
                    {showErrorDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </button>
                </div>
                {showErrorDetails && <pre className="mt-2 p-2 bg-slate-900 rounded text-xs overflow-auto">{errorDetails}</pre>}
            </div>
            )}
            
            {!searchPerformed && history.length === 0 && (searchMode === 'web' || searchMode === 'image') && (
                <div className="flex-grow flex flex-col items-center justify-center text-center pt-16">
                    <LogoIcon className="h-20 w-20 mb-5 text-slate-500 dark:text-slate-600"/>
                    <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">ابدأ رحلة البحث والإبداع</h2>
                    <p className="max-w-md mt-2 text-slate-500 dark:text-slate-400">
                        اطرح سؤالاً للحصول على إجابات حية، أو صف فكرة لتحويلها إلى صورة فنية مذهلة.
                    </p>
                </div>
            )}
            
            {searchPerformed && (
            <div className="mt-6 flex-grow space-y-8">
                {searchMode === 'web' ? (
                <>
                    <SourceTicker sources={sources} isLoading={isLoading} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <ResultDisplay 
                        result={searchResult} 
                        isLoading={isLoading} 
                        sources={sources}
                        onShare={()=>{}} 
                        onExportMarkdown={()=>{}} 
                        selectedVoice={selectedVoice}
                        setSelectedVoice={setSelectedVoice}
                        />
                    </div>
                    <div>
                        <InsightsPanel 
                        insights={insights} 
                        isAnalyzing={isAnalyzing} 
                        onKeywordClick={handleSearch}
                        factCheckData={factCheckData}
                        isFactChecking={isFactChecking}
                        onFactCheck={handleFactCheck}
                        isSearchComplete={!isLoading && searchPerformed && !!searchResult}
                        />
                    </div>
                    </div>
                    <RelatedQuestions questions={relatedQuestions} onQuestionClick={handleSearch} />
                </>
                ) : (
                <ImageResultDisplay images={generatedImages} isLoading={isLoading} query={currentQuery} />
                )}
            </div>
            )}
        </>
    );
};