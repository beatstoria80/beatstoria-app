import React from 'react';
import { X, Zap, Activity, MessageSquare, Flame } from 'lucide-react';

interface StudioHeaderProps {
  onClose: () => void;
  showAiPanel: boolean;
  onToggleAiPanel: () => void;
}

// Custom Tungku (Furnace) Icon to match user reference image
const TungkuIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 8C5 6.89543 5.89543 6 7 6H17C18.1046 6 19 6.89543 19 8V9H5V8Z" fill="currentColor"/>
    <path d="M6 10H18V12C18 14.7614 15.7614 17 13 17H11C8.23858 17 6 14.7614 6 12V10Z" fill="currentColor"/>
    <path d="M9 17L7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 17L17 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 4H16V5C16 5.55228 15.5523 6 15 6H9C8.44772 6 8 5.55228 8 5V4Z" fill="currentColor"/>
  </svg>
);

export const StudioHeader: React.FC<StudioHeaderProps> = ({ onClose, showAiPanel, onToggleAiPanel }) => {
  return (
    <div className="h-14 border-b border-white/10 bg-black flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="relative flex items-center gap-2 bg-orange-500 p-1.5 rounded-lg shadow-lg shadow-orange-500/20 overflow-visible">
          {/* Smoke Particles */}
          <div className="smoke-trail scale-50" style={{ top: '-8px', left: '10%', animationDelay: '0.2s' }} />
          <div className="smoke-trail scale-75" style={{ top: '-12px', left: '40%', animationDelay: '1.1s' }} />
          <div className="smoke-trail scale-50" style={{ top: '-6px', left: '80%', animationDelay: '1.9s' }} />
          
          <TungkuIcon size={16} className="text-black relative z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-white">SPACE <span className="text-orange-500">STUDIO</span></span>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Neural Link Active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
            onClick={onToggleAiPanel}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${showAiPanel ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Neural Assistant"
        >
            <MessageSquare size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">AI Assistant</span>
        </button>

        <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold text-slate-400">
           <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
              <Activity size={10} className="text-purple-400" />
              <span>TPU: ACCELERATED</span>
           </div>
           <span>ENGINE: BEATSTORIA AI</span>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};