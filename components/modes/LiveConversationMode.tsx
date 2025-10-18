import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SparklesIcon, MicrophoneIcon as MicOnIcon } from '../icons';
import { decode, decodeAudioData, createBlob } from '../../utils/audio';

type TranscriptionTurn = {
    speaker: 'user' | 'model';
    text: string;
    isFinal: boolean;
};

const LiveConversationUI: React.FC<{
    isConnected: boolean,
    isConnecting: boolean,
    transcriptionHistory: TranscriptionTurn[],
    onStart: () => void,
    onStop: () => void,
    error: string | null
}> = ({ isConnected, isConnecting, transcriptionHistory, onStart, onStop, error }) => {
    
    const transcriptionEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptionHistory]);

    const getStatus = () => {
        if (isConnecting) return { text: "جارٍ الاتصال...", color: "text-yellow-400" };
        if (isConnected) return { text: "متصل. ابدأ الحديث...", color: "text-green-400" };
        if (error) return { text: "انقطع الاتصال", color: "text-red-400" };
        return { text: "اضغط لبدء المحادثة المباشرة", color: "text-slate-400" };
    }

    const status = getStatus();

    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3 mb-4">
                <SparklesIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">محادثة مباشرة</h2>
            </div>

            <div className={`text-center mb-4 text-sm ${status.color}`}>{status.text}</div>
            
            {error && <div className="text-center mb-4 text-sm text-red-400 bg-red-900/50 p-2 rounded">{error}</div>}

            <div className="flex-grow overflow-y-auto mb-4 p-2 space-y-4 bg-slate-900/50 rounded-lg">
                {transcriptionHistory.map((turn, index) => (
                    <div key={index} className={`flex items-end gap-2 ${turn.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl ${turn.speaker === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{turn.text}{!turn.isFinal && <span className="inline-block w-2 h-4 bg-current animate-pulse ms-1" />}</p>
                        </div>
                    </div>
                ))}
                 <div ref={transcriptionEndRef} />
            </div>
            
            <div className="flex justify-center items-center">
                <button
                    onClick={isConnected || isConnecting ? onStop : onStart}
                    disabled={isConnecting}
                    className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-800
                        ${isConnecting ? 'bg-yellow-500 cursor-wait' : ''}
                        ${isConnected ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}
                        ${!isConnected && !isConnecting ? 'bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-500' : ''}
                    `}
                    aria-label={isConnected ? 'إيقاف المحادثة' : 'بدء المحادثة'}
                >
                    <MicOnIcon className="h-9 w-9 text-white" />
                    {isConnected && <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping"></div>}
                </button>
            </div>
        </div>
    );
};


export const LiveConversationMode: React.FC = () => {
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    
    const [isLiveConnecting, setIsLiveConnecting] = useState(false);
    const [isLiveConnected, setIsLiveConnected] = useState(false);
    const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionTurn[]>([]);
    const [error, setError] = useState<string | null>(null);

    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const handleStopLiveSession = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        liveStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);
        outputSourcesRef.current.forEach(s => s.stop());

        sessionPromiseRef.current = null;
        liveStreamRef.current = null;
        scriptProcessorRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        outputSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
        
        setIsLiveConnected(false);
        setIsLiveConnecting(false);
    }, []);

    const handleStartLiveSession = async () => {
        setIsLiveConnecting(true);
        setTranscriptionHistory([]);
        setError(null);
        
        try {
            const currentApiKey = localStorage.getItem('gemini_api_key');
            if (!currentApiKey) {
                throw new Error("مفتاح API غير موجود. الرجاء إعداده أولاً.");
            }
            const ai = new GoogleGenAI({ apiKey: currentApiKey });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            liveStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputAudioContextRef.current = inputAudioContext;
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputAudioContextRef.current = outputAudioContext;
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                onopen: () => {
                    console.debug('Live session opened');
                    setIsLiveConnecting(false);
                    setIsLiveConnected(true);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    sessionPromiseRef.current?.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentInputTranscriptionRef.current += text;
                        setTranscriptionHistory(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.speaker === 'user' && !last.isFinal) {
                                return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                            }
                            return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: false }];
                        });
                    }
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        currentOutputTranscriptionRef.current += text;
                        setTranscriptionHistory(prev => {
                            const last = prev[prev.length - 1];
                            if (last?.speaker === 'model' && !last.isFinal) {
                                return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                            }
                            return [...prev, { speaker: 'model', text: currentOutputTranscriptionRef.current, isFinal: false }];
                        });
                    }
                    if (message.serverContent?.turnComplete) {
                        setTranscriptionHistory(prev => prev.map(turn => ({...turn, isFinal: true})));
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContext) {
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                    const audioSource = outputAudioContext.createBufferSource();
                    audioSource.buffer = audioBuffer;
                    audioSource.connect(outputAudioContext.destination);
                    audioSource.addEventListener('ended', () => outputSourcesRef.current.delete(audioSource));
                    audioSource.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    outputSourcesRef.current.add(audioSource);
                    }

                    if (message.serverContent?.interrupted) {
                        for (const source of outputSourcesRef.current.values()) {
                            source.stop();
                            outputSourcesRef.current.delete(source);
                        }
                        nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setError(`حدث خطأ في الاتصال المباشر: ${e.message}`);
                    handleStopLiveSession();
                },
                onclose: (e: CloseEvent) => {
                    console.debug('Live session closed');
                    handleStopLiveSession();
                },
                },
                config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: 'You are a friendly and helpful assistant. Keep your answers concise and conversational. Respond in Arabic.',
                },
            });

        } catch (err) {
            const message = err instanceof Error ? err.message : "فشل في بدء المحادثة.";
            console.error("Failed to start live session:", err);
            setError(`فشل في الوصول إلى الميكروفون. يرجى التحقق من الأذونات والمحاولة مرة أخرى. (${message})`);
            setIsLiveConnecting(false);
        }
    };

    useEffect(() => {
        return () => {
            if (isLiveConnected) {
                handleStopLiveSession();
            }
        };
    }, [isLiveConnected, handleStopLiveSession]);

    return (
        <LiveConversationUI
            isConnected={isLiveConnected}
            isConnecting={isLiveConnecting}
            transcriptionHistory={transcriptionHistory}
            onStart={handleStartLiveSession}
            onStop={handleStopLiveSession}
            error={error}
        />
    );
};
