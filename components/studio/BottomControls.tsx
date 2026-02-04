
import React from 'react';
import { 
  Send, Paperclip, MessageSquare, Sparkles, Wand2, Zap, 
  Layers, Sliders, Layout, Square, Palette, Search,
  Terminal, Monitor, Box, Smartphone, MousePointer2,
  ChevronUp, Trash2, Eye, EyeOff, Bot, ExternalLink, Globe, Loader2
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { AssistantPanel } from '../editor/AssistantPanel';

interface BottomControlsProps {
  height: number;
  aiPanelWidth: number;
  showAiPanel: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  chatAttachments: {file: File, url: string}[];
  setChatAttachments?: React.Dispatch<React.SetStateAction<{file: File, url: string}[]>>;
  isChatLoading: boolean;
  handleSendMessage: (text?: string) => void;
  handleNewChat: () => void;
  handleChatFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (i: number) => void;
  chatFileRef: React.RefObject<HTMLInputElement>;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  setIsResizing: (v: 'ai-panel' | 'bottom' | null) => void;
  promptText: string;
  setPromptText: (v: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  handleStopGeneration: () => void;
  showGenerateControl: boolean;
  mode: string;
  setMode: (m: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  handleScan: () => void;
  isScanning: boolean;
  originalImage: string | null;
  presetsPanelWidth: number;
  presetData: any;
  appendTag: (t: string) => void;
  isCompareMode: boolean;
  setIsCompareMode: (v: boolean) => void;
  hasGeneratedResults: boolean;
  onRefinePrompt: () => void;
  isRefining: boolean;
  isSmartAssistantActive: boolean;
  toggleSmartAssistant: () => void;
  onCaptureContext: () => void;
  groundingSources?: any[];
}

export const BottomControls: React.FC<BottomControlsProps> = (props) => {
  const { 
    height, aiPanelWidth, showAiPanel, chatMessages, chatInput, setChatInput, isChatLoading, 
    handleSendMessage, handleNewChat, handleChatFileUpload, chatFileRef, chatScrollRef,
    promptText, setPromptText, isGenerating, handleGenerate, mode, setMode,
    presetData, appendTag, onRefinePrompt, isRefining, onCaptureContext,
    groundingSources = [], chatAttachments, setChatAttachments
  } = props;

  return (
    <div className="bg-black border-t border-white/10 shrink-0 flex overflow-hidden z-40 relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" style={{ height }}>
      
      {/* AI CHAT PANEL - Integrated AssistantPanel */}
      {showAiPanel && (
          <div className="h-full border-r border-white/5 flex flex-col bg-[#050505] relative overflow-hidden transition-all duration-300 ease-in-out" style={{ width: aiPanelWidth }}>
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between shrink-0 bg-black/40">
               <div className="flex items-center gap-2">
                  <Bot size={14} className="text-purple-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Neural Assistant</span>
               </div>
               <button onClick={onCaptureContext} className="p-1.5 text-slate-500 hover:text-white transition-all bg-white/5 rounded-lg border border-white/5" title="Capture Canvas Context">
                  <Eye size={12} />
               </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <AssistantPanel 
                    messages={chatMessages}
                    input={chatInput}
                    setInput={setChatInput}
                    onSend={handleSendMessage}
                    isLoading={isChatLoading}
                    onClear={handleNewChat}
                    attachments={chatAttachments}
                    setAttachments={setChatAttachments || (() => {})}
                    variant="dark"
                />
            </div>
          </div>
      )}

      {/* GENERATION ENGINE */}
      <div className="flex-1 h-full flex flex-col bg-black">
        <div className="flex-1 flex overflow-hidden">
          
          {/* PROMPT PANEL */}
          <div className="flex-1 flex flex-col p-6 space-y-5">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Terminal size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Prompt Engine</span>
                    <span className="text-[7px] font-bold text-slate-600 uppercase">Construct your visual logic</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={onRefinePrompt} disabled={isRefining || !promptText} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-all disabled:opacity-30">
                      {isRefining ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Refine
                   </button>
                </div>
             </div>

             <div className="relative flex-1 group">
                <textarea 
                  value={promptText} 
                  onChange={(e) => setPromptText(e.target.value)}
                  className="w-full h-full bg-white/5 border border-white/5 rounded-3xl p-6 text-sm font-medium text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/30 focus:bg-indigo-500/5 transition-all resize-none shadow-inner"
                  placeholder="Describe your creative vision in detail... e.g. 'Athletic model wearing futuristic carbon-fiber running gear, cinematic neon stadium lighting, 8k resolution...'"
                />
                <div className="absolute bottom-6 right-6 flex items-center gap-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                   <div className="flex bg-black/60 backdrop-blur-md rounded-full border border-white/10 p-1">
                      {['Txt2Img', 'Img2Img', 'Inpaint'].map(m => (
                        <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{m}</button>
                      ))}
                   </div>
                   <button onClick={handleGenerate} disabled={isGenerating || !promptText} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-30">
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="white" />}
                      <span>{isGenerating ? 'Synthesizing' : 'Generate'}</span>
                   </button>
                </div>
             </div>

             {/* Grounding Sources (Required for Search) */}
             {groundingSources.length > 0 && (
               <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    <Globe size={10} /> Neural Knowledge Grounding
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groundingSources.map((chunk, idx) => {
                      const web = chunk.web;
                      if (!web) return null;
                      return (
                        <a key={idx} href={web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all">
                          <span className="text-[7px] font-bold text-indigo-300 uppercase truncate max-w-[120px]">{web.title || 'Source'}</span>
                          <ExternalLink size={8} className="text-indigo-400" />
                        </a>
                      );
                    })}
                  </div>
               </div>
             )}
          </div>

          {/* STYLE PRESETS */}
          <div className="w-[320px] h-full border-l border-white/5 p-6 space-y-6 overflow-y-auto custom-scrollbar bg-black/40">
             <div className="flex items-center gap-2 text-slate-500">
               <Palette size={14} />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Style Nodes</span>
             </div>
             
             <div className="space-y-6">
                {Object.entries(presetData).map(([category, items]: [string, any]) => (
                  <div key={category} className="space-y-3">
                    <h5 className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{category}</h5>
                    <div className="flex flex-wrap gap-1.5">
                       {items.map((item: any) => (
                         <button 
                          key={item.label} 
                          onClick={() => appendTag(item.value)}
                          className="px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[8px] font-bold text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                         >
                           {item.label}
                         </button>
                       ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>

    </div>
  );
};
