
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, CaseUpper, Type as TypeIcon,
  Scaling, ArrowUpFromLine, ArrowRightLeft, RotateCw, Spline, Waves, 
  Paintbrush, Layers, Ban, Circle, TextCursorInput, 
  MoveHorizontal, MoveVertical, Sparkles, Check, ChevronDown, 
  Type, Wind, Magnet, RectangleHorizontal, Italic, AlignLeft, AlignCenter, AlignRight,
  Bold, ArrowRightToLine, ArrowDownToLine, Maximize, Star, Search, Grid, Scissors,
  ArrowDown, ArrowUp, ArrowLeft, ArrowRight, CircleDashed, Zap
} from 'lucide-react';
import { AppConfig, TextLayer } from '../../types';
import { FONTS, DEFAULT_EFFECTS } from '../../constants';

interface TypographyEngineProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
  onSelectLayer: (id: string | null, multi?: boolean) => void;
  handleAddTextLayer: (text: string) => void;
  onOpenTypefaceStudio?: () => void;
}

// Daftar Icon Populer untuk Quick Pick
const COMMON_ICONS = [
    "search", "home", "settings", "menu", "close", "check", "favorite", "add", "delete", "arrow_back",
    "arrow_forward", "star", "logout", "account_circle", "shopping_cart", "visibility", "lock", "person",
    "calendar_today", "help", "language", "thumb_up", "filter_list", "image", "edit", "share", "bolt",
    "verified", "fingerprint", "dashboard", "pets", "flight", "rocket", "forest", "water_drop", "fire_truck",
    "local_shipping", "sports_soccer", "fitness_center", "directions_run", "pedal_bike", "pool", "diamond",
    "savings", "payments", "shopping_bag", "store", "sell", "lightbulb", "dark_mode", "wifi", "signal_cellular_alt",
    "battery_full", "bluetooth", "headphones", "camera_alt", "videocam", "mic", "music_note", "dns", "public",
    "rocket_launch", "smart_toy", "terminal", "code", "bug_report", "android", "recycling", "eco", "nature_people"
];

const getFontCSS = (fontString: string) => {
    if (!fontString) return { fontFamily: 'Montserrat', fontWeight: 400 };
    const parts = fontString.split(' ');
    const lastPart = parts[parts.length - 1];
    const weights: Record<string, number> = {
        'Thin': 100, 'Light': 300, 'Regular': 400, 'Medium': 500,
        'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800, 'Black': 900
    };
    if (weights[lastPart]) return { fontFamily: parts.slice(0, -1).join(' '), fontWeight: weights[lastPart], label: fontString };
    return { fontFamily: fontString, fontWeight: 400, label: fontString };
};

const SmoothSlider = ({ label, min, max, step = 1, value, onChange, icon, unit = "" }: any) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);

  const handleChange = (newValue: number, commit: boolean) => {
      setLocalValue(newValue);
      onChange(newValue, commit);
  };

  return (
    <div className="space-y-2 group">
        <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
            <span className="flex items-center gap-1.5">{icon} {label}</span>
            <div className="flex items-center">
                <input 
                    type="number" 
                    value={localValue} 
                    onChange={(e) => handleChange(Number(e.target.value), false)}
                    onBlur={() => handleChange(localValue, true)}
                    className="w-12 text-right bg-transparent text-indigo-600 font-mono text-[8px] font-black focus:outline-none focus:bg-indigo-50 rounded px-1"
                />
                <span className="text-indigo-400 font-mono text-[8px] font-black bg-indigo-50 px-1 py-0.5 rounded-r">{unit}</span>
            </div>
        </div>
        <input 
            type="range" 
            min={min} 
            max={max} 
            step={step} 
            value={localValue} 
            onChange={(e) => handleChange(Number(e.target.value), false)} 
            onMouseUp={() => handleChange(localValue, true)} 
            className="w-full h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" 
        />
    </div>
  );
};

