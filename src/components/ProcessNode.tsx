import { motion } from 'framer-motion';
import type { Process } from '../types';

interface ProcessNodeProps {
  process: Process;
  isActive?: boolean;
}

export function ProcessNode({ process, isActive = false }: ProcessNodeProps) {
  const percentComplete = ((process.burstTime - process.remainingTime) / process.burstTime) * 100;
  
  return (
    <div 
      className={`relative overflow-hidden rounded-md border border-slate-200 h-8 w-full flex items-center justify-center text-xs font-mono mb-1 shadow-sm transition-all duration-300 ${isActive ? 'ring-2 ring-blue-400 scale-[1.02] my-2 h-10 shadow-md' : 'opacity-90 hover:opacity-100'}`}
      style={{ backgroundColor: `${process.color}15` }} 
    >
      <motion.div 
        className="absolute left-0 top-0 bottom-0 z-0"
        style={{ backgroundColor: `${process.color}40` }} 
        initial={{ width: `${percentComplete}%` }}
        animate={{ width: `${percentComplete}%` }}
        transition={{ ease: "linear", duration: isActive ? 0.1 : 0 }}
      />
      
      <div className="relative z-10 text-slate-800 font-bold tracking-wider flex items-center justify-between w-full px-2">
        <span className="truncate max-w-[50%]">{process.id.length > 8 ? process.id.substring(0, 8) + '..' : process.id}</span>
        
        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
          {process.priority !== 1 && !isActive && (
            <span className="px-1.5 bg-slate-900/10 rounded-sm" title={`Priority: ${process.priority}`}>
              P{process.priority}
            </span>
          )}
          {isActive ? (
            <span className="tracking-tight">[{Math.max(0, process.remainingTime)}t]</span>
          ) : (
            <span className="tracking-tight text-slate-500">{process.burstTime}t</span>
          )}
        </div>
      </div>
    </div>
  );
}
