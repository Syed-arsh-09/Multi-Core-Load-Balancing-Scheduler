export type SchedulingAlgorithm = 
  | 'FCFS' 
  | 'RR' 
  | 'SJF' 
  | 'SRTF' 
  | 'WORK_STEALING' 
  | 'PUSH_PULL' 
  | 'CFS' 
  | 'AFFINITY';

export interface Process {
  id: string; // The PID, e.g., "P1", "P2" or random hash
  arrivalTime: number; // Tick at which process officially arrives
  burstTime: number; // Total required running time
  priority: number; // User defined priority (e.g., 1 is highest)
  remainingTime: number; // Remaining running time
  state: 'waiting' | 'running' | 'completed';
  coreId: string | null; // Null if unassigned
  color: string; // Hex color or tailwind class for visual differentiation
  waitTime: number; // Ticks spent waiting
  
  // Advanced Tracker fields
  timeInQuantum: number; // For RR
  vruntime: number; // For CFS
  affinityCoreId?: string; // For Affinity scheduling
}

export interface Core {
  id: string;
  name: string;
  currentProcess: Process | null;
  queue: Process[]; // Per-core queue used by specific algos (Work Stealing, Push/Pull, CFS, Affinity)
  utilization: number; // 0-100 percentage based on recent history
  totalProcessedCount: number;
}

export interface SimulationMetrics {
  totalThroughput: number;
  averageWaitTime: number;
  tickCount: number;
}

export interface HistoryDataPoint {
  tick: number;
  algorithm: SchedulingAlgorithm;
  avgWaitTime: number;
  throughput: number;
  utilization: number;
  utilizationVariance: number;
  responseTime: number;
  migrationCount: number;
}
