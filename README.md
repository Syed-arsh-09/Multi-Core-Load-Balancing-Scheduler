# Multi-Core Load Balancing Scheduler

A high-performance, interactive multi-core CPU scheduling simulator built with React, Tailwind CSS, and Node.js. This application visualizes process scheduling algorithms in real-time, allowing users to compare global and per-core scheduling strategies, including advanced Work Stealing load balancing.

## Features

- **Real-Time Visualization**: Dynamic Gantt-style charts and live per-core process queues.
- **Multiple Scheduling Algorithms**:
  - Global: First Come First Serve (FCFS), Round Robin (RR), Shortest Job First (SJF), Shortest Remaining Time First (SRTF)
  - Per-Core: Work Stealing, Push/Pull Migration, Completely Fair Scheduler (CFS), CPU Affinity
- **Interactive UI**: Change algorithms on the fly, adjust time quantums, and spawn custom processes dynamically.
- **Analytics Dashboard**: Tracks system throughput, average wait times, and total simulation ticks with historical comparison graphs.
- **Auto-Spawn**: Simulate real-world loads with randomized process generation.

## Architecture Overview

The system architecture is designed around a tight simulation loop coupled with an event-driven React frontend to visualize multi-processor execution states:

- **State Management Unit**: Centralized custom React hook (`useSimulation`) acts as the CPU clock mechanism. It ticks consistently, managing the global ready queue, individual core states, active algorithms, and metrics.
- **Scheduling Engine**: Implements the logic for various CPU scheduling algorithms. Global algorithms (e.g., FCFS, RR) operate on a single shared queue, while Per-Core algorithms (e.g., Work Stealing) maintain internal queues per processor and use load-balancing heuristics to transfer tasks dynamically.
- **Visualizer Subsystems**: 
  - `CoreVisualizer`: Renders live states (idle/executing processes, CPU utilization, individual core queues) using smooth CSS transitions.
  - `GanttChart`: Dynamically records and plots the historical timeline of execution, displaying preemption blocks across the time axis.
- **Metrics Aggregator**: Synchronizes historical throughput and average wait time per algorithm, which is visualized by Recharts to provide real-time, comparative graphs.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- npm or yarn

### Installation
1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173/`.

## Technology Stack
- **Frontend Framework**: React + TypeScript
- **Styling**: Tailwind CSS + Vanilla CSS (for custom animations and aesthetics)
- **Tooling**: Vite
- **Icons**: Lucide React
- **Charts**: Recharts
