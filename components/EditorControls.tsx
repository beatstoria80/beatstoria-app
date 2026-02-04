
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppConfig, ChatMessage, PenToolMode } from '../types';
import { 
    Maximize2, Zap, Layout, Palette, Grid3X3, Ruler, MonitorDown, 
    Sparkles, ChevronDown, Upload, Monitor, Gauge,
    Aperture, MousePointer2, List, Type, Shapes, Box, 
    PanelLeft, Ratio, RefreshCw, Hash, Target, Info, Wind,
    MoveHorizontal, MoveVertical, Square, Image as ImageIcon,
    Scissors, MessageSquare, RotateCw, Sliders, Edit3,
    CloudCheck, Loader2, Plus, ArrowRight, Save, Database, History, Download, X,
    Activity, Bot, Minimize2 as MinimizeIcon, CheckCircle2,
    FolderPlus, FolderMinus, Merge, Combine, Trash2
} from 'lucide-react';
import { ASPECT_RATIOS, PATTERNS, SOLID_BACKGROUND_PRESETS, PERFORMANCE_PRESETS, NOISE_TEXTURE, DEFAULT_CONFIG } from '../constants';
import { SidebarMenu } from './SidebarMenu';

// Sub-Modules
import { LayersPanel } from './editor/LayersPanel';
import { TypographyEngine } from './editor/TypographyEngine';
import { AssetEngine } from './editor/AssetEngine';
import { FXEngine } from './editor/FXEngine';
import { ShapeVectorEngine } from './editor/ShapeVectorEngine';
import { MaskEngine } from './editor/MaskEngine';
import { ImageEditorEngine } from './editor/ImageEditorEngine';

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
  onGroup?: () => void;
  onUngroup?: () => void;
  onMerge?: () => void;
  isAssistantOpen: boolean;
  onToggleAssistant: () => void;
  chatMessages?: ChatMessage[];
  chatInput?: string;
  setChatInput?: (v: string) => void;
  onSendMessage?: (text?: string) => void;
  isChatLoading?: boolean;
  onClearChat?: () => void;
  chatAttachments?: any[];
  setChatAttachments?: (v: any) => void;
  isAutoSaving?: boolean;
  lastSaved?: Date | null;
  onNewProject?: (data?: any) => void;
  onSaveToLocal?: () => void;
  onImportLocal?: (data: any) => void;
  projectLibrary?: any[];
  onLoadProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  isBackendMenuOpen: boolean;
  setIsBackendMenuOpen: (v: boolean) => void;
  currentMasterId?: string;
}

