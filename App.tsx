import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EditorControls } from './components/editor/EditorControls';
import CanvasPreview from './components/CanvasPreview';
import { BeatstoriaStudio } from './components/BeatstoriaStudio';
import { LandingPage } from './components/LandingPage';
import { NewProjectFlow } from './components/editor/NewProjectFlow';
import { SidebarMenu } from './components/SidebarMenu';
import { DEFAULT_CONFIG, DEFAULT_EFFECTS } from './constants';
import { AppConfig, ChatMessage, ImageLayer, LayerGroup } from './types';
import {
    Download, Undo, Redo, Plus, Sparkles, Minus, PanelLeft, Loader2,
    AlignLeft, AlignCenter, AlignRight, ArrowUpFromLine, ArrowDownFromLine,
    ChevronsUpDown, Hand, Maximize, CheckCircle2, FileEdit, Copy, Trash2, Layout,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Grid, Square, LayoutGrid,
    Group, ChevronDown, Image as ImageIcon, FileArchive, Zap, Clipboard, CheckSquare, Layers,
    MousePointer2, Menu, MoreVertical, MoreHorizontal, AlignStartVertical, AlignEndVertical,
    AlignStartHorizontal, AlignEndHorizontal, AlignCenterVertical, AlignCenterHorizontal,
    MoveHorizontal as DistributeH, MoveVertical as DistributeV,
    Bot, X, TriangleAlert, FolderPlus, FolderMinus, Video, MonitorDown
} from 'lucide-react';
import { GoogleGenAI, Chat } from "@google/genai";
// @ts-ignore
import * as htmlToImage from 'html-to-image';
import { saveProjectToDB, getAllProjectsFromDB, deleteProjectFromDB, getProjectByIdFromDB } from './services/storageService';

const deepCopy = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const repairConfig = (config: AppConfig): AppConfig => {
    if (!config) return deepCopy(DEFAULT_CONFIG);
    const d = DEFAULT_CONFIG;
    return {
        ...d,
        ...config,
        canvas: { ...d.canvas, ...(config.canvas || {}) },
        typography: { ...d.typography, ...(config.typography || {}) },
        additional_texts: Array.isArray(config.additional_texts) ? config.additional_texts : [],
        image_layers: Array.isArray(config.image_layers) ? config.image_layers : [],
        shapes: Array.isArray(config.shapes) ? config.shapes : [],
        layerOrder: Array.isArray(config.layerOrder) ? config.layerOrder : d.layerOrder,
        groups: Array.isArray(config.groups) ? config.groups : []
    };
};

interface ProjectState {
    pages: AppConfig[];
    activePageIndex: number;
}

interface AppState {
    history: ProjectState[];
    index: number;
}

