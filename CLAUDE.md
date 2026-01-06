# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A browser-based inpainting playground that uses Google's Gemini API to perform AI-powered image inpainting. Users can upload images, select regions (rectangle or lasso), optionally spray paint hints, and generate AI-modified content within the selection.

## Commands

```bash
npm run dev    # Start development server on http://localhost:4000
npm start      # Same as dev
```

## Architecture

**Backend** (`server/index.js`): Express server with two endpoints:
- `GET /api/config` - Returns available Gemini models and default endpoint
- `POST /api/inpaint` - Proxies inpainting requests to Gemini API, handles image/mask data

**Frontend** (`public/`): Single-page vanilla JS application
- `main.js` - All application logic: canvas rendering, selection tools, spray paint, zoom, API calls
- `index.html` - UI layout with sidebar controls and main canvas workspace
- `styles.css` - Dark/light theme support via CSS variables

**Key Frontend State** (`state` object in `main.js`):
- Manages image data, selection paths, spray canvas layer, zoom level, processing state
- Two stacked canvases: `imageCanvas` (base image) + `overlayCanvas` (selection/spray preview)
- Separate off-screen `sprayCanvas` for paint accumulation

## Environment Variables

Create `.env` in project root:
```
GEMINI_API_KEY=your_api_key      # Required if not provided in UI
GEMINI_MODELS=model1,model2      # Optional comma-separated model list
GEMINI_API_ENDPOINT=url          # Optional custom endpoint
PORT=4000                        # Server port
```

## Debug Output

Failed Gemini responses are saved to `debug/` directory as timestamped JSON files for troubleshooting.