export const TypographyEngine: React.FC<TypographyEngineProps> = ({ config, setConfig, selectedId, onSelectLayer, onOpenTypefaceStudio }) => {
  const selectedTextLayer = config.additional_texts.find(t => t.id === selectedId);
  const [showFontList, setShowFontList] = useState(false);
  const [activeSection, setActiveSection] = useState<'font' | 'icon' | 'fill' | 'shadow' | 'warp' | 'mask'>('font');
  const [iconSearch, setIconSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClick = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowFontList(false); };
      document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const updateProperty = (key: string, value: any, save = false) => {
      setConfig(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          if (selectedTextLayer) {
              const idx = next.additional_texts.findIndex((t: TextLayer) => t.id === selectedId);
              if (idx !== -1) {
                  next.additional_texts[idx][key] = value;
              }
          }
          return next;
      }, save);
  };

  const handleIconSelect = (iconName: string) => {
      setConfig(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          if (selectedTextLayer) {
              const idx = next.additional_texts.findIndex((t: TextLayer) => t.id === selectedId);
              if (idx !== -1) {
                  next.additional_texts[idx].text = iconName;
                  next.additional_texts[idx].font = "Material Symbols Outlined";
                  next.additional_texts[idx].resize_mode = 'auto-width';
                  next.additional_texts[idx].letter_spacing = 0;
              }
          }
          return next;
      }, true);
  };

  const getValue = (key: string) => {
      if (selectedTextLayer) return (selectedTextLayer as any)[key];
      return undefined;
  };

  const handleAddNew = () => {
      const newId = `text-${Date.now()}`;
      const newLayer: TextLayer = { id: newId, text: "NEW NODE", font: "Montserrat Medium", font_size: 120, color: "#000", position_x: config.canvas.width/2-300, position_y: config.canvas.height/2, width: 600, height: 160, rotation: 0, alignment: "center", effects: { ...DEFAULT_EFFECTS }, resize_mode: 'auto-width', wrap_enabled: false };
      setConfig(prev => ({ ...prev, additional_texts: [...prev.additional_texts, newLayer], layerOrder: [...prev.layerOrder, newId] }), true);
      onSelectLayer(newId);
  };

  const currentFont = getValue('font') || 'Montserrat Medium';
  const currentFontStyle = getFontCSS(currentFont);
  const currentResizeMode = getValue('resize_mode') || 'auto-width';

  const filteredIcons = COMMON_ICONS.filter(icon => icon.toLowerCase().includes(iconSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn overflow-y-auto pb-32">
        <div className="p-4 border-b border-slate-50 space-y-3">
            {/* AI Generator Button */}
            <button 
                onClick={onOpenTypefaceStudio}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg active:scale-95"
            >
                <Zap size={14} fill="currentColor" /> Neural Typeface Studio
            </button>

            <button onClick={handleAddNew} className="w-full py-3.5 bg-slate-50 text-slate-600 border border-slate-100 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95">
                <Plus size={14} /> Standard Text
            </button>
        </div>

        {selectedTextLayer ? (
            <div className="flex flex-col">
                <div className="flex p-1 bg-slate-100 m-4 rounded-xl gap-1 border border-slate-200/50 shadow-inner overflow-x-auto">
                    {[ 
                        { id: 'font', icon: <Type size={12} />, label: 'FONT' }, 
                        { id: 'icon', icon: <Grid size={12} />, label: 'ICON' },
                        { id: 'fill', icon: <Paintbrush size={12} />, label: 'FILL' }, 
                        { id: 'shadow', icon: <Layers size={12} />, label: 'DEPTH' }, 
                        { id: 'warp', icon: <Spline size={12} />, label: 'WARP' },
                        { id: 'mask', icon: <Scissors size={12} />, label: 'MASK' } 
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveSection(tab.id as any)} className={`flex-1 min-w-[50px] py-2 flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${activeSection === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                            {tab.icon}<span className="text-[6px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="px-4 space-y-6">
                    {activeSection === 'font' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            
                            <div className="flex items-center justify-between p-1 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                                <button 
                                    onClick={() => updateProperty('resize_mode', 'auto-width', true)} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${currentResizeMode === 'auto-width' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Auto Width"
                                >
                                    <ArrowRightToLine size={14} />
                                    <span className="text-[7px] font-black uppercase tracking-widest">Auto Width</span>
                                </button>
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                <button 
                                    onClick={() => updateProperty('resize_mode', 'auto-height', true)} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all ${currentResizeMode === 'auto-height' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title="Fixed Width"
                                >
                                    <ArrowDownToLine size={14} />
                                    <span className="text-[7px] font-black uppercase tracking-widest">Fixed Width</span>
                                </button>
                            </div>

                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1"><TextCursorInput size={12} className="text-indigo-500" /> Content & Typeface</label>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner">
                                <div className="relative group">
                                    <textarea 
                                        value={getValue('text')} 
                                        onChange={(e) => updateProperty('text', e.target.value)} 
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none h-28 shadow-sm" 
                                        placeholder="ENTER TEXT..." 
                                    />
                                </div>

                                <div className="space-y-2 relative" ref={dropdownRef}>
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Font Family</span>
                                    <button 
                                        onClick={() => setShowFontList(!showFontList)} 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-indigo-400 shadow-sm transition-all group"
                                    >
                                        <span className="text-[16px] text-slate-800 truncate" style={{ fontFamily: currentFontStyle.fontFamily, fontWeight: currentFontStyle.fontWeight }}>
                                            {currentFontStyle.label}
                                        </span>
                                        <ChevronDown size={14} className={`text-slate-400 group-hover:text-indigo-500 transition-transform ${showFontList ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {showFontList && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                            {FONTS.map(font => {
                                                const fStyle = getFontCSS(font);
                                                return (
                                                    <button 
                                                        key={font} 
                                                        onClick={() => { updateProperty('font', font, true); setShowFontList(false); }} 
                                                        className={`text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between ${currentFont === font ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                                    >
                                                        <span className="text-[16px] leading-none" style={{ fontFamily: fStyle.fontFamily, fontWeight: fStyle.fontWeight }}>{font}</span>
                                                        {currentFont === font && <Check size={14} className="text-white" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-4 pt-2">
                                    <SmoothSlider label="FONT SIZE" icon={<Scaling size={10}/>} min={10} max={1000} value={getValue('font_size') || 60} onChange={(v: number, s: boolean) => updateProperty('font_size', v, s)} unit="PX" />
                                    <SmoothSlider label="LINE HEIGHT" icon={<ArrowUpFromLine size={10}/>} min={0.5} max={3} step={0.1} value={getValue('line_height') || 1.0} onChange={(v: number, s: boolean) => updateProperty('line_height', v, s)} />
                                    <SmoothSlider label="LETTER SPACING" icon={<ArrowRightLeft size={10}/>} min={-10} max={100} value={getValue('letter_spacing') || 0} onChange={(v: number, s: boolean) => updateProperty('letter_spacing', v, s)} unit="PX" />
                                    <SmoothSlider label="ROTATION" icon={<RotateCw size={10}/>} min={0} max={360} value={getValue('rotation') || 0} onChange={(v: number, s: boolean) => updateProperty('rotation', v, s)} unit="°" />
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-1">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                            <button key={align} onClick={() => updateProperty('alignment', align, true)} className={`flex-1 py-1.5 flex justify-center rounded-lg transition-all ${getValue('alignment') === align ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-indigo-50'}`}>
                                                {align === 'left' && <AlignLeft size={14} />}
                                                {align === 'center' && <AlignCenter size={14} />}
                                                {align === 'right' && <AlignRight size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => updateProperty('italic', !getValue('italic'), true)} className={`p-1.5 w-10 flex justify-center rounded-xl border transition-all ${getValue('italic') ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400'}`} title="Italic"><Italic size={14} /></button>
                                        <button onClick={() => updateProperty('text', getValue('text').toUpperCase(), true)} className="p-1.5 w-10 flex justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 transition-all" title="UPPERCASE"><CaseUpper size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'mask' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Scissors size={12} className="text-teal-500" /> Masking Effect
                            </label>
                            
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-5 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Enable Fade Mask</span>
                                    <button 
                                        onClick={() => updateProperty('mask_enabled', !getValue('mask_enabled'), true)} 
                                        className={`w-10 h-5 rounded-full transition-colors relative ${getValue('mask_enabled') ? 'bg-teal-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('mask_enabled') ? 'left-6' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {getValue('mask_enabled') && (
                                    <div className="space-y-5 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'fade-bottom', label: 'Bottom Fade', icon: <ArrowDown size={14} /> },
                                                { id: 'fade-top', label: 'Top Fade', icon: <ArrowUp size={14} /> },
                                                { id: 'fade-left', label: 'Left Fade', icon: <ArrowLeft size={14} /> },
                                                { id: 'fade-right', label: 'Right Fade', icon: <ArrowRight size={14} /> },
                                                { id: 'radial', label: 'Vignette', icon: <CircleDashed size={14} /> }
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => updateProperty('mask_type', m.id, true)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[8px] font-bold uppercase transition-all ${
                                                        (getValue('mask_type') || 'fade-bottom') === m.id 
                                                        ? 'bg-teal-600 border-teal-500 text-white shadow-md' 
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-teal-300'
                                                    }`}
                                                >
                                                    {m.icon} {m.label}
                                                </button>
                                            ))}
                                        </div>

                                        <SmoothSlider 
                                            label="FEATHER STRENGTH" 
                                            icon={<Wind size={10}/>} 
                                            min={0} max={100} 
                                            value={getValue('mask_feather') || 50} 
                                            onChange={(v: number, s: boolean) => updateProperty('mask_feather', v, s)} 
                                            unit="%" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'icon' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Star size={12} className="text-yellow-500" /> Symbol Library
                            </label>
                            
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={iconSearch}
                                        onChange={(e) => setIconSearch(e.target.value)}
                                        placeholder="Search icons (e.g. star, home)..."
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all uppercase tracking-wide placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredIcons.map((icon) => (
                                        <button 
                                            key={icon}
                                            onClick={() => handleIconSelect(icon)}
                                            className="aspect-square bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all group"
                                            title={icon}
                                        >
                                            <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">{icon}</span>
                                        </button>
                                    ))}
                                    {filteredIcons.length === 0 && (
                                        <div className="col-span-5 py-8 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            No icons found
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Icon Styling</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                                        <div className="w-6 h-6 rounded-full border border-white shadow-sm relative overflow-hidden" style={{ backgroundColor: getValue('color') || '#000' }}>
                                            <input type="color" value={getValue('color') || '#000000'} onChange={(e) => updateProperty('color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                        </div>
                                    </div>
                                </div>

                                <SmoothSlider label="ICON SCALE" icon={<Scaling size={10}/>} min={10} max={1000} value={getValue('font_size') || 60} onChange={(v: number, s: boolean) => updateProperty('font_size', v, s)} unit="PX" />
                                <SmoothSlider label="ROTATION" icon={<RotateCw size={10}/>} min={0} max={360} value={getValue('rotation') || 0} onChange={(v: number, s: boolean) => updateProperty('rotation', v, s)} unit="°" />
                                
                                <div className="pt-2 border-t border-slate-200/50">
                                     <div className="flex items-center justify-between mb-2">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layers size={10}/> Quick Shadow</span>
                                        <button onClick={() => updateProperty('shadow_enabled', !getValue('shadow_enabled'), true)} className={`w-8 h-4 rounded-full transition-colors relative ${getValue('shadow_enabled') ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('shadow_enabled') ? 'left-4.5' : 'left-0.5'}`} />
                                        </button>
                                     </div>
                                     {getValue('shadow_enabled') && (
                                         <div className="space-y-2">
                                            <SmoothSlider label="SHADOW BLUR" min={0} max={50} value={getValue('shadow_blur') || 0} onChange={(v: number, s: boolean) => updateProperty('shadow_blur', v, s)} unit="PX" />
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">SHADOW COLOR</span>
                                                <div className="w-5 h-5 rounded-md border border-white shadow-sm relative overflow-hidden" style={{ backgroundColor: getValue('shadow_color') || 'rgba(0,0,0,0.5)' }}>
                                                    <input type="color" value={getValue('shadow_color')?.startsWith('rgba') ? '#000000' : (getValue('shadow_color') || '#000')} onChange={(e) => updateProperty('shadow_color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                </div>
                                            </div>
                                         </div>
                                     )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'fill' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1"><Paintbrush size={12} className="text-pink-500" /> Fill & Outline</label>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Solid Color</span>
                                    <div className="flex items-center gap-3">
                                        {getValue('fill_enabled') !== false && (
                                            <div className="w-9 h-9 rounded-full border-2 border-white shadow-md relative overflow-hidden" style={{ backgroundColor: getValue('color') }}>
                                                <input type="color" value={getValue('color')} onChange={(e) => updateProperty('color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                            </div>
                                        )}
                                        <button onClick={() => updateProperty('fill_enabled', getValue('fill_enabled') === false ? true : false, true)} className={`w-10 h-5 rounded-full transition-colors relative ${getValue('fill_enabled') !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('fill_enabled') !== false ? 'left-6' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between cursor-pointer" onClick={() => updateProperty('gradient_enabled', !getValue('gradient_enabled'), true)}>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gradient Text</span>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${getValue('gradient_enabled') ? 'bg-pink-600' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('gradient_enabled') ? 'left-6' : 'left-0.5'}`} /></div>
                                </div>
                                {getValue('gradient_enabled') && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 space-y-1.5">
                                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">START</span>
                                                <div className="w-full h-10 rounded-xl border-2 border-white shadow-md relative overflow-hidden" style={{ backgroundColor: getValue('gradient_start') || '#000' }}><input type="color" value={getValue('gradient_start') || '#000'} onChange={(e) => updateProperty('gradient_start', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /></div>
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">END</span>
                                                <div className="w-full h-10 rounded-xl border-2 border-white shadow-md relative overflow-hidden" style={{ backgroundColor: getValue('gradient_end') || '#3b82f6' }}><input type="color" value={getValue('gradient_end') || '#3b82f6'} onChange={(e) => updateProperty('gradient_end', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /></div>
                                            </div>
                                        </div>
                                        <SmoothSlider label="GRADIENT ANGLE" icon={<RotateCw size={10}/>} min={0} max={360} value={getValue('gradient_deg') || 90} onChange={(v: number, s: boolean) => updateProperty('gradient_deg', v, s)} unit="°" />
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><RectangleHorizontal size={10}/> Text Stroke</span>
                                    <button onClick={() => updateProperty('stroke_enabled', !getValue('stroke_enabled'), true)} className={`w-10 h-5 rounded-full transition-colors relative ${getValue('stroke_enabled') ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('stroke_enabled') ? 'left-6' : 'left-0.5'}`} /></button>
                                </div>
                                {getValue('stroke_enabled') && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Stroke Color</span>
                                            <div className="w-7 h-7 rounded-full border border-white shadow-sm relative overflow-hidden" style={{ backgroundColor: getValue('stroke_color') || '#000' }}><input type="color" value={getValue('stroke_color') || '#000'} onChange={(e) => updateProperty('stroke_color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /></div>
                                        </div>
                                        <SmoothSlider label="STROKE WIDTH" min={0} max={50} value={getValue('stroke_width') || 2} onChange={(v: number, s: boolean) => updateProperty('stroke_width', v, s)} unit="PX" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'shadow' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={12} className="text-slate-600" /> Neural Shadow & Depth</label>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-5 shadow-inner">
                                <div className="flex items-center justify-between"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Enable Shadow</span><button onClick={() => updateProperty('shadow_enabled', !getValue('shadow_enabled'), true)} className={`w-10 h-5 rounded-full transition-colors relative ${getValue('shadow_enabled') ? 'bg-slate-900' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${getValue('shadow_enabled') ? 'left-6' : 'left-0.5'}`} /></button></div>
                                {getValue('shadow_enabled') && (
                                    <div className="space-y-5 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between"><span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Shadow Color</span><div className="w-7 h-7 rounded-lg border border-white shadow-sm relative overflow-hidden" style={{ backgroundColor: getValue('shadow_color') || 'rgba(0,0,0,0.5)' }}><input type="color" value={getValue('shadow_color')?.startsWith('rgba') ? '#000000' : (getValue('shadow_color') || '#000')} onChange={(e) => updateProperty('shadow_color', e.target.value, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div></div>
                                        <SmoothSlider label="DIFFUSION (BLUR)" icon={<Wind size={10}/>} min={0} max={100} value={getValue('shadow_blur') || 0} onChange={(v: number, s: boolean) => updateProperty('shadow_blur', v, s)} unit="PX" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <SmoothSlider label="OFFSET X" icon={<MoveHorizontal size={10}/>} min={-50} max={50} value={getValue('shadow_offset_x') || 0} onChange={(v: number, s: boolean) => updateProperty('shadow_offset_x', v, s)} unit="PX" />
                                            <SmoothSlider label="OFFSET Y" icon={<MoveVertical size={10}/>} min={-50} max={50} value={getValue('shadow_offset_y') || 0} onChange={(v: number, s: boolean) => updateProperty('shadow_offset_y', v, s)} unit="PX" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'warp' && (
                        <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                            <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 px-1"><Spline size={12} className="text-purple-500" /> Neural Warp Engine</label>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-5 shadow-inner">
                                <div className="grid grid-cols-4 gap-2">
                                    {[ { id: 'none', icon: <Ban size={14}/>, label: 'NONE' }, { id: 'arch', icon: <Spline size={14}/>, label: 'ARCH' }, { id: 'wave', icon: <Waves size={14}/>, label: 'WAVE' }, { id: 'circle', icon: <Circle size={14}/>, label: 'CIRCLE' } ].map(warp => (
                                        <button key={warp.id} onClick={() => updateProperty('warp_type', warp.id, true)} className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all ${getValue('warp_type') === warp.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>{warp.icon}<span className="text-[6px] font-black uppercase tracking-widest">{warp.label}</span></button>
                                    ))}
                                </div>
                                {getValue('warp_type') !== 'none' && (
                                    <div className="space-y-5 animate-in slide-in-from-top-2">
                                        <SmoothSlider label="WARP BEND" icon={<Magnet size={10}/>} min={-100} max={100} value={getValue('warp_bend') ?? 50} onChange={(v: number, s: boolean) => updateProperty('warp_bend', v, s)} unit="%" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 mt-auto border-t border-slate-50 pb-20">
                    <button onClick={() => { setConfig(prev => ({ ...prev, additional_texts: prev.additional_texts.filter(t => t.id !== selectedId), layerOrder: prev.layerOrder.filter(id => id !== selectedId) }), true); onSelectLayer(null); }} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-100"><Trash2 size={14} /> Remove Node</button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30">
                <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-dashed border-slate-200"><TypeIcon size={40} strokeWidth={1} /></div>
                <div className="space-y-2"><span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">No Text Unit Identified</span></div>
            </div>
        )}
    </div>
  );
};
