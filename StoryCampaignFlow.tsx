
import React, { useState, useRef, useEffect } from 'react';
import {
    X, Zap, Film, Play, Plus, Download, Loader2, Sparkles,
    Monitor, Smartphone, Maximize, Trash2, Layers, Clock,
    ArrowRight, Video, Image as ImageIcon, Wand2, RefreshCw,
    ChevronRight, Layout, History, Gauge, Cpu, Box, Camera,
    ShieldCheck, ExternalLink, Key, PlusCircle, FastForward,
    Sliders, Archive, CheckCircle2, ChevronLeft, Save, FileText,
    Clapperboard, Send, Terminal, Settings2, List, Grid,
    Compass, Move, ZoomIn, ZoomOut, Globe, Target, BookOpen,
    Link as LinkIcon, Eye, Code, MessageSquare, MonitorPlay,
    ChevronDown, Split, Square, Info, Trello, Flame, Bandage,
    Scissors, Menu, MonitorDown, Check, ArrowLeft, Hash, Minus,
    Bot, RefreshCcw, AlertTriangle, RotateCw, Orbit
} from 'lucide-react';
import { generateNanoImage, generateStoryScenes } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../../types';
import { AssistantPanel } from '../editor/AssistantPanel';

interface StoryCampaignFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (src: string) => void;
    onStash: (src: string) => void;
    initialImage?: string | null;
    onOpenCooking?: () => void;
    onOpenTitanFill?: () => void;
    onOpenPurgeBg?: () => void;
    onOpenRetouch?: () => void;
}

interface SceneNode {
    id: string;
    prompt: string;
    technicalSpec: string;
    showTechSpec: boolean;
    status: 'idle' | 'generating' | 'done' | 'error';
    result?: string;
}

const CINEMATIC_PRESETS = [
    { id: 'anamorphic', label: 'Anamorphic 35mm', prompt: 'Shot on 35mm anamorphic lens, high-end film grain, cinematic anamorphic flares, shallow depth of field, blue-hour lighting.' },
    { id: 'technicolor', label: 'Vintage Technicolor', prompt: 'Vibrant 1950s film look, saturated primaries, soft bloom, high dynamic range, classic Hollywood cinematography.' },
    { id: 'noir', label: 'Dramatic Noir', prompt: 'Deep black and white, high contrast chiaroscuro lighting, heavy shadows, volumetric fog, moody neo-noir atmosphere.' },
    { id: 'imax', label: 'IMAX Digital', prompt: 'Ultra-wide expanded perspective, crystal clear digital clarity, sharp micro-textures, expansive cinematic scale.' },
    { id: 'indie', label: 'Handheld Indie', prompt: 'Natural lighting, slight motion blur, raw documentary style, high ISO texture, authentic cinematic color grading.' }
];

const RATIO_OPTIONS = [
    { label: "CINE 16:9", value: "16:9", icon: <Monitor size={14} /> },
    { label: "MOBILE 9:16", value: "9:16", icon: <Smartphone size={14} /> },
    { label: "SQUARE 1:1", value: "1:1", icon: <Square size={14} /> },
    { label: "SOCIAL 4:5", value: "4:5", icon: <Layout size={14} /> },
];

