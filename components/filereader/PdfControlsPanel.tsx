import React from 'react';
import { BookOpenIcon } from '../icons';

interface PdfControlsPanelProps {
    fileName: string;
    pageCount: number;
    startPage: number;
    setStartPage: (p: number) => void;
    endPage: number;
    setEndPage: (p: number) => void;
    onOpenReader: () => void;
    onReset: () => void;
}

export const PdfControlsPanel: React.FC<PdfControlsPanelProps> = ({
    fileName, pageCount, startPage, setStartPage, endPage, setEndPage, onOpenReader, onReset
}) => {
    return (
        <div className="flex flex-col bg-slate-900/30 p-4 rounded-lg min-h-0 h-full space-y-4">
             <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
                التحكم بملف PDF
            </h3>
            <div className="bg-slate-800/50 p-3 rounded-md">
                <p className="text-sm text-slate-400">الملف الحالي:</p>
                <p className="font-semibold text-slate-200 break-all">{fileName}</p>
                <p className="text-sm text-slate-300 mt-1">إجمالي الصفحات: {pageCount}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    نطاق الصفحات للمحادثة
                </label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={startPage}
                        min={1}
                        max={pageCount}
                        onChange={e => setStartPage(Math.max(1, Math.min(endPage, Number(e.target.value))))}
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-center"
                        aria-label="صفحة البداية"
                    />
                    <span className="text-slate-400">إلى</span>
                    <input 
                        type="number" 
                        value={endPage}
                        min={startPage}
                        max={pageCount}
                        onChange={e => setEndPage(Math.max(startPage, Math.min(pageCount, Number(e.target.value))))}
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-center"
                        aria-label="صفحة النهاية"
                    />
                </div>
            </div>

            <button 
                onClick={onOpenReader}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
            >
                <BookOpenIcon className="h-5 w-5" />
                عرض الصفحات المحددة
            </button>

            <div className="flex-grow"></div>

            <button onClick={onReset} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                تحميل ملف آخر
            </button>
        </div>
    );
};