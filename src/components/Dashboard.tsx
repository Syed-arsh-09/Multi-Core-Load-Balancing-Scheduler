import { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { CoreVisualizer } from './CoreVisualizer';
import { GanttChart } from './GanttChart';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Play, Pause, RefreshCw, Zap, Plus, Settings2, Clock, Activity, ChevronDown } from 'lucide-react';
import type { SchedulingAlgorithm } from '../types';

const ALGO_OPTIONS: { value: SchedulingAlgorithm, label: string }[] = [
  { value: 'FCFS', label: 'First Come First Serve (Global)' },
  { value: 'RR', label: 'Round Robin (Global)' },
  { value: 'SJF', label: 'Shortest Job First (Global)' },
  { value: 'SRTF', label: 'Short. Remaining Time (Global)' },
  { value: 'WORK_STEALING', label: 'Work Stealing (Per-Core)' },
  { value: 'PUSH_PULL', label: 'Push/Pull Migration (Per-Core)' },
  { value: 'CFS', label: 'Completely Fair Sched (Per-Core)' },
  { value: 'AFFINITY', label: 'CPU Affinity (Per-Core)' },
];

const algoColors: Record<SchedulingAlgorithm, string> = {
  FCFS: '#3b82f6',
  RR: '#8b5cf6',
  SJF: '#10b981',
  SRTF: '#f59e0b',
  WORK_STEALING: '#ef4444',
  PUSH_PULL: '#ec4899',
  CFS: '#06b6d4',
  AFFINITY: '#84cc16'
};

