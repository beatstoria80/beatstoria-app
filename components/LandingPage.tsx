import React, { useEffect, useState, useRef } from 'react';
import { 
  Zap, Layout, Wand2, ArrowRight, History, Clock, Monitor, Sparkles, 
  Trophy, Dumbbell, Flame, Scissors, Bandage, Film, Clapperboard, 
  Cpu, Box, Target, Layers, MousePointer2, BookOpen
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onOpenAiStudio?: () => void;
  onLoadProject: (id: string) => void;
  // New specific navigation callbacks
  onOpenCooking?: () => void;
  onOpenTitanFill?: () => void;
  onOpenPurgeBg?: () => void;
  onOpenRetouch?: () => void;
  onOpenStory?: () => void;
  onOpenNoteLM?: () => void;
}

// Custom Tungku (Furnace) Icon to match user reference image
const TungkuIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 8C5 6.89543 5.89543 6 7 6H17C18.1046 6 19 6.89543 19 8V9H5V8Z" fill="currentColor"/>
    <path d="M6 10H18V12C18 14.7614 15.7614 17 13 17H11C8.23858 17 6 14.7614 6 12V10Z" fill="currentColor"/>
    <path d="M9 17L7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 17L17 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 4H16V5C16 5.55228 15.5523 6 15 6H9C8.44772 6 8 5.55228 8 5V4Z" fill="currentColor"/>
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ 
    onStart, 
    onOpenAiStudio, 
    onLoadProject,
    onOpenCooking,
    onOpenTitanFill,
    onOpenPurgeBg,
    onOpenRetouch,
    onOpenStory,
    onOpenNoteLM
}) => {
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  
  const scrollStartRef = useRef({ y: 0, scrollTop: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('space_studio_library');
    if (saved) {
      try {
        setRecentProjects(JSON.parse(saved).slice(0, 3));
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Update custom cursor position
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Handle Drag Scroll Logic
      if (isDraggingScroll && containerRef.current) {
        const dy = e.clientY - scrollStartRef.current.y;
        containerRef.current.scrollTop = scrollStartRef.current.scrollTop - dy;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingScroll(false);
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScroll]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger drag scroll if clicking the background, not buttons/links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    setIsDraggingScroll(true);
    document.body.style.userSelect = 'none'; // Prevent accidental text selection
    
    if (containerRef.current) {
      scrollStartRef.current = {
        y: e.clientY,
        scrollTop: containerRef.current.scrollTop
      };
    }
  };

  const features = [
    { 
      id: 'canvas', 
      label: 'Space Canvas', 
      desc: 'MASTER VISUAL INTERFACE', 
      icon: <Layout size={24} />, 
      color: 'bg-indigo-600', 
      onClick: onStart 
    },
    { 
      id: 'notelm', 
      label: 'Space NoteLM', 
      desc: 'AI STUDY & RESEARCH HUB', 
      icon: <BookOpen size={24} />, 
      color: 'bg-slate-700', 
      onClick: onOpenNoteLM || onStart 
    },
    { 
      id: 'cooking', 
      label: 'Space Cooking', 
      desc: 'AI ASSET GENERATION LAB', 
      icon: <Flame size={24} />, 
      color: 'bg-orange-600', 
      onClick: onOpenCooking || onOpenAiStudio 
    },
    { 
      id: 'titan', 
      label: 'Titan Fill', 
      desc: 'GENERATIVE INPAINTING PRO', 
      icon: <Wand2 size={24} />, 
      color: 'bg-purple-600', 
      onClick: onOpenTitanFill 
    },
    { 
      id: 'purge', 
      label: 'Purge BG', 
      desc: 'AI BACKGROUND EXTRACTION', 
      icon: <Scissors size={24} />, 
      color: 'bg-rose-600', 
      onClick: onOpenPurgeBg 
    },
    { 
      id: 'retouch', 
      label: 'Neural Retouch', 
      desc: 'ULTRA-HD TEXTURE HEALING', 
      icon: <Bandage size={24} />, 
      color: 'bg-emerald-600', 
      onClick: onOpenRetouch 
    }
  ];

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={`fixed inset-0 z-[200] bg-black text-white font-sans overflow-y-auto custom-scrollbar flex flex-col items-center py-20 px-8 cursor-none scroll-smooth ${isDraggingScroll ? 'active-dragging' : ''}`}
    >
        {/* NEURAL DRAG CURSOR */}
        <div 
          ref={cursorRef}
          className={`fixed top-0 left-0 w-10 h-10 border-2 rounded-full pointer-events-none z-[10000] transition-transform duration-300 ease-out flex items-center justify-center -translate-x-1/2 -translate-y-1/2 mix-blend-difference ${isDraggingScroll ? 'scale-[1.5] border-indigo-500' : isHovering ? 'scale-[2] border-indigo-400' : 'scale-100 border-orange-500'}`}
        >
          <div className={`w-1 h-1 bg-white rounded-full ${isHovering || isDraggingScroll ? 'scale-0' : 'scale-100'}`} />
          {isDraggingScroll && <div className="text-[10px] font-black text-indigo-500 absolute -top-8 uppercase tracking-widest">DRAG</div>}
        </div>
        <div 
          ref={cursorDotRef}
          className={`fixed top-0 left-0 w-1.5 h-1.5 bg-orange-500 rounded-full pointer-events-none z-[10001] -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${isDraggingScroll ? 'bg-indigo-500 scale-150 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : ''}`}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.1)_0%,_transparent_70%)] pointer-events-none fixed"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none fixed"></div>

        <div className="max-w-6xl w-full space-y-24 relative z-10 pointer-events-none">
            {/* BRANDING HEADER */}
            <div className="text-center space-y-10 pointer-events-auto">
                <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-center gap-4">
                        <div 
                          className="relative p-3 bg-orange-500 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.3)] text-black rotate-3 hover:rotate-0 transition-transform cursor-none overflow-visible"
                          onMouseEnter={() => setIsHovering(true)}
                          onMouseLeave={() => setIsHovering(false)}
                        >
                            {/* Smoke Particles */}
                            <div className="smoke-trail" style={{ top: '-10px', left: '20%', animationDelay: '0s' }} />
                            <div className="smoke-trail" style={{ top: '-15px', left: '50%', animationDelay: '0.8s', width: '12px', height: '12px' }} />
                            <div className="smoke-trail" style={{ top: '-8px', left: '70%', animationDelay: '1.5s', width: '7px', height: '7px' }} />
                            
                            <TungkuIcon size={32} className="relative z-10 text-black" />
                        </div>
                        <span className="text-4xl font-black tracking-tighter uppercase text-white">SPACE <span className="text-orange-500">STUDIO</span></span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] -mt-2">BEATSTORIA AI</span>
                </div>

                <div className="space-y-4 max-w-3xl mx-auto">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-indigo-500 animate-shimmer">DREAM ART</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium tracking-wide max-w-2xl mx-auto animate-in fade-in duration-1000 delay-500">
                        High-performance neural design for the modern era. Instant navigation to our full suite of professional creative protocols.
                    </p>
                </div>
            </div>

            {/* FEATURE NAVIGATION GRID */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700 pointer-events-auto">
                <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-4">
                    <Cpu size={16} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">DESIGN SYSTEM INTERFACE NODES</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feat, i) => (
                        <button 
                            key={feat.id}
                            onClick={feat.onClick}
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                            className="group relative flex flex-col items-start p-8 bg-white/5 border border-white/5 rounded-[2.5rem] hover:bg-white/10 hover:border-white/20 transition-all duration-500 text-left active:scale-[0.98] overflow-hidden cursor-none"
                        >
                            {/* Decorative background pulse */}
                            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${feat.color}`} />
                            
                            <div className="relative z-10 w-full flex flex-col gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${feat.color}`}>
                                    {feat.icon}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-orange-400 transition-colors">{feat.label}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        {feat.desc}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-2 group-hover:translate-x-2 transition-transform">
                                    Initialize Protocol <ArrowRight size={14} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="mt-auto py-10 text-[8px] font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse shrink-0 pointer-events-none">
            Neural Design Infrastructure v3.4 Sport Optimized
        </div>
    </div>
  );
};