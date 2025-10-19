import React from 'react';
import type { PodcastDuration, ResultTone } from '../../types';

// Constants can be shared or redefined here. For simplicity, redefined.
const MALE_PODCAST_VOICES = [
    { id: 'Puck', name: 'صوت ذكوري 1' },
    { id: 'Charon', name: 'صوت ذكوري 2' },
    { id: 'Fenrir', name: 'صوت ذكوري 3' },
];

const FEMALE_PODCAST_VOICES = [
    { id: 'Kore', name: 'صوت أنثوي 1' },
    { id: 'Zephyr', name: 'صوت أنثوي 2' },
];

const PODCAST_TONES: {id: ResultTone, name: string}[] = [
    { id: 'casual', name: 'ودي وغير رسمي' },
    { id: 'professional', name: 'احترافي ورسمي' },
    { id: 'academic', name: 'أكاديمي' },
    { id: 'simple', name: 'بسيط ومباشر' },
];

const PODCAST_DIALECTS = [
    { id: 'Egyptian', name: 'اللهجة المصرية' },
    { id: 'Saudi', name: 'اللهجة السعودية' },
    { id: 'Standard Arabic', name: 'العربية الفصحى' },
];

const PODCAST_DURATIONS: { id: PodcastDuration; label: string }[] = [
    { id: 'short', label: 'قصير (~1 دق)' },
    { id: 'medium', label: 'متوسط (~3 دق)' },
    { id: 'long', label: 'طويل (~5 دق)' },
    { id: 'very-long', label: 'طويل جداً (~10 دق)' },
    { id: 'epic', label: 'ملحمي (~15 دق)' },
];

interface PodcastPanelProps {
    duration: PodcastDuration;
    setDuration: (d: PodcastDuration) => void;
    tone: ResultTone;
    setTone: (t: ResultTone) => void;
    dialect: string;
    setDialect: (d: string) => void;
    maleVoice: string;
    setMaleVoice: (v: string) => void;
    femaleVoice: string;
    setFemaleVoice: (v: string) => void;
    isGenerating: boolean;
    generationStatus: string;
    audioUrl: string | null;
    error: string | null;
    onGenerate: () => void;
    fileName: string;
    hasContent: boolean;
}


export const PodcastPanel: React.FC<PodcastPanelProps> = ({
    duration, setDuration, tone, setTone, dialect, setDialect, maleVoice, setMaleVoice, femaleVoice, setFemaleVoice,
    isGenerating, generationStatus, audioUrl, error, onGenerate, fileName, hasContent
}) => {
    return (
        <div className="flex flex-col h-full space-y-4 overflow-y-auto p-1">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">مدة البودكاست:</label>
                <div className="flex gap-2 flex-wrap">
                    {PODCAST_DURATIONS.map(d => (
                        <button key={d.id} onClick={() => setDuration(d.id)} disabled={isGenerating}
                            className={`px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${duration === d.id ? 'bg-cyan-500 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="pmale-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيع:</label>
                    <select id="pmale-voice" value={maleVoice} onChange={e => setMaleVoice(e.target.value)} disabled={isGenerating} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {MALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="pfemale-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيعة:</label>
                    <select id="pfemale-voice" value={femaleVoice} onChange={e => setFemaleVoice(e.target.value)} disabled={isGenerating} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {FEMALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="ppodcast-tone" className="block text-sm font-medium text-slate-300 mb-1">نبرة الحديث:</label>
                    <select id="ppodcast-tone" value={tone} onChange={e => setTone(e.target.value as ResultTone)} disabled={isGenerating} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {PODCAST_TONES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="ppodcast-dialect" className="block text-sm font-medium text-slate-300 mb-1">اللهجة:</label>
                    <select id="ppodcast-dialect" value={dialect} onChange={e => setDialect(e.target.value)} disabled={isGenerating} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                        {PODCAST_DIALECTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>
            
            <button onClick={onGenerate} disabled={isGenerating || !hasContent}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-wait flex items-center justify-center gap-2">
                {isGenerating ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{generationStatus || 'جارٍ الإنشاء...'}</span>
                    </>
                ) : 'إنشاء بودكاست من النص'}
            </button>

            {error && <p className="text-sm text-center text-red-400 bg-red-500/10 p-2 rounded-md">{error}</p>}
            
            {audioUrl && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-base font-semibold">النتيجة النهائية:</h4>
                    <audio controls src={audioUrl} className="w-full"></audio>
                    <a href={audioUrl} download={`${fileName}-podcast.wav`} className="block text-center text-sm text-cyan-400 hover:underline">
                        تحميل البودكاست (WAV)
                    </a>
                </div>
            )}
        </div>
    );
};