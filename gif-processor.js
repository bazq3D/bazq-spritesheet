import { parseGIF, decompressFrames } from './lib/gifuct.js';

/**
 * Coalesces GIF frames by applying disposal methods and transparency.
 * Reconstructs the full image for each frame sequentially.
 */
export function coalesceFrames(gifuctFrames, baseWidth, baseHeight) {
    const coalescedFrames = [];
    
    // Virtual canvas to build the frames sequentially
    const canvas = document.createElement('canvas');
    canvas.width = baseWidth;
    canvas.height = baseHeight;
    const ctx = canvas.getContext('2d');
    
    // Keep track of the previous canvas states if we need to restore (disposal method 3)
    let lastFrameImageData = null;
    
    for (let i = 0; i < gifuctFrames.length; i++) {
        const frame = gifuctFrames[i];
        
        // 1. Handle disposal of the previous frame
        if (i > 0) {
            const prevFrame = gifuctFrames[i - 1];
            if (prevFrame.disposalType === 2) {
                // Restore to background: clear only the area of the previous frame's patch
                ctx.clearRect(prevFrame.dims.left, prevFrame.dims.top, prevFrame.dims.width, prevFrame.dims.height);
            } else if (prevFrame.disposalType === 3 && lastFrameImageData) {
                // Restore to previous: restore the canvas to the state it was in before the previous frame
                ctx.putImageData(lastFrameImageData, 0, 0);
            }
        }
        
        // Save current canvas state before drawing if this frame's disposal is 3
        if (frame.disposalType === 3) {
            lastFrameImageData = ctx.getImageData(0, 0, baseWidth, baseHeight);
        } else {
            lastFrameImageData = null;
        }
        
        // 2. Draw the current frame's patch
        if (frame.patch) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = frame.dims.width;
            tempCanvas.height = frame.dims.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            const imgData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                frame.dims.width,
                frame.dims.height
            );
            tempCtx.putImageData(imgData, 0, 0);
            
            // Draw the patch onto the main virtual canvas
            ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
        }
        
        // 3. Capture the current canvas state as a new canvas (coalesced frame)
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = baseWidth;
        frameCanvas.height = baseHeight;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.drawImage(canvas, 0, 0);
        
        coalescedFrames.push({
            canvas: frameCanvas,
            delay: frame.delay || 100, // Fallback to 100ms
            width: baseWidth,
            height: baseHeight
        });
    }
    
    return coalescedFrames;
}

/**
 * Parses an ArrayBuffer containing GIF data and returns the coalesced frames and metadata.
 */
export async function parseAndProcessGif(arrayBuffer, fileName) {
    try {
        const gif = parseGIF(arrayBuffer);
        const decompressed = decompressFrames(gif, true);
        
        if (!decompressed || decompressed.length === 0) {
            throw new Error("No frames found in the GIF.");
        }
        
        // Find dimensions from logical screen descriptor
        const baseWidth = gif.lsd.width;
        const baseHeight = gif.lsd.height;
        
        const coalesced = coalesceFrames(decompressed, baseWidth, baseHeight);
        
        return {
            name: fileName,
            frames: coalesced,
            width: baseWidth,
            height: baseHeight,
            frameCount: coalesced.length,
            active: true
        };
    } catch (error) {
        console.error("Error processing GIF:", error);
        throw error;
    }
}

/**
 * Generates a spritesheet and its metadata from a list of processed GIFs.
 */
