
import React, { useState, useEffect } from 'react';
import { 
  X, Zap, Layout, ArrowRight, Check, Loader2, 
  Sparkles, Globe, ShieldCheck, Monitor, Smartphone,
  RectangleHorizontal, Square, Maximize, Target, FileText
} from 'lucide-react';
import { ASPECT_RATIOS } from '../../constants';

interface NewProjectFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string, description: string, ratio: string, width: number, height: number }) => void;
}

export const NewProjectFlow: React.FC<NewProjectFlowProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setName("");
      setDescription("");
      setIsInitializing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsInitializing(true);
    // Simulasi Neural Handshake dipercepat menjadi 400ms agar user tidak menunggu lama
    await new Promise(r => setTimeout(r, 400));
    
    const ratioData = ASPECT_RATIOS.find(r => r.value === selectedRatio) || ASPECT_RATIOS[0];
    onConfirm({
      name: name || "Untitled Genesis",
      description: description || "",
      ratio: selectedRatio,
      width: ratioData.width,
      height: ratioData.height
    });
  };

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-end overflow-hidden pointer-events-auto">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-700 pointer-events-auto"
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-[480px] h-full bg-white shadow-[-40px_0_80px_rgba(0,0,0,0.1)] border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex gap-1 px-1">
            {[1, 2, 3].map(i => (
                <div key={i} className={`flex-1 h-full rounded-full transition-all duration-700 ${step >= i ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            ))}
        </div>

        <div className="px-10 py-12 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
                <Zap size={20} fill="white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-black uppercase tracking-widest text-slate-900">Genesis Flow</span>
                <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-[0.3em]">Project Initialization</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all">
                <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="flex-1 space-y-12">
            {step === 1 && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">Mulai dari <br/><span className="text-indigo-600">Visi Kreatif.</span></h2>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-loose">Berikan identitas unik untuk project baru Anda agar Gemini dapat mengenali konteks desain.</p>
                </div>
                
                <div className="space-y-6">
                   <div className="space-y-4 relative z-10">
                       <div className="flex items-center gap-2 px-1">
                          <Target size={12} className="text-indigo-500" />
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Project Identity</label>
                       </div>
                       <input 
                        autoFocus
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Summer Sport Collection 2025"
                        className="w-full bg-slate-50 border-b-2 border-slate-100 focus:border-indigo-600 px-1 py-3 text-lg font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300"
                       />
                   </div>

                   <div className="space-y-4 relative z-10">
                       <div className="flex items-center gap-2 px-1">
                          <FileText size={12} className="text-indigo-500" />
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Description (Optional)</label>
                       </div>
                       <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Deskripsi singkat tentang koleksi atau tema desain..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none h-24 placeholder:text-slate-300"
                       />
                   </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">Konfigurasi <br/><span className="text-indigo-600">Geometri.</span></h2>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest leading-loose">Pilih kanvas yang sesuai dengan target distribusi visual Anda.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {ASPECT_RATIOS.map(r => (
                    <button 
                      key={r.value}
                      onClick={() => setSelectedRatio(r.value)}
                      className={`group p-6 rounded-[2rem] border-2 transition-all text-left space-y-4 ${selectedRatio === r.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl scale-105' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedRatio === r.value ? 'bg-white text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50'}`}>
                        {r.value === '1:1' && <Square size={20} />}
                        {r.value === '4:5' && <Layout size={20} />}
                        {r.value === '9:16' && <Smartphone size={20} />}
                        {r.value === '16:9' && <Monitor size={20} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black uppercase tracking-widest">{r.label}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedRatio === r.value ? 'text-indigo-200' : 'text-slate-400'}`}>{r.width}x{r.height}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-700">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-2xl animate-bounce">
                        <Globe size={40} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg animate-pulse">
                        <Check size={16} strokeWidth={4} />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">Neural Propagation <br/><span className="text-indigo-600">Active.</span></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">Sistem sedang melakukan sinkronisasi state awal ke Gemini Cloud Registry.</p>
                  </div>

                  <div className="w-full max-w-[200px] p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                     <Loader2 size={16} className="animate-spin text-indigo-500" />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Handshake 200 OK</span>
                  </div>
              </div>
            )}
          </div>

          <div className="pt-10 flex gap-4 mt-auto">
            {step > 1 && !isInitializing && (
                <button 
                  onClick={() => setStep(s => s - 1)}
                  className="px-8 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                    Back
                </button>
            )}
            
            {!isInitializing ? (
                <button 
                    disabled={step === 1 && !name.trim()}
                    onClick={() => {
                        if (step < 2) setStep(s => s + 1);
                        else { setStep(3); handleFinish(); }
                    }}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-30 group"
                >
                    {step === 1 ? 'Next Step' : 'Initialize Artboard'}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            ) : (
                <div className="flex-1 py-5 bg-indigo-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl">
                    <Loader2 size={18} className="animate-spin" />
                    Neural Connecting...
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