export const App: React.FC = () => {
    const [showLanding, setShowLanding] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);

    const [appState, setAppState] = useState<AppState>({
        history: [{
            pages: [repairConfig(deepCopy(DEFAULT_CONFIG))],
            activePageIndex: 0
        }],
        index: 0
    });

    const [zoom, setZoom] = useState(0.45);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [penToolMode, setPenToolMode] = useState<'select' | 'hand'>('select');
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const [isBackendMenuOpen, setIsBackendMenuOpen] = useState(false);
    const [showNewProjectFlow, setShowNewProjectFlow] = useState(false);
    const [projectLibrary, setProjectLibrary] = useState<any[]>([]);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [isStudioOpen, setIsStudioOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatAttachments, setChatAttachments] = useState<{ file: File, url: string }[]>([]);
    const chatSession = useRef<Chat | null>(null);

    const currentState = useMemo(() => {
        return appState.history[appState.index] || appState.history[0];
    }, [appState]);

    const activePageConfig = useMemo(() => {
        return currentState.pages[currentState.activePageIndex] || repairConfig(deepCopy(DEFAULT_CONFIG));
    }, [currentState]);

    useEffect(() => {
        const restore = async () => {
            const lastId = localStorage.getItem('last_active_project_id');
            if (lastId) {
                const project = await getProjectByIdFromDB(lastId);
                if (project) handleLoadProject(lastId);
            }
            setIsInitializing(false);
            refreshLibrary();
        };
        restore();
        const handleKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(true); };
        const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, []);

    const refreshLibrary = async () => { const libs = await getAllProjectsFromDB(); setProjectLibrary(libs); };
    const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 1500); };

    const handleUndo = () => {
        if (appState.index > 0) {
            setAppState(prev => ({ ...prev, index: prev.index - 1 }));
            setSelectedIds([]);
        }
    };
    const handleRedo = () => {
        if (appState.index < appState.history.length - 1) {
            setAppState(prev => ({ ...prev, index: prev.index + 1 }));
            setSelectedIds([]);
        }
    };

    const setConfig = useCallback((value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory: boolean = true) => {
        setAppState(prev => {
            const currentIdx = prev.index;
            const current = prev.history[currentIdx];
            if (!current) return prev;

            const currentConfig = current.pages[current.activePageIndex];
            const newConfig = typeof value === 'function' ? value(currentConfig) : value;
            const newPages = [...current.pages];
            newPages[current.activePageIndex] = newConfig;
            const newState = { ...current, pages: newPages };

            if (saveToHistory) {
                const newHist = prev.history.slice(0, currentIdx + 1);
                newHist.push(deepCopy(newState));
                if (newHist.length > 50) newHist.shift();
                return { history: newHist, index: newHist.length - 1 };
            } else {
                const newHist = [...prev.history];
                newHist[currentIdx] = newState;
                return { ...prev, history: newHist };
            }
        });
    }, []);

    useEffect(() => {
        if (showLanding) return;
        const save = async () => {
            setIsAutoSaving(true);
            const projectData = { id: activePageConfig.id, name: activePageConfig.projectName, lastSaved: Date.now(), data: currentState };
            await saveProjectToDB(projectData);
            setLastSaved(new Date());
            setIsAutoSaving(false);
            refreshLibrary();
        };
        const timer = setTimeout(save, 3000);
        return () => clearTimeout(timer);
    }, [currentState, showLanding]);

    const handleLoadProject = async (id: string) => {
        const project = await getProjectByIdFromDB(id);
        if (project) {
            const data = project.data;
            setAppState({
                history: [{ pages: data.pages.map(repairConfig), activePageIndex: data.activePageIndex || 0 }],
                index: 0
            });
            setShowLanding(false);
            localStorage.setItem('last_active_project_id', id);
        }
    };

    const handleCreateProject = (data?: any) => {
        if (!data) { setShowNewProjectFlow(true); return; }
        const newId = `proj-${Date.now()}`;
        const newConfig = repairConfig({ ...deepCopy(DEFAULT_CONFIG), id: newId, projectName: data.name.toUpperCase(), canvas: { ...DEFAULT_CONFIG.canvas, width: data.width, height: data.height } });
        setAppState({
            history: [{ pages: [newConfig], activePageIndex: 0 }],
            index: 0
        });
        setShowLanding(false);
        setShowNewProjectFlow(false);
        setIsBackendMenuOpen(false);
        localStorage.setItem('last_active_project_id', newId);
    };

    const setActivePage = (index: number) => {
        setAppState(prev => {
            const newHist = [...prev.history];
            newHist[prev.index] = { ...newHist[prev.index], activePageIndex: index };
            return { ...prev, history: newHist };
        });
        setSelectedIds([]);
    };

    const handleDuplicatePage = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setAppState(prev => {
            const current = prev.history[prev.index];
            const pageToClone = current.pages[index];
            const newPage = deepCopy(pageToClone);
            newPage.id = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            newPage.name = `${pageToClone.name} COPY`;
            const newPages = [...current.pages];
            newPages.splice(index + 1, 0, newPage);
            const newState = { ...current, pages: newPages, activePageIndex: index + 1 };
            const newHist = [...prev.history.slice(0, prev.index + 1), newState];
            return { history: newHist, index: newHist.length - 1 };
        });
        setSelectedIds([]);
        showToast("ARTBOARD DUPLICATED");
    };

    const handleAddNewPage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setAppState(prev => {
            const current = prev.history[prev.index];
            const newPage = repairConfig(deepCopy(DEFAULT_CONFIG));
            newPage.id = `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            newPage.name = `ARTBOARD ${current.pages.length + 1}`;
            const newPages = [...current.pages, newPage];
            const newState = { ...current, pages: newPages, activePageIndex: newPages.length - 1 };
            const newHist = [...prev.history.slice(0, prev.index + 1), newState];
            return { history: newHist, index: newHist.length - 1 };
        });
        setSelectedIds([]);
        showToast("NEW ARTBOARD ADDED");
    };

    const handleDeletePage = (index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (currentState.pages.length <= 1) {
            showToast("MINIMUM 1 ARTBOARD REQUIRED");
            return;
        }

        if (!confirm("DELETE ARTBOARD PERMANENTLY?")) return;

        setAppState(prev => {
            const current = prev.history[prev.index];
            const newPages = current.pages.filter((_, idx) => idx !== index);

            let nextActiveIndex = current.activePageIndex;
            if (index === current.activePageIndex) {
                nextActiveIndex = Math.min(index, newPages.length - 1);
            } else if (index < current.activePageIndex) {
                nextActiveIndex = current.activePageIndex - 1;
            }

            const newState = {
                pages: newPages,
                activePageIndex: Math.max(0, nextActiveIndex)
            };

            const nextHist = [...prev.history.slice(0, prev.index + 1), newState];
            return { history: nextHist, index: nextHist.length - 1 };
        });

        setSelectedIds([]);
        showToast("ARTBOARD PURGED");
    };

    const handleSelection = (id: string | string[] | null, multi = false) => {
        if (!id) { setSelectedIds([]); return; }
        if (Array.isArray(id)) { setSelectedIds(id); return; }
        setSelectedIds(prev => multi ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id]);
    };

    const handleAlign = (type: string) => {
        if (selectedIds.length === 0) return;
        setConfig(prev => {
            const next = deepCopy(prev);
            const canvasW = next.canvas.width;
            const canvasH = next.canvas.height;

            const allLayers = [...next.image_layers, ...next.additional_texts, ...next.shapes];
            const selectedLayers = allLayers.filter(l => selectedIds.includes(l.id));

            // Get selection bounds
            let minX = Math.min(...selectedLayers.map(l => l.position_x));
            let maxX = Math.max(...selectedLayers.map(l => l.position_x + l.width));
            let minY = Math.min(...selectedLayers.map(l => l.position_y));
            let maxY = Math.max(...selectedLayers.map(l => l.position_y + l.height));
            let centerX = minX + (maxX - minX) / 2;
            let centerY = minY + (maxY - minY) / 2;

            const isMulti = selectedIds.length > 1;

            if (type === 'dist-h' || type === 'dist-v') {
                if (selectedLayers.length < 3) return next;
                if (type === 'dist-h') {
                    selectedLayers.sort((a, b) => a.position_x - b.position_x);
                    const firstX = selectedLayers[0].position_x;
                    const lastX = selectedLayers[selectedLayers.length - 1].position_x;
                    const gap = (lastX - firstX) / (selectedLayers.length - 1);
                    selectedLayers.forEach((l, i) => {
                        const layer = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id);
                        if (layer) layer.position_x = firstX + (gap * i);
                    });
                } else {
                    selectedLayers.sort((a, b) => a.position_y - b.position_y);
                    const firstY = selectedLayers[0].position_y;
                    const lastY = selectedLayers[selectedLayers.length - 1].position_y;
                    const gap = (lastY - firstY) / (selectedLayers.length - 1);
                    selectedLayers.forEach((l, i) => {
                        const layer = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id);
                        if (layer) layer.position_y = firstY + (gap * i);
                    });
                }
                return next;
            }

            selectedIds.forEach(id => {
                const l = next.image_layers.find(al => al.id === id) || next.additional_texts.find(al => al.id === id) || next.shapes.find(al => al.id === id);
                if (!l) return;

                if (isMulti) {
                    // Align relative to selection bounding box
                    if (type === 'left') l.position_x = minX;
                    if (type === 'right') l.position_x = maxX - l.width;
                    if (type === 'top') l.position_y = minY;
                    if (type === 'bottom') l.position_y = maxY - l.height;
                    if (type === 'center') l.position_x = centerX - (l.width / 2);
                    if (type === 'middle') l.position_y = centerY - (l.height / 2);
                } else {
                    // Align relative to artboard
                    if (type === 'left') l.position_x = 0;
                    if (type === 'right') l.position_x = canvasW - l.width;
                    if (type === 'top') l.position_y = 0;
                    if (type === 'bottom') l.position_y = canvasH - l.height;
                    if (type === 'center') l.position_x = (canvasW / 2) - (l.width / 2);
                    if (type === 'middle') l.position_y = (canvasH / 2) - (l.height / 2);
                }
            });
            return next;
        }, true);
        showToast(`ALIGNED: ${type.toUpperCase()}`);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || isSpacePressed || penToolMode === 'hand') {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };

    useEffect(() => {
        const move = (e: MouseEvent) => { if (isPanning) setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y }); };
        const up = () => setIsPanning(false);
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, [isPanning]);

    if (isInitializing) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans"><Loader2 className="animate-spin mb-4" size={40} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Restoring Neural Session...</span></div>;
    if (showLanding) return (
        <LandingPage
            onStart={() => setShowLanding(false)}
            onOpenAiStudio={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onLoadProject={handleLoadProject}
            onOpenCooking={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onOpenTitanFill={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onOpenPurgeBg={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onOpenRetouch={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onOpenStory={() => { setShowLanding(false); setIsStudioOpen(true); }}
            onOpenNoteLM={() => { setShowLanding(false); setIsStudioOpen(true); }}
        />
    );

    return (
        <div className="flex h-screen w-screen bg-[#f3f4f6] overflow-hidden text-slate-900 font-sans" tabIndex={-1}>
            <SidebarMenu
                isOpen={isBackendMenuOpen} onClose={() => setIsBackendMenuOpen(false)} config={activePageConfig} onUpdateConfig={setConfig}
                onNew={handleCreateProject} onImport={() => { }} onExport={() => { }} onExportPng={() => { }} onReset={() => { }}
                onSave={() => { }} isSaving={isAutoSaving} saveSuccess={false} projectLibrary={projectLibrary} currentProjectId={activePageConfig.id}
                onLoadProject={handleLoadProject} onDeleteProject={async (id) => { await deleteProjectFromDB(id); refreshLibrary(); }}
            />
            <NewProjectFlow isOpen={showNewProjectFlow} onClose={() => setShowNewProjectFlow(false)} onConfirm={handleCreateProject} />

            <div className={`${isSidebarOpen ? 'w-[340px]' : 'w-[64px]'} transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 h-full z-[100] shadow-xl overflow-hidden relative`}>
                <EditorControls
                    config={activePageConfig} setConfig={setConfig} selectedId={selectedIds.length === 1 ? selectedIds[0] : null} selectedIds={selectedIds} onSelectLayer={handleSelection}
                    collapsed={!isSidebarOpen} onExpand={() => setIsSidebarOpen(true)} setZoom={setZoom} onHome={() => setIsBackendMenuOpen(true)} penToolMode={penToolMode as any} setPenToolMode={setPenToolMode as any}
                    isAssistantOpen={false} onToggleAssistant={() => { }} isBackendMenuOpen={isBackendMenuOpen} setIsBackendMenuOpen={setIsBackendMenuOpen} onNewProject={() => setShowNewProjectFlow(true)}
                    isAutoSaving={isAutoSaving} lastSaved={lastSaved}
                />
            </div>

            <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">

                {/* MASTER TOP BAR */}
                <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm shrink-0">
                    <div className="flex items-center gap-1">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Toggle Sidebar"><PanelLeft size={18} /></button>
                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100 shadow-inner">
                            <button onClick={handleUndo} disabled={appState.index === 0} className="p-1.5 hover:bg-white rounded text-gray-600 disabled:opacity-20 transition-all" title="Undo (Ctrl+Z)"><Undo size={16} /></button>
                            <button onClick={handleRedo} disabled={appState.index === appState.history.length - 1} className="p-1.5 hover:bg-white rounded text-gray-600 disabled:opacity-20 transition-all" title="Redo (Ctrl+Y)"><Redo size={16} /></button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <div className="flex items-center gap-1.5 bg-gray-50 border border-slate-100 rounded-xl px-2 py-1">
                            <button onClick={() => setZoom(Math.max(0.1, zoom - 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><Minus size={14} /></button>
                            <span className="text-[11px] font-black text-slate-700 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(2, zoom + 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><Plus size={14} /></button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <button onClick={() => setPenToolMode(penToolMode === 'hand' ? 'select' : 'hand')} className={`p-2 rounded transition-all ${penToolMode === 'hand' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`} title="Hand Tool (Space)"><Hand size={18} /></button>
                    </div>

                    {/* CENTERED LAYOUT CONTROLS */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
                        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-lg ring-4 ring-gray-50">
                            <div className="flex items-center">
                                <button onClick={() => handleAlign('left')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Left"><AlignStartVertical size={16} /></button>
                                <button onClick={() => handleAlign('center')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Horizontal Center"><AlignCenterVertical size={16} /></button>
                                <button onClick={() => handleAlign('right')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Right"><AlignEndVertical size={16} /></button>
                            </div>
                            <div className="h-4 w-px bg-gray-200 mx-1" />
                            <div className="flex items-center">
                                <button onClick={() => handleAlign('top')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Top"><AlignStartHorizontal size={16} /></button>
                                <button onClick={() => handleAlign('middle')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Vertical Center"><AlignCenterHorizontal size={16} /></button>
                                <button onClick={() => handleAlign('bottom')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Align Bottom"><AlignEndHorizontal size={16} /></button>
                            </div>
                            <div className="h-4 w-px bg-gray-200 mx-1" />
                            <div className="flex items-center">
                                <button onClick={() => handleAlign('dist-h')} disabled={selectedIds.length < 3} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Distribute Horizontal Spacing"><DistributeH size={16} /></button>
                                <button onClick={() => handleAlign('dist-v')} disabled={selectedIds.length < 3} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20" title="Distribute Vertical Spacing"><DistributeV size={16} /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-2xl text-white shadow-xl border border-slate-800 transition-all hover:bg-black">
                            <Layout size={14} className="text-indigo-400" />
                            <div className="flex flex-col">
                                <input
                                    type="text"
                                    value={activePageConfig.projectName || ""}
                                    onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value.toUpperCase() }), true)}
                                    className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] outline-none h-3"
                                    placeholder="UNTITLED"
                                />
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                    {activePageConfig.canvas.width}×{activePageConfig.canvas.height} • {activePageConfig.canvas.status || 'DRAFT'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsStudioOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"><Sparkles size={14} fill="white" /> AI STUDIO</button>
                    </div>
                </div>

                <div className={`flex-1 overflow-hidden bg-[#e5e7eb] relative flex items-center justify-center ${isPanning || penToolMode === 'hand' || isSpacePressed ? 'cursor-grabbing' : 'cursor-default'}`} onMouseDown={handleMouseDown}>
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                    <div className="transition-transform duration-75 ease-out flex gap-24 items-center px-40 py-20" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                        {currentState.pages.map((pageConfig, pageIndex) => {
                            const isActive = pageIndex === currentState.activePageIndex;
                            return (
                                <div key={pageConfig.id} className="flex flex-col items-center group/artboard">
                                    {/* ARTBOARD CONTROLS HUD */}
                                    <div className={`flex items-center justify-between pb-3 select-none pointer-events-auto w-full transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-40 group-hover/artboard:opacity-80'}`} style={{ width: pageConfig.canvas.width * zoom }}>
                                        <div
                                            className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border shadow-sm transition-all cursor-pointer ${isActive ? 'bg-white border-indigo-200 ring-4 ring-indigo-500/10' : 'bg-white/60 border-white/50'}`}
                                            onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}
                                        >
                                            <Layout size={14} className={isActive ? "text-indigo-500" : "text-slate-400"} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-slate-700' : 'text-slate-500'}`}>{pageConfig.name}</span>
                                        </div>

                                        <div className={`flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/artboard:opacity-100'}`}>
                                            <button onMouseDown={(e) => handleDuplicatePage(pageIndex, e)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Duplicate Artboard"><Copy size={12} /></button>
                                            <button onMouseDown={(e) => handleAddNewPage(e)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Add New Artboard"><Plus size={12} /></button>
                                            <div className="h-3 w-px bg-slate-300 mx-1" />
                                            <button
                                                onMouseDown={(e) => handleDeletePage(pageIndex, e)}
                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Artboard"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] rounded-sm transition-all duration-300 ${isActive ? 'shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] ring-2 ring-indigo-500/20' : 'cursor-pointer hover:ring-2 hover:ring-indigo-300/20 grayscale-[0.5]'}`}
                                        style={{ width: pageConfig.canvas.width * zoom, height: pageConfig.canvas.height * zoom }}
                                        onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}
                                    >
                                        <CanvasPreview
                                            domId={`canvas-export-${pageConfig.id}`}
                                            config={pageConfig}
                                            scale={zoom}
                                            onUpdate={(newConfig, save) => {
                                                setAppState(prev => {
                                                    const current = prev.history[prev.index];
                                                    const nPages = [...current.pages];
                                                    const targetIdx = nPages.findIndex(p => p.id === pageConfig.id);
                                                    if (targetIdx === -1) return prev;

                                                    nPages[targetIdx] = newConfig;
                                                    const nState = { ...current, pages: nPages };
                                                    if (save) {
                                                        const nHist = prev.history.slice(0, prev.index + 1);
                                                        nHist.push(deepCopy(nState));
                                                        return { history: nHist, index: nHist.length - 1 };
                                                    } else {
                                                        const nHist = [...prev.history];
                                                        nHist[prev.index] = nState;
                                                        return { ...prev, history: nHist };
                                                    }
                                                });
                                            }}
                                            selectedIds={isActive ? selectedIds : []}
                                            onSelect={(id, multi) => {
                                                if (!isActive) setActivePage(pageIndex);
                                                handleSelection(id, multi);
                                            }}
                                            readOnly={false}
                                            isActive={isActive}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
                        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl">
                            <button onClick={() => setZoom(0.45)} className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100">Fit Canvas</button>
                            <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.45); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Reset View"><Maximize size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <BeatstoriaStudio
                isOpen={isStudioOpen} onClose={() => setIsStudioOpen(false)} initialImage={null} onApply={() => { }} onAddToGallery={() => { }}
                isSmartAssistantActive={false} toggleSmartAssistant={() => { }} chatMessages={chatMessages} setChatMessages={setChatMessages}
                onLogSmartAction={() => { }} onExecuteAiCommand={() => { }} onSendMessage={() => { }} chatInput={chatInput} setChatInput={setChatInput}
                isChatLoading={isChatLoading} setIsChatLoading={setIsChatLoading} chatAttachments={chatAttachments} setChatAttachments={setChatAttachments} chatSession={chatSession}
            />

            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[6000] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <CheckCircle2 size={16} className="text-green-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{toastMessage}</span>
                </div>
            )}
        </div>
    );
};
