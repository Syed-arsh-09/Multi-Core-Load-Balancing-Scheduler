import { useEffect, useRef, useReducer, useCallback, useState } from 'react';
import type { Core, Process, SimulationMetrics, SchedulingAlgorithm, HistoryDataPoint } from '../types';

const TICK_RATE_MS = 50;
const PROCESS_SPAWN_CHANCE = 0.40; // Lowered to 40% per tick to maintain stable system capacity (prevents queues from infinitely growing)

const generateId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const randomColor = () => {
  const colors = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const createInitialCores = (count = 4): Core[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `core-${i}`,
    name: `Core ${i + 1}`,
    currentProcess: null,
    queue: [],
    utilization: 0,
    totalProcessedCount: 0,
  }));
};

const createProcess = (
  tickCount: number,
  customProps?: { id?: string; burstTime?: number; arrivalTime?: number; priority?: number }
): Process => {
  const burst = customProps?.burstTime && customProps.burstTime > 0 ? customProps.burstTime : Math.floor(Math.random() * 40) + 20;
  return {
    id: customProps?.id || `P-${generateId()}`,
    arrivalTime: customProps?.arrivalTime !== undefined ? customProps.arrivalTime : tickCount,
    burstTime: burst,
    remainingTime: burst,
    priority: customProps?.priority !== undefined ? customProps.priority : 1,
    state: 'waiting',
    coreId: null,
    color: randomColor(),
    waitTime: 0,
    timeInQuantum: 0,
    vruntime: 0
  };
};

const assignProcessToCoreLocal = (process: Process, cores: Core[], algo: SchedulingAlgorithm) => {
  if (algo === 'AFFINITY') {
    // Deterministic modulo assignment simulating absolute CPU affinity based on strings
    let hash = 0;
    for (let i = 0; i < process.id.length; i++) hash += process.id.charCodeAt(i);
    const targetIdx = hash % cores.length;
    process.coreId = cores[targetIdx].id;
    cores[targetIdx].queue.push(process);
  } else {
    // Default fallback to least-loaded for Work Stealing / Push Pull / CFS
    let minLoad = Infinity;
    let targetCoreIdx = 0;
    cores.forEach((c, i) => {
      const load = c.queue.length + (c.currentProcess ? 1 : 0);
      if (load < minLoad) { minLoad = load; targetCoreIdx = i; }
    });
    process.coreId = cores[targetCoreIdx].id;
    cores[targetCoreIdx].queue.push(process);
  }
};

interface SimState {
  tickCount: number;
  cores: Core[];
  metrics: SimulationMetrics;
  completedProcesses: Process[];
  pendingArrivals: Process[];
  globalQueue: Process[];
  activeAlgorithm: SchedulingAlgorithm;
  timeQuantum: number;
  historicalMetrics: HistoryDataPoint[];
  migrationCounter: number;
}

const initialState: SimState = {
  tickCount: 0,
  cores: createInitialCores(4),
  metrics: { totalThroughput: 0, averageWaitTime: 0, tickCount: 0 },
  completedProcesses: [],
  pendingArrivals: [],
  globalQueue: [],
  activeAlgorithm: 'WORK_STEALING',
  timeQuantum: 15, // Default reasonable RR quantum
  historicalMetrics: [],
  migrationCounter: 0
};

type Action =
  | { type: 'TICK'; autoSpawn: boolean }
  | { type: 'RESET'; coreCount: number }
  | { type: 'SET_ALGO'; algo: SchedulingAlgorithm }
  | { type: 'SET_TIME_QUANTUM'; quantum: number }
  | { type: 'SET_CORE_COUNT'; count: number }
  | { type: 'ADD_PROCESS'; id?: string; burstTime?: number; arrivalTime?: number; priority?: number };

function simReducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'RESET':
      return {
        ...initialState,
        activeAlgorithm: state.activeAlgorithm,
        timeQuantum: state.timeQuantum,
        cores: createInitialCores(action.coreCount),
        migrationCounter: 0
      };

    case 'SET_CORE_COUNT': {
      if (action.count === state.cores.length || action.count < 1) return state;
      const nextCores = state.cores.map(c => ({ ...c, queue: [...c.queue] }));
      const nextGlobal = [...state.globalQueue];

      if (action.count > state.cores.length) {
        const diff = action.count - state.cores.length;
        for (let i = 0; i < diff; i++) {
          nextCores.push({
            id: `core-${state.cores.length + i}`,
            name: `Core ${state.cores.length + i + 1}`,
            currentProcess: null,
            queue: [],
            utilization: 0,
            totalProcessedCount: 0
          });
        }
      } else {
        const removedCores = nextCores.splice(action.count);
        removedCores.forEach(c => {
          if (c.currentProcess) {
            c.currentProcess.coreId = null;
            c.currentProcess.state = 'waiting';
            nextGlobal.push(c.currentProcess);
          }
          c.queue.forEach(p => {
            p.coreId = null;
            nextGlobal.push(p);
          });
        });

        if (!['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm)) {
          while (nextGlobal.length > 0) {
            let p = nextGlobal.shift()!;
            assignProcessToCoreLocal(p, nextCores, state.activeAlgorithm);
          }
        }
      }

      return {
        ...state,
        cores: nextCores,
        globalQueue: nextGlobal
      };
    }

    case 'SET_ALGO': {
      if (action.algo === state.activeAlgorithm) return state;

      const isGlobalTarget = ['FCFS', 'RR', 'SJF', 'SRTF'].includes(action.algo);
      const wasGlobal = ['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm);
      let nextGlobal = [...state.globalQueue];
      let nextCores = state.cores.map(c => ({ ...c, queue: [...c.queue] }));

      // Queue State Migration
      if (isGlobalTarget && !wasGlobal) {
        // Collect all local queues into global queue
        nextCores.forEach(c => {
          while (c.queue.length > 0) {
            let p = c.queue.shift()!;
            p.coreId = null;
            nextGlobal.push(p);
          }
        });
      } else if (!isGlobalTarget && wasGlobal) {
        // Scatter global queue into local queues
        while (nextGlobal.length > 0) {
          let p = nextGlobal.shift()!;
          assignProcessToCoreLocal(p, nextCores, action.algo);
        }
      } else if (!isGlobalTarget && !wasGlobal && action.algo === 'AFFINITY') {
        // Migrating from local to local with Affinity
        // Re-hash everything
        let allProcs: Process[] = [];
        nextCores.forEach(c => {
          while (c.queue.length > 0) allProcs.push(c.queue.shift()!);
        });
        allProcs.forEach(p => assignProcessToCoreLocal(p, nextCores, action.algo));
      }

      // Bridge the chart gap: record a metric snapshot for the NEW algorithm
      // at the current tick so there's no X-axis discontinuity on the graph.
      const bridgeHistory = [...state.historicalMetrics];
      const avgUtil = nextCores.reduce((s, c) => s + c.utilization, 0) / nextCores.length;
      const utilVar = nextCores.reduce((s, c) => s + Math.pow(c.utilization - avgUtil, 2), 0) / nextCores.length;
      const completedAll = state.completedProcesses;
      const avgResp = completedAll.length > 0
        ? completedAll.reduce((s, p) => s + p.waitTime + p.burstTime, 0) / completedAll.length
        : 0;
      const elapsed = (state.tickCount * 50) / 1000; // TICK_RATE_MS = 50
      const tpRate = elapsed > 0 ? Math.round((state.metrics.totalThroughput / elapsed) * 100) / 100 : 0;
      bridgeHistory.push({
        tick: state.tickCount,
        algorithm: action.algo,
        avgWaitTime: state.metrics.averageWaitTime,
        throughput: tpRate,
        utilization: avgUtil,
        utilizationVariance: Math.round(utilVar * 100) / 100,
        responseTime: Math.round(avgResp * 10) / 10,
        migrationCount: state.migrationCounter
      });

      return {
        ...state,
        activeAlgorithm: action.algo,
        globalQueue: nextGlobal,
        cores: nextCores,
        historicalMetrics: bridgeHistory
      };
    }

    case 'SET_TIME_QUANTUM': {
      return { ...state, timeQuantum: Math.max(1, action.quantum) };
    }

    case 'ADD_PROCESS': {
      const newProcess = createProcess(state.tickCount, {
        id: action.id,
        burstTime: action.burstTime,
        arrivalTime: action.arrivalTime,
        priority: action.priority
      });

      if (newProcess.arrivalTime > state.tickCount) {
        return {
          ...state,
          pendingArrivals: [...state.pendingArrivals, newProcess].sort((a, b) => a.arrivalTime - b.arrivalTime)
        };
      }

      const nextGlobal = [...state.globalQueue];
      const nextCores = [...state.cores.map(c => ({ ...c, queue: [...c.queue] }))];

      if (['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm)) {
        nextGlobal.push(newProcess);
      } else {
        assignProcessToCoreLocal(newProcess, nextCores, state.activeAlgorithm);
      }

      return { ...state, cores: nextCores, globalQueue: nextGlobal };
    }

    case 'TICK': {
      let nextTick = state.tickCount + 1;
      let nextCores = state.cores.map(c => ({ ...c, queue: [...c.queue] }));
      let nextGlobal = [...state.globalQueue.map(p => ({ ...p, waitTime: p.waitTime + 1 }))];
      let nextCompleted = [...state.completedProcesses];
      let nextPending = [...state.pendingArrivals];
      let nextHistory = [...state.historicalMetrics];
      let nextMetrics = {
        ...state.metrics,
        tickCount: nextTick
      };

      // 0. Dispatch processes that officially arrived this tick
      const readyToDispatch = nextPending.filter(p => p.arrivalTime <= nextTick);
      nextPending = nextPending.filter(p => p.arrivalTime > nextTick);

      readyToDispatch.forEach(p => {
        if (['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm)) {
          nextGlobal.push(p);
        } else {
          assignProcessToCoreLocal(p, nextCores, state.activeAlgorithm);
        }
      });

      // 1. Process Generation (Auto Spawn)
      if (action.autoSpawn && Math.random() < PROCESS_SPAWN_CHANCE) {
        const newProcess = createProcess(nextTick);
        if (['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm)) {
          nextGlobal.push(newProcess);
        } else {
          assignProcessToCoreLocal(newProcess, nextCores, state.activeAlgorithm);
        }
      }

      // 2. Sorting Phase based on Algorithm
      if (state.activeAlgorithm === 'FCFS' || state.activeAlgorithm === 'RR') {
        // FCFS and RR use simple arrival time queue behavior, do nothing (Queue naturally maintains order)
      } else if (state.activeAlgorithm === 'SJF') {
        nextGlobal.sort((a, b) => a.burstTime - b.burstTime);
      } else if (state.activeAlgorithm === 'SRTF') {
        nextGlobal.sort((a, b) => a.remainingTime - b.remainingTime);
      } else if (state.activeAlgorithm === 'CFS') {
        nextCores.forEach(c => c.queue.sort((a, b) => a.vruntime - b.vruntime));
      }

      // 3. Execution Phase
      nextCores = nextCores.map(core => {
        let c = { ...core };

        // Update waiting times inside local queues
        c.queue = c.queue.map(p => ({
          ...p,
          waitTime: p.waitTime + 1,
          vruntime: state.activeAlgorithm === 'CFS' ? p.vruntime - (p.priority * 0.05) : p.vruntime
        }));

        if (c.currentProcess) {
          let p = { ...c.currentProcess };
          p.remainingTime -= 1;
          p.timeInQuantum += 1;
          if (state.activeAlgorithm === 'CFS') p.vruntime += 1;

          if (p.remainingTime <= 0) {
            // Process Finished
            p.state = 'completed';
            nextCompleted.push(p);
            if (nextCompleted.length > 50) nextCompleted.shift(); // Keep last 50

            nextMetrics.totalThroughput += 1;
            nextMetrics.averageWaitTime =
              ((nextMetrics.averageWaitTime * (nextMetrics.totalThroughput - 1)) + p.waitTime)
              / nextMetrics.totalThroughput;

            c.totalProcessedCount += 1;
            c.currentProcess = null;
          } else {
            // Preemption Checking
            let preempt = false;
            if (state.activeAlgorithm === 'RR' && p.timeInQuantum >= state.timeQuantum) {
              preempt = true;
            } else if (state.activeAlgorithm === 'SRTF' && nextGlobal.length > 0 && nextGlobal[0].remainingTime < p.remainingTime) {
              preempt = true;
            } else if (state.activeAlgorithm === 'CFS' && c.queue.length > 0 && c.queue[0].vruntime < p.vruntime - 5) { // vruntime delta of 5
              preempt = true;
            }

            if (preempt) {
              p.state = 'waiting';
              p.timeInQuantum = 0;
              if (['RR', 'SRTF'].includes(state.activeAlgorithm)) {
                p.coreId = null;
                nextGlobal.push(p);
              } else {
                c.queue.push(p); // Re-queues local
              }
              c.currentProcess = null;
            } else {
              c.currentProcess = p; // Continue running
            }
          }
        }

        // 4. Fill Idle Cores
        if (!c.currentProcess) {
          if (['FCFS', 'RR', 'SJF', 'SRTF'].includes(state.activeAlgorithm)) {
            if (nextGlobal.length > 0) {
              c.currentProcess = nextGlobal.shift()!;
              c.currentProcess.coreId = c.id;
              c.currentProcess.state = 'running';
            }
          } else {
            if (c.queue.length > 0) {
              c.currentProcess = c.queue.shift()!;
              c.currentProcess.state = 'running';
            }
          }
        }

        const isBusy = c.currentProcess ? 100 : 0;
        c.utilization = (c.utilization * 0.95) + (isBusy * 0.05);

        return c;
      });

      // 5. Load balancing patterns (WORK_STEALING & PUSH_PULL)
      let tickMigrations = 0;
      if (state.activeAlgorithm === 'WORK_STEALING' || state.activeAlgorithm === 'PUSH_PULL') {
        const loads = nextCores.map(c => c.queue.length + (c.currentProcess ? 1 : 0));
        let maxLoadIdx = loads.indexOf(Math.max(...loads));
        let minLoadIdx = loads.indexOf(Math.min(...loads));

        const threshold = state.activeAlgorithm === 'PUSH_PULL' ? 1 : 2;

        if (loads[maxLoadIdx] - loads[minLoadIdx] >= threshold && nextCores[maxLoadIdx].queue.length > 0) {
          const stolen = nextCores[maxLoadIdx].queue.pop();
          if (stolen) {
            stolen.coreId = nextCores[minLoadIdx].id;
            nextCores[minLoadIdx].queue.push(stolen);
            tickMigrations += 1;
          }
        }
      }

      // 6. Snapshots for Analytics Engine
      const nextMigrationCounter = state.migrationCounter + tickMigrations;
      if (nextTick % 5 === 0) {
        const avgUtilization = nextCores.reduce((s, c) => s + c.utilization, 0) / nextCores.length;
        // CPU Utilization Variance
        const utilVariance = nextCores.reduce((s, c) => s + Math.pow(c.utilization - avgUtilization, 2), 0) / nextCores.length;
        // Response Time (avg turnaround = avgWaitTime + avgBurstTime of completed)
        const completedAll = nextCompleted;
        const avgResponseTime = completedAll.length > 0
          ? completedAll.reduce((s, p) => s + p.waitTime + p.burstTime, 0) / completedAll.length
          : 0;
        // Throughput rate (jobs per second)
        const elapsedSeconds = (nextTick * TICK_RATE_MS) / 1000;
        const throughputRate = elapsedSeconds > 0 ? Math.round((nextMetrics.totalThroughput / elapsedSeconds) * 100) / 100 : 0;

        nextHistory.push({
          tick: nextTick,
          algorithm: state.activeAlgorithm,
          avgWaitTime: nextMetrics.averageWaitTime,
          throughput: throughputRate,
          utilization: avgUtilization,
          utilizationVariance: Math.round(utilVariance * 100) / 100,
          responseTime: Math.round(avgResponseTime * 10) / 10,
          migrationCount: nextMigrationCounter
        });
        if (nextHistory.length > 600) nextHistory.shift(); // Keep last 600 data points
      }

      return {
        tickCount: nextTick,
        cores: nextCores,
        globalQueue: nextGlobal,
        completedProcesses: nextCompleted,
        pendingArrivals: nextPending,
        historicalMetrics: nextHistory,
        metrics: nextMetrics,
        activeAlgorithm: state.activeAlgorithm,
        timeQuantum: state.timeQuantum,
        migrationCounter: nextMigrationCounter
      };
    }
    default:
      return state;
  }
}

export function useSimulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoSpawn, setIsAutoSpawn] = useState(false);

  const [state, dispatch] = useReducer(simReducer, initialState);
  const intervalRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    dispatch({ type: 'TICK', autoSpawn: isAutoSpawn });
  }, [isAutoSpawn]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(tick, TICK_RATE_MS);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isRunning, tick]);

  useEffect(() => {
    if (isRunning && !isAutoSpawn && state.tickCount > 0) {
      const isIdle = state.cores.every(c => c.queue.length === 0 && !c.currentProcess);
      const isPendingEmpty = state.pendingArrivals.length === 0;
      const isGlobalEmpty = state.globalQueue.length === 0;
      if (isIdle && isPendingEmpty && isGlobalEmpty) {
        setIsRunning(false);
      }
    }
  }, [state.cores, state.pendingArrivals, state.globalQueue, isRunning, isAutoSpawn, state.tickCount]);

  const toggleSimulation = () => setIsRunning(!isRunning);
  const toggleAutoSpawn = () => setIsAutoSpawn(!isAutoSpawn);
  const setAlgorithm = (algo: SchedulingAlgorithm) => dispatch({ type: 'SET_ALGO', algo });
  const setTimeQuantum = (quantum: number) => dispatch({ type: 'SET_TIME_QUANTUM', quantum });
  const setCoreCount = (count: number) => dispatch({ type: 'SET_CORE_COUNT', count });

  const addProcess = (params?: { id?: string; burstTime?: number; arrivalTime?: number; priority?: number }) => {
    dispatch({ type: 'ADD_PROCESS', ...params });
  };

  const reset = () => {
    setIsRunning(false);
    dispatch({ type: 'RESET', coreCount: state.cores.length });
    setIsAutoSpawn(false);
  };

  return {
    ...state,
    isRunning,
    isAutoSpawn,
    toggleSimulation,
    toggleAutoSpawn,
    setAlgorithm,
    setTimeQuantum,
    setCoreCount,
    addProcess,
    reset,
  };
}
