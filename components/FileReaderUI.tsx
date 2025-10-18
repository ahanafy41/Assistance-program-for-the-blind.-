import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon, BookOpenIcon, PaperAirplaneIcon, PodcastIcon } from './icons';
import { chatOnFileContentStream, generatePodcastScript, generateMultiSpeakerSpeech, extractTextFromPdf } from '../services/geminiService';
import type { ChatMessage, PodcastDuration, ResultTone, PodcastScriptLine } from '../types';
import mammoth from 'mammoth';
import { decode, createWavBlob } from '../utils/audio';

// Constants copied from PodcastCreatorUI for consistency
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
    { id: 'professional', name: 'احترافي ورسمي' },
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

type ViewState = 'upload' | 'pageSelection' | 'reader';
type LoadedFileType = 'text' | 'pdf' | 'word' | null;

export const FileReaderUI: React.FC = () => {
    // General State
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [fileContent, setFileContent] = useState<string | null>(null); // Full content for AI context
    const [fileName, setFileName] = useState<string>('');
    const [fileType, setFileType] = useState<LoadedFileType>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [encoding, setEncoding] = useState('UTF-8');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'podcast'>('chat');
    
    // Content State
    const [allExtractedPages, setAllExtractedPages] = useState<string[]>([]);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageContents, setPageContents] = useState<string[]>([]); // holds text/html for each page in range
    const [startPageInput, setStartPageInput] = useState('');
    const [endPageInput, setEndPageInput] = useState('');


    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);

    // Podcast State
    const [podcastDuration, setPodcastDuration] = useState<PodcastDuration>('short');
    const [podcastTone, setPodcastTone] = useState<ResultTone>('casual');
    const [podcastDialect, setPodcastDialect] = useState<string>('Egyptian');
    const [podcastMaleVoice, setPodcastMaleVoice] = useState<string>('Puck');
    const [podcastFemaleVoice, setPodcastFemaleVoice] = useState<string>('Kore');
    const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
    const [podcastGenerationStatus, setPodcastGenerationStatus] = useState('');
    const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
    const [podcastError, setPodcastError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const resetAllState = () => {
        setViewState('upload');
        setFileContent(null);
        setFileName('');
        setFileType(null);
        setSelectedFile(null);
        setEncoding('UTF-8');
        setChatHistory([]);
        setCurrentMessage('');
        setIsResponding(false);
        setPodcastAudioUrl(null);
        setPodcastError(null);
        setIsGeneratingPodcast(false);
        setPodcastGenerationStatus('');
        setError(null);
        setActiveTab('chat');
        setTotalPages(0);
        setCurrentPage(1);
        setPageContents([]);
        setAllExtractedPages([]);
        setStartPageInput('');
        setEndPageInput('');
        setIsLoading(false);
        setLoadingMessage('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            resetAllState();
            setSelectedFile(file);
            setFileName(file.name);
            const fileMimeType = file.type;
            const fileNameLower = file.name.toLowerCase();

            if (fileMimeType === 'application/pdf') {
                setFileType('pdf');
                handlePdfProcessing(file);
            } else if (
                fileMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                fileMimeType === 'application/msword' ||
                fileNameLower.endsWith('.docx') ||
                fileNameLower.endsWith('.doc')
            ) {
                setFileType('word');
                handleWordFileProcessing(file);
            } else {
                setFileType('text');
                readTextFile(file, 'UTF-8');
            }
        }
    };
    
    const readTextFile = (file: File, selectedEncoding: string) => {
        setIsLoading(true);
        setLoadingMessage('جارٍ قراءة الملف...');
        setError(null);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setFileContent(text);
            setPageContents([text]); // Store text in pageContents for unified view
            setTotalPages(1);
            setCurrentPage(1);
            setIsLoading(false);
            setViewState('reader');
             if (chatHistory.length === 0) {
                setChatHistory([{ role: 'model', content: `تم تحميل الملف "${file.name}". أنا جاهز للإجابة على أسئلتك بخصوص محتواه.` }]);
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة الملف. قد يكون الترميز غير صحيح.');
            setIsLoading(false);
            setViewState('upload');
        };
        reader.readAsText(file, selectedEncoding);
    }
    
    const handleWordFileProcessing = (file: File) => {
        setIsLoading(true);
        setLoadingMessage('جارٍ معالجة مستند Word...');
        setError(null);
        setChatHistory([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                
                // Get HTML for display
                const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

                // Get raw text for AI context
                const textResult = await mammoth.extractRawText({ arrayBuffer });
                const rawText = textResult.value;

                if (!rawText.trim()) {
                   throw new Error("المستند فارغ أو لا يمكن قراءة المحتوى.");
                }

                setFileContent(rawText);
                setPageContents([htmlResult.value]);
                setTotalPages(1);
                setCurrentPage(1);
                setIsLoading(false);
                setViewState('reader');
                setChatHistory([{ role: 'model', content: `تم تحميل الملف "${file.name}". أنا جاهز للإجابة على أسئلتك بخصوص محتواه.` }]);

            } catch (err) {
                 const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء معالجة المستند.";
                 setError(`فشل في معالجة ملف Word: ${message}`);
                 setIsLoading(false);
                 setViewState('upload');
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة ملف Word من القرص.');
            setIsLoading(false);
            setViewState('upload');
        }
        reader.readAsArrayBuffer(file);
    };

    const handlePdfProcessing = async (file: File) => {
        setIsLoading(true);
        setLoadingMessage('يتم تحليل المستند بواسطة الذكاء الاصطناعي... (قد يستغرق هذا بعض الوقت للملفات الكبيرة)');
        setError(null);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                const base64Data = dataUrl.split(',')[1];
                
                const pages = await extractTextFromPdf(base64Data, file.type);
                
                if (!pages || pages.length === 0) {
                    throw new Error("لم يتمكن الذكاء الاصطناعي من استخراج أي محتوى من ملف PDF.");
                }

                const extractedPageContents = pages.sort((a,b) => a.pageNumber - b.pageNumber).map(p => p.content);
                
                setAllExtractedPages(extractedPageContents);
                setTotalPages(extractedPageContents.length);
                setStartPageInput('1');
                setEndPageInput(extractedPageContents.length.toString());
                setIsLoading(false);
                setViewState('pageSelection');

            } catch (err) {
                const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء معالجة الملف.";
                setError(message);
                setIsLoading(false);
                setViewState('upload');
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة ملف PDF من القرص.');
            setIsLoading(false);
            setViewState('upload');
        }
        reader.readAsDataURL(file);
    };

    const handleLoadPageRange = () => {
        setError(null);
        const start = parseInt(startPageInput, 10);
        const end = parseInt(endPageInput, 10) || totalPages;

        if (isNaN(start) || start < 1 || start > totalPages || start > end) {
            setError('رقم صفحة البداية غير صالح.');
            return;
        }
        if (isNaN(end) || end < start || end > totalPages) {
            setError('رقم صفحة النهاية غير صالح.');
            return;
        }

        const selectedPages = allExtractedPages.slice(start - 1, end);
        const fullText = selectedPages.map((content, index) => `--- Page ${start + index} ---\n${content}`).join('\n\n');

        setPageContents(selectedPages);
        setFileContent(fullText);
        setTotalPages(selectedPages.length); // Update total pages to reflect the selection
        setCurrentPage(1);
        setViewState('reader');
        setChatHistory([{ role: 'model', content: `تم تحميل الصفحات من ${start} إلى ${end} من الملف "${fileName}". أنا جاهز لأسئلتك.` }]);
    };


    const handleEncodingChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newEncoding = event.target.value;
        setEncoding(newEncoding);
        if (selectedFile && fileType === 'text') {
            readTextFile(selectedFile, newEncoding);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSend = currentMessage.trim();
        if (!messageToSend || !fileContent || isResponding) return;

        const newUserMessage: ChatMessage = { role: 'user', content: messageToSend };
        const currentHistory = [...chatHistory, newUserMessage];
        setChatHistory(currentHistory);
        setCurrentMessage('');
        setIsResponding(true);
        setError(null);
        
        let fullResponse = '';
        const newModelMessage: ChatMessage = { role: 'model', content: '' };
        setChatHistory(prev => [...prev, newModelMessage]);

        try {
            const stream = await chatOnFileContentStream(fileContent, currentHistory.slice(0, -1), messageToSend);
            for await (const chunk of stream) {
                const chunkText = chunk.text;
                fullResponse += chunkText;
                setChatHistory(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage.role === 'model') {
                        return [...prev.slice(0, -1), { role: 'model', content: fullResponse }];
                    }
                    return prev;
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
            setError(errorMessage);
            setChatHistory(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'model' && lastMessage.content === '') {
                    return [...prev.slice(0, -1)];
                }
                return prev;
            });
        } finally {
            setIsResponding(false);
        }
    };

    const handleGeneratePodcast = async () => {
        const contentForPodcast = fileContent;
        if (!contentForPodcast || isGeneratingPodcast) return;
        
        setIsGeneratingPodcast(true);
        setPodcastError(null);
        if (podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl);
        setPodcastAudioUrl(null);

        try {
            setPodcastGenerationStatus("الخطوة 1: جارٍ كتابة نص البودكاست...");
            const script = await generatePodcastScript(contentForPodcast, podcastDuration, podcastTone, podcastDialect);

            const CHUNK_SIZE = 10;
            const totalChunks = Math.ceil(script.length / CHUNK_SIZE);
            const audioChunks: Uint8Array[] = [];

            for (let i = 0; i < script.length; i += CHUNK_SIZE) {
                const chunk = script.slice(i, i + CHUNK_SIZE);
                const currentChunkNum = i / CHUNK_SIZE + 1;
                setPodcastGenerationStatus(`الخطوة 2/${totalChunks + 1}: جارٍ توليد المقطع الصوتي ${currentChunkNum}...`);
                
                const base64Chunk = await generateMultiSpeakerSpeech(chunk, podcastMaleVoice, podcastFemaleVoice);
                audioChunks.push(decode(base64Chunk));
            }

            setPodcastGenerationStatus(`الخطوة ${totalChunks + 1}/${totalChunks + 1}: جارٍ تجميع الصوت...`);
            const wavBlob = createWavBlob(audioChunks, 24000, 1);
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

    const renderChatUI = () => (
        <div className="flex flex-col h-full">
             <div className="flex-grow overflow-y-auto mb-4 p-2 space-y-4 bg-slate-900/50 rounded-lg">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}{msg.role === 'model' && isResponding && index === chatHistory.length - 1 && <span className="inline-block w-2 h-4 bg-current animate-pulse ms-1" />}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="relative">
                <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="اسأل عن محتوى الملف..."
                    disabled={isResponding}
                    className="w-full p-3 pr-12 bg-slate-700 border border-slate-600 rounded-full text-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isResponding || !currentMessage.trim()}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 p-2 rounded-full"
                    aria-label="إرسال"
                >
                    <PaperAirplaneIcon className="h-5 w-5 text-white"/>
                </button>
            </form>
            {error && <p className="mt-2 text-center text-red-400 text-sm">{error}</p>}
        </div>
    );
    
    const renderPodcastUI = () => (
        <div className="flex flex-col h-full space-y-4 overflow-y-auto p-1">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">مدة البودكاست:</label>
                <div className="flex gap-2 flex-wrap">
                    {PODCAST_DURATIONS.map(d => (
                        <button key={d.id} onClick={() => setPodcastDuration(d.id)} disabled={isGeneratingPodcast}
                            className={`px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${podcastDuration === d.id ? 'bg-cyan-500 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="pmale-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيع:</label>
                    <select id="pmale-voice" value={podcastMaleVoice} onChange={e => setPodcastMaleVoice(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {MALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="pfemale-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيعة:</label>
                    <select id="pfemale-voice" value={podcastFemaleVoice} onChange={e => setPodcastFemaleVoice(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {FEMALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="ppodcast-tone" className="block text-sm font-medium text-slate-300 mb-1">نبرة الحديث:</label>
                    <select id="ppodcast-tone" value={podcastTone} onChange={e => setPodcastTone(e.target.value as ResultTone)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {PODCAST_TONES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="ppodcast-dialect" className="block text-sm font-medium text-slate-300 mb-1">اللهجة:</label>
                    <select id="ppodcast-dialect" value={podcastDialect} onChange={e => setPodcastDialect(e.target.value)} disabled={isGeneratingPodcast} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {PODCAST_DIALECTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>
            
            <button onClick={handleGeneratePodcast} disabled={isGeneratingPodcast || !fileContent}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-wait flex items-center justify-center gap-2">
                {isGeneratingPodcast ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{podcastGenerationStatus || 'جارٍ الإنشاء...'}</span>
                    </>
                ) : 'إنشاء بودكاست من النص'}
            </button>

            {podcastError && <p className="text-sm text-center text-red-400 bg-red-500/10 p-2 rounded-md">{podcastError}</p>}
            
            {podcastAudioUrl && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-base font-semibold">النتيجة النهائية:</h4>
                    <audio controls src={podcastAudioUrl} className="w-full"></audio>
                    <a href={podcastAudioUrl} download={`${fileName}-podcast.wav`} className="block text-center text-sm text-cyan-400 hover:underline">
                        تحميل البودكاست (WAV)
                    </a>
                </div>
            )}
        </div>
    );
    
    const renderContentPanel = () => {
        const pageIndex = currentPage - 1;
        const currentContent = pageContents[pageIndex] || "لا يوجد محتوى في هذه الصفحة.";

        return (
            <div className="flex flex-col bg-slate-900/30 p-3 rounded-lg min-h-0 h-full">
                <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                    <h3 id="content-heading" className="text-lg font-semibold text-slate-200">
                         محتوى الملف {totalPages > 1 ? `- صفحة ${currentPage}` : ''}
                    </h3>
                    <div aria-live="polite" className="sr-only">
                        جارٍ عرض الصفحة {currentPage} من {totalPages}
                    </div>
                </div>

                <div role="document" aria-labelledby="content-heading" className="flex-grow overflow-y-auto pr-2 prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-li:text-slate-300 max-w-none">
                    {fileType === 'word' ? (
                        <div dangerouslySetInnerHTML={{ __html: currentContent as string }} />
                    ) : (
                        <div>
                            {currentContent.split('\n').map((line, index) => (
                                <p key={index} className="break-words min-h-[1em]">
                                    {line || '\u00A0'} {/* Use a non-breaking space for empty lines */}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <nav aria-label="تنقل الصفحات" className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
                        <button 
                            onClick={() => setCurrentPage(p => p - 1)} 
                            disabled={currentPage <= 1}
                            className="px-4 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                            السابقة
                        </button>
                        <span className="text-sm text-slate-400">
                            صفحة {currentPage} من {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => p + 1)} 
                            disabled={currentPage >= totalPages}
                            className="px-4 py-1 bg-slate-700 hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed">
                            التالية
                        </button>
                    </nav>
                )}
            </div>
        );
    };

    const renderReaderView = () => (
        <div className="flex flex-col flex-grow min-h-0">
             <div className="mb-4 p-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center bg-slate-900/50 rounded-md text-slate-300 text-sm">
                <div>
                    الملف المحمل: <span className="font-semibold">{fileName}</span>. 
                    <button onClick={resetAllState} className="text-cyan-400 hover:underline mx-2">تحميل ملف آخر</button>
                </div>
                {fileType === 'text' && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="encoding-select" className="text-xs text-slate-400">تغيير ترميز الملف:</label>
                        <select 
                            id="encoding-select"
                            value={encoding}
                            onChange={handleEncodingChange}
                            className="text-xs p-1 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="UTF-8">تلقائي (UTF-8)</option>
                            <option value="Windows-1256">عربي (Windows-1256)</option>
                        </select>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
                <div className="flex flex-col bg-slate-900/30 p-3 rounded-lg min-h-0">
                    <div className="flex border-b border-slate-700 mb-2">
                        <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <PaperAirplaneIcon className="h-4 w-4" /> محادثة
                        </button>
                        <button onClick={() => setActiveTab('podcast')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'podcast' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <PodcastIcon className="h-4 w-4" /> صانع البودكاست
                        </button>
                    </div>
                    <div className="flex-grow min-h-0">
                        {activeTab === 'chat' ? renderChatUI() : renderPodcastUI()}
                    </div>
                </div>
                {renderContentPanel()}
            </div>
        </div>
    );
    
    const renderUploadView = () => (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <UploadIcon className="h-16 w-16 mb-4 text-slate-500"/>
            <h3 className="text-xl font-semibold text-slate-300">قم بتحميل ملف (.txt, .md, .pdf, .docx)</h3>
            <p className="text-slate-400 mt-2">للتحدث معه أو تحويله إلى بودكاست.</p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md,.text,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300"
            >
                اختر ملفًا
            </button>
            {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
    );

    const renderPageSelectionView = () => (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <BookOpenIcon className="h-16 w-16 mb-4 text-slate-500"/>
            <h3 className="text-xl font-semibold text-slate-300">تم تحليل الملف: <span className="text-cyan-400">{fileName}</span></h3>
            <p className="text-slate-400 mt-2">
                وجدنا <span className="font-bold">{totalPages}</span> صفحات. حدد النطاق الذي تريد قراءته.
            </p>
            <div className="flex items-center gap-4 my-6">
                <div className="flex flex-col items-center">
                    <label htmlFor="start-page" className="text-sm mb-1 text-slate-400">من صفحة</label>
                    <input
                        id="start-page"
                        type="number"
                        value={startPageInput}
                        onChange={(e) => setStartPageInput(e.target.value)}
                        min="1"
                        max={totalPages}
                        className="w-24 p-2 text-center bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="flex flex-col items-center">
                    <label htmlFor="end-page" className="text-sm mb-1 text-slate-400">إلى صفحة</label>
                    <input
                        id="end-page"
                        type="number"
                        value={endPageInput}
                        onChange={(e) => setEndPageInput(e.target.value)}
                        min="1"
                        max={totalPages}
                        placeholder={totalPages.toString()}
                        className="w-24 p-2 text-center bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
            </div>
            <div className="flex gap-4">
                 <button
                    onClick={resetAllState}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300"
                >
                    اختر ملفًا آخر
                </button>
                <button
                    onClick={handleLoadPageRange}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-full transition-colors duration-300"
                >
                    اقرأ الصفحات المحددة
                </button>
            </div>
             {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>
    );
    
    const renderCurrentView = () => {
        if (isLoading) {
             return (
                <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg">{loadingMessage || 'جارٍ التحميل...'}</p>
                </div>
            );
        }
        switch(viewState) {
            case 'upload': return renderUploadView();
            case 'pageSelection': return renderPageSelectionView();
            case 'reader': return renderReaderView();
            default: return renderUploadView();
        }
    }

    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                <BookOpenIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">قارئ الملفات الذكي</h2>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
               {renderCurrentView()}
            </div>
        </div>
    );
};