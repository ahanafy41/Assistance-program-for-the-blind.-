import React from 'react';
import type { Source } from '../types';
import { LinkIcon } from './icons';

interface SourceTickerProps {
  sources: Source[];
  isLoading: boolean;
}

export const SourceTicker: React.FC<SourceTickerProps> = ({ sources, isLoading }) => {
    const hasSources = sources && sources.length > 0;

    return (
        <div className="w-full overflow-hidden bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 relative non-printable">
            <div className="flex items-center absolute right-3 top-3 bottom-3 bg-slate-100 dark:bg-slate-800 pl-3 z-10">
                <LinkIcon className="h-5 w-5 text-cyan-500 dark:text-cyan-400 ml-2" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">المصادر:</span>
            </div>
            
            <div className="w-full overflow-hidden mr-28">
                {isLoading && !hasSources && (
                    <div className="text-slate-500 italic">جاري البحث عن مصادر...</div>
                )}
                {!isLoading && !hasSources && (
                     <div className="text-slate-500 italic">لم يتم العثور على مصادر لهذا البحث.</div>
                )}
                {hasSources && (
                    <div className="flex animate-scroll hover:[animation-play-state:paused]">
                        {sources.concat(sources).map((source, index) => (
                            <a
                                key={index}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors duration-200 px-4 py-1 rounded-md whitespace-nowrap"
                            >
                                {source.title}
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
                @keyframes scroll {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 40s linear infinite;
                }
            `}</style>
        </div>
    );
};
