import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { LogoIcon, KeyIcon } from './components/icons';
import type { SearchMode } from './types';
import { SearchModeToggle } from './components/SearchModeToggle';
import { FileReaderUI } from './components/FileReaderUI';
import { PodcastCreatorUI } from './components/PodcastCreatorUI';
import { VideoCreatorUI } from './components/VideoCreatorUI';
import { ApiKeyModal } from './components/ApiKeyModal';
import { MainSearchMode } from './components/modes/MainSearchMode';
import { LiveConversationMode } from './components/modes/LiveConversationMode';

const MAX_HISTORY_LENGTH = 10;
const WELCOME_QUERIES = [
    "ما هي آخر تطورات الذكاء الاصطناعي؟",
    "ملخص لأهم الأخبار الاقتصادية في مصر هذا الأسبوع.",
    "صورة لقط يرتدي نظارة شمسية على الشاطئ",
    "أفضل الأماكن السياحية في الأقصر وأسوان.",
    "ما هي توقعات الطقس غداً في القاهرة؟"
];

const App: React.FC = () => {
  // Global App State
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('gemini_api_key'));
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [searchMode, setSearchMode] = useState<SearchMode>(() => (localStorage.getItem('searchMode') as SearchMode) || 'web');
  const [history, setHistory] = useState<string[]>([]);
  
  // Welcome animation state
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');

  // Effect for API Key check
  useEffect(() => {
    if (!apiKey) {
        setIsApiKeyModalOpen(true);
    }
  }, [apiKey]);
  
  // Effect for welcome placeholder animation
  useEffect(() => {
      let queryIndex = 0, charIndex = 0;
      let timeoutId: ReturnType<typeof setTimeout>;
      const type = () => {
          const currentPhrase = WELCOME_QUERIES[queryIndex];
          if (charIndex < currentPhrase.length) {
              setAnimatedPlaceholder(currentPhrase.substring(0, charIndex + 1));
              charIndex++;
              timeoutId = setTimeout(type, 100);
          } else {
              timeoutId = setTimeout(erase, 2000);
          }
      };
      const erase = () => {
          if (charIndex > 0) {
              setAnimatedPlaceholder(WELCOME_QUERIES[queryIndex].substring(0, charIndex - 1));
              charIndex--;
              timeoutId = setTimeout(erase, 50);
          } else {
              queryIndex = (queryIndex + 1) % WELCOME_QUERIES.length;
              timeoutId = setTimeout(type, 500);
          }
      };
      type();
      return () => clearTimeout(timeoutId);
  }, []);
  
  // Effect for theme management
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    document.body.className = theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800';
  }, [theme]);

  // Effect for persisting search mode
  useEffect(() => {
    localStorage.setItem('searchMode', searchMode);
  }, [searchMode]);

  // Effect for loading search history from localStorage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) { console.error("Failed to load history", e); }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsApiKeyModalOpen(false);
  };

  const updateHistory = useCallback((newQuery: string) => {
    setHistory(prevHistory => {
        const updatedHistory = [newQuery, ...prevHistory.filter(h => h !== newQuery)].slice(0, MAX_HISTORY_LENGTH);
        localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
    });
  }, []);
  
  const renderContent = () => {
    switch (searchMode) {
        case 'live':
            return <LiveConversationMode />;
        case 'reader':
            return <FileReaderUI />;
        case 'podcast':
            return <PodcastCreatorUI />;
        case 'video':
            return <VideoCreatorUI />;
        default:
            return (
                <MainSearchMode 
                    searchMode={searchMode}
                    history={history}
                    updateHistory={updateHistory}
                    animatedPlaceholder={animatedPlaceholder}
                />
            );
    }
  };

  return (
    <>
      {isApiKeyModalOpen && (
        <ApiKeyModal 
            onSave={handleSaveApiKey} 
            initialKey={apiKey || ''}
            isDismissible={!!apiKey}
            onClose={() => setIsApiKeyModalOpen(false)}
        />
      )}
      <div className={`min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-all duration-300 non-printable ${isApiKeyModalOpen && !apiKey ? 'blur-sm pointer-events-none' : ''}`}>
        <main className="w-full max-w-4xl mx-auto flex flex-col flex-grow">
          <header className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <LogoIcon className="h-10 w-10 text-cyan-400" />
              <h1 className="text-2xl sm:text-4xl font-bold text-center bg-gradient-to-r from-cyan-400 to-teal-400 text-transparent bg-clip-text">
                بحث النبض المباشر
              </h1>
            </div>
            <div className="flex items-center gap-2">
                <ThemeToggle theme={theme} setTheme={setTheme} />
                <button
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                    title="تغيير مفتاح API"
                >
                    <KeyIcon className="h-6 w-6" />
                </button>
            </div>
          </header>
          
          <SearchModeToggle mode={searchMode} setMode={setSearchMode} />

          {renderContent()}

        </main>
        <footer className="text-center text-slate-500 text-sm mt-8 py-4">
            مدعوم بواسطة Gemini & Imagen API.
        </footer>
      </div>
    </>
  );
};

export default App;