export const StoryCampaignFlow: React.FC<StoryCampaignFlowProps> = ({
    isOpen, onClose, onApply, onStash, initialImage,
    onOpenCooking, onOpenTitanFill, onOpenPurgeBg, onOpenRetouch
}) => {
    const [identityAnchor, setIdentityAnchor] = useState<string | null>(initialImage || null);

    // ORBITAL CAMERA STATE: Array of 4 images [Right, Back, Left, Top]
    const [orbitalImages, setOrbitalImages] = useState<string[]>([]);
    const [detectedRatio, setDetectedRatio] = useState<string>("1:1");

    const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
    const [gridError, setGridError] = useState<string | null>(null);

    const [storyContext, setStoryContext] = useState("");
    const [sceneCount, setSceneCount] = useState(3);
    const [selectedPreset, setSelectedPreset] = useState('anamorphic');
    const [aspectRatio, setAspectRatio] = useState("16:9");

    const [scenes, setScenes] = useState<SceneNode[]>([
        { id: 'scene-1', prompt: 'Scene-1: A cinematic opening shot...', technicalSpec: "Aperture: f/1.8, ISO: 100, Lighting: Soft Volumetric", showTechSpec: false, status: 'idle' }
    ]);

    const [history, setHistory] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [activeSceneId, setActiveSceneId] = useState<string>(scenes[0].id);
    const [isNavOpen, setIsNavOpen] = useState(false);

    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachments, setChatAttachments] = useState<{ file: File, url: string }[]>([]);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const navRef = useRef<HTMLDivElement>(null);

    const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

    useEffect(() => {
        if (isOpen && initialImage) setIdentityAnchor(initialImage);
    }, [isOpen, initialImage]);

    const handleUpdateScene = (id: string, updates: Partial<SceneNode>) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleAnchorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) setIdentityAnchor(ev.target.result as string); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // --- ORBITAL CAMERA LOGIC (4 DISTINCT ANGLES - ENVIRONMENTAL PROPAGATION) ---
    const handleGenerateOrbitalGrid = async () => {
        if (!identityAnchor) return;
        setIsGeneratingGrid(true);
        setGridError(null);
        setOrbitalImages([]); // Clear previous results

        // 1. Detect Original Aspect Ratio
        let targetRatio = "1:1";
        try {
            const img = new Image();
            img.src = identityAnchor;
            await img.decode();
            const ratio = img.naturalWidth / img.naturalHeight;
            if (ratio > 1.2) targetRatio = "16:9";      // Landscape
            else if (ratio < 0.8) targetRatio = "9:16"; // Portrait
            else targetRatio = "1:1";                   // Square
            setDetectedRatio(targetRatio);
        } catch (e) {
            console.warn("Ratio detection failed, defaulting to 1:1");
        }

        // 2. Define Physics-Based Camera Vectors
        const angles = [
            {
                label: "RIGHT",
                view: "SIDE PROFILE (RIGHT)",
                env: "Rotate the environment 90 degrees left. Show the depth of the room/landscape behind the subject."
            },
            {
                label: "BACK",
                view: "DIRECT REAR VIEW (BACK)",
                env: "Reverse shot (180 degrees). Show the opposite wall or horizon that was previously behind the camera."
            },
            {
                label: "LEFT",
                view: "SIDE PROFILE (LEFT)",
                env: "Rotate the environment 90 degrees right. Reveal the occluded side of the environment."
            },
            {
                label: "TOP",
                view: "HIGH ANGLE (BIRD'S EYE)",
                env: "Looking down at the floor/ground texture. The horizon line is gone. Show ground shadows."
            }
        ];

        try {
            // Execute all 4 generations in parallel with HEAVY Environment Logic
            const promises = angles.map(async (angle) => {
                const prompt = `
            [MODE: 3D VOLUMETRIC SIMULATION]
            
            ** INPUT REFERENCE **
            Use the provided image as the GROUND TRUTH for the Character/Object Identity ONLY.
            
            ** CAMERA MOVEMENT: ${angle.view} **
            - The camera has physically moved around the subject.
            - The subject is now seen from the ${angle.label}.
            
            ** ENVIRONMENTAL PHYSICS (CRITICAL) **
            1. PARALLAX IS MANDATORY: You MUST rotate the background environment to match the new camera angle. 
            2. DO NOT COPY THE BACKGROUND PIXELS: The background cannot be identical to the input because the camera angle has changed.
            3. HALLUCINATE NEW GEOMETRY: ${angle.env}
            4. LIGHTING CONSISTENCY: Keep the lighting source fixed in the 3D world (e.g., if sun was on left, it is now behind or in front depending on rotation).
            
            ** STRICT OUTPUT RULES **
            - Preserve the *Category* of the location (e.g., if Gym, keep Gym; if Forest, keep Forest).
            - BUT change the *Perspective* of the location.
            - NO 2D BACKDROPS. Treat this as a real 3D space.
            - Photorealistic 8k, Unreal Engine 5 Style Render.
            `;

                return await generateNanoImage(prompt, targetRatio, [identityAnchor]);
            });

            const results = await Promise.all(promises);
            setOrbitalImages(results);

        } catch (e: any) {
            console.error("Orbital Camera Fault:", e);
            if (e.message?.includes("Overload") || e.message?.includes("429")) {
                setGridError("⚠️ Engine Overload. Tunggu sejenak lalu coba lagi.");
            } else {
                setGridError("⚠️ Gagal mensintesis 4 sudut kamera.");
            }
        } finally {
            setIsGeneratingGrid(false);
        }
    };

    const autoDraftSequence = async () => {
        if (!storyContext.trim()) return;
        setIsDrafting(true);
        try {
            const result = await generateStoryScenes(storyContext, sceneCount);
            if (result && Array.isArray(result)) {
                const newScenes = result.map((p, i) => ({
                    id: `scene-${i + 1}`,
                    prompt: p.includes('Scene') ? p : `Scene-${i + 1}: ${p}`,
                    technicalSpec: "Auto-calibrated via Smart Grid context.",
                    showTechSpec: false,
                    status: 'idle' as const
                }));
                setScenes(newScenes);
                setActiveSceneId(newScenes[0].id);
            }
        } catch (e) { console.error(e); } finally { setIsDrafting(false); }
    };

    const handleSendMessage = async (text?: string) => {
        const textToSend = text || chatInput;
        if (!textToSend.trim() && chatAttachments.length === 0) return;
        setChatMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setChatInput("");
        setIsChatLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: textToSend,
                config: {
                    systemInstruction: `You are the Neural Prompt Engineer. Help optimize storyboards based on cinematic grids. Keep context strictly locked to the provided visual identity.`
                }
            });
            setChatMessages(prev => [...prev, { role: 'model', text: response.text || "Synthesis error." }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'model', text: "Neural uplink error." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- FINAL RENDER CAMPAIGN SEQUENCE (CONSISTENT SYNTHESIS) ---
    const renderSequentialSequence = async () => {
        if (!identityAnchor) {
            alert("WAJIB: Upload Identity Anchor (Step 1) terlebih dahulu agar karakter konsisten.");
            return;
        }
        setIsProcessing(true);
        const presetPrompt = CINEMATIC_PRESETS.find(p => p.id === selectedPreset)?.prompt || "";

        const generatedResults: Record<string, string> = {};
        scenes.forEach(s => { if (s.result) generatedResults[s.id] = s.result; });

        // FIX: Use Identity Anchor explicitly to avoid grid bias
        const groundTruth = identityAnchor;

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            if (scene.status === 'done' && generatedResults[scene.id]) continue;

            handleUpdateScene(scene.id, { status: 'generating' });
            setActiveSceneId(scene.id);

            try {
                const anchors = [groundTruth];

                // --- PROMPT RE-ENGINEERING FOR SINGLE IMAGE ENFORCEMENT ---
                const finalPrompt = `
              [MODE: CINEMATIC SINGLE SHOT]
              
              ** CRITICAL: OUTPUT FORMAT **
              GENERATE EXACTLY ONE (1) IMAGE.
              DO NOT GENERATE A GRID. DO NOT GENERATE A COLLAGE.
              FULL SCREEN CINEMATIC FRAME.
              
              ** CAMERA & PERSPECTIVE **
              Camera Angle: DYNAMIC CINEMATIC PERSPECTIVE (Low Angle, Dutch Angle, or Wide Shot).
              Ensure a distinct perspective depth. NOT a flat contact sheet.
              
              ** SCENE DESCRIPTION **
              ${scene.prompt}
              
              ** VISUAL STYLE **
              ${presetPrompt}
              ${scene.technicalSpec ? `Specs: ${scene.technicalSpec}` : ''}
              
              ** IDENTITY LOCK **
              Use the provided reference image ONLY for character face/costume details.
              Create a fresh, single composition.
              `;

                const result = await generateNanoImage(finalPrompt, aspectRatio, anchors);

                generatedResults[scene.id] = result;

                handleUpdateScene(scene.id, { status: 'done', result });
                setHistory(prev => [result, ...prev]);

                await new Promise(r => setTimeout(r, 3000));

            } catch (e) {
                handleUpdateScene(scene.id, { status: 'error' });
                console.error(`Scene ${i + 1} Gen Error:`, e);
                continue;
            }
        }
        setIsProcessing(false);
    };

    const handleApplyToCanvas = (src: string) => { onApply(src); onClose(); };
    const handleMouseDown = (e: React.MouseEvent) => { if (zoom > 1) { setIsDragging(true); dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; } };
    const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); };
    const handleMouseUp = () => setIsDragging(false);
    const handleWheel = (e: React.WheelEvent) => { const delta = e.deltaY > 0 ? 0.9 : 1.1; const newZoom = Math.min(10, Math.max(0.5, zoom * delta)); setZoom(newZoom); if (newZoom <= 1) setPan({ x: 0, y: 0 }); };

    const protocols = [
        { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16} />, desc: 'Visual Workspace', active: false, onClick: onClose },
        { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16} />, desc: 'Cooking Engine', active: false, onClick: onOpenCooking },
        { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16} />, desc: 'Generative Inpaint', active: false, onClick: onOpenTitanFill },
        { id: 'purge', label: 'Purge BG', icon: <Scissors size={16} />, desc: 'Neural Extraction', active: false, onClick: onOpenPurgeBg },
        { id: 'retouch', label: 'Neural Retouch', icon: <Bandage size={16} />, desc: 'Blemish Correction', active: false, onClick: onOpenRetouch },
        { id: 'story', label: 'Story Flow', icon: <Film size={16} />, desc: 'Campaign Designer', active: true, onClick: () => setIsNavOpen(false) },
    ];

    return (
        <div className="fixed inset-0 z-[5000] bg-[#050505] text-white flex flex-col font-sans overflow-hidden animate-in fade-in duration-500">

            <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black shrink-0 z-[100] overflow-visible">
                <div className="flex items-center gap-6 relative" ref={navRef}>
                    <button onClick={() => setIsNavOpen(!isNavOpen)} className="flex items-center gap-4 hover:bg-white/5 px-3 py-2 rounded-xl transition-all group active:scale-95">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                            <Clapperboard size={20} fill="white" />
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Director's Desk</span>
                                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isNavOpen ? 'rotate-180 text-white' : ''}`} />
                            </div>
                            <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest">Storyboard Protocol v4.2</span>
                        </div>
                    </button>

                    {isNavOpen && (
                        <div className="absolute top-full left-0 mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl z-[200]">
                            <div className="p-3 bg-white/5 border-b border-white/5">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Production Matrix</span>
                            </div>
                            <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {protocols.map(p => (
                                    <button key={p.id} onClick={p.onClick} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${p.active ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${p.active ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>{p.icon}</div>
                                        <div className="flex flex-col"><span className={`text-[11px] font-black uppercase tracking-widest ${p.active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{p.label}</span><span className="text-[8px] font-bold text-slate-500 uppercase truncate">{p.desc}</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                        className={`flex items-center gap-3 px-5 py-2 rounded-xl border transition-all active:scale-95 group ${isAssistantOpen ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`}
                    >
                        <Bot size={16} className={isAssistantOpen ? 'text-indigo-600' : 'group-hover:text-indigo-400'} />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[9px] font-black uppercase tracking-widest">Neural Assistant</span>
                            <span className="text-[6px] font-bold opacity-60 uppercase tracking-widest">Prompt Logic Only</span>
                        </div>
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-[400px] bg-[#080808] border-r border-white/5 flex flex-col shrink-0 overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto studio-scrollbar p-6 space-y-10 pb-10">

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Key size={14} className="text-indigo-400" /> Step 1: Identity Anchor</span>
                                {identityAnchor && <button onClick={() => { setIdentityAnchor(null); setOrbitalImages([]); setGridError(null); }} className="text-[8px] font-bold text-red-500 hover:text-red-400 uppercase">Clear</button>}
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3 group ${identityAnchor ? 'border-indigo-500/40 bg-black' : 'border-white/5 bg-white/5 hover:border-indigo-500/20'}`}
                            >
                                {identityAnchor ? (
                                    <img src={identityAnchor} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors"><ImageIcon size={20} /></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">Upload Reference Image</span>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleAnchorUpload} className="hidden" accept="image/*" />
                            </div>
                        </div>

                        <div className="space-y-4 p-5 bg-white/5 border border-indigo-500/20 rounded-[2rem]">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Orbit size={14} className="text-purple-400" />
                                    <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.2em]">Orbital Camera Grid</span>
                                </div>
                                {(orbitalImages.length > 0 || gridError) && (
                                    <button onClick={() => { setOrbitalImages([]); setGridError(null); }} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-red-500 transition-all"><RefreshCcw size={12} /></button>
                                )}
                            </div>

                            {gridError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                    <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <span className="text-[8px] font-bold text-red-400 uppercase leading-relaxed">{gridError}</span>
                                </div>
                            )}

                            {orbitalImages.length === 0 ? (
                                <button
                                    onClick={() => handleGenerateOrbitalGrid()}
                                    disabled={!identityAnchor || isGeneratingGrid}
                                    className="w-full py-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-20 shadow-lg active:scale-95"
                                >
                                    {isGeneratingGrid ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}
                                    {isGeneratingGrid ? 'Physics Engine Active...' : 'Generate 4 Orbital Angles'}
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in zoom-in-95 duration-500">
                                    {/* ORBITAL GRID DISPLAY (2x2) */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {orbitalImages.map((src, idx) => {
                                            const labels = ["RIGHT", "BACK", "LEFT", "TOP"];
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        // ACTION: Load into main preview
                                                        handleUpdateScene(activeSceneId, {
                                                            result: src,
                                                            prompt: `[ORBITAL INSPECTION] Angle: ${labels[idx]} \nSource: Identity Anchor Synthesis`
                                                        });
                                                        setZoom(1);
                                                        setPan({ x: 0, y: 0 });
                                                    }}
                                                    className="relative rounded-xl border border-white/10 overflow-hidden bg-black group hover:border-indigo-500/50 transition-all cursor-pointer"
                                                >
                                                    <img src={src} className="w-full h-full object-contain bg-[#111]" />
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[6px] font-black text-white uppercase tracking-widest backdrop-blur-sm border border-white/10">{labels[idx] || "VIEW"}</div>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        {/* Inspect Icon */}
                                                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                            <Maximize size={12} />
                                                        </div>
                                                        {/* Download Button */}
                                                        <button onClick={(e) => { e.stopPropagation(); downloadBlob(src, `angle_${labels[idx]}.png`); }} className="p-1.5 bg-white text-black rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all" title="Download"><MonitorDown size={12} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[7px] font-bold text-green-400 uppercase tracking-widest">Parallax Validated</span>
                                        <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">3D Mode</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><BookOpen size={14} className="text-emerald-400" /> Step 2: Story Context</span>
                            <div className="space-y-4">
                                <textarea
                                    value={storyContext}
                                    onChange={(e) => setStoryContext(e.target.value)}
                                    placeholder="Tuliskan visi cerita Anda..."
                                    className="w-full h-32 bg-black border border-white/10 rounded-2xl p-5 text-xs font-medium text-slate-300 focus:outline-none focus:border-emerald-500/50 resize-none transition-all shadow-inner"
                                />
                                <button onClick={autoDraftSequence} disabled={isDrafting || !storyContext.trim()} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-20 shadow-lg">{isDrafting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Auto-Draft Sequence</button>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><Hash size={12} className="text-indigo-400" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jumlah Scene</span></div><div className="flex items-center gap-1.5 bg-black rounded-lg p-1 border border-white/5"><button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="w-6 h-6 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400"><Minus size={10} /></button><div className="w-10 text-center"><span className="text-[11px] font-black text-white">{sceneCount}</span><span className="text-[6px] font-bold text-slate-600 uppercase block leading-none text-[5px]">NODES</span></div><button onClick={() => setSceneCount(Math.min(10, sceneCount + 1))} className="w-6 h-6 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400"><Plus size={10} /></button></div></div>
                                    <input type="range" min="1" max="10" step="1" value={sceneCount} onChange={(e) => setSceneCount(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Camera size={14} className="text-orange-400" /> Step 3: Cinematic Preset</span>
                            <div className="grid grid-cols-1 gap-2">{CINEMATIC_PRESETS.map(p => (<button key={p.id} onClick={() => setSelectedPreset(p.id)} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left group ${selectedPreset === p.id ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}><span className={`text-[10px] font-black uppercase tracking-widest ${selectedPreset === p.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{p.label}</span>{selectedPreset === p.id && <CheckCircle2 size={14} className="text-white" />}</button>))}</div>
                        </div>

                        <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={14} className="text-blue-400" /> Step 4: Aspect Ratio</span>
                            <div className="grid grid-cols-2 gap-2">{RATIO_OPTIONS.map(r => (<button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${aspectRatio === r.value ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}>{r.icon}<span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span></button>))}</div>
                        </div>

                    </div>

                    <div className="p-6 border-t border-white/5 bg-black z-20">
                        <button onClick={renderSequentialSequence} disabled={isProcessing || scenes.length === 0} className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-50">{isProcessing ? <Loader2 size={18} className="animate-spin" /> : <MonitorPlay size={18} fill="white" />}<span className="font-black uppercase tracking-[0.2em] text-xs">Render Campaign Sequence</span></button>
                    </div>
                </div>

                <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
                    <div className="w-full bg-black/40 border-b border-white/5 shrink-0 px-8 py-4 flex items-center gap-4 overflow-x-auto studio-scrollbar">
                        {scenes.map((scene, idx) => (
                            <div key={scene.id} onClick={() => { setActiveSceneId(scene.id); setZoom(1); setPan({ x: 0, y: 0 }); }} className={`flex-shrink-0 w-80 p-5 rounded-2xl border transition-all cursor-pointer relative group ${activeSceneId === scene.id ? 'bg-indigo-600/10 border-indigo-500 shadow-2xl' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${activeSceneId === scene.id ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-500'}`}>{idx + 1}</div><span className={`text-[9px] font-black uppercase tracking-widest ${activeSceneId === scene.id ? 'text-indigo-400' : 'text-slate-500'}`}>Node ID: {scene.id.toUpperCase()}</span></div>{scene.status === 'done' && <CheckCircle2 size={12} className="text-green-500" />}{scene.status === 'generating' && <Loader2 size={12} className="animate-spin text-indigo-500" />}<button onClick={(e) => { e.stopPropagation(); setScenes(p => p.filter(s => s.id !== scene.id)); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><Trash2 size={10} /></button></div>
                                <p className={`text-[10px] font-medium leading-relaxed line-clamp-2 italic ${activeSceneId === scene.id ? 'text-white' : 'text-slate-400'}`}>{scene.prompt || "Awaiting vision..."}</p>
                                <div className="mt-3 flex items-center justify-between"><button onClick={(e) => { e.stopPropagation(); handleUpdateScene(scene.id, { showTechSpec: !scene.showTechSpec }); }} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all ${scene.showTechSpec ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-500 hover:text-white'}`}><Code size={10} /> Technical Code</button></div>
                            </div>
                        ))}
                        <button onClick={() => { const newId = `scene-${scenes.length + 1}`; setScenes(p => [...p, { id: newId, prompt: `Scene-${scenes.length + 1}: `, technicalSpec: "", showTechSpec: false, status: 'idle' }]); setActiveSceneId(newId); }} className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600 hover:text-indigo-500 hover:border-indigo-500/40 transition-all"><Plus size={24} /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
                        {activeScene.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700"><div className="relative w-28 h-28"><div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div><div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><Sparkles size={40} className="text-indigo-400 animate-pulse" /></div></div><div className="text-center space-y-2"><span className="text-[13px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse block">NEURAL RENDERING...</span><span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Processing Ground Truth Continuity</span></div></div>
                        ) : (
                            <div className="relative group max-w-5xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                                {activeScene.showTechSpec && (
                                    <div className="absolute inset-0 z-[110] flex items-center justify-center p-12 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"><div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-2xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400"><Code size={16} /></div><span className="text-[11px] font-black uppercase tracking-[0.2em]">Scene Specification</span></div><button onClick={() => handleUpdateScene(activeSceneId, { showTechSpec: false })} className="p-2 hover:bg-white/5 rounded-full"><X size={18} /></button></div><div className="space-y-4"><div className="space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase px-1">Visual Directive</label><textarea value={activeScene.prompt} onChange={(e) => handleUpdateScene(activeSceneId, { prompt: e.target.value })} className="w-full h-24 bg-black border border-white/5 rounded-xl p-4 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500/50" /></div><div className="space-y-1.5"><label className="text-[8px] font-black text-slate-500 uppercase px-1">Ground Truth Offset</label><textarea value={activeScene.technicalSpec} onChange={(e) => handleUpdateScene(activeSceneId, { technicalSpec: e.target.value })} className="w-full h-32 bg-black border border-white/5 rounded-xl p-4 text-[11px] font-mono text-indigo-400 focus:outline-none focus:border-indigo-500/50" placeholder="Aperture: f/2.8, Shutter: 1/250, Lighting: Neon Blue Rim..." /></div></div><button onClick={() => handleUpdateScene(activeSceneId, { showTechSpec: false })} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Update Sequence Node</button></div></div>
                                )}
                                <div className={`relative shadow-2xl border border-white/10 rounded-[3rem] overflow-hidden bg-[#0a0a0a] w-full flex items-center justify-center transition-all duration-500 ${aspectRatio === '9:16' ? 'aspect-[9/16] h-[75vh]' : 'aspect-video h-full'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}><div style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }} className="transition-transform duration-100 ease-out w-full h-full flex items-center justify-center">{activeScene.result ? (<img src={activeScene.result} className="w-full h-full object-contain pointer-events-none select-none" />) : (<div className="flex flex-col items-center gap-4 opacity-10"><Film size={80} strokeWidth={1} /><span className="text-[12px] font-black uppercase tracking-[0.4em]">Node ID: {activeScene.id.toUpperCase()}</span></div>)}</div></div>
                                {activeScene.result && (<div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)] scale-95 group-hover:scale-100 z-50"><button onClick={() => handleApplyToCanvas(activeScene.result!)} className="px-10 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center gap-3 active:scale-95 shadow-xl"><Plus size={16} strokeWidth={4} /> Inject to Artboard</button><div className="h-8 w-px bg-white/10 mx-2" /><button onClick={() => onStash(activeScene.result!)} className="p-3 bg-white/5 hover:bg-indigo-600 text-white rounded-xl border border-white/10 transition-all active:scale-95" title="Save to Stash"><Archive size={18} /></button><button onClick={() => downloadBlob(activeScene.result!, `scene_${activeScene.id}.png`)} className="p-3 bg-white/5 hover:bg-indigo-600 text-white rounded-xl border border-white/10 transition-all active:scale-95" title="Export Local"><Download size={18} /></button></div>)}
                                {activeScene.result && (<div className="absolute top-10 right-10 flex flex-col gap-2 z-50"><button onClick={() => setZoom(v => Math.min(10, v * 1.2))} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><ZoomIn size={20} /></button><button onClick={() => setZoom(v => Math.max(0.5, v / 1.2))} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><ZoomOut size={20} /></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><Maximize size={20} /></button></div>)}
                            </div>
                        )}

                        <div className="absolute bottom-4 left-8 right-8 h-28 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 p-4 flex items-center gap-4 overflow-x-auto custom-scrollbar no-export animate-in slide-in-from-bottom-2 duration-500">
                            {scenes.map((scene, idx) => (
                                <div key={scene.id} onClick={() => { setActiveSceneId(scene.id); setZoom(1); setPan({ x: 0, y: 0 }); }} className={`flex-shrink-0 w-32 h-full rounded-lg border-2 transition-all cursor-pointer overflow-hidden relative group ${activeSceneId === scene.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'}`}>{scene.result ? (<img src={scene.result} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center bg-white/5">{scene.status === 'generating' ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Film size={16} className="text-slate-700" />}</div>)}<div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[6px] font-black text-white uppercase tracking-widest border border-white/10 group-hover:bg-indigo-600 transition-colors">Scene-{idx + 1}</div></div>
                            ))}
                            <button onClick={() => { const newId = `scene-${scenes.length + 1}`; setScenes(p => [...p, { id: newId, prompt: `Scene-${scenes.length + 1}: `, technicalSpec: "", showTechSpec: false, status: 'idle' }]); setActiveSceneId(newId); }} className="flex-shrink-0 w-32 h-full rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 text-slate-700 hover:text-indigo-500 hover:border-indigo-500/40 transition-all bg-white/5"><Plus size={16} /><span className="text-[6px] font-black uppercase tracking-widest">Append</span></button>
                        </div>
                    </div>
                </div>

                <div className="w-[300px] bg-[#0a0a0a] border-l border-white/5 flex flex-col shrink-0 overflow-hidden relative">
                    {isAssistantOpen ? (
                        <div className="flex flex-col h-full animate-in slide-in-from-right duration-500"><div className="p-5 border-b border-white/10 bg-black flex items-center justify-between"><div className="flex items-center gap-2"><Bot size={14} className="text-indigo-400" /><span className="text-[10px] font-black uppercase tracking-widest">Neural Prompt Core</span></div><button onClick={() => setIsAssistantOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white"><X size={14} /></button></div><div className="flex-1 overflow-hidden"><AssistantPanel messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={handleSendMessage} isLoading={isChatLoading} onClear={() => setChatMessages([])} attachments={chatAttachments} setAttachments={setChatAttachments} variant="dark" /></div></div>
                    ) : (
                        <div className="flex flex-col h-full animate-in fade-in duration-500"><div className="p-5 border-b border-white/5 bg-black flex items-center justify-between"><div className="flex items-center gap-2 text-slate-400"><History size={14} className="text-indigo-500" /><span className="text-[10px] font-black uppercase tracking-widest">Cache</span></div>{history.length > 0 && <button onClick={() => { if (window.confirm("Purge Cache?")) setHistory([]); }} className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors rounded-lg"><Trash2 size={14} /></button>}</div><div className="flex-1 overflow-y-auto studio-scrollbar p-4 space-y-4">{history.length > 0 ? (history.map((src, i) => (<div key={i} onClick={() => { handleUpdateScene(activeSceneId, { result: src }); setZoom(1); setPan({ x: 0, y: 0 }); }} className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${activeScene.result === src ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-105 shadow-2xl z-10' : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100'}`}><img src={src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" /><div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />{activeScene.result === src && (<div className="absolute top-2 right-2 p-1 bg-indigo-500 text-white rounded-md shadow-lg"><Check size={10} strokeWidth={4} /></div>)}</div>))) : (<div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-20 gap-4"><Box size={40} strokeWidth={1} /><span className="text-[8px] font-black uppercase tracking-widest leading-relaxed">Registry Empty</span></div>)}</div><div className="p-5 bg-black/60 border-t border-white/5 text-center"><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Total Variations: {history.length}</span></div></div>
                    )}
                </div>
            </div>
        </div>
    );
};
