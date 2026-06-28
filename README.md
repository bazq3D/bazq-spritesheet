# bazq gif to spritesheet studio

A desktop developer tool to convert one or multiple animated GIFs into optimized, grid-aligned spritesheets.

Designed for developers, UI designers, and creators that require precise texture sheets and coordinate metadata.

---

## Key Features

- **Multi-GIF Merging**: Drag and drop multiple GIFs to combine them sequentially into a single spritesheet. Easily reorder, toggle, or remove files.
- **Per-GIF Frame Downsampling**: Mathematically downsample high-frame-rate GIFs (e.g. reduce a 200-frame GIF to exactly 16 or 12 frames) while preserving the speed and flow of the animation.
- **Per-GIF Fit Modes**: Configure individual GIFs to either **Stretch to Fill** the grid cells or use **Aspect Fit (Contain)** to center vertical animations within horizontal cells without stretching.
- **Explicit Total Resolution**: Define the exact output dimensions of the spritesheet (e.g., `2048 x 1024` for a 2x1 aspect ratio). The application automatically calculates individual frame sizes to fit the grid perfectly.
- **Custom Grid Layouts**: Arrange frames in rows, columns, or a grid. Untick *Auto Grid* to specify custom columns and rows (e.g. `4 x 7`).
- **Interactive Zoom & Pan**: Scroll wheel zoom and click-and-drag panning to inspect pixel-level details of large spritesheets.
- **Built-in Animation Player**: Preview the resulting spritesheet animation on-the-fly, with custom FPS controls, either for all combined animations or individual files.
- **Dual Export**: Download the compiled spritesheet as a high-quality **PNG** and export the frame coordinates as a **JSON** metadata file.

---

## How to Run & Build

This application is built as a native desktop program using **Electron** and runs entirely offline.

### Prerequisites

- [Node.js](https://nodejs.org/) (includes `npm`)

### Local Development

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application in the local Electron shell:

   ```bash
   npm start
   ```

### Compile Standalone Executable

To compile the application into a single, portable Windows executable (`.exe`) that can be run without Node.js or installation:

```bash
npm run build:exe
```

The compiled executable will be generated in the `dist/` directory:
`dist/bazq-gif-to-spritesheet-studio 1.0.0.exe`

---

## License

This project is licensed under the **MIT License** - free and open for public and commercial use.

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
