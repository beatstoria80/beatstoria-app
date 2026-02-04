
import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Upload, Check, Loader2, Image as ImageIcon, Plus, Download, ArrowRight, Trash2, Scan, MonitorCheck } from 'lucide-react';
import { upscaleImageLocal } from '../../services/bananaService';

interface NanoBananaStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (src: string) => void;
  onStash: (src: string) => void;
  initialImage?: string | null;
}

export const NanoBananaStudio: React.FC<NanoBananaStudioProps> = ({ isOpen, onClose, onApply, onStash, initialImage }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialImage) {
            setSourceImage(initialImage);
            setResultImage(null);
            setProgress(0);
        }
    } else {
        const timer = setTimeout(() => {
            setSourceImage(null);
            setResultImage(null);
            setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [isOpen, initialImage]);

  if (!isOpen) return null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match('image.*')) {
          alert("Only image files are supported.");
          return;
      }
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

  const startUpscale = async () => {
    if (!sourceImage) return;
    setIsProcessing(true);
    setProgress(1);
    try {
      const result = await upscaleImageLocal(sourceImage, (p) => setProgress(p));
      setResultImage(result);
    } catch (err) {
      console.error(err);
      alert("Nano Banana Upscale failed. See console.");
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

  return (
    <div className="absolute inset-0 z-[2060] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-6xl h-full max-h-[85vh] bg-[#050505] border border-yellow-500/20 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative ring-1 ring-yellow-500/10">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-black shadow-lg shadow-yellow-500/20">
              <Scan size={18} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.25em] text-white">Nano Banana <span className="text-yellow-500">Pro</span></span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Client-Side Super Resolution</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#050505] relative">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            
            {!sourceImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md aspect-video rounded-3xl border-2 border-dashed border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-yellow-400 transition-colors group-hover:scale-110 shadow-lg border border-white/5">
                  <Upload size={24} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">Import Low-Res Image</p>
                  <p className="text-[9px] font-medium text-slate-500">Supported: JPG, PNG, WEBP</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col md:flex-row gap-6 items-center justify-center">
                
                {/* Source */}
                <div className="flex-1 w-full h-full flex flex-col gap-3 min-h-0 relative group">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Native Input</span>
                    <button onClick={() => setSourceImage(null)} className="text-[8px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center gap-1">
                        <Trash2 size={10} /> Clear
                    </button>
                  </div>
                  <div className="relative flex-1 rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden shadow-lg">
                    <img src={sourceImage} className="w-full h-full object-contain pixelated" style={{ imageRendering: 'pixelated' }} />
                    {isProcessing && (
                       <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-10">
                          <div className="flex flex-col items-center gap-4 w-64">
                              <div className="w-16 h-16 relative flex items-center justify-center">
                                <div className="absolute inset-0 border-4 border-yellow-500/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
                                <Loader2 size={24} className="text-yellow-500 animate-pulse" />
                              </div>
                              <div className="w-full space-y-1 text-center">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Nano Processing {progress}%</span>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>
                          </div>
                       </div>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex flex-col items-center text-slate-700">
                    <ArrowRight size={24} className={isProcessing ? "animate-pulse text-yellow-500" : ""} />
                </div>

                {/* Result */}
                <div className="flex-1 w-full h-full flex flex-col gap-3 min-h-0">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    Nano Output {resultImage && <span className="text-yellow-500">2x Upscaled</span>}
                  </span>
                  <div className={`relative flex-1 rounded-2xl border bg-[#0f0f0f] overflow-hidden shadow-lg transition-all ${resultImage ? 'border-yellow-500/30' : 'border-white/10'}`}>
                    {resultImage ? (
                      <>
                        <img src={resultImage} className="w-full h-full object-contain animate-in fade-in zoom-in duration-700" />
                        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-md rounded-lg flex items-center gap-2">
                          <MonitorCheck size={12} className="text-yellow-400" />
                          <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">HD Ready</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 gap-3">
                        <div className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                            <Zap size={18} className="opacity-20" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Awaiting Signal</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              {sourceImage && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                   <Zap size={10} className="text-yellow-500" />
                   <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TENSORFLOW.JS / WEBGL</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-3">
              {!resultImage ? (
                <button 
                  onClick={startUpscale}
                  disabled={!sourceImage || isProcessing}
                  className="group relative px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(253,224,71,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    {isProcessing ? 'Enhancing...' : 'Engage Nano Engine'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleFinish('stash')}
                    className="px-5 py-3 bg-white/5 text-slate-300 border border-white/10 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
                  >
                    Save to Asset Library
                  </button>
                  <button 
                    onClick={() => handleFinish('apply')}
                    className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Plus size={12} strokeWidth={3} /> Add to Canvas
                  </button>
                </>
              )}
           </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
      </div>
    </div>
  );
};
