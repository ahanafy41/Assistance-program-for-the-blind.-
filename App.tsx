import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchBar } from './components/SearchBar';
import { ResultDisplay } from './components/ResultDisplay';
import { SourceTicker } from './components/SourceTicker';
import { InsightsPanel } from './components/InsightsPanel';
import { SearchHistory } from './components/SearchHistory';
import { SearchCategories } from './components/SearchCategories';
import { ThemeToggle } from './components/ThemeToggle';
import { LogoIcon, MicrophoneIcon as MicOnIcon, SparklesIcon } from './components/icons';
import { initializeAi, getAiInstance, searchWithGemini, analyzeTextWithGemini, getRelatedQuestions, generateImages, factCheckText } from './services/geminiService';
import type { Source, Insights, SearchFilters, GeneratedImage, SummaryLength, FactCheckResult } from './types';
import { AdvancedFilters } from './components/AdvancedFilters';
import { ImageResultDisplay } from './components/ImageResultDisplay';
import { RelatedQuestions } from './components/RelatedQuestions';
import { SearchModeToggle } from './components/SearchModeToggle';
import { LiveServerMessage, Modality, Blob } from '@google/genai';
import { FileReaderUI } from './components/FileReaderUI';
import { PodcastCreatorUI } from './components/PodcastCreatorUI';
import { VideoCreatorAgent } from './components/VideoCreatorAgent';

const MAX_HISTORY_LENGTH = 10;
const WELCOME_QUERIES = [
    "ما هي آخر تطورات الذكاء الاصطناعي؟",
    "ملخص لأهم الأخبار الاقتصادية في مصر هذا الأسبوع.",
    "صورة لقط يرتدي نظارة شمسية على الشاطئ",
    "أفضل الأماكن السياحية في الأقصر وأسوان.",
    "ما هي توقعات الطقس غداً في القاهرة؟"
];

// --- Audio Helper Functions from Gemini Docs ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
// --- End Audio Helper Functions ---

type TranscriptionTurn = {
    speaker: 'user' | 'model';
    text: string;
    isFinal: boolean;
};

type SearchMode = 'web' | 'image' | 'live' | 'reader' | 'podcast' | 'video-agent';

