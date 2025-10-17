import React, { useState } from 'react';
import type { GeneratedImage } from '../types';
import { SparklesIcon, DocumentMagnifyingGlassIcon, DownloadIcon, XCircleIcon } from './icons';
import { describeImage } from '../services/geminiService';

interface ImageResultDisplayProps {
  images: GeneratedImage[];
  isLoading: boolean;
  query: string;
}

const ImageSkeleton: React.FC = () => (
    <div className="aspect-[16/9] bg-slate-700/50 rounded-lg animate-pulse"></div>
);

export const ImageResultDisplay: React.FC<ImageResultDisplayProps> = ({ images, isLoading, query }) => {
    const [detailedDescriptions, setDetailedDescriptions] = useState<Record<number, string | null>>({});
    const [isDescribing, setIsDescribing] = useState<Record<number, boolean>>({});
    const [descriptionError, setDescriptionError] = useState<Record<number, string | null>>({});

    const handleDescribe = async (index: number, imageBytes: string) => {
        setIsDescribing(prev => ({ ...prev, [index]: true }));
        setDescriptionError(prev => ({...prev, [index]: null}));
        setDetailedDescriptions(prev => ({...prev, [index]: null}));

        try {
            const description = await describeImage(imageBytes);
            setDetailedDescriptions(prev => ({ ...prev, [index]: description }));
        } catch (err) {
            const message = err instanceof Error ? err.message : "فشل في وصف الصورة.";
            setDescriptionError(prev => ({ ...prev, [index]: message }));
        } finally {
            setIsDescribing(prev => ({ ...prev, [index]: false }));
        }
    };
    
    const handleDownload = (imageBytes: string, altText: string) => {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${imageBytes}`;
        const safeAltText = altText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeAltText.slice(0, 50)}.jpeg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="w-full">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">صور مولّدة لـ: "{query}"</h2>
            </div>
            {isLoading && (
                 <div role="status" aria-live="polite" className="sr-only">
                    جاري توليد صور لـ {query}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <ImageSkeleton key={i} />)
                ) : (
                    images.map((img, index) => (
                        <div key={index} className="rounded-lg shadow-lg group relative bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col">
                            <figure>
                                <img 
                                    src={`data:image/jpeg;base64,${img.imageBytes}`} 
                                    alt={img.altText} 
                                    className="w-full h-full object-cover rounded-t-lg"
                                />
                                <figcaption className="sr-only">{img.altText}</figcaption>
                            </figure>
                            
                            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3">
                                <button
                                    onClick={() => handleDownload(img.imageBytes, img.altText)}
                                    className="flex items-center gap-2 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"
                                    title="تحميل الصورة"
                                >
                                   <DownloadIcon className="h-5 w-5" />
                                   تحميل
                                </button>
                                <button
                                    onClick={() => handleDescribe(index, img.imageBytes)}
                                    disabled={isDescribing[index]}
                                    aria-busy={isDescribing[index]}
                                    aria-controls={`description-${index}`}
                                    aria-expanded={!!detailedDescriptions[index]}
                                    className="flex items-center gap-2 text-sm bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                                    title="وصف تفصيلي للصورة"
                                >
                                    <DocumentMagnifyingGlassIcon className="h-5 w-5" />
                                    {isDescribing[index] ? 'جارٍ الوصف...' : 'وصف تفصيلي'}
                                </button>
                            </div>
                            
                            <div id={`description-${index}`} aria-live="polite">
                                {isDescribing[index] && <div className="p-3 text-center text-sm text-slate-500">جاري تحليل ووصف الصورة...</div>}
                                {descriptionError[index] && <div className="p-3 text-center text-sm text-red-400 bg-red-900/50">{descriptionError[index]}</div>}
                                {detailedDescriptions[index] && (
                                     <div className="p-4 bg-slate-200 dark:bg-slate-900/70 border-t border-slate-300 dark:border-slate-700 relative">
                                        <button onClick={() => setDetailedDescriptions(prev => ({...prev, [index]: null}))} className="absolute top-2 left-2 text-slate-500 hover:text-slate-200" title="إغلاق الوصف">
                                            <XCircleIcon className="h-5 w-5" />
                                        </button>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{detailedDescriptions[index]}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                 {!isLoading && images.length === 0 && (
                    <div className="md:col-span-2 text-center py-12 text-slate-400 dark:text-slate-500">
                        <p>لم يتم إنشاء أي صور. حاول مرة أخرى أو قم بتغيير وصفك.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};
