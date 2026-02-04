
import React from 'react';
import { Maximize2, MousePointer2, BoxSelect, Upload, Image as ImageIcon, Wand2, Loader2, RefreshCw } from 'lucide-react';

interface ComfyCanvasProps {
  activeTab: 'image' | 'video';
  setActiveTab: (t: 'image' | 'video') => void;
  originalImage: string | null;
  generatedImages: string[];
  isCompareMode: boolean;
  selectedResultIndex: number;
  scanResults: any[];
  isAnalyzing: boolean;
  isScanning: boolean;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isNodeActive: boolean;
  nodesToAdd: string[];
  onNodesAdded: () => void;
  promptText: string;
  setPromptText: (t: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  mode: string;
  setMode: (m: string) => void;
  onImageUpdate: (src: string) => void;
}

export const ComfyCanvas: React.FC<ComfyCanvasProps> = ({ 
  originalImage, generatedImages, isCompareMode, selectedResultIndex, isGenerating, isAnalyzing, fileInputRef 
}) => {
  return (
    <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center p-12">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <div className="relative w-full h-full max-w-5xl max-height-[80vh] flex items-center justify-center">
        
        {!originalImage && !isGenerating && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-[400px] aspect-square rounded-[40px] border-4 border-dashed border-white/5 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-700"
          >
             <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 border border-white/10 group-hover:bg-purple-500 group-hover:text-white">
                <ImageIcon size={32} />
             </div>
             <div className="text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-white">Initialize Vision</p>
                <p className="text-[9px] font-medium text-slate-500 max-w-[220px] leading-relaxed">Drop an image here or click to browse. Let AI analyze your subject for creative augmentation.</p>
             </div>
          </div>
        )}

        {(originalImage || isGenerating) && (
          <div className="relative w-full h-full flex items-center justify-center gap-8 px-8 transition-all duration-700">
            {/* Input Node */}
            <div className="relative flex-1 max-w-md aspect-square rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden group">
               {originalImage ? (
                 <img src={originalImage} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-purple-500" /></div>
               )}
               <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                  <span className="text-[7px] font-black uppercase tracking-widest text-white">Source Feed</span>
               </div>
            </div>

            {/* Neural Bridge Icon */}
            <div className="flex flex-col items-center gap-4 z-10 shrink-0">
               <div className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 ${isGenerating ? 'bg-purple-500 animate-pulse border-purple-400 rotate-180' : 'bg-black/50'}`}>
                  {isGenerating ? <RefreshCw className="animate-spin text-white" size={20} /> : <ArrowRight className="text-slate-500" size={20} />}
               </div>
               <div className="h-20 w-px bg-gradient-to-b from-purple-500/50 to-transparent"></div>
            </div>

            {/* Output Node */}
            <div className="relative flex-1 max-w-md aspect-square rounded-2xl border border-white/10 bg-black shadow-2xl overflow-hidden group">
               {isGenerating ? (
                 <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md relative z-20">
                    <div className="relative">
                       <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 animate-pulse"></div>
                       <Loader2 size={40} className="animate-spin text-purple-400" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-300">Synthesizing...</span>
                 </div>
               ) : (
                 generatedImages.length > 0 ? (
                   <img src={generatedImages[selectedResultIndex]} className="w-full h-full object-contain" />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                      <Wand2 size={48} className="opacity-10 mb-4" />
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Awaiting Generation</span>
                   </div>
                 )
               )}
               <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-white">AI Predicted</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
