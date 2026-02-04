import React, { useRef, useState, useEffect } from 'react';
import { 
    X, Zap, Plus, FolderOpen, Trash2, Layout,
    CheckCircle2, Loader2, Cpu, Clock, FilePenLine, HardDrive,
    LayoutGrid, History, Check, Upload, Download, ArrowRight,
    FileJson, FileUp, Cloud, Globe, ShieldCheck, Link, Database,
    Activity, Lock, LogOut, RefreshCw, Server, Search, FilePen,
    Save, LogIn, ChevronLeft, CircleAlert, HardDriveDownload, Gauge, Eraser, TriangleAlert
} from 'lucide-react';
import { AppConfig, FrameStatus } from '../types';
import { NewProjectFlow } from './editor/NewProjectFlow';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNew: (data?: { name: string, description: string, width: number, height: number }) => void;
  onImport: (data: any) => void;
  config: AppConfig;
  onUpdateConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig)) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  projectLibrary: any[];
  currentProjectId: string;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => Promise<void>;
  onPurgeAll: () => Promise<void>;
}

const ProjectCard = ({ name, date, active, onClick, onDelete, onExport, id }: any) => {
  // DOUBLE-TAP CONFIRMATION STATE (Like Artboard Logic)
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      // Auto-reset confirmation if not clicked within 3 seconds
      if (deleteStage === 'confirm') {
          confirmTimeoutRef.current = setTimeout(() => {
              setDeleteStage('idle');
          }, 3000);
      }
      return () => {
          if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      };
  }, [deleteStage]);

  // Robust Delete Handler (Double Tap Logic)
  const handleDeleteClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop bubble to prevent opening the project
      e.nativeEvent.stopImmediatePropagation();
      
      if (deleteStage === 'deleting') return;

      if (deleteStage === 'idle') {
          // FIRST CLICK: ARM THE BUTTON
          setDeleteStage('confirm');
      } else if (deleteStage === 'confirm') {
          // SECOND CLICK: EXECUTE DELETE
          setDeleteStage('deleting');
          try {
              await onDelete(id);
              // Parent will unmount this component, so no need to reset state usually
          } catch (error) {
              console.error("Deletion failed", error);
              setDeleteStage('idle');
          }
      }
  };

  return (
    <div 
      onClick={deleteStage === 'idle' ? onClick : undefined}
      className={`group relative flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all duration-500 cursor-pointer ${
        active 
        ? 'bg-slate-900 border-indigo-500 shadow-xl scale-[1.02] z-10' 
        : deleteStage === 'confirm'
            ? 'bg-red-50 border-red-200 ring-2 ring-red-500/20' // Warning State
            : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:scale-[1.01]'
      }`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${
          deleteStage === 'confirm' ? 'bg-red-500 text-white animate-pulse' : 
          active ? 'bg-indigo-600 text-white rotate-6' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
      }`}>
        {deleteStage === 'confirm' ? <TriangleAlert size={20} strokeWidth={2.5} /> : <span className="text-sm font-black uppercase tracking-widest">{name ? name.substring(0, 2) : 'UN'}</span>}
      </div>

      <div className="flex flex-col overflow-hidden min-w-0 flex-1">
        <span className={`text-[11px] font-black uppercase tracking-wide truncate ${active ? 'text-white' : deleteStage === 'confirm' ? 'text-red-600' : 'text-slate-800'}`}>
          {deleteStage === 'confirm' ? "CONFIRM DELETE?" : (name || "UNTITLED PROJECT")}
        </span>
        <div className="flex items-center gap-2 mt-1.5">
           <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider ${active ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {active ? 'ACTIVE NODE' : 'CACHED'}
           </div>
           <span className={`text-[8px] font-bold uppercase tracking-wide truncate ${active ? 'text-slate-400' : 'text-slate-300'}`}>
             {date}
           </span>
        </div>
      </div>
      
      {/* Action Buttons - High Z-Index */}
      <div className="flex items-center gap-2 relative z-30" onClick={(e) => e.stopPropagation()}>
          <div className={`flex items-center gap-1.5 ${active || deleteStage === 'confirm' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
            {/* Export Button (Hide during confirm) */}
            {deleteStage === 'idle' && (
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExport(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-2 rounded-xl transition-all ${active ? 'bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600 shadow-sm'}`}
                    title="Export Protocol"
                >
                    <Download size={14} />
                </button>
            )}
            
            {/* DOUBLE TAP DELETE BUTTON */}
            <button 
                onClick={handleDeleteClick}
                onMouseDown={(e) => e.stopPropagation()} // Critical: Prevent card activation
                disabled={deleteStage === 'deleting'}
                className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                    deleteStage === 'confirm'
                    ? 'bg-red-600 text-white w-24 justify-center shadow-lg scale-105' // Expand on confirm
                    : active 
                        ? 'bg-white/10 text-red-400 hover:bg-red-500 hover:text-white' 
                        : 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white shadow-sm'
                }`}
                title={deleteStage === 'confirm' ? "Click again to confirm" : "Secure Delete"}
            >
                {deleteStage === 'deleting' ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : deleteStage === 'confirm' ? (
                    <span className="text-[9px] font-black uppercase tracking-widest">PURGE!</span>
                ) : (
                    <Trash2 size={14} />
                )}
            </button>
          </div>
      </div>
    </div>
  );
};

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ 
  isOpen, onClose, onNew, onImport, config, onUpdateConfig,
  onSave, isSaving, saveSuccess, projectLibrary = [], currentProjectId, onLoadProject, onDeleteProject, onPurgeAll
}) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'flow'>('registry');
  const [neuralLoad, setNeuralLoad] = useState(36);
  const [showNewProjectFlow, setShowNewProjectFlow] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // GHOST PROTOCOL: Local state to instantly hide deleted items before DB confirms
  const [ghostedIds, setGhostedIds] = useState<Set<string>>(new Set());
  
  // Local purge state for UI feedback
  const [isPurging, setIsPurging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        // Reset ghosted IDs when menu opens to ensure sync with real DB state
        setGhostedIds(new Set());
        const interval = setInterval(() => {
            setNeuralLoad(prev => {
                const delta = Math.floor(Math.random() * 5) - 2;
                return Math.max(30, Math.min(48, prev + delta));
            });
        }, 3000);
        return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleStatusChange = (status: FrameStatus) => {
    onUpdateConfig(prev => ({ ...prev, canvas: { ...prev.canvas, status } }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                if (ev.target?.result) {
                    const data = JSON.parse(ev.target.result as string);
                    const projectData = data.data || data;
                    onImport(projectData);
                    onClose();
                }
            } catch (err) {
                alert("Format file tidak valid (.spc atau .json dibutuhkan)");
            }
        };
        reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportProject = (project: any) => {
      const dataToExport = {
          version: "3.2",
          timestamp: Date.now(),
          projectName: project.name || "Untitled",
          data: project.data || project
      };
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(project.name || 'Project').replace(/\s+/g, '_')}.spc`;
      link.click();
  };

  // INTERCEPT DELETE TO APPLY GHOSTING (TRASH UI UX)
  const handleImmediateDelete = async (id: string) => {
      // 1. Visual Purge (Instant State) - Hide it immediately
      setGhostedIds(prev => new Set(prev).add(id));
      
      // 2. Logic Purge (Async DB) - Actually delete it
      await onDeleteProject(id);
  };

  /* Fix: Renamed handlePurgeAllProjects to handlePurgeClick for consistency with UI call */
  const handlePurgeClick = async () => {
      // Immediate UI feedback locally before passing to parent
      if (window.confirm("WARNING: This will delete ALL saved projects from your local browser storage. This action cannot be undone.\n\nUse this only if the app is slow or lagging due to corrupt files.")) {
          setIsPurging(true);
          try {
              await onPurgeAll();
          } catch (e) {
              setIsPurging(false);
              alert("Purge failed. Please reload manually.");
          }
      }
  };

  const filteredProjects = projectLibrary.filter(p => 
      !ghostedIds.has(p.id) && // Filter out ghosted items
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <NewProjectFlow 
        isOpen={showNewProjectFlow} 
        onClose={() => setShowNewProjectFlow(false)} 
        onConfirm={(data) => {
            onNew(data);
            setShowNewProjectFlow(false);
            onClose();
        }} 
      />

      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-md z-[4000] transition-opacity duration-700 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-4 left-4 bottom-4 w-[420px] bg-white z-[4001] shadow-[0_30px_100px_rgba(0,0,0,0.3)] rounded-[2.5rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'} overflow-hidden flex flex-col border border-slate-200/50`}
      >
        {/* TOP BAR */}
        <div className="px-8 py-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ${activeTab === 'flow' ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-slate-950 shadow-slate-900/20'}`}>
                    {activeTab === 'flow' ? <Cloud size={22} /> : <Database size={22} />}
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">BACKEND</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">
                        {activeTab === 'flow' ? 'Google Flow Bridge' : 'Local Browser Registry'}
                    </span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-all active:scale-90"><X size={22} /></button>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner border border-slate-200/50">
            <button 
                onClick={() => setActiveTab('registry')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'registry' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                LOCAL REGISTRY
            </button>
            <button 
                onClick={() => setActiveTab('flow')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${activeTab === 'flow' ? 'bg-white text-indigo-600 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                GOOGLE FLOW
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 space-y-10">
          
          {activeTab === 'registry' ? (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-700">
                
                {/* ACTIVE SESSION STATUS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Session Record</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Cpu size={10} className="text-slate-500" />
                            <span className="text-[9px] font-mono font-bold text-slate-600">{neuralLoad}% CPU</span>
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-1 shadow-inner relative group overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/50 bg-white/40">
                             <div className="flex items-center gap-2 text-indigo-600">
                                <Activity size={14} className="animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">LIVE WORKSPACE</span>
                             </div>
                             <button 
                                onClick={onSave}
                                disabled={isSaving}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isSaving ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600 hover:bg-green-100 active:scale-95'}`}
                             >
                                <span className="text-[8px] font-black uppercase tracking-widest">
                                    {isSaving ? 'SYNCING...' : 'SAVE STATE'}
                                </span>
                                {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                             </button>
                        </div>

                        <div className="p-6 bg-white rounded-2xl shadow-sm space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">PROJECT IDENTIFIER</label>
                                    <FilePen size={12} className="text-indigo-500" />
                                </div>
                                <input 
                                    type="text"
                                    value={config.projectName || ""}
                                    onChange={(e) => onUpdateConfig(prev => ({ ...prev, projectName: e.target.value.toUpperCase() }))}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    className="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 hover:border-indigo-200 focus:border-indigo-600 p-1 focus:ring-0 placeholder:text-slate-200 uppercase tracking-tight transition-all outline-none"
                                    placeholder="UNTITLED NODE"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">WORKFLOW STAGE</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED'] as FrameStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={`py-2 rounded-xl text-[7px] font-black uppercase tracking-wider transition-all border ${
                                            config.canvas.status === status 
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                        >
                                            {status.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LIBRARY CACHE */}
                <div className="space-y-5 flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <HardDrive size={14} className="text-indigo-500" /> Library Cache
                        </span>
                        <div className="px-3 py-1 bg-slate-100 rounded-full border border-slate-200/50 shadow-sm">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{filteredProjects.length} PROJECT RECORDS</span>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="SEARCH DATABASE REGISTRY..." 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300 uppercase tracking-[0.1em] shadow-inner"
                        />
                    </div>

                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1 max-h-[450px] pb-4">
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map((proj) => (
                                <ProjectCard 
                                    key={proj.id}
                                    id={proj.id}
                                    name={proj.name} 
                                    date={proj.lastSaved ? new Date(proj.lastSaved).toLocaleDateString() + ' ' + new Date(proj.lastSaved).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'} 
                                    active={currentProjectId === proj.id} 
                                    onClick={() => { onLoadProject(proj.id); onClose(); }}
                                    onDelete={() => handleImmediateDelete(proj.id)} // USE GHOST PROTOCOL HANDLER
                                    onExport={() => handleExportProject(proj)}
                                />
                            ))
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all shadow-sm">
                                    <FolderOpen size={28} />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-[0.3em] transition-colors">Open Local Project</span>
                                    <p className="text-[8px] font-bold text-slate-400 group-hover:text-indigo-400 uppercase tracking-widest">Click to browse .spc files</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 group"
                        >
                            <FileUp size={16} className="group-hover:-translate-y-1 transition-transform" /> Import .spc
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".spc,.json" />
                        
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-slate-900/10"
                        >
                            <LogOut size={16} /> Exit Stage
                        </button>
                    </div>

                    {/* SYSTEM PURGE CONSOLE (FACTORY RESET) */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Gauge size={14} className="text-orange-500" />
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">System Maintenance</span>
                        </div>
                        <div className="p-1 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl border border-red-200">
                            <div className="bg-white/50 rounded-xl p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-red-100 rounded-lg text-red-500">
                                        <Eraser size={16} />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black text-red-600 uppercase tracking-widest block">System Purge</span>
                                        <p className="text-[8px] text-slate-600 font-medium leading-relaxed">
                                            Clears heavy cache and ghost files to fix corruption. Requires reload.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePurgeClick}
                                    disabled={isPurging}
                                    className={`w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isPurging ? (
                                        <>
                                            <Loader2 size={12} className="animate-spin" /> RESETTING...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={12} /> PURGE ALL GARBAGE FILES
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-700 h-full flex flex-col items-center justify-center text-center opacity-50">
                <Cloud size={48} className="text-slate-300 mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Google Flow Connector Coming Soon</span>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION */}
        <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0 z-20">
            <button 
                onClick={() => setShowNewProjectFlow(true)}
                className="w-full group relative overflow-hidden flex items-center justify-between p-5 rounded-[2rem] transition-all duration-500 bg-slate-950 text-white shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-95"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-500 group-hover:rotate-12">
                        <Plus size={24} strokeWidth={4} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[13px] font-black uppercase tracking-[0.2em] text-white">Create Project</span>
                        <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-[0.3em] mt-1.5 transition-colors">Start Genesis Flow</span>
                    </div>
                </div>
                
                <div className="relative z-10 opacity-30 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 -rotate-45 group-hover:rotate-0 transform">
                    <Zap size={24} fill="currentColor" className="text-yellow-500" />
                </div>
            </button>
        </div>

      </div>
    </>
  );
};