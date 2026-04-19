import { useState, useRef } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { CoreVisualizer } from './CoreVisualizer';
import { GanttChart } from './GanttChart';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Play, Pause, RefreshCw, Zap, Plus, Settings2, Clock, Activity, ChevronDown } from 'lucide-react';
import type { SchedulingAlgorithm } from '../types';

const ALGO_OPTIONS: { value: SchedulingAlgorithm, label: string }[] = [
  { value: 'FCFS', label: 'First Come First Serve' },
  { value: 'RR', label: 'Round Robin' },
  { value: 'SJF', label: 'Shortest Job First' },
  { value: 'SRTF', label: 'Shortest Remaining Time' },
  { value: 'WORK_STEALING', label: 'Work Stealing' },
  { value: 'PUSH_PULL', label: 'Push/Pull Migration' },
  { value: 'CFS', label: 'Completely Fair Sched' },
  { value: 'AFFINITY', label: 'CPU Affinity' },
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

const CHART_DEFS = [
  { id: 'utilVar', title: 'CPU Util Balance', subtitle: 'Variance between core loads — lower is better', suffix: '_utilVar', accent: '#f59e0b', yLabel: 'Variance' },
  { id: 'respTime', title: 'Response Time', subtitle: 'Avg turnaround time (ticks) — lower is better', suffix: '_respTime', accent: '#ef4444', yLabel: 'Time (ticks)' },
  { id: 'throughput', title: 'Throughput', subtitle: 'Jobs completed per second', suffix: '_throughput', accent: '#10b981', yLabel: 'Jobs / sec' },
  { id: 'migration', title: 'Migration', subtitle: 'Cumulative task migrations between cores', suffix: '_migration', accent: '#3b82f6', yLabel: 'Count' },
];

/* Position styles for each chart's expanded state — anchored to its own corner */
const EXPAND_POSITIONS: React.CSSProperties[] = [
  { top: 0, left: 0, width: '130%', height: '125%' },       // top-left → expands right & down
  { top: 0, right: 0, width: '130%', height: '125%' },      // top-right → expands left & down
  { bottom: 0, left: 0, width: '130%', height: '125%' },    // bottom-left → expands right & up
  { bottom: 0, right: 0, width: '130%', height: '125%' },   // bottom-right → expands left & up
];

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
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const hoverTimeout = useRef<number | null>(null);

  const showZoom = (id: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredChart(id);
  };

  const scheduleHideZoom = () => {
    hoverTimeout.current = window.setTimeout(() => setHoveredChart(null), 150);
  };

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
    <div className={`h-screen flex flex-col overflow-hidden font-sans transition-colors duration-1000 ${isWorkStealing ? 'bg-indigo-50' : 'bg-slate-50'}`}>
      {/* Background blob */}
      <div className={`fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-colors duration-1000 z-0 opacity-[0.05] ${isWorkStealing ? 'bg-indigo-600' : 'bg-blue-600'}`} />

      {/* ===== TOP BAR ===== */}
      <header className={`flex flex-col lg:flex-row items-center justify-between gap-4 px-5 py-3 lg:py-2.5 border-b z-40 relative shrink-0 ${isWorkStealing ? 'bg-indigo-50/60 border-indigo-200' : 'bg-white/80 border-slate-200'} backdrop-blur-sm`}>
        {/* Left: Title */}
        <h1 className="text-xl font-black text-slate-900 tracking-tight whitespace-nowrap shrink-0">Multi-Core OS</h1>

        {/* Center: Algo + Cores */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Cores</span>
            <input
              type="number" min="2" max="16"
              value={cores.length}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 2 && val <= 16) setCoreCount(val);
              }}
              className="w-11 text-center text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded py-0.5 outline-none focus:border-blue-500"
            />
          </div>

          <Activity size={15} className="text-slate-400" />
          <div className="relative">
            <button
              onClick={() => setIsAlgoOpen(!isAlgoOpen)}
              className="flex items-center gap-1.5 bg-transparent font-bold text-slate-700 outline-none text-sm py-1 px-1 cursor-pointer w-[190px]"
            >
              <span className="truncate text-left flex-1">{ALGO_OPTIONS.find(o => o.value === activeAlgorithm)?.label}</span>
              <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isAlgoOpen ? 'rotate-180' : ''}`} />
            </button>
            {isAlgoOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsAlgoOpen(false)} />
                <div className="absolute top-[calc(100%+4px)] left-0 w-[230px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[70] animate-slide-down">
                  {ALGO_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => { setAlgorithm(o.value as SchedulingAlgorithm); setIsAlgoOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${activeAlgorithm === o.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {activeAlgorithm === 'RR' && (
            <div className="flex items-center border-l border-slate-200 pl-2.5 gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">QT</span>
              <input type="number" min="1" max="100" value={timeQuantum} onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)} className="w-11 text-center text-sm font-bold bg-white border border-slate-300 rounded py-0.5" />
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <button onClick={toggleAutoSpawn} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border min-w-[100px] ${isAutoSpawn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            <Settings2 size={14} /> Auto {isAutoSpawn ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => addProcess()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition">
            <Zap size={14} className="fill-blue-500 text-blue-500" /> Random
          </button>

          <div className="hidden lg:block h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1">
            <input type="text" value={customPid} onChange={e => setCustomPid(e.target.value)} className="w-12 px-1.5 py-0.5 text-xs rounded bg-white border border-slate-300 font-mono" placeholder="PID" />
            <input type="number" value={customAt} onChange={e => setCustomAt(e.target.value)} placeholder="AT" className="w-11 px-1 py-0.5 text-xs rounded bg-white border border-slate-300 font-mono" />
            <input type="number" value={customBt} onChange={e => setCustomBt(e.target.value)} min="1" className="w-11 px-1 py-0.5 text-xs rounded bg-white border border-slate-300 font-mono" placeholder="BT" />
            <input type="number" value={customPriority} onChange={e => setCustomPriority(e.target.value)} min="1" className="w-11 px-1 py-0.5 text-xs rounded bg-white border border-slate-300 font-mono" placeholder="Pri" />
            <button onClick={handleAddCustom} className="flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition">
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="hidden lg:block h-6 w-px bg-slate-200" />

          <button onClick={reset} className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition">
            <RefreshCw size={16} className={isRunning ? "animate-spin" : ""} />
          </button>
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg font-bold transition text-sm border whitespace-nowrap ${isRunning ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-slate-900 text-white hover:bg-slate-800 border-transparent shadow-md'}`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </div>
      </header>

      {/* GLOBAL QUEUE BAR (conditional) */}
      {isGlobalContext && (
        <div className={`flex flex-col sm:flex-row items-center sm:justify-start justify-center gap-2 sm:gap-3 px-5 py-2 sm:py-1.5 border-b shrink-0 ${isWorkStealing ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white/60 border-slate-200'}`}>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Ready Queue</span>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {globalQueue.length === 0 ? (
              <span className="text-slate-300 text-xs italic">Empty</span>
            ) : (
              globalQueue.map(p => (
                <div key={p.id} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700 shrink-0" style={{ borderLeftColor: p.color, borderLeftWidth: '3px' }}>
                  {p.id} <span className="text-slate-400 text-[10px]">BT:{p.burstTime}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT — Cores LEFT, Charts RIGHT ===== */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-2.5 p-2.5 overflow-y-auto lg:overflow-hidden relative z-10 min-h-0">

        {/* LEFT PANEL: Cores */}
        <div className="w-full lg:w-[55%] flex flex-col gap-2 min-h-0 shrink-0 lg:shrink-1">
          {/* Pending Arrivals */}
          {pendingArrivals.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold py-1.5 px-4 rounded-lg border border-blue-200 shrink-0">
              <Clock size={14} className="animate-pulse" />
              {pendingArrivals.length} Arrival{pendingArrivals.length > 1 ? 's' : ''} · Next AT: {pendingArrivals[0].arrivalTime}
            </div>
          )}

          {/* Core Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto min-h-0" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
            {cores.map(core => (
              <CoreVisualizer key={core.id} core={core} isAntiGravity={isWorkStealing} />
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Metrics + Charts + Gantt */}
        <div className="w-full lg:w-[45%] flex flex-col gap-2 min-h-0 shrink-0 lg:shrink flex-1 lg:flex-none mb-10 lg:mb-0">

          {/* Metrics Row */}
          <div className="flex gap-2 shrink-0">
            <CompactMetric label="Throughput" value={`${metrics.tickCount > 0 ? ((metrics.totalThroughput / (metrics.tickCount * 0.05)).toFixed(1)) : '0.0'} jobs/s`} />
            <CompactMetric label="Avg Wait" value={`${metrics.averageWaitTime.toFixed(1)}t`} />
            <CompactMetric label="Time Quantum" value={`${metrics.tickCount}T`} />
          </div>

          {/* 2×2 Chart Grid — each chart expands from its own corner on hover */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1 min-h-[500px] lg:min-h-0">
            {CHART_DEFS.map((chart, idx) => {
              const isHovered = hoveredChart === chart.id;
              return (
                <div
                  key={chart.id}
                  className="relative min-h-0"
                  style={{ zIndex: isHovered ? 30 : 1, overflow: 'visible' }}
                >
                  {/* ── Small Thumbnail (always visible, keeps layout) ── */}
                  <div
                    onMouseEnter={() => showZoom(chart.id)}
                    onMouseLeave={scheduleHideZoom}
                    className={`h-full glass-card bg-white rounded-xl p-2.5 pb-1.5 cursor-pointer transition-all flex flex-col min-h-0 ${isHovered ? 'border-transparent opacity-30' : 'border border-slate-200 hover:border-blue-200'
                      }`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: chart.accent }}
                  >
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 leading-tight">{chart.title}</span>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          {ALGO_OPTIONS.map(algo => (
                            <Line key={algo.value} type="monotone" dataKey={`${algo.value}${chart.suffix}`} stroke={algoColors[algo.value]} strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── Expanded Chart (positioned from this chart's corner) ── */}
                  {isHovered && (
                    <div
                      className="absolute bg-white rounded-xl shadow-2xl p-3 flex flex-col animate-zoom-in"
                      style={{ ...EXPAND_POSITIONS[idx], borderWidth: '2px', borderStyle: 'solid', borderColor: chart.accent }}
                      onMouseEnter={() => showZoom(chart.id)}
                      onMouseLeave={() => setHoveredChart(null)}
                    >
                      <div className="flex items-center gap-2 mb-1 shrink-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chart.accent }} />
                        <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">{chart.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mb-1 shrink-0">{chart.subtitle}</span>
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 22, left: 15 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis
                                dataKey="tick"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: 'Time (ticks)', position: 'insideBottom', offset: -14, fontSize: 10, fill: '#64748b' }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                label={{ value: chart.yLabel, angle: -90, position: 'insideLeft', offset: -5, fontSize: 10, fill: '#64748b', style: { textAnchor: 'middle' } }}
                              />
                              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                              {ALGO_OPTIONS.map(algo => (
                                <Line
                                  key={algo.value}
                                  type="monotone"
                                  dataKey={`${algo.value}${chart.suffix}`}
                                  name={algo.value}
                                  stroke={algoColors[algo.value]}
                                  strokeWidth={2}
                                  dot={false}
                                  connectNulls={false}
                                  isAnimationActive={false}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Custom legend rendered outside the chart SVG to avoid overlap */}
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-2 pt-1 shrink-0">
                          {ALGO_OPTIONS.map(algo => (
                            <div key={algo.value} className="flex items-center gap-1">
                              <div className="w-3 h-0.5 rounded-full shrink-0" style={{ backgroundColor: algoColors[algo.value] }} />
                              <span className="text-[8px] text-slate-500 font-semibold uppercase">{algo.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compact Gantt */}
          <div className="shrink-0" style={{ overflow: 'visible', position: 'relative', zIndex: 20 }}>
            <GanttChart completedProcesses={completedProcesses} isAntiGravity={isWorkStealing} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compact Metric Card ── */
function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 glass-card bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between group hover:border-blue-200 transition-colors">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">{value}</span>
    </div>
  );
}
