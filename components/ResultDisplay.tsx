import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, ClipboardIcon, ShareIcon, PrinterIcon, MarkdownIcon, SpeakerWaveIcon, SpeakerXMarkIcon, PodcastIcon, LinkIcon, XCircleIcon } from './icons';
import { generateSpeech, generatePodcastScript, generateMultiSpeakerSpeech } from '../services/geminiService';
import type { PodcastDuration, ResultTone, Source } from '../types';
import { decode, decodeAudioData, createWavBlob } from '../utils/audio';

const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'صوت 1 (أنثوي)' },
  { id: 'Puck', name: 'صوت 2 (ذكوري)' },
  { id: 'Zephyr', name: 'صوت 3 (أنثوي)' },
  { id: 'Charon', name: 'صوت 4 (ذكوري)' },
  { id: 'Fenrir', name: 'صوت 5 (ذكوري)' },
];

const MALE_PODCAST_VOICES = [
    { id: 'Puck', name: 'صوت ذكوري 1' },
    { id: 'Charon', name: 'صوت ذكوري 2' },
    { id: 'Fenrir', name: 'صوت ذكوري 3' },
];

const FEMALE_PODCAST_VOICES = [
    { id: 'Kore', name: 'صوت أنثوي 1' },
    { id: 'Zephyr', name: 'صوت أنثوي 2' },
];

const PODCAST_TONES: {id: ResultTone, name: string}[] = [
    { id: 'casual', name: 'ودي وغير رسمي' },
    { id: 'professional', name: 'احتrafi ورسمي' },
    { id: 'academic', name: 'أكاديمي' },
    { id: 'simple', name: 'بسيط ومباشر' },
];

const PODCAST_DIALECTS = [
    { id: 'Egyptian', name: 'اللهجة المصرية' },
    { id: 'Saudi', name: 'اللهجة السعودية' },
    { id: 'Standard Arabic', name: 'العربية الفصحى' },
];

const PODCAST_DURATIONS: { id: PodcastDuration; label: string }[] = [
    { id: 'short', label: 'قصير (~1 دق)' },
    { id: 'medium', label: 'متوسط (~3 دق)' },
    { id: 'long', label: 'طويل (~5 دق)' },
    { id: 'very-long', label: 'طويل جداً (~10 دق)' },
    { id: 'epic', label: 'ملحمي (~15 دق)' },
];

interface ResultDisplayProps {
  result: string;
  sources: Source[];
  isLoading: boolean;
  onShare: () => void;
  onExportMarkdown: () => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
    <div className="h-4 bg-slate-700 rounded w-full"></div>
    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
    <div className="h-4 bg-slate-700 rounded w-1/2"></div>
  </div>
);

