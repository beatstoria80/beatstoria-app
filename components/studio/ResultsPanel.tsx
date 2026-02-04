
import React from 'react';
import { Grid, History, Plus, Download, Trash2, Check, ArrowRight, X } from 'lucide-react';

interface ResultsPanelProps {
  width: number;
  currentImages: string[];
  historyImages: string[];
  onApply: (src: string) => void;
  onUseAsInput: (src: string) => void;
  onAddToGallery: (src: string) => void;
  onRemoveBg: () => void;
  onDelete: (src: string, isHistory: boolean) => void;
  onAddNode: (src: string) => void;
  selectedResultIndex: number;
  setSelectedResultIndex: (i: number) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
  width, currentImages, historyImages, onApply, onUseAsInput, onDelete, selectedResultIndex, setSelectedResultIndex 
}) => {
  return (
    <div className="h-full bg-[#080808] border-l border-white/5 flex flex-col overflow-hidden transition-all shrink-0" style={{ width }}>
      <div className="p-5 flex flex-col h-full space-y-6">
        
        {/* CURRENT SESSION */}
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Grid size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Output</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-[8px] font-bold text-slate-600 uppercase">{currentImages.length} Ready</span>
                {currentImages.length > 0 && (
                    <button 
                        onClick={() => currentImages.forEach(src => onDelete(src, false))}
                        className="p-1 hover:bg-red-500/10 rounded text-slate-600 hover:text-red-500 transition-colors"
                        title="Clear All Results"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {currentImages.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {currentImages.map((src, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedResultIndex(i)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group animate-in fade-in zoom-in duration-300 ${selectedResultIndex === i ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <img src={src} className="w-full aspect-square object-cover" />
                    
                    {/* TRASH UI - Top Right Corner */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(src, false);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 z-20 backdrop-blur-md border border-white/10 hover:border-red-400 hover:scale-105 active:scale-95"
                        title="Delete Result"
                    >
                        <Trash2 size={14} />
                    </button>

                    {/* OVERLAY ACTIONS */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                       <button 
                        onClick={(e) => { e.stopPropagation(); onApply(src); }}
                        className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-400 shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                       >
                         <Plus size={12} strokeWidth={3} /> Apply
                       </button>
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedResultIndex === i && (
                        <div className="absolute bottom-3 left-3 px-2 py-1 bg-indigo-500 rounded text-[7px] font-black text-white uppercase tracking-widest pointer-events-none">
                            Active
                        </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4 px-8 text-center opacity-50">
                 <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5">
                    <Grid size={24} className="opacity-40" />
                 </div>
                 <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Generated visuals will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* RECENT HISTORY */}
        <div className="h-44 border-t border-white/5 pt-5 space-y-3 shrink-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
                <History size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Recent Cache</span>
            </div>
            {historyImages.length > 0 && (
                <button 
                    onClick={() => historyImages.forEach(src => onDelete(src, true))}
                    className="text-[8px] font-bold text-slate-600 hover:text-red-500 transition-colors uppercase tracking-wider"
                >
                    Clear History
                </button>
            )}
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 scroll-smooth h-full items-start">
             {historyImages.map((src, i) => (
               <div key={i} className="group relative w-20 aspect-square rounded-xl border border-white/10 shrink-0 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all opacity-60 hover:opacity-100" onClick={() => onUseAsInput(src)}>
                 <img src={src} className="w-full h-full object-cover" />
                 <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(src, true); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                 >
                    <X size={10} />
                 </button>
               </div>
             ))}
             {historyImages.length === 0 && <div className="w-full text-center py-8 text-[8px] font-bold text-slate-800 uppercase tracking-widest border border-dashed border-white/5 rounded-xl">No history available</div>}
          </div>
        </div>

      </div>
    </div>
  );
};
