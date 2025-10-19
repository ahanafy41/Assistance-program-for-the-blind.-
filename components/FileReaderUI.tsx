import React, { useState, useEffect } from 'react';
import { SpeakerWaveIcon, FilmIcon, BookOpenIcon } from './icons';
import { 
    chatOnFileContentStream, 
    generatePodcastScript, 
    generateMultiSpeakerSpeech, 
    getPdfPageCount,
    chatOnPdfContentStream,
    generateVideoDescription,
    chatOnVideoContentStream,
    extractPdfPagesContentInRange,
    transcribeAudio,
} from '../services/geminiService';
import type { ChatMessage, PodcastDuration, ResultTone } from '../types';
import mammoth from 'mammoth';
import { decode, createWavBlob } from '../utils/audio';

// Import new components
import { UploadView } from './filereader/UploadView';
import { ReaderView } from './filereader/ReaderView';
import { ReaderModal } from './filereader/ReaderModal';

type ViewState = 'upload' | 'reader';
type LoadedFileType = 'text' | 'pdf' | 'word' | 'video' | 'audio' | null;

export const FileReaderUI: React.FC = () => {
    // General State
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [fileType, setFileType] = useState<LoadedFileType>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [encoding, setEncoding] = useState('UTF-8');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Document State
    const [displayContent, setDisplayContent] = useState('');
    
    // PDF State
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [pdfMimeType, setPdfMimeType] = useState<string | null>(null);
    const [pdfPageCount, setPdfPageCount] = useState<number>(0);
    const [startPage, setStartPage] = useState<number>(1);
    const [endPage, setEndPage] = useState<number>(1);
    
    // Video State
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoBase64, setVideoBase64] = useState<string | null>(null);
    const [videoMimeType, setVideoMimeType] = useState<string | null>(null);

    // Audio State
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

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

    // PDF Reader Modal State
    const [isReaderModalOpen, setIsReaderModalOpen] = useState(false);
    const [currentPageInReader, setCurrentPageInReader] = useState(1);
    const [isViewerLoading, setIsViewerLoading] = useState(false);
    const [pageFetchError, setPageFetchError] = useState<string | null>(null);
    const [viewerPagesContent, setViewerPagesContent] = useState<string[]>([]);
    const [viewerContentRange, setViewerContentRange] = useState<{start: number, end: number} | null>(null);
    
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
        setDisplayContent('');
        setIsLoading(false);
        setLoadingMessage('');
        setVideoSrc(null);
        setVideoBase64(null);
        setVideoMimeType(null);
        setAudioSrc(null);
        setPdfBase64(null);
        setPdfMimeType(null);
        setPdfPageCount(0);
        setStartPage(1);
        setEndPage(1);
        setIsReaderModalOpen(false);
        setCurrentPageInReader(1);
        setIsViewerLoading(false);
        setPageFetchError(null);
        setViewerPagesContent([]);
        setViewerContentRange(null);
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            resetAllState();
            setSelectedFile(file);
            setFileName(file.name);
            const fileMimeType = file.type;
            const fileNameLower = file.name.toLowerCase();

            if(fileMimeType.startsWith('video/')) {
                setFileType('video');
                handleVideoFileProcessing(file);
            } else if (fileMimeType.startsWith('audio/')) {
                setFileType('audio');
                handleAudioFileProcessing(file);
            } else if (fileMimeType === 'application/pdf') {
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
            setDisplayContent(text);
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
                
                const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
                const textResult = await mammoth.extractRawText({ arrayBuffer });
                const rawText = textResult.value;

                if (!rawText.trim()) {
                   throw new Error("المستند فارغ أو لا يمكن قراءة المحتوى.");
                }

                setFileContent(rawText);
                setDisplayContent(htmlResult.value);
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
        setLoadingMessage('جارٍ تحليل ملف PDF للحصول على معلومات...');
        setError(null);
        setChatHistory([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                const base64Data = dataUrl.split(',')[1];
                
                setPdfBase64(base64Data);
                setPdfMimeType(file.type);
                
                const pageCount = await getPdfPageCount(base64Data, file.type);
                
                if (pageCount <= 0) {
                    throw new Error("لم يتمكن الذكاء الاصطناعي من تحديد عدد صفحات المستند.");
                }

                setPdfPageCount(pageCount);
                setStartPage(1);
                setEndPage(pageCount);
                
                setIsLoading(false);
                setViewState('reader');
                setChatHistory([{ role: 'model', content: `تم تحميل وتحليل الملف "${fileName}" (${pageCount} صفحات). حدد نطاق الصفحات وابدأ المحادثة.` }]);

            } catch (err) {
                const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء معالجة الملف.";
                setError(message);
                resetAllState();
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة ملف PDF من القرص.');
            setIsLoading(false);
            setViewState('upload');
        }
        reader.readAsDataURL(file);
    };

    const handleVideoFileProcessing = (file: File) => {
        setIsLoading(true);
        setLoadingMessage('جارٍ تحميل ومعالجة الفيديو...');
        setError(null);
        setChatHistory([]);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                const base64 = dataUrl.split(',')[1];
                
                setVideoSrc(dataUrl);
                setVideoBase64(base64);
                setVideoMimeType(file.type);
                setViewState('reader');
                setIsLoading(false);

                // Start AI description
                setIsResponding(true);
                setChatHistory([{ role: 'model', content: "جارٍ تحليل الفيديو لوصف محتواه..." }]);
                const description = await generateVideoDescription(base64, file.type);
                setChatHistory([{ role: 'model', content: `تم تحميل الفيديو "${file.name}".\n\n**وصف أولي لمحتوى الفيديو:**\n${description}` }]);

            } catch(err) {
                const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
                setError(`فشل في معالجة الفيديو: ${message}`);
                resetAllState();
            } finally {
                setIsResponding(false);
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة ملف الفيديو من القرص.');
            setIsLoading(false);
            setViewState('upload');
        };
        reader.readAsDataURL(file);
    };
    
    const handleAudioFileProcessing = (file: File) => {
        setIsLoading(true);
        setLoadingMessage('جارٍ تحميل الملف الصوتي...');
        setError(null);
        setChatHistory([]);
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataUrl = e.target?.result as string;
                const base64 = dataUrl.split(',')[1];
                
                setAudioSrc(dataUrl);
                setViewState('reader');
                setLoadingMessage('جارٍ نسخ الملف الصوتي (قد يستغرق بعض الوقت)...');
                
                const transcription = await transcribeAudio(base64, file.type);
                
                if (!transcription.trim()) {
                    throw new Error("لم يتمكن الذكاء الاصطناعي من استخراج أي نص من الملف الصوتي.");
                }

                setFileContent(transcription);
                setDisplayContent(transcription);
                setIsLoading(false);
                setChatHistory([{ role: 'model', content: `تم تحميل ونسخ الملف الصوتي "${file.name}". أنا جاهز للإجابة على أسئلتك بخصوص محتواه.` }]);
            } catch(err) {
                const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
                setError(`فشل في معالجة الملف الصوتي: ${message}`);
                resetAllState();
            }
        };
        reader.onerror = () => {
            setError('فشل في قراءة الملف الصوتي من القرص.');
            setIsLoading(false);
            setViewState('upload');
        };
        reader.readAsDataURL(file);
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
        if (!messageToSend || isResponding) return;

        if (fileType === 'pdf' && !pdfBase64) return;
        if (fileType === 'video' && !videoBase64) return;
        if (['text', 'word', 'audio'].includes(fileType || '') && !fileContent) return;

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
            let stream;
            if (fileType === 'pdf') {
                stream = await chatOnPdfContentStream(pdfBase64!, pdfMimeType!, currentHistory.slice(0, -1), messageToSend, startPage, endPage);
            } else if (fileType === 'video') {
              stream = await chatOnVideoContentStream(videoBase64!, videoMimeType!, currentHistory.slice(0, -1), messageToSend);
            } else {
              stream = await chatOnFileContentStream(fileContent!, currentHistory.slice(0, -1), messageToSend);
            }

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

    const handleOpenReader = async () => {
        if (viewerPagesContent.length > 0 && viewerContentRange?.start === startPage && viewerContentRange?.end === endPage) {
            setCurrentPageInReader(Math.max(startPage, Math.min(endPage, currentPageInReader)));
            setIsReaderModalOpen(true);
            return;
        }

        if (!pdfBase64 || !pdfMimeType) return;
        
        setIsViewerLoading(true);
        setPageFetchError(null);
        setIsReaderModalOpen(true);
        
        try {
            const pages = await extractPdfPagesContentInRange(pdfBase64, pdfMimeType, startPage, endPage);
            setViewerPagesContent(pages);
            setViewerContentRange({ start: startPage, end: endPage });
            setCurrentPageInReader(startPage);
        } catch (err) {
            const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
            setPageFetchError(message);
            setViewerPagesContent([]);
            setViewerContentRange(null);
        } finally {
            setIsViewerLoading(false);
        }
    };

    const handleGoToPage = (newPage: number) => {
        if (viewerContentRange && newPage >= viewerContentRange.start && newPage <= viewerContentRange.end && viewerPagesContent.length > 0) {
            setCurrentPageInReader(newPage);
        }
    };
    
    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4 relative">
            <ReaderModal
                isOpen={isReaderModalOpen}
                onClose={() => setIsReaderModalOpen(false)}
                fileName={fileName}
                isLoading={isViewerLoading}
                error={pageFetchError}
                pagesContent={viewerPagesContent}
                currentPage={currentPageInReader}
                startPage={viewerContentRange?.start ?? startPage}
                endPage={viewerContentRange?.end ?? endPage}
                onGoToPage={handleGoToPage}
            />
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                {fileType === 'video' ? <FilmIcon className="h-6 w-6 text-cyan-400" /> : 
                 fileType === 'audio' ? <SpeakerWaveIcon className="h-6 w-6 text-cyan-400" /> : 
                 <BookOpenIcon className="h-6 w-6 text-cyan-400" />}
                <h2 className="text-2xl font-bold text-slate-100">
                    {fileType === 'video' ? 'محلل الفيديو الذكي' : 
                     fileType === 'audio' ? 'محلل الصوت الذكي' : 
                     'قارئ الملفات الذكي'}
                </h2>
            </div>
            
            <div className="flex-grow flex flex-col min-h-0">
               {viewState === 'upload' ? (
                    <UploadView 
                        onFileChange={handleFileChange}
                        isLoading={isLoading}
                        loadingMessage={loadingMessage}
                        error={error}
                    />
               ) : (
                    <ReaderView
                        fileName={fileName}
                        fileType={fileType}
                        encoding={encoding}
                        onEncodingChange={handleEncodingChange}
                        onReset={resetAllState}
                        videoSrc={videoSrc}
                        audioSrc={audioSrc}
                        chatHistory={chatHistory}
                        isResponding={isResponding}
                        currentMessage={currentMessage}
                        setCurrentMessage={setCurrentMessage}
                        handleSendMessage={handleSendMessage}
                        chatError={error}
                        fileContent={fileContent}
                        podcastDuration={podcastDuration}
                        setPodcastDuration={setPodcastDuration}
                        podcastTone={podcastTone}
                        setPodcastTone={setPodcastTone}
                        podcastDialect={podcastDialect}
                        setPodcastDialect={setPodcastDialect}
                        podcastMaleVoice={podcastMaleVoice}
                        setPodcastMaleVoice={setPodcastMaleVoice}
                        podcastFemaleVoice={podcastFemaleVoice}
                        setPodcastFemaleVoice={setPodcastFemaleVoice}
                        isGeneratingPodcast={isGeneratingPodcast}
                        podcastGenerationStatus={podcastGenerationStatus}
                        podcastAudioUrl={podcastAudioUrl}
                        podcastError={podcastError}
                        handleGeneratePodcast={handleGeneratePodcast}
                        pdfPageCount={pdfPageCount}
                        startPage={startPage}
                        setStartPage={setStartPage}
                        endPage={endPage}
                        setEndPage={setEndPage}
                        handleOpenReader={handleOpenReader}
                        displayContent={displayContent}
                    />
               )}
            </div>
        </div>
    );
};