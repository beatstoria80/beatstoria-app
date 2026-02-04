import React, { useState, useEffect } from 'react';
import { AppConfig } from '../../types';
import { GlobalAdjustmentEngine } from './GlobalAdjustmentEngine';
import { LayerEffectEngine } from './LayerEffectEngine';
import { Zap, Activity } from 'lucide-react';

interface FXEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
}

export const FXEngine: React.FC<FXEngineProps> = ({ config, setConfig, selectedId }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'local'>('global');

  // Sync active tab when selectedId changes - "Activate" Local if a specific layer is targeted
  useEffect(() => {
    if (!selectedId || selectedId === 'global-fx') {
        setActiveTab('global');
    } else {
        // If an image, text, or shape is selected, automatically switch to Local FX
        setActiveTab('local');
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn">
       {/* Navigation Header for FX */}
       <div className="flex p-2 bg-slate-50 border-b border-slate-100 shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'global' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
             <Activity size={12} /> Global Grading
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'local' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
             <Zap size={12} /> Local FX
          </button>
       </div>

       {/* Sub-Engines Content Area */}
       <div className="flex-1 overflow-hidden">
          {activeTab === 'global' ? (
              <GlobalAdjustmentEngine 
                config={config} 
                setConfig={setConfig} 
              />
          ) : (
              <LayerEffectEngine 
                config={config} 
                setConfig={setConfig} 
                selectedId={selectedId} 
              />
          )}
       </div>
    </div>
  );
};