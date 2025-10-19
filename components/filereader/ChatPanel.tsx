import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { PaperAirplaneIcon } from '../icons';

interface ChatPanelProps {
    history: ChatMessage[];
    isResponding: boolean;
    currentMessage: string;
    onMessageChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    fileType: 'text' | 'pdf' | 'word' | 'video' | 'audio' | null;
    error: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ history, isResponding, currentMessage, onMessageChange, onSubmit, fileType, error }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const getPlaceholderText = () => {
        switch (fileType) {
            case 'video':
                return "اسأل عن الفيديو...";
            case 'audio':
                return "اسأل عن الملف الصوتي...";
            default:
                return "اسأل عن محتوى الملف...";
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto mb-4 p-2 space-y-4 bg-slate-900/50 rounded-lg">
                {history.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}{msg.role === 'model' && isResponding && index === history.length - 1 && <span className="inline-block w-2 h-4 bg-current animate-pulse ms-1" />}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={onSubmit} className="relative">
                <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    placeholder={getPlaceholderText()}
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
};
