import React, { useState } from 'react';
import { PaperAirplaneIcon, PodcastIcon } from '../icons';
import { ChatPanel } from './ChatPanel';
import { PodcastPanel } from './PodcastPanel';
import { PdfControlsPanel } from './PdfControlsPanel';
import { ContentDisplayPanel } from './ContentDisplayPanel';
import type { ChatMessage, PodcastDuration, ResultTone } from '../../types';

interface DocumentReaderLayoutProps {
    // Common
    fileType: 'text' | 'pdf' | 'word';
    fileName: string;
    onReset: () => void;

    // Chat
    chatHistory: ChatMessage[];
    isResponding: boolean;
    currentMessage: string;
    setCurrentMessage: (msg: string) => void;
    handleSendMessage: (e: React.FormEvent) => void;
    chatError: string | null;

    // Podcast
    fileContent: string | null;
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

    // PDF
    pdfPageCount: number;
    startPage: number;
    setStartPage: (p: number) => void;
    endPage: number;
    setEndPage: (p: number) => void;
    handleOpenReader: () => void;

    // Text/Word
    displayContent: string;
}

export const DocumentReaderLayout: React.FC<DocumentReaderLayoutProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'chat' | 'podcast'>('chat');

    const renderLeftPanel = () => {
        if (activeTab === 'chat') {
            return (
                <ChatPanel
                    history={props.chatHistory}
                    isResponding={props.isResponding}
                    currentMessage={props.currentMessage}
                    onMessageChange={props.setCurrentMessage}
                    onSubmit={props.handleSendMessage}
                    fileType={props.fileType}
                    error={props.chatError}
                />
            );
        }
        if (activeTab === 'podcast') {
            return (
                <PodcastPanel
                    duration={props.podcastDuration}
                    setDuration={props.setPodcastDuration}
                    tone={props.podcastTone}
                    setTone={props.setPodcastTone}
                    dialect={props.podcastDialect}
                    setDialect={props.setPodcastDialect}
                    maleVoice={props.podcastMaleVoice}
                    setMaleVoice={props.setPodcastMaleVoice}
                    femaleVoice={props.podcastFemaleVoice}
                    setFemaleVoice={props.setPodcastFemaleVoice}
                    isGenerating={props.isGeneratingPodcast}
                    generationStatus={props.podcastGenerationStatus}
                    audioUrl={props.podcastAudioUrl}
                    error={props.podcastError}
                    onGenerate={props.handleGeneratePodcast}
                    fileName={props.fileName}
                    hasContent={!!props.fileContent}
                />
            );
        }
        return null;
    };
    
    const renderRightPanel = () => {
        if (props.fileType === 'pdf') {
            return (
                <PdfControlsPanel
                    fileName={props.fileName}
                    pageCount={props.pdfPageCount}
                    startPage={props.startPage}
                    setStartPage={props.setStartPage}
                    endPage={props.endPage}
                    setEndPage={props.setEndPage}
                    onOpenReader={props.handleOpenReader}
                    onReset={props.onReset}
                />
            );
        }
        return (
            <ContentDisplayPanel
                fileType={props.fileType}
                displayContent={props.displayContent}
            />
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
            <div className="flex flex-col bg-slate-900/30 p-3 rounded-lg min-h-0">
                <div className="flex border-b border-slate-700 mb-2">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'chat' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>
                        <PaperAirplaneIcon className="h-4 w-4" /> محادثة
                    </button>
                    {props.fileType !== 'pdf' && (
                        <button onClick={() => setActiveTab('podcast')} className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 ${activeTab === 'podcast' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}>
                            <PodcastIcon className="h-4 w-4" /> صانع البودكاست
                        </button>
                    )}
                </div>
                <div className="flex-grow min-h-0">
                    {renderLeftPanel()}
                </div>
            </div>
            {renderRightPanel()}
        </div>
    );
};