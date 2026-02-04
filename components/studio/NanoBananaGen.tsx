import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Zap, Plus, Library, Trash2, Loader2, Image as ImageIcon, 
  Download, RefreshCw, Maximize2, Sliders, Layers, ArrowLeft,
  Monitor, Smartphone, Square, Layout, Sparkles, Check,
  BrainCircuit, ChefHat, Flame, Activity, Bot, CloudUpload,
  Camera, Film, Palette, Droplets, Settings2, Ratio, Target,
  Hash, History, Box, Minimize2, Eraser,
  Scissors, Bandage, Scan, ZoomIn, ZoomOut, Maximize, CircleAlert,
  Eye, Archive, Wand2, ArrowRight, ChevronDown, Menu, MonitorDown
} from 'lucide-react';
import { generateNanoImage, expandPrompt, suggestStyleFromPrompt } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';
import { ChatMessage } from '../../types';
import { AssistantPanel } from '../editor/AssistantPanel';

interface HistoryItem {
  src: string;
  source: 'cooked' | 'injected';
  timestamp: number;
}

interface NanoBananaGenProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text?: string) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  chatAttachments: {file: File, url: string}[];
  setChatAttachments: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  onOpenPurge?: (src: string) => void;
  onOpenRetouch?: (src: string) => void;
  onOpenStory?: (src: string) => void;
  onOpenUpscale?: (src: string) => void; 
  onOpenTitanFill?: (src: string) => void;
  initialImage?: string | null;
  sessionHistory?: HistoryItem[];
  setSessionHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

const QUANTUM_GRADES = [
  { id: 'Standard', label: 'STD', color: '#ffffff' },
  { id: 'Vivid Pop', label: 'VIVID', color: '#fbbf24' },
  { id: 'HDR Sharp', label: 'HDR', color: '#38bdf8' },
  { id: 'Deep Film', label: 'FILM', color: '#f472b6' },
  { id: 'Soft Matte', label: 'MATTE', color: '#a78bfa' },
  { id: 'Mono Noir', label: 'BW', color: '#94a3b8' },
];

const FLAVOR_PROFILES = [
  { 
    id: 'Neural Flavor', 
    label: 'NEURAL', 
    icon: <Zap size={10} className="text-orange-500"/>,
    prompt: "Ultra Hyper Realistic Resolution: Vibrant retro colorful aesthetic, striking contrast between deep teals and bold reds. Bright harsh mid-day sunlight, strong defined shadows, high saturation. Fashion editorial photography feel. 8k."
  },
  { 
    id: 'Ultimate Realism', 
    label: 'REALISM', 
    icon: <Sparkles size={10} className="text-yellow-400"/>,
    prompt: "Ultra Hyper Realistic: Commercial fashion photography style. Technical: master studio lighting, sharp focus, 8k RAW photo texture, micro-fabric details."
  },
  { 
    id: 'Raw Photography', 
    label: 'RAW', 
    icon: <Camera size={10}/>,
    prompt: "Ultra Hyper Realistic: Undeveloped sensor output. Flat profile, high dynamic range, sharp focus on textures and pores, natural daylight."
  },
  { 
    id: 'Cinematic', 
    label: 'CINE', 
    icon: <Film size={10}/>,
    prompt: "Ultra Hyper Realistic: Movie still frame, anamorphic lens flares, volumetric shadows, teal and orange grading, high-end production value."
  },
  { 
    id: 'Cyberpunk', 
    label: 'CYBER', 
    icon: <Zap size={10}/>,
    prompt: "Ultra Hyper Realistic: Futuristic urban aesthetic, tech-wear textures, neon reflections, high contrast mid-day sun, digital noise."
  },
  { 
    id: 'Minimalist', 
    label: 'MINI', 
    icon: <Square size={10}/>,
    prompt: "Ultra Hyper Realistic: Minimalist studio setup, soft directional light, clean composition, neutral color palette, focus on silhouette."
  }
];

const ASPECT_RATIOS = [
    { label: "1:1", value: "1:1", icon: <Square size={12}/> },
    { label: "4:5", value: "4:5", icon: <Layout size={12}/> },
    { label: "16:9", value: "16:9", icon: <Monitor size={12}/> },
    { label: "9:16", value: "9:16", icon: <Smartphone size={12}/> }
];