const PatternPreview = ({ pattern, color }: { pattern: string, color?: string }) => {
    if (pattern === 'none') return <div className="w-full h-full bg-slate-50 flex items-center justify-center text-[6px] font-black text-slate-300">NONE</div>;
    const finalColor = color || (pattern === 'blueprint' ? 'rgba(0,168,255,0.4)' : 'rgba(0,0,0,0.4)');
    let bg = '';
    let size = '20px 20px';
    
    // Exact match with CanvasPreview.tsx logic
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
    activeSection: controlledActiveSection, 
    onSectionChange: controlledOnSectionChange, 
    penToolMode, setPenToolMode, onOpenBgRemover, onOpenNanoUpscaler, onOpenNanoGen, onOpenRetouch, onGroup, onUngroup, onMerge,
    isAssistantOpen, onToggleAssistant,
    isAutoSaving = false, lastSaved, onNewProject, onSaveToLocal, onImportLocal, projectLibrary = [], onLoadProject, onDeleteProject,
    isBackendMenuOpen, setIsBackendMenuOpen, currentMasterId
}) => {
  const canvas = config?.canvas || DEFAULT_CONFIG.canvas;
  const [localActiveSection, setLocalActiveSection] = useState<string | null>('canvas');
  const [spaceTab, setSpaceTab] = useState<'geometry' | 'surface' | 'grids' | 'hud' | 'output'>('hud');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSection = controlledActiveSection !== undefined ? controlledActiveSection : localActiveSection;

  useEffect(() => {
    // CRITICAL FIX: Do not auto-switch sections if the user is currently interacting with the Layers panel.
    // This allows selecting/organizing layers without the UI jumping to the property editor.
    if (activeSection === 'layers') return;

    if (selectedId) {
        const isImage = config?.image_layers?.some(l => l.id === selectedId) || selectedId === 'bg-layer';
        const isText = selectedId === 'headline' || selectedId === 'subtitle' || config?.additional_texts?.some(l => l.id === selectedId);
        const isShape = config?.shapes?.some(l => l.id === selectedId);

        if (isImage) handleSectionToggle('image-editor');
        else if (isText) handleSectionToggle('typography');
        else if (isShape) handleSectionToggle('shapes');
        else handleSectionToggle('layers');
    }
  }, [selectedId]); // Intentionally omitting activeSection to prevent layout locking

  const handleSectionToggle = (id: string | null) => {
      if (controlledOnSectionChange) {
          controlledOnSectionChange(id);
      } else {
          setLocalActiveSection(id);
      }
  };

  const updateCanvas = useCallback((updates: Partial<AppConfig['canvas']>, save = false) => {
    if (!config) return;
    setConfig(prev => {
        const baseCanvas = prev?.canvas || DEFAULT_CONFIG.canvas;
        return { 
            ...prev, 
            canvas: { ...baseCanvas, ...updates } 
        };
    }, save);
  }, [config, setConfig]);

  const handleActivateAllAids = () => {
    updateCanvas({
        show_rulers: true,
        show_guides: true,
        show_grid: true,
        safe_area: 128,
        guide_opacity: 0.6
    }, true);
  };

  const applyPerformancePreset = (preset: typeof PERFORMANCE_PRESETS[0]) => {
    updateCanvas({ global_effects: { ...preset.effects } }, true);
  };

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

  const SectionHeader = ({ id, label, icon, actions }: { id: string, label: string, icon: React.ReactNode, actions?: React.ReactNode }) => (
    <div 
      onClick={() => handleSectionToggle(activeSection === id ? null : id)} 
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
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em] group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                    {icon} {label}
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 min-w-[32px] text-center">
                  <span className="text-indigo-600 font-mono text-[8px] font-black">
                      {unit === '%' ? Math.round((value || 0) * 100) : (value || 0)}{unit}
                  </span>
                </div>
            </div>
            <div className="px-1">
                {onChange && (
                    <input 
                        type="range" min={min} max={max} step={step} value={value || 0} 
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 shadow-inner" 
                    />
                )}
            </div>
        </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-full h-full flex flex-col items-center py-6 gap-6 bg-slate-900">
        <button onClick={onHome} className="p-2 mb-4 text-white hover:bg-white/10 rounded-xl transition-all"><Zap size={24} fill="white" /></button>
        <button onClick={onExpand} className="mt-auto p-2 text-white/50 hover:text-white transition-colors"><PanelLeft size={20} /></button>
      </div>
    );
  }

  const isImageSelected = selectedId && (config?.image_layers?.some(l => l.id === selectedId) || selectedId === 'bg-layer');

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 shrink-0 bg-white z-20">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform" onClick={() => setIsBackendMenuOpen(true)}>
                  <div className="w-7 h-7 bg-slate-950 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:bg-indigo-600 transition-colors"><Zap size={14} fill="white" /></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:text-indigo-600 transition-colors leading-none">SPACE ENGINE</span>
                      <span className="text-[6px] font-black text-indigo-500 uppercase tracking-widest mt-1">NEURAL V3.2 PRO</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4 ml-1">
                  <button onClick={() => onNewProject?.()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-all shadow-md active:scale-95 group" title="Initialize Genesis">
                      <Plus size={10} strokeWidth={4} />
                      <span className="text-[9px] font-black uppercase tracking-widest">NEW</span>
                  </button>
                  <button onClick={() => setIsBackendMenuOpen(true)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-500 hover:scale-[1.02] active:scale-95 ${isAutoSaving ? 'bg-indigo-50 border border-indigo-100' : 'bg-green-50 border border-green-100'}`} title={lastSaved ? `Last Sync: ${lastSaved.toLocaleTimeString()}. Click to open registry.` : 'Backend Handshake'}>
                      {isAutoSaving ? (
                          <><Loader2 size={10} className="animate-spin text-indigo-500" /><span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">SYNCING</span></>
                      ) : (
                          <><div className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></div><span className="text-[8px] font-black text-green-600 uppercase tracking-widest">SAVED</span></>
                      )}
                  </button>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto custom-scrollbar pb-24">
            
            <SectionHeader id="canvas" label="ENVIRONMENT" icon={<Maximize2 size={16} />} />
            {activeSection === 'canvas' && (
                <div className="p-3 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex p-1 bg-slate-100 rounded-xl gap-0.5 shadow-inner border border-slate-200/50">
                        {[
                            { id: 'surface', label: 'FILL', icon: <Palette size={11} /> }, 
                            { id: 'geometry', label: 'SIZE', icon: <Layout size={11} /> }, 
                            { id: 'grids', label: 'GRID', icon: <Grid3X3 size={11} /> }, 
                            { id: 'hud', label: 'GUIDE', icon: <Ruler size={11} /> }, 
                            { id: 'output', label: 'SAVE', icon: <Database size={11} /> }
                        ].map(t => (
                            <button key={t.id} onClick={(e) => { e.stopPropagation(); setSpaceTab(t.id as any); }} className={`flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${spaceTab === t.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                {t.icon}
                                <span className="text-[6px] font-black uppercase tracking-tight">{t.label}</span>
                            </button>
                        ))}
                    </div>

                    {spaceTab === 'output' && (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                            <div className="flex items-center gap-2"><Save size={14} className="text-indigo-600" /><div className="flex flex-col"><span className="text-[9px] font-black text-indigo-950 uppercase tracking-widest">Local Export</span><span className="text-[6px] font-bold text-indigo-400 uppercase tracking-widest">Custom .spc format</span></div></div>
                            <button onClick={onSaveToLocal} className="w-full py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-indigo-500/10 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 active:scale-95"><Download size={12} /> Download (.spc)</button>
                        </div>
                    </div>
                    )}
                    
                    {spaceTab === 'geometry' && (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
                            <ControlLabel label="Width" icon={<MoveHorizontal size={10}/>} value={canvas.width} onChange={(v: number) => updateCanvas({ width: v }, true)} min={100} max={4000} />
                            <ControlLabel label="Height" icon={<MoveVertical size={10}/>} value={canvas.height} onChange={(v: number) => updateCanvas({ height: v }, true)} min={100} max={4000} />
                        </div>
                        <div className="space-y-2">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Ratio size={10}/> Precision Presets</span>
                            <div className="grid grid-cols-2 gap-2">
                                {ASPECT_RATIOS.map(r => (
                                <button key={r.value} onClick={() => updateCanvas({ width: r.width, height: r.height }, true)} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group shadow-sm">
                                    <div className="flex flex-col text-left"><span className="text-[8px] font-black uppercase text-slate-700 group-hover:text-indigo-600 tracking-wider">{r.label}</span><span className="text-[6px] font-bold text-slate-400">{r.width}x{r.height}</span></div>
                                    <div className="text-slate-300 group-hover:text-indigo-400">{r.value === '1:1' ? <Square size={12}/> : <Monitor size={12}/>}</div>
                                </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}

                    {spaceTab === 'surface' && (
                    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                        
                        {/* Background Media Uploader & Library */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <ImageIcon size={9} className="text-indigo-500" /> Background Media
                                </span>
                            </div>
                            
                            {!canvas.background_image ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group bg-slate-50/50"
                                >
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm border border-slate-100 transition-colors">
                                        <Upload size={14} />
                                    </div>
                                    <span className="text-[7px] font-bold text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest">Upload Local</span>
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

                            {config.stash && config.stash.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-50">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">From Library</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {config.stash.map((asset) => (
                                            <button 
                                                key={asset.id} 
                                                onClick={() => updateCanvas({ background_image: asset.src }, true)} 
                                                className={`aspect-square rounded-lg border overflow-hidden hover:border-indigo-500 transition-all relative group ${canvas.background_image === asset.src ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-100'}`}
                                            >
                                                <img src={asset.src} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-50">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Palette size={9}/> Master Background</span>
                            <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200/50 shadow-inner">
                                <button onClick={() => updateCanvas({ background_gradient_enabled: false }, true)} className={`flex-1 py-1 text-[7px] font-black uppercase rounded-md transition-all ${!canvas.background_gradient_enabled ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400'}`}>Solid</button>
                                <button onClick={() => updateCanvas({ background_gradient_enabled: true }, true)} className={`flex-1 py-1 text-[7px] font-black uppercase rounded-md transition-all ${canvas.background_gradient_enabled ? 'bg-white shadow-sm text-indigo-600 border border-slate-200' : 'text-slate-400'}`}>Grad</button>
                            </div>
                            
                            {!canvas.background_gradient_enabled ? (
                                <div className="grid grid-cols-6 gap-1.5">
                                {SOLID_BACKGROUND_PRESETS.slice(0, 5).map(c => <button key={c} onClick={() => updateCanvas({ background_color: c }, true)} className={`aspect-square rounded-md border ${canvas.background_color === c ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-100'}`} style={{ backgroundColor: c }} />)}
                                <div className="aspect-square rounded-md border border-slate-200 overflow-hidden relative shadow-sm" style={{ backgroundColor: canvas.background_color || '#ffffff' }}><input type="color" value={canvas.background_color || '#ffffff'} onChange={(e) => updateCanvas({ background_color: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div>
                                </div>
                            ) : (
                                <div className="space-y-4 p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">START</span><div className="h-8 rounded-lg border-2 border-white relative overflow-hidden shadow-md" style={{ backgroundColor: canvas.background_gradient_start || '#ffffff' }}><input type="color" value={canvas.background_gradient_start || '#ffffff'} onChange={(e) => updateCanvas({ background_gradient_start: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div></div>
                                        <div className="space-y-1"><span className="text-[6px] font-black text-slate-400 uppercase tracking-widest px-1">END</span><div className="h-8 rounded-lg border-2 border-white relative overflow-hidden shadow-md" style={{ backgroundColor: canvas.background_gradient_end || '#000000' }}><input type="color" value={canvas.background_gradient_end || '#000000'} onChange={(e) => updateCanvas({ background_gradient_end: e.target.value }, true)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" /></div></div>
                                    </div>
                                    <ControlLabel label="ANGLE" icon={<RotateCw size={9}/>} min={0} max={360} value={canvas.background_gradient_deg || 0} onChange={(v: number) => updateCanvas({ background_gradient_deg: v }, true)} unit="°" />
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
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                             <ControlLabel label="Density" icon={<Hash size={9}/>} value={canvas.background_pattern_opacity || 0.1} min={0} max={1} step={0.01} onChange={(v: number) => updateCanvas({ background_pattern_opacity: v }, true)} unit="%" />
                        </div>
                    </div>
                    )}

                    {spaceTab === 'hud' && (
                    <div className="space-y-3 animate-in slide-in-from-right-2 duration-300">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5">
                                <Ruler size={11} className="text-indigo-500" />
                                <span className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em]">VISUAL AIDS</span>
                            </div>
                            <button 
                                onClick={handleActivateAllAids}
                                className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-md text-[7px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-md"
                            >
                                <CheckCircle2 size={8} /> ACTIVATE
                            </button>
                        </div>
                        
                        {/* COMPACT GRID FOR AID TOGGLES */}
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { id: 'show_rulers', label: 'RULERS', icon: <Maximize2 size={12}/> },
                                { id: 'show_guides', label: 'GUIDES', icon: <Monitor size={12}/> },
                                { id: 'show_grid', label: 'GRID', icon: <Grid3X3 size={12}/> }
                            ].map(opt => {
                                const val = !!canvas[opt.id as keyof AppConfig['canvas']];
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
                        
                        {/* COMPACT SLIDERS */}
                        <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2 shadow-inner">
                            <ControlLabel label="Print Safe Area" icon={<Target size={9} />} min={0} max={200} step={4} value={canvas.safe_area || 0} onChange={(v: number) => updateCanvas({ safe_area: v }, true)} unit="PX" />
                            <div className="h-px bg-slate-100" />
                            <ControlLabel label="Aid Intensity" icon={<Wind size={9} />} min={0} max={1} step={0.1} value={canvas.guide_opacity || 0} onChange={(v: number) => updateCanvas({ guide_opacity: v }, true)} unit="%" />
                        </div>
                    </div>
                    )}
                </div>
            )}

            <SectionHeader 
                id="layers" 
                label="LAYERS" 
                icon={<List size={16} />}
                actions={activeSection === 'layers' && (
                    <div className="flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                        <button onClick={onGroup} disabled={selectedIds.length < 2} className="p-1 bg-slate-800 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-30" title="Group"><FolderPlus size={10} /></button>
                        <button onClick={onUngroup} disabled={!selectedIds.some(id => config?.groups?.some(g => g.layerIds.includes(id)))} className="p-1 bg-slate-800 text-white rounded hover:bg-indigo-600 transition-colors disabled:opacity-30" title="Ungroup"><FolderMinus size={10} /></button>
                        <button onClick={onMerge} disabled={selectedIds.length < 2} className="p-1 bg-slate-800 text-white rounded hover:bg-purple-600 transition-colors disabled:opacity-30" title="Merge"><Combine size={10} /></button>
                    </div>
                )}
            />
            {activeSection === 'layers' && <LayersPanel config={config} setConfig={setConfig} selectedIds={selectedIds} onSelectLayer={onSelectLayer} isVisible={true} setIsVisible={() => {}} onGroup={onGroup} onUngroup={onUngroup} onMerge={onMerge} />}
            
            <SectionHeader id="image-editor" label="IMAGE EDITOR" icon={<Sliders size={16} />} />
            {activeSection === 'image-editor' && (
                isImageSelected ? (
                    <ImageEditorEngine config={config} setConfig={setConfig} selectedId={selectedId} onSelectLayer={onSelectLayer} />
                ) : (
                    <div className="p-6 text-center flex flex-col items-center justify-center gap-3 bg-slate-50/50 rounded-xl mx-4 my-2 border border-dashed border-slate-200">
                        <ImageIcon size={18} className="text-slate-300" />
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Select image node to calibrate</p>
                    </div>
                )
            )}

            <SectionHeader id="typography" label="TYPEFACE" icon={<Type size={16} />} />
            {activeSection === 'typography' && <TypographyEngine config={config} setConfig={setConfig} selectedId={selectedId} onSelectLayer={onSelectLayer} handleAddTextLayer={(text) => {}} />}
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
            {activeSection === 'asset' && <AssetEngine config={config} setConfig={setConfig} selectedId={selectedId} onSelectLayer={onSelectLayer} onOpenBgRemover={onOpenBgRemover} onOpenNanoUpscaler={onOpenNanoUpscaler} onOpenNanoGen={onOpenNanoGen} onOpenRetouch={onOpenRetouch} />}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-[120] border-t border-slate-100 bg-white p-2 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-center bg-slate-50 p-1 rounded-lg">
              <button onClick={onToggleAssistant} className={`flex-1 py-1.5 flex justify-center rounded-md transition-all ${isAssistantOpen ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`} title="Neural Assistant">
                  <MessageSquare size={13}/>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};