const ActionButtons: React.FC<{ 
    onCopy: () => void; 
    onShare: () => void; 
    onPrint: () => void; 
    onExportMarkdown: () => void;
    onToggleSpeech: () => void;
    isSpeaking: boolean;
    isGeneratingSpeech: boolean;
    onTogglePodcast: () => void;
    isPodcastVisible: boolean;
    disabled: boolean 
}> = ({ onCopy, onShare, onPrint, onExportMarkdown, onToggleSpeech, isSpeaking, isGeneratingSpeech, onTogglePodcast, isPodcastVisible, disabled }) => {
    const isBusySpeaking = isSpeaking || isGeneratingSpeech;
    
    return (
        <div className="absolute top-4 left-4 flex gap-2">
            <button 
                onClick={onToggleSpeech} 
                disabled={disabled && !isBusySpeaking} 
                title={isBusySpeaking ? "إيقاف القراءة" : "قراءة النتيجة بصوت عالٍ"} 
                className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-9 h-9"
            >
                {isGeneratingSpeech ? (
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : isSpeaking ? (
                    <SpeakerXMarkIcon className="h-5 w-5 text-slate-400" />
                ) : (
                    <SpeakerWaveIcon className="h-5 w-5 text-slate-400" />
                )}
            </button>
            <button onClick={onCopy} disabled={disabled} title="نسخ النتيجة" className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ClipboardIcon className="h-5 w-5 text-slate-400" />
            </button>
            <button onClick={onShare} disabled={disabled} title="مشاركة ملخص البحث" className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ShareIcon className="h-5 w-5 text-slate-400" />
            </button>
            <button onClick={onPrint} disabled={disabled} title="طباعة/تصدير PDF" className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <PrinterIcon className="h-5 w-5 text-slate-400" />
            </button>
            <button onClick={onExportMarkdown} disabled={disabled} title="تصدير إلى Markdown" className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <MarkdownIcon className="h-5 w-5 text-slate-400" />
            </button>
            <button onClick={onTogglePodcast} disabled={disabled} title="إنشاء بودكاست" className={`p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isPodcastVisible ? 'bg-cyan-500 text-white' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-400'}`}>
                <PodcastIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

const CitationBlock: React.FC<{ number: number; source: Source }> = ({ number, source }) => {
    const sourceId = `source-title-${number}`;
    return (
        <div 
            className="my-4 mx-0 p-3 border-r-4 border-cyan-500 bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-sm"
            role="region"
            aria-labelledby={sourceId}
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 text-sm font-bold text-white bg-cyan-600 rounded-full">
                    {number}
                </div>
                <a 
                    id={sourceId}
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                    {source.title}
                </a>
            </div>
            {source.snippet && (
                <blockquote className="text-sm text-slate-600 dark:text-slate-400 italic pr-4 border-r-2 border-slate-300 dark:border-slate-500 mr-2">
                   {source.snippet}
                </blockquote>
            )}
        </div>
    );
};

const MarkdownRenderer: React.FC<{
    text: string;
    sources: Source[];
    highlightTerm: string;
}> = ({ text, sources, highlightTerm }) => {
    
    const renderHighlightedText = (text: string) => {
        if (!highlightTerm.trim()) return text;
        const highlightRegex = new RegExp(`(${highlightTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.split(highlightRegex).map((subPart, subIndex) =>
            highlightRegex.test(subPart) ? 
            <mark key={subIndex} className="bg-yellow-400/70 text-black px-1 rounded">{subPart}</mark> : 
            subPart
        );
    };

    const citationSplitRegex = /(\[\s*\d+\s*\])/g;
    const citationTestRegex = /^\[\s*\d+\s*\]$/;

    const processChunk = (chunkText: string): (React.ReactNode | string)[] => {
        return chunkText.split(citationSplitRegex).map((part, index) => {
            if (citationTestRegex.test(part)) {
                const citationNumber = parseInt(part.replace(/[\[\]\s]/g, ''), 10);
                const source = sources[citationNumber - 1];
                if (source) {
                    return <CitationBlock key={index} number={citationNumber} source={source} />;
                } else {
                    // Render a disabled/unlinked citation if the source is missing.
                    // This makes it clear that the model provided a number, but the source link is unavailable.
                    return (
                        <span 
                            key={index} 
                            className="text-red-400 dark:text-red-500 font-semibold cursor-help" 
                            title={`المصدر [${citationNumber}] غير متوفر أو قيد التحميل...`}
                        >
                            {`[${citationNumber}]`}
                        </span>
                    );
                }
            }
            return part;
        }).filter(Boolean);
    };

    const blocks = text.split(/(\n\s*){2,}/).filter(block => block && block.trim() !== '');

    return (
        <>
            {blocks.map((block, index) => {
                const trimmedBlock = block.trim();

                if (trimmedBlock.startsWith('# ')) {
                    const Tag = trimmedBlock.startsWith('## ') ? 'h2' : 'h1';
                    const content = trimmedBlock.substring(Tag === 'h1' ? 2 : 3);
                    const className = Tag === 'h1' ? "text-2xl font-bold mt-6 mb-3" : "text-xl font-bold mt-4 mb-2";
                    return <Tag key={index} className={className}>{renderHighlightedText(content)}</Tag>;
                }

                if (trimmedBlock.startsWith('* ') || trimmedBlock.startsWith('- ')) {
                    const listItems = trimmedBlock.split('\n').map((item, i) => {
                        const trimmedItem = item.trim();
                        if (trimmedItem.startsWith('* ') || trimmedItem.startsWith('- ')) {
                            const content = processChunk(trimmedItem.substring(2));
                            return (
                                <li key={i} className="my-1">
                                    {content.map((c, ci) => typeof c === 'string' ? renderHighlightedText(c) : c)}
                                </li>
                            );
                        }
                        return null;
                    }).filter(Boolean);
                    return <ul key={index} className="list-disc list-outside pr-5 space-y-2 my-2">{listItems}</ul>;
                }

                if (trimmedBlock) {
                    const processedContent = processChunk(trimmedBlock);
                    const finalContent: React.ReactNode[] = [];
                    let textAccumulator = '';

                    const flushText = (key: string | number) => {
                        if (textAccumulator.trim()) {
                            finalContent.push(<p key={key} className="my-2 leading-relaxed">{renderHighlightedText(textAccumulator.trim())}</p>);
                            textAccumulator = '';
                        }
                    };
                    
                    processedContent.forEach((node, idx) => {
                        if (typeof node === 'string') {
                            textAccumulator += node;
                        } else {
                            flushText(`p-${index}-${idx}`);
                            finalContent.push(node);
                        }
                    });
                    flushText(`p-${index}-final`);
                    return <React.Fragment key={index}>{finalContent}</React.Fragment>;
                }

                return null;
            })}
        </>
    );
};


export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, sources, isLoading, onShare, onExportMarkdown, selectedVoice, setSelectedVoice }) => {
  const [highlightTerm, setHighlightTerm] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);

  const [showPodcastGenerator, setShowPodcastGenerator] = useState(false);
  const [podcastDuration, setPodcastDuration] = useState<PodcastDuration>('short');
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastGenerationStatus, setPodcastGenerationStatus] = useState('');
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [podcastMaleVoice, setPodcastMaleVoice] = useState<string>('Puck');
  const [podcastFemaleVoice, setPodcastFemaleVoice] = useState<string>('Kore');
  const [podcastTone, setPodcastTone] = useState<ResultTone>('casual');
  const [podcastDialect, setPodcastDialect] = useState<string>('Egyptian');


  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isCancelledRef = useRef(false);
  const hasPlayedForCurrentResult = useRef(false);
  const resultContainerRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } catch (e) {
        console.error("Web Audio API is not supported in this browser.", e);
    }
    
    return () => {
      stopSpeech(true);
      if (podcastAudioUrl) {
          URL.revokeObjectURL(podcastAudioUrl);
      }
      audioContextRef.current?.close();
    }
  }, []);

  useEffect(() => {
    setShowPodcastGenerator(false);
    setPodcastAudioUrl(null);
    setPodcastError(null);
    setIsGeneratingPodcast(false);

    if (isLoading) {
        hasPlayedForCurrentResult.current = false;
        stopSpeech();
        return;
    }

    if (!isLoading && result && !hasPlayedForCurrentResult.current) {
        hasPlayedForCurrentResult.current = true;
    }
  }, [result, isLoading]);

  const speak = async (text: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || !text.trim() || isGeneratingSpeech || isSpeaking) return;
    
    stopSpeech();
    isCancelledRef.current = false;
    setIsGeneratingSpeech(true);

    try {
        const base64Audio = await generateSpeech(text, selectedVoice);
        
        if (isCancelledRef.current) {
            setIsGeneratingSpeech(false);
            return;
        }
        
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        source.onended = () => {
            setIsSpeaking(false);
            audioSourceRef.current = null;
        };
        
        setIsGeneratingSpeech(false);
        setIsSpeaking(true);
        source.start();
        audioSourceRef.current = source;
    } catch (error) {
        console.error("Failed to generate or play speech:", error);
        alert("عذراً، حدث خطأ أثناء توليد الصوت.");
        setIsGeneratingSpeech(false);
        setIsSpeaking(false);
    }
  };
  
  const stopSpeech = (isUnmounting = false) => {
    isCancelledRef.current = true;
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
      } catch (e) { console.warn("Audio could not be stopped.", e); }
      audioSourceRef.current = null;
    }
    if (!isUnmounting) {
      setIsSpeaking(false);
      setIsGeneratingSpeech(false);
    }
  };

  const handleToggleSpeech = () => {
    if (isSpeaking || isGeneratingSpeech) {
      stopSpeech();
    } else {
      speak(result);
    }
  };

  const handleGeneratePodcast = async () => {
      if (!result.trim() || isGeneratingPodcast) return;
      setIsGeneratingPodcast(true);
      setPodcastError(null);
      if(podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl);
      setPodcastAudioUrl(null);
      
      try {
          setPodcastGenerationStatus("الخطوة 1/2: جارٍ كتابة نص البودكاست...");
          const script = await generatePodcastScript(result, podcastDuration, podcastTone, podcastDialect);

          setPodcastGenerationStatus("الخطوة 2/2: جارٍ توليد الأصوات...");
          const base64Audio = await generateMultiSpeakerSpeech(script, podcastMaleVoice, podcastFemaleVoice);
          
          const pcmData = decode(base64Audio);
          const wavBlob = createWavBlob(pcmData, 24000, 1);
          const url = URL.createObjectURL(wavBlob);
          setPodcastAudioUrl(url);

      } catch (err) {
          const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
          setPodcastError(message);
      } finally {
          setIsGeneratingPodcast(false);
          setPodcastGenerationStatus('');
      }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    alert('تم نسخ النتيجة إلى الحافظة!');
  };

  const handlePrint = () => window.print();

  return (
    <div ref={resultContainerRef} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-lg flex flex-col relative">
      <div className="relative">
        <ActionButtons 
            onCopy={handleCopy} 
            onShare={onShare} 
            onPrint={handlePrint} 
            onExportMarkdown={onExportMarkdown} 
            onToggleSpeech={handleToggleSpeech}
            isSpeaking={isSpeaking}
            isGeneratingSpeech={isGeneratingSpeech}
            onTogglePodcast={() => setShowPodcastGenerator(s => !s)}
            isPodcastVisible={showPodcastGenerator}
            disabled={isLoading || !result} 
        />
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إجابة حية</h2>
        </div>
      </div>
      
      {result && !isLoading && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="voice-select" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              صوت القراءة:
            </label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isLoading || isSpeaking || isGeneratingSpeech}
              className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            >
              {AVAILABLE_VOICES.map(voice => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="highlight-term" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              بحث ضمن النتيجة:
            </label>
            <div className="relative">
                <input
                  id="highlight-term"
                  type="text"
                  placeholder="كلمة للتمييز..."
                  value={highlightTerm}
                  onChange={(e) => setHighlightTerm(e.target.value)}
                  className="w-full text-sm p-2 pr-10 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <SearchIcon className="h-4 w-4 text-slate-400" />
                </div>
            </div>
          </div>
        </div>
      )}
      
      {showPodcastGenerator && !isLoading && result && (
          <div className="my-4 p-4 rounded-lg bg-slate-200 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700">
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">تحويل إلى بودكاست</h4>
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">مدة البودكاست:</label>
                      <div className="flex gap-3 flex-wrap">
                          {PODCAST_DURATIONS.map(d => (
                              <button key={d.id} onClick={() => setPodcastDuration(d.id)} disabled={isGeneratingPodcast}
                                  className={`px-3 py-1 text-sm rounded-full transition-colors disabled:opacity-50 ${podcastDuration === d.id ? 'bg-cyan-500 text-white font-semibold' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'}`}>
                                  {d.label}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label htmlFor="male-voice" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">صوت المذيع:</label>
                          <select id="male-voice" value={podcastMaleVoice} onChange={e => setPodcastMaleVoice(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                              {MALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                      </div>
                       <div>
                          <label htmlFor="female-voice" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">صوت المذيعة:</label>
                          <select id="female-voice" value={podcastFemaleVoice} onChange={e => setPodcastFemaleVoice(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                              {FEMALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                      </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label htmlFor="podcast-tone" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">نبرة الحديث:</label>
                          <select id="podcast-tone" value={podcastTone} onChange={e => setPodcastTone(e.target.value as ResultTone)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                              {PODCAST_TONES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                       <div>
                          <label htmlFor="podcast-dialect" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">اللهجة:</label>
                          <select id="podcast-dialect" value={podcastDialect} onChange={e => setPodcastDialect(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                              {PODCAST_DIALECTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                      </div>
                  </div>

                  <button onClick={handleGeneratePodcast} disabled={isGeneratingPodcast}
                      className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-500 disabled:cursor-wait flex items-center justify-center gap-2">
                      {isGeneratingPodcast && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                      {isGeneratingPodcast ? 'جارٍ الإنشاء...' : 'ابدأ الإنشاء'}
                  </button>
                  {isGeneratingPodcast && <p className="text-sm text-center text-slate-500 dark:text-slate-400">{podcastGenerationStatus}</p>}
                  {podcastError && <p className="text-sm text-center text-red-500 bg-red-500/10 p-2 rounded-md">{podcastError}</p>}
                  {podcastAudioUrl && (
                      <div className="space-y-2">
                          <audio controls src={podcastAudioUrl} className="w-full"></audio>
                          <a href={podcastAudioUrl} download="live-pulse-podcast.wav" className="block text-center text-sm text-cyan-500 hover:underline">
                              تحميل البودكاست (WAV)
                          </a>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className="prose dark:prose-invert prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-li:text-slate-600 dark:prose-li:text-slate-300 text-base leading-relaxed overflow-y-auto flex-grow max-h-[60vh]">
        {isLoading && !result ? (
          <LoadingSkeleton />
        ) : (
          <div>
            <MarkdownRenderer 
                text={result} 
                sources={sources}
                highlightTerm={highlightTerm}
            />
            {isLoading && <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ms-1" />}
          </div>
        )}
      </div>

      {sources.length > 0 && !isLoading && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-cyan-400" />
                المصادر
            </h3>
            <ol className="list-decimal list-outside pr-5 space-y-2 text-slate-600 dark:text-slate-400">
                {sources.map((source, index) => (
                    <li 
                        key={source.uri} 
                        id={`source-${index + 1}`}
                        className="p-1 rounded-md"
                    >
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline break-words visited:text-purple-400">
                            {source.title}
                        </a>
                    </li>
                ))}
            </ol>
        </div>
      )}
    </div>
  );
};