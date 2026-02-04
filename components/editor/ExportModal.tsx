
import React, { useState } from 'react';
import { X, Download, ShieldCheck, Zap, Monitor, Loader2, FileArchive, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { AppConfig } from '../../types';
import { exportArtboard, downloadBlob, exportAllArtboards, ExportQuality } from '../../services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: AppConfig;
  allPages: AppConfig[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, activePage, allPages }) => {
  const [quality, setQuality] = useState<ExportQuality>('HD');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handler for Single Export
  const handleSingleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setStatus("INITIALIZING RENDER ENGINE...");
    
    try {
      // 1. Wait for DOM & Fonts
      setStatus("SYNCING ASSETS...");
      await new Promise(r => setTimeout(r, 500)); // UI Feedback delay

      const domId = `canvas-export-${activePage.id}`;
      setStatus("PROCESSING LAYERS & GLASS...");
      
      // 2. Call the heavy export function
      const dataUrl = await exportArtboard(domId, activePage.name, activePage, { quality, format: 'png' });
      
      // 3. Trigger Download
      // REQUIRMENT: Filename follows Canvas Name ONLY (Project Name removed)
      const cleanPageName = activePage.name.trim().replace(/\s+/g, '_') || 'ARTBOARD';
      const fileName = `${cleanPageName}_${quality}.png`;
      
      downloadBlob(dataUrl, fileName);
      
      setProgress(100);
      setStatus("EXPORT SUCCESS");
      setTimeout(onClose, 1000);
    } catch (e) {
      console.error(e);
      setStatus("RENDER FAILED");
      alert("Export Failed. Please check console for details (CORS or Memory Issue).");
    } finally {
      setIsExporting(false);
    }
  };

  // Handler for Batch Export (ZIP)
  const handleBatchExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setStatus("COMPILING MULTI-PAGE ARCHIVE...");
    try {
      // Pass the project name for the ZIP filename
      await exportAllArtboards(allPages, activePage.projectName, { 
        quality, 
        format: 'png', 
        onProgress: (p) => {
            setProgress(p);
            setStatus(`RENDERING BOARD ${Math.ceil((p/100) * allPages.length)}/${allPages.length}`);
        } 
      });
      setStatus("ARCHIVE DEPLOYED");
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error(e);
      alert("Batch Export Failed. Some artboards may be too large.");
    } finally {
      setIsExporting(false);
    }
  };

  const qualities: { id: ExportQuality; label: string; desc: string; icon: any }[] = [
    { id: 'SD', label: '720p Social', desc: 'Fast, Social Ready', icon: <ImageIcon size={14}/> },
    { id: 'HD', label: '1080p Standard', desc: 'Clear Professional', icon: <Monitor size={14}/> },
    { id: '4K', label: '4K Ultra HD', desc: 'Ultra High Detail', icon: <Zap size={14}/> },
    { id: '8K', label: '8K Quantum UHD', desc: 'Master Performance', icon: <Sparkles size={14}/> },
  ];

  return (
    <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <Download size={20} strokeWidth={3} />
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-black text-white uppercase tracking-[0.2em]">Master Export Engine</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">UHD Quantum Rendering Protocol</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-8">
            <div className="space-y-3">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Select Output Quality</span>
               <div className="grid grid-cols-2 gap-3">
                  {qualities.map((q) => (
                    <button 
                      key={q.id}
                      onClick={() => setQuality(q.id)}
                      className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all text-left group ${quality === q.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >
                       <div className="flex items-center justify-between">
                          {q.icon}
                          {quality === q.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                       </div>
                       <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${quality === q.id ? 'text-white' : 'text-slate-200'}`}>{q.label}</span>
                          <span className="text-[8px] font-medium opacity-60">{q.desc}</span>
                       </div>
                    </button>
                  ))}
               </div>
            </div>

            {isExporting ? (
               <div className="py-6 space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center justify-center text-center gap-4">
                     <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Loader2 size={24} className="text-indigo-400 animate-pulse" />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] block">{status}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Progress: {progress}%</span>
                     </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
               </div>
            ) : (
               <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleSingleExport}
                    className="flex-1 py-5 bg-white text-black rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
                  >
                     <ImageIcon size={16} /> CURRENT BOARD
                  </button>
                  <button 
                    onClick={handleBatchExport}
                    className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all active:scale-95 shadow-xl shadow-indigo-900/20"
                  >
                     <FileArchive size={16} /> ALL BOARDS (ZIP)
                  </button>
               </div>
            )}
        </div>

        <div className="px-8 py-5 bg-black/50 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-green-500" />
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Verified Neural Assets</span>
           </div>
           <span className="text-[8px] font-mono text-slate-600">RENDER ENGINE STABLE v3.2</span>
        </div>
      </div>
    </div>
  );
};
