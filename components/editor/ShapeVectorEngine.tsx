
import React from 'react';
import { AppConfig, ShapeLayer } from '../../types';
import { 
    Square, Circle, Triangle, Star, Minus, CheckSquare, 
    Maximize, RotateCw, Layout, Paintbrush, Layers, 
    MoveHorizontal, MoveVertical, Wind, Palette, Ghost,
    Droplets, ArrowRightLeft
} from 'lucide-react';
import { DEFAULT_EFFECTS, BLEND_MODES } from '../../constants';

interface ShapeVectorEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
  onSelectLayer: (id: string | null, multi?: boolean) => void;
  penToolMode: string;
  setPenToolMode: (mode: any) => void;
}

// Helpers for color management
const parseColor = (color: string) => {
    if (!color) return { hex: '#000000', alpha: 1 };
    if (color.startsWith('#')) return { hex: color, alpha: 1 };
    if (color.startsWith('rgba')) {
        const parts = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (parts) {
            const r = parseInt(parts[1]).toString(16).padStart(2, '0');
            const g = parseInt(parts[2]).toString(16).padStart(2, '0');
            const b = parseInt(parts[3]).toString(16).padStart(2, '0');
            const a = parts[4] ? parseFloat(parts[4]) : 1;
            return { hex: `#${r}${g}${b}`, alpha: a };
        }
    }
    return { hex: '#000000', alpha: 1 };
};

const hexToRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const hexToRgbaString = (hex: string, alpha: number = 1) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const SmoothSlider = ({ label, min, max, step = 1, value, onChange, unit = "" }: any) => {
    let displayValue = value;
    if (unit === '%' && max <= 1) {
        displayValue = Math.round(value * 100);
    } else {
        displayValue = Math.round(value);
    }

    return (
        <div className="space-y-1.5 group">
            <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                <span>{label}</span>
                <span className="text-indigo-600 font-mono text-[8px] font-black bg-indigo-50 px-1.5 py-0.5 rounded">{displayValue}{unit}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} value={value || 0} 
                onChange={(e) => onChange(Number(e.target.value), false)}
                onMouseUp={(e) => onChange(Number((e.target as any).value), true)}
                className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all" 
            />
        </div>
    );
};

