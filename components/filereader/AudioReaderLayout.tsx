import React from 'react';
import type { ChatMessage } from '../../types';
import { ChatPanel } from './ChatPanel';

interface AudioReaderLayoutProps {
    audioSrc: string | null;
    // Chat props
    chatHistory: ChatMessage[];
    isResponding: boolean;
    currentMessage: string;
    setCurrentMessage: (msg: string) => void;
    handleSendMessage: (e: React.FormEvent) => void;
    chatError: string | null;
}

export const AudioReaderLayout: React.FC<AudioReaderLayoutProps> = (props) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
            <div className="bg-slate-900/30 p-3 rounded-lg flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-slate-200 mb-2 w-full">معاينة الملف الصوتي</h3>
                {props.audioSrc && <audio controls src={props.audioSrc} className="w-full"></audio>}
            </div>
            <div className="flex flex-col bg-slate-900/30 p-3 rounded-lg min-h-0">
                <h3 className="text-lg font-semibold text-slate-200 mb-2 w-full">محادثة حول الملف الصوتي</h3>
                <ChatPanel
                    history={props.chatHistory}
                    isResponding={props.isResponding}
                    currentMessage={props.currentMessage}
                    onMessageChange={props.setCurrentMessage}
                    onSubmit={props.handleSendMessage}
                    fileType="audio"
                    error={props.chatError}
                />
            </div>
        </div>
    );
};