const App: React.FC = () => {
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  // Core state
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [history, setHistory] = useState<string[]>([]);
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [searchMode, setSearchMode] = useState<SearchMode>(() => (localStorage.getItem('searchMode') as SearchMode) || 'web');
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
  
  // Welcome animation
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');

  // Live Conversation State
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionTurn[]>([]);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  
  useEffect(() => {
      let queryIndex = 0, charIndex = 0;
      let timeoutId: ReturnType<typeof setTimeout>;
      const type = () => {
          const currentPhrase = WELCOME_QUERIES[queryIndex];
          if (charIndex < currentPhrase.length) {
              setAnimatedPlaceholder(currentPhrase.substring(0, charIndex + 1));
              charIndex++;
              timeoutId = setTimeout(type, 100);
          } else {
              timeoutId = setTimeout(erase, 2000);
          }
      };
      const erase = () => {
          if (charIndex > 0) {
              setAnimatedPlaceholder(WELCOME_QUERIES[queryIndex].substring(0, charIndex - 1));
              charIndex--;
              timeoutId = setTimeout(erase, 50);
          } else {
              queryIndex = (queryIndex + 1) % WELCOME_QUERIES.length;
              timeoutId = setTimeout(type, 500);
          }
      };
      type();
      return () => clearTimeout(timeoutId);
  }, []);
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800';
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('searchMode', searchMode);
    if (searchMode !== 'live' && isLiveConnected) {
        handleStopLiveSession();
    }
  }, [searchMode]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) { console.error("Failed to load history", e); }
  }, []);

  // API Key initialization effect
  useEffect(() => {
    const storedApiKey = localStorage.getItem('geminiApiKey');
    if (storedApiKey) {
      try {
        initializeAi(storedApiKey);
        setApiKey(storedApiKey);
        setIsApiReady(true);
      } catch (error) {
        console.error("Failed to initialize with stored API key:", error);
        localStorage.removeItem('geminiApiKey'); // Clear bad key
      }
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    try {
      initializeAi(key);
      localStorage.setItem('geminiApiKey', key);
      setApiKey(key);
      setIsApiReady(true);
      setError(null);
    } catch (error) {
      console.error("API Key initialization failed:", error);
      setError("فشل تهيئة مفتاح API. يرجى التحقق من المفتاح والمحاولة مرة أخرى.");
    }
  };

  const updateHistory = (newQuery: string) => {
    const updatedHistory = [newQuery, ...history.filter(h => h !== newQuery)].slice(0, MAX_HISTORY_LENGTH);
    setHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };
  
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
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
        setError(errorMessage);
        setErrorDetails(err instanceof Error ? err.stack || String(err) : String(err));
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
                  // The grounding chunk from the API may contain a snippet/quote.
                  // We extract it here to show it to the user for verification.
                  // The exact field name might be `snippet` or inside `retrievedContext`.
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
      console.error("Failed to analyze text:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleFactCheck = useCallback(async () => {
    if (!searchResult.trim() || isFactChecking) return;
    setIsFactChecking(true);
    setFactCheckData(null);
    try {
      const result = await factCheckText(searchResult);
      setFactCheckData(result);
    } catch (err) {
      console.error("Failed to fact check text:", err);
      // Optionally set an error state for fact-checking
    } finally {
      setIsFactChecking(false);
    }
  }, [searchResult, isFactChecking]);

  const fetchRelatedQuestions = useCallback(async (query: string) => {
      const questions = await getRelatedQuestions(query);
      setRelatedQuestions(questions);
  }, []);

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

  // --- Live Session handlers ---
  const handleStartLiveSession = async () => {
    setIsLiveConnecting(true);
    setTranscriptionHistory([]);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputAudioContext;
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;
      
      const source = inputAudioContext.createMediaStreamSource(stream);
      const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      sessionPromiseRef.current = getAiInstance().live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.debug('Live session opened');
            setIsLiveConnecting(false);
            setIsLiveConnected(true);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptionRef.current += text;
                setTranscriptionHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'user' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                    }
                    return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: false }];
                });
            }
            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
                setTranscriptionHistory(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'model' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                    }
                    return [...prev, { speaker: 'model', text: currentOutputTranscriptionRef.current, isFinal: false }];
                });
            }
            if (message.serverContent?.turnComplete) {
                setTranscriptionHistory(prev => prev.map(turn => ({...turn, isFinal: true})));
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio && outputAudioContext) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const audioSource = outputAudioContext.createBufferSource();
              audioSource.buffer = audioBuffer;
              audioSource.connect(outputAudioContext.destination);
              audioSource.addEventListener('ended', () => outputSourcesRef.current.delete(audioSource));
              audioSource.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              outputSourcesRef.current.add(audioSource);
            }

            if (message.serverContent?.interrupted) {
                for (const source of outputSourcesRef.current.values()) {
                    source.stop();
                    outputSourcesRef.current.delete(source);
                }
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            setError(`حدث خطأ في الاتصال المباشر: ${e.message}`);
            handleStopLiveSession();
          },
          onclose: (e: CloseEvent) => {
            console.debug('Live session closed');
            handleStopLiveSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are a friendly and helpful assistant. Keep your answers concise and conversational. Respond in Arabic.',
        },
      });

    } catch (err) {
      console.error("Failed to start live session:", err);
      setError("فشل في الوصول إلى الميكروفون. يرجى التحقق من الأذونات والمحاولة مرة أخرى.");
      setIsLiveConnecting(false);
    }
  };

  const handleStopLiveSession = useCallback(() => {
    sessionPromiseRef.current?.then(session => session.close());
    liveStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    outputSourcesRef.current.forEach(s => s.stop());

    sessionPromiseRef.current = null;
    liveStreamRef.current = null;
    scriptProcessorRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    outputSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    setIsLiveConnected(false);
    setIsLiveConnecting(false);
  }, []);

  useEffect(() => {
      return () => {
          if (isLiveConnected) {
              handleStopLiveSession();
          }
      };
  }, [isLiveConnected, handleStopLiveSession]);


  if (!isApiReady) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} error={error} />;
  }

  return (
    <>
      <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-300 non-printable">
        <main className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
          <header className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <LogoIcon className="h-10 w-10 text-cyan-400" />
              <h1 className="text-2xl sm:text-4xl font-bold text-center bg-gradient-to-r from-cyan-400 to-teal-400 text-transparent bg-clip-text">
                بحث النبض المباشر
              </h1>
            </div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </header>
          
          <SearchModeToggle mode={searchMode} setMode={setSearchMode} />

          {searchMode === 'live' ? (
            <LiveConversationUI
                isConnected={isLiveConnected}
                isConnecting={isLiveConnecting}
                transcriptionHistory={transcriptionHistory}
                onStart={handleStartLiveSession}
                onStop={handleStopLiveSession}
                error={error}
            />
          ) : searchMode === 'reader' ? (
            <FileReaderUI />
          ) : searchMode === 'podcast' ? (
            <PodcastCreatorUI />
          ) : searchMode === 'video-agent' ? (
            <VideoCreatorAgent />
          ) : (
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
                      onClear={() => { setHistory([]); localStorage.removeItem('searchHistory'); }}
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
              
              {!searchPerformed && history.length === 0 && searchMode !== 'live' && (
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
          )}

        </main>
        <footer className="text-center text-slate-500 text-sm mt-8 py-4">
            مدعوم بواسطة Gemini & Imagen API.
        </footer>
      </div>
    </>
  );
};

const LiveConversationUI: React.FC<{
    isConnected: boolean,
    isConnecting: boolean,
    transcriptionHistory: TranscriptionTurn[],
    onStart: () => void,
    onStop: () => void,
    error: string | null
}> = ({ isConnected, isConnecting, transcriptionHistory, onStart, onStop, error }) => {
    
    const transcriptionEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptionHistory]);

    const getStatus = () => {
        if (isConnecting) return { text: "جارٍ الاتصال...", color: "text-yellow-400" };
        if (isConnected) return { text: "متصل. ابدأ الحديث...", color: "text-green-400" };
        if (error) return { text: "انقطع الاتصال", color: "text-red-400" };
        return { text: "اضغط لبدء المحادثة المباشرة", color: "text-slate-400" };
    }

    const status = getStatus();

    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">محادثة مباشرة</h2>
            </div>

            <div className={`text-center mb-4 text-sm ${status.color}`}>{status.text}</div>
            
            {error && <div className="text-center mb-4 text-sm text-red-400 bg-red-900/50 p-2 rounded">{error}</div>}

            <div className="flex-grow overflow-y-auto mb-4 p-2 space-y-4 bg-slate-900/50 rounded-lg">
                {transcriptionHistory.map((turn, index) => (
                    <div key={index} className={`flex items-end gap-2 ${turn.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl ${turn.speaker === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{turn.text}{!turn.isFinal && <span className="inline-block w-2 h-4 bg-current animate-pulse ms-1" />}</p>
                        </div>
                    </div>
                ))}
                 <div ref={transcriptionEndRef} />
            </div>
            
            <div className="flex justify-center items-center">
                <button
                    onClick={isConnected || isConnecting ? onStop : onStart}
                    disabled={isConnecting}
                    className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-800
                        ${isConnecting ? 'bg-yellow-500 cursor-wait' : ''}
                        ${isConnected ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}
                        ${!isConnected && !isConnecting ? 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-500' : ''}
                    `}
                    aria-label={isConnected ? 'إيقاف المحادثة' : 'بدء المحادثة'}
                >
                    <MicOnIcon className="h-9 w-9 text-white" />
                    {isConnected && <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping"></div>}
                </button>
            </div>
        </div>
    );
};

const ApiKeyInput: React.FC<{ onSubmit: (key: string) => void; error: string | null }> = ({ onSubmit, error }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSubmit(key.trim());
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4 bg-slate-900 text-slate-200">
      <div className="w-full max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-xl shadow-lg p-8 text-center">
        <LogoIcon className="h-16 w-16 mx-auto mb-6 text-cyan-400" />
        <h1 className="text-3xl font-bold mb-2">مرحبًا بك في بحث النبض</h1>
        <p className="text-slate-400 mb-6">
          لاستخدام التطبيق، يرجى إدخال مفتاح Google AI API الخاص بك. سيتم حفظه محليًا في متصفحك.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="أدخل مفتاح API هنا"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            حفظ و متابعة
          </button>
        </form>
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg">
            <strong>خطأ:</strong> {error}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-6">
          يمكنك الحصول على مفتاح API من Google AI Studio.
        </p>
      </div>
    </div>
  );
};


export default App;