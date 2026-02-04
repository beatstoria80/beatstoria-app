
import React, { useState, useEffect } from 'react';
import { AppConfig, ImageLayer, LayerEffects } from '../../types';
import { 
    Maximize, MoveHorizontal, MoveVertical, RotateCw, 
    FlipHorizontal, FlipVertical, Ghost, Layers, 
    Wind, Droplets, Image as ImageIcon, Box, Layout,
    Square, Sun, Contrast, Palette, RefreshCcw,
    ScanLine, GripHorizontal, Sliders
} from 'lucide-react';
import { BLEND_MODES, DEFAULT_EFFECTS } from '../../constants';

interface ImageEditorEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
  onSelectLayer: (id: string | null) => void;
}

const SmoothSlider = ({ label, min, max, step = 1, value, onChange, unit = "", icon }: any) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = Number(e.target.value);
        setLocalValue(newVal);
        onChange(newVal, false);
    };

    return (
        <div className="space-y-1.5 group">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-1.5">{icon} {label}</span>
                <span className="text-indigo-600 font-mono text-[8px] font-black bg-indigo-50 px-1.5 py-0.5 rounded min-w-[30px] text-center">
                    {typeof localValue === 'number' ? Number(localValue).toFixed(unit === 'x' ? 1 : 0) : localValue}{unit}
                </span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={localValue || 0} 
                onChange={handleChange}
                onMouseUp={(e) => onChange(Number((e.target as any).value), true)}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all shadow-inner" 
            />
        </div>
    );
};

