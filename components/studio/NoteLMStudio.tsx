import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Zap, BookOpen, FileText, Plus, MessageSquare, 
  Play, Download, Trash2, Loader2, Sparkles, 
  ChevronRight, History, Hash, Search, Database, 
  Globe, ShieldCheck, Upload, Book, Headphones, 
  Mic2, Volume2, Pause, RotateCcw, ArrowRight,
  Maximize2, Minimize2, Layout, FileUp, Info, Bot, User,
  VolumeX, AudioWaveform, Volume1, ArrowDown, Copy, Check
} from 'lucide-react';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage } from '../../types';
import { saveNoteDoc, getAllNoteDocs, deleteNoteDoc } from '../../services/storageService';

interface Document {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  type: 'pdf' | 'text' | 'web';
  pageCount?: number;
}

interface PodcastTurn {
  host: 'Alex' | 'Sam';
  text: string;
}

interface NoteLMStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCooking?: () => void;
}

// PDF Extraction Utility
const extractTextFromPDF = async (data: ArrayBuffer): Promise<{ text: string, pageCount: number }> => {
    // @ts-ignore
    const pdfjsLib = window.pdfjsLib;
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = "";
    const pageCount = pdf.numPages;

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `[PAGE ${i}]\n${pageText}\n\n`;
    }

    return { text: fullText, pageCount };
};

