import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Layout as LayoutIcon, Eye, EyeOff, Lock, Unlock, 
  Type, Image as ImageIcon, Shapes, GripVertical,
  MoveUp, MoveDown, Zap, Trash2, Copy, MoreVertical,
  Command, Shield, Fingerprint, Layers, ChevronUp, ChevronDown,
  Sparkles, MousePointer2, Combine, Split, Folder, FolderOpen,
  ArrowUpToLine, ArrowDownToLine, Merge, TriangleAlert
} from 'lucide-react';
import { AppConfig, ImageLayer, ShapeLayer, TextLayer, LayerEffects } from '../../types';
import { DEFAULT_EFFECTS } from '../../constants';

interface LayersPanelProps {
  config: AppConfig;
  setConfig: (value: AppConfig | ((prev: AppConfig) => AppConfig), saveToHistory?: boolean) => void;
  selectedIds: string[];
  onSelectLayer: (id: string | null | string[], multi?: boolean) => void;
  isVisible: boolean;
  setIsVisible: (val: boolean) => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onMerge?: () => void;
}

// Internal Component: Double-Tap Delete Button (Trash UI)
const DeleteConfirmButton = ({ onDelete, className, title = "Delete" }: { onDelete: () => void, className?: string, title?: string }) => {
    const [status, setStatus] = useState<'idle' | 'confirm'>('idle');
    
    useEffect(() => {
        if (status === 'confirm') {
            const timer = setTimeout(() => setStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                if (status === 'idle') {
                    setStatus('confirm');
                } else {
                    onDelete();
                    setStatus('idle');
                }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`${className} ${status === 'confirm' ? '!bg-red-500 !text-white !border-red-500 opacity-100 shadow-lg scale-110' : ''}`}
            title={status === 'confirm' ? "Click again to confirm" : title}
        >
            {status === 'confirm' ? <TriangleAlert size={14} className="animate-pulse" /> : <Trash2 size={14} />}
        </button>
    );
};

export const LayersPanel: React.FC<LayersPanelProps> = ({ 
  config, setConfig, selectedIds, onSelectLayer, onGroup, onUngroup, onMerge
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [lastActiveId, setLastActiveId] = useState<string | null>(null);
  
  const sortedLayers = useMemo(() => {
      // Visual Order: Top Layer in UI list should be Highest Z-Index (Last in Array)
      const allLayerIds = Array.from(new Set([...config.layerOrder, 'global-fx']));
      // 'global-fx' is virtually at the bottom, so filter it out if we want clean layers, or keep it.
      // We reverse so the last item (top z-index) is first in the list.
      return [...allLayerIds].reverse();
  }, [config.layerOrder]);

  const renderedGroups = useRef(new Set<string>());
  renderedGroups.current.clear();

  const handleLayerClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (e.shiftKey && lastActiveId && sortedLayers.includes(lastActiveId) && sortedLayers.includes(id)) {
          const startIdx = sortedLayers.indexOf(lastActiveId);
          const endIdx = sortedLayers.indexOf(id);
          const low = Math.min(startIdx, endIdx);
          const high = Math.max(startIdx, endIdx);
          const rangeIds = sortedLayers.slice(low, high + 1);
          onSelectLayer(rangeIds); 
          return;
      }

      if (e.metaKey || e.ctrlKey) {
          onSelectLayer(id, true);
          setLastActiveId(id);
          return;
      }

      onSelectLayer(id, false);
      setLastActiveId(id);
  };

  const toggleVisibility = (id: string, e: React.MouseEvent | null) => {
    e?.stopPropagation();
    setConfig(prev => {
      if (id === 'global-fx') return { ...prev, canvas: { ...prev.canvas, global_effects_enabled: !prev.canvas.global_effects_enabled } };
      return {
        ...prev,
        image_layers: prev.image_layers.map(l => l.id === id ? { ...l, hidden: !l.hidden } : l),
        additional_texts: prev.additional_texts.map(l => l.id === id ? { ...l, hidden: !l.hidden } : l),
        shapes: (prev.shapes || []).map(l => l.id === id ? { ...l, hidden: !l.hidden } : l)
      };
    }, true);
  };

  const toggleLock = (id: string, e: React.MouseEvent | null) => {
    e?.stopPropagation();
    setConfig(prev => {
      if (id === 'global-fx') return { ...prev, canvas: { ...prev.canvas, global_effects_locked: !prev.canvas.global_effects_locked } };
      return {
        ...prev,
        image_layers: prev.image_layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l),
        additional_texts: prev.additional_texts.map(l => l.id === id ? { ...l, locked: !l.locked } : l),
        shapes: (prev.shapes || []).map(l => l.id === id ? { ...l, locked: !l.locked } : l)
      };
    }, true);
  };

  const moveLayer = (id: string, direction: 'up' | 'down', e: React.MouseEvent | null) => {
    e?.stopPropagation();
    if (id === 'global-fx') return; 
    
    setConfig(prev => {
      const order = [...prev.layerOrder];
      const idx = order.indexOf(id);
      if (idx === -1) return prev;
      
      const newIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= order.length) return prev;
      
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      return { ...prev, layerOrder: order };
    }, true);
  };

  const moveLayerToFront = (id: string, e: React.MouseEvent | null) => {
    e?.stopPropagation();
    if (id === 'global-fx') return;
    setConfig(prev => {
        const order = prev.layerOrder.filter(lid => lid !== id);
        return { ...prev, layerOrder: [...order, id] };
    }, true);
  };

  const moveLayerToBack = (id: string, e: React.MouseEvent | null) => {
    e?.stopPropagation();
    if (id === 'global-fx') return;
    setConfig(prev => {
        const order = prev.layerOrder.filter(lid => lid !== id);
        return { ...prev, layerOrder: [id, ...order] };
    }, true);
  };

  const deleteLayer = (id: string) => {
    if (id === 'global-fx') {
        setConfig(prev => ({ ...prev, canvas: { ...prev.canvas, global_effects: { ...DEFAULT_EFFECTS } } }), true);
        return;
    }

    setConfig(prev => ({
      ...prev,
      image_layers: prev.image_layers.filter(l => l.id !== id),
      additional_texts: prev.additional_texts.filter(l => l.id !== id),
      shapes: (prev.shapes || []).filter(l => l.id !== id),
      layerOrder: prev.layerOrder.filter(lid => lid !== id),
      groups: prev.groups.map(g => ({ ...g, layerIds: g.layerIds.filter(lid => lid !== id) })).filter(g => g.layerIds.length > 0)
    }), true);
    onSelectLayer(null);
  };

  const toggleGroupVisibility = (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfig(prev => {
          const group = prev.groups.find(g => g.id === groupId);
          if(!group) return prev;
          const newHidden = !group.hidden;
          
          return {
              ...prev,
              groups: prev.groups.map(g => g.id === groupId ? { ...g, hidden: newHidden } : g),
              // Also update children
              image_layers: prev.image_layers.map(l => group.layerIds.includes(l.id) ? { ...l, hidden: newHidden } : l),
              additional_texts: prev.additional_texts.map(l => group.layerIds.includes(l.id) ? { ...l, hidden: newHidden } : l),
              shapes: (prev.shapes || []).map(l => group.layerIds.includes(l.id) ? { ...l, hidden: newHidden } : l)
          };
      }, true);
  };

  const toggleGroupLock = (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfig(prev => {
          const group = prev.groups.find(g => g.id === groupId);
          if(!group) return prev;
          const newLocked = !group.locked;
          
          return {
              ...prev,
              groups: prev.groups.map(g => g.id === groupId ? { ...g, locked: newLocked } : g),
              // Also update children
              image_layers: prev.image_layers.map(l => group.layerIds.includes(l.id) ? { ...l, locked: newLocked } : l),
              additional_texts: prev.additional_texts.map(l => group.layerIds.includes(l.id) ? { ...l, locked: newLocked } : l),
              shapes: (prev.shapes || []).map(l => group.layerIds.includes(l.id) ? { ...l, locked: newLocked } : l)
          };
      }, true);
  };

  const deleteGroup = (groupId: string) => {
      setConfig(prev => {
          const group = prev.groups.find(g => g.id === groupId);
          if(!group) return prev;
          
          const layerIds = group.layerIds;
          
          return {
              ...prev,
              groups: prev.groups.filter(g => g.id !== groupId),
              image_layers: prev.image_layers.filter(l => !layerIds.includes(l.id)),
              additional_texts: prev.additional_texts.filter(l => !layerIds.includes(l.id)),
              shapes: (prev.shapes || []).filter(l => !layerIds.includes(l.id)),
              layerOrder: prev.layerOrder.filter(id => !layerIds.includes(id))
          };
      }, true);
      onSelectLayer(null);
  };

  const getLayerData = (id: string) => {
    const group = config.groups?.find(g => g.layerIds.includes(id));

    if (id === 'global-fx') {
        const enabled = config.canvas.global_effects_enabled !== false;
        return { name: 'GLOBAL FX', type: 'fx', icon: <Zap size={14} />, hidden: !enabled, locked: !!config.canvas.global_effects_locked, system: true, group: null };
    }
    
    const img = config.image_layers.find(l => l.id === id);
    if (img) {
        return { name: img.name || `IMG_${img.id.slice(-4).toUpperCase()}`, type: 'image', icon: <ImageIcon size={14} />, hidden: img.hidden, locked: img.locked, system: false, group };
    }
    
    const txt = config.additional_texts.find(l => l.id === id);
    if (txt) {
        return { name: txt.name || txt.text.substring(0, 16).toUpperCase() || 'TEXT LAYER', type: 'text', icon: <Type size={14} />, hidden: txt.hidden, locked: txt.locked, system: false, group };
    }
    
    const shp = config.shapes?.find(l => l.id === id);
    if (shp) {
        return { name: shp.name || `VEC_${shp.shape_type.toUpperCase()}`, type: 'shape', icon: <Shapes size={14} />, hidden: shp.hidden, locked: shp.locked, system: false, group };
    }
    
    return { name: 'UNKNOWN NODE', type: 'unknown', icon: <Fingerprint size={14} />, hidden: false, locked: false, system: false, group };
  };

  const handleRename = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setConfig(prev => {
        const next = { ...prev };
        
        // Check for Group rename first
        const groupIndex = next.groups?.findIndex(g => g.id === id);
        if (groupIndex !== undefined && groupIndex > -1) {
             const updatedGroups = [...next.groups];
             updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], name: newName };
             return { ...next, groups: updatedGroups };
        }

        const imgIndex = next.image_layers.findIndex(l => l.id === id);
        if (imgIndex > -1) {
            const updated = [...next.image_layers];
            updated[imgIndex] = { ...updated[imgIndex], name: newName };
            return { ...next, image_layers: updated };
        }

        const txtIndex = next.additional_texts.findIndex(l => l.id === id);
        if (txtIndex > -1) {
            const updated = [...next.additional_texts];
            updated[txtIndex] = { ...updated[txtIndex], name: newName };
            return { ...next, additional_texts: updated };
        }

        if (next.shapes) {
            const shpIndex = next.shapes.findIndex(l => l.id === id);
            if (shpIndex > -1) {
                const updated = [...next.shapes];
                updated[shpIndex] = { ...updated[shpIndex], name: newName };
                return { ...next, shapes: updated };
            }
        }

        return next;
    }, true);
    setEditingLayerId(null);
  };

  const startEditing = (id: string, currentName: string, e: React.MouseEvent) => {
    e?.stopPropagation();
    if (id === 'global-fx') return;
    setEditingLayerId(id);
    setEditName(currentName);
  };

  const saveEditing = () => {
    if (editingLayerId) {
        handleRename(editingLayerId, editName);
    } else {
        setEditingLayerId(null);
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
      setConfig(prev => ({
          ...prev,
          groups: prev.groups.map(g => g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)
      }), true);
  };

  const selectGroup = (groupId: string, layerIds: string[]) => {
      if (layerIds.length > 0) {
          onSelectLayer(layerIds);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn select-none relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 pb-10">
            {sortedLayers.map((id, index) => {
                const data = getLayerData(id);
                if (data.type === 'unknown' && (id === 'headline' || id === 'subtitle')) return null;

                const isSelected = selectedIds.includes(id);
                const isEditing = editingLayerId === id;
                
                // --- ROBUST GROUP LOGIC ---
                const group = data.group;
                let renderGroupHeader = false;

                if (group) {
                    if (!renderedGroups.current.has(group.id)) {
                        renderedGroups.current.add(group.id);
                        renderGroupHeader = true;
                    }
                }

                if (renderGroupHeader && group) {
                    const isGroupSelected = group.layerIds.every(lid => selectedIds.includes(lid));
                    const isGroupEditing = editingLayerId === group.id;
                    
                    const header = (
                        <div 
                            key={`group-header-${group.id}`}
                            onClick={() => selectGroup(group.id, group.layerIds)}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer mb-2 ${
                                isGroupSelected
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/20`}>
                                    <Combine size={14} className={isGroupSelected ? "text-white" : "text-purple-600"} />
                                </div>
                                <div className="flex flex-col overflow-hidden w-full mr-2" onDoubleClick={(e) => startEditing(group.id, group.name, e)}>
                                    {isGroupEditing ? (
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={saveEditing}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') saveEditing();
                                                if(e.key === 'Escape') setEditingLayerId(null);
                                                e.stopPropagation(); 
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full max-w-[140px] bg-white text-slate-900 text-[10px] font-bold px-1 py-0.5 rounded border border-purple-300 outline-none focus:ring-2 focus:ring-purple-500/20 uppercase tracking-widest"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate" title="Double click to rename group">{group.name}</span>
                                    )}
                                    <span className="text-[7px] font-bold opacity-70 uppercase tracking-wide">{group.layerIds.length} LAYERS MERGED</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                {/* Group Controls - ALWAYS VISIBLE with adaptive styling */}
                                <div className="flex items-center gap-0.5">
                                    <button 
                                        onClick={(e) => toggleGroupVisibility(group.id, e)} 
                                        className={`p-1.5 rounded transition-colors ${isGroupSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                                        title={group.hidden ? "Unhide Group" : "Hide Group"}
                                    >
                                        {group.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <button 
                                        onClick={(e) => toggleGroupLock(group.id, e)} 
                                        className={`p-1.5 rounded transition-colors ${isGroupSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                                        title={group.locked ? "Unlock Group" : "Lock Group"}
                                    >
                                        {group.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                    {/* GROUP DELETE BUTTON - TRASH UI */}
                                    <DeleteConfirmButton 
                                        onDelete={() => deleteGroup(group.id)} 
                                        className={`p-1.5 rounded transition-colors ${isGroupSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-red-100 text-slate-400 hover:text-red-500'}`}
                                        title="Delete Group"
                                    />
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(group.id); }}
                                    className={`p-1 rounded transition-colors ${isGroupSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'}`}
                                >
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${group.collapsed ? 'rotate-180' : 'rotate-0'}`} />
                                </button>
                            </div>
                        </div>
                    );

                    if (group.collapsed) {
                        return header; 
                    }
                    
                    return (
                        <React.Fragment key={`group-frag-${group.id}`}>
                            {header}
                            {/* Render current item below header */}
                            <div 
                                onClick={(e) => handleLayerClick(id, e)}
                                className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ml-3 border-l-2 border-l-purple-300 ${
                                    isSelected 
                                    ? 'bg-[#1a1c23] border-[#2d323e] text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)] z-10 scale-[1.01]' 
                                    : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                    }`}>
                                        {data.icon}
                                    </div>
                                    <div className="flex flex-col overflow-hidden w-full mr-2" onDoubleClick={(e) => startEditing(id, data.name, e)}>
                                        {isEditing ? (
                                            <input 
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onBlur={saveEditing}
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') saveEditing();
                                                    if(e.key === 'Escape') setEditingLayerId(null);
                                                    e.stopPropagation(); 
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full bg-white text-slate-900 text-[10px] font-bold px-1 py-0.5 rounded border border-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase tracking-widest"
                                            />
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-slate-800'}`} title="Double click to rename">
                                                {data.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity shrink-0`}>
                                    <button onClick={(e) => toggleVisibility(id, e)} className={`p-2 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}>{data.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                    <button onClick={(e) => toggleLock(id, e)} className={`p-2 rounded-lg transition-all ${data.locked ? 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm' : (isSelected ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600')}`} title={data.locked ? "Unlock Layer" : "Lock Layer"}>{data.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                }

                if (group && group.collapsed) {
                    return null;
                }

                return (
                    <div 
                        key={id}
                        onClick={(e) => handleLayerClick(id, e)}
                        className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                            ? 'bg-[#1a1c23] border-[#2d323e] text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)] z-10 scale-[1.01]' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                        } ${group ? 'ml-3 border-l-2 border-l-purple-300' : ''}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                            }`}>
                                {data.icon}
                            </div>
                            <div className="flex flex-col overflow-hidden w-full mr-2" onDoubleClick={(e) => startEditing(id, data.name, e)}>
                                {isEditing ? (
                                    <input 
                                        autoFocus
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveEditing}
                                        onKeyDown={(e) => {
                                            if(e.key === 'Enter') saveEditing();
                                            if(e.key === 'Escape') setEditingLayerId(null);
                                            e.stopPropagation(); 
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-white text-slate-900 text-[10px] font-bold px-1 py-0.5 rounded border border-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase tracking-widest"
                                    />
                                ) : (
                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-white' : 'text-slate-800'}`} title="Double click to rename">
                                        {data.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity shrink-0`}>
                            {id !== 'global-fx' && (
                                <div className="grid grid-cols-2 gap-px mr-2 bg-slate-100/50 p-0.5 rounded border border-slate-200/50">
                                    <button onClick={(e) => moveLayerToFront(id, e)} className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Move to Front"><ArrowUpToLine size={10} /></button>
                                    <button onClick={(e) => moveLayer(id, 'up', e)} className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Move Up"><ChevronUp size={10} /></button>
                                    <button onClick={(e) => moveLayerToBack(id, e)} className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Move to Back"><ArrowDownToLine size={10} /></button>
                                    <button onClick={(e) => moveLayer(id, 'down', e)} className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 rounded transition-colors" title="Move Down"><ChevronDown size={10} /></button>
                                </div>
                            )}

                            <button onClick={(e) => toggleVisibility(id, e)} className={`p-2 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}>{data.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                            <button onClick={(e) => toggleLock(id, e)} className={`p-2 rounded-lg transition-all ${data.locked ? 'text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 shadow-sm' : (isSelected ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600')}`} title={data.locked ? "Unlock Layer" : "Lock Layer"}>{data.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                            
                            {/* SINGLE LAYER TRASH UI */}
                            {isSelected && (
                                <DeleteConfirmButton 
                                    onDelete={() => deleteLayer(id)} 
                                    className="p-2 rounded-lg transition-colors bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white" 
                                    title="Delete Layer"
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
           <span>{selectedIds.length > 0 ? `${selectedIds.length} SELECTED` : `${sortedLayers.length} LAYERS`}</span>
           <div className="flex gap-2">
               {selectedIds.length > 1 && (
                   <span className="text-indigo-500 animate-pulse">MULTISELECTION ACTIVE</span>
               )}
               <span className="hidden sm:inline">SHIFT+CLICK: RANGE</span>
           </div>
        </div>
    </div>
  );
};
