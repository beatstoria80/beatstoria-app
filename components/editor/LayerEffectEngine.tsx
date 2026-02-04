import React, { useState, useEffect } from 'react';
import { 
  Sun, Contrast, Palette, Ghost, Layers, MoveHorizontal, MoveVertical, 
  Maximize, Wind, Cloud, Sliders, Thermometer, Target, RefreshCcw, 
  Cpu, Droplets, RotateCw, Image as ImageIcon, Box, Zap, Activity,
  Split, Scissors, Command, Type, MousePointer2, Filter
} from 'lucide-react';
import { AppConfig, LayerEffects } from '../../types';
import { DEFAULT_EFFECTS } from '../../constants';

interface LayerEffectEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
}

export const LayerEffectEngine: React.FC<LayerEffectEngineProps> = ({ config, setConfig, selectedId }) => {
  const [activeGroup, setActiveGroup] = useState<'tone' | 'color' | 'special' | 'finish'>('tone');

  if (!selectedId) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-6 bg-white min-h-[400px] border-l border-slate-50 select-none animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
           <Activity size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Local Power Offline</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[200px]">Select an element to initialize the local adjustment suite</p>
        </div>
      </div>
    );
  }

  const findLayer = () => {
    if (selectedId === 'headline') return { layer: config.typography, key: 'headline_effects' as const, name: 'HEADLINE MASTER' };
    if (selectedId === 'subtitle') return { layer: config.typography, key: 'subtitle_effects' as const, name: 'SUBTITLE MASTER' };
    const img = config.image_layers.find(l => l.id === selectedId);
    if (img) return { layer: img, key: 'effects' as const, name: `IMAGE: ${img.id.slice(-4).toUpperCase()}` };
    const txt = config.additional_texts.find(l => l.id === selectedId);
    if (txt) return { layer: txt, key: 'effects' as const, name: `TEXT: ${txt.text.slice(0, 10).toUpperCase()}` };
    const shp = config.shapes?.find(l => l.id === selectedId);
    if (shp) return { layer: shp, key: 'effects' as const, name: `VECTOR: ${shp.shape_type.toUpperCase()}` };
    return null;
  };

  const result = findLayer();
  if (!result) return null;

  const currentEffects: LayerEffects = (result.layer as any)[result.key] || DEFAULT_EFFECTS;

  const updateEffect = (key: keyof LayerEffects, value: any, save = false) => {
    const updated = { ...currentEffects, [key]: value };
    setConfig(prev => {
      if (selectedId === 'headline') return { ...prev, typography: { ...prev.typography, headline_effects: updated } };
      if (selectedId === 'subtitle') return { ...prev, typography: { ...prev.typography, subtitle_effects: updated } };
      return {
        ...prev,
        image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, effects: updated } : l),
        additional_texts: prev.additional_texts.map(l => l.id === selectedId ? { ...l, effects: updated } : l),
        shapes: (prev.shapes || []).map(l => l.id === selectedId ? { ...l, effects: updated } : l)
      };
    }, save);
  };

  const resetAll = () => {
    setConfig(prev => {
        if (selectedId === 'headline') return { ...prev, typography: { ...prev.typography, headline_effects: undefined } };
        if (selectedId === 'subtitle') return { ...prev, typography: { ...prev.typography, subtitle_effects: undefined } };
        return {
          ...prev,
          image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, effects: undefined } : l),
          additional_texts: prev.additional_texts.map(l => l.id === selectedId ? { ...l, effects: undefined } : l),
          shapes: (prev.shapes || []).map(l => l.id === selectedId ? { ...l, effects: undefined } : l)
        };
      }, true);
  };

  const Slider = ({ label, min, max, step = 0.01, value, onChange, unit = "", icon, shortcut }: any) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setLocalValue(val);
        onChange(val, false);
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setLocalValue(val);
        onChange(val, false);
    };

    return (
        <div className="space-y-1.5 group">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-2">
                    {icon && <span className="text-slate-300 group-hover:text-indigo-500 transition-colors">{icon}</span>}
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {shortcut && <span className="text-[6px] text-slate-300 font-bold px-1 py-0.5 border border-slate-100 rounded">{shortcut}</span>}
                    <div className="flex items-center gap-1 bg-indigo-50/50 px-1 rounded shadow-sm border border-transparent group-hover:border-indigo-100 transition-all">
                        <input 
                            type="number"
                            value={typeof localValue === 'number' ? Number(localValue.toFixed(2)) : 0}
                            onChange={handleInputChange}
                            onBlur={() => onChange(localValue, true)}
                            className="w-12 bg-transparent text-indigo-600 font-mono text-[8px] text-right border-none outline-none focus:ring-0 p-0"
                        />
                        <span className="text-indigo-300 font-mono text-[6px] uppercase select-none">{unit}</span>
                    </div>
                </div>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={value} 
                onChange={handleSliderChange}
                onMouseUp={() => onChange(localValue, true)}
                className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-700 transition-all" 
            />
        </div>
    );
  };

  const AdjustmentButton = ({ label, active, onClick, shortcut, icon }: any) => (
      <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left group ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
      >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
          </div>
          {shortcut && <span className={`text-[6px] font-bold px-1 py-0.5 rounded ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{shortcut}</span>}
      </button>
  );

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-fadeIn">
      <div className="p-4 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                      <Sliders size={18} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{result.name}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Local Adjustment Power</span>
                  </div>
              </div>
              <button onClick={resetAll} className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm active:scale-90 transition-all"><RefreshCcw size={14} /></button>
          </div>
      </div>

      <div className="flex p-1 bg-slate-100/50 m-4 rounded-xl gap-1">
          {[
            { id: 'tone', label: 'Tone', icon: <Sun size={12} /> },
            { id: 'color', label: 'Color', icon: <Palette size={12} /> },
            { id: 'special', label: 'Art', icon: <Zap size={12} /> },
            { id: 'finish', label: 'Finish', icon: <Filter size={12} /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveGroup(tab.id as any)} className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${activeGroup === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>{tab.icon}<span className="text-[6px] font-black uppercase tracking-widest">{tab.label}</span></button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24 space-y-6">
          {activeGroup === 'tone' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                      <Slider label="Brightness / Contrast" icon={<Sun size={10}/>} min={0} max={2} value={currentEffects.brightness} onChange={(v:any, s:any) => updateEffect('brightness', v, s)} />
                      <Slider label="" icon={<Contrast size={10}/>} min={0} max={2} value={currentEffects.contrast} onChange={(v:any, s:any) => updateEffect('contrast', v, s)} />
                      <div className="h-px bg-slate-100" />
                      <Slider label="Exposure" icon={<Zap size={10}/>} min={-2} max={2} value={currentEffects.exposure} onChange={(v:any, s:any) => updateEffect('exposure', v, s)} />
                      <div className="h-px bg-slate-100" />
                      <div className="space-y-4">
                        <div className="flex justify-between"><span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Levels (Luminance)</span></div>
                        <Slider label="Whites" min={-1} max={1} value={currentEffects.whites} onChange={(v:any, s:any) => updateEffect('whites', v, s)} />
                        <Slider label="Highlights" min={-1} max={1} value={currentEffects.highlights} onChange={(v:any, s:any) => updateEffect('highlights', v, s)} />
                        <Slider label="Shadows" min={-1} max={1} value={currentEffects.shadows} onChange={(v:any, s:any) => updateEffect('shadows', v, s)} />
                        <Slider label="Blacks" min={-1} max={1} value={currentEffects.blacks} onChange={(v:any, s:any) => updateEffect('blacks', v, s)} />
                      </div>
                  </div>
              </div>
          )}

          {activeGroup === 'color' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                      <Slider label="Vibrance" icon={<Droplets size={10}/>} min={-1} max={1} value={currentEffects.vibrance} onChange={(v:any, s:any) => updateEffect('vibrance', v, s)} />
                      <div className="h-px bg-slate-100" />
                      <Slider label="Hue / Saturation" icon={<RotateCw size={10}/>} min={0} max={360} value={currentEffects.hueRotate} onChange={(v:any, s:any) => updateEffect('hueRotate', v, s)} unit="°" />
                      <Slider label="" icon={<Palette size={10}/>} min={0} max={2} value={currentEffects.saturate} onChange={(v:any, s:any) => updateEffect('saturate', v, s)} />
                      <div className="h-px bg-slate-100" />
                      <div className="space-y-4">
                        <div className="flex justify-between"><span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Color Balance</span></div>
                        <Slider label="Temperature" icon={<Thermometer size={10}/>} min={-1} max={1} value={currentEffects.temp} onChange={(v:any, s:any) => updateEffect('temp', v, s)} />
                        <Slider label="Tint" icon={<Palette size={10}/>} min={-1} max={1} value={currentEffects.tint} onChange={(v:any, s:any) => updateEffect('tint', v, s)} />
                      </div>
                  </div>
                  <AdjustmentButton label="Mono (Black & White)" active={currentEffects.grayscale > 0} onClick={() => updateEffect('grayscale', currentEffects.grayscale ? 0 : 1, true)} icon={<Ghost size={12}/>} />
              </div>
          )}

          {activeGroup === 'special' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <AdjustmentButton label="Invert Channels" active={currentEffects.invert > 0} onClick={() => updateEffect('invert', currentEffects.invert ? 0 : 1, true)} icon={<RotateCw size={12}/>} />
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 mt-4">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Selective Color Mask</span>
                      <div className="grid grid-cols-6 gap-1">
                          {['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'].map(c => (
                              <button key={c} className="w-full aspect-square rounded-md border border-white shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {activeGroup === 'finish' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                      <Slider label="Texture Clarity" icon={<Target size={10}/>} min={0} max={1} value={currentEffects.clarity} onChange={(v:any, s:any) => updateEffect('clarity', v, s)} />
                      <Slider label="Dehaze Filter" icon={<Cloud size={10}/>} min={0} max={1} value={currentEffects.dehaze} onChange={(v:any, s:any) => updateEffect('dehaze', v, s)} />
                      <div className="h-px bg-slate-100" />
                      <Slider label="Vignette" icon={<ImageIcon size={10}/>} min={0} max={1} value={currentEffects.vignette} onChange={(v:any, s:any) => updateEffect('vignette', v, s)} />
                      <Slider label="Film Grain" icon={<Cpu size={10}/>} min={0} max={1} value={currentEffects.grain} onChange={(v:any, s:any) => updateEffect('grain', v, s)} />
                      <Slider label="Gaussian Blur" icon={<Wind size={10}/>} min={0} max={40} value={currentEffects.blur} onChange={(v:any, s:any) => updateEffect('blur', v, s)} unit="px" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block text-center">Depth Perspective</span>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-2"><span className="text-[6px] font-black text-slate-400 uppercase">Skew X Axis</span><input type="range" min={-45} max={45} value={currentEffects.skewX} onChange={(e) => updateEffect('skewX', Number(e.target.value), true)} className="w-full h-0.5 accent-slate-900" /></div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-2"><span className="text-[6px] font-black text-slate-400 uppercase">Skew Y Axis</span><input type="range" min={-45} max={45} value={currentEffects.skewY} onChange={(e) => updateEffect('skewY', Number(e.target.value), true)} className="w-full h-0.5 accent-slate-900" /></div>
                    </div>
                  </div>
              </div>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between px-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={10} className="text-indigo-500" /> Component Shadow Profile</label>
                  <div className="w-5 h-5 rounded-full border border-slate-200 overflow-hidden relative shadow-sm" style={{ backgroundColor: currentEffects.dropShadowColor }}><input type="color" value={currentEffects.dropShadowColor} onChange={(e) => updateEffect('dropShadowColor', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
              </div>
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                  <Slider label="Shadow Diffusion" min={0} max={100} value={currentEffects.dropShadowBlur} onChange={(v:any, s:any) => updateEffect('dropShadowBlur', v, s)} unit="px" />
                  <div className="grid grid-cols-2 gap-4">
                      <Slider label="X Vector" min={-100} max={100} value={currentEffects.dropShadowX} onChange={(v:any, s:any) => updateEffect('dropShadowX', v, s)} />
                      <Slider label="Y Vector" min={-100} max={100} value={currentEffects.dropShadowY} onChange={(v:any, s:any) => updateEffect('dropShadowY', v, s)} />
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};