// --- TEXT CLEANING UTILITY ---
const cleanNeuralText = (text: string) => {
  return text
    .replace(/###/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/> /g, '')
    .replace(/>/g, '')
    .trim();
};

// --- AUDIO DECODING UTILITIES ---
function decodeBase64ToUint8(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Tombol Copy dengan feedback visual
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white hover:text-indigo-600 ${copied ? 'text-green-500 border-green-500' : 'text-slate-400'}`}
      title="Salin ke Clipboard"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
};

export const NoteLMStudio: React.FC<NoteLMStudioProps> = ({ isOpen, onClose, onOpenCooking }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  
  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPreparingVoice, setIsPreparingVoice] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Podcast State
  const [isSynthesizingPodcast, setIsSynthesizingPodcast] = useState(false);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [podcastScript, setPodcastScript] = useState<PodcastTurn[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(-1);
  
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const loadDocs = async () => {
        try {
            const savedDocs = await getAllNoteDocs();
            setDocuments(savedDocs);
        } catch (e) {
            console.error("Failed to load persistent docs", e);
        }
    };
    if (isOpen) loadDocs();
  }, [isOpen]);

  // --- SCROLL LOGIC ---
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, isLoading]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setShowScrollBottom(!isAtBottom && chatMessages.length > 0);
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessingFile(true);
      
      try {
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          let text = "";
          let pageCount = 1;

          if (isPdf) {
              const arrayBuffer = await file.arrayBuffer();
              const result = await extractTextFromPDF(arrayBuffer);
              text = result.text;
              pageCount = result.pageCount;
          } else {
              text = await file.text();
          }

          const newDoc: Document = {
            id: `doc-${Date.now()}`,
            title: file.name.toUpperCase(),
            content: text,
            timestamp: Date.now(),
            type: isPdf ? 'pdf' : 'text',
            pageCount
          };

          await saveNoteDoc(newDoc);
          setDocuments(prev => [newDoc, ...prev]);
          setActiveDocId(newDoc.id);
      } catch (err) {
          alert("Error processing file.");
      } finally {
          setIsProcessingFile(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("Hapus file?")) return;
      try {
          await deleteNoteDoc(id);
          setDocuments(prev => prev.filter(d => d.id !== id));
          if (activeDocId === id) setActiveDocId(null);
      } catch (err) {
          console.error(err);
      }
  };

  // --- AI VOICE (OPTIMIZED AND DEBUGGED) ---
  const handleSpeak = async (text: string, index: number) => {
    if (isSpeaking || isPreparingVoice) {
        stopAudio();
        if (currentlySpeakingId === index) return;
    }

    // Feedback instan
    setIsPreparingVoice(true);
    setCurrentlySpeakingId(index);

    try {
        // @ts-ignore - Ensure API Key is selected for preview models
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            // @ts-ignore
            await window.aistudio.openSelectKey();
        }

        // Pre-warm Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Bicarakan teks ini dengan tenang dalam Bahasa Indonesia: ${cleanNeuralText(text)}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
                }
                // REMOVED: thinkingConfig (Not supported for TTS modality, causing API failures)
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const audioBuffer = await decodeAudioData(decodeBase64ToUint8(base64Audio), ctx, 24000, 1);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            setIsPreparingVoice(false);
            setIsSpeaking(true);

            source.onended = () => {
                setIsSpeaking(false);
                setCurrentlySpeakingId(null);
            };
            audioSourceRef.current = source;
            source.start();
        } else {
            throw new Error("No audio data returned");
        }
    } catch (e: any) {
        console.error("TTS Fault:", e);
        setIsPreparingVoice(false);
        setIsSpeaking(false);
        setCurrentlySpeakingId(null);
        alert("Gagal memproses suara. Pastikan API Key aktif dan coba lagi.");
    }
  };

  const stopAudio = () => {
      if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch(e) {}
          audioSourceRef.current = null;
      }
      setIsSpeaking(false);
      setIsPreparingVoice(false);
      setCurrentlySpeakingId(null);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput("");
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = documents.map(d => `--- DOC: ${d.title} ---\n${d.content}`).join('\n\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `RESEARCH DATA:\n${context}\n\nUSER QUERY: ${userText}`,
        config: { systemInstruction: "Always respond in Indonesian. Focus on accuracy from documents." }
      });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || "Tidak ada data." }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Koneksi gagal." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePodcast = async () => {
    if (documents.length === 0) return;
    setIsSynthesizingPodcast(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = documents.map(d => d.content).join('\n\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Podcast Alex & Sam Indonesian JSON array host text. Context:\n${context}`,
        config: { responseMimeType: "application/json" }
      });
      const script = JSON.parse(response.text || "[]");
      setPodcastScript(script);
      startPodcastPlayback(script);
    } catch (e) {
        alert("Gagal.");
    } finally {
      setIsSynthesizingPodcast(false);
    }
  };

  const startPodcastPlayback = (script: PodcastTurn[]) => {
      window.speechSynthesis.cancel();
      setIsPlayingPodcast(true);
      playPodcastTurn(0, script);
  };

  const playPodcastTurn = (index: number, script: PodcastTurn[]) => {
      if (index >= script.length) { setIsPlayingPodcast(false); return; }
      const turn = script[index];
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.lang = 'id-ID';
      utterance.onend = () => { if (isPlayingPodcast) playPodcastTurn(index + 1, script); };
      window.speechSynthesis.speak(utterance);
  };

  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[7000] bg-[#050505] text-white flex flex-col font-sans animate-in fade-in duration-500 overflow-hidden">
      
      {/* HEADER */}
      <div className="h-16 border-b border-white/10 bg-black flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <BookOpen size={20} strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-[0.2em]">Space <span className="text-indigo-400">NoteLM</span></span>
                <div className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[7px] font-bold text-indigo-400 uppercase tracking-widest">Persistent Hub</div>
            </div>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Neural Research Infrastructure v3.5</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {isPlayingPodcast ? (
               <button onClick={() => { window.speechSynthesis.cancel(); setIsPlayingPodcast(false); }} className="flex items-center gap-3 px-6 py-2.5 bg-red-600/20 border border-red-500/30 text-red-500 rounded-full font-black text-[10px] uppercase tracking-widest animate-pulse hover:bg-red-600 hover:text-white transition-all">
                  <VolumeX size={14} /> Stop Deep Dive
               </button>
           ) : (
               <button onClick={handleGeneratePodcast} disabled={isSynthesizingPodcast || documents.length === 0} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl disabled:opacity-30 group">
                  {isSynthesizingPodcast ? <Loader2 size={14} className="animate-spin" /> : <AudioWaveform size={14} className="group-hover:animate-bounce" />}
                  Audio Deep Dive (ID)
               </button>
           )}
           <div className="h-8 w-px bg-white/10 mx-2" />
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* SIDEBAR */}
        <div className="w-[400px] bg-[#080808] border-r border-white/5 flex flex-col shrink-0 overflow-hidden relative">
            <div className="p-6 space-y-6 flex flex-col h-full">
                <div className="space-y-4 shrink-0">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Database size={14} className="text-indigo-500" /> Registry</span>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isProcessingFile} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-lg"><Plus size={16} strokeWidth={3} /></button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.pdf" />
                    </div>
                    <div className="relative group">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SEARCH DATABASE..." className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all uppercase tracking-widest" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto studio-scrollbar space-y-3 pr-2 min-h-0">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} onClick={() => setActiveDocId(doc.id)} className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${activeDocId === doc.id ? 'bg-indigo-600/10 border-indigo-500 shadow-xl' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeDocId === doc.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500'}`}>
                                    {doc.type === 'pdf' ? <Book size={18} /> : <FileText size={18} />}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`text-[11px] font-black uppercase tracking-wide truncate ${activeDocId === doc.id ? 'text-white' : 'text-slate-300'}`}>{doc.title}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{doc.type === 'pdf' ? `${doc.pageCount} Pages` : 'Text File'}</span>
                                </div>
                            </div>
                            <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all bg-black/40 rounded-lg"><Trash2 size={12} /></button>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-white/5 shrink-0">
                    <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-3">
                        <ShieldCheck size={16} className="text-green-400" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest">Auto-Registry Active</span>
                            <span className="text-[7px] font-bold text-slate-500 uppercase">Synchronizing with IndexedDB</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* INTELLIGENCE CONSOLE */}
        <div className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden min-h-0">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* FLOATING AUDIO HUB */}
            {(isSpeaking || isPreparingVoice) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-indigo-600 rounded-full pl-6 pr-4 py-2 flex items-center gap-6 shadow-[0_15px_40px_rgba(79,70,229,0.5)] border border-white/20">
                         <div className="flex items-center gap-4">
                             <div className="flex flex-col">
                                 <span className="text-[8px] font-black text-indigo-100 uppercase tracking-widest animate-pulse">
                                     {isPreparingVoice ? 'Neural Link Uplink...' : 'Audio Transmission Active'}
                                 </span>
                                 <span className="text-[6px] font-bold text-indigo-200/60 uppercase">Voice: Kore (Indonesian)</span>
                             </div>
                             <div className="flex gap-1 h-3 items-center">
                                 {isPreparingVoice ? (
                                     <Loader2 size={10} className="animate-spin text-white" />
                                 ) : (
                                     [...Array(6)].map((_, i) => (
                                         <div key={i} className="w-0.5 bg-white rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                                     ))
                                 )}
                             </div>
                         </div>
                         <button onClick={stopAudio} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black transition-all"><VolumeX size={14} /></button>
                    </div>
                </div>
            )}

            {/* MESSAGES */}
            <div ref={chatScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 relative z-10 min-h-0 pb-40" style={{ pointerEvents: 'auto' }}>
                {chatMessages.length === 0 && (
                    <div className="min-h-full flex flex-col items-center justify-center text-center space-y-10 py-20">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-[3rem] bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 animate-pulse"><Sparkles size={48} /></div>
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl"><Zap size={20} fill="white" /></div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-4xl font-black uppercase tracking-tight">Intelligence Console</h3>
                            <p className="text-[12px] font-medium text-slate-500 uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">Gemini 3 Pro synthesis active. <br/> Ask questions based on your repository content.</p>
                        </div>
                    </div>
                )}

                {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500 group/message max-w-full`}>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            {msg.role === 'model' ? <Bot size={10} className="text-indigo-400" /> : <User size={10} className="text-slate-500" />}
                            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-500">{msg.role === 'user' ? 'RESEARCHER' : 'NEURAL CORE'}</span>
                        </div>
                        <div className="flex items-start gap-4 max-w-[95%]">
                            <div 
                                className={`flex-1 p-6 rounded-[2rem] text-[13px] leading-relaxed whitespace-pre-wrap shadow-2xl select-text cursor-text border transition-all pointer-events-auto ${msg.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-[#0a0a0a] border-white/10 text-slate-200 rounded-tl-none hover:border-indigo-500/30'}`}
                                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                            >
                                {msg.role === 'model' ? cleanNeuralText(msg.text) : msg.text}
                            </div>
                            
                            {msg.role === 'model' && (
                                <div className="flex flex-col gap-2 mt-2 opacity-0 group-hover/message:opacity-100 transition-all scale-90 group-hover/message:scale-100 shrink-0">
                                    <button 
                                        onClick={() => handleSpeak(msg.text, i)} 
                                        disabled={isPreparingVoice && currentlySpeakingId === i}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${currentlySpeakingId === i ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20 animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white hover:text-indigo-600'}`} 
                                        title="Baca"
                                    >
                                        {isPreparingVoice && currentlySpeakingId === i ? <Loader2 size={18} className="animate-spin" /> : currentlySpeakingId === i ? <AudioWaveform size={18} /> : <Volume1 size={18} />}
                                    </button>
                                    <CopyButton text={cleanNeuralText(msg.text)} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex flex-col items-start gap-4 animate-pulse py-4">
                        <div className="flex items-center gap-3">
                            <Loader2 size={16} className="animate-spin text-indigo-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Context Synthesis...</span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* FOOTER INPUT */}
            <div className="p-8 border-t border-white/5 bg-black/80 backdrop-blur-2xl shrink-0 z-[70] absolute bottom-0 left-0 right-0">
                <div className="max-w-4xl mx-auto relative group">
                    <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="TANYA SPACE NOTELM..."
                        className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] pl-10 pr-36 py-6 text-[15px] font-medium text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all shadow-2xl placeholder:text-slate-700"
                    />
                    <button onClick={() => handleSendMessage()} disabled={isLoading || !chatInput.trim()} className="absolute right-3 top-3 bottom-3 px-8 bg-indigo-600 hover:bg-indigo-50 text-white rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2 shadow-lg">
                        <span>Analyze</span>
                        <ArrowRight size={16} strokeWidth={4} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};