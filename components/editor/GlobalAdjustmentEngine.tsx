import React, { useState, useEffect } from 'react';
import { 
  Sun, Contrast, Palette, Ghost, Layers, MoveHorizontal, MoveVertical, 
  Maximize, Wind, Cloud, Sliders, Thermometer, Target, RefreshCcw, 
  Cpu, Droplets, RotateCw, Image as ImageIcon, Box, Zap, Activity, Filter,
  Sparkles, Flame
} from 'lucide-react';
import { AppConfig, LayerEffects } from '../../types';
import { DEFAULT_EFFECTS, PERFORMANCE_PRESETS } from '../../constants';

interface GlobalAdjustmentEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
}

export const GlobalAdjustmentEngine: React.FC<GlobalAdjustmentEngineProps> = ({ config, setConfig }) => {
  const [activeGroup, setActiveGroup] = useState<'tone' | 'color' | 'special' | 'finish'>('tone');

  const currentEffects: LayerEffects = config.canvas.global_effects || DEFAULT_EFFECTS;

  const updateEffect = (key: keyof LayerEffects, value: any, save = false) => {
    const updated = { ...currentEffects, [key]: value };
    setConfig(prev => ({
      ...prev,
      canvas: { ...prev.canvas, global_effects: updated }
    }), save);
  };

  const applyPreset = (preset: typeof PERFORMANCE_PRESETS[0]) => {
      setConfig(prev => ({
          ...prev,
          canvas: { ...prev.canvas, global_effects: { ...preset.effects } }
      }), true);
  };

  const resetAll = () => {
    setConfig(prev => ({
      ...prev,
      canvas: { ...prev.canvas, global_effects: { ...DEFAULT_EFFECTS } }
    }), true);
  };

  const Slider = ({ label, min, max, step = 0.01, value, onChange, unit = "", icon }: any) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <div className="space-y-2.5 group">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-2">
                    {icon && <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">{icon}</span>}
                    {label}
                </span>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded shadow-inner">
                    <span className="w-10 text-indigo-600 font-mono text-[8px] text-right">{Number(localValue.toFixed(2))}</span>
                    {unit && <span className="text-indigo-300 font-mono text-[6px] uppercase select-none">{unit}</span>}
                </div>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={value} 
                onChange={(e) => { const v = Number(e.target.value); setLocalValue(v); onChange(v, false); }}
                onMouseUp={() => onChange(localValue, true)}
                className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all" 
            />
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-fadeIn select-none">
      {/* HEADER: GLOBAL POWER BRANDING */}
      <div className="p-4 border-b border-slate-50 bg-slate-900">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                      <Activity size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-black text-white uppercase tracking-tight">GLOBAL GRADING</span>
                      <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest mt-1">NEURAL ENGINE ACTIVE</span>
                  </div>
              </div>
              <button 
                onClick={resetAll} 
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-slate-300 hover:text-white shadow-sm active:scale-90 transition-all"
                title="Reset Global Stack"
              >
                  <RefreshCcw size={14} />
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* NEURAL LOOK PRESETS: "Strong" activation feature */}
          <div className="p-4 space-y-3">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Flame size={10} className="text-orange-500" /> Neural Look Presets</span>
              <div className="grid grid-cols-2 gap-2">
                  {PERFORMANCE_PRESETS.map(preset => (
                      <button 
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-white transition-all group text-left"
                      >
                          <div className="w-6 h-6 rounded-lg border flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: preset.color, borderColor: 'rgba(255,255,255,0.2)' }}>
                              <Sparkles size={10} fill="white" />
                          </div>
                          <span className="text-[7px] font-black uppercase text-slate-600 group-hover:text-indigo-600 tracking-wider truncate">{preset.label}</span>
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex p-1 bg-slate-100/50 mx-4 mb-4 rounded-xl gap-1 border border-slate-100 shadow-inner">
              {[
                { id: 'tone', label: 'TONE', icon: <Sun size={12} /> },
                { id: 'color', label: 'COLOR', icon: <Palette size={12} /> },
                { id: 'finish', label: 'FINISH', icon: <Filter size={12} /> }
              ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveGroup(tab.id as any)}
                    className={`flex-1 py-2.5 flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all ${activeGroup === tab.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    {tab.icon}
                    <span className="text-[6px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
          </div>

          <div className="px-4 pb-24 space-y-5">
              {activeGroup === 'tone' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-6 shadow-inner">
                          <Slider label="MASTER BRIGHTNESS" icon={<Sun size={10}/>} min={0} max={2} value={currentEffects.brightness} onChange={(v:any, s:any) => updateEffect('brightness', v, s)} />
                          <Slider label="MASTER CONTRAST" icon={<Contrast size={10}/>} min={0} max={2} value={currentEffects.contrast} onChange={(v:any, s:any) => updateEffect('contrast', v, s)} />
                          <div className="h-px bg-slate-200/50" />
                          <Slider label="GLOBAL EXPOSURE" icon={<Zap size={10}/>} min={-2} max={2} value={currentEffects.exposure} onChange={(v:any, s:any) => updateEffect('exposure', v, s)} />
                          <Slider label="HIGHLIGHT PUNCH" icon={<Maximize size={10}/>} min={-1} max={1} value={currentEffects.highlights} onChange={(v:any, s:any) => updateEffect('highlights', v, s)} />
                          <Slider label="SHADOW DEPTH" icon={<Layers size={10}/>} min={-1} max={1} value={currentEffects.shadows} onChange={(v:any, s:any) => updateEffect('shadows', v, s)} />
                      </div>
                  </div>
              )}

              {activeGroup === 'color' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner space-y-6">
                        <Slider label="GLOBAL VIBRANCE" icon={<Droplets size={10}/>} min={-1} max={1} value={currentEffects.vibrance} onChange={(v:any, s:any) => updateEffect('vibrance', v, s)} />
                        <Slider label="GLOBAL SATURATION" icon={<Palette size={10}/>} min={0} max={2} value={currentEffects.saturate} onChange={(v:any, s:any) => updateEffect('saturate', v, s)} />
                        <div className="h-px bg-slate-200/50" />
                        <Slider label="TEMPERATURE" icon={<Thermometer size={10}/>} min={-1} max={1} value={currentEffects.temp} onChange={(v:any, s:any) => updateEffect('temp', v, s)} />
                        <Slider label="HUE ROTATE" icon={<RotateCw size={10}/>} min={0} max={360} step={1} value={currentEffects.hueRotate} onChange={(v:any, s:any) => updateEffect('hueRotate', v, s)} unit="°" />
                      </div>
                  </div>
              )}

              {activeGroup === 'finish' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner space-y-6">
                          <Slider label="GLOBAL DEHAZE" icon={<Cloud size={10}/>} min={0} max={1} value={currentEffects.dehaze} onChange={(v:any, s:any) => updateEffect('dehaze', v, s)} />
                          <Slider label="MASTER BLUR" icon={<Wind size={10}/>} min={0} max={40} value={currentEffects.blur} onChange={(v:any, s:any) => updateEffect('blur', v, s)} unit="PX" />
                          <div className="h-px bg-slate-200/50" />
                          <Slider label="FILM GRAIN" icon={<Cpu size={10}/>} min={0} max={1} value={currentEffects.grain} onChange={(v:any, s:any) => updateEffect('grain', v, s)} />
                          <Slider label="MASTER VIGNETTE" icon={<ImageIcon size={10}/>} min={0} max={1} value={currentEffects.vignette} onChange={(v:any, s:any) => updateEffect('vignette', v, s)} />
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};