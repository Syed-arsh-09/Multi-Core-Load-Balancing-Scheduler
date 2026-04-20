# Multi-Core Load Balancing Scheduler

A high-performance, interactive multi-core CPU scheduling simulator built with React, Tailwind CSS, and Node.js. This application visualizes process scheduling algorithms in real-time, allowing users to compare global and per-core scheduling strategies, including advanced Work Stealing load balancing.

## Features

- **Real-Time Visualization**: Dynamic Gantt-style timeline and live per-core process readiness queues.
- **Multiple Scheduling Algorithms**:
  - Global: First Come First Serve (FCFS), Round Robin (RR), Shortest Job First (SJF), Shortest Remaining Time First (SRTF)
  - Per-Core: Work Stealing, Push/Pull Migration, Completely Fair Scheduler (CFS), CPU Affinity
- **Interactive UI**: Change algorithms on the fly, adjust time quantums, and manually inject custom processes on the running timeline dynamically.
- **Responsive Layout**: Designed thoroughly via responsive Tailwind patterns to seamlessly format for multithreading views on broad desktop monitors, while ensuring responsive, zoom-able charts directly inside a single-column orientation for mobile devices. 
- **Analytics Dashboard**: Tracks comprehensive metrics (Throughput, Avg Wait, Response Time, CPU Variance, and Load Migrations) with beautiful Recharts data comparisons updating in real-time.
- **Auto-Spawn**: Simulate realistic chaotic environments by continuously generating randomized workloads.

## Architecture Overview

The system architecture is designed around a tight simulation loop coupled with an event-driven React frontend to visualize multi-processor execution states:

- **State Management Unit**: Centralized custom React hook (`useSimulation`) acts as the CPU clock mechanism. It ticks consistently, managing the global ready queue, individual core states, active algorithms, and metrics.
- **Scheduling Engine**: Implements the logic for various CPU scheduling algorithms. Global algorithms operate on a single shared queue, while Per-Core algorithms maintain internal queues per processor utilizing load-balancing heuristics to transfer tasks across core boundaries dynamically.
- **Visualizer Subsystems**: 
  - `CoreVisualizer`: Renders live states (idle/executing processes, CPU utilization, individual core queues) using smooth Framer Motion transitions.
  - `GanttChart`: Dynamically records and plots the historical timeline of execution, displaying preemption blocks.
- **Metrics Aggregator**: Collects performance statistics mathematically derived per tick, pushing data securely onto Recharts' visual grids. 

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- npm or yarn

### Installation
1. Clone the repository
```bash
git clone https://github.com/Syed-arsh-09/Multi-Core-Load-Balancing-Scheduler.git
```
2. Navigate to the directory
```bash
cd Multi-Core-Load-Balancing-Scheduler
```
3. Install dependencies
```bash
npm install
```

### Running Locally
To launch the development server and test changes:
```bash
npm run dev
```
The application will be available at `http://localhost:5173/`.

### Deployment
This project has baseline configurations appropriate for vite-based static builds mapping onto GitHub Pages deployments. Run `npm run build` to generate `/dist` artifacts.

## Technology Stack
- **Languages**: TypeScript, HTML5, CSS3
- **Frontend Framework**: React 19 
- **Styling**: Tailwind CSS v4
- **Tooling**: Vite (Development & Bundling)
- **Icons**: Lucide React
- **Charts / Animations**: Recharts & Framer Motion