export function generateSpritesheet(gifs, options) {
    // 1. Gather all frames from active GIFs, applying downsampling if configured
    const allFrames = [];
    const gifRanges = [];
    let currentFrameIndex = 0;
    
    for (const gif of gifs) {
        if (!gif.active) continue;
        const start = currentFrameIndex;
        
        // Extract frames based on customFrameIndices or targetFrameCount
        const originalCount = gif.frames.length;
        const gifFramesToUse = [];
        
        if (gif.customFrameIndices && gif.customFrameIndices.length > 0) {
            gif.customFrameIndices.forEach(idx => {
                if (idx >= 0 && idx < originalCount) {
                    gifFramesToUse.push(gif.frames[idx]);
                }
            });
        } else {
            const targetCount = Math.min(originalCount, parseInt(gif.targetFrameCount) || originalCount);
            if (targetCount === originalCount) {
                gifFramesToUse.push(...gif.frames);
            } else {
                if (targetCount === 1) {
                    gifFramesToUse.push(gif.frames[0]);
                } else {
                    for (let i = 0; i < targetCount; i++) {
                        // Linear downsampling
                        const idx = Math.round(i * (originalCount - 1) / (targetCount - 1));
                        gifFramesToUse.push(gif.frames[idx]);
                    }
                }
            }
        }
        
        for (const frame of gifFramesToUse) {
            allFrames.push({
                canvas: frame.canvas,
                gifId: gif.id,
                gifName: gif.name,
                originalFrame: frame,
                fitMode: gif.fitMode || 'stretch' // Store fitMode per GIF
            });
            currentFrameIndex++;
        }
        
        const end = currentFrameIndex - 1;
        gifRanges.push({
            gifId: gif.id,
            name: gif.name,
            start,
            end,
            frameCount: gifFramesToUse.length
        });
    }
    
    const totalFrames = allFrames.length;
    if (totalFrames === 0) {
        return { canvas: null, metadata: null };
    }
    
    // 2. Determine Grid columns and rows
    let cols = 1;
    let rows = 1;
    
    if (options.layoutMode === 'horizontal') {
        cols = totalFrames;
        rows = 1;
    } else if (options.layoutMode === 'vertical') {
        cols = 1;
        rows = totalFrames;
    } else {
        // Grid mode
        cols = parseInt(options.gridCols) || 1;
        if (options.autoRows !== false) {
            rows = Math.ceil(totalFrames / cols);
        } else {
            rows = parseInt(options.gridRows) || 1;
        }
    }
    
    const spacing = parseInt(options.spacing) || 0;
    
    // 3. Determine Resolution and Frame Dimensions
    let canvasWidth = 0;
    let canvasHeight = 0;
    let frameWidth = 0;
    let frameHeight = 0;
    
    if (options.resMode === 'fixed') {
        // Fixed Spritesheet Size mode (e.g. 2048 x 1024)
        canvasWidth = parseInt(options.totalWidth) || 1024;
        canvasHeight = parseInt(options.totalHeight) || 1024;
        
        // Calculate individual frame size to fit exactly in this canvas (accounting for spacing)
        frameWidth = (canvasWidth - (cols - 1) * spacing) / cols;
        frameHeight = (canvasHeight - (rows - 1) * spacing) / rows;
    } else {
        // Scale of Original mode
        let baseFrameWidth = 0;
        let baseFrameHeight = 0;
        for (const gif of gifs) {
            if (!gif.active) continue;
            baseFrameWidth = Math.max(baseFrameWidth, gif.width);
            baseFrameHeight = Math.max(baseFrameHeight, gif.height);
        }
        
        if (options.fixedSize && options.fixedSize.width > 0 && options.fixedSize.height > 0) {
            frameWidth = options.fixedSize.width;
            frameHeight = options.fixedSize.height;
        } else if (options.scale) {
            frameWidth = Math.round(baseFrameWidth * options.scale);
            frameHeight = Math.round(baseFrameHeight * options.scale);
        }
        
        canvasWidth = cols * (frameWidth + spacing) - spacing;
        canvasHeight = rows * (frameHeight + spacing) - spacing;
    }
    
    // Create the final spritesheet canvas
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    
    // 4. Draw each frame onto the spritesheet
    const metadataFrames = [];
    const maxFrames = Math.min(totalFrames, cols * rows);
    
    for (let i = 0; i < maxFrames; i++) {
        const frame = allFrames[i];
        
        // Calculate grid position based on direction
        let col, row;
        if (options.direction === 'col') {
            // Column-major: down, then right
            row = i % rows;
            col = Math.floor(i / rows);
        } else {
            // Row-major: right, then down
            col = i % cols;
            row = Math.floor(i / cols);
        }
        
        const x = col * (frameWidth + spacing);
        const y = row * (frameHeight + spacing);
        
        ctx.save();
        
        const srcW = frame.canvas.width;
        const srcH = frame.canvas.height;
        
        // Draw the frame applying its individual fitMode
        if (frame.fitMode === 'contain') {
            // Aspect contain (letterbox)
            const ratio = Math.min(frameWidth / srcW, frameHeight / srcH);
            const drawW = srcW * ratio;
            const drawH = srcH * ratio;
            const offsetX = x + (frameWidth - drawW) / 2;
            const offsetY = y + (frameHeight - drawH) / 2;
            ctx.drawImage(frame.canvas, offsetX, offsetY, drawW, drawH);
        } else {
            // Stretch to fill
            ctx.drawImage(frame.canvas, x, y, frameWidth, frameHeight);
        }
        
        ctx.restore();
        
        // Add to metadata
        metadataFrames.push({
            index: i,
            gifId: frame.gifId,
            gifName: frame.gifName,
            x,
            y,
            w: frameWidth,
            h: frameHeight,
            delay: frame.originalFrame.delay
        });
    }
    
    const metadata = {
        generator: "bazq-gif-to-spritesheet-studio",
        totalFrames,
        layout: {
            mode: options.layoutMode,
            cols,
            rows,
            spacing,
            direction: options.direction,
            frameWidth,
            frameHeight
        },
        spritesheet: {
            width: canvasWidth,
            height: canvasHeight
        },
        gifs: gifRanges,
        frames: metadataFrames
    };
    
    return { canvas, metadata };
}

