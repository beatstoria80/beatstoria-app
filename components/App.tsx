import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EditorControls } from './editor/EditorControls';
import CanvasPreview from './CanvasPreview'; 
import { BeatstoriaStudio } from './BeatstoriaStudio';
import { LandingPage } from './LandingPage';
import { NewProjectFlow } from './editor/NewProjectFlow';
import { SidebarMenu } from './SidebarMenu';
import { DEFAULT_CONFIG, DEFAULT_EFFECTS } from '../constants';
import { AppConfig, ChatMessage, ImageLayer } from '../types';
import { 
    Download, Undo, Redo, Plus, Sparkles, Minus, PanelLeft, Loader2, 
    AlignLeft, AlignCenter, AlignRight, ArrowUpFromLine, ArrowDownFromLine, 
    ChevronsUpDown, Hand, Maximize, CheckCircle2, FileEdit, Copy, Trash2, Layout,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Grid, Square, LayoutGrid,
    Group, ChevronDown, Image as ImageIcon, FileArchive, Zap, Clipboard, CheckSquare, Layers,
    MousePointer2, Menu, MoreVertical, MoreHorizontal, AlignStartVertical, AlignEndVertical,
    AlignStartHorizontal, AlignEndHorizontal, AlignCenterVertical, AlignCenterHorizontal,
    MoveHorizontal as DistributeH, MoveVertical as DistributeV,
    Bot, X, TriangleAlert, FolderPlus, FolderMinus, Video, MonitorDown, BookOpen
} from 'lucide-react';
import { Rnd } from 'react-rnd';
import { GoogleGenAI } from "@google/genai";
// @ts-ignore
import * as htmlToImage from 'html-to-image';
import { saveProjectToDB, getAllProjectsFromDB, deleteProjectFromDB, getProjectByIdFromDB, clearAllProjectsFromDB } from '../services/storageService';
import { AssistantPanel } from './editor/AssistantPanel';
import { NeuralPurgeStudio } from './studio/NeuralPurgeStudio';
import { NanoBananaStudio } from './studio/NanoBananaStudio';
import { NanoBananaGen } from './studio/NanoBananaGen';
import { NeuralRetouchStudio } from './studio/NeuralRetouchStudio';
import { TitanFillStudio } from './studio/TitanFillStudio';
import { StoryCampaignFlow } from './studio/StoryCampaignFlow';
import { NeuralTypefaceStudio } from './studio/NeuralTypefaceStudio';
import { VeoCineStudio } from './studio/VeoCineStudio';
import { NoteLMStudio } from './studio/NoteLMStudio';
import { ExportModal } from './editor/ExportModal';
import { exportArtboard, downloadBlob } from '../services/exportService';

/**
 * OPTIMIZED CLONING (TITAN CORE v52)
 */
const deepCopy = <T,>(obj: T): T => {
    try {
        if (typeof structuredClone === 'function') return structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return JSON.parse(JSON.stringify(obj));
    }
};

const repairConfig = (config: AppConfig): AppConfig => {
    if (!config) return deepCopy(DEFAULT_CONFIG);
    const d = DEFAULT_CONFIG;
    return {
        ...d,
        ...config,
        id: config.id || d.id, 
        canvas: { ...d.canvas, ...(config.canvas || {}) },
        typography: { ...d.typography, ...(config.typography || {}) },
        additional_texts: Array.isArray(config.additional_texts) ? config.additional_texts : [],
        image_layers: Array.isArray(config.image_layers) ? config.image_layers : [],
        shapes: Array.isArray(config.shapes) ? config.shapes : [],
        layerOrder: Array.isArray(config.layerOrder) ? config.layerOrder : d.layerOrder,
        groups: Array.isArray(config.groups) ? config.groups : []
    };
};

interface HistoryItem {
  src: string;
  source: 'cooked' | 'injected';
  timestamp: number;
}

interface ProjectState {
  pages: AppConfig[];
  activePageIndex: number;
}

interface AppState {
    history: ProjectState[];
    index: number;
}

const fileToPart = async (file: File): Promise<any> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.readAsDataURL(file);
    });
};