export const NanoBananaGen: React.FC<NanoBananaGenProps> = ({ 
    isOpen, onClose, onApply, onStash, onOpenPurge, onOpenRetouch, onOpenStory, onOpenUpscale, onOpenTitanFill,
    chatMessages, onSendMessage, chatInput, setChatInput, isChatLoading, chatAttachments, setChatAttachments,
    initialImage, sessionHistory = [], setSessionHistory
}) => {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedGrade, setSelectedGrade] = useState("Standard");
  const [selectedFlavor, setSelectedFlavor] = useState("Neural Flavor");
  const [batchSize, setBatchSize] = useState(1);
  const [anchors, setAnchors] = useState<string[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  
  const [isSmartConfiguring, setIsSmartConfiguring] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ flavorId: string, gradeId: string, reasoning: string } | null>(null);

  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && initialImage) {
        setAnchors(prev => prev.includes(initialImage) ? prev : [initialImage, ...prev].slice(0, 4));
        setSelectedImage(initialImage);
    }
  }, [isOpen, initialImage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
    };
    if (isNavOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNavOpen]);

  const returnToCooking = useCallback(() => {
    setSelectedImage(null);
    setError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleExpandPrompt = async () => {
    if (!prompt.trim()) return;
    setIsExpanding(true);
    try { const refined = await expandPrompt(prompt); setPrompt(refined); } 
    catch (e) { console.error(e); } 
    finally { setIsExpanding(false); }
  };

  const handleSmartConfigure = async () => {
      if (!prompt.trim()) return;
      setIsSmartConfiguring(true);
      setAiSuggestion(null); 
      try {
          const flavorIds = FLAVOR_PROFILES.map(f => f.id);
          const gradeIds = QUANTUM_GRADES.map(g => g.id);
          const suggestion = await suggestStyleFromPrompt(prompt, flavorIds, gradeIds);
          setAiSuggestion(suggestion);
      } catch (e) {
          console.error("Smart Config Failed", e);
      } finally {
          setIsSmartConfiguring(false);
      }
  };

  const applySuggestion = () => {
      if (!aiSuggestion) return;
      if (aiSuggestion.flavorId) setSelectedFlavor(aiSuggestion.flavorId);
      if (aiSuggestion.gradeId) setSelectedGrade(aiSuggestion.gradeId);
      setAiSuggestion(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && anchors.length === 0) {
      setError("Logical Input Required (Text or JSON).");
      return;
    }
    setIsGenerating(true);
    generationRef.current = true;
    setError(null); 
    setGeneratedImages([]); 
    setSelectedImage(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    try {
      const flavorObj = FLAVOR_PROFILES.find(f => f.id === selectedFlavor);
      const flavorPrompt = flavorObj?.prompt || "";
      const finalPrompt = `${prompt}. ${flavorPrompt}`;
      const results: string[] = [];
      for (let i = 0; i < batchSize; i++) {
          if (!generationRef.current) break;
          const res = await generateNanoImage(finalPrompt, aspectRatio, anchors.length > 0 ? anchors : null, selectedGrade);
          results.push(res);
          setGeneratedImages(prev => [...prev, res]); 
          if (setSessionHistory) setSessionHistory(prev => [{ src: res, source: 'cooked', timestamp: Date.now() }, ...prev]);
      }
      if (results.length > 0 && batchSize === 1) setSelectedImage(results[0]);
    } catch (err: any) { 
        setError(err.message || "Synthesis Protocol Fault"); 
    } finally { 
        setIsGenerating(false); 
        generationRef.current = false;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault(); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleUploadAnchor = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const src = ev.target.result as string;
          setAnchors(prev => prev.includes(src) ? prev : [src, ...prev].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!selectedImage) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(10, Math.max(0.5, zoom * delta));
    setZoom(newZoom);
    if (newZoom <= 1) setPan({ x: 0, y: 0 });
  };

  const handleExport = () => {
      if (!selectedImage) return;
      downloadBlob(selectedImage, `beatstoria_asset_${Date.now()}.png`);
  };

  const handleClearHistory = () => {
      if (window.confirm("Purge all session records from history?")) {
          if (setSessionHistory) setSessionHistory([]);
          setGeneratedImages([]);
          setSelectedImage(null);
      }
  };

  const protocols = [
    { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16}/>, desc: 'Visual Workspace', active: false, onClick: onClose },
    { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16}/>, desc: 'Cooking Engine', active: true, onClick: () => setIsNavOpen(false) },
    { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16}/>, desc: 'Generative Inpaint', active: false, onClick: () => { onOpenTitanFill?.(selectedImage || ''); setIsNavOpen(false); } },
    { id: 'purge', label: 'Purge BG', icon: <Scissors size={16}/>, desc: 'Neural Extraction', active: false, onClick: () => { onOpenPurge?.(selectedImage || ''); setIsNavOpen(false); } },
    { id: 'retouch', label: 'Neural Retouch', icon: <Bandage size={16}/>, desc: 'Blemish Correction', active: false, onClick: () => { onOpenRetouch?.(selectedImage || ''); setIsNavOpen(false); } },
    { id: 'story', label: 'Story Flow', icon: <Film size={16}/>, desc: 'Campaign Designer', active: false, onClick: onOpenStory },
  ];

  return (
    <div className={`fixed inset-0 z-[3000] bg-[#050505] text-slate-200 font-sans flex flex-col overflow-hidden animate-in fade-in duration-300 ${isFullscreen ? 'z-[9999]' : ''}`}>
        {!isFullscreen && (
            <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-black shrink-0 z-[100] overflow-visible">
                <div className="flex items-center gap-4 relative" ref={navRef}>
                    <button 
                        onClick={() => setIsNavOpen(!isNavOpen)}
                        className="flex items-center gap-4 hover:bg-white/5 px-3 py-2 rounded-xl transition-all group active:scale-95"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-black shadow-lg group-hover:scale-105 transition-transform">
                            <Flame size={20} strokeWidth={3} fill="black" />
                        </div>
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-white">SPACE COOKING</span>
                                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isNavOpen ? 'rotate-180 text-white' : ''}`} />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-indigo-500">BEATSTORIA AI</span>
                            </div>
                        </div>
                    </button>

                    {isNavOpen && (
                        <div className="absolute top-full left-0 mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl z-[200]">
                            <div className="p-3 bg-white/5 border-b border-white/5">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Navigation Matrix</span>
                            </div>
                            <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {protocols.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={p.onClick}
                                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${p.active ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${p.active ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>
                                            {p.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${p.active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{p.label}</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{p.desc}</span>
                                        </div>
                                        {p.active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 bg-black/40 border-t border-white/5">
                                <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest text-center leading-relaxed">Neural Design Infrastructure v3.4<br/>Sport Optimized Engine</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowAiPanel(!showAiPanel)} 
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all active:scale-95 group ${showAiPanel ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-transparent border-white/20 text-slate-400 hover:text-white hover:border-white/40'}`}
                    >
                        <Bot size={16} className={showAiPanel ? 'text-indigo-600' : 'group-hover:text-indigo-400'} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">AI ASSISTANT</span>
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={24} /></button>
                </div>
            </div>
        )}

        <div className="flex-1 flex overflow-hidden">
            {/* PROPERTIES SIDEBAR */}
            <div className={`w-[340px] bg-[#080808] border-r border-white/10 flex flex-col shrink-0 z-20 transition-all ${isFullscreen ? 'hidden' : 'block'}`}>
                <div className="flex-1 overflow-y-auto studio-scrollbar">
                    <div id="section-logic" className="p-6 border-b border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><BrainCircuit size={14} className="text-indigo-400" /> Semantic Logic</label>
                            
                            <button 
                                onClick={handleSmartConfigure} 
                                disabled={isSmartConfiguring || !prompt}
                                className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-30 active:scale-95"
                                title="AI Auto-Configure Flavor & Grade"
                            >
                                {isSmartConfiguring ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                                SMART SET
                            </button>
                        </div>
                        
                        <textarea 
                            value={prompt} 
                            onChange={(e) => { 
                                setPrompt(e.target.value); 
                                if (error) setError(null); 
                                if (aiSuggestion) setAiSuggestion(null); 
                            }} 
                            placeholder="Describe technical details... (e.g. 'Cyberpunk street runner')" 
                            className="w-full h-32 bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none font-mono tracking-tight" 
                        />

                        {aiSuggestion && (
                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-indigo-400 text-sm">auto_awesome</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200">AI Recommendation</span>
                                </div>
                                <div className="space-y-1 mb-3">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-400">Flavor:</span>
                                        <span className="font-bold text-white uppercase">{FLAVOR_PROFILES.find(f => f.id === aiSuggestion.flavorId)?.label || aiSuggestion.flavorId}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="text-slate-400">Grade:</span>
                                        <span className="font-bold text-white uppercase">{QUANTUM_GRADES.find(g => g.id === aiSuggestion.gradeId)?.label || aiSuggestion.gradeId}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={applySuggestion} className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-50 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all">APPLY</button>
                                    <button onClick={() => setAiSuggestion(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[8px] font-bold uppercase transition-all">DISMISS</button>
                                </div>
                            </div>
                        )}
                        
                        <button onClick={handleExpandPrompt} disabled={isExpanding || !prompt} className="w-full flex items-center justify-center gap-2 py-2 rounded bg-white/5 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30 border border-white/5">
                            {isExpanding ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} REFINE TEXT
                        </button>
                    </div>

                    <div id="section-anchors" className="p-6 border-b border-white/5 space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><ImageIcon size={14} className="text-orange-500" /> Style Anchors</label>
                        <div className="grid grid-cols-4 gap-2">
                            {anchors.map((src, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg border border-white/10 overflow-hidden bg-black/40 group">
                                    <img src={src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                    <button onClick={() => setAnchors(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100"><X size={8}/></button>
                                </div>
                            ))}
                            {anchors.length < 4 && <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-slate-600 hover:text-orange-500 bg-white/5"><Plus size={16}/></button>}
                        </div>
                    </div>

                    <div id="section-geometry" className="p-6 border-b border-white/5 space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Ratio size={14} className="text-indigo-400" /> Frame Geometry</label>
                        <div className="grid grid-cols-4 gap-2">
                            {ASPECT_RATIOS.map((r) => (
                                <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-wider transition-all ${aspectRatio === r.value ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}>{r.label}</button>
                            ))}
                        </div>
                    </div>

                    <div id="section-flavor" className="p-6 border-b border-white/5 space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Droplets size={14} className="text-pink-400" /> Neural Flavor</label>
                        <div className="grid grid-cols-3 gap-2">
                            {FLAVOR_PROFILES.map((f) => (
                                <button key={f.id} onClick={() => setSelectedFlavor(f.id)} className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all ${selectedFlavor === f.id ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                    <span className="text-[7px] font-black">{f.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div id="section-grading" className="p-6 border-b border-white/5 space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Palette size={14} className="text-orange-400" /> Color Grading</label>
                        <div className="grid grid-cols-3 gap-2">
                            {QUANTUM_GRADES.map((g) => (
                                <button key={g.id} onClick={() => setSelectedGrade(g.id)} className={`px-1 py-2.5 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${selectedGrade === g.id ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                    <div className="w-2 h-2 rounded-full shadow-lg" style={{ backgroundColor: g.color }} />
                                    <span className="text-[7px] font-black">{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div id="section-nodes" className="p-6 space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Hash size={14} className="text-indigo-400" /> Output Quantity
                        </label>
                        <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-white/5">
                            {[1, 2, 4].map((num) => (
                                <button 
                                    key={num} 
                                    onClick={() => setBatchSize(num)} 
                                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${batchSize === num ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {num} {num === 1 ? 'NODE' : 'NODES'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-black z-20">
                    <button onClick={handleGenerate} disabled={isGenerating} className="w-full h-14 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 rounded-2xl flex items-center justify-center gap-3 text-white shadow-xl transition-all active:scale-95 disabled:opacity-50">
                        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="white" />}
                        <span className="font-black uppercase tracking-[0.25em] text-sm">{isGenerating ? 'COOKING...' : 'COOK NEW'}</span>
                    </button>
                </div>
            </div>

            {/* MAIN PREVIEW STAGE */}
            <div className="flex-1 bg-[#050505] relative flex flex-col items-center justify-center p-12 overflow-hidden">
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-10">
                    {(generatedImages.length > 0 || selectedImage) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {selectedImage ? (
                                <div className={`relative w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl group ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-none' : ''}`}>
                                    <div className="relative flex-1 w-full h-full flex items-center justify-center" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
                                        <div style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }} className="transition-transform duration-100 ease-out">
                                            <img ref={imageElementRef} src={selectedImage} className="max-h-[70vh] w-auto pointer-events-none" draggable={false} />
                                        </div>
                                    </div>

                                    {/* INSPECTION CONTROLS & EXPORT */}
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 z-40 transition-all opacity-0 group-hover:opacity-100 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                        <button onClick={() => onOpenPurge?.(selectedImage)} className="p-3 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all" title="Purge Background"><Scissors size={20} /></button>
                                        <button onClick={() => onOpenRetouch?.(selectedImage)} className="p-3 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl transition-all" title="Heal/Retouch"><Bandage size={20} /></button>
                                        <button onClick={() => onOpenUpscale?.(selectedImage)} className="p-3 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600 hover:text-white rounded-xl transition-all" title="Nano Upscale"><Scan size={20} /></button>
                                        
                                        <div className="h-8 w-px bg-white/10 mx-2" />
                                        
                                        <button 
                                            onClick={handleExport}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 flex items-center gap-2 transition-all shadow-lg active:scale-95"
                                            title="Export Render as PNG"
                                        >
                                            <MonitorDown size={18} /> EXPORT UHD
                                        </button>
                                        
                                        <div className="h-8 w-px bg-white/10 mx-2" />
                                        <button onClick={() => onApply(selectedImage!)} className="px-8 py-3 bg-white text-black rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">APPLY ASSET</button>
                                    </div>

                                    <div className="absolute top-6 left-6 flex items-center gap-2">
                                        <button onClick={returnToCooking} className="p-2.5 bg-black/60 hover:bg-white/10 rounded-xl border border-white/10 text-white transition-all"><ArrowLeft size={20}/></button>
                                    </div>

                                    <div className="absolute top-6 right-6 flex items-center gap-2">
                                        <div className="flex flex-col gap-2 no-drag">
                                            <button onClick={() => setZoom(v => Math.min(10, v * 1.2))} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white"><ZoomIn size={18}/></button>
                                            <button onClick={() => setZoom(v => Math.max(0.5, v / 1.2))} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white"><ZoomOut size={18}/></button>
                                            <button onClick={() => { setZoom(1); setPan({x: 0, y: 0}); }} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white"><Maximize size={18}/></button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-6 w-full max-w-5xl mx-auto p-6 overflow-y-auto studio-scrollbar grid-cols-2">
                                    {generatedImages.map((src, idx) => (
                                        <div key={idx} className="group relative rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] hover:border-orange-500/50 cursor-pointer shadow-2xl animate-in zoom-in duration-500" onClick={() => setSelectedImage(src)}>
                                            <img src={src} className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"><Maximize2 size={32} className="text-white"/></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in duration-1000">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-[#0f0f0f] border-2 border-white/10 flex items-center justify-center shadow-2xl transition-all group-hover:scale-105">
                                {isGenerating ? <Loader2 size={56} className="text-orange-500 animate-spin" /> : <ChefHat size={56} className="text-orange-500" />}
                            </div>
                            <button onClick={handleGenerate} className="px-10 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">
                                <Zap size={18} fill="white" /> EXECUTE ENGINE
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: SESSION HISTORY / NEURAL ASSISTANT */}
            <div className={`${showAiPanel ? 'w-[350px]' : 'w-[180px]'} bg-[#080808] border-l border-white/10 flex flex-col shrink-0 z-30 overflow-hidden transition-all duration-300`}>
                {showAiPanel ? (
                    /* INTEGRATED NEURAL ASSISTANT PANEL */
                    <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                        <div className="p-4 border-b border-white/10 bg-black flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot size={14} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Neural Assistant</span>
                            </div>
                            <button onClick={() => setShowAiPanel(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"><X size={14}/></button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <AssistantPanel 
                                messages={chatMessages}
                                input={chatInput}
                                setInput={setChatInput}
                                onSend={onSendMessage}
                                isLoading={isChatLoading}
                                onClear={() => {}}
                                attachments={chatAttachments}
                                setAttachments={setChatAttachments}
                                variant="dark"
                            />
                        </div>
                    </div>
                ) : (
                    /* HISTORY RAIL CONTENT */
                    <div className="flex flex-col h-full animate-in fade-in duration-500">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
                            <div className="flex items-center gap-2 text-slate-400">
                                <History size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">History</span>
                            </div>
                            {sessionHistory.length > 0 && (
                                <button 
                                    onClick={handleClearHistory}
                                    className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors rounded-lg"
                                    title="Purge All Records"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto studio-scrollbar p-3 space-y-3">
                            {sessionHistory.length > 0 ? (
                                sessionHistory.map((item, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => {
                                            setSelectedImage(item.src);
                                            setZoom(1);
                                            setPan({x:0, y:0});
                                        }}
                                        className={`group relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${selectedImage === item.src ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/5 hover:border-white/20'}`}
                                    >
                                        <img src={item.src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {selectedImage === item.src && (
                                            <div className="absolute top-1.5 right-1.5 p-1 bg-indigo-500 text-white rounded-md shadow-lg">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 gap-3 text-center px-4">
                                    <Box size={32} strokeWidth={1.5} />
                                    <span className="text-[8px] font-black uppercase tracking-widest leading-relaxed">No nodes<br/>generated yet</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-black/60 border-t border-white/5 text-center">
                            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none">
                                Nodes: {sessionHistory.length}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleUploadAnchor} className="hidden" accept="image/*" />
    </div>
  );
};