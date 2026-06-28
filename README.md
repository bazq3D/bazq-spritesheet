# bazq gif to spritesheet studio

> A free, open-source desktop developer tool to convert one or multiple animated GIFs into optimized, grid-aligned spritesheets — with full frame-level control.

Designed for game developers, UI designers, and creators that need precise texture sheets and coordinate metadata. Runs entirely **offline** as a native Windows desktop application.

---

## Key Features

### 🎞️ Frame Control
- **Per-GIF Frame Downsampling** — Mathematically downsample high-frame-rate GIFs (e.g. reduce a 200-frame GIF to exactly 16 frames) while preserving animation flow.
- **Custom Frame Selection (Text Input)** — Specify exact frames via comma-separated indices or ranges (e.g. `0-9, 12, 15-20`).
- **Visual Frame Selector** — Click "Select Frames Visually" to open a full modal grid of every frame as a thumbnail. Toggle individual frames, or use quick-action tools:
  - **Select All / Clear All / Invert**
  - **Select Every Nth Frame** — auto-sample every 2nd, 3rd, etc. frame in one click.

### 🗂️ Multi-GIF Merging & Management
- Drag and drop multiple GIFs to combine them sequentially into a single spritesheet.
- Reorder files with **Move Up / Move Down**, toggle inclusion, or remove individual files.
- Each GIF has independent settings: frame count, custom frame selection, and fit mode.

### 📐 Layout & Resolution
- **Custom Grid Layouts** — Grid, Horizontal Row, or Vertical Column. Untick *Auto Grid* to specify exact columns and rows (e.g. `9 x 7`).
- **Explicit Total Resolution** — Define the exact output pixel dimensions of the spritesheet (e.g. `2048 x 2048`). Frame sizes are auto-calculated to fit.
- **Per-GIF Fit Modes** — Choose **Stretch to Fill** or **Aspect Fit (Contain)** individually per GIF to handle vertical or differently-sized animations.
- **Spacing**, **Direction** (Row-major / Column-major), and transparent or custom **Background Color**.

### 🔍 Preview & Player
- **Interactive Zoom & Pan** — Scroll-wheel zoom and click-drag panning for pixel-level inspection.
- **Enlarged Animation Player** — Live preview of the final animation with:
  - Real spritesheet frame dimensions and background applied.
  - Per-GIF fit mode rendering (stretch vs. contain).
  - Custom **FPS** control and **per-GIF or combined** playback selection.

### 📦 Export
- Download the compiled spritesheet as a high-quality **PNG**.
- Export frame coordinates as a **JSON metadata** file (frame index, GIF source, x/y/w/h, delay).

---

## How to Run & Build

This application is built using **Electron** and runs entirely offline — no internet connection required after setup.

### Prerequisites

- [Node.js](https://nodejs.org/) (includes `npm`)

### Local Development

```bash
# 1. Clone this repository
git clone https://github.com/bazq3D/bazq-spritesheet.git
cd bazq-spritesheet

# 2. Install dependencies
npm install

# 3. Start the Electron app
npm start
```

### Compile Standalone Executable

To build a single portable Windows `.exe` that runs without Node.js or any installation:

```bash
npm run build:exe
```

Output: `dist/bazq-gif-to-spritesheet-studio 1.0.0.exe`

> **Note:** Close the app before rebuilding to avoid file lock errors.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Electron](https://www.electronjs.org/) v28 |
| UI | HTML5 + Vanilla CSS + ES Modules |
| GIF Decoder | [gifuct-js](https://github.com/matt-way/gifuct-js) v2.1.2 |
| Packaging | [electron-builder](https://www.electron.build/) v24 |

---

## AI Disclosure

This project was developed with the assistance of **Google DeepMind's Antigravity AI coding assistant (Gemini)** for code generation, architecture planning, and implementation.

---

## License

This project is licensed under the **MIT License** — free and open for personal and commercial use.

```
MIT License

Copyright (c) 2026 bazq

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