export function Dashboard() {
  const {
    cores, isRunning, isAutoSpawn, activeAlgorithm, timeQuantum,
    metrics, pendingArrivals, globalQueue, historicalMetrics, completedProcesses,
    toggleSimulation, toggleAutoSpawn, setAlgorithm, setTimeQuantum, setCoreCount, addProcess, reset
  } = useSimulation();

  const [customPid, setCustomPid] = useState<string>('P1');
  const [customAt, setCustomAt] = useState<string>('');
  const [customBt, setCustomBt] = useState<string>('30');
  const [customPriority, setCustomPriority] = useState<string>('1');
  const [isAlgoOpen, setIsAlgoOpen] = useState(false);

  const handleAddCustom = () => {
    addProcess({
      id: customPid || undefined,
      arrivalTime: customAt !== '' ? parseInt(customAt) : undefined,
      burstTime: parseInt(customBt) || 30,
      priority: parseInt(customPriority) || 1
    });
    if (customPid.match(/^P\d+$/)) {
      setCustomPid(`P${parseInt(customPid.slice(1)) + 1}`);
    }
  };

  const isGlobalContext = ['FCFS', 'RR', 'SJF', 'SRTF'].includes(activeAlgorithm);
  const isWorkStealing = activeAlgorithm === 'WORK_STEALING';

  // Build chart data: merge all data points per tick into one object keyed by algo + metric
  const chartData = (() => {
    const tickMap = new Map<number, Record<string, number>>();
    historicalMetrics.forEach(h => {
      if (!tickMap.has(h.tick)) tickMap.set(h.tick, { tick: h.tick });
      const entry = tickMap.get(h.tick)!;
      entry[`${h.algorithm}_utilVar`] = h.utilizationVariance;
      entry[`${h.algorithm}_respTime`] = h.responseTime;
      entry[`${h.algorithm}_throughput`] = h.throughput;
      entry[`${h.algorithm}_migration`] = h.migrationCount;
    });
    return Array.from(tickMap.values()).sort((a, b) => a.tick - b.tick);
  })();

  return (
    <div className={`min-h-screen p-6 md:p-12 text-slate-800 relative overflow-hidden font-sans pb-20 transition-colors duration-1000 ${isWorkStealing ? 'bg-indigo-50' : 'bg-slate-50'}`}>
      {/* Background Dynamics */}
      <div className={`fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 z-0 opacity-[0.05] ${isWorkStealing ? 'bg-indigo-600' : 'bg-blue-600'}`} />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header & Main Controls */}
        <header className={`flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 glass-card rounded-3xl p-8 w-full transition-all duration-1000 border ${isWorkStealing ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'}`}>
          <div className="mb-6 xl:mb-0 max-w-xl">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
              Multi-Core OS
            </h1>
            <p className="text-slate-500 mt-2 text-[15px] leading-relaxed font-medium">
              Dynamic multi-processor scheduling engine displaying real-time metrics, preemption, and algorithm evaluations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
            {/* Algorithm & Core Selectors */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 w-full sm:w-auto shadow-inner">

              <div className="flex items-center pl-2 pr-3 border-r border-slate-300 gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider hidden sm:block">Cores</span>
                <input
                  type="number" min="2" max="16"
                  value={cores.length}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 2 && val <= 16) setCoreCount(val);
                  }}
                  className="w-12 text-center text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded py-1 outline-none focus:border-blue-500"
                  title="Number of CPU Cores (2-16)"
                />
              </div>

              <Activity size={18} className="text-slate-400 ml-1 hidden sm:block" />
              <div className="relative">
                <button
                  onClick={() => setIsAlgoOpen(!isAlgoOpen)}
                  className="flex items-center justify-between gap-2 bg-transparent font-bold text-slate-700 outline-none text-sm py-2 px-2 cursor-pointer w-[220px]"
                >
                  <span className="truncate text-left w-full">
                    {ALGO_OPTIONS.find(o => o.value === activeAlgorithm)?.label}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 min-w-[16px] transition-transform duration-200 ${isAlgoOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAlgoOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAlgoOpen(false)} />
                    <div className="absolute top-[calc(100%+0.5rem)] -left-2 w-[260px] bg-white border border-slate-100/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden z-50 animate-slide-down">
                      <div className="flex flex-col py-1">
                        {ALGO_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => {
                              setAlgorithm(o.value as SchedulingAlgorithm);
                              setIsAlgoOpen(false);
                            }}
                            className={`text-left px-5 py-3 text-[13px] font-bold transition-colors
                              ${activeAlgorithm === o.value ? 'bg-blue-50/80 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                            `}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {activeAlgorithm === 'RR' && (
                <div className="flex items-center ml-2 border-l border-slate-300 pl-3">
                  <span className="text-xs text-slate-500 font-bold mr-2 uppercase">QT:</span>
                  <input type="number" min="1" max="100" value={timeQuantum} onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)} className="w-12 text-center text-sm font-bold bg-white border border-slate-300 rounded py-1" />
                </div>
              )}
            </div>

            <div className="h-10 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={reset} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl transition-all shadow-sm flex items-center justify-center">
                <RefreshCw size={20} className={isRunning ? "animate-spin" : ""} />
              </button>
              <button
                onClick={toggleSimulation}
                className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all shadow-sm text-[15px] border whitespace-nowrap
                  ${isRunning ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] border-transparent shadow-md'}`}
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                {isRunning ? 'Pause Engine' : 'Start Engine'}
              </button>
            </div>
          </div>
        </header>

        {/* Process Generator Controls (Unified row) */}
        <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 z-10 relative glass-card rounded-2xl p-4 px-6 border gap-4 ${isWorkStealing ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={toggleAutoSpawn} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border ${isAutoSpawn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}>
              <Settings2 size={16} /> Auto-Spawn: {isAutoSpawn ? 'ON' : 'OFF'}
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <button onClick={() => addProcess()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-sm whitespace-nowrap">
              <Zap size={16} className="fill-blue-500 text-blue-500" /> Random
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner w-full xl:w-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mx-2 hidden sm:block">Create</span>
            <div className="flex items-center gap-1">
              <label className="text-xs font-mono text-slate-400 font-bold">PID:</label>
              <input type="text" value={customPid} onChange={e => setCustomPid(e.target.value)} className="w-16 px-2 py-1.5 text-sm rounded bg-white border border-slate-300 outline-blue-500 font-mono" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-mono text-slate-400 font-bold">AT:</label>
              <input type="number" value={customAt} onChange={e => setCustomAt(e.target.value)} placeholder={`${metrics.tickCount}`} className="w-16 px-2 py-1.5 text-sm rounded bg-white border border-slate-300 outline-blue-500 font-mono" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-mono text-slate-400 font-bold">BT:</label>
              <input type="number" value={customBt} onChange={e => setCustomBt(e.target.value)} min="1" className="w-14 px-2 py-1.5 text-sm rounded bg-white border border-slate-300 outline-blue-500 font-mono" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs font-mono text-slate-400 font-bold">Prio:</label>
              <input type="number" value={customPriority} onChange={e => setCustomPriority(e.target.value)} min="1" className="w-12 px-2 py-1.5 text-sm rounded bg-white border border-slate-300 outline-blue-500 font-mono" />
            </div>
            <button onClick={handleAddCustom} className="flex items-center gap-1 px-4 py-1.5 ml-1 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"><Plus size={16} /> Add</button>
          </div>
        </div>

        {/* Global Queue UI (Only visible for global algos) */}
        {isGlobalContext && (
          <div className="mb-8 w-full glass-card bg-white border border-slate-200 rounded-2xl p-5 overflow-hidden flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Global Ready Queue</span>
            <div className="flex flex-wrap justify-center gap-2 w-full min-h-[40px]">
              {globalQueue.length === 0 ? (
                <span className="text-slate-300 text-xs italic">Queue is empty</span>
              ) : (
                globalQueue.map(p => (
                  <div key={p.id} className="px-3 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 flex items-center gap-2 shadow-sm" style={{ borderLeftColor: p.color, borderLeftWidth: '3px' }}>
                    {p.id} <span className="text-[10px] text-slate-400 font-sans tracking-tighter">BT:{p.burstTime}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Cores Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 z-10 relative mb-8">
          {cores.map(core => (
            <CoreVisualizer key={core.id} core={core} isAntiGravity={isWorkStealing} />
          ))}
        </div>

        {/* Pending Arrivals Alert */}
        {pendingArrivals.length > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 text-sm font-semibold py-3 px-6 rounded-full border border-blue-200 animate-in fade-in zoom-in w-max mx-auto shadow-sm">
            <Clock size={16} className="animate-pulse" />
            <span>{pendingArrivals.length} Schedule{pendingArrivals.length > 1 ? 'd' : ''} Arrivals</span>
            <span className="text-blue-400 mx-2">|</span>
            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-blue-100">
              Next AT: {pendingArrivals[0].arrivalTime}
            </span>
          </div>
        )}

        {/* Dynamic Analytics & Metrics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Static Metrics Column */}
          <div className="flex flex-col gap-4">
            <MetricCard title="System Throughput" value={`${metrics.totalThroughput}`} subtitle="Processes completed" />
            <MetricCard title="Avg Wait Time" value={`${metrics.averageWaitTime.toFixed(1)}t`} subtitle="Per process" />
            <MetricCard title="Simulation Time" value={`${metrics.tickCount} T`} subtitle="Internal clock cycle" />
          </div>

          {/* Benchmark Charts — 2×2 Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU Utilization Balance */}
            <div className="glass-card bg-white border border-slate-200 rounded-2xl p-5 relative">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CPU Utilization Balance</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 mb-2">Variance between core loads — lower is better</span>
              <div className="w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend iconType="plainline" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '9px', paddingLeft: '6px', lineHeight: '16px' }} />
                    {ALGO_OPTIONS.map(algo => (
                      <Line key={algo.value} type="monotone" dataKey={`${algo.value}_utilVar`} name={algo.value} stroke={algoColors[algo.value]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Response Time / Latency */}
            <div className="glass-card bg-white border border-slate-200 rounded-2xl p-5 relative">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Response Time / Latency</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 mb-2">Avg turnaround time (ticks) — lower is better</span>
              <div className="w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend iconType="plainline" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '9px', paddingLeft: '6px', lineHeight: '16px' }} />
                    {ALGO_OPTIONS.map(algo => (
                      <Line key={algo.value} type="monotone" dataKey={`${algo.value}_respTime`} name={algo.value} stroke={algoColors[algo.value]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Throughput */}
            <div className="glass-card bg-white border border-slate-200 rounded-2xl p-5 relative">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Throughput</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 mb-2">Jobs completed per second</span>
              <div className="w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend iconType="plainline" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '9px', paddingLeft: '6px', lineHeight: '16px' }} />
                    {ALGO_OPTIONS.map(algo => (
                      <Line key={algo.value} type="monotone" dataKey={`${algo.value}_throughput`} name={algo.value} stroke={algoColors[algo.value]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Migration Overhead */}
            <div className="glass-card bg-white border border-slate-200 rounded-2xl p-5 relative">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Migration Overhead</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 mb-2">Cumulative task migrations between cores</span>
              <div className="w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tick" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                    <Legend iconType="plainline" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '9px', paddingLeft: '6px', lineHeight: '16px' }} />
                    {ALGO_OPTIONS.map(algo => (
                      <Line key={algo.value} type="monotone" dataKey={`${algo.value}_migration`} name={algo.value} stroke={algoColors[algo.value]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <GanttChart completedProcesses={completedProcesses} isAntiGravity={isWorkStealing} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string, value: string, subtitle: string }) {
  return (
    <div className="glass-card flex-1 bg-white flex flex-col justify-center rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:bg-blue-50 transition-colors" />
      <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-2 relative z-10">{title}</span>
      <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter relative z-10">{value}</span>
      <span className="text-[12px] text-slate-400 mt-1 font-medium relative z-10">{subtitle}</span>
    </div>
  )
}
