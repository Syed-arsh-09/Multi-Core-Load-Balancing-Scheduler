import type { Core } from '../types';
import { ProcessNode } from './ProcessNode';
import { motion } from 'framer-motion';

interface CoreVisualizerProps {
  core: Core;
  isAntiGravity?: boolean;
}

export function CoreVisualizer({ core, isAntiGravity = false }: CoreVisualizerProps) {
  const getGlowClass = (utilization: number) => {
    if (utilization > 80) return "shadow-[0_4px_20px_rgba(239,68,68,0.15)] border-red-200 ring-1 ring-red-400";
    if (utilization > 50) return "shadow-[0_4px_15px_rgba(245,158,11,0.1)] border-orange-200 ring-1 ring-orange-300";
    return "border-slate-200";
  };

  return (
    <motion.div 
      layout
      transition={{ duration: 0.2 }}
      className={`glass-card flex flex-col items-center h-full w-full p-3 relative transition-all duration-500 rounded-xl ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.05)]' : 'bg-white border-slate-200'} ${getGlowClass(core.utilization)}`}
    >
      <div className="flex w-full justify-between items-center mb-2 text-sm text-slate-500">
        <h3 className="font-bold text-sm text-slate-800 tracking-tight">{core.name}</h3>
        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium border border-slate-200">
          {Math.round(core.utilization)}%
        </span>
      </div>
      
      <div className="w-full relative min-h-[45px] bg-slate-50 rounded-lg p-2 mb-2 flex flex-col items-center justify-center border border-slate-200/60 shadow-inner">
        {core.currentProcess ? (
          <ProcessNode process={core.currentProcess} isActive={true} />
        ) : (
          <span className="text-slate-400 font-mono text-[10px] uppercase tracking-widest text-center my-auto">Idle</span>
        )}
      </div>

      <div className="w-full border-b border-slate-100 mb-1.5" />
      <span className="text-[10px] text-slate-400 font-semibold mb-1.5 uppercase tracking-widest w-full text-left">Queue ({core.queue.length})</span>

      <div className="w-full flex-1 overflow-y-auto overflow-x-hidden pr-1 flex flex-col gap-0.5 items-center pb-6 scrollbar-thin min-h-0">
        {core.queue.length === 0 ? (
          <span className="text-slate-300 text-[10px] italic mt-2">- Empty -</span>
        ) : (
          core.queue.map(p => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
              <ProcessNode process={p} />
            </motion.div>
          ))
        )}
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[9px] uppercase font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-full border border-slate-200 font-semibold">
          Done: {core.totalProcessedCount}
        </span>
      </div>
    </motion.div>
  );
}
