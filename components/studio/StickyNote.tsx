
import React, { useState, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Note, NoteTask } from '../types';
import { Trash2, Image as ImageIcon, Plus, Check, X, GripHorizontal, Layout, Type, Minus, Maximize2, Move } from 'lucide-react';

interface StickyNoteProps {
  note: Note;
  onUpdate: (updatedNote: Note) => void;
  onDelete: () => void;
  scale: number;
  isFocused?: boolean;
  onFocus?: () => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onUpdate, onDelete, scale, isFocused, onFocus }) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [imgZoom, setImgZoom] = useState(1);
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUpdate({ ...note, src: ev.target.result as string });
          setImgZoom(1);
          setImgOffset({ x: 0, y: 0 });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (imgZoom <= 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - imgOffset.x, y: e.clientY - imgOffset.y };
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setImgOffset({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: NoteTask = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      completed: false
    };
    onUpdate({
      ...note,
      tasks: [...(note.tasks || []), newTask]
    });
    setNewTaskText('');
  };

  const toggleTask = (taskId: string) => {
    onUpdate({
      ...note,
      tasks: (note.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    });
  };

  const removeTask = (taskId: string) => {
    onUpdate({
      ...note,
      tasks: (note.tasks || []).filter(t => t.id !== taskId)
    });
  };

  return (
    <Rnd
      size={{ width: note.width, height: note.height }}
      position={{ x: note.position_x, y: note.position_y }}
      scale={scale}
      onDragStop={(e, d) => onUpdate({ ...note, position_x: d.x, position_y: d.y })}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate({
          ...note,
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position
        });
      }}
      onMouseDown={() => onFocus?.()}
      cancel="input, textarea, button, .no-drag"
      className={`pointer-events-auto transition-shadow duration-300 ${isFocused ? 'z-[2001] drop-shadow-3xl ring-2 ring-purple-500/30' : 'z-[2000] drop-shadow-2xl'}`}
      enableResizing={{
        bottom: true, bottomRight: true, right: true, 
        top: true, topLeft: true, topRight: true, 
        left: true, bottomLeft: true
      }}
    >
      <div 
        className={`w-full h-full flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 group shadow-2xl backdrop-blur-sm pointer-events-auto cursor-grab active:cursor-grabbing ${isFocused ? 'border-purple-400' : 'border-black/10'}`}
        style={{ backgroundColor: note.color }}
      >
        <div className="h-12 flex items-center justify-between px-4 bg-black/5 hover:bg-black/10 transition-colors shrink-0 border-b border-black/5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripHorizontal size={14} className="text-black/40 shrink-0" />
            <input 
                value={note.title || ""}
                onChange={(e) => onUpdate({ ...note, title: e.target.value })}
                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-black/60 w-full p-0 h-auto placeholder:text-black/20 no-drag"
                placeholder="STUDIO NOTE"
            />
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-black/40 no-drag"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5 no-drag cursor-default">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 opacity-30">
                <Type size={10} className="text-black" />
                <span className="text-[8px] font-black uppercase tracking-widest text-black">Note Text</span>
            </div>
            <textarea
                value={note.text}
                onChange={(e) => onUpdate({ ...note, text: e.target.value })}
                className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-medium text-black/70 placeholder:text-black/20 resize-none h-auto min-h-[1.5rem] leading-snug no-drag cursor-text"
                placeholder="Write your thoughts..."
            />
          </div>

          <div className="relative group/img no-drag">
            {note.src ? (
              <div 
                className="relative rounded-xl overflow-hidden border border-black/5 bg-white/40 shadow-sm transition-all h-auto max-h-[300px]"
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                style={{ cursor: imgZoom > 1 ? 'grab' : 'default' }}
              >
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                  style={{ 
                    transform: `scale(${imgZoom}) translate(${imgOffset.x / imgZoom}px, ${imgOffset.y / imgZoom}px)`,
                  }}
                >
                  <img 
                    src={note.src} 
                    className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none select-none" 
                  />
                </div>
                
                {/* Overlay Controls */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-between pointer-events-none">
                    <div className="flex gap-1 pointer-events-auto">
                        <button 
                          onClick={() => setImgZoom(prev => Math.max(1, prev - 0.25))}
                          className="p-1.5 bg-white/80 hover:bg-white text-black rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                          <Minus size={10} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => { setImgZoom(1); setImgOffset({ x: 0, y: 0 }); }}
                          className="px-2 py-1 bg-white/80 hover:bg-white text-black text-[8px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => setImgZoom(prev => Math.min(4, prev + 0.25))}
                          className="p-1.5 bg-white/80 hover:bg-white text-black rounded-lg shadow-lg active:scale-95 transition-all"
                        >
                          <Plus size={10} strokeWidth={3} />
                        </button>
                    </div>
                    <button 
                      onClick={() => onUpdate({ ...note, src: undefined })}
                      className="p-1.5 bg-white/80 hover:bg-red-500 hover:text-white text-red-600 rounded-lg shadow-lg active:scale-95 transition-all pointer-events-auto"
                    >
                      <Trash2 size={10} />
                    </button>
                </div>

                {imgZoom > 1 && (
                  <div className="absolute top-2 left-2 p-1 bg-black/40 rounded text-white/80 pointer-events-none">
                    <Move size={10} />
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-12 border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-black/20 hover:bg-black/5 transition-all text-black/40 hover:text-black/70 group"
              >
                <div className="p-4 bg-black/5 rounded-full group-hover:bg-black/10 transition-all">
                    <ImageIcon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Upload Content</span>
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>

          <div className="space-y-4 pt-3 border-t border-black/5 no-drag">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Tasks</span>
              <div className="px-2 py-0.5 bg-black/5 rounded-full text-[8px] font-mono text-black/40">
                {(note.tasks || []).filter(t => t.completed).length}/{(note.tasks || []).length}
              </div>
            </div>
            
            <div className="space-y-2">
              {(note.tasks || []).map(task => (
                <div key={task.id} className="flex items-center gap-3 group/task p-2 bg-black/5 rounded-xl border border-transparent hover:border-black/5 hover:bg-black/10 transition-all">
                  <button onClick={() => toggleTask(task.id)} className="shrink-0 transition-transform active:scale-90">
                    {task.completed ? (
                        <div className="w-4 h-4 bg-green-500 rounded-md flex items-center justify-center shadow-lg shadow-green-500/20">
                            <Check size={12} className="text-white" strokeWidth={4} />
                        </div>
                    ) : (
                        <div className="w-4 h-4 border-2 border-black/20 rounded-md bg-white/50" />
                    )}
                  </button>
                  <span className={`flex-1 text-[11px] font-medium leading-tight ${task.completed ? 'line-through text-black/30' : 'text-black/70'}`}>
                    {task.text}
                  </span>
                  <button onClick={() => removeTask(task.id)} className="opacity-0 group-hover/task:opacity-100 p-1.5 hover:text-red-500 rounded-lg transition-all text-black/30">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2 pb-2">
              <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="New task..."
                  className="flex-1 bg-black/5 border-none rounded-xl px-4 py-2 text-[11px] font-medium text-black/70 focus:ring-2 focus:ring-black/10 placeholder:text-black/20 no-drag"
              />
              <button 
                onClick={addTask} 
                className="px-3 bg-black/10 hover:bg-black/20 text-black/60 rounded-xl transition-all active:scale-95 shadow-sm no-drag"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-6 h-6 flex items-end justify-end p-1 pointer-events-none opacity-20">
           <div className="w-0.5 h-0.5 bg-black rounded-full m-0.5" />
           <div className="w-0.5 h-0.5 bg-black rounded-full m-0.5" />
           <div className="w-0.5 h-0.5 bg-black rounded-full m-0.5" />
        </div>
      </div>
    </Rnd>
  );
};
