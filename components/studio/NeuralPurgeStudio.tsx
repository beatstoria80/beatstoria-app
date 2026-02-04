import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Upload, Check, Loader2, Image as ImageIcon, Plus, Download, History, Sparkles, Scissors, ArrowRight, Trash2, Library, Ghost, ChevronDown, Layout, Flame, Wand2, Bandage, Film, Menu, Box, MonitorDown } from 'lucide-react';
import { removeBackgroundLocal } from '../../services/visionService';
import { StashAsset } from '../../types';
import { downloadBlob } from '../../services/exportService';

interface NeuralPurgeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  initialImage?: string | null;
  library?: StashAsset[];
  onOpenCooking?: () => void;
  onOpenTitanFill?: () => void;
  onOpenRetouch?: () => void;
  onOpenStory?: () => void;
}

export const NeuralPurgeStudio: React.FC<NeuralPurgeStudioProps> = ({ 
    isOpen, onClose, onApply, onStash, initialImage, library,
    onOpenCooking, onOpenTitanFill, onOpenRetouch, onOpenStory
}) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialImage) {
            setSourceImage(initialImage);
            setResultImage(null);
            setProgress(0);
        }
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSourceImage(ev.target.result as string);
          setResultImage(null);
          setProgress(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startPurge = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    setProgress(1);
    try {
      const result = await removeBackgroundLocal(sourceImage, (p) => setProgress(p));
      setResultImage(result);
      setHistory(prev => [result, ...prev]);
    } catch (err: any) {
      alert(err.message || "Neural Purge failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = (action: 'apply' | 'stash') => {
    if (!resultImage) return;
    if (action === 'apply') onApply(resultImage);
    else onStash(resultImage);
    onClose();
  };

  const handleExport = () => {
      if (resultImage) downloadBlob(resultImage, `purge_bg_${Date.now()}.png`);
  };

  const protocols = [
    { id: 'canvas', label: 'Space Canvas', icon: <Layout size={16}/>, desc: 'Visual Workspace', active: false, onClick: onClose },
    { id: 'cooking', label: 'Space Cooking', icon: <Flame size={16}/>, desc: 'Cooking Engine', active: false, onClick: onOpenCooking },
    { id: 'titan', label: 'Titan Fill', icon: <Wand2 size={16}/>, desc: 'Generative Inpaint', active: false, onClick: onOpenTitanFill },
    { id: 'purge', label: 'Purge BG', icon: <Scissors size={16}/>, desc: 'Neural Extraction', active: true, onClick: () => setIsNavOpen(false) },
    { id: 'retouch', label: 'Neural Retouch', icon: <Bandage size={16}/>, desc: 'Blemish Correction', active: false, onClick: onOpenRetouch },
    { id: 'story', label: 'Story Flow', icon: <Film size={16}/>, desc: 'Campaign Designer', active: false, onClick: onOpenStory },
  ];

  return (
    <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-6xl h-full max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative ring-1 ring-white/10">
        
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a] relative z-[100] overflow-visible">
          <div className="flex items-center gap-3 relative" ref={navRef}>
            <button 
                onClick={() => setIsNavOpen(!isNavOpen)}
                className="flex items-center gap-3 hover:bg-white/5 px-3 py-2 rounded-xl transition-all group active:scale-95"
            >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Scissors size={16} fill="white" />
                </div>
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Neural Purge</span>
                        <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 ${isNavOpen ? 'rotate-180 text-white' : ''}`} />
                    </div>
                </div>
            </button>

            {isNavOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl z-[200]">
                    <div className="p-3 bg-white/5 border-b border-white/5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Navigation Matrix</span>
                    </div>
                    <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {protocols.map(p => (
                            <button key={p.id} onClick={p.onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${p.active ? 'bg-indigo-600/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${p.active ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white'}`}>{p.icon}</div>
                                <div className="flex flex-col"><span className={`text-[10px] font-black uppercase tracking-widest ${p.active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{p.label}</span><span className="text-[7px] font-bold text-slate-500 uppercase truncate">{p.desc}</span></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#050505] relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            {!sourceImage ? (
              <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-md aspect-video rounded-3xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors group-hover:scale-110 shadow-lg border border-white/5"><ImageIcon size={28} /></div>
                <div className="text-center space-y-1"><p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">Import Source Image</p><p className="text-[9px] font-medium text-slate-500">Initialize background extraction protocol</p></div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row gap-6 items-center justify-center">
                <div className="flex-1 w-full h-full flex flex-col gap-3 min-h-0">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Input</span>
                  <div className="relative flex-1 rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden group shadow-lg">
                    <img src={sourceImage} className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-center text-slate-700"><ArrowRight size={24} /></div>

                <div className="flex-1 w-full h-full flex flex-col gap-3 min-h-0">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Result</span>
                  <div className="relative flex-1 rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden shadow-lg checkerboard-bg">
                    {resultImage ? (
                      <img src={resultImage} className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 gap-3">
                        {isProcessing ? <Loader2 size={32} className="animate-spin text-indigo-500" /> : <Sparkles size={18} className="opacity-20" />}
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-30">{isProcessing ? `Synthesizing ${progress}%` : 'Awaiting Extraction'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HISTORY RAIL */}
          <div className="w-[180px] bg-[#0a0a0a] border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
             <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">History</span>
                </div>
                {history.length > 0 && <button onClick={() => setHistory([])} className="p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-colors rounded-lg"><Trash2 size={14} /></button>}
             </div>
             <div className="flex-1 overflow-y-auto studio-scrollbar p-3 space-y-3">
                {history.length > 0 ? (
                    history.map((src, i) => (
                        <div key={i} onClick={() => setResultImage(src)} className={`group relative aspect-square rounded-xl border-2 transition-all cursor-pointer ${resultImage === src ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/5 hover:border-white/20'}`}>
                            <img src={src} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-20 gap-3">
                        <Box size={32} strokeWidth={1} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Empty</span>
                    </div>
                )}
             </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              {sourceImage && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                   <Zap size={10} className="text-indigo-400" />
                   <span className="text-[8px] font-bold text-indigo-300 uppercase tracking-wider">NEURAL U2NET ENGINE</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-3">
              {!resultImage || isProcessing ? (
                <button onClick={startPurge} disabled={!sourceImage || isProcessing} className="group relative px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">{isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Scissors size={12} />}{isProcessing ? 'PROCESSING...' : 'INITIALIZE PURGE'}</span>
                </button>
              ) : (
                <>
                  <button onClick={handleExport} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 flex items-center gap-2 transition-all shadow-lg active:scale-95" title="Export as PNG">
                    <MonitorDown size={16} /> EXPORT UHD
                  </button>
                  <div className="h-8 w-px bg-white/10 mx-1" />
                  <button onClick={() => handleFinish('stash')} className="px-5 py-3 bg-white/5 text-slate-300 border border-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all">Stash Asset</button>
                  <button onClick={() => handleFinish('apply')} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-2"><Plus size={12} strokeWidth={3} /> Inject Board</button>
                </>
              )}
           </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
      </div>
    </div>
  );
};