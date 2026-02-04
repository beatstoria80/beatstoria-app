import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppConfig, ChatMessage, PenToolMode, ImageLayer } from '../../types';
import { 
    Maximize2, Zap, Layout, Palette, Grid3X3, Ruler, MonitorDown, 
    Sparkles, ChevronDown, Upload, Monitor, Gauge,
    Aperture, MousePointer2, List, Type, Shapes, Box, 
    PanelLeft, Ratio, RefreshCw, Hash, Target, Info, Wind,
    MoveHorizontal, MoveVertical, Square, Image as ImageIcon,
    Scissors, MessageSquare, RotateCw, Sliders, Edit3,
    CloudCheck, Loader2, Plus, ArrowRight, Save, Database, History, Download, X,
    Activity, Bot, Minimize2 as MinimizeIcon, CheckCircle2,
    FolderPlus, FolderMinus, Merge, Combine, Trash2, Flame, MonitorUp, Eraser, Bandage,
    Fingerprint, Cpu, Wand2, UploadCloud, Film, Smartphone, Clapperboard, BookOpen
} from 'lucide-react';
import { ASPECT_RATIOS, PATTERNS, SOLID_BACKGROUND_PRESETS, NOISE_TEXTURE, DEFAULT_CONFIG, DEFAULT_EFFECTS } from '../../constants';

// Sub-Modules
import { LayersPanel } from './LayersPanel';
import { TypographyEngine } from './TypographyEngine';
import { AssetEngine } from './AssetEngine';
import { FXEngine } from './FXEngine';
import { ShapeVectorEngine } from './ShapeVectorEngine';
import { MaskEngine } from './MaskEngine';
import { ImageEditorEngine } from './ImageEditorEngine';

interface EditorControlsProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedId: string | null;
  selectedIds: string[];
  onSelectLayer: (id: string | null, multi?: boolean, append?: boolean) => void;
  collapsed?: boolean;
  onExpand?: () => void;
  onHome?: () => void;
  activeSection?: string | null;
  onSectionChange?: (section: string | null) => void;
  setZoom?: (val: number) => void;
  penToolMode: PenToolMode;
  setPenToolMode: (mode: PenToolMode) => void;
  onOpenBgRemover?: (src?: string) => void;
  onOpenNanoUpscaler?: (src?: string) => void;
  onOpenNanoGen?: (src?: string) => void;
  onOpenRetouch?: (src?: string) => void;
  onOpenTitanFill?: (src?: string) => void;
  onOpenStory?: (src?: string) => void;
  onOpenNoteLM?: () => void;
  onOpenTypefaceStudio?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onMerge?: () => void;
  isAssistantOpen: boolean;
  onToggleAssistant: () => void;
  isAutoSaving?: boolean;
  lastSaved?: Date | null;
  onNewProject?: () => void;
  isBackendMenuOpen: boolean;
  setIsBackendMenuOpen: (v: boolean) => void;
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

