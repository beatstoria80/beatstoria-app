
import React, { useState, useRef, useEffect } from 'react';
import {
    X, Zap, Film, Play, Plus, Download, Loader2, Sparkles,
    Monitor, Smartphone, Maximize, Trash2, Layers, Clock,
    ArrowRight, Video, Image as ImageIcon, Wand2, RefreshCw,
    ChevronRight, Layout, History, Gauge, Cpu, Box, Camera,
    ShieldCheck, ExternalLink, Key, PlusCircle, FastForward,
    Sliders, Archive, CheckCircle2, ChevronLeft, Save, FileText,
    Clapperboard, Send, Terminal, Settings2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { prepareImageForAi, generateVideoScript } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

interface VeoCineStudioProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (src: string) => void;
    onStash: (src: string) => void;
    initialImage?: string | null;
}

interface VideoClip {
    id: string;
    prompt: string;
    url?: string;
    status: 'idle' | 'generating' | 'done' | 'error';
    resolution: '720p' | '1080p';
    aspectRatio: '16:9' | '9:16';
    operationData?: any; // Menyimpan data operasi terakhir untuk extension
}

const LOADING_MESSAGES = [
    "Initializing CineEngine Core...",
    "Syncing Neural Anchors...",
    "Synthesizing Temporal Continuity...",
    "Rendering Kinetic Frames (24fps)...",
    "Applying Cinematic Grading...",
    "Finalizing Ultra-HD Export..."
];

