# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to loosely chronological updates.

## [1.0.0] - First Public Release (2026-04-19)

### Added
- Comprehensive 2x2 grid of comparative performance benchmark charts (CPU Utilization Balance, Response Time, Throughput, Migration Count).
- SEO metadata and descriptions added to `index.html`.
- NPM metadata updated with correct version, author, and description in `package.json`.
- `LICENSE` file (MIT License).
- Live visualization of Gantt charts with detailed tooltip information for wait times and assigned cores.
- Interactive dashboard UI allowing users to dynamically spawn processes with distinct priority, duration, and target behavior.
- Support for 8 algorithms (FCFS, RR, SJF, SRTF, Work Stealing, Push/Pull Migration, CFS, CPU Affinity).
- Visual animations when cores trigger task migrations to balance heavy loads.
- Custom dropdown component in `Dashboard.tsx` to replace the native browser `<select>` element.

### Changed
- Refined Dashboard layout to properly center visual elements and charts without clipping.
- Modified Gantt charts to track the last 30 processes with distinct styling for clarity.
- Simulation engine ticks and auto-spawns optimized for a stable queue flow.
- Improved standard select menu with a completely custom floating component with polished aesthetics. 

### Fixed
- Chart rendering glitches when switching active scheduling algorithms over long runs.
- Fixed the "edgy" look of the dropdown menu by enforcing consistent Tailwind styling.
- Replaced the default `@theme` CSS directive with native `:root` CSS variables to resolve tailwind warnings.