export const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [currentProjectId, setCurrentProjectId] = useState<string>('page-default');

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
  
  const clipboardRef = useRef<any[]>([]);

  const [isBackendMenuOpen, setIsBackendMenuOpen] = useState(false);
  const [showNewProjectFlow, setShowNewProjectFlow] = useState(false);
  const [projectLibrary, setProjectLibrary] = useState<any[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const isPurgingRef = useRef(false);
  
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{file: File, url: string}[]>([]);

  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [isUpscaleOpen, setIsUpscaleOpen] = useState(false);
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [isRetouchOpen, setIsRetouchOpen] = useState(false);
  const [isTitanFillOpen, setIsTitanFillOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isTypefaceStudioOpen, setIsTypefaceStudioOpen] = useState(false);
  const [isCineOpen, setIsCineOpen] = useState(false);
  const [isNoteLMOpen, setIsNoteLMOpen] = useState(false);
  const [activeHubContext, setActiveHubContext] = useState<string | null>(null);
  
  const [genHistory, setGenHistory] = useState<HistoryItem[]>(() => {
    try {
        const saved = localStorage.getItem('beatstoria_session_history');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) {
        return [];
    }
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentState = useMemo(() => {
      return appState.history[appState.index] || appState.history[0];
  }, [appState]);

  const activePageConfig = useMemo(() => {
      return currentState.pages[currentState.activePageIndex] || repairConfig(deepCopy(DEFAULT_CONFIG));
  }, [currentState]);

  const selectedTextLayer = useMemo(() => {
      if (selectedIds.length === 1) {
          return activePageConfig.additional_texts.find(t => t.id === selectedIds[0]);
      }
      return undefined;
  }, [selectedIds, activePageConfig]);

  useEffect(() => {
    try {
        localStorage.setItem('beatstoria_session_history', JSON.stringify(genHistory.slice(0, 10))); 
    } catch (e) {
        localStorage.removeItem('beatstoria_session_history');
    }
  }, [genHistory]);

  const setConfig = useCallback((value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory: boolean = true) => {
      setAppState(prev => {
          const currentIdx = prev.index;
          const current = prev.history[currentIdx];
          if (!current) return prev;
          
          const currentConfig = current.pages[current.activePageIndex];
          const newConfig = typeof value === 'function' ? value(currentConfig) : value;
          const newPages = [...current.pages];
          
          if (newConfig.projectName !== currentConfig.projectName) {
              for (let i = 0; i < newPages.length; i++) {
                  if (i !== current.activePageIndex) {
                      newPages[i] = { ...newPages[i], projectName: newConfig.projectName };
                  }
              }
          }
          
          newPages[current.activePageIndex] = newConfig;
          const newState = { ...current, pages: newPages };

          if (saveToHistory) {
              const newHist = prev.history.slice(0, currentIdx + 1);
              newHist.push(deepCopy(newState));
              if (newHist.length > 30) newHist.shift(); 
              return { history: newHist, index: newHist.length - 1 };
          } else {
              const newHist = [...prev.history];
              newHist[currentIdx] = newState;
              return { ...prev, history: newHist };
          }
      });
  }, []);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 1500); };

  useEffect(() => {
      document.body.classList.remove('is-navigating');
      document.body.style.pointerEvents = 'auto';
      isPurgingRef.current = false;
      
      const restore = async () => {
          try {
              const lastId = localStorage.getItem('last_active_project_id');
              if (lastId) {
                  const project = await getProjectByIdFromDB(lastId);
                  if (project) {
                      const data = project.data;
                      setCurrentProjectId(project.id);
                      setAppState({
                          history: [{ pages: data.pages.map(repairConfig), activePageIndex: data.activePageIndex || 0 }],
                          index: 0
                      });
                      setShowLanding(false);
                  }
              }
          } catch (e) {
              console.error("Failed to restore session", e);
          } finally {
              setIsInitializing(false);
              refreshLibrary();
          }
      };
      restore();
  }, []);

  const refreshLibrary = async () => { try { const libs = await getAllProjectsFromDB(); setProjectLibrary(libs); } catch (e) { } };

  const generateUniqueName = (baseName: string) => {
      const upperName = baseName.toUpperCase().trim();
      let finalName = upperName;
      let counter = 1;
      while (projectLibrary.some(p => p.name === finalName && p.id !== currentProjectId)) {
          counter++;
          finalName = `${upperName} V${counter}`;
      }
      return finalName;
  };

  const handleImportProject = (data: any) => {
      if (!data) { showToast("INVALID PROJECT FILE"); return; }
      const pagesToImport = data.pages || (data.canvas ? [data] : null);
      if (!pagesToImport) { showToast("INVALID DATA STRUCTURE"); return; }
      const newProjectId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const baseName = data.projectName || data.name || "Imported Project";
      const uniqueName = generateUniqueName(baseName);
      const importedPages = pagesToImport.map((p: any) => {
          const repaired = repairConfig(p);
          return {
              ...repaired,
              projectName: uniqueName,
              id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
      });
      setCurrentProjectId(newProjectId);
      setAppState({ history: [{ pages: importedPages, activePageIndex: 0 }], index: 0 });
      const projectRecord = { id: newProjectId, name: uniqueName, lastSaved: Date.now(), data: { pages: importedPages, activePageIndex: 0 } };
      saveProjectToDB(projectRecord).then(() => { refreshLibrary(); localStorage.setItem('last_active_project_id', newProjectId); });
      setShowLanding(false); setIsBackendMenuOpen(false); showToast(`IMPORTED: ${uniqueName}`);
  };

  const handlePurgeAllProjects = async () => {
      isPurgingRef.current = true;
      setIsAutoSaving(false);
      try {
          await clearAllProjectsFromDB();
          localStorage.removeItem('last_active_project_id');
          window.location.reload();
      } catch (error) {
          showToast("PURGE FAILED: DB ERROR");
          isPurgingRef.current = false;
      }
  };

  const handleDeleteProject = async (id: string) => {
      const isDeletingActive = id === currentProjectId;
      if (isDeletingActive) {
          isPurgingRef.current = true; 
          setIsAutoSaving(false);
          const blankId = `proj-blank-${Date.now()}`;
          const blankConfig = repairConfig({ ...deepCopy(DEFAULT_CONFIG), id: blankId });
          setCurrentProjectId(blankId);
          setAppState({ history: [{ pages: [blankConfig], activePageIndex: 0 }], index: 0 });
          localStorage.removeItem('last_active_project_id');
      }
      try {
          await deleteProjectFromDB(id);
          await refreshLibrary();
          showToast("PROJECT DELETED PERMANENTLY");
      } catch (error) {
          showToast("DELETE FAILED");
      } finally {
          if (isDeletingActive) {
              setTimeout(() => { isPurgingRef.current = false; }, 500);
          }
      }
  };

  const handleGroupLayers = () => {
      if (selectedIds.length < 2) return;
      const newGroupId = `group-${Date.now()}`;
      setConfig(prev => {
          const next = deepCopy(prev);
          next.groups.push({
              id: newGroupId, name: 'GROUP ' + (next.groups.length + 1), layerIds: [...selectedIds],
              collapsed: false, locked: false, hidden: false
          });
          return next;
      }, true);
      setSelectedIds([newGroupId]);
      showToast("GROUP CREATED");
  };

  const handleUngroupLayers = () => {
      const groupsToUngroup = selectedIds.filter(id => id.startsWith('group-'));
      if (groupsToUngroup.length === 0) return;
      setConfig(prev => {
          const next = deepCopy(prev);
          next.groups = next.groups.filter(g => !groupsToUngroup.items(g.id));
          return next;
      }, true);
      setSelectedIds([]);
      showToast("UNGROUPED");
  };

  const handleApplyToCanvas = useCallback((src: string) => {
      if (!src) return;
      const img = new Image();
      img.onload = () => {
          const canvasW = activePageConfig.canvas.width;
          const canvasH = activePageConfig.canvas.height;
          const maxW = canvasW * 0.8;
          const maxH = canvasH * 0.8;
          let w = 600;
          let h = 600 / (img.naturalWidth / img.naturalHeight);
          if (w > maxW) { w = maxW; h = w / (img.naturalWidth / img.naturalHeight); }
          if (h > maxH) { h = maxH; w = h * (img.naturalWidth / img.naturalHeight); }
          const newId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const newLayer: ImageLayer = {
              id: newId, src, position_x: (canvasW - w) / 2, position_y: (canvasH - h) / 2,
              width: w, height: h, rotation: 0, locked: false, hidden: false, opacity: 1, 
              blend_mode: 'normal', effects_enabled: false, effects: { ...DEFAULT_EFFECTS },
              border_radius: 0
          };
          setConfig(prev => ({ ...prev, image_layers: [...prev.image_layers, newLayer], layerOrder: [...prev.layerOrder, newId] }), true);
          setSelectedIds([newId]);
          showToast("ASSET INJECTED");
      };
      img.src = src;
  }, [activePageConfig, setConfig]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
          
          // CRITICAL: Jika pengguna sedang memilih teks secara manual (blok teks), jangan cegah shortcut salin browser.
          const selection = window.getSelection()?.toString();
          const isCopyingText = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selection && selection.length > 0;

          if (e.code === 'Space') { e.preventDefault(); setIsSpacePressed(true); }
          if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteSelectedLayers();
          if (e.key === 'Escape') setSelectedIds([]);
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); }
          
          // Hanya cegah default jika TIDAK sedang meng-copy teks
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isCopyingText) { e.preventDefault(); handleCopyLayers(); }
          
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); handlePasteLayers(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); handleDuplicateLayers(); }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) handleUngroupLayers(); else handleGroupLayers(); }
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              const step = e.shiftKey ? 10 : 1;
              const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
              const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
              if (selectedIds.length > 0) {
                  setConfig(prev => {
                      const next = deepCopy(prev);
                      const targetIds = new Set<string>();
                      selectedIds.forEach(id => {
                          if (id.startsWith('group-')) {
                              const group = next.groups.find(g => g.id === id);
                              if (group) group.layerIds.forEach(lid => targetIds.add(lid));
                          } else { targetIds.add(id); }
                      });
                      const moveNode = (node: any) => {
                          if (targetIds.has(node.id)) {
                              node.position_x = Math.round(node.position_x + dx);
                              node.position_y = Math.round(node.position_y + dy);
                          }
                          return node;
                      };
                      next.image_layers = next.image_layers.map(moveNode);
                      next.additional_texts = next.additional_texts.map(moveNode);
                      next.shapes = next.shapes.map(moveNode);
                      return next;
                  }, true);
              }
          }
      };
      const handleKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
      window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
      return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [selectedIds, activePageConfig]); 

  useEffect(() => {
      if (deleteConfirmId) {
          const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [deleteConfirmId]);

  const handleDeleteSelectedLayers = () => {
      if (selectedIds.length === 0) return;
      setConfig(prev => {
          const next = deepCopy(prev);
          next.image_layers = next.image_layers.filter(l => !selectedIds.includes(l.id));
          next.additional_texts = next.additional_texts.filter(t => !selectedIds.includes(t.id));
          next.shapes = next.shapes.filter(s => !selectedIds.includes(s.id));
          next.layerOrder = next.layerOrder.filter(id => !selectedIds.includes(id));
          next.groups = next.groups.filter(g => !selectedIds.includes(g.id)).map(g => ({ ...g, layerIds: g.layerIds.filter(id => !selectedIds.includes(id)) })).filter(g => g.layerIds.length > 0);
          return next;
      }, true);
      setSelectedIds([]); showToast(`${selectedIds.length} ITEM(S) DELETED`);
  };

  const handleCopyLayers = () => {
      if (selectedIds.length === 0) return;
      const itemsToCopy: any[] = [];
      selectedIds.forEach(id => {
          const img = activePageConfig.image_layers.find(l => l.id === id);
          if (img) { itemsToCopy.push({ type: 'image', data: deepCopy(img) }); return; }
          const txt = activePageConfig.additional_texts.find(l => l.id === id);
          if (txt) { itemsToCopy.push({ type: 'text', data: deepCopy(txt) }); return; }
          const shp = activePageConfig.shapes.find(l => l.id === id);
          if (shp) { itemsToCopy.push({ type: 'shape', data: deepCopy(shp) }); return; }
      });
      if (itemsToCopy.length > 0) { clipboardRef.current = itemsToCopy; showToast("COPIED TO CLIPBOARD"); }
  };

  const handlePasteLayers = () => {
      if (clipboardRef.current.length === 0) return;
      const newIds: string[] = [];
      setConfig(prev => {
          const next = deepCopy(prev);
          const offset = 20; 
          clipboardRef.current.forEach(item => {
              const baseId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              if (item.type === 'image') {
                  const newLayer = { ...item.data, id: `img-${baseId}`, position_x: item.data.position_x + offset, position_y: item.data.position_y + offset };
                  next.image_layers.push(newLayer); next.layerOrder.push(newLayer.id); newIds.push(newLayer.id);
              } else if (item.type === 'text') {
                  const newLayer = { ...item.data, id: `text-${baseId}`, position_x: item.data.position_x + offset, position_y: item.data.position_y + offset };
                  next.additional_texts.push(newLayer); next.layerOrder.push(newLayer.id); newIds.push(newLayer.id);
              } else if (item.type === 'shape') {
                  const newLayer = { ...item.data, id: `shape-${baseId}`, position_x: item.data.position_x + offset, position_y: item.data.position_y + offset };
                  next.shapes.push(newLayer); next.layerOrder.push(newLayer.id); newIds.push(newLayer.id);
              }
          });
          return next;
      }, true);
      setSelectedIds(newIds); showToast("PASTED");
  };

  const handleDuplicateLayers = () => { handleCopyLayers(); setTimeout(handlePasteLayers, 0); };
  const handleUndo = () => { if (appState.index > 0) { setAppState(prev => ({ ...prev, index: prev.index - 1 })); setSelectedIds([]); } };
  const handleRedo = () => { if (appState.index < appState.history.length - 1) { setAppState(prev => ({ ...prev, index: prev.index + 1 })); setSelectedIds([]); } };

  useEffect(() => {
    if (showLanding || isInitializing || isBackendMenuOpen || isPurgingRef.current) return;
    const save = async () => { 
        if (isPurgingRef.current) return;
        setIsAutoSaving(true); 
        const safeId = currentProjectId || activePageConfig.id || 'unsaved-project';
        const safeName = activePageConfig.projectName || "UNTITLED PROJECT";
        const projectData = { id: safeId, name: safeName, lastSaved: Date.now(), data: currentState }; 
        try { 
            await saveProjectToDB(projectData); 
            setLastSaved(new Date()); 
        } catch (e) { 
            console.error("Auto-sync failure:", e);
        } finally { 
            if (!isPurgingRef.current) setIsAutoSaving(false); 
            if (!isBackendMenuOpen && !isPurgingRef.current) refreshLibrary(); 
        }
    };
    const timer = setTimeout(save, 8000); 
    return () => clearTimeout(timer);
  }, [currentState, showLanding, isInitializing, isBackendMenuOpen, currentProjectId]);

  const handleLoadProject = async (id: string) => {
      setIsInitializing(true); 
      try {
          const project = await getProjectByIdFromDB(id);
          if (project) { 
              const data = project.data; setCurrentProjectId(project.id);
              setAppState({ history: [{ pages: data.pages.map(repairConfig), activePageIndex: data.activePageIndex || 0 }], index: 0 });
              setShowLanding(false); localStorage.setItem('last_active_project_id', id); 
          }
      } catch (e) { showToast("Failed to Load"); } finally { setIsInitializing(false); }
  };

  const handleCreateProject = (data?: any) => {
    if (!data) { setShowNewProjectFlow(true); return; }
    const newId = `proj-${Date.now()}`;
    const uniqueName = generateUniqueName(data.name);
    const newConfig = repairConfig({ ...deepCopy(DEFAULT_CONFIG), id: newId, projectName: uniqueName, canvas: { ...DEFAULT_CONFIG.canvas, width: data.width, height: data.height } });
    setCurrentProjectId(newId);
    setAppState({ history: [{ pages: [newConfig], activePageIndex: 0 }], index: 0 });
    saveProjectToDB({ id: newId, name: uniqueName, lastSaved: Date.now(), data: { pages: [newConfig], activePageIndex: 0 } }).then(() => refreshLibrary());
    setShowLanding(false); setShowNewProjectFlow(false); setIsBackendMenuOpen(false); localStorage.setItem('last_active_project_id', newId); setIsInitializing(false); 
  };

  const setActivePage = (index: number) => {
      setAppState(prev => {
          const newHist = [...prev.history];
          newHist[prev.index] = { ...newHist[prev.index], activePageIndex: index };
          return { ...prev, history: newHist };
      });
      setSelectedIds([]);
  };

  const handleDuplicatePage = (index: number) => {
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
      setSelectedIds([]); showToast("ARTBOARD DUPLICATED");
  };

  const handleAddNewPage = () => {
      setAppState(prev => {
          const current = prev.history[prev.index];
          const newPage = repairConfig(deepCopy(DEFAULT_CONFIG)); 
          newPage.id = `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`; 
          newPage.name = `ARTBOARD ${current.pages.length + 1}`;
          newPage.projectName = current.pages[0].projectName; 
          const newPages = [...current.pages, newPage];
          const newState = { ...current, pages: newPages, activePageIndex: newPages.length - 1 };
          const newHist = [...prev.history.slice(0, prev.index + 1), newState];
          return { history: newHist, index: newHist.length - 1 };
      });
      setSelectedIds([]); showToast("NEW ARTBOARD ADDED");
  };

  const handleDeleteRequest = (targetId: string) => {
      if (currentState.pages.length <= 1) { showToast("MINIMUM 1 ARTBOARD REQUIRED"); return; }
      if (deleteConfirmId === targetId) {
          setAppState(prev => {
              const current = prev.history[prev.index];
              const pages = current.pages; if (pages.length <= 1) return prev;
              const targetIndex = pages.findIndex(p => p.id === targetId); if (targetIndex === -1) return prev;
              const newPages = [...pages]; newPages.splice(targetIndex, 1);
              let nextActiveIndex = current.activePageIndex; if (targetIndex <= current.activePageIndex) { nextActiveIndex = Math.max(0, current.activePageIndex - 1); }
              nextActiveIndex = Math.min(nextActiveIndex, newPages.length - 1);
              const newState = { ...current, pages: newPages, activePageIndex: nextActiveIndex };
              // Fix: Rename and split to resolve 'nHist' not found error (line 557 fix)
              const newHistoryUpdate = prev.history.slice(0, prev.index + 1);
              newHistoryUpdate.push(newState);
              return { history: newHistoryUpdate, index: newHistoryUpdate.length - 1 };
          });
          setDeleteConfirmId(null); setSelectedIds([]); showToast("ARTBOARD PURGED");
      } else { setDeleteConfirmId(targetId); }
  };

  const handleRenamePage = (index: number, newName: string) => {
      setAppState(prev => {
          const current = prev.history[prev.index];
          const newPages = [...current.pages]; newPages[index] = { ...newPages[index], name: newName.toUpperCase() };
          const newState = { ...current, pages: newPages };
          // Fix: Rename and split to resolve 'nHist' not found error (line 572 fix)
          const newHistoryUpdate = [...prev.history];
          newHistoryUpdate[prev.index] = newState;
          return { ...prev, history: newHistoryUpdate };
      });
  };

  const handleSelection = (id: string | string[] | null, multi = false) => {
      if (!id) { setSelectedIds([]); return; }
      if (Array.isArray(id)) { setSelectedIds(id); return; }
      setSelectedIds(prev => multi ? (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]) : [id]);
  };

  const handleStashResult = (src: string) => {
      const newAsset = { id: `stash-${Date.now()}`, src, backup: true, timestamp: Date.now() };
      setConfig(prev => ({ ...prev, stash: [newAsset, ...(prev.stash || [])] }), true);
      showToast("STASHED TO LIBRARY");
  };

  const handleAlign = (type: string) => {
    if (selectedIds.length === 0) return;
    setConfig(prev => {
        const next = deepCopy(prev); 
        const canvasW = next.canvas.width; const canvasH = next.canvas.height;
        const allLayers = [...next.image_layers, ...next.additional_texts, ...next.shapes];
        const selectedLayers = allLayers.filter(l => selectedIds.includes(l.id));
        if (selectedLayers.length === 0) return next;
        let minX = Math.min(...selectedLayers.map(l => l.position_x));
        let maxX = Math.max(...selectedLayers.map(l => l.position_x + l.width));
        let minY = Math.min(...selectedLayers.map(l => l.position_y));
        let maxY = Math.max(...selectedLayers.map(l => l.position_y + l.height));
        let centerX = minX + (maxX - minX) / 2; let centerY = minY + (maxY - minY) / 2;
        const isMulti = selectedIds.length > 1;
        if (type === 'dist-h' || type === 'dist-v') {
            if (selectedLayers.length < 3) return next;
            if (type === 'dist-h') {
                selectedLayers.sort((a, b) => a.position_x - b.position_x);
                const firstX = selectedLayers[0].position_x; const lastX = selectedLayers[selectedLayers.length - 1].position_x;
                const gap = (lastX - firstX) / (selectedLayers.length - 1);
                // Fix: Corrected property name al.id and comparison al.id === l.id (Line 641 Error Fix)
                selectedLayers.forEach((l, i) => { const layer = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id); if (layer) layer.position_x = firstX + (gap * i); });
            } else {
                selectedLayers.sort((a, b) => a.position_y - b.position_y);
                const firstY = selectedLayers[0].position_y; const lastY = selectedLayers[selectedLayers.length - 1].position_y;
                const gap = (lastY - firstY) / (selectedLayers.length - 1);
                // Fix: Corrected property name al.id and comparison al.id === l.id (Line 641 Error Fix)
                selectedLayers.forEach((l, i) => { const layer = next.image_layers.find(al => al.id === l.id) || next.additional_texts.find(al => al.id === l.id) || next.shapes.find(al => al.id === l.id); if (layer) layer.position_y = firstY + (gap * i); });
            }
            return next;
        }
        selectedIds.forEach(id => {
            const l = next.image_layers.find(al => al.id === id) || next.additional_texts.find(al => al.id === id) || next.shapes.find(al => al.id === id); if (!l) return;
            if (isMulti) { if (type === 'left') l.position_x = minX; if (type === 'right') l.position_x = maxX - l.width; if (type === 'top') l.position_y = minY; if (type === 'bottom') l.position_y = maxY - l.height; if (type === 'center') l.position_x = centerX - (l.width / 2); if (type === 'middle') l.position_y = centerY - (l.height / 2); } 
            else { if (type === 'left') l.position_x = 0; if (type === 'right') l.position_x = canvasW - l.width; if (type === 'top') l.position_y = 0; if (type === 'bottom') l.position_y = canvasH - l.height; if (type === 'center') l.position_x = (canvasW / 2) - (l.width / 2); if (type === 'middle') l.position_y = (canvasH / 2) - (l.height / 2); }
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
      const move = (e: MouseEvent) => { 
          if (isPanning) {
              setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y }); 
          }
      }; 
      const up = () => setIsPanning(false); 
      window.addEventListener('mousemove', move); 
      window.addEventListener('mouseup', up); 
      return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); }; 
  }, [isPanning]);

  const handleExportSinglePage = async (pageIndex: number, quality: 'SD' | 'HD' | '4K' | '8K' = 'HD') => {
      const page = currentState.pages[pageIndex]; const domId = `canvas-export-${page.id}`;
      try { 
        showToast(`RENDERING ${quality}...`); 
        const dataUrl = await exportArtboard(domId, page.name, page, { quality, format: 'png' }); 
        const cleanName = page.name.trim().replace(/\s+/g, '_') || 'ARTBOARD';
        downloadBlob(dataUrl, `${cleanName}_${quality}.png`); 
        showToast("EXPORT COMPLETE"); 
      } 
      catch (e) { showToast("EXPORT FAILED"); }
  };

  const handleSendMessage = async (text?: string) => {
      const textToSend = text || chatInput; if ((!textToSend?.trim() && chatAttachments.length === 0) || isChatLoading) return;
      const currentAttachments = [...chatAttachments];
      setChatMessages(prev => [...prev, { role: 'user', text: textToSend || "", attachments: currentAttachments.map(a => a.url) }]);
      setChatInput(""); setChatAttachments([]); setIsChatLoading(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const parts: any[] = []; if (textToSend?.trim()) parts.push({ text: textToSend });
          for (const attachment of currentAttachments) { if (attachment.file.type.startsWith('image/')) { parts.push(await fileToPart(attachment.file)); } }
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts }, config: { systemInstruction: 'You are the Neural Assistant for Sport Cover Designer. CRITICAL RULE: If the user asks for a "prompt" or "image description", you MUST output the response as a SINGLE, RAW, DETAILED PARAGRAPH. Do NOT use bullet points, lists, bold headers, or markdown formatting for the prompt text itself. It must be a clean block of text ready to be copied into an image generator. For other queries, be helpful, concise, and professional.', tools: [{ googleSearch: {} }] } });
          const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || []; setChatMessages(prev => [...prev, { role: 'model', text: response.text || "", sources }]);
      } catch (error) { setChatMessages(prev => [...prev, { role: 'model', text: "Neural Uplink Failed. Please verify API Key or network." }]); } 
      finally { setIsChatLoading(false); }
  };

  if (isInitializing) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans"><Loader2 className="animate-spin mb-4" size={40} /><span className="text-[10px] font-black uppercase tracking-[0.3em]">Restoring Neural Session...</span></div>;
  
  if (showLanding) return (
    <LandingPage 
        onStart={() => setShowLanding(false)} 
        onOpenAiStudio={() => { setShowLanding(false); setIsStudioOpen(true); }} 
        onLoadProject={handleLoadProject} 
        onOpenCooking={() => { setShowLanding(false); setIsGenOpen(true); }}
        onOpenTitanFill={() => { setShowLanding(false); setIsTitanFillOpen(true); }}
        onOpenPurgeBg={() => { setShowLanding(false); setIsPurgeOpen(true); }}
        onOpenRetouch={() => { setShowLanding(false); setIsRetouchOpen(true); }}
        onOpenStory={() => { setShowLanding(false); setIsStoryOpen(true); }}
        onOpenNoteLM={() => { setShowLanding(false); setIsNoteLMOpen(true); }}
    />
  );

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] overflow-hidden text-slate-900 font-sans" tabIndex={-1}>
      <SidebarMenu 
        isOpen={isBackendMenuOpen} onClose={() => setIsBackendMenuOpen(false)} config={activePageConfig} onUpdateConfig={setConfig}
        onNew={handleCreateProject} onImport={handleImportProject} onSave={() => {}} isSaving={isAutoSaving} saveSuccess={false} projectLibrary={projectLibrary} currentProjectId={activePageConfig.id}
        onLoadProject={handleLoadProject} onDeleteProject={handleDeleteProject} onPurgeAll={handlePurgeAllProjects}
      />
      <NewProjectFlow isOpen={showNewProjectFlow} onClose={() => setShowNewProjectFlow(false)} onConfirm={handleCreateProject} />
      
      <div className={`${isSidebarOpen ? 'w-[340px]' : 'w-[64px]'} transition-all duration-300 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 h-full z-[100] shadow-xl overflow-hidden relative`}>
        <EditorControls 
            config={activePageConfig} setConfig={setConfig} selectedId={selectedIds.length === 1 ? selectedIds[0] : null} selectedIds={selectedIds} onSelectLayer={handleSelection} 
            collapsed={!isSidebarOpen} onExpand={() => setIsSidebarOpen(true)} setZoom={setZoom} onHome={() => setIsBackendMenuOpen(true)} penToolMode={penToolMode as any} setPenToolMode={setPenToolMode as any}
            isAssistantOpen={isAssistantOpen} onToggleAssistant={() => setIsAssistantOpen(!isAssistantOpen)} isBackendMenuOpen={isBackendMenuOpen} setIsBackendMenuOpen={setIsBackendMenuOpen} onNewProject={() => setShowNewProjectFlow(true)}
            isAutoSaving={isAutoSaving} lastSaved={lastSaved}
            onOpenBgRemover={(src) => { setActiveHubContext(src || null); setIsPurgeOpen(true); }} 
            onOpenNanoUpscaler={(src) => { setActiveHubContext(src || null); setIsUpscaleOpen(true); }} 
            onOpenNanoGen={(src) => { setActiveHubContext(src || null); setIsPurgeOpen(false); setIsGenOpen(true); }} 
            onOpenRetouch={(src) => { setActiveHubContext(src || null); setIsRetouchOpen(true); }}
            onOpenTitanFill={(src) => { setActiveHubContext(src || null); setIsTitanFillOpen(true); }}
            onOpenStory={(src) => { if(src) setActiveHubContext(src); setIsGenOpen(false); setIsStoryOpen(true); }}
            onOpenNoteLM={() => setIsNoteLMOpen(true)}
            onOpenTypefaceStudio={() => setIsTypefaceStudioOpen(true)}
            onGroup={handleGroupLayers} onUngroup={handleUngroupLayers} onMerge={() => {}}
        />
      </div>

      <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm shrink-0">
           <div className="flex items-center gap-1">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors" title="Toggle Sidebar"><PanelLeft size={18}/></button>
              <div className="h-6 w-px bg-gray-200 mx-2"/>
              <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100 shadow-inner">
                <button onClick={handleUndo} disabled={appState.index === 0} className="p-1.5 hover:bg-white rounded text-gray-600 disabled:opacity-20 transition-all" title="Undo (Ctrl+Z)"><Undo size={16}/></button>
                <button onClick={handleRedo} disabled={appState.index === appState.history.length - 1} className="p-1.5 hover:bg-white rounded text-gray-600 disabled:opacity-20 transition-all" title="Redo (Ctrl+Y)"><Redo size={16}/></button>
              </div>
              <div className="h-6 w-px bg-gray-200 mx-2"/>
              <div className="flex items-center gap-1.5 bg-gray-50 border border-slate-100 rounded-xl px-2 py-1">
                  <button onClick={() => setZoom(Math.max(0.1, zoom - 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-orange-600 transition-all"><Minus size={14}/></button>
                  <span className="text-[11px] font-black text-slate-700 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(Math.min(2, zoom + 0.05))} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-orange-600 transition-all"><Plus size={14}/></button>
              </div>
              <div className="h-6 w-px bg-gray-200 mx-2"/>
              <button onClick={() => setPenToolMode(penToolMode === 'hand' ? 'select' : 'hand')} className={`p-2 rounded transition-all ${penToolMode === 'hand' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`} title="Hand Tool (Space)"><Hand size={18}/></button>
           </div>
           <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
               <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-lg ring-4 ring-gray-50">
                    <div className="flex items-center"><button onClick={() => handleAlign('left')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Left"><AlignStartVertical size={16}/></button><button onClick={() => handleAlign('center')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Horizontal Center"><AlignCenterVertical size={16}/></button><button onClick={() => handleAlign('right')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Right"><AlignEndVertical size={16}/></button></div><div className="h-4 w-px bg-gray-200 mx-1" /><div className="flex items-center"><button onClick={() => handleAlign('top')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Top"><AlignStartHorizontal size={16}/></button><button onClick={() => handleAlign('middle')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Vertical Center"><AlignCenterHorizontal size={16}/></button><button onClick={() => handleAlign('bottom')} disabled={selectedIds.length === 0} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Align Bottom"><AlignEndHorizontal size={16}/></button></div><div className="h-4 w-px bg-gray-200 mx-1" /><div className="flex items-center"><button onClick={() => handleAlign('dist-h')} disabled={selectedIds.length < 3} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Distribute Horizontal Spacing"><DistributeH size={16}/></button><button onClick={() => handleAlign('dist-v')} disabled={selectedIds.length < 3} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-20" title="Distribute Vertical Spacing"><DistributeV size={16}/></button></div>
               </div>
               <div className="flex items-center gap-3 px-4 py-2 bg-slate-900 rounded-2xl text-white shadow-xl border border-slate-800 transition-all hover:bg-black"><Layout size={14} className="text-orange-400" /><div className="flex flex-col"><input type="text" value={activePageConfig.projectName || ""} onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value.toUpperCase() }), true)} className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] outline-none h-3" placeholder="UNTITLED"/><span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{activePageConfig.canvas.width}×{activePageConfig.canvas.height} • {activePageConfig.canvas.status || 'DRAFT'}</span></div></div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={() => setIsNoteLMOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-white hover:scale-105 transition-all"><BookOpen size={14} /> SPACE NOTELM</button>
              <button onClick={() => setIsCineOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-500 hover:scale-105 transition-all"><Video size={14} fill="white" /> VEO CINE ENGINE</button>
              <button onClick={() => setIsExportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"><Download size={14} /> EXPORT UHD</button>
              <button onClick={() => setIsStudioOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"><Sparkles size={14} fill="white" /> AI STUDIO</button>
           </div>
        </div>
        <div className={`flex-1 overflow-hidden bg-[#e5e7eb] relative flex items-center justify-center ${isPanning || penToolMode === 'hand' || isSpacePressed ? 'cursor-grabbing' : 'cursor-default'}`} onMouseDown={handleMouseDown}>
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            <div className="transition-transform duration-75 ease-out flex gap-24 items-center px-40 py-20" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                {currentState.pages.map((pageConfig, pageIndex) => {
                    const isActive = pageIndex === currentState.activePageIndex;
                    return (
                        <div key={pageConfig.id} className="flex flex-col items-center group/artboard">
                            <div className={`flex items-center justify-between pb-3 select-none pointer-events-auto w-full transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-40 group-hover/artboard:opacity-80'}`} style={{ width: pageConfig.canvas.width * zoom }}>
                                <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border shadow-sm transition-all cursor-pointer ${isActive ? 'bg-white border-orange-200 ring-4 ring-orange-500/10' : 'bg-white/60 border-white/50'}`} onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}>
                                    <Layout size={14} className={isActive ? "text-orange-500" : "text-slate-400"} /><input type="text" value={pageConfig.name} onChange={(e) => handleRenamePage(pageIndex, e.target.value)} onKeyDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={`bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest outline-none w-24 transition-all focus:bg-orange-50 rounded px-1 ${isActive ? 'text-slate-700' : 'text-slate-500'}`}/>
                                </div>
                                <div className={`flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/artboard:opacity-100'}`} onMouseDown={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleExportSinglePage(pageIndex, 'HD'); }} 
                                        className="flex items-center gap-1.5 px-2 py-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-all border border-transparent hover:border-orange-100 group/hd"
                                        title="EXPORT DESIGN (1080P)"
                                    >
                                        <MonitorDown size={12} className="group-hover/hd:scale-110 transition-transform" />
                                        <span className="text-[7px] font-black tracking-widest">1080P</span>
                                    </button>
                                    <div className="h-3 w-px bg-slate-200 mx-1" />
                                    <button onClick={(e) => { e.stopPropagation(); handleDuplicatePage(pageIndex); }} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Duplicate Artboard"><Copy size={12}/></button><button onClick={(e) => { e.stopPropagation(); handleAddNewPage(); }} className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="Add New Artboard"><Plus size={12}/></button><div className="h-3 w-px bg-slate-300 mx-1" /><button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteRequest(pageConfig.id); }} onMouseDown={(e) => e.stopPropagation()} className={`p-1.5 rounded-lg transition-all cursor-pointer relative z-50 flex items-center gap-1 ${deleteConfirmId === pageConfig.id ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-300' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`} title={deleteConfirmId === pageConfig.id ? "Click Again to Confirm Delete" : "Delete Artboard"}>{deleteConfirmId === pageConfig.id ? <TriangleAlert size={12} /> : <Trash2 size={12} />}{deleteConfirmId === pageConfig.id && <span className="text-[9px] font-bold uppercase tracking-wide">CONFIRM?</span>}</button>
                                </div>
                            </div>
                            <div className={`relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] rounded-sm transition-all duration-300 pointer-events-auto ${isActive ? 'shadow-[0_20px_60px_-15px_rgba(249,115,22,0.3)] ring-2 ring-orange-500/20' : 'cursor-pointer hover:ring-2 hover:ring-indigo-300/20 grayscale-[0.5]'}`} style={{ width: pageConfig.canvas.width * zoom, height: pageConfig.canvas.height * zoom, isolation: 'isolate' }} onMouseDown={(e) => { e.stopPropagation(); if (!isActive) setActivePage(pageIndex); }}>
                                <CanvasPreview domId={`canvas-export-${pageConfig.id}`} config={pageConfig} scale={zoom} onUpdate={(newConfig, save) => { setAppState(prev => { const current = prev.history[prev.index]; const nPages = [...current.pages]; const targetIdx = nPages.findIndex(p => p.id === pageConfig.id); if (targetIdx === -1) return prev; nPages[targetIdx] = newConfig; const nState = { ...current, pages: nPages }; if (save) { const newHistoryUpdate = prev.history.slice(0, prev.index + 1); newHistoryUpdate.push(deepCopy(nState)); return { history: newHistoryUpdate, index: newHistoryUpdate.length - 1 }; } else { const newHistoryUpdate = [...prev.history]; newHistoryUpdate[prev.index] = nState; return { ...prev, history: newHistoryUpdate }; } }); }} selectedIds={isActive ? selectedIds : []} onSelect={(id, multi) => { if (!isActive) setActivePage(pageIndex); handleSelection(id, multi); }} readOnly={false} isActive={isActive} handToolActive={penToolMode === 'hand' || isSpacePressed} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl"><button onClick={() => setZoom(0.45)} className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-orange-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100">Fit Canvas</button><button onClick={() => { setPan({x: 0, y: 0}); setZoom(0.45); }} className="p-2 text-slate-400 hover:text-orange-600 transition-colors" title="Reset View"><Maximize size={16}/></button></div>
        </div>
      </div>

      <BeatstoriaStudio isOpen={isStudioOpen} onClose={() => setIsStudioOpen(false)} initialImage={null} onApply={handleApplyToCanvas} onAddToGallery={() => {}} isSmartAssistantActive={false} toggleSmartAssistant={() => {}} chatMessages={chatMessages} setChatMessages={setChatMessages} onLogSmartAction={() => {}} onExecuteAiCommand={() => {}} onSendMessage={handleSendMessage} chatInput={chatInput} setChatInput={setChatInput} isChatLoading={isChatLoading} setIsChatLoading={setIsChatLoading} chatAttachments={chatAttachments} setChatAttachments={setChatAttachments} chatSession={{current: null} as any} />
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} activePage={activePageConfig} allPages={currentState.pages} />

      {isAssistantOpen && (
        <Rnd default={{ x: 80, y: window.innerHeight - 520, width: 320, height: 480 }} minWidth={300} minHeight={400} bounds="window" className="z-[2000]" dragHandleClassName="drag-handle" enableUserSelectHack={false}>
            <div className="w-full h-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"><div className="drag-handle h-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between px-4 cursor-move shrink-0"><div className="flex items-center gap-2 pointer-events-none"><Bot size={14} className="text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Neural Assistant</span></div><button onClick={() => setIsAssistantOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg transition-all text-slate-400"><X size={14} /></button></div><div className="flex-1 overflow-hidden"><AssistantPanel messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={handleSendMessage} isLoading={isChatLoading} onClear={() => setChatMessages([])} attachments={chatAttachments} setAttachments={setChatAttachments} /></div></div>
        </Rnd>
      )}

      {isTypefaceStudioOpen && <NeuralTypefaceStudio isOpen={isTypefaceStudioOpen} onClose={() => setIsTypefaceStudioOpen(false)} onApply={handleApplyToCanvas} targetLayer={selectedTextLayer} />}
      {isPurgeOpen && <NeuralPurgeStudio isOpen={isPurgeOpen} onClose={() => setIsPurgeOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} library={activePageConfig.stash} onOpenCooking={() => { setIsPurgeOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsPurgeOpen(false); setIsTitanFillOpen(true); }} onOpenRetouch={() => { setIsPurgeOpen(false); setIsRetouchOpen(true); }} onOpenStory={() => { setIsPurgeOpen(false); setIsStoryOpen(true); }} />}
      {isUpscaleOpen && <NanoBananaStudio isOpen={isUpscaleOpen} onClose={() => setIsUpscaleOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} />}
      {isStoryOpen && <StoryCampaignFlow isOpen={isStoryOpen} onClose={() => setIsStoryOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsStoryOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsStoryOpen(false); setIsTitanFillOpen(true); }} onOpenPurgeBg={() => { setIsStoryOpen(false); setIsPurgeOpen(true); }} onOpenRetouch={() => { setIsStoryOpen(false); setIsRetouchOpen(true); }} />}
      {isGenOpen && <NanoBananaGen isOpen={isGenOpen} onClose={() => setIsGenOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} chatMessages={chatMessages} onSendMessage={handleSendMessage} chatInput={chatInput} setChatInput={setChatInput} isChatLoading={isChatLoading} chatAttachments={chatAttachments} setChatAttachments={setChatAttachments} initialImage={activeHubContext} onOpenPurge={(src) => { setActiveHubContext(src); setIsPurgeOpen(true); }} onOpenRetouch={(src) => { setActiveHubContext(src); setIsRetouchOpen(true); }} onOpenStory={(src) => { if(src) setActiveHubContext(src); setIsGenOpen(false); setIsStoryOpen(true); }} onOpenUpscale={(src) => { setActiveHubContext(src); setIsUpscaleOpen(true); }} onOpenTitanFill={(src) => { setActiveHubContext(src); setIsTitanFillOpen(true); }} sessionHistory={genHistory} setSessionHistory={setGenHistory} />}
      {isRetouchOpen && <NeuralRetouchStudio isOpen={isRetouchOpen} onClose={() => setIsRetouchOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsRetouchOpen(false); setIsGenOpen(true); }} onOpenTitanFill={() => { setIsRetouchOpen(false); setIsTitanFillOpen(true); }} onOpenPurgeBg={() => { setIsRetouchOpen(false); setIsPurgeOpen(true); }} onOpenStory={() => { setIsRetouchOpen(false); setIsStoryOpen(true); }} />}
      {isTitanFillOpen && <TitanFillStudio isOpen={isTitanFillOpen} onClose={() => setIsTitanFillOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} onOpenCooking={() => { setIsTitanFillOpen(false); setIsGenOpen(true); }} onOpenPurgeBg={() => { setIsTitanFillOpen(false); setIsPurgeOpen(true); }} onOpenRetouch={() => { setIsTitanFillOpen(false); setIsRetouchOpen(true); }} onOpenStory={() => { setIsTitanFillOpen(false); setIsStoryOpen(true); }} />}
      {isCineOpen && <VeoCineStudio isOpen={isCineOpen} onClose={() => setIsCineOpen(false)} onApply={handleApplyToCanvas} onStash={handleStashResult} initialImage={activeHubContext} />}
      {isNoteLMOpen && <NoteLMStudio isOpen={isNoteLMOpen} onClose={() => setIsNoteLMOpen(false)} onOpenCooking={() => { setIsNoteLMOpen(false); setIsGenOpen(true); }} />}

      {toastMessage && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[6000] animate-in fade-in slide-in-from-bottom-4 duration-300"><CheckCircle2 size={16} className="text-green-400" /><span className="text-[10px] font-black uppercase tracking-widest">{toastMessage}</span></div>}
    </div>
  );
};