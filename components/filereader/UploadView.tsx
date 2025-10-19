import React, { useRef } from 'react';
import { UploadIcon } from '../icons';

interface UploadViewProps {
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
}

export const UploadView: React.FC<UploadViewProps> = ({ onFileChange, isLoading, loadingMessage, error }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (isLoading) {
        return (
           <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-400">
               <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-lg">{loadingMessage || 'جارٍ التحميل...'}</p>
           </div>
       );
   }

    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <UploadIcon className="h-16 w-16 mb-4 text-slate-500"/>
            <h3 className="text-xl font-semibold text-slate-300">قم بتحميل ملف (.txt, .pdf, .docx, .mp4, .mp3, .wav)</h3>
            <p className="text-slate-400 mt-2">للتحدث معه، تلخيصه، أو تحويله إلى بودكاست.</p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept=".txt,.md,.text,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*,audio/*"
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
};
