import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XCircleIcon } from '../icons';

interface ReaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    isLoading: boolean;
    error: string | null;
    pagesContent: string[];
    currentPage: number;
    startPage: number;
    endPage: number;
    onGoToPage: (page: number) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
    isOpen, onClose, fileName, isLoading, error, pagesContent, currentPage, startPage, endPage, onGoToPage
}) => {
    if (!isOpen) return null;
        
    const currentPageIndex = currentPage - startPage;
    const currentPageContent = pagesContent[currentPageIndex] || "هذه الصفحة فارغة أو لا تحتوي على نص يمكن استخراجه.";

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="reader-title">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col h-full">
                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="reader-title" className="text-xl font-bold text-slate-100">
                        عرض المستند: <span className="text-cyan-400">{fileName}</span>
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="إغلاق العرض">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>

                {/* Content */}
                <main className="flex-grow p-6 overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-300">جارٍ استخراج محتوى الصفحات المحددة...</p>
                            <p className="text-sm text-slate-400">(قد تستغرق هذه العملية بعض الوقت للملفات المصورة)</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                            <p><strong>خطأ في تحميل المستند:</strong></p>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && (
                        <pre className="text-slate-200 whitespace-pre-wrap font-sans text-base leading-relaxed">
                            {currentPageContent}
                        </pre>
                    )}
                </main>

                {/* Footer / Pagination */}
                <footer className="flex items-center justify-between p-4 border-t border-slate-700 flex-shrink-0">
                    <button 
                        onClick={() => onGoToPage(currentPage - 1)}
                        disabled={isLoading || currentPage <= startPage}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                        <span>السابقة</span>
                    </button>
                    <div className="text-slate-300 font-medium">
                        صفحة <span className="text-cyan-400">{currentPage}</span> (من نطاق {startPage}-{endPage})
                    </div>
                    <button 
                        onClick={() => onGoToPage(currentPage + 1)}
                        disabled={isLoading || currentPage >= endPage}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>التالية</span>
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                </footer>
            </div>
        </div>
    );
};