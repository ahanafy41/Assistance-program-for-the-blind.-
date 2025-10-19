import React from 'react';
import { DocumentReaderLayout } from './DocumentReaderLayout';
import { VideoReaderLayout } from './VideoReaderLayout';
import { AudioReaderLayout } from './AudioReaderLayout';
import type { ChatMessage, PodcastDuration, ResultTone } from '../../types';

type LoadedFileType = 'text' | 'pdf' | 'word' | 'video' | 'audio' | null;

interface ReaderViewProps {
    fileName: string;
    fileType: LoadedFileType;
    encoding: string;
    onEncodingChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onReset: () => void;
    // Props for children layouts
    videoSrc?: string | null;
    audioSrc?: string | null;
    chatHistory: ChatMessage[];
    isResponding: boolean;
    currentMessage: string;
    setCurrentMessage: (msg: string) => void;
    handleSendMessage: (e: React.FormEvent) => void;
    chatError: string | null;
    fileContent?: string | null;
    podcastDuration: PodcastDuration;
    setPodcastDuration: (d: PodcastDuration) => void;
    podcastTone: ResultTone;
    setPodcastTone: (t: ResultTone) => void;
    podcastDialect: string;
    setPodcastDialect: (d: string) => void;
    podcastMaleVoice: string;
    setPodcastMaleVoice: (v: string) => void;
    podcastFemaleVoice: string;
    setPodcastFemaleVoice: (v: string) => void;
    isGeneratingPodcast: boolean;
    podcastGenerationStatus: string;
    podcastAudioUrl: string | null;
    podcastError: string | null;
    handleGeneratePodcast: () => void;
    pdfPageCount: number;
    startPage: number;
    setStartPage: (p: number) => void;
    endPage: number;
    setEndPage: (p: number) => void;
    handleOpenReader: () => void;
    displayContent?: string;
}

export const ReaderView: React.FC<ReaderViewProps> = (props) => {
    
    const renderLayout = () => {
        switch(props.fileType) {
            case 'video':
                return (
                    <VideoReaderLayout
                        videoSrc={props.videoSrc!}
                        chatHistory={props.chatHistory}
                        isResponding={props.isResponding}
                        currentMessage={props.currentMessage}
                        setCurrentMessage={props.setCurrentMessage}
                        handleSendMessage={props.handleSendMessage}
                        chatError={props.chatError}
                    />
                );
            case 'audio':
                return (
                    <AudioReaderLayout
                        audioSrc={props.audioSrc!}
                        chatHistory={props.chatHistory}
                        isResponding={props.isResponding}
                        currentMessage={props.currentMessage}
                        setCurrentMessage={props.setCurrentMessage}
                        handleSendMessage={props.handleSendMessage}
                        chatError={props.chatError}
                    />
                );
            case 'text':
            case 'pdf':
            case 'word':
                return (
                     <DocumentReaderLayout
                        fileType={props.fileType}
                        fileName={props.fileName}
                        onReset={props.onReset}
                        chatHistory={props.chatHistory}
                        isResponding={props.isResponding}
                        currentMessage={props.currentMessage}
                        setCurrentMessage={props.setCurrentMessage}
                        handleSendMessage={props.handleSendMessage}
                        chatError={props.chatError}
                        fileContent={props.fileContent!}
                        podcastDuration={props.podcastDuration}
                        setPodcastDuration={props.setPodcastDuration}
                        podcastTone={props.podcastTone}
                        setPodcastTone={props.setPodcastTone}
                        podcastDialect={props.podcastDialect}
                        setPodcastDialect={props.setPodcastDialect}
                        podcastMaleVoice={props.podcastMaleVoice}
                        setPodcastMaleVoice={props.setPodcastMaleVoice}
                        podcastFemaleVoice={props.podcastFemaleVoice}
                        setPodcastFemaleVoice={props.setPodcastFemaleVoice}
                        isGeneratingPodcast={props.isGeneratingPodcast}
                        podcastGenerationStatus={props.podcastGenerationStatus}
                        podcastAudioUrl={props.podcastAudioUrl}
                        podcastError={props.podcastError}
                        handleGeneratePodcast={props.handleGeneratePodcast}
                        pdfPageCount={props.pdfPageCount}
                        startPage={props.startPage}
                        setStartPage={props.setStartPage}
                        endPage={props.endPage}
                        setEndPage={props.setEndPage}
                        handleOpenReader={props.handleOpenReader}
                        displayContent={props.displayContent!}
                    />
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col flex-grow min-h-0">
             <div className="mb-4 p-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center bg-slate-900/50 rounded-md text-slate-300 text-sm">
                <div>
                    الملف المحمل: <span className="font-semibold">{props.fileName}</span>. 
                    <button onClick={props.onReset} className="text-cyan-400 hover:underline mx-2">تحميل ملف آخر</button>
                </div>
                {props.fileType === 'text' && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="encoding-select" className="text-xs text-slate-400">تغيير ترميز الملف:</label>
                        <select 
                            id="encoding-select"
                            value={props.encoding}
                            onChange={props.onEncodingChange}
                            className="text-xs p-1 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="UTF-8">تلقائي (UTF-8)</option>
                            <option value="Windows-1256">عربي (Windows-1256)</option>
                        </select>
                    </div>
                )}
            </div>
           {renderLayout()}
        </div>
    );
};