/**
 * Programmatically generates a beautiful, glowing demo animation.
 * Returns a mock GIF object with 24 coalesced canvas frames.
 */
export function generateDemoGIF(demoType = 'neon-ring') {
    const width = 128;
    const height = 128;
    const frameCount = 24;
    const frames = [];
    
    for (let f = 0; f < frameCount; f++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const angle = (f / frameCount) * Math.PI * 2;
        
        // Draw a beautiful glowing cybernetic particle system (bazq style: blue/purple)
        ctx.shadowBlur = 0;
        
        // Draw orbital trails
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)'; // Violet trail
        ctx.beginPath();
        ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)'; // Blue trail
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw central pulsing orb
        const pulse = 10 + Math.sin(angle * 2) * 3;
        const orbGradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, pulse);
        orbGradient.addColorStop(0, '#ffffff');
        orbGradient.addColorStop(0.3, '#3b82f6'); // Royal blue
        orbGradient.addColorStop(1, 'rgba(124, 58, 237, 0)'); // Purple fade
        
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw orbiting particle 1 (Violet)
        const p1X = centerX + Math.cos(angle) * 35;
        const p1Y = centerY + Math.sin(angle) * 35;
        
        ctx.shadowColor = '#8b5cf6';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(p1X, p1Y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw orbiting particle 2 (Cyan, opposite direction)
        const p2X = centerX + Math.cos(-angle * 2 + Math.PI) * 20;
        const p2Y = centerY + Math.sin(-angle * 2 + Math.PI) * 20;
        
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(p2X, p2Y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw minor details (crosshairs/ticks for high-tech look)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)'; // Cyan
        ctx.lineWidth = 1;
        
        // Ticks
        for (let i = 0; i < 4; i++) {
            const tickAngle = angle + (i * Math.PI / 2);
            const startR = 45;
            const endR = 48;
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(tickAngle) * startR, centerY + Math.sin(tickAngle) * startR);
            ctx.lineTo(centerX + Math.cos(tickAngle) * endR, centerY + Math.sin(tickAngle) * endR);
            ctx.stroke();
        }
        
        frames.push({
            canvas: canvas,
            delay: 60, // ~16 FPS
            width: width,
            height: height
        });
    }
    
    return {
        name: "demo_cyber_orb.gif",
        frames: frames,
        width: width,
        height: height,
        frameCount: frameCount,
        active: true
    };
}
