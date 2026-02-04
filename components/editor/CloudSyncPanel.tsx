
import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudLightning, CloudCheck, Database, 
  RefreshCcw, Smartphone, Monitor, ShieldCheck, 
  History, Globe, Zap, Cpu, Link, Wifi
} from 'lucide-react';
import { AppConfig } from '../../types';

interface CloudSyncPanelProps {
  config: AppConfig;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ config, isSyncing, lastSyncTime }) => {
  const [activeDevices, setActiveDevices] = useState([
    { name: "Main Studio PC", type: "desktop", lastActive: "Just now" },
    { name: "MacBook Pro 16", type: "laptop", lastActive: "2 mins ago" }
  ]);

  return (
    <div className="flex flex-col h-full bg-white animate-fadeIn custom-scrollbar overflow-y-auto pb-32">
        <div className="p-5 space-y-6">
            {/* Sync Integrity Card */}
            <div className="bg-slate-950 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Cloud size={80} />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md border ${isSyncing ? 'bg-indigo-500/20 border-indigo-400 animate-pulse' : 'bg-green-500/20 border-green-400'}`}>
                            {isSyncing ? <CloudLightning size={20} className="text-indigo-400" /> : <CloudCheck size={20} className="text-green-400" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black uppercase tracking-widest">Neural Link</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">{isSyncing ? 'Synchronizing State...' : 'Integrity Verified'}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">
                            <span>Storage Payload</span>
                            <span className="text-white">{(JSON.stringify(config).length / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: isSyncing ? '100%' : '65%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Context */}
            <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                    <Database size={12} className="text-indigo-500" /> Remote Registry
                </label>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-inner">
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-500 uppercase">Registry Status</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[8px] font-black text-slate-900 uppercase">Auto-Save Active</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-500 uppercase">Backend Service</span>
                        <span className="text-[8px] font-black text-indigo-600 uppercase">Gemini Neural Store</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200/50">
                         <p className="text-[7px] text-slate-400 font-medium uppercase tracking-tight leading-relaxed italic">
                            *Setiap perubahan pada kanvas akan disinkronkan secara otomatis ke cloud registry dalam 2 detik setelah aktivitas berhenti.
                         </p>
                    </div>
                </div>
            </div>

            {/* Linked Devices */}
            <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                    <Link size={12} className="text-blue-500" /> Device Handshake
                </label>
                <div className="space-y-2">
                    {activeDevices.map((device, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-all cursor-default group">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                                {device.type === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-slate-800 uppercase truncate tracking-tight">{device.name}</span>
                                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{device.lastActive}</span>
                            </div>
                            <Wifi size={10} className="text-green-500" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Snapshot History */}
            <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                    <History size={12} className="text-purple-500" /> Visual Snapshots
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {[1, 2, 3].map(n => (
                        <button key={n} className="w-full flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 transition-all active:scale-[0.98]">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-500"></div>
                                <span className="text-[8px] font-bold text-slate-600 uppercase">Version 1.{n}.0</span>
                            </div>
                            <span className="text-[7px] font-mono text-slate-400">12:45 PM</span>
                        </button>
                    ))}
                </div>
            </div>

            <button className="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl mt-4">
                <Globe size={14} /> Global Sync Force
            </button>
        </div>
    </div>
  );
};