export const VeoCineStudio: React.FC<VeoCineStudioProps> = ({ isOpen, onClose, onApply, onStash, initialImage }) => {
    const [clips, setClips] = useState<VideoClip[]>([]);
    const [activeClipId, setActiveClipId] = useState<string | null>(null);
    const [masterStory, setMasterStory] = useState("");
    const [isScripting, setIsScripting] = useState(false);
    const [refImages, setRefImages] = useState<(string | null)[]>([initialImage || null, null, null]);
    const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [hasKey, setHasKey] = useState(false);

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const checkKey = async () => {
            // @ts-ignore - Memeriksa apakah API Key sudah dipilih (Wajib untuk Veo)
            const ok = await window.aistudio.hasSelectedApiKey();
            setHasKey(ok);
        };
        if (isOpen) {
            checkKey();
            if (clips.length === 0) addNewClip();
        }
    }, [isOpen]);

    const handleSelectKey = async () => {
        // @ts-ignore - Membuka dialog pemilihan key
        await window.aistudio.openSelectKey();
        setHasKey(true);
    };

    const addNewClip = () => {
        const newId = `clip-${Date.now()}`;
        const newClip: VideoClip = {
            id: newId,
            prompt: "",
            status: 'idle',
            resolution: '720p',
            aspectRatio: '16:9'
        };
        setClips(prev => [...prev, newClip]);
        setActiveClipId(newId);
    };

    const handleAutoScript = async () => {
        if (!masterStory.trim()) return;
        setIsScripting(true);
        try {
            const script = await generateVideoScript(masterStory, 4);
            const newClips = script.map((s, i) => ({
                id: `clip-${Date.now()}-${i}`,
                prompt: s.prompt,
                status: 'idle' as const,
                resolution: '720p' as const,
                aspectRatio: '16:9' as const
            }));
            setClips(newClips);
            setActiveClipId(newClips[0].id);
        } catch (e) {
            alert("Neural scripting failed. Please check your connection.");
        } finally {
            setIsScripting(false);
        }
    };

    const updateClip = (id: string, updates: Partial<VideoClip>) => {
        setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    // LOGIKA UTAMA: GENERATE VIDEO LEWAT API
    const generateClip = async (clipId: string, extensionMode: boolean = false) => {
        const clip = clips.find(c => c.id === clipId);
        if (!clip || !hasKey) return null;

        updateClip(clipId, { status: 'generating' });

        let msgIdx = 0;
        const msgInterval = setInterval(() => {
            msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
            setLoadingMsg(LOADING_MESSAGES[msgIdx]);
        }, 12000);

        try {
            // Inisialisasi AI dengan Key terbaru
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

            const validRefs = refImages.filter(Boolean);
            const referenceImagesPayload: any[] = [];

            for (const img of validRefs) {
                const prepared = await prepareImageForAi(img!);
                referenceImagesPayload.push({
                    image: { imageBytes: prepared.data, mimeType: prepared.mimeType },
                    referenceType: 'ASSET',
                });
            }

            // 1. Kirim Permintaan Generate ke Model Veo
            let operation;

            if (extensionMode && clip.operationData?.response?.generatedVideos?.[0]?.video) {
                // Mode Extend Video (+7 detik)
                operation = await ai.models.generateVideos({
                    model: 'veo-3.1-generate-preview',
                    prompt: clip.prompt || "continue the action naturally",
                    video: clip.operationData.response.generatedVideos[0].video,
                    config: {
                        numberOfVideos: 1,
                        resolution: '720p',
                        aspectRatio: clip.aspectRatio
                    }
                });
            } else {
                // Mode New Video / Multi-Image Reference
                operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: clip.prompt,
                    config: {
                        numberOfVideos: 1,
                        resolution: clip.resolution,
                        aspectRatio: clip.aspectRatio,
                        // @ts-ignore
                        referenceImages: referenceImagesPayload.length > 0 ? referenceImagesPayload : undefined
                    }
                });
            }

            // 2. Polling Operasi sampai selesai (Long-running task)
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 8000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            // 3. Ambil link download dan Fetch video bytes
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("No video produced by engine");

            const response = await fetch(`${downloadLink}&key=${import.meta.env.VITE_GEMINI_API_KEY}`);
            const blob = await response.blob();
            const videoUrl = URL.createObjectURL(blob);

            updateClip(clipId, {
                status: 'done',
                url: videoUrl,
                operationData: operation // Simpan data untuk kebutuhan extension nanti
            });

            return videoUrl;
        } catch (err: any) {
            console.error("CineEngine Error:", err);
            updateClip(clipId, { status: 'error' });

            if (err.message?.includes("Requested entity was not found")) {
                setHasKey(false);
                alert("API Key Session Expired. Please reconnect to the Engine.");
            } else {
                alert(`Render Failed: ${err.message || "Unknown neural error"}`);
            }
            throw err;
        } finally {
            clearInterval(msgInterval);
        }
    };

    const renderFullFilm = async () => {
        if (isProcessingBatch) return;
        setIsProcessingBatch(true);
        try {
            for (const clip of clips) {
                if (clip.status !== 'done') {
                    await generateClip(clip.id);
                }
            }
        } catch (e) {
            console.error("Batch production halted.");
        } finally {
            setIsProcessingBatch(false);
        }
    };

    const activeClip = clips.find(c => c.id === activeClipId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[6000] bg-black text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-500">

            {/* HEADER: PRODUCTION CONTROLS */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0a0a0a] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Clapperboard size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black uppercase tracking-[0.2em]">CineEngine <span className="text-indigo-500">Pro</span></span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Connected to Veo Neural Grid</span>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-white/10" />

                    {!hasKey ? (
                        <button
                            onClick={handleSelectKey}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-yellow-400 transition-all animate-pulse"
                        >
                            <Key size={12} /> Connect Veo API Key
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <ShieldCheck size={12} className="text-green-500" />
                            <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Engine Handshake Verified</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={renderFullFilm}
                        disabled={isProcessingBatch || clips.length === 0 || !hasKey}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20 disabled:opacity-30 disabled:scale-100"
                    >
                        {isProcessingBatch ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="white" />}
                        Render Story Sequence
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">

                {/* SIDEBAR: DIRECTOR'S CONSOLE */}
                <div className="w-[380px] border-r border-white/10 bg-[#080808] flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">

                        {/* 1. MASTER STORY INPUT */}
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText size={14} className="text-indigo-500" /> Narrative Blueprint
                            </span>
                            <div className="relative">
                                <textarea
                                    value={masterStory}
                                    onChange={(e) => setMasterStory(e.target.value)}
                                    placeholder="Type your film concept here. Gemini will break it into sequential scenes with temporal logic..."
                                    className="w-full h-32 bg-black border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-indigo-500/50 resize-none shadow-inner transition-all"
                                />
                                <button
                                    onClick={handleAutoScript}
                                    disabled={isScripting || !masterStory.trim()}
                                    className="absolute bottom-3 right-3 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg disabled:opacity-30 transition-all active:scale-90"
                                    title="Auto-generate Scene Nodes"
                                >
                                    {isScripting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        {/* 2. PRODUCTION REFS */}
                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers size={14} className="text-blue-500" /> Style Anchors (Consistency)
                            </span>
                            <div className="grid grid-cols-3 gap-3">
                                {refImages.map((img, i) => (
                                    <div
                                        key={i}
                                        onClick={() => fileInputRefs.current[i]?.click()}
                                        className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${img ? 'border-indigo-500/40 bg-black' : 'border-white/5 bg-white/5 hover:border-indigo-500/50'}`}
                                    >
                                        {img ? (
                                            <>
                                                <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                                                <button onClick={(e) => { e.stopPropagation(); const n = [...refImages]; n[i] = null; setRefImages(n); }} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={10} /></button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-100 group-hover:text-indigo-400 transition-all">
                                                <ImageIcon size={18} />
                                                <span className="text-[6px] font-black uppercase">REF {i + 1}</span>
                                            </div>
                                        )}
                                        <input type="file" ref={el => fileInputRefs.current[i] = el} onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const r = new FileReader();
                                                r.onload = (ev) => { if (ev.target?.result) { const n = [...refImages]; n[i] = ev.target.result as string; setRefImages(n); } };
                                                r.readAsDataURL(e.target.files[0]);
                                            }
                                        }} className="hidden" accept="image/*" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-[7px] text-slate-500 uppercase tracking-widest text-center leading-relaxed">Images used to lock character identity and environment.</p>
                        </div>

                        {/* 3. CLIP SETTINGS */}
                        {activeClip && (
                            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                                <div className="h-px bg-white/5" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Settings2 size={14} className="text-orange-500" /> Clip Calibration
                                </span>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-slate-500 uppercase px-1">Scene Directive</label>
                                        <textarea
                                            value={activeClip.prompt}
                                            onChange={(e) => updateClip(activeClip.id, { prompt: e.target.value })}
                                            className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-3 text-xs font-medium text-slate-300 focus:outline-none focus:border-orange-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Ratio</label>
                                            <select
                                                value={activeClip.aspectRatio}
                                                onChange={(e) => updateClip(activeClip.id, { aspectRatio: e.target.value as any })}
                                                className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
                                            >
                                                <option value="16:9">CINEMATIC (16:9)</option>
                                                <option value="9:16">MOBILE (9:16)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-slate-500 uppercase px-1">Quality</label>
                                            <select
                                                value={activeClip.resolution}
                                                onChange={(e) => updateClip(activeClip.id, { resolution: e.target.value as any })}
                                                className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold outline-none focus:border-indigo-500"
                                            >
                                                <option value="720p">720P FAST</option>
                                                <option value="1080p">1080P MASTER</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => generateClip(activeClip.id)}
                                        disabled={isProcessingBatch || activeClip.status === 'generating' || !hasKey}
                                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl disabled:opacity-30"
                                    >
                                        {activeClip.status === 'generating' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="black" />}
                                        Process Single Node
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MAIN PREVIEW AREA */}
                <div className="flex-1 bg-[#050505] flex flex-col relative">
                    <div className="flex-1 flex items-center justify-center p-12">
                        {activeClip?.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700">
                                <div className="relative w-28 h-28">
                                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={36} className="text-indigo-400 animate-pulse" /></div>
                                </div>
                                <div className="text-center space-y-3">
                                    <span className="text-[13px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse block">{loadingMsg}</span>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">ETA: 60-90 Seconds • TPU V5 ACCELERATED</p>
                                </div>
                            </div>
                        ) : activeClip?.url ? (
                            <div className="relative group max-w-5xl w-full animate-in zoom-in-95 duration-500">
                                <div className={`shadow-2xl border border-white/10 rounded-3xl overflow-hidden bg-black ${activeClip.aspectRatio === '9:16' ? 'aspect-[9/16] h-[75vh]' : 'aspect-video'}`}>
                                    <video src={activeClip.url} autoPlay loop muted className="w-full h-full object-contain" />
                                </div>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/60 backdrop-blur-xl p-3 rounded-[1.5rem] border border-white/10 shadow-2xl scale-95 group-hover:scale-100">
                                    <button onClick={() => onStash(activeClip.url!)} className="px-5 py-2.5 bg-white text-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"><Archive size={14} /> Stash Scene</button>
                                    <button
                                        onClick={() => generateClip(activeClip.id, true)}
                                        disabled={isProcessingBatch}
                                        className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 transition-all flex items-center gap-2 disabled:opacity-50"
                                        title="Add 7 seconds to this clip"
                                    >
                                        <FastForward size={14} /> EXTEND +7S
                                    </button>
                                    <button onClick={() => downloadBlob(activeClip.url!, `cine_scene_${Date.now()}.mp4`)} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"><Download size={16} /></button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 opacity-20">
                                <Clapperboard size={64} strokeWidth={1} />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Director's Stage Empty</span>
                            </div>
                        )}
                    </div>

                    {/* TIMELINE UI */}
                    <div className="h-44 bg-[#0a0a0a] border-t border-white/10 flex flex-col shrink-0">
                        <div className="px-8 py-3 border-b border-white/5 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-3 text-slate-500">
                                <History size={14} />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Scene Chronology</span>
                            </div>
                            <button onClick={addNewClip} className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all text-[8px] font-black uppercase tracking-widest border border-white/5 shadow-sm active:scale-95">
                                <Plus size={12} /> Add Scene Node
                            </button>
                        </div>

                        <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center px-8 gap-4 py-4">
                            {clips.map((clip, idx) => (
                                <div key={clip.id} className="flex items-center gap-4 shrink-0">
                                    <div
                                        onClick={() => setActiveClipId(clip.id)}
                                        className={`relative w-48 h-28 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group shadow-2xl ${activeClipId === clip.id ? 'border-indigo-500 scale-105 z-10 shadow-indigo-500/20' : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100'}`}
                                    >
                                        {clip.url ? (
                                            <video src={clip.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 gap-2">
                                                {clip.status === 'generating' ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Play size={16} className="text-slate-700 opacity-30" />}
                                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-600">Scene {idx + 1}</span>
                                            </div>
                                        )}
                                        {activeClipId === clip.id && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-indigo-600 rounded text-[6px] font-black text-white shadow-lg border border-white/20">DIRECTING</div>}
                                        {clip.status === 'error' && <div className="absolute top-2 right-10 px-1.5 py-0.5 bg-red-600 rounded text-[6px] font-black text-white">FAILED</div>}
                                        <button onClick={(e) => { e.stopPropagation(); setClips(p => p.filter(c => c.id !== clip.id)); }} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"><Trash2 size={10} /></button>
                                    </div>
                                    {idx < clips.length - 1 && <ArrowRight size={16} className="text-slate-800 shrink-0" />}
                                </div>
                            ))}
                            <button onClick={addNewClip} className="w-48 h-28 rounded-2xl border-2 border-dashed border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-3 shrink-0 group">
                                <PlusCircle size={24} className="text-slate-800 group-hover:text-indigo-500 transition-all" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-800 group-hover:text-white">Append Scene</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
