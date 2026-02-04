import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, Loader2, Image as ImageIcon, Plus, Sparkles, RotateCcw, 
  Maximize, Hand, ZoomIn, ZoomOut, Trash2, History, Download, 
  Undo2, Paintbrush, Eraser, Wand2, MessageSquare, ChevronDown, 
  Layout, Flame, Bandage, Film, MonitorDown, Check, Box, 
  ArrowLeft, Edit3, Archive, Eye, Maximize2, Redo2, RefreshCw,
  Scissors, Hash
} from 'lucide-react';
import { generativeFill, expandPrompt } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

interface TitanFillStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  initialImage?: string | null;
  onOpenCooking?: () => void;
  onOpenPurgeBg?: () => void;
  onOpenRetouch?: () => void;
  onOpenStory?: () => void;
}

export const TitanFillStudio: React.FC<TitanFillStudioProps> = ({ 
    isOpen, onClose, onApply, onStash, initialImage,
    onOpenCooking, onOpenPurgeBg, onOpenRetouch, onOpenStory
}) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [batchSize, setBatchSize] = useState(1);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'hand'>('brush');
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMaskContent, setHasMaskContent] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Mask History for Undo/Redo logic
  const [maskUndoStack, setMaskUndoStack] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialImage) {
            setSourceImage(initialImage);
            setHistory([]);
            setHasMaskContent(false);
            setPrompt("");
            setMaskUndoStack([]);
            setSelectedImage(null);
        }
    }
  }, [isOpen, initialImage]);

  useEffect(() => {
    if (sourceImage) {
        const img = new Image();
        img.onload = () => {
            if (canvasRef.current && maskCanvasRef.current) {
                canvasRef.current.width = img.width;
                canvasRef.current.height = img.height;
                maskCanvasRef.current.width = img.width;
                maskCanvasRef.current.height = img.height;
                
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, img.width, img.height);
                    ctx.drawImage(img, 0, 0);
                }
                
                const mCtx = maskCanvasRef.current.getContext('2d');
                if (mCtx) {
                    mCtx.clearRect(0, 0, img.width, img.height);
                }
            }
        };
        img.src = sourceImage;
    }
  }, [sourceImage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
    };
    if (isNavOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNavOpen]);

  if (!isOpen) return null;

  const saveMaskToUndo = () => {
    if (maskCanvasRef.current) {
        const dataUrl = maskCanvasRef.current.toDataURL();
        setMaskUndoStack(prev => [...prev, dataUrl].slice(-20)); // Buffer last 20 states
    }
  };

  const handleUndoMask = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (maskUndoStack.length === 0) return;
      
      const newStack = [...maskUndoStack];
      const lastState = newStack.pop(); 
      
      const ctx = maskCanvasRef.current?.getContext('2d');
      if (ctx && maskCanvasRef.current) {
          ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          if (newStack.length > 0) {
              const img = new Image();
              const stateToDraw = newStack[newStack.length - 1];
              img.onload = () => {
                  ctx.drawImage(img, 0, 0);
                  setHasMaskContent(true);
              };
              img.src = stateToDraw;
          } else {
              setHasMaskContent(false);
          }
      }
      setMaskUndoStack(newStack);
  };

  const clearMask = () => {
    const mask = maskCanvasRef.current;
    if (mask) {
        mask.getContext('2d')?.clearRect(0, 0, mask.width, mask.height);
        setHasMaskContent(false);
        setMaskUndoStack([]);
    }
  };

  const handleRestart = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (window.confirm("Restart Session? Ini akan menghapus semua history variasi dan mask.")) {
          clearMask();
          setHistory([]);
          setSelectedImage(null);
          setPrompt("");
          setViewState({ x: 0, y: 0, scale: 0.8 });
      }
  };

  const getCoords = (e: any) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { 
        x: (clientX - rect.left) * scaleX, 
        y: (clientY - rect.top) * scaleY 
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'hand' || e.button === 1) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - viewState.x, y: e.clientY - viewState.y };
        return;
    }
    if (!sourceImage || isProcessing || selectedImage) return;
    
    saveMaskToUndo(); 
    setIsDrawing(true);
    const coords = getCoords(e);
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize / viewState.scale;
        ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)'; 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        setViewState(prev => ({ ...prev, x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y }));
        return;
    }
    if (!isDrawing) return;
    const coords = getCoords(e);
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        setHasMaskContent(true);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
  };

  const handleRefinePrompt = async () => {
      if (!prompt.trim()) return;
      setIsRefining(true);
      try {
          const expanded = await expandPrompt(`Perjelas instruksi inpainting ini menjadi detail kontekstual tingkat tinggi: "${prompt}"`);
          setPrompt(expanded);
      } catch (e) {
          console.error(e);
      } finally {
          setIsRefining(false);
      }
  };

  const executeFill = async () => {
    if (!sourceImage || !maskCanvasRef.current || !prompt.trim() || !hasMaskContent) return;
    setIsProcessing(true);
    try {
        const finalMaskCanvas = document.createElement('canvas');
        finalMaskCanvas.width = maskCanvasRef.current.width;
        finalMaskCanvas.height = maskCanvasRef.current.height;
        const fmCtx = finalMaskCanvas.getContext('2d');
        if (!fmCtx) return;

        fmCtx.fillStyle = 'black';
        fmCtx.fillRect(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);
        fmCtx.drawImage(maskCanvasRef.current, 0, 0);
        
        const imgData = fmCtx.getImageData(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            const isMasked = alpha > 1; 
            const val = isMasked ? 255 : 0;
            data[i] = val; data[i+1] = val; data[i+2] = val; data[i+3] = 255;
        }
        fmCtx.putImageData(imgData, 0, 0);
        const maskB64 = finalMaskCanvas.toDataURL('image/png');
        
        // REINFORCEMENT: Microscopic contextual details for miniature masking
        const surgicalPrompt = `
        [SURGICAL NEURAL INPAINTING PROTOCOL]
        OBJECTIVE: Reconstruct ONLY the area defined by the mask.
        INSTRUCTION: ${prompt}
        CRITICAL: The mask may cover an extremely small area (microscopic detail). Analyze the surrounding pixels at high frequency. Ensure the generated content blends seamlessly into the lighting, material texture, and noise profile of the original image. Focus exclusively on the intended change while maintaining 100% integrity of the unmasked area.
        `;

        const promises = Array(batchSize).fill(0).map(() => generativeFill(sourceImage, maskB64, surgicalPrompt));
        const generatedResults = await Promise.all(promises);
        
        setHistory(prev => [...generatedResults, ...prev]);
        if (generatedResults.length > 0) {
            setSelectedImage(generatedResults[0]);
        }
    } catch (err: any) {
        alert(err.message || "Neural Synthesis failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleExport = (src?: string) => {
      const target = src || selectedImage;
      if (target) downloadBlob(target, `titan_fill_${Date.now()}.png`);
  };

  const handleDeleteHistoryItem = (src: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setHistory(prev => prev.filter(item => item !== src));
      if (selectedImage === src) setSelectedImage(null);
  };

  const handleUseAsSource = () => {
      if (selectedImage) {
          setSourceImage(selectedImage);
          setSelectedImage(null);
          clearMask();
          setViewState({ x: 0, y: 0, scale: 0.8 });
      }
  };

  const protocols = [
    { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16}/>, desc: 'Visual Workspace', active: false, onClick: onClose },
    { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16}/>, desc: 'Cooking Engine', active: false, onClick: onOpenCooking },
    { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16}/>, desc: 'Generative Inpaint', active: true, onClick: () => setIsNavOpen(false) },
    { id: 'purge', label: 'Purge BG', icon: <Scissors size={16}/>, desc: 'Neural Extraction', active: false, onClick: onOpenPurgeBg },
    { id: 'retouch', label: 'Neural Retouch', icon: <Bandage size={16}/>, desc: 'Blemish Correction', active: false, onClick: onOpenRetouch },
    { id: 'story', label: 'Story Flow', icon: <Film size={16}/>, desc: 'Campaign Designer', active: false, onClick: onOpenStory },
  ];

  return (
    <div className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col font-sans select-none overflow-hidden text-slate-200 animate-in fade-in duration-300">
      
      {/* HEADER HUD */}
      <div className="h-16 border-b border-white/10 bg-black flex items-center justify-between px-8 shrink-0 z-[100] overflow-visible">
        <div className="flex items-center gap-8 relative" ref={navRef}>
            <button onClick={() => setIsNavOpen(!isNavOpen)} className="flex items-center gap-3 hover:bg-white/5 px-3 py-2 rounded-xl transition-all group active:scale-95">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Wand2 size={16} fill="white" />
                </div>
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Titan Fill</span>
                        <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 ${isNavOpen ? 'rotate-180 text-white' : ''}`} />
                    </div>
                </div>
            </button>

            {/* TOP ACTIONS: UNDO / RESTART */}
            <div className="flex items-center gap-2">
                <button 
                  onClick={handleUndoMask} 
                  disabled={maskUndoStack.length === 0} 
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all disabled:opacity-20 active:scale-90 border border-white/5 shadow-sm"
                  title="Undo Mask Stroke"
                >
                    <Undo2 size={18} />
                </button>
                <button 
                  onClick={handleRestart} 
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90 border border-white/5 shadow-sm"
                  title="Restart Session"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block" />

            <div className="flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Brush Scale</span>
                    <div className="flex items-center gap-3">
                        <input type="range" min="5" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24 h-0.5 bg-white/10 appearance-none cursor-pointer accent-purple-500" />
                        <span className="text-[10px] font-mono text-purple-400 w-8">{brushSize}px</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1.5"><Hash size={10} className="text-purple-400" /> Variations</span>
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        {[1, 2, 4].map(num => (
                            <button key={num} onClick={() => setBatchSize(num)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all active:scale-95 ${batchSize === num ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    <button onClick={() => setActiveTool('brush')} className={`p-2 rounded-md transition-all ${activeTool === 'brush' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Brush Tool"><Paintbrush size={14}/></button>
                    <button onClick={() => setActiveTool('eraser')} className={`p-2 rounded-md transition-all ${activeTool === 'eraser' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Eraser Tool"><Eraser size={14}/></button>
                    <button onClick={() => setActiveTool('hand')} className={`p-2 rounded-md transition-all ${activeTool === 'hand' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`} title="Hand Tool"><Hand size={14}/></button>
                </div>
            </div>

            {isNavOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl z-[200]">
                    <div className="p-3 bg-white/5 border-b border-white/5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Navigation Matrix</span>
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

        <div className="flex items-center gap-4">
             <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest">CANCEL</button>
             <button 
               onClick={executeFill} 
               disabled={isProcessing || !hasMaskContent || !prompt.trim()} 
               className="px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all bg-white text-black hover:bg-purple-50 flex items-center gap-2 disabled:opacity-30 shadow-xl active:scale-95"
             >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="black" />}
                GENERATE VARIATION
             </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* CENTER WORKSPACE */}
        <div className="flex-1 bg-[#111111] relative overflow-hidden flex items-center justify-center" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {!sourceImage ? (
                <div onClick={() => fileInputRef.current?.click()} className="group w-96 h-64 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                    <ImageIcon size={40} className="text-slate-600 group-hover:text-purple-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">IMPORT IMAGE NODES</span>
                </div>
            ) : (
                <div className="relative will-change-transform" style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})` }}>
                    <div className={`relative shadow-2xl border border-white/5 overflow-hidden ${selectedImage ? 'bg-black' : ''}`}>
                        {selectedImage ? (
                            <img src={selectedImage} className="max-w-[80vw] max-h-[70vh] object-contain animate-in fade-in duration-500" />
                        ) : (
                            <>
                                <canvas ref={canvasRef} className="block pointer-events-none opacity-50" />
                                <canvas ref={maskCanvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                            </>
                        )}
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 bg-black/80 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                        <Loader2 size={48} className="animate-spin text-purple-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Neural Synthesis Active...</span>
                    </div>
                </div>
            )}

            <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-50">
                <button onClick={() => setViewState(v => ({ ...v, scale: v.scale * 1.2 }))} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-white"><ZoomIn size={18}/></button>
                <button onClick={() => setViewState(v => ({ ...v, scale: v.scale / 1.2 }))} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-white"><ZoomOut size={18}/></button>
                <button onClick={() => setViewState({ x: 0, y: 0, scale: 0.8 })} className="w-10 h-10 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-white"><Maximize size={18}/></button>
            </div>
            
            {/* INSPECTION HUD (VARIATION CONTROLS) */}
            {selectedImage && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 z-[200] transition-all animate-in slide-in-from-bottom-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <button 
                        onClick={() => handleExport()} 
                        className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border border-white/10 transition-all active:scale-95 flex items-center gap-2" 
                        title="Export Local"
                    >
                        <Download size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Export UHD</span>
                    </button>
                    <button 
                        onClick={() => onStash(selectedImage)} 
                        className="p-3 bg-white/5 hover:bg-purple-600 text-white rounded-xl border border-white/10 transition-all active:scale-95" 
                        title="Stash to Library"
                    >
                        <Archive size={18} />
                    </button>
                    
                    <div className="h-8 w-px bg-white/10 mx-2" />
                    
                    <button 
                        onClick={handleUseAsSource}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-lg border border-white/10"
                        title="Hasil generate bisa di brush ulang (Iterative editing)"
                    >
                        <Edit3 size={18} /> CONTINUE EDITING
                    </button>
                    
                    <div className="h-8 w-px bg-white/10 mx-2" />
                    
                    <button onClick={() => { onApply(selectedImage); onClose(); }} className="px-8 py-3 bg-white text-black rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">APPLY TO BOARD</button>
                    
                    <div className="h-8 w-px bg-white/10 mx-2" />
                    
                    <button onClick={(e) => handleDeleteHistoryItem(selectedImage, e)} className="p-3 bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/30 transition-all active:scale-95" title="Trash Variation"><Trash2 size={18} /></button>
                    <button onClick={() => setSelectedImage(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all" title="Back to Inpaint Stage"><ArrowLeft size={18} /></button>
                </div>
            )}

            {/* DIRECTIVE BOX */}
            {!selectedImage && sourceImage && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-[2rem] flex flex-col gap-3 shadow-2xl z-50">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={10} className="text-purple-500" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Logic Intake</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleUndoMask} disabled={maskUndoStack.length === 0} className="text-[8px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-30"><Undo2 size={10} /> Undo Alpha</button>
                            <button onClick={clearMask} className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><Trash2 size={10} /> Purge Alpha</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1 group">
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Neural directive: Jelaskan detail kontekstual area yang ditandai..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] font-medium text-white focus:outline-none focus:border-purple-500/50 resize-none h-20 transition-all shadow-inner"
                            />
                            <button 
                                onClick={handleRefinePrompt} 
                                disabled={isRefining || !prompt.trim()} 
                                className="absolute bottom-3 right-3 p-1.5 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg shadow-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0"
                                title="Expand to Technical Context"
                            >
                                {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT RAIL: VARIATION REGISTRY */}
        <div className="w-[220px] bg-[#0a0a0a] border-l border-white/10 flex flex-col shrink-0 overflow-hidden relative">
            <div className="p-5 border-b border-white/5 bg-black flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={14} className="text-purple-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">History</span>
                </div>
                {history.length > 0 && (
                    <button 
                        onClick={() => { if(window.confirm("Purge variations?")) setHistory([]); setSelectedImage(null); }} 
                        className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors rounded-lg"
                        title="Purge All Variations"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto studio-scrollbar p-3 space-y-3">
                {history.length > 0 ? (
                    history.map((src, i) => (
                        <div 
                            key={i} 
                            onClick={() => { 
                                setSelectedImage(src); 
                                setViewState({x:0, y:0, scale: 0.8}); 
                            }}
                            className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${selectedImage === src ? 'border-purple-500 ring-4 ring-purple-500/10 scale-[1.02] shadow-2xl z-10' : 'border-white/5 hover:border-white/20'}`}
                        >
                            <img src={src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleExport(src); }} className="p-2 bg-white/20 hover:bg-white text-black rounded-lg backdrop-blur-md transition-all active:scale-90"><Download size={12} /></button>
                                <button onClick={(e) => handleDeleteHistoryItem(src, e)} className="p-2 bg-red-500/20 hover:bg-red-600 text-white rounded-lg backdrop-blur-md transition-all active:scale-90"><Trash2 size={12} /></button>
                            </div>
                            {selectedImage === src && (
                                <div className="absolute top-2 right-2 p-1 bg-purple-500 text-white rounded-md shadow-lg pointer-events-none border border-white/20"><Check size={10} strokeWidth={4} /></div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-20 gap-4">
                        <Box size={40} strokeWidth={1} />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-relaxed">No variations<br/>synthesized yet</span>
                    </div>
                )}
            </div>
            <div className="p-4 bg-black/60 border-t border-white/5 text-center">
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none">Nodes Count: {history.length}</span>
            </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
            const r = new FileReader();
            r.onload = (ev) => {
                setSourceImage(ev.target?.result as string);
                setSelectedImage(null);
                clearMask();
            };
            r.readAsDataURL(e.target.files[0]);
        }
      }} className="hidden" />
    </div>
  );
};