const PatternPreview = ({ pattern, color }: { pattern: string, color?: string }) => {
    if (pattern === 'none') return <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[6px] font-black text-slate-300">NONE</div>;
    const finalColor = color || (pattern === 'blueprint' ? 'rgba(0,168,255,0.4)' : 'rgba(0,0,0,0.4)');
    let bg = '';
    let size = '20px 20px';
    
    if (pattern === 'grid-thin') { 
        bg = `linear-gradient(${finalColor} 1px, transparent 1px), linear-gradient(90deg, ${finalColor} 1px, transparent 1px)`; 
        size = '20px 20px';
    }
    else if (pattern === 'grid-dashed') { 
        bg = `linear-gradient(90deg, ${finalColor} 1px, transparent 1px), linear-gradient(180deg, ${finalColor} 1px, transparent 1px)`; 
        size = '40px 40px'; 
    }
    else if (pattern === 'dot-regular') { 
        bg = `radial-gradient(${finalColor} 1.5px, transparent 1.5px)`; 
        size = '20px 20px';
    }
    else if (pattern === 'diagonal-stripes') { 
        bg = `repeating-linear-gradient(45deg, ${finalColor}, ${finalColor} 1px, transparent 1px, transparent 10px)`; 
        size = 'auto';
    }
    else if (pattern === 'checkerboard') { 
        bg = `linear-gradient(45deg, ${finalColor} 25%, transparent 25%), linear-gradient(-45deg, ${finalColor} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${finalColor} 75%), linear-gradient(-45deg, transparent 75%, ${finalColor} 75%)`; 
        size = '30px 30px'; 
    }
    else if (pattern === 'blueprint') { 
        bg = `linear-gradient(${finalColor} 1px, transparent 1px), linear-gradient(90deg, ${finalColor} 1px, transparent 1px)`; 
        size = '50px 50px';
    }
    else if (pattern === 'noise-static') { 
        bg = `url("${NOISE_TEXTURE}")`; 
        size = '60px 60px'; 
    }
    else if (pattern === 'circuit-board') {
        bg = `radial-gradient(${finalColor} 2px, transparent 2px), radial-gradient(${finalColor} 2px, transparent 2px)`;
        size = '30px 30px';
    }

    return <div className="w-full h-full opacity-50" style={{ backgroundImage: bg, backgroundSize: size }} />;
};