export const ShapeVectorEngine: React.FC<ShapeVectorEngineProps> = ({ config, setConfig, onSelectLayer, selectedId }) => {
  const selectedShape = config.shapes?.find(s => s.id === selectedId);

  const handleAddShape = (type: ShapeLayer['shape_type']) => {
      const newId = `shape-${Date.now()}`;
      
      const newShape: ShapeLayer = {
          id: newId,
          shape_type: type,
          position_x: config.canvas.width / 2 - 100,
          position_y: config.canvas.height / 2 - 100,
          width: 200,
          height: 200,
          rotation: 0,
          fill_color: '#3B82F6', // Solid Blue by default
          stroke_color: '#000000',
          stroke_width: 0,
          border_radius: 0,
          opacity: 1, // Ensure fully visible
          blend_mode: 'normal',
          locked: false,
          hidden: false,
          effects_enabled: true,
          effects: { ...DEFAULT_EFFECTS },
          gradient_enabled: false, 
          gradient_deg: 90,
          gradient_stops: [
              { color: '#3B82F6', opacity: 0, position: 0, alpha: 1 }, 
              { color: '#60A5FA', opacity: 1, position: 1, alpha: 1 }
          ],
          shadow_enabled: false,
          shadow_color: 'rgba(0,0,0,0.5)',
          shadow_blur: 10,
          shadow_x: 0,
          shadow_y: 5
      };
      
      setConfig(prev => ({
          ...prev,
          shapes: [...(prev.shapes || []), newShape],
          layerOrder: [...prev.layerOrder, newId]
      }), true);
      
      onSelectLayer(newId);
  };

  const updateShape = (key: keyof ShapeLayer, value: any, save = false) => {
      if (!selectedShape) return;
      setConfig(prev => ({
          ...prev,
          shapes: (prev.shapes || []).map(s => s.id === selectedId ? { ...s, [key]: value } : s)
      }), save);
  };

  const toggleGradient = (enabled: boolean) => {
      if (!selectedShape) return;
      
      const hasValidStops = selectedShape.gradient_stops && Array.isArray(selectedShape.gradient_stops) && selectedShape.gradient_stops.length >= 2;
      
      const currentStops = hasValidStops 
          ? [
              { ...selectedShape.gradient_stops![0], position: 0, opacity: 0, alpha: selectedShape.gradient_stops![0].alpha ?? 1 }, 
              { ...selectedShape.gradient_stops![1], position: 1, opacity: 1, alpha: selectedShape.gradient_stops![1].alpha ?? 1 }
            ] 
          : [{ color: selectedShape.fill_color || '#3B82F6', position: 0, opacity: 0, alpha: 1 }, { color: '#ffffff', position: 1, opacity: 1, alpha: 1 }];
      
      setConfig(prev => ({
          ...prev,
          shapes: (prev.shapes || []).map(s => s.id === selectedId ? { 
              ...s, 
              gradient_enabled: enabled,
              gradient_stops: enabled ? currentStops : s.gradient_stops 
          } : s)
      }), true);
  };

  const updateEffect = (key: string, value: any, save = false) => {
      if (!selectedShape) return;
      const newEffects = { ...selectedShape.effects, [key]: value };
      updateShape('effects', newEffects, save);
  };

  const updateGradientStop = (index: number, updates: any, save = false) => {
      if (!selectedShape) return;
      const baseStops = (selectedShape.gradient_stops && selectedShape.gradient_stops.length > 0) 
          ? selectedShape.gradient_stops 
          : [{ color: '#000000', opacity: 0, position: 0, alpha: 1 }, { color: '#ffffff', opacity: 1, position: 1, alpha: 1 }];
          
      const stops = [...baseStops];
      
      if (!stops[index]) {
          stops[index] = { color: '#000000', opacity: index === 0 ? 0 : 1, position: index === 0 ? 0 : 1, alpha: 1 };
      }
      
      const fixedPos = index === 0 ? 0 : 1;
      // Preserve existing position if not updating it, or fallback to fixed
      stops[index] = { ...stops[index], ...updates };
      // Ensure position integrity for 2-stop simple gradient UI
      if (stops.length === 2) {
          stops[index].position = fixedPos;
          stops[index].opacity = fixedPos; // Legacy support
      }
      
      updateShape('gradient_stops', stops, save);
  };

  const swapGradientColors = () => {
      if (!selectedShape || !selectedShape.gradient_stops || selectedShape.gradient_stops.length < 2) return;
      const newStops = [
          { ...selectedShape.gradient_stops[1], position: 0, opacity: 0 }, 
          { ...selectedShape.gradient_stops[0], position: 1, opacity: 1 }
      ];
      updateShape('gradient_stops', newStops, true);
  };

  // Shadow Color Helpers
  const updateShadowColorHex = (newHex: string, save = false) => {
      if (!selectedShape) return;
      const { alpha } = parseColor(selectedShape.shadow_color || 'rgba(0,0,0,0.5)');
      const { r, g, b } = hexToRgb(newHex);
      const newRgba = `rgba(${r},${g},${b},${alpha})`;
      updateShape('shadow_color', newRgba, save);
  };

  const updateShadowAlpha = (newAlpha: number, save = false) => {
      if (!selectedShape) return;
      const { hex } = parseColor(selectedShape.shadow_color || 'rgba(0,0,0,0.5)');
      const { r, g, b } = hexToRgb(hex);
      const newRgba = `rgba(${r},${g},${b},${newAlpha})`;
      updateShape('shadow_color', newRgba, save);
  };

  // Explicit Solid Color Update
  const updateSolidFill = (color: string) => {
      if (!selectedShape) return;
      setConfig(prev => ({
          ...prev,
          shapes: (prev.shapes || []).map(s => s.id === selectedId ? { ...s, fill_color: color, gradient_enabled: false } : s)
      }), true);
  };

  if (selectedShape) {
      const shadowColorState = parseColor(selectedShape.shadow_color || 'rgba(0,0,0,0.5)');

      return (
          <div className="flex flex-col h-full bg-white animate-fadeIn pb-32 overflow-y-auto custom-scrollbar">
              
              {/* Header: SHAPE PROPERTIES */}
              <div className="p-4 border-b border-slate-50 bg-slate-900">
                  <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                          <Layout size={18} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">GEOMETRY MASTER</span>
                          <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest mt-1">VECTOR ENGINE V4</span>
                      </div>
                  </div>
              </div>

              <div className="p-5 space-y-8">
                  
                  {/* SECTION 1: TRANSFORM & RADIUS */}
                  <div className="space-y-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Maximize size={10}/> Dimensions</span>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">WIDTH</span>
                              <input type="number" value={selectedShape.width} onChange={(e) => updateShape('width', parseInt(e.target.value), true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500" />
                          </div>
                          <div className="space-y-1.5">
                              <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">HEIGHT</span>
                              <input type="number" value={selectedShape.height} onChange={(e) => updateShape('height', parseInt(e.target.value), true)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-indigo-500" />
                          </div>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                          <SmoothSlider label="ROTATION" min={0} max={360} value={selectedShape.rotation} onChange={(v: number, s: boolean) => updateShape('rotation', v, s)} unit="°" />
                          
                          {(selectedShape.shape_type === 'rect' || selectedShape.shape_type === 'rounded-rect') && (
                              <>
                                  <div className="h-px bg-slate-200/50" />
                                  <SmoothSlider label="CORNER RADIUS" min={0} max={selectedShape.width / 2} value={selectedShape.border_radius || 0} onChange={(v: number, s: boolean) => updateShape('border_radius', v, s)} unit="PX" />
                              </>
                          )}
                      </div>
                  </div>

                  {/* SECTION 2: FILL & GRADIENT */}
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Paintbrush size={10}/> Appearance</span>
                          <div className="flex p-0.5 bg-slate-100 rounded-lg">
                              <button onClick={() => toggleGradient(false)} className={`px-2 py-1 rounded-md text-[6px] font-black uppercase transition-all ${!selectedShape.gradient_enabled ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Solid</button>
                              <button onClick={() => toggleGradient(true)} className={`px-2 py-1 rounded-md text-[6px] font-black uppercase transition-all ${selectedShape.gradient_enabled ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Gradient</button>
                          </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                          {!selectedShape.gradient_enabled ? (
                              <div className="space-y-2">
                                  <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">SOLID FILL COLOR</span>
                                  <div className="h-10 w-full rounded-xl border-2 border-white shadow-md relative overflow-hidden" style={{ backgroundColor: selectedShape.fill_color }}>
                                      <input type="color" value={selectedShape.fill_color} onChange={(e) => updateSolidFill(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  <div className="flex gap-3">
                                      <div className="flex-1 space-y-2">
                                          <div className="flex flex-col gap-1">
                                              <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">START COLOR</span>
                                              <div 
                                                className="h-8 w-full rounded-lg border-2 border-white shadow-md relative overflow-hidden checkerboard-bg"
                                              >
                                                  <div className="absolute inset-0" style={{ backgroundColor: hexToRgbaString(selectedShape.gradient_stops?.[0]?.color || '#000000', selectedShape.gradient_stops?.[0]?.alpha ?? 1) }} />
                                                  <input type="color" value={selectedShape.gradient_stops?.[0]?.color || '#000000'} onChange={(e) => updateGradientStop(0, { color: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                              </div>
                                          </div>
                                          
                                          {/* Opacity Start */}
                                          <div className="flex items-center gap-2">
                                              <span className="text-[5px] font-black text-slate-400 uppercase w-8">ALPHA</span>
                                              <input 
                                                  type="range" min="0" max="1" step="0.01" 
                                                  value={selectedShape.gradient_stops?.[0]?.alpha ?? 1} 
                                                  onChange={(e) => updateGradientStop(0, { alpha: parseFloat(e.target.value) }, false)}
                                                  onMouseUp={(e) => updateGradientStop(0, { alpha: parseFloat((e.target as any).value) }, true)}
                                                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                              />
                                          </div>
                                      </div>
                                      
                                      <div className="flex flex-col justify-start pt-4">
                                          <button onClick={swapGradientColors} className="p-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors shadow-sm active:scale-95" title="Swap Colors">
                                              <ArrowRightLeft size={12} />
                                          </button>
                                      </div>

                                      <div className="flex-1 space-y-2">
                                          <div className="flex flex-col gap-1">
                                              <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">END COLOR</span>
                                              <div 
                                                className="h-8 w-full rounded-lg border-2 border-white shadow-md relative overflow-hidden checkerboard-bg"
                                              >
                                                  <div className="absolute inset-0" style={{ backgroundColor: hexToRgbaString(selectedShape.gradient_stops?.[1]?.color || '#ffffff', selectedShape.gradient_stops?.[1]?.alpha ?? 1) }} />
                                                  <input type="color" value={selectedShape.gradient_stops?.[1]?.color || '#ffffff'} onChange={(e) => updateGradientStop(1, { color: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                              </div>
                                          </div>

                                          {/* Opacity End */}
                                          <div className="flex items-center gap-2">
                                              <span className="text-[5px] font-black text-slate-400 uppercase w-8">ALPHA</span>
                                              <input 
                                                  type="range" min="0" max="1" step="0.01" 
                                                  value={selectedShape.gradient_stops?.[1]?.alpha ?? 1} 
                                                  onChange={(e) => updateGradientStop(1, { alpha: parseFloat(e.target.value) }, false)}
                                                  onMouseUp={(e) => updateGradientStop(1, { alpha: parseFloat((e.target as any).value) }, true)}
                                                  className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                              />
                                          </div>
                                      </div>
                                  </div>
                                  <SmoothSlider label="GRADIENT ANGLE" min={0} max={360} value={selectedShape.gradient_deg || 90} onChange={(v: number, s: boolean) => updateShape('gradient_deg', v, s)} unit="°" />
                              </div>
                          )}
                          
                          <div className="h-px bg-slate-200/50" />
                          <SmoothSlider label="MASTER OPACITY" min={0} max={1} step={0.01} value={selectedShape.opacity ?? 1} onChange={(v: number, s: boolean) => updateShape('opacity', v, s)} unit="%" />
                      </div>
                  </div>

                  {/* SECTION 3: STROKE */}
                  <div className="space-y-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Square size={10}/> Stroke Outline</span>
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                          <div className="w-10 h-10 rounded-xl border-2 border-white shadow-md relative overflow-hidden shrink-0" style={{ backgroundColor: selectedShape.stroke_color }}>
                              <input type="color" value={selectedShape.stroke_color} onChange={(e) => updateShape('stroke_color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                          </div>
                          <div className="flex-1">
                              <SmoothSlider label="STROKE WIDTH" min={0} max={50} value={selectedShape.stroke_width} onChange={(v: number, s: boolean) => updateShape('stroke_width', v, s)} unit="PX" />
                          </div>
                      </div>
                  </div>

                  {/* SECTION 4: SHADOW ENGINE */}
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layers size={10}/> Shadow Engine</span>
                          <button onClick={() => updateShape('shadow_enabled', !selectedShape.shadow_enabled, true)} className={`w-8 h-4 rounded-full transition-colors relative ${selectedShape.shadow_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${selectedShape.shadow_enabled ? 'left-4.5' : 'left-0.5'}`} />
                          </button>
                      </div>

                      {selectedShape.shadow_enabled && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner animate-in slide-in-from-top-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-[6px] font-bold text-slate-400 uppercase tracking-wider">SHADOW COLOR</span>
                                  <div className="w-6 h-6 rounded-lg border border-slate-200 overflow-hidden relative" style={{ backgroundColor: shadowColorState.hex }}>
                                      <input type="color" value={shadowColorState.hex} onChange={(e) => updateShadowColorHex(e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                  </div>
                              </div>
                              <SmoothSlider 
                                label="SHADOW ALPHA" 
                                min={0} max={1} step={0.01} 
                                value={shadowColorState.alpha} 
                                onChange={(v: number, s: boolean) => updateShadowAlpha(v, s)} 
                                unit="%" 
                              />
                              <SmoothSlider label="BLUR (SOFTNESS)" min={0} max={100} value={selectedShape.shadow_blur || 0} onChange={(v: number, s: boolean) => updateShape('shadow_blur', v, s)} unit="PX" />
                              <div className="grid grid-cols-2 gap-4">
                                  <SmoothSlider label="OFFSET X" min={-50} max={50} value={selectedShape.shadow_x || 0} onChange={(v: number, s: boolean) => updateShape('shadow_x', v, s)} unit="PX" />
                                  <SmoothSlider label="OFFSET Y" min={-50} max={50} value={selectedShape.shadow_y || 0} onChange={(v: number, s: boolean) => updateShape('shadow_y', v, s)} unit="PX" />
                              </div>
                          </div>
                      )}
                  </div>

                  {/* SECTION 5: GLASS & BLUR */}
                  <div className="space-y-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Droplets size={10}/> Blur & Glass</span>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                          {/* BACKDROP BLUR */}
                          <SmoothSlider 
                              label="BACKDROP BLUR (GLASS)" 
                              min={0} max={250} 
                              value={selectedShape.effects?.backdropBlur || 0} 
                              onChange={(v: number, s: boolean) => updateEffect('backdropBlur', v, s)} 
                              unit="PX" 
                          />
                          
                          {/* OPACITY SHORTCUT FOR GLASS */}
                          <div className="pt-2 bg-white/50 p-2 rounded-xl border border-slate-100/50">
                              <SmoothSlider 
                                  label="GLASS OPACITY" 
                                  min={0} max={1} step={0.01} 
                                  value={selectedShape.opacity ?? 1} 
                                  onChange={(v: number, s: boolean) => updateShape('opacity', v, s)} 
                                  unit="%" 
                              />
                              <p className="text-[6px] text-indigo-400 font-bold mt-1.5 flex items-center gap-1">
                                  <Wind size={8} /> LOWER OPACITY TO REVEAL GLASS EFFECT
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* SECTION 6: BLENDING */}
                  <div className="space-y-4">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Ghost size={10}/> Blend Mode</span>
                      <div className="relative">
                          <select 
                              value={selectedShape.blend_mode || 'normal'} 
                              onChange={(e) => updateShape('blend_mode', e.target.value, true)} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-700 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all shadow-sm"
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

              </div>

              {/* Back Button */}
              <div className="p-4 border-t border-slate-50 mt-auto bg-white sticky bottom-0">
                  <button 
                    onClick={() => onSelectLayer(null)} 
                    className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-transparent hover:border-slate-200 active:scale-95"
                  >
                      BACK TO SHAPES
                  </button>
              </div>
          </div>
      );
  }

  // Default Grid View (No Selection)
  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn p-6">
        <div className="grid grid-cols-2 gap-3">
            {[
                { type: 'rect', icon: <Square size={20} />, label: 'RECTANGLE' },
                { type: 'circle', icon: <Circle size={20} />, label: 'CIRCLE' },
                { type: 'triangle', icon: <Triangle size={20} />, label: 'TRIANGLE' },
                { type: 'star', icon: <Star size={20} />, label: 'STAR' },
                { type: 'line', icon: <Minus size={20} />, label: 'LINE' },
            ].map(item => (
                <button 
                    key={item.label}
                    onClick={() => handleAddShape(item.type as any)}
                    className="flex flex-col items-center justify-center gap-3 p-6 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-indigo-200 transition-all text-slate-400 hover:text-indigo-600 group active:scale-95"
                >
                    <div className="transform group-hover:scale-110 transition-transform">{item.icon}</div>
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
            ))}
        </div>
    </div>
  );
};
