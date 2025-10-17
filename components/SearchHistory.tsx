import React from 'react';
import { ClockIcon, TrashIcon } from './icons';

interface SearchHistoryProps {
  history: string[];
  onItemClick: (query: string) => void;
  onClear: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onItemClick, onClear }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-slate-300">سجل البحث</h3>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-sm transition-colors"
          aria-label="مسح سجل البحث"
        >
          <TrashIcon className="h-4 w-4" />
          مسح
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onItemClick(item)}
            className="flex items-center gap-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full text-sm transition-colors"
          >
            <ClockIcon className="h-4 w-4 text-slate-500" />
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};