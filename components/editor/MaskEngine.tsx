
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Scissors, Box, Circle, Square, Layout, RefreshCw, 
  Trash2, ToggleRight, ToggleLeft, Activity, Layers,
  Sparkles, MousePointer2, Ghost, Contrast as InvertIcon,
  Maximize, Loader2, Move, MoveHorizontal, MoveVertical, RotateCcw,
  Wind, Slash, Search, Scan, Target, Diamond, Hexagon
} from 'lucide-react';
import { AppConfig, ImageLayer } from '../../types';

interface MaskEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
}

const PRESET_MASKS = [
    { id: 'circle', icon: <Circle size={16}/>, label: 'ECLIPSE' },
    { id: 'square', icon: <Square size={16}/>, label: 'BOX' },
    { id: 'diamond', icon: <Diamond size={16}/>, label: 'RHOMBUS' },
    { id: 'hexagon', icon: <Hexagon size={16}/>, label: 'HEXAGON' },
    { id: 'gradient', icon: <Layout size={16}/>, label: 'LINEAR' },
    { id: 'vignette', icon: <Activity size={16}/>, label: 'VIGNETTE' }
];

const SmoothSlider = ({ label, min, max, step = 1, value, onChange, icon, unit = "" }: any) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalValue(val);
    onChange(val, false);
  };

  const handleSliderCommit = () => {
    onChange(localValue, true);
  };

  return (
    <div className="space-y-2 group">
        <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
            <span className="flex items-center gap-1.5">{icon} {label}</span>
            <div className="flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm border border-transparent group-hover:border-indigo-100 transition-all">
                <span className="w-12 bg-transparent text-indigo-600 font-mono text-[8px] text-right border-none outline-none focus:ring-0 p-0">
                    {typeof localValue === 'number' ? (unit === '%' ? Math.round(localValue * 100) : Number(localValue.toFixed(2))) : localValue}
                </span>
                <span className="text-indigo-300 font-mono text-[6px] uppercase select-none">{unit}</span>
            </div>
        </div>
        <input 
            type="range" min={min} max={max} step={step} value={Number(localValue) || 0} 
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 shadow-inner" 
        />
    </div>
  );
};