export const ImageEditorEngine: React.FC<ImageEditorEngineProps> = ({ config, setConfig, selectedId }) => {
    const [activeTab, setActiveTab] = useState<'geo' | 'grade' | 'fx'>('geo');
    
    const isBackground = selectedId === 'bg-layer';
    const selectedLayer = !isBackground ? config.image_layers.find(l => l.id === selectedId) : null;
    
    // Ensure we always have a valid effects object by merging with defaults
    const effects = isBackground 
        ? { ...DEFAULT_EFFECTS, ...(config.canvas.background_effects || {}) }
        : { ...DEFAULT_EFFECTS, ...(selectedLayer?.effects || {}) };

    const updateLayerProp = (key: string, value: any, save = false) => {
        if (isBackground) {
            setConfig(prev => ({ ...prev, canvas: { ...prev.canvas, [`background_layer_${key}`]: value } }), save);
        } else if (selectedId) {
            setConfig(prev => ({
                ...prev,
                image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, [key]: value } : l)
            }), save);
        }
    };

    const updateEffect = (key: keyof LayerEffects, value: any, save = false) => {
        if (isBackground) {
             const current = config.canvas.background_effects || DEFAULT_EFFECTS;
             const newEffects = { ...DEFAULT_EFFECTS, ...current, [key]: value };
             setConfig(prev => ({ ...prev, canvas: { ...prev.canvas, background_effects: newEffects } }), save);
        } else if (selectedId && selectedLayer) {
            const current = selectedLayer.effects || DEFAULT_EFFECTS;
            const newEffects = { ...DEFAULT_EFFECTS, ...current, [key]: value } as LayerEffects;
            setConfig(prev => ({
                ...prev,
                image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, effects: newEffects, effects_enabled: true } : l)
            }), save);
        }
    };

    const resetEffects = () => {
        if (isBackground) {
            setConfig(prev => ({ ...prev, canvas: { ...prev.canvas, background_effects: { ...DEFAULT_EFFECTS } } }), true);
        } else if (selectedId) {
            setConfig(prev => ({
                ...prev,
                image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, effects: { ...DEFAULT_EFFECTS }, effects_enabled: true } : l)
            }), true);
        }
    };

    const resetShadow = () => {
        const shadowDefaults = {
            dropShadowX: 0,
            dropShadowY: 0,
            dropShadowBlur: 0,
            dropShadowColor: '#000000',
            dropShadowOpacity: 0.5
        };
        
        if (selectedId && selectedLayer) {
            const current = selectedLayer.effects || DEFAULT_EFFECTS;
            const newEffects = { ...current, ...shadowDefaults } as LayerEffects;
            setConfig(prev => ({
                ...prev,
                image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, effects: newEffects, effects_enabled: true } : l)
            }), true);
        }
    };

    if (!selectedLayer && !isBackground) return null;

    return (
        <div className="flex flex-col h-full bg-white animate-fadeIn pb-32 overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-50 bg-slate-900">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <ImageIcon size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase tracking-tight">IMAGE MASTER</span>
                            <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest mt-1">PIXEL ENGINE V2</span>
                        </div>
                    </div>
                    {!isBackground && (
                        <div className="px-2 py-1 bg-white/10 rounded-lg border border-white/5">
                            <span className="text-[7px] font-mono text-slate-400">{Math.round(selectedLayer!.width)}x{Math.round(selectedLayer!.height)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-slate-100/80 mx-4 mt-4 rounded-xl gap-1 border border-slate-200/50 shadow-inner">
                {[
                    { id: 'geo', label: 'GEOMETRY', icon: <Layout size={12} /> },
                    { id: 'grade', label: 'GRADING', icon: <Palette size={12} /> },
                    { id: 'fx', label: 'DEPTH FX', icon: <Layers size={12} /> },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab.icon}
                        <span className="text-[6px] font-black uppercase tracking-widest">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-5 space-y-8">
                
                {/* --- TAB 1: GEOMETRY (Transform & Frame) --- */}
                {activeTab === 'geo' && (
                    !isBackground ? (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            {/* DIMENSIONS */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Maximize size={10}/> Dimensions</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                                    <div className="space-y-1">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">WIDTH</span>
                                        <input type="number" value={selectedLayer?.width} onChange={(e) => updateLayerProp('width', parseInt(e.target.value), true)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">HEIGHT</span>
                                        <input type="number" value={selectedLayer?.height} onChange={(e) => updateLayerProp('height', parseInt(e.target.value), true)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">POS X</span>
                                        <input type="number" value={selectedLayer?.position_x} onChange={(e) => updateLayerProp('position_x', parseInt(e.target.value), true)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">POS Y</span>
                                        <input type="number" value={selectedLayer?.position_y} onChange={(e) => updateLayerProp('position_y', parseInt(e.target.value), true)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-center" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* ORIENTATION */}
                            <div className="space-y-3">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><ScanLine size={10}/> Orientation</span>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                                    <SmoothSlider label="ROTATION" min={0} max={360} value={selectedLayer?.rotation} onChange={(v: number, s: boolean) => updateLayerProp('rotation', v, s)} unit="°" icon={<RotateCw size={10}/>} />
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => updateLayerProp('flipX', !selectedLayer?.flipX, true)} className={`flex-1 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 group ${selectedLayer?.flipX ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}>
                                            <FlipHorizontal size={14} /> <span className="text-[7px] font-black uppercase">Flip H</span>
                                        </button>
                                        <button onClick={() => updateLayerProp('flipY', !selectedLayer?.flipY, true)} className={`flex-1 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 group ${selectedLayer?.flipY ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}>
                                            <FlipVertical size={14} /> <span className="text-[7px] font-black uppercase">Flip V</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* CORNER RADIUS */}
                            <div className="space-y-3">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Box size={10}/> Framing</span>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                    <SmoothSlider label="CORNER RADIUS" min={0} max={200} value={selectedLayer?.border_radius || 0} onChange={(v: number, s: boolean) => updateLayerProp('border_radius', v, s)} unit="PX" icon={<Square size={10}/>} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Background geometry is locked</span>
                        </div>
                    )
                )}

                {/* --- TAB 2: GRADING (Colors & Tone) --- */}
                {activeTab === 'grade' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Palette size={10}/> Color Correction</span>
                            <button onClick={resetEffects} className="text-[7px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"><RefreshCcw size={8} /> RESET</button>
                        </div>

                        <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-6 shadow-inner">
                            {/* Light & Tone */}
                            <div className="space-y-4">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-wider block mb-2">LIGHT & EXPOSURE</span>
                                <SmoothSlider label="BRIGHTNESS" icon={<Sun size={10}/>} min={0} max={2} step={0.05} value={effects.brightness ?? 1} onChange={(v: number, s: boolean) => updateEffect('brightness', v, s)} />
                                <SmoothSlider label="CONTRAST" icon={<Contrast size={10}/>} min={0} max={2} step={0.05} value={effects.contrast ?? 1} onChange={(v: number, s: boolean) => updateEffect('contrast', v, s)} />
                            </div>

                            <div className="h-px bg-slate-200/50" />

                            {/* Color */}
                            <div className="space-y-4">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-wider block mb-2">COLOR BALANCE</span>
                                <SmoothSlider label="SATURATION" icon={<Droplets size={10}/>} min={0} max={2} step={0.05} value={effects.saturate ?? 1} onChange={(v: number, s: boolean) => updateEffect('saturate', v, s)} />
                                <SmoothSlider label="HUE SHIFT" icon={<RotateCw size={10}/>} min={0} max={360} value={effects.hueRotate ?? 0} onChange={(v: number, s: boolean) => updateEffect('hueRotate', v, s)} unit="°" />
                            </div>

                            <div className="h-px bg-slate-200/50" />

                            {/* Filters */}
                            <div className="space-y-4">
                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-wider block mb-2">ARTISTIC FILTERS</span>
                                <SmoothSlider label="GRAYSCALE" icon={<Ghost size={10}/>} min={0} max={1} step={0.01} value={effects.grayscale ?? 0} onChange={(v: number, s: boolean) => updateEffect('grayscale', v, s)} unit="%" />
                                <SmoothSlider label="SEPIA" icon={<Wind size={10}/>} min={0} max={1} step={0.01} value={effects.sepia ?? 0} onChange={(v: number, s: boolean) => updateEffect('sepia', v, s)} unit="%" />
                                <SmoothSlider label="INVERT" icon={<RefreshCcw size={10}/>} min={0} max={1} step={0.01} value={effects.invert ?? 0} onChange={(v: number, s: boolean) => updateEffect('invert', v, s)} unit="%" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: FX (Shadow, Blur, Opacity) --- */}
                {activeTab === 'fx' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        {/* OPACITY & BLEND */}
                        <div className="space-y-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Ghost size={10}/> Composite</span>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                                <SmoothSlider label="OPACITY" min={0} max={1} step={0.01} value={isBackground ? config.canvas.background_layer_opacity : (selectedLayer?.opacity ?? 1)} onChange={(v: number, s: boolean) => updateLayerProp('opacity', v, s)} unit="%" />
                                
                                {!isBackground && (
                                    <div className="space-y-2 pt-2 border-t border-slate-200/50">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">BLEND MODE</span>
                                        <div className="relative">
                                            <select 
                                                value={selectedLayer?.blend_mode || 'normal'} 
                                                onChange={(e) => updateLayerProp('blend_mode', e.target.value, true)} 
                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase text-slate-700 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                {BLEND_MODES.map(mode => (
                                                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <RotateCw size={12} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BLUR ENGINE */}
                        <div className="space-y-3">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Wind size={10}/> Softness</span>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                                <SmoothSlider label="GAUSSIAN BLUR" min={0} max={60} value={isBackground ? config.canvas.background_layer_blur : (effects.blur ?? 0)} onChange={(v: number, s: boolean) => isBackground ? updateLayerProp('blur', v, s) : updateEffect('blur', v, s)} unit="PX" />
                                
                                {!isBackground && (
                                    <>
                                        <div className="h-px bg-slate-200/50" />
                                        <SmoothSlider label="BACKDROP BLUR (GLASS)" min={0} max={50} value={effects.backdropBlur || 0} onChange={(v: number, s: boolean) => updateEffect('backdropBlur', v, s)} unit="PX" />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* SHADOW ENGINE */}
                        {!isBackground && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layers size={10}/> Drop Shadow</span>
                                    <button onClick={resetShadow} className="text-[7px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"><RefreshCcw size={8} /> RESET</button>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">SHADOW COLOR</span>
                                        <div className="w-8 h-8 rounded-lg border-2 border-white shadow-md relative overflow-hidden group" style={{ backgroundColor: effects.dropShadowColor || '#000' }}>
                                            <input type="color" value={effects.dropShadowColor || '#000000'} onChange={(e) => updateEffect('dropShadowColor', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                    </div>
                                    
                                    <SmoothSlider label="OPACITY" min={0} max={1} step={0.01} value={effects.dropShadowOpacity ?? 0.5} onChange={(v: number, s: boolean) => updateEffect('dropShadowOpacity', v, s)} unit="%" />
                                    <SmoothSlider label="BLUR (SPREAD)" min={0} max={100} value={effects.dropShadowBlur || 0} onChange={(v: number, s: boolean) => updateEffect('dropShadowBlur', v, s)} unit="PX" />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <SmoothSlider label="OFFSET X" min={-50} max={50} value={effects.dropShadowX || 0} onChange={(v: number, s: boolean) => updateEffect('dropShadowX', v, s)} unit="PX" icon={<MoveHorizontal size={10}/>} />
                                        <SmoothSlider label="OFFSET Y" min={-50} max={50} value={effects.dropShadowY || 0} onChange={(v: number, s: boolean) => updateEffect('dropShadowY', v, s)} unit="PX" icon={<MoveVertical size={10}/>} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
