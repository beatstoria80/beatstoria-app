
import React from 'react';
import { Flame, Compass, Star, TrendingUp } from 'lucide-react';

interface NewsFeedProps {
  width: number;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ width }) => {
  return (
    <div className="h-full bg-[#080808] border-r border-white/5 flex flex-col overflow-hidden transition-all shrink-0" style={{ width }}>
      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar h-full">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Flame size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inspiration Feed</span>
          </div>
          
          <div className="space-y-3">
             {[
               { title: "Cyber-Sport Aesthetics", tag: "TRENDING", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80" },
               { title: "Minimalist Performance", tag: "FEATURED", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80" }
             ].map((item, i) => (
               <div key={i} className="group relative aspect-video rounded-xl border border-white/5 overflow-hidden cursor-pointer hover:border-purple-500/50 transition-all">
                  <img src={item.img} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-[7px] font-black text-purple-400 mb-1 block">{item.tag}</span>
                    <h4 className="text-[10px] font-bold text-white group-hover:text-purple-200 transition-colors">{item.title}</h4>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
           <div className="flex items-center gap-2 text-blue-400">
            <Compass size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Community Showcase</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="aspect-square rounded-lg bg-white/5 border border-white/10 hover:border-blue-500/30 cursor-pointer transition-all"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
