import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Loader2, Image as ImageIcon, Plus, Sparkles, RotateCcw, Eye, Activity, Maximize, Hand, ZoomIn, ZoomOut, Scissors, Archive, Trash2, Sliders, History, CheckCircle2, Download, Square, Circle, Lasso, Undo2, Upload, Paintbrush, MousePointer2, Eraser, Target, Move, Wand2, MessageSquare, ChevronDown, Layout, Flame, Bandage, Film, Pentagon, Droplets, Check, Library, ArrowDownToLine, ArrowRight, Menu, Cloud } from 'lucide-react';
import { inpaintLocal } from '../../services/localInpaintService';
import { neuralHeal } from '../../services/geminiService';
import { downloadBlob } from '../../services/exportService';

interface NeuralRetouchStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  initialImage?: string | null;
  onOpenCooking?: () => void;
  onOpenTitanFill?: () => void;
  onOpenPurgeBg?: () => void;
  onOpenStory?: () => void;
}

type ActiveTool = 'brush' | 'hand' | 'rect' | 'poly' | 'lasso' | 'heal';
type EngineMode = 'local' | 'cloud';

export const NeuralRetouchStudio: React.FC<NeuralRetouchStudioProps> = ({ 
    isOpen, onClose, onApply, onStash, initialImage,
    onOpenCooking, onOpenTitanFill, onOpenPurgeBg, onOpenStory
}) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [workingImage, setWorkingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  
  const AUTO_ITERATIONS = 1600; 
  const [brushSize, setBrushSize] = useState(35);
  const [healStrength, setHealStrength] = useState(100); 

  const [engineMode, setEngineMode] = useState<EngineMode>('cloud'); 
  const [activeTool, setActiveTool] = useState<ActiveTool>('heal');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [hasMaskContent, setHasMaskContent] = useState(false);
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 0.8 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  
  const drawStartCoords = useRef({ x: 0, y: 0 });
  const polyPoints = useRef<{x: number, y: number}[]>([]);
  const currentMousePos = useRef({ x: 0, y: 0 });

  const MASK_COLOR = 'rgba(99, 102, 241, 0.4)'; 
  const SELECTION_STROKE = 'rgba(255, 255, 255, 1)';

  const stopPropagation = (e: React.MouseEvent | React.KeyboardEvent | React.TouchEvent) => { e.stopPropagation(); };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
        if (e.key === 'b') setActiveTool('brush');
        if (e.key === 'h') setActiveTool('hand');
        if (e.key === 'm') setActiveTool('rect');
        if (e.key === 'l') setActiveTool('lasso');
        if (e.key === 'p') setActiveTool('poly');
        if (e.key === 'j') setActiveTool('heal');
        if (e.key === 'Escape') { clearMask(); }
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, hasMaskContent, activeTool, history, historyIndex]);

  useEffect(() => {
    if (isOpen) {
        if (initialImage) {
            setSourceImage(initialImage);
            setWorkingImage(initialImage);
            setHistory([initialImage]);
            setHistoryIndex(0);
        } else {
            setSourceImage(null);
            setWorkingImage(null);
            setHistory([]);
            setHistoryIndex(-1);
        }
        clearMask();
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

  if (!isOpen) return null;

  const clearMask = () => {
      const mask = maskCanvasRef.current;
      const temp = tempCanvasRef.current;
      if (mask && temp) {
          mask.getContext('2d')?.clearRect(0, 0, mask.width, mask.height);
          temp.getContext('2d')?.clearRect(0, 0, temp.width, temp.height);
          setHasMaskContent(false);
          polyPoints.current = [];
      }
  };

  const handleReset = () => {
      if (hasMaskContent || polyPoints.current.length > 0) clearMask();
      else if (sourceImage && workingImage !== sourceImage) { 
          setWorkingImage(sourceImage); 
          setHistory([sourceImage]); 
          setHistoryIndex(0); 
          clearMask();
      }
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setWorkingImage(history[newIndex]);
          setHistoryIndex(newIndex);
          clearMask();
      }
  };

  const addToHistory = (newImage: string) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newImage);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        if (ev.target?.result) {
            const src = ev.target.result as string;
            setWorkingImage(src);
            setSourceImage(src);
            setHistory([src]);
            setHistoryIndex(0);
            clearMask();
            setViewState({ x: 0, y: 0, scale: 0.8 });
        }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
    }
  };

  const getCoordinates = (e: any) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX || e.touches?.[0].clientX;
      const clientY = e.clientY || e.touches?.[0].clientY;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: any) => {
      if (isSpacePressed || e.button === 1 || activeTool === 'hand') { startPan(e); return; }
      if (showOriginal || isProcessing || !workingImage) return;
      
      const coords = getCoordinates(e);
      drawStartCoords.current = coords;
      currentMousePos.current = coords;
      
      if (activeTool === 'poly') { polyPoints.current.push(coords); drawPolyUI(); return; }
      
      setIsDrawing(true);
      if (activeTool === 'brush' || activeTool === 'heal') {
          const mCtx = maskCanvasRef.current?.getContext('2d');
          if (mCtx) {
              mCtx.beginPath(); mCtx.moveTo(coords.x, coords.y);
              mCtx.lineCap = 'round'; mCtx.lineJoin = 'round';
              mCtx.strokeStyle = MASK_COLOR; mCtx.lineWidth = brushSize / viewState.scale;
          }
      } else if (activeTool === 'lasso') {
          const tCtx = tempCanvasRef.current?.getContext('2d');
          if (tCtx) { tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height); tCtx.beginPath(); tCtx.moveTo(coords.x, coords.y); tCtx.strokeStyle = SELECTION_STROKE; tCtx.lineWidth = 2 / viewState.scale; }
      }
  };

  const draw = (e: any) => {
      const coords = getCoordinates(e);
      currentMousePos.current = coords;
      if (isPanning) { handlePan(e); return; }
      if (activeTool === 'poly') { drawPolyUI(); return; }
      if (!isDrawing) return;
      const mCtx = maskCanvasRef.current?.getContext('2d');
      const tCtx = tempCanvasRef.current?.getContext('2d');
      if (!mCtx || !tCtx) return;
      if (activeTool === 'brush' || activeTool === 'heal') { mCtx.lineTo(coords.x, coords.y); mCtx.stroke(); }
      else if (activeTool === 'rect') {
          tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height);
          tCtx.fillStyle = MASK_COLOR; tCtx.strokeStyle = SELECTION_STROKE; tCtx.lineWidth = 1 / viewState.scale;
          const x = Math.min(drawStartCoords.current.x, coords.x); const y = Math.min(drawStartCoords.current.y, coords.y);
          const w = Math.abs(drawStartCoords.current.x - coords.x); const h = Math.abs(drawStartCoords.current.y - coords.y);
          tCtx.fillRect(x, y, w, h); tCtx.strokeRect(x, y, w, h);
      } else if (activeTool === 'lasso') { tCtx.lineTo(coords.x, coords.y); tCtx.stroke(); }
  };

  const endDrawing = () => {
      if (isPanning) { setIsPanning(false); return; }
      if (!isDrawing || activeTool === 'poly') return;
      setIsDrawing(false);
      const mCtx = maskCanvasRef.current?.getContext('2d');
      const tCtx = tempCanvasRef.current?.getContext('2d');
      if (!mCtx || !tCtx) return;
      if (activeTool === 'brush' || activeTool === 'heal') { setHasMaskContent(true); }
      else if (activeTool === 'rect') {
          mCtx.fillStyle = MASK_COLOR;
          const x = Math.min(drawStartCoords.current.x, currentMousePos.current.x); const y = Math.min(drawStartCoords.current.y, currentMousePos.current.y);
          const w = Math.abs(drawStartCoords.current.x - currentMousePos.current.x); const h = Math.abs(drawStartCoords.current.y - currentMousePos.current.y);
          mCtx.fillRect(x, y, w, h); tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height); setHasMaskContent(true);
      } else if (activeTool === 'lasso') {
          tCtx.lineTo(drawStartCoords.current.x, drawStartCoords.current.y); tCtx.closePath(); tCtx.fillStyle = MASK_COLOR; tCtx.fill();
          mCtx.drawImage(tempCanvasRef.current!, 0, 0); tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height); setHasMaskContent(true);
      }
  };

  const drawPolyUI = () => {
      const tCtx = tempCanvasRef.current?.getContext('2d');
      if (!tCtx) return;
      tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height);
      if (polyPoints.current.length === 0) return;
      tCtx.beginPath(); tCtx.moveTo(polyPoints.current[0].x, polyPoints.current[0].y);
      polyPoints.current.forEach(p => tCtx.lineTo(p.x, p.y)); tCtx.lineTo(currentMousePos.current.x, currentMousePos.current.y);
      tCtx.strokeStyle = SELECTION_STROKE; tCtx.lineWidth = 2 / viewState.scale; tCtx.stroke();
  };

  const closePolygon = () => {
    const mCtx = maskCanvasRef.current?.getContext('2d');
    const tCtx = tempCanvasRef.current?.getContext('2d');
    if (!mCtx || !tCtx || polyPoints.current.length < 3) return;
    mCtx.beginPath(); mCtx.moveTo(polyPoints.current[0].x, polyPoints.current[0].y);
    polyPoints.current.forEach(p => mCtx.lineTo(p.x, p.y)); mCtx.closePath();
    mCtx.fillStyle = MASK_COLOR; mCtx.fill();
    tCtx.clearRect(0, 0, tCtx.canvas.width, tCtx.canvas.height);
    polyPoints.current = []; setHasMaskContent(true);
  };

  const startPan = (e: any) => { setIsPanning(true); const clientX = e.clientX || e.touches?.[0].clientX; const clientY = e.clientY || e.touches?.[0].clientY; panStartRef.current = { x: clientX - viewState.x, y: clientY - viewState.y }; };

  const handlePan = (e: any) => { if (!isPanning) return; const clientX = e.clientX || e.touches?.[0].clientX; const clientY = e.clientY || e.touches?.[0].clientY; setViewState(prev => ({ ...prev, x: clientX - panStartRef.current.x, y: clientY - panStartRef.current.y })); };

  const executeSynthesis = async () => {
    if (!maskCanvasRef.current || !workingImage || !hasMaskContent) return;
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
        const maskData = finalMaskCanvas.toDataURL('image/png');

        let result: string;
        if (engineMode === 'local') {
            result = await inpaintLocal(workingImage, maskData, { passes: AUTO_ITERATIONS });
        } else {
            result = await neuralHeal(workingImage, maskData);
        }
        
        setWorkingImage(result); 
        addToHistory(result); 
        clearMask();
    } catch (err) { 
        alert("Neural Synthesis failed. Check your connection or API Key."); 
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleExportMedia = () => { if (!workingImage) return; downloadBlob(workingImage, `retouch_${Date.now()}.png`); };

  const protocols = [
    { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16}/>, desc: 'Visual Workspace', active: false, onClick: onClose },
    { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16}/>, desc: 'Cooking Engine', active: false, onClick: onOpenCooking },
    { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16}/>, desc: 'Generative Inpaint', active: false, onClick: onOpenTitanFill },
    { id: 'purge', label: 'Purge BG', icon: <Scissors size={16}/>, desc: 'Neural Extraction', active: false, onClick: onOpenPurgeBg },
    { id: 'retouch', label: 'Neural Retouch', icon: <Bandage size={16}/>, desc: 'Blemish Correction', active: true, onClick: () => setIsNavOpen(false) },
    { id: 'story', label: 'Story Flow', icon: <Film size={16}/>, desc: 'Campaign Designer', active: false, onClick: onOpenStory },
  ];

  return (
    <div className="fixed inset-0 z-[5000] bg-[#050505] flex flex-col font-sans select-none overflow-hidden text-slate-200 animate-in fade-in duration-300">
      
      {/* HEADER HUD */}
      <div className="h-16 border-b border-white/10 bg-black flex items-center justify-between px-8 shrink-0 z-[100] overflow-visible" onMouseDown={stopPropagation}>
        <div className="flex items-center gap-12 relative" ref={navRef}>
            <button onClick={() => setIsNavOpen(!isNavOpen)} className="flex items-center gap-4 hover:bg-white/5 px-3 py-2 rounded-xl transition-all group active:scale-95 border-r border-white/10 pr-10">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <Bandage size={20} fill="white" />
                </div>
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Neural Retouch</span>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isNavOpen ? 'rotate-180 text-white' : ''}`} />
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
                            <button key={p.id} onClick={p.onClick} className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${p.active ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${p.active ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>{p.icon}</div>
                                <div className="flex flex-col"><span className={`text-[11px] font-black uppercase tracking-widest ${p.active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{p.label}</span><span className="text-[8px] font-bold text-slate-500 uppercase truncate">{p.desc}</span></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-12">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">SIZE</span><span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">RADIUS</span></div>
                    <div className="flex items-center gap-5"><input type="range" min="2" max="150" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-28 h-0.5 bg-white/10 appearance-none cursor-pointer accent-indigo-500" /><div className="px-3 py-1.5 bg-black border border-white/10 rounded-md min-w-[55px] text-center"><span className="text-[11px] font-mono font-black text-indigo-400">{brushSize}px</span></div></div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">ENGINE</span><span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">PROTOCOL</span></div>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button 
                            onClick={() => setEngineMode('local')}
                            className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${engineMode === 'local' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Zap size={10} /> Local
                        </button>
                        <button 
                            onClick={() => setEngineMode('cloud')}
                            className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${engineMode === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <Cloud size={10} /> Neural Cloud
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-8">
             <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-white text-[12px] font-black uppercase tracking-widest">CANCEL</button>
             <button onClick={handleExportMedia} disabled={!workingImage} className="px-8 py-3 rounded-xl font-black text-[12px] uppercase tracking-[0.2em] transition-all bg-white text-black hover:bg-slate-100 flex items-center gap-3 disabled:opacity-30">
                <ArrowDownToLine size={14} strokeWidth={4} />
                <span>EXPORT LOCAL</span>
             </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR TOOLS */}
        <div className="w-[180px] bg-black border-r border-white/5 flex flex-col py-6 gap-2 z-50 overflow-y-auto custom-scrollbar" onMouseDown={stopPropagation}>
            <div className="px-4 space-y-1">
                <button onClick={() => setActiveTool('hand')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'hand' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5'}`}>
                    <MousePointer2 size={16} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Pointer</span>
                </button>
            </div>
            <div className="px-4 mt-6 space-y-1">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block px-1 mb-2">Retouch Tools</span>
                <button onClick={() => setActiveTool('brush')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'brush' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}><Paintbrush size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Brush</span></button>
                <button onClick={() => setActiveTool('heal')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'heal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}><Bandage size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Heal</span></button>
            </div>
            <div className="px-4 mt-6 space-y-1">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block px-1 mb-2">Selection</span>
                <button onClick={() => setActiveTool('rect')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'rect' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}><Square size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Marquee</span></button>
                <button onClick={() => setActiveTool('lasso')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'lasso' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}><Lasso size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Lasso</span></button>
                <button onClick={() => setActiveTool('poly')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTool === 'poly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}><Pentagon size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Polygon</span></button>
            </div>
            <div className="px-4 mt-auto space-y-2">
                <button onClick={handleReset} className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><RotateCcw size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Reset</span></button>
                <button onClick={() => { setWorkingImage(null); setSourceImage(null); clearMask(); }} className="w-full flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /><span className="text-[8px] font-black uppercase tracking-widest">Clear</span></button>
            </div>
        </div>

        {/* WORKSPACE AREA */}
        <div 
          className={`flex-1 bg-[#111111] relative overflow-hidden flex items-center justify-center ${activeTool === 'hand' || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'} ${isDraggingFile ? 'ring-4 ring-indigo-500 ring-inset bg-indigo-500/5' : ''}`} 
          onMouseDown={startDrawing} 
          onMouseMove={draw} 
          onMouseUp={endDrawing}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleFileDrop}
        >
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px', transform: `translate(${viewState.x % 100}px, ${viewState.y % 100}px)` }} />
            
            {!workingImage ? (
                <div 
                  onClick={() => { if(fileInputRef.current) fileInputRef.current.click(); }} 
                  className="group w-[500px] aspect-video border-4 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-700"
                >
                    <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl border border-white/5"><ImageIcon size={40} /></div>
                    <div className="text-center"><span className="text-[14px] font-black uppercase tracking-[0.5em] text-white">IMPORT MEDIA</span><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Blemish Removal Protocol</p></div>
                </div>
            ) : (
                <div className="relative group/stage will-change-transform" style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})` }}>
                    <div className="relative shadow-[0_100px_200px_-50px_rgba(0,0,0,1)] border border-white/10 rounded-sm overflow-hidden bg-black/20" style={{ isolation: 'isolate' }}>
                        {/* REPLACEMENT: Standard img tag instead of drawing to canvas for stability */}
                        <img 
                            src={workingImage} 
                            className="block max-w-none pointer-events-none" 
                            style={{ 
                                opacity: showOriginal ? 0.3 : 1, 
                                filter: showOriginal ? 'grayscale(1)' : 'none',
                                transform: 'translate3d(0,0,0)'
                            }} 
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                if (maskCanvasRef.current && (maskCanvasRef.current.width !== img.naturalWidth || maskCanvasRef.current.height !== img.naturalHeight)) {
                                    maskCanvasRef.current.width = img.naturalWidth;
                                    maskCanvasRef.current.height = img.naturalHeight;
                                }
                                if (tempCanvasRef.current && (tempCanvasRef.current.width !== img.naturalWidth || tempCanvasRef.current.height !== img.naturalHeight)) {
                                    tempCanvasRef.current.width = img.naturalWidth;
                                    tempCanvasRef.current.height = img.naturalHeight;
                                }
                            }}
                        />
                        <canvas ref={maskCanvasRef} className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none opacity-80" />
                        <canvas ref={tempCanvasRef} className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none opacity-0" />
                    </div>
                </div>
            )}

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8 z-50" onMouseDown={stopPropagation}>
                {historyIndex > 0 && <button onClick={handleUndo} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-all"><Undo2 size={20} /></button>}
                {activeTool === 'poly' && polyPoints.current.length >= 3 && <button onClick={closePolygon} className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all bg-white text-black hover:bg-slate-200 active:scale-95 shadow-xl border border-white flex items-center gap-2"><MousePointer2 size={14} /> Close Selection</button>}
                {hasMaskContent && !isProcessing && <button onClick={executeSynthesis} className="px-14 py-6 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] transition-all flex items-center gap-5 bg-indigo-600 text-white shadow-2xl border-2 border-indigo-400 hover:bg-indigo-50 hover:scale-105 active:scale-95 group overflow-hidden"><Zap size={22} fill="white" /><span>EXECUTE NEURAL HEAL</span></button>}
            </div>
            
            {workingImage && (
                <div className="absolute bottom-10 right-10 flex flex-col gap-2 z-50" onMouseDown={stopPropagation}>
                    <button onClick={() => setViewState(v => ({ ...v, scale: v.scale * 1.2 }))} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><ZoomIn size={20}/></button>
                    <button onClick={() => setViewState(v => ({ ...v, scale: v.scale / 1.2 }))} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><ZoomOut size={20}/></button>
                    <button onClick={() => setViewState({ x: 0, y: 0, scale: 0.8 })} className="w-12 h-12 bg-black/60 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-white transition-all"><Maximize size={20}/></button>
                </div>
            )}

            {isProcessing && (
                <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center" onMouseDown={stopPropagation}>
                    <div className="flex flex-col items-center gap-6 bg-black border border-indigo-500/20 p-12 rounded-[3rem] shadow-2xl">
                        <Loader2 size={32} className="animate-spin text-indigo-400" />
                        <span className="text-[14px] font-black uppercase tracking-[0.4em] text-white">Synthesis Active</span>
                    </div>
                </div>
            )}
        </div>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp" 
      />
    </div>
  );
};