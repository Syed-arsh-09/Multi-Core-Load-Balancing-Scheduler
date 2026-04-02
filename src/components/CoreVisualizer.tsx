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
      className={`glass-card flex flex-col items-center h-[500px] w-full p-5 relative transition-all duration-500 ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.05)]' : 'bg-white border-slate-200'} ${getGlowClass(core.utilization)}`}
    >
      <div className="flex w-full justify-between items-center mb-5 text-sm text-slate-500">
        <h3 className="font-bold text-lg text-slate-800 tracking-tight">{core.name}</h3>
        <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium border border-slate-200 shadow-sm">
          {Math.round(core.utilization)}%
        </span>
      </div>
      
      <div className="w-full relative min-h-[70px] bg-slate-50 rounded-lg p-3 mb-4 flex flex-col items-center justify-center border border-slate-200/60 shadow-inner">
        {core.currentProcess ? (
          <ProcessNode process={core.currentProcess} isActive={true} />
        ) : (
          <span className="text-slate-400 font-mono text-xs uppercase tracking-widest text-center my-auto">Idle</span>
        )}
      </div>

      <div className="w-full border-b border-slate-100 mb-4" />
      <span className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-widest w-full text-left">Queue ({core.queue.length})</span>

      <div className="w-full flex-1 overflow-y-auto overflow-x-hidden pr-2 flex flex-col gap-1 items-center pb-8 scrollbar-thin">
        {core.queue.length === 0 ? (
          <span className="text-slate-300 text-xs italic mt-4">- Empty -</span>
        ) : (
          core.queue.map(p => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
              <ProcessNode process={p} />
            </motion.div>
          ))
        )}
      </div>
      
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full border border-slate-200 font-semibold shadow-sm text-center">
          Processed: {core.totalProcessedCount}
        </span>
      </div>
    </motion.div>
  );
}
