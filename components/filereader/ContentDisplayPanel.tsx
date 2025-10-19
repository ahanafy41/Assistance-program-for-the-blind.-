import React from 'react';

interface ContentDisplayPanelProps {
    fileType: 'text' | 'word' | null;
    displayContent: string;
}

export const ContentDisplayPanel: React.FC<ContentDisplayPanelProps> = ({ fileType, displayContent }) => {
    return (
        <div className="flex flex-col bg-slate-900/30 p-3 rounded-lg min-h-0 h-full">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
                <h3 id="content-heading" className="text-lg font-semibold text-slate-200">
                     محتوى الملف
                </h3>
            </div>

            <div role="document" aria-labelledby="content-heading" className="flex-grow overflow-y-auto pr-2 prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-li:text-slate-300 max-w-none">
                {fileType === 'word' ? (
                    <div dangerouslySetInnerHTML={{ __html: displayContent }} />
                ) : (
                    <p className="whitespace-pre-wrap break-words min-h-[1em]">
                        {displayContent}
                    </p>
                )}
            </div>
        </div>
    );
};