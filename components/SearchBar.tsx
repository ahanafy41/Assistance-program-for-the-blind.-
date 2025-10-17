import React, { useState, useEffect } from 'react';
import { SearchIcon, MicrophoneIcon, FilterIcon } from './icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  initialPlaceholder: string;
  onVoiceSearchClick: () => void;
  isListening: boolean;
  onToggleFilters: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading, initialPlaceholder, onVoiceSearchClick, isListening, onToggleFilters }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(value);
  };
  
  useEffect(() => {
    if(!value) { 
        // We don't want to set value here, just use the placeholder
    }
  }, [initialPlaceholder, value]);

  return (
    <form onSubmit={handleSubmit} className="w-full non-printable">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isListening ? "جاري الاستماع..." : initialPlaceholder || "اسأل أي شيء أو صف صورة..."}
          disabled={isLoading || isListening}
          className="w-full p-4 pr-32 pl-32 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full text-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-300 disabled:opacity-50"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
                type="button"
                onClick={onVoiceSearchClick}
                disabled={isLoading}
                title="بحث صوتي"
                className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}
            >
                <MicrophoneIcon className="h-6 w-6" />
            </button>
            <button
                type="button"
                onClick={onToggleFilters}
                disabled={isLoading}
                title="فلاتر البحث المتقدم"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
                <FilterIcon className="h-6 w-6" />
            </button>
        </div>
        <button
          type="submit"
          disabled={isLoading || !value}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-full transition-colors duration-300"
        >
          {isLoading ? 'جارٍ العمل...' : 'ابحث'}
        </button>
      </div>
    </form>
  );
};
