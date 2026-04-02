import type { Process } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

export function GanttChart({ completedProcesses, isAntiGravity = false }: { completedProcesses: Process[], isAntiGravity?: boolean }) {
  if (completedProcesses.length === 0) {
    return (
      <div className={`glass-card rounded-2xl p-8 z-10 relative flex items-center justify-center min-h-[150px] border transition-all duration-1000 ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'}`}>
        <span className="text-slate-400 font-mono tracking-widest text-sm uppercase">No processes completed yet</span>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-2xl p-6 z-10 relative mt-6 flex flex-col border transition-all duration-1000 ${isAntiGravity ? 'bg-indigo-50/40 border-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.05)]' : 'bg-white border-slate-200'}`}>
      <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4 font-heading border-b border-slate-100 pb-3">
        Completion History (Last 30)
      </h3>
      
      <div className="flex flex-wrap gap-2 animate-in fade-in duration-500 mt-2">
        <AnimatePresence>
          {completedProcesses.map((p) => (
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={p.id}
              className="flex flex-col items-center group cursor-pointer relative"
            >
              <div 
                className="h-10 w-14 overflow-hidden rounded-lg border border-slate-200 flex items-center justify-center text-[10px] font-mono text-slate-800 font-bold transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                style={{ backgroundColor: `${p.color}20` }}
              >
                {p.id.length > 5 ? p.id.substring(0, 5) : p.id}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-800 p-2 rounded-md text-[10px] whitespace-nowrap pointer-events-none border border-slate-700 z-50 text-white shadow-xl flex flex-col items-center">
                <span>Core: <b className="text-blue-300">{p.coreId}</b> | Wait: {p.waitTime}t</span>
                <span className="text-slate-300 mt-0.5">PID: {p.id} | AT: {p.arrivalTime} | Prio: {p.priority} | BT: {p.burstTime}</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 font-mono font-medium">{p.burstTime}t</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
