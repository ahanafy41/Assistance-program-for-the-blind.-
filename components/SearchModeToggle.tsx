import React from 'react';

type SearchMode = 'web' | 'image' | 'video' | 'reader' | 'podcast' | 'live';

interface SearchModeToggleProps {
  mode: SearchMode;
  setMode: (mode: SearchMode) => void;
}

export const SearchModeToggle: React.FC<SearchModeToggleProps> = ({ mode, setMode }) => {
  const baseClasses = "px-4 sm:px-6 py-2 rounded-full font-semibold transition-all duration-300 focus:outline-none text-sm sm:text-base";
  const activeClasses = "bg-cyan-500 text-white shadow-md";
  const inactiveClasses = "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600";

  return (
    <div className="flex justify-center my-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-full non-printable flex-wrap gap-1">
      <button
        onClick={() => setMode('web')}
        className={`${baseClasses} ${mode === 'web' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'web'}
        title="التحويل إلى وضع بحث الويب"
      >
        بحث ويب
      </button>
      <button
        onClick={() => setMode('image')}
        className={`${baseClasses} ${mode === 'image' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'image'}
        title="التحويل إلى وضع توليد الصور"
      >
        توليد صور
      </button>
      <button
        onClick={() => setMode('video')}
        className={`${baseClasses} ${mode === 'video' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'video'}
        title="التحويل إلى وضع صانع الفيديو"
      >
        صانع الفيديو
      </button>
       <button
        onClick={() => setMode('reader')}
        className={`${baseClasses} ${mode === 'reader' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'reader'}
        title="التحويل إلى وضع قارئ الملفات"
      >
        قارئ ملفات
      </button>
       <button
        onClick={() => setMode('podcast')}
        className={`${baseClasses} ${mode === 'podcast' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'podcast'}
        title="التحويل إلى وضع صانع البودكاست"
      >
        صانع البودكاست
      </button>
      <button
        onClick={() => setMode('live')}
        className={`${baseClasses} ${mode === 'live' ? activeClasses : inactiveClasses}`}
        aria-pressed={mode === 'live'}
        title="التحويل إلى وضع المحادثة المباشرة"
      >
        محادثة مباشرة
      </button>
    </div>
  );
};