export const MaskEngine: React.FC<MaskEngineProps> = ({ config, setConfig, selectedId }) => {
  const selectedLayer = config.image_layers.find(l => l.id === selectedId);

  const updateMask = useCallback((updates: Partial<ImageLayer>, save = false) => {
    if (!selectedId) return;
    setConfig(prev => ({
      ...prev,
      image_layers: prev.image_layers.map(l => l.id === selectedId ? { ...l, ...updates } : l)
    }), save);
  }, [selectedId, setConfig]);

  const generateMaskSvg = useCallback((type: string, feather: number, inverted: boolean) => {
    // Unique ID Namespace to prevent "Corrupt System" (Ghosting/Caching artifacts)
    const uid = `mask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const gradId = `g-${uid}`;
    const filterId = `f-${uid}`;
    const maskId = `m-${uid}`;

    // Standard Opacity Logic for Gradients
    const op1 = inverted ? 0 : 1;
    const op2 = inverted ? 1 : 0;

    let content = '';

    // --- GRADIENT & VIGNETTE ---
    if (type === 'gradient') {
        const spread = (feather / 100) * 50; 
        const stop1 = 50 - spread;
        const stop2 = 50 + spread;

        content = `
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="${stop1}%" stop-color="white" stop-opacity="${op1}" />
                    <stop offset="${stop2}%" stop-color="white" stop-opacity="${op2}" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#${gradId})" />
        `;
    } 
    else if (type === 'vignette') {
        const spread = (feather / 100) * 50;
        const startOffset = Math.max(0, 100 - (spread * 2.5));
        
        content = `
            <defs>
                <radialGradient id="${gradId}" cx="50%" cy="50%" r="70.7%" fx="50%" fy="50%">
                    <stop offset="${startOffset}%" stop-color="white" stop-opacity="${op1}" />
                    <stop offset="100%" stop-color="white" stop-opacity="${op2}" />
                </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#${gradId})" />
        `;
    }
    // --- SHAPES (Square, Circle, Polygon) ---
    else {
        // Blur definition
        const blurStdDev = (feather / 2); 
        const blurFilter = feather > 0 ? `filter="url(#${filterId})"` : '';
        
        // Shape Geometry Definitions
        let shapeSvg = '';
        const center = 50;
        
        if (type === 'circle') {
             if (feather > 0) {
                 const spread = (feather / 100) * 48;
                 content = `
                    <defs>
                        <radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">
                            <stop offset="${Math.max(0, 50 - spread)}%" stop-color="white" stop-opacity="${op1}" />
                            <stop offset="${Math.min(100, 50 + spread)}%" stop-color="white" stop-opacity="${op2}" />
                        </radialGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#${gradId})" />
                 `;
                 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${content}</svg>`;
                 return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
             } else {
                 shapeSvg = `<ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="white" />`;
             }
        } 
        else if (type === 'square') {
            shapeSvg = `<rect x="0%" y="0%" width="100%" height="100%" fill="white" ${blurFilter} />`;
        } 
        else if (type === 'diamond') {
            const p = feather > 0 ? 5 : 0; 
            const points = `${center},${p} ${100-p},${center} ${center},${100-p} ${p},${center}`;
            shapeSvg = `<polygon points="${points}" fill="white" ${blurFilter} />`;
        } 
        else if (type === 'hexagon') {
            const p = feather > 0 ? 5 : 0;
            const w = 100 - (p*2);
            const h = 100 - (p*2);
            const points = `${center},${p} ${100-p},${p + h*0.25} ${100-p},${p + h*0.75} ${center},${100-p} ${p},${p + h*0.75} ${p},${p + h*0.25}`;
            shapeSvg = `<polygon points="${points}" fill="white" ${blurFilter} />`;
        }

        if (inverted) {
            content = `
                <defs>
                    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="${blurStdDev}" />
                    </filter>
                    <mask id="${maskId}">
                        <rect width="100%" height="100%" fill="white" />
                        ${shapeSvg.replace('fill="white"', 'fill="black"')} 
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="white" mask="url(#${maskId})" />
            `;
        } else {
            content = `
                <defs>
                    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="${blurStdDev}" />
                    </filter>
                </defs>
                ${shapeSvg}
            `;
        }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${content}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, []);

  const handleToggleMask = () => {
      if (!selectedLayer) return;
      const newState = !selectedLayer.mask_enabled;
      
      if (newState && !selectedLayer.mask_src) {
          // If enabling and no mask exists, CREATE ONE immediately
          const defaultType = selectedLayer.mask_type || 'circle';
          const defaultFeather = selectedLayer.mask_feather || 0;
          const defaultInverted = !!selectedLayer.mask_inverted;
          
          const newMaskSrc = generateMaskSvg(defaultType, defaultFeather, defaultInverted);
          
          updateMask({ 
              mask_enabled: true, 
              mask_src: newMaskSrc,
              mask_type: defaultType,
              // Ensure critical parameters are initialized to prevent NaN
              mask_content_scale: 1,
              mask_content_x: 0,
              mask_content_y: 0,
              mask_feather: 0,
              mask_inverted: false
          }, true);
      } else {
          updateMask({ mask_enabled: newState }, true);
      }
  };

  const handleParamChange = (key: string, val: any, save = false) => {
      if (!selectedLayer) return;
      
      const type = key === 'mask_type' ? val : (selectedLayer.mask_type || 'circle');
      const feather = key === 'mask_feather' ? val : (selectedLayer.mask_feather || 0);
      const inverted = key === 'mask_inverted' ? val : (!!selectedLayer.mask_inverted);
      
      const maskSrc = generateMaskSvg(type, feather, inverted);
      
      updateMask({ 
          [key]: val, 
          mask_src: maskSrc,
          mask_type: type,
          mask_enabled: true
      }, save);
  };

  if (!selectedId || !selectedLayer) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-6 bg-white animate-fadeIn opacity-40">
        <div className="w-16 h-16 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300">
           <Scissors size={32} />
        </div>
        <p className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] max-w-[200px]">
            Select an image node to initialize Masking Logic
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn pb-32">
      <div className="p-4 border-b border-slate-50 bg-slate-900">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-500 ${selectedLayer.mask_enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                      <Scissors size={18} fill={selectedLayer.mask_enabled ? "white" : "transparent"} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase tracking-tight">MASKING ENGINE</span>
                      <span className={`text-[6px] font-black uppercase tracking-[0.2em] mt-1 ${selectedLayer.mask_enabled ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {selectedLayer.mask_enabled ? 'CLIPPING ACTIVE' : 'PASSTHROUGH MODE'}
                      </span>
                  </div>
              </div>
              <button 
                onClick={handleToggleMask}
                className={`w-12 h-6 rounded-full transition-colors duration-200 flex items-center px-1 ${selectedLayer.mask_enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${selectedLayer.mask_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
          </div>
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar p-5 space-y-7 transition-all duration-500 ${!selectedLayer.mask_enabled ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="space-y-4">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">GEOMETRY PRESETS</span>
              <div className="grid grid-cols-4 gap-2">
                  {PRESET_MASKS.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => handleParamChange('mask_type', m.id, true)}
                        className={`flex flex-col items-center justify-center gap-3 py-4 bg-white border rounded-2xl transition-all group active:scale-95 ${selectedLayer.mask_type === m.id ? 'border-indigo-400 bg-indigo-50 shadow-md scale-105 z-10' : 'border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}
                      >
                          <div className={selectedLayer.mask_type === m.id ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-400'}>{m.icon}</div>
                          <span className={`text-[6px] font-black uppercase tracking-widest ${selectedLayer.mask_type === m.id ? 'text-indigo-600' : ''}`}>{m.label}</span>
                      </button>
                  ))}
              </div>
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-1">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/10 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
                      <Activity size={14} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">CONTENT ADJUSTMENT</span>
                      <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Shift mask window</span>
                  </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-7 shadow-inner">
                  <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">INVERT POLARITY</span>
                      <button 
                        onClick={() => handleParamChange('mask_inverted', !selectedLayer.mask_inverted, true)}
                        className={`px-4 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest transition-all ${selectedLayer.mask_inverted ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                      >
                        {selectedLayer.mask_inverted ? 'INVERTED' : 'STANDARD'}
                      </button>
                  </div>

                  <SmoothSlider 
                    label="MASK SCALE" 
                    icon={<Maximize size={10} />} 
                    min={0.1} max={3} step={0.01}
                    value={selectedLayer.mask_content_scale ?? 1}
                    onChange={(v: number, s: boolean) => updateMask({ mask_content_scale: v }, s)}
                    unit="x"
                  />

                  <div className="grid grid-cols-2 gap-4">
                      <SmoothSlider 
                        label="OFFSET X" 
                        icon={<MoveHorizontal size={10} />} 
                        min={-150} max={150} 
                        value={selectedLayer.mask_content_x ?? 0}
                        onChange={(v: number, s: boolean) => updateMask({ mask_content_x: v }, s)}
                        unit=" %"
                      />
                      <SmoothSlider 
                        label="OFFSET Y" 
                        icon={<MoveVertical size={10} />} 
                        min={-150} max={150} 
                        value={selectedLayer.mask_content_y ?? 0}
                        onChange={(v: number, s: boolean) => updateMask({ mask_content_y: v }, s)}
                        unit=" %"
                      />
                  </div>
              </div>
          </div>

          <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100 space-y-4 shadow-inner">
                  <SmoothSlider 
                    label={selectedLayer.mask_type === 'gradient' ? "GRADIENT SMOOTHNESS" : "EDGE FADEOUT (FEATHER)"}
                    icon={<Wind size={10} />} 
                    min={0} max={100} 
                    value={selectedLayer.mask_feather || 0}
                    onChange={(v: number, s: boolean) => handleParamChange('mask_feather', v, s)}
                    unit=" %" 
                  />
              </div>
          </div>

          <div className="pt-4 border-t border-slate-50 pb-10">
              <button 
                onClick={() => {
                    updateMask({ 
                        mask_enabled: false, 
                        mask_src: null, 
                        mask_type: undefined,
                        mask_feather: 0, 
                        mask_inverted: false,
                        mask_content_x: 0,
                        mask_content_y: 0,
                        mask_content_scale: 1
                    }, true);
                }}
                className="w-full py-4 bg-white border border-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                  <RotateCcw size={14} /> RESET MASK LOGIC
              </button>
          </div>
      </div>
    </div>
  );
};
