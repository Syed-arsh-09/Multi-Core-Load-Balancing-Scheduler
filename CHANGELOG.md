# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to loosely chronological updates.

## [Unreleased] - 2026-04-02 21:52:00 IST

### Added
- Created `CHANGELOG.md` to track project updates, UI refinements, and feature additions chronologically.
- Replaced the default boilerplate `README.md` with a descriptive project summary tailored for GitHub repositories.
- Custom CSS keyframe animation (`@keyframes slide-down`) in `index.css` for a fluid, snappy popup interaction.
- Custom dropdown component in `Dashboard.tsx` to replace the native browser `<select>` element. 

### Changed
- Improved standard select menu with a completely custom floating component with polished aesthetics (rounded-2xl) and box shadows, resolving the harsh highlight border and un-stylable lower corners of native UI elements.

### Fixed
- Fixed the "edgy" look of the dropdown menu by enforcing consistent Tailwind border-radius styling throughout the entire menu.
