import React, { useRef, useEffect, useState } from 'react';
import { 
    Send, Sparkles, Bot, Trash2, Zap, Loader2, User,
    Paperclip, X, Image as ImageIcon, FileText, ChevronUp, ChevronDown,
    Layout, Palette, Type, MousePointer2, Command, Lightbulb, ExternalLink, Globe,
    Copy, Check, File
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface AssistantPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  isLoading: boolean;
  onClear: () => void;
  attachments: {file: File, url: string}[];
  setAttachments: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  variant?: 'light' | 'dark';
}

// --- UPDATED TEXT CLEANING UTILITY ---
const cleanNeuralText = (text: string) => {
  return text
    .replace(/###/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/> /g, '')
    .replace(/>/g, '')
    .trim();
};

const AttachmentPreview: React.FC<{ url: string }> = ({ url }) => {
    const [isImage, setIsImage] = useState(true);

    return (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg bg-black/5 flex items-center justify-center">
            {isImage ? (
                <img 
                    src={url} 
                    className="w-full h-full object-cover" 
                    alt="Attachment" 
                    onError={() => setIsImage(false)} 
                />
            ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <File size={24} className="mb-1" />
                    <span className="text-[6px] font-bold uppercase tracking-wider">FILE</span>
                </div>
            )}
        </div>
    );
};

const MessageBubble: React.FC<{ msg: any, i: number, variant: 'light' | 'dark' }> = ({ msg, i, variant }) => {
    const [copied, setCopied] = useState(false);
    const isDark = variant === 'dark';

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const userBubbleClass = isDark 
        ? 'bg-indigo-600 text-white rounded-tr-none border border-indigo-500 selection:bg-white/30' 
        : 'bg-slate-900 text-white rounded-tr-none selection:bg-white/30';
        
    const modelBubbleClass = isDark
        ? 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none whitespace-pre-wrap selection:bg-indigo-500/30'
        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none ring-4 ring-indigo-500/5 whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900';

    return (
        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300 group`}>
            <div className="flex items-center gap-2 mb-1 px-1">
                {msg.role === 'model' && <Bot size={9} className="text-indigo-500" />}
                <span className={`text-[6px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>
                    {msg.role === 'user' ? 'Direct Input' : 'Neural Core'}
                </span>
                {msg.role === 'user' && <User size={9} className={isDark ? 'text-slate-500' : 'text-slate-400'} />}
            </div>
            <div className={`max-w-[90%] flex flex-col gap-2 relative`}>
                <div 
                    className={`px-4 py-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm select-text cursor-text pointer-events-auto ${msg.role === 'user' ? userBubbleClass : modelBubbleClass}`}
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {/* User Attachment Preview */}
                    {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {msg.attachments.map((url: string, idx: number) => (
                                <AttachmentPreview key={idx} url={url} />
                            ))}
                        </div>
                    )}

                    {/* Cleaned Neural Text */}
                    {msg.role === 'model' ? cleanNeuralText(msg.text) : msg.text}

                    {msg.role === 'model' && (
                        <button 
                            onClick={handleCopy}
                            className={`absolute -right-8 top-0 p-1.5 rounded-lg shadow-sm transition-all opacity-0 group-hover:opacity-100 z-10 ${isDark ? 'bg-white/10 border border-white/10 text-slate-400 hover:text-white' : 'bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                            title="Salin Respon"
                        >
                            {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                        </button>
                    )}
                </div>
                
                {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1 px-2">
                        <div className={`flex items-center gap-1.5 text-[7px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            <Globe size={10} /> Neural Knowledge Grounding
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {msg.sources.map((chunk: any, sIdx: number) => {
                                const web = chunk.web;
                                if (!web) return null;
                                return (
                                    <a 
                                        key={sIdx} 
                                        href={web.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-1 px-2 py-1 border rounded-lg transition-all text-[8px] font-bold uppercase ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-600'}`}
                                    >
                                        <span className="max-w-[150px] truncate">{web.title || 'Source'}</span>
                                        <ExternalLink size={8} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ 
    messages = [], 
    input = "", 
    setInput = (_v: string) => {}, 
    onSend = (_text?: string) => {}, 
    isLoading = false, 
    onClear = () => {}, 
    attachments = [], 
    setAttachments = (_v: any) => {},
    variant = 'light'
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isDark = variant === 'dark';

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, attachments]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim() || (attachments && attachments.length > 0)) {
                onSend();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newAttachments = files.map((file: File) => ({
                file,
                url: URL.createObjectURL(file)
            }));
            setAttachments(prev => [...(prev || []), ...newAttachments].slice(0, 5));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (idx: number) => {
        setAttachments(prev => (prev || []).filter((_, i) => i !== idx));
    };

    const SUGGESTIONS = [
        { text: "Logika komposisi desain modern", icon: <Layout size={10} /> },
        { text: "Warna yang memicu psikologi produktivitas", icon: <Palette size={10} /> },
        { text: "Tren teknologi kreatif 2025", icon: <Globe size={10} /> },
        { text: "Saran tipografi untuk audiens global", icon: <Type size={10} /> }
    ];

    const containerClass = isDark ? 'bg-[#050505] text-white' : 'bg-white text-slate-900';
    const scrollAreaClass = isDark ? 'bg-indigo-900/5' : 'bg-slate-50/20';
    const borderClass = isDark ? 'border-white/10' : 'border-slate-50';
    const bottomBarClass = isDark ? 'bg-[#0a0a0a]' : 'bg-white';
    const inputAreaClass = isDark ? 'bg-white/5 border-white/10 focus-within:border-indigo-500/50 focus-within:bg-black' : 'bg-slate-50 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:shadow-xl';
    const suggestionBtnClass = isDark ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 shadow-sm';
    const iconColorClass = isDark ? 'text-indigo-400' : 'text-indigo-200';
    const placeholderColorClass = isDark ? 'placeholder:text-slate-500 text-slate-200' : 'placeholder:text-slate-300 text-slate-800';

    return (
        <div className={`flex flex-col h-full overflow-hidden relative ${containerClass}`}>
            <div ref={scrollRef} className={`flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 select-text cursor-text ${scrollAreaClass}`} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {(messages || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center animate-pulse shadow-inner ${isDark ? 'bg-white/5 text-indigo-400' : 'bg-indigo-50 text-indigo-200'}`}>
                            <Sparkles size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className={`text-xs font-black uppercase tracking-[0.2em] text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>MULAI KOLABORASI NEURAL</h3>
                            <p className={`text-[9px] font-medium leading-relaxed uppercase max-w-[200px] mx-auto text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Tanyakan saran desain atau kontrol antarmuka melalui teks.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 w-full pt-2">
                            {SUGGESTIONS.map((s, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => onSend(s.text)}
                                    className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group ${suggestionBtnClass}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`${iconColorClass} group-hover:text-indigo-500 transition-colors`}>{s.icon}</div>
                                        {s.text}
                                    </div>
                                    <Zap size={8} className="opacity-0 group-hover:opacity-100 text-indigo-400" fill="currentColor" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(messages || []).map((msg, i) => (
                    <MessageBubble key={i} msg={msg} i={i} variant={variant} />
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 animate-pulse select-none">
                        <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[6px] font-black uppercase tracking-widest text-indigo-500">Menganalisis...</span>
                            <Loader2 size={9} className="text-indigo-500 animate-spin" />
                        </div>
                        <div className={`w-12 h-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-indigo-100/30'}`} />
                    </div>
                )}
            </div>

            <div className={`p-4 pb-8 border-t space-y-3 ${bottomBarClass} ${borderClass}`}>
                {(attachments || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                        {attachments.map((at, idx) => (
                            <div key={idx} className={`relative w-12 h-12 rounded-lg overflow-hidden border shadow-sm group flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                {at.file.type.startsWith('image/') ? (
                                    <img src={at.url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FileText size={14} />
                                        <span className="text-[6px] font-bold uppercase mt-0.5">{at.file.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                                    </div>
                                )}
                                <button 
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className={`relative flex flex-col gap-2 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`flex items-end gap-2 border rounded-[1.5rem] p-1.5 transition-all ${inputAreaClass}`}>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all shrink-0 active:scale-90 ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                            title="Attach File (All Formats Supported)"
                        >
                            <Paperclip size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                        <textarea 
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Tanyakan Asisten Neural..."
                            className={`flex-1 bg-transparent border-none focus:ring-0 text-[12px] py-2.5 resize-none min-h-[40px] max-h-[120px] leading-relaxed font-medium ${placeholderColorClass}`}
                        />
                        <button 
                            onClick={() => onSend()}
                            disabled={isLoading || (!input.trim() && (attachments || []).length === 0)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 shrink-0 ${(!input.trim() && (attachments || []).length === 0) ? (isDark ? 'bg-white/10 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed') : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                    <div className="flex items-center justify-between px-2 select-none">
                        <div className="flex items-center gap-1.5">
                            <Command size={9} className="text-slate-300" />
                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Neural Link v3.4</span>
                        </div>
                        <button onClick={onClear} className="text-[6px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors">
                            <Trash2 size={7} /> Reset Feed
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};