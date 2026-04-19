import type { Process } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

export function GanttChart({ completedProcesses, isAntiGravity = false }: { completedProcesses: Process[], isAntiGravity?: boolean }) {
  if (completedProcesses.length === 0) {
    return (
      <div className={`glass-card rounded-xl p-3 z-10 relative flex items-center justify-center border transition-all duration-1000 ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'}`}>
        <span className="text-slate-400 font-mono tracking-widest text-[10px] uppercase">No completed processes</span>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-xl p-2 z-10 relative flex flex-col border transition-all duration-1000 ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'}`} style={{ overflow: 'visible' }}>
      <h3 className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1.5 px-1">
        Completed (Last 30)
      </h3>
      
      <div className="flex flex-wrap gap-1" style={{ overflow: 'visible' }}>
        <AnimatePresence>
          {completedProcesses.map((p) => (
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={p.id}
              className="flex flex-col items-center group cursor-pointer relative"
              style={{ overflow: 'visible' }}
            >
              <div 
                className="h-7 w-10 overflow-hidden rounded border border-slate-200 flex items-center justify-center text-[8px] font-mono text-slate-800 font-bold transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                style={{ backgroundColor: `${p.color}20` }}
              >
                {p.id.length > 4 ? p.id.substring(0, 4) : p.id}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 p-1.5 rounded text-[9px] whitespace-nowrap pointer-events-none border border-slate-700 z-[100] text-white shadow-xl flex flex-col items-center">
                <span>Core: <b className="text-blue-300">{p.coreId}</b> | Wait: {p.waitTime}t</span>
                <span className="text-slate-300 mt-0.5">PID: {p.id} | BT: {p.burstTime}</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
