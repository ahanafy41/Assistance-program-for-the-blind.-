import React, { useState } from 'react';
import { PodcastIcon, SparklesIcon } from './icons';
import { generatePodcastScript, generateMultiSpeakerSpeech } from '../services/geminiService';
import type { PodcastDuration, ResultTone, PodcastScriptLine } from '../types';
import { decode, createWavBlob } from '../utils/audio';

// Copied from ResultDisplay.tsx for consistency
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

export const PodcastCreatorUI: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState<PodcastDuration>('short');
    const [tone, setTone] = useState<ResultTone>('casual');
    const [dialect, setDialect] = useState<string>('Egyptian');
    const [maleVoice, setMaleVoice] = useState<string>('Puck');
    const [femaleVoice, setFemaleVoice] = useState<string>('Kore');
    
    const [script, setScript] = useState<PodcastScriptLine[] | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);
        setScript(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            setStatus("الخطوة 1/2: جارٍ كتابة نص البودكاست...");
            const generatedScript = await generatePodcastScript(topic, duration, tone, dialect);
            setScript(generatedScript);

            setStatus("الخطوة 2/2: جارٍ توليد الأصوات...");
            const base64Audio = await generateMultiSpeakerSpeech(generatedScript, maleVoice, femaleVoice);
            
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData, 24000, 1);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (err) {
            const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
            setError(message);
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };

    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <PodcastIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">صانع البودكاست</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-y-auto">
                {/* Left Panel: Controls */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="topic" className="block text-lg font-semibold text-slate-200 mb-2">موضوع البودكاست</label>
                        <textarea
                            id="topic"
                            rows={4}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="اكتب هنا عن ماذا تريد أن يكون البودكاست. مثال: تاريخ القهوة، أهمية الذكاء الاصطناعي..."
                            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t border-slate-700">
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">مدة البودكاست:</label>
                            <div className="flex gap-2 flex-wrap">
                                {PODCAST_DURATIONS.map(d => (
                                    <button key={d.id} onClick={() => setDuration(d.id)} disabled={isLoading}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${duration === d.id ? 'bg-cyan-500 text-white font-semibold' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="male-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيع:</label>
                                <select id="male-voice" value={maleVoice} onChange={e => setMaleVoice(e.target.value)} disabled={isLoading} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                                    {MALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="female-voice" className="block text-sm font-medium text-slate-300 mb-1">صوت المذيعة:</label>
                                <select id="female-voice" value={femaleVoice} onChange={e => setFemaleVoice(e.target.value)} disabled={isLoading} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                                    {FEMALE_PODCAST_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="podcast-tone" className="block text-sm font-medium text-slate-300 mb-1">نبرة الحديث:</label>
                                <select id="podcast-tone" value={tone} onChange={e => setTone(e.target.value as ResultTone)} disabled={isLoading} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                                    {PODCAST_TONES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="podcast-dialect" className="block text-sm font-medium text-slate-300 mb-1">اللهجة:</label>
                                <select id="podcast-dialect" value={dialect} onChange={e => setDialect(e.target.value)} disabled={isLoading} className="w-full text-sm p-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50">
                                    {PODCAST_DIALECTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleGenerate} disabled={isLoading || !topic.trim()}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>{status || 'جارٍ الإنشاء...'}</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="h-6 w-6" />
                                <span>أنشئ البودكاست</span>
                            </>
                        )}
                    </button>
                    {error && <div className="text-center text-red-400 bg-red-900/50 p-2 rounded">{error}</div>}
                </div>

                {/* Right Panel: Results */}
                <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-200">النتيجة</h3>
                    {audioUrl && (
                        <div className="space-y-2">
                            <audio controls src={audioUrl} className="w-full"></audio>
                            <a href={audioUrl} download="live-pulse-podcast.wav" className="block text-center text-sm text-cyan-400 hover:underline">
                                تحميل البودكاست (WAV)
                            </a>
                        </div>
                    )}
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                        {isLoading && !script && <p className="text-slate-400 text-center py-8">{status || 'اختر الإعدادات واضغط على زر الإنشاء...'}</p>}
                        {!isLoading && !script && !error && <p className="text-slate-500 text-center py-8">سيظهر نص البودكاست هنا بعد إنشائه.</p>}
                        {script && script.map((line, index) => (
                             <div key={index} className="flex flex-col">
                                <span className={`font-bold text-sm ${line.speaker === 'Joe' ? 'text-cyan-400' : 'text-teal-300'}`}>{line.speaker === 'Joe' ? 'المذيع (جو)' : 'المذيعة (جين)'}</span>
                                <p className="text-slate-200">{line.line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};