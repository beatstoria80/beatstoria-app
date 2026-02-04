
import React, { useState, useRef, useEffect } from 'react';
import { 
  Loader2, Image as ImageIcon, Zap, Trash2, 
  Plus, Library, History, ArrowDownCircle,
  CheckCircle2, FolderHeart, LayoutGrid, Layers, 
  Flame, MonitorUp, Scissors, Tag as TagIcon, ArrowRight,
  ShieldCheck,
  Eraser,
  Wand2,
  Bandage,
  Film
} from 'lucide-react';
import { AppConfig, ImageLayer, StashAsset } from '../../types';
import { BLEND_MODES, DEFAULT_EFFECTS } from '../../constants';

interface AssetEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
  onSelectLayer: (id: string | null) => void;
  onOpenBgRemover?: (src?: string) => void;
  onOpenNanoUpscaler?: (src?: string) => void;
  onOpenNanoGen?: (src?: string) => void;
  onOpenRetouch?: (src?: string) => void;
  onOpenStory?: (src?: string) => void;
}

export const AssetEngine: React.FC<AssetEngineProps> = ({ 
    config, setConfig, selectedId, onSelectLayer, 
    onOpenBgRemover, onOpenNanoUpscaler, onOpenNanoGen, onOpenRetouch, onOpenStory
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'tag'>('image');
  const [isSyncing, setIsSyncing] = useState(false);
  const universalInputRef = useRef<HTMLInputElement>(null);
  
  const temporaryAssets = (config.stash || []).filter(a => !a.backup);
  const libraryAssets = (config.stash || []).filter(a => a.backup);

  useEffect(() => {
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [config.stash?.length]);

  const handleUniversalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                const src = ev.target.result as string;
                const newAsset: StashAsset = {
                    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    src,
                    name: file.name,
                    backup: false,
                    timestamp: Date.now()
                };
                setConfig(prev => ({ ...prev, stash: [newAsset, ...(prev.stash || [])] }), false);
            }
        };
        reader.readAsDataURL(file);
    });
    if (universalInputRef.current) universalInputRef.current.value = '';
  };

  const promoteToLibrary = (id: string) => {
      setConfig(prev => ({
          ...prev,
          stash: (prev.stash || []).map(a => a.id === id ? { ...a, backup: true } : a)
      }), true);
  };

  const addAssetToCanvas = (src: string, autoFX: boolean = false) => {
    const img = new Image();
    img.onload = () => {
      const containerW = config.canvas.width;
      const containerH = config.canvas.height;
      const maxWidth = containerW * 0.7;
      const maxHeight = containerH * 0.7;
      
      let width = img.naturalWidth || 600;
      let height = img.naturalHeight || 600;
      const ratio = width / height;

      if (width > maxWidth) {
        width = maxWidth;
        height = width / ratio;
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }

      const newId = `image-${Date.now()}`;
      const newLayer: ImageLayer = {
        id: newId, src, position_x: containerW / 2, position_y: containerH / 2,
        width, height, rotation: 0, locked: false, hidden: false, opacity: 1, 
        blend_mode: 'normal', effects_enabled: autoFX, effects: { ...DEFAULT_EFFECTS }
      };
      setConfig(prev => ({ 
          ...prev, 
          image_layers: [...prev.image_layers, newLayer], 
          layerOrder: [...prev.layerOrder, newId] 
      }));
      onSelectLayer(newId);
    };
    img.src = src;
  };

  const discardAsset = (id: string) => {
      setConfig(prev => ({
          ...prev,
          stash: (prev.stash || []).filter(a => a.id !== id)
      }), false);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn custom-scrollbar overflow-y-auto pb-32">
      
      <div className="p-4 bg-white border-b border-slate-50 space-y-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] leading-none">NEURAL ASSET HUB</label>
              <div className="flex items-center gap-1.5 mt-1">
                {isSyncing ? <Loader2 size={8} className="text-indigo-500 animate-spin" /> : <div className="w-1 h-1 bg-green-500 rounded-full"></div>}
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">v3.2 FLOW READY</span>
              </div>
            </div>
            <button 
              onClick={() => universalInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
            >
                <Plus size={14} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-widest">Inject File</span>
            </button>
            <input type="file" ref={universalInputRef} onChange={handleUniversalUpload} className="hidden" multiple accept="image/*" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Neural Staging <span className="text-red-400/50">(Buffer)</span></span>
              </div>
              <span className="text-[8px] font-bold text-slate-300 uppercase">{temporaryAssets.length} In-Buffer</span>
          </div>

          <div className="grid grid-cols-2 gap-3 min-h-[160px] p-4 bg-red-50/20 border-2 border-dashed border-red-100 rounded-[2rem] transition-all hover:bg-red-50/40 custom-scrollbar">
              {temporaryAssets.map((asset) => (
                  <div key={asset.id} className="relative aspect-square bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm group/card animate-in zoom-in duration-300">
                      <img src={asset.src} className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-all" />
                      
                      <div className="absolute inset-0 bg-red-900/80 backdrop-blur-[2px] opacity-0 group-hover/card:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                          
                          {/* AI Quick Actions Row */}
                          <div className="flex gap-2 mb-1 translate-y-2 group-hover/card:translate-y-0 transition-transform delay-75">
                              <button 
                                onClick={() => onOpenBgRemover?.(asset.src)} 
                                className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-100 hover:bg-purple-500 hover:text-white flex items-center justify-center transition-all active:scale-95 group/btn"
                                title="BG Purge"
                              >
                                  <Scissors size={12} />
                              </button>
                              <button 
                                onClick={() => onOpenRetouch?.(asset.src)} 
                                className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-100 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all active:scale-95 group/btn"
                                title="Retouch / Heal"
                              >
                                  <Bandage size={12} />
                              </button>
                          </div>

                          <button 
                            onClick={() => addAssetToCanvas(asset.src)} 
                            className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                            title="Direct Inject"
                          >
                              <Plus size={20} strokeWidth={3} />
                          </button>
                          
                          <div className="flex gap-1.5 translate-y-2 group-hover/card:translate-y-0 transition-transform delay-100">
                              <button 
                                onClick={() => promoteToLibrary(asset.id)}
                                className="w-7 h-7 rounded-lg bg-green-500 text-white flex items-center justify-center hover:bg-green-400 transition-all active:scale-90"
                                title="Promote to Library"
                              >
                                  <ArrowDownCircle size={14} strokeWidth={2.5} />
                              </button>
                              <button 
                                onClick={() => discardAsset(asset.id)}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all active:scale-90"
                              >
                                  <Trash2 size={14} />
                              </button>
                          </div>
                      </div>
                  </div>
              ))}
              {temporaryAssets.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center gap-3 py-16 transition-all opacity-40 grayscale">
                      <History size={24} className="text-slate-400" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-center text-slate-400">
                          BUFFER VACUUM<br/>WAITING FOR FILE INJECTION
                      </span>
                  </div>
              )}
          </div>
      </div>

      <div className="mx-8 h-px bg-slate-100" />

      <div className="px-4 py-6 space-y-5">
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">Creative Repository <span className="text-green-500/50">(Library)</span></span>
              </div>
              <div className="flex items-center gap-2">
                 <button onClick={() => setActiveTab('image')} className={`p-1.5 rounded-lg transition-all ${activeTab === 'image' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}><LayoutGrid size={12} /></button>
                 <button onClick={() => setActiveTab('tag')} className={`p-1.5 rounded-lg transition-all ${activeTab === 'tag' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}><TagIcon size={12} /></button>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 min-h-[300px] p-2">
              {libraryAssets.map((asset) => (
                  <div key={asset.id} className="group relative aspect-square rounded-2xl border border-green-100 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer">
                      <img src={asset.src} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      
                      <div className="absolute top-2 left-2 flex gap-1">
                          <div className="px-1.5 py-0.5 rounded-md bg-green-500/90 backdrop-blur-md text-[6px] font-black text-white uppercase tracking-widest flex items-center gap-1 shadow-lg border border-white/20">
                              <ShieldCheck size={7} /> VERIFIED
                          </div>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                          <button 
                            onClick={() => addAssetToCanvas(asset.src)}
                            className="bg-white text-slate-900 p-2.5 rounded-full shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
                          >
                              <Plus size={20} strokeWidth={3} />
                          </button>
                          <div className="flex gap-1.5 translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                              <button onClick={() => addAssetToCanvas(asset.src, true)} className="w-8 h-8 rounded-xl bg-yellow-500 text-white flex items-center justify-center hover:bg-yellow-400 shadow-lg" title="Inject + FX"><Zap size={14} fill="currentColor" /></button>
                              <button onClick={() => discardAsset(asset.id)} className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"><Trash2 size={14} /></button>
                          </div>
                      </div>
                  </div>
              ))}

              {libraryAssets.length === 0 && (
                  <div className="col-span-2 py-16 flex flex-col items-center justify-center gap-4 text-slate-200 border-2 border-dashed border-slate-50 rounded-[2.5rem]">
                      <FolderHeart size={40} strokeWidth={1} />
                      <div className="text-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] block">Library Empty</span>
                        <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-1">Classify assets from Buffer to save permanently</p>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