export const EditorControls: React.FC<EditorControlsProps> = ({ 
    config, setConfig, selectedId, selectedIds, onSelectLayer, collapsed, onExpand, onHome, 
    penToolMode, setPenToolMode, onOpenBgRemover, onOpenNanoUpscaler, onOpenNanoGen, onOpenRetouch, onOpenTitanFill, onOpenStory, onOpenTypefaceStudio,
    onOpenNoteLM,
    onGroup, onUngroup, onMerge,
    isAssistantOpen, onToggleAssistant,
    isAutoSaving = false, lastSaved, onNewProject, 
    isBackendMenuOpen, setIsBackendMenuOpen
}) => {
  const [activeSection, setActiveSection] = useState<string | null>('layers'); 
  const [spaceTab, setSpaceTab] = useState<'geometry' | 'surface' | 'grids' | 'hud'>('geometry');
  const [isNeuralCenterCollapsed, setIsNeuralCenterCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);
  const neuralUploadRef = useRef<HTMLInputElement>(null);

  const canvas = config.canvas;
  const activeImageLayer = config.image_layers.find(l => l.id === selectedId);
  const activeImageSrc = activeImageLayer?.src;

  const updateCanvas = useCallback((updates: Partial<AppConfig['canvas']>, save = false) => {
    setConfig(prev => ({ 
        ...prev, 
        canvas: { ...prev.canvas, ...updates } 
    }), save);
  }, [setConfig]);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          updateCanvas({ background_image: ev.target.result as string }, true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleUploadLayer = (e: React.ChangeEvent<HTMLInputElement>, isNeural: boolean = false) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
            const src = ev.target.result as string;
            const img = new Image();
            img.onload = () => {
                const newId = `img-${Date.now()}`;
                const newLayer: ImageLayer = {
                    id: newId, src,
                    position_x: config.canvas.width/2 - img.width/4,
                    position_y: config.canvas.height/2 - img.height/4,
                    width: img.width/2, height: img.height/2,
                    rotation: 0, locked: false, hidden: false,
                    effects: { ...DEFAULT_EFFECTS }
                };
                setConfig(prev => ({
                    ...prev,
                    image_layers: [...prev.image_layers, newLayer],
                    layerOrder: [...prev.layerOrder, newId]
                }), true);
                setTimeout(() => onSelectLayer(newId), 50);
            };
            img.src = src;
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSectionToggle = (id: string) => {
      setActiveSection(prev => prev === id ? null : id);
  };

  const SectionHeader = ({ id, label, icon, actions }: { id: string, label: string, icon: React.ReactNode, actions?: React.ReactNode }) => (
    <div 
      onClick={() => handleSectionToggle(id)} 
      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-slate-50 transition-all ${activeSection === id ? 'bg-slate-900 text-white shadow-md' : 'hover:bg-slate-50/50 text-slate-400'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`transition-all duration-300 ${activeSection === id ? 'scale-110 text-indigo-400' : ''}`}>{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {actions}
            <ChevronDown size={14} className={`transition-transform duration-500 ${activeSection === id ? 'rotate-180' : 'rotate-0 text-slate-300'}`} />
        </div>
    </div>
  );

  const ControlLabel = ({ label, icon, value, onChange, min, max, step = 1, unit = "" }: any) => {
    return (
        <div className="flex flex-col gap-1.5 py-1.5 group">
            <div className="flex items-center justify-between px-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                    {icon} {label}
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 min-w-[32px] text-center">
                  <span className="text-indigo-600 font-mono text-[8px] font-black">
                      {unit === '%' ? Math.round((value || 0) * 100) : (value || 0)}{unit}
                  </span>
                </div>
            </div>
            <div className="px-1">
                <input 
                    type="range" min={min} max={max} step={step} value={value || 0} 
                    onChange={(e) => onChange(Number(e.target.value))}
                    onMouseUp={(e) => onChange(Number((e.target as any).value), true)}
                    className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 shadow-inner" 
                />
            </div>
        </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-full h-full flex flex-col items-center py-6 gap-6 bg-slate-900">
        <button onClick={onHome} className="p-2 mb-4 text-white hover:bg-white/10 rounded-xl transition-all"><TungkuIcon size={24} className="text-orange-500" /></button>
        <button onClick={onExpand} className="mt-auto p-2 text-white/50 hover:text-white transition-colors"><PanelLeft size={20} /></button>
      </div>
    );
  }

  const isImageSelected = selectedId && (config.image_layers.some(l => l.id === selectedId) || selectedId === 'bg-layer');
  const isMergeDisabled = selectedIds.length === 0 || (selectedIds.length === 1 && !selectedIds[0].startsWith('group-'));

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 shrink-0 bg-white z-20">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform" onClick={() => setIsBackendMenuOpen(true)}>
                  <div className="relative w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-black shadow-lg group-hover:bg-orange-600 transition-colors overflow-visible">
                      {/* Smoke Particles */}
                      <div className="smoke-trail scale-[0.3]" style={{ top: '-12px', left: '10%', animationDelay: '0.1s' }} />
                      <div className="smoke-trail scale-[0.4]" style={{ top: '-15px', left: '45%', animationDelay: '0.9s' }} />
                      <div className="smoke-trail scale-[0.3]" style={{ top: '-10px', left: '80%', animationDelay: '1.4s' }} />
                      
                      <TungkuIcon size={14} className="relative z-10" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:text-orange-600 transition-colors leading-none">SPACE <span className="text-orange-500">STUDIO</span></span>
                      <span className="text-[6px] font-black text-indigo-500 uppercase tracking-widest mt-1">Beatstoria AI</span>
                  </div>
              </div>
          </div>
          <button onClick={onNewProject} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-md"><Plus size={14}/></button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto custom-scrollbar pb-24">
            
            <div className="p-4 space-y-4 animate-in fade-in duration-700 bg-slate-50/50 border-b border-slate-100 transition-all">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Cpu size={13} className="text-indigo-600 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.25em]">Neural Center</span>
                    </div>
                    <button 
                        onClick={() => setIsNeuralCenterCollapsed(!isNeuralCenterCollapsed)}
                        className="p-1 hover:bg-slate-200 rounded transition-all text-slate-400 hover:text-slate-900"
                    >
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isNeuralCenterCollapsed ? '' : 'rotate-180'}`} />
                    </button>
                </div>

                {!isNeuralCenterCollapsed && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                        <button 
                            onClick={() => onOpenNanoGen?.(activeImageSrc)}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-yellow-400 hover:shadow-[0_8px_20px_rgba(234,179,8,0.1)] transition-all active:scale-95 text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-500 group-hover:text-white transition-all shrink-0">
                                <Flame size={16} />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Cooking<br/>Engine</span>
                        </button>

                        <button 
                            onClick={() => onOpenNoteLM?.()}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-[0_8px_20px_rgba(59,130,246,0.1)] transition-all active:scale-95 text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                                <BookOpen size={16} />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Space<br/>NoteLM</span>
                        </button>
                        
                        <button 
                            onClick={() => onOpenTitanFill?.(activeImageSrc)}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-400 hover:shadow-[0_8px_20px_rgba(168,85,247,0.1)] transition-all active:scale-95 text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all shrink-0">
                                <Wand2 size={16} />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Titan<br/>Fill</span>
                        </button>

                        <button 
                            onClick={() => onOpenBgRemover?.(activeImageSrc)}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-rose-400 hover:shadow-[0_8px_20px_rgba(244,63,94,0.1)] transition-all active:scale-95 text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-all shrink-0">
                                <Scissors size={16} />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Purge<br/>BG</span>
                        </button>

                        <button 
                            onClick={() => onOpenRetouch?.(activeImageSrc)}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-400 hover:shadow-[0_8px_20px_rgba(16,185,129,0.1)] transition-all active:scale-95 text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                                <Bandage size={16} />
                            </div>
                            <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Neural<br/>Retouch</span>
                        </button>

                        <button 
                            onClick={() => onOpenStory?.(activeImageSrc)}
                            className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-[0_8px_20px_rgba(99,102,241,0.15)] transition-all active:scale-95 text-left col-span-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-50 group-hover:text-white transition-all shrink-0">
                                <Film size={16} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-600 group-hover:text-slate-900 uppercase tracking-widest leading-tight">Story Campaign Flow</span>
                                <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Generative UI UX Sequences</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            <SectionHeader id="canvas" label="ENVIRONMENT" icon={<Maximize2 size={16} />} />
            {activeSection === 'canvas' && (
                <div className="p-3 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex p-1 bg-slate-100 rounded-xl gap-0.5 shadow-inner border border-slate-200/50">
                        {[
                            { id: 'surface', label: 'FILL', icon: <Palette size={11} /> }, 
                            { id: 'geometry', label: 'SIZE', icon: <Layout size={11} /> }, 
                            { id: 'grids', label: 'GRID', icon: <Grid3X3 size={11} /> }, 
                            { id: 'hud', label: 'GUIDE', icon: <Ruler size={11} /> }, 
                        ].map(t => (
                            <button key={t.id} onClick={(e) => { e.stopPropagation(); setSpaceTab(t.id as any); }} className={`flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${spaceTab === t.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                {t.icon}
                                <span className="text-[6px] font-black uppercase tracking-tight">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1">
                        {spaceTab === 'geometry' && (
                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-2">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Project Identity</span>
                                    <input 
                                        type="text" 
                                        value={config.projectName || "UNTITLED PROJECT"} 
                                        onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }), true)}
                                        className="w-full bg-slate-50 border-b-2 border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-800 focus:border-indigo-600 focus:bg-white outline-none transition-all uppercase tracking-wide placeholder:text-slate-300"
                                        placeholder="ENTER PROJECT NAME"
                                    />
                                </div>

                                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                                    <ControlLabel label="Width" icon={<MoveHorizontal size={10}/>} value={canvas.width} onChange={(v: number, s: boolean) => updateCanvas({ width: v }, s)} min={100} max={4000} />
                                    <ControlLabel label="Height" icon={<MoveVertical size={10}/>} value={canvas.height} onChange={(v: number, s: boolean) => updateCanvas({ height: v }, s)} min={100} max={4000} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {ASPECT_RATIOS.map(r => (
                                        <button key={r.value} onClick={() => updateCanvas({ width: r.width, height: r.height }, true)} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
                                            <div className="flex flex-col text-left"><span className="text-[8px] font-black uppercase text-slate-700 group-hover:text-indigo-600 tracking-wider">{r.label}</span><span className="text-[6px] font-bold text-slate-400">{r.width}x{r.height}</span></div>
                                            <div className="text-slate-300 group-hover:text-indigo-400">
                                              {r.value === '1:1' ? <Square size={12}/> : r.value === '4:5' ? <Layout size={12}/> : r.value === '9:16' ? <Smartphone size={12}/> : <Monitor size={12}/>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {spaceTab === 'surface' && (
                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-3">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><ImageIcon size={9}/> Background Media</span>
                                    {!canvas.background_image ? (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group bg-slate-50/50"
                                        >
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm border border-slate-100 transition-colors">
                                                <Upload size={14} />
                                            </div>
                                            <span className="text-[7px] font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Upload Image</span>
                                        </div>
                                    ) : (
                                        <div className="relative w-full h-32 rounded-xl overflow-hidden group border border-slate-200 shadow-sm">
                                            <img src={canvas.background_image} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()} 
                                                    className="p-2 bg-white text-slate-900 rounded-lg shadow-lg hover:scale-110 transition-transform"
                                                    title="Replace"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => updateCanvas({ background_image: null }, true)} 
                                                    className="p-2 bg-white text-red-500 rounded-lg shadow-lg hover:scale-110 transition-transform"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleBgImageUpload} className="hidden" accept="image/*" />
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-50">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Palette size={9}/> Background Fill</span>
                                    <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200/50 shadow-inner">
                                        <button onClick={() => updateCanvas({ background_gradient_enabled: false }, true)} className={`flex-1 py-1 text-[7px] font-black uppercase rounded-md transition-all ${!canvas.background_gradient_enabled ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400'}`}>Solid</button>
                                        <button onClick={() => updateCanvas({ background_gradient_enabled: true }, true)} className={`flex-1 py-1 text-[7px] font-black uppercase rounded-md transition-all ${canvas.background_gradient_enabled ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400'}`}>Grad</button>
                                    </div>
                                    {!canvas.background_gradient_enabled ? (
                                        <div className="grid grid-cols-6 gap-1.5 mt-2">
                                            {SOLID_BACKGROUND_PRESETS.slice(0, 5).map(c => <button key={c} onClick={() => updateCanvas({ background_color: c }, true)} className={`aspect-square rounded-md border ${canvas.background_color === c ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-100'}`} style={{ backgroundColor: c }} />)}
                                            <div className="aspect-square rounded-md border border-slate-200 overflow-hidden relative shadow-sm" style={{ backgroundColor: canvas.background_color || '#ffffff' }}><input type="color" value={canvas.background_color || '#ffffff'} onChange={(e) => updateCanvas({ background_color: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-inner mt-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">START</span><div className="h-8 rounded-lg border-2 border-white relative overflow-hidden shadow-md" style={{ backgroundColor: canvas.background_gradient_start || '#ffffff' }}><input type="color" value={canvas.background_gradient_start || '#ffffff'} onChange={(e) => updateCanvas({ background_gradient_start: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div></div>
                                                <div className="space-y-1"><span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">END</span><div className="h-8 rounded-lg border-2 border-white relative overflow-hidden shadow-md" style={{ backgroundColor: canvas.background_gradient_end || '#000000' }}><input type="color" value={canvas.background_gradient_end || '#000000'} onChange={(e) => updateCanvas({ background_gradient_end: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div></div>
                                            </div>
                                            <ControlLabel label="ANGLE" icon={<RotateCw size={9}/>} min={0} max={360} value={canvas.background_gradient_deg || 0} onChange={(v: number, s: boolean) => updateCanvas({ background_gradient_deg: v }, s)} unit="°" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {spaceTab === 'grids' && (
                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Grid3X3 size={9}/> Patterns</span>
                                        <div className="w-5 h-5 rounded-md border border-slate-200 overflow-hidden relative shadow-sm" style={{ backgroundColor: canvas.background_pattern_color || '#000000' }}>
                                            <input type="color" value={canvas.background_pattern_color || '#000000'} onChange={(e) => updateCanvas({ background_pattern_color: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PATTERNS.slice(0, 6).map(p => {
                                            const isSelected = canvas.background_pattern === p;
                                            return (
                                                <button key={p} onClick={() => updateCanvas({ background_pattern: p }, true)} className={`group relative flex flex-col aspect-[4/3] rounded-xl border-2 transition-all overflow-hidden ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-md scale-[1.02]' : 'border-slate-100 bg-white hover:border-indigo-200'}`}>
                                                    <div className="flex-1 w-full bg-slate-50/50 relative overflow-hidden"><PatternPreview pattern={p} color={canvas.background_pattern_color} /></div>
                                                    <div className={`w-full py-1.5 flex items-center justify-center border-t transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}><span className="text-[7px] font-black uppercase tracking-widest truncate px-1">{p.replace(/-/g, ' ')}</span></div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <ControlLabel label="Density" icon={<Hash size={9}/>} value={canvas.background_pattern_opacity || 0.1} min={0} max={1} step={0.01} onChange={(v: number, s: boolean) => updateCanvas({ background_pattern_opacity: v }, s)} unit="%" />
                            </div>
                        )}

                        {spaceTab === 'hud' && (
                            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'show_rulers', label: 'RULERS', icon: <Maximize2 size={12}/> },
                                        { id: 'show_guides', label: 'GUIDES', icon: <Monitor size={12}/> },
                                        { id: 'show_grid', label: 'GRID', icon: <Grid3X3 size={12}/> }
                                    ].map(opt => {
                                        const val = !!(canvas as any)[opt.id];
                                        return (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => updateCanvas({ [opt.id]: !val }, true)} 
                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all duration-300 ${val ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-300 shadow-sm'}`}
                                            >
                                                <div className={val ? 'scale-110' : ''}>{opt.icon}</div>
                                                <span className="text-[7px] font-black uppercase tracking-[0.1em]">{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2 shadow-inner">
                                    <ControlLabel label="Print Safe Area" icon={<Target size={9} />} min={0} max={200} step={4} value={canvas.safe_area || 0} onChange={(v: number, s: boolean) => updateCanvas({ safe_area: v }, s)} unit="PX" />
                                    <div className="h-px bg-slate-100" />
                                    <ControlLabel label="Aid Intensity" icon={<Wind size={9} />} min={0} max={1} step={0.1} value={canvas.guide_opacity || 0} onChange={(v: number, s: boolean) => updateCanvas({ guide_opacity: v }, s)} unit="%" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <SectionHeader 
                id="layers" 
                label="LAYERS" 
                icon={<List size={16} />}
                actions={activeSection === 'layers' && (
                    <div className="flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                        <button onClick={onGroup} disabled={selectedIds.length < 2} className="p-1 bg-slate-800 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-30" title="Group"><FolderPlus size={10} /></button>
                        <button onClick={onUngroup} disabled={!selectedIds.some(id => config.groups.some(g => g.layerIds.includes(id)))} className="p-1 bg-slate-800 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-30" title="Ungroup"><FolderMinus size={10} /></button>
                        <button onClick={onMerge} disabled={isMergeDisabled} className="p-1 bg-slate-800 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-30" title="Merge"><Combine size={10} /></button>
                    </div>
                )}
            />
            {activeSection === 'layers' && <LayersPanel config={config} setConfig={setConfig} selectedIds={selectedIds} onSelectLayer={onSelectLayer} isVisible={true} setIsVisible={() => {}} onGroup={onGroup} onUngroup={onUngroup} onMerge={onMerge} />}
            
            <SectionHeader id="image-editor" label="IMAGE EDITOR" icon={<Sliders size={16} />} />
            {activeSection === 'image-editor' && (
                (() => {
                    const effectiveId = selectedId || (config.canvas.background_image ? 'bg-layer' : null);
                    const hasValidTarget = effectiveId && (effectiveId === 'bg-layer' || config.image_layers.some(l => l.id === effectiveId));
                    
                    if (hasValidTarget) {
                        return (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                {effectiveId === 'bg-layer' && (
                                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-center gap-2">
                                        <ImageIcon size={10} className="text-indigo-500" />
                                        <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Editing Background Layer</span>
                                    </div>
                                )}
                                <ImageEditorEngine config={config} setConfig={setConfig} selectedId={effectiveId} onSelectLayer={onSelectLayer} />
                            </div>
                        );
                    } else {
                        return (
                            <div 
                                className="p-8 text-center flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-2xl mx-4 my-2 border-2 border-dashed border-slate-200 group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer"
                                onClick={() => layerInputRef.current?.click()}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-slate-100 text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                                    <Upload size={20} strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest group-hover:text-indigo-700">No Image Active</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-400">Click to Upload New Layer</p>
                                </div>
                            </div>
                        );
                    }
                })()
            )}

            <SectionHeader id="typography" label="TYPEFACE" icon={<Type size={16} />} />
            {activeSection === 'typography' && (
                <TypographyEngine 
                    config={config} 
                    setConfig={setConfig} 
                    selectedId={selectedId} 
                    onSelectLayer={onSelectLayer} 
                    handleAddTextLayer={(text) => {}} 
                    onOpenTypefaceStudio={onOpenTypefaceStudio}
                />
            )}
            <SectionHeader id="shapes" label="GEOMETRY" icon={<Shapes size={16} />} />
            {activeSection === 'shapes' && <ShapeVectorEngine config={config} setConfig={setConfig} selectedId={selectedId} onSelectLayer={onSelectLayer} penToolMode={penToolMode} setPenToolMode={setPenToolMode} />}
            
            <SectionHeader id="masking" label="MASKING" icon={<Scissors size={16} />} />
            {activeSection === 'masking' && (
                isImageSelected && selectedId !== 'bg-layer' ? (
                    <MaskEngine config={config} setConfig={setConfig} selectedId={selectedId} />
                ) : (
                    <div className="p-6 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50 rounded-xl mx-4 my-2 border border-dashed border-slate-200">
                        <Scissors size={18} className="text-slate-300" />
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Select foreground image node</p>
                    </div>
                )
            )}

            <SectionHeader id="fx-engine" label="NEURAL FX" icon={<Zap size={16} />} />
            {activeSection === 'fx-engine' && <FXEngine config={config} setConfig={setConfig} selectedId={selectedId} />}
            
            <SectionHeader id="asset" label="ASSETS" icon={<Box size={16} />} />
            {activeSection === 'asset' && <AssetEngine config={config} setConfig={setConfig} selectedId={selectedId} onSelectLayer={onSelectLayer} onOpenBgRemover={onOpenBgRemover} onOpenNanoUpscaler={onOpenNanoUpscaler} onOpenNanoGen={onOpenNanoGen} onOpenRetouch={onOpenRetouch} onOpenStory={onOpenStory} />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-[120] border-t border-slate-100 bg-white p-2 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-center bg-slate-50 p-1 rounded-lg">
              <button onClick={onToggleAssistant} className={`flex-1 py-1.5 flex justify-center rounded-md transition-all ${isAssistantOpen ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`} title="Neural Assistant">
                  <MessageSquare size={13}/>
              </button>
            </div>
        </div>
      </div>
      <input type="file" ref={layerInputRef} onChange={(e) => handleUploadLayer(e)} className="hidden" accept="image/*" />
    </div>
  );
};