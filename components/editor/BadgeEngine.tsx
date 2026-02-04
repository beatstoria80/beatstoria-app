import React from 'react';
import { AppConfig } from '../../types';
import { Tag, Zap, Shield, Wind, Droplets, Target, RotateCw, Maximize, Move } from 'lucide-react';
import { BADGE_PRESETS, DEFAULT_EFFECTS } from '../../constants';

interface BadgeEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
}

export const BadgeEngine: React.FC<BadgeEngineProps> = ({ config, setConfig }) => {
  const badge = config.badge || { badge_text: "PRO PERFORMANCE", badge_style: "flat", badge_position_x: 100, badge_position_y: 100, badge_size: 150, locked: false, hidden: true };

  const updateBadge = (updates: any, save = false) => {
    setConfig(prev => ({
      ...prev,
      badge: { ...(prev.badge || badge), ...updates }
    }), save);
  };

  const deployBadge = (src: string) => {
      const newId = `badge-${Date.now()}`;
      const newLayer = {
          id: newId,
          src: src,
          position_x: config.canvas.width / 2 - 75,
          position_y: config.canvas.height / 2 - 75,
          width: 150,
          height: 150,
          rotation: 0,
          locked: false,
          hidden: false,
          effects: { ...DEFAULT_EFFECTS }
      };
      setConfig(prev => ({
          ...prev,
          image_layers: [...prev.image_layers, newLayer],
          layerOrder: [...prev.layerOrder, newId]
      }), true);
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn pb-32 overflow-y-auto custom-scrollbar">
       <div className="p-4 border-b border-slate-50 bg-slate-900">
          <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <Tag size={18} />
              </div>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white uppercase tracking-tight">BADGE ENGINE</span>
                  <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest mt-1">PRODUCT LABELS V2.0</span>
              </div>
          </div>
       </div>

       <div className="p-5 space-y-8">
            <div className="space-y-4">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Preserved Presets</span>
                <div className="grid grid-cols-3 gap-2">
                    {BADGE_PRESETS.map((src, idx) => (
                        <button 
                            key={idx}
                            onClick={() => deployBadge(src)}
                            className="aspect-square bg-slate-50 border border-slate-100 rounded-xl p-3 hover:border-indigo-400 hover:bg-white transition-all group active:scale-95 shadow-sm"
                        >
                            <img src={src} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Wind size={10}/> Technical Labels</span>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: "ULTRA DRY", icon: <Droplets size={12}/> },
                        { label: "AERO-TECH", icon: <Wind size={12}/> },
                        { label: "DURA-SHELL", icon: <Shield size={12}/> },
                        { label: "NEURAL FIT", icon: <Zap size={12}/> }
                    ].map((item, i) => (
                        <button key={i} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-400 transition-all text-left group">
                            <div className="text-slate-400 group-hover:text-indigo-600">{item.icon}</div>
                            <span className="text-[7px] font-black text-slate-600 group-hover:text-indigo-900 uppercase tracking-wider">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
       </div>
    </div>
  );
};