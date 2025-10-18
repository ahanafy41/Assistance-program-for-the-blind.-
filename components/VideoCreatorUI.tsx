import React, { useState } from 'react';
import { FilmIcon, SparklesIcon, DownloadIcon, BookOpenIcon } from './icons';
import { searchWithGemini, summarizeTextForNewsScript, generateImages, describeImage, generateSpeech } from '../services/geminiService';
import type { SearchFilters } from '../types';
import { decode, decodeAudioData } from '../utils/audio';

interface Scene {
    sentence: string;
    description: string;
    base64Image: string;
    duration: number;
}


export const VideoCreatorUI: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState(30);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [accessibilityLog, setAccessibilityLog] = useState<Scene[]>([]);
    const [showLog, setShowLog] = useState(true);

    const getButtonText = () => {
        if (isLoading) {
            return status || 'جارٍ الإنشاء...';
        }
        return 'أنشئ الفيديو';
    };

    const assembleVideoWithBrowserAPI = async (scenes: Scene[], audioData: Uint8Array): Promise<string> => {
        setStatus('الخطوة 6: تجميع الفيديو النهائي (قد تستغرق هذه العملية بعض الوقت)...');

        const WIDTH = 1280;
        const HEIGHT = 720;
    
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
    
        const audioCtx = new AudioContext({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(audioData, audioCtx, 24000, 1);
        const audioSource = audioCtx.createBufferSource();
        audioSource.buffer = audioBuffer;
        const audioDestination = audioCtx.createMediaStreamDestination();
        audioSource.connect(audioDestination);
        const audioStream = audioDestination.stream;
        const totalAudioDuration = audioBuffer.duration;
    
        const videoStream = canvas.captureStream(30); // 30 FPS
    
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
        ]);

        const mimeType = 'video/webm; codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
             throw new Error("متصفحك لا يدعم ترميز الفيديو المطلوب (WebM with VP9/Opus).");
        }
        const recorder = new MediaRecorder(combinedStream, { mimeType });
        const recordedChunks: Blob[] = [];
    
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
    
        const recordingPromise = new Promise<string>((resolve, reject) => {
            recorder.onstop = () => {
                try {
                    const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(videoBlob);
                    audioCtx.close();
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            };
            recorder.onerror = (event) => {
                reject((event as any).error || new Error('MediaRecorder error'));
            };
        });
    
        audioSource.start(0);
        recorder.start();
    
        let elapsedTime = 0;
        for (const scene of scenes) {
            setTimeout(() => {
                const img = new Image();
                img.onload = () => {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, WIDTH, HEIGHT);
                    const scale = Math.min(WIDTH / img.width, HEIGHT / img.height);
                    const x = (WIDTH - img.width * scale) / 2;
                    const y = (HEIGHT - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                };
                img.src = `data:image/jpeg;base64,${scene.base64Image}`;
            }, elapsedTime * 1000);
            elapsedTime += scene.duration;
        }
    
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, totalAudioDuration * 1000 + 500); // Add a small buffer
    
        return recordingPromise;
    };


    const handleGenerate = async () => {
        if (!topic.trim() || isLoading) return;
        
        setIsLoading(true);
        setError(null);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setAccessibilityLog([]);
        
        try {
            // 1. Search for news
            setStatus('الخطوة 1: البحث عن آخر الأخبار...');
            const searchStream = await searchWithGemini(topic, { summaryLength: 'detailed' } as SearchFilters);
            let newsText = '';
            for await (const chunk of searchStream) {
                newsText += chunk.text;
            }
            if (!newsText.trim()) throw new Error("لم يتم العثور على معلومات كافية حول هذا الموضوع.");

            // 2. Create script
            setStatus('الخطوة 2: كتابة السيناريو الإخباري...');
            const script = await summarizeTextForNewsScript(newsText, duration);
            const sentences = script.split(/(?<=[.?!؟])\s+/).filter(s => s.trim());
            if (sentences.length === 0) throw new Error("فشل في إنشاء سيناريو من المعلومات.");

            // 3. Generate audio & get its duration
            setStatus('الخطوة 3: توليد السرد الصوتي...');
            const base64Audio = await generateSpeech(script, 'Zephyr'); // Newscaster-like voice
            const audioData = decode(base64Audio);

            const tempAudioCtx = new AudioContext({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(audioData, tempAudioCtx, 24000, 1);
            const totalAudioDuration = audioBuffer.duration;
            await tempAudioCtx.close();
            
            // 4. Generate images and descriptions for each sentence
            const scenes: Scene[] = [];
            for (let i = 0; i < sentences.length; i++) {
                const sentence = sentences[i];
                setStatus(`الخطوة 4 (${i + 1}/${sentences.length}): إنشاء صورة للمشهد...`);
                
                const imageResult = await generateImages(`Dramatic, cinematic news report style image for: ${sentence}`, 1);
                if (!imageResult || imageResult.length === 0) throw new Error(`فشل في توليد صورة للمشهد ${i+1}.`);
                const base64Image = imageResult[0].imageBytes;
                
                setStatus(`الخطوة 5 (${i + 1}/${sentences.length}): كتابة وصف للصورة...`);
                const description = await describeImage(base64Image);
                
                const sentenceDuration = (sentence.length / script.length) * totalAudioDuration;

                const newScene = { sentence, description, base64Image, duration: sentenceDuration };
                scenes.push(newScene);
                setAccessibilityLog(prev => [...prev, newScene]);
            }
            
            // 5. Assemble video using browser APIs
            const finalVideoUrl = await assembleVideoWithBrowserAPI(scenes, audioData);
            setVideoUrl(finalVideoUrl);

        } catch (err) {
            const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
            setError(`فشل الإنشاء: ${message}`);
            console.error(err);
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };
    
    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <FilmIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">صانع الفيديو الإخباري</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-y-auto">
                {/* Left Panel: Controls */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="topic" className="block text-lg font-semibold text-slate-200 mb-2">موضوع الخبر</label>
                        <textarea
                            id="topic"
                            rows={4}
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="اكتب هنا موضوع الخبر الذي تريد إنشاء فيديو عنه..."
                            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-slate-300 mb-2">المدة التقريبية للفيديو: {duration} ثانية</label>
                        <input
                            type="range"
                            id="duration"
                            min="20"
                            max="60"
                            step="10"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="pt-2">
                        <button onClick={handleGenerate} disabled={isLoading || !topic.trim()}
                            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <SparklesIcon className="h-6 w-6" />
                            )}
                            <span>{getButtonText()}</span>
                        </button>
                    </div>
                </div>

                {/* Right Panel: Results */}
                <div className="space-y-4 bg-slate-900/50 rounded-lg p-4 h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-200">النتيجة</h3>
                    {error && <div className="text-center text-red-400 bg-red-900/50 p-2 rounded">{error}</div>}
                    
                    {videoUrl && !isLoading && (
                        <div className="space-y-3">
                            <video controls src={videoUrl} className="w-full rounded-lg bg-black"></video>
                            <a href={videoUrl} download={`${topic.slice(0, 20)}.webm`} className="flex items-center justify-center gap-2 w-full text-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 rounded-md transition-colors">
                                <DownloadIcon className="h-5 w-5" />
                                تحميل الفيديو (WEBM)
                            </a>
                        </div>
                    )}

                    {(accessibilityLog.length > 0 || isLoading) && (
                        <div className="flex-grow flex flex-col min-h-0">
                            <button onClick={() => setShowLog(s => !s)} className="w-full flex justify-between items-center text-left p-2 bg-slate-800 rounded-t-lg">
                                <h4 className="font-semibold text-slate-300 flex items-center gap-2">
                                    <BookOpenIcon className="h-5 w-5" />
                                    سجل الوصولية (وصف المشاهد)
                                </h4>
                                <span className="text-cyan-400 text-sm">{showLog ? 'إخفاء' : 'إظهار'}</span>
                            </button>
                            {showLog && (
                                <div className="overflow-y-auto flex-grow bg-slate-800/50 rounded-b-lg p-3 space-y-4">
                                    {accessibilityLog.map((scene, index) => (
                                        <div key={index} className="border-b border-slate-700 pb-3 last:border-b-0">
                                            <p className="text-sm text-slate-300 mb-1"><strong className="text-cyan-400">الكلام المسموع:</strong> "{scene.sentence}"</p>
                                            <p className="text-sm text-slate-400"><strong className="text-teal-300">وصف الصورة:</strong> {scene.description}</p>
                                        </div>
                                    ))}
                                     {isLoading && status && <p className="text-slate-400 text-center py-4">{status}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {!isLoading && !videoUrl && !error && <p className="text-slate-500 text-center py-8 flex-grow flex items-center justify-center">سيظهر الفيديو وسجل الوصولية هنا بعد اكتمال الإنشاء.</p>}
                </div>
            </div>
        </div>
    );
};