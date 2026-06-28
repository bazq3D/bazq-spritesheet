import { parseAndProcessGif, generateSpritesheet, generateDemoGIF } from './gif-processor.js';

// Application State
const state = {
    gifs: [],
    generatedSpritesheet: null,
    selectedGifId: null, // Track currently selected GIF in sidebar listbox
    
    // Zoom and Pan for Preview
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    
    // Animation Player
    isPlaying: false,
    playerFrameIndex: 0,
    playerTimeout: null,
    playerActiveFrames: [],
    
    // Modal state
    modalSelectedIndices: new Set(),
    modalGif: null
};

// DOM Elements
const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    btnLoadDemo: document.getElementById('btnLoadDemo'),
    btnClearAll: document.getElementById('btnClearAll'),
    btnRemoveSelected: document.getElementById('btnRemoveSelected'),
    btnMoveUp: document.getElementById('btnMoveUp'),
    btnMoveDown: document.getElementById('btnMoveDown'),
    gifList: document.getElementById('gifList'),
    gifCount: document.getElementById('gifCount'),
    
    // Per-GIF Settings (Sidebar)
    selectedFileSettings: document.getElementById('selectedFileSettings'),
    selectedFileName: document.getElementById('selectedFileName'),
    gifTargetFrames: document.getElementById('gifTargetFrames'),
    gifFrameSelection: document.getElementById('gifFrameSelection'),
    btnSelectFramesVisually: document.getElementById('btnSelectFramesVisually'),
    gifFitMode: document.getElementById('gifFitMode'),
    
    // Layout Controls
    layoutMode: document.getElementById('layoutMode'),
    gridCols: document.getElementById('gridCols'),
    gridRows: document.getElementById('gridRows'),
    autoGrid: document.getElementById('autoGrid'),
    autoRows: document.getElementById('autoRows'),
    lblAutoRows: document.getElementById('lblAutoRows'),
    spacing: document.getElementById('spacing'),
    direction: document.getElementById('direction'),
    bgTransparent: document.getElementById('bgTransparent'),
    bgColor: document.getElementById('bgColor'),
    bgColorText: document.getElementById('bgColorText'),
    
    // Scaling & Resolution Controls
    resMode: document.getElementById('resMode'),
    scale: document.getElementById('scale'),
    scaleValue: document.getElementById('scaleValue'),
    totalWidth: document.getElementById('totalWidth'),
    totalHeight: document.getElementById('totalHeight'),
    overrideSize: document.getElementById('overrideSize'),
    frameWidth: document.getElementById('frameWidth'),
    frameHeight: document.getElementById('frameHeight'),
    fitMode: document.getElementById('fitMode'),
    
    // Preview & Status
    previewContainer: document.getElementById('previewContainer'),
    canvasWrapper: document.getElementById('canvasWrapper'),
    spritesheetCanvas: document.getElementById('spritesheetCanvas'),
    canvasWarning: document.getElementById('canvasWarning'),
    zoomBadge: document.getElementById('zoomBadge'),
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnZoomReset: document.getElementById('btnZoomReset'),
    
    statusTotalFrames: document.getElementById('statusTotalFrames'),
    statusDimensions: document.getElementById('statusDimensions'),
    statusGrid: document.getElementById('statusGrid'),
    
    // Player
    playerCanvas: document.getElementById('playerCanvas'),
    btnPlayPause: document.getElementById('btnPlayPause'),
    playText: document.getElementById('playText'),
    pauseText: document.getElementById('pauseText'),
    playerGifSelect: document.getElementById('playerGifSelect'),
    playerFps: document.getElementById('playerFps'),
    
    // Export
    btnDownloadPNG: document.getElementById('btnDownloadPNG'),
    btnDownloadJSON: document.getElementById('btnDownloadJSON'),
    
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    
    // Modal
    frameSelectorModal: document.getElementById('frameSelectorModal'),
    modalGifName: document.getElementById('modalGifName'),
    btnModalClose: document.getElementById('btnModalClose'),
    btnModalSelectAll: document.getElementById('btnModalSelectAll'),
    btnModalClearAll: document.getElementById('btnModalClearAll'),
    btnModalInvert: document.getElementById('btnModalInvert'),
    modalNthInput: document.getElementById('modalNthInput'),
    btnModalNth: document.getElementById('btnModalNth'),
    modalFrameGrid: document.getElementById('modalFrameGrid'),
    modalStatusText: document.getElementById('modalStatusText'),
    btnModalCancel: document.getElementById('btnModalCancel'),
    btnModalApply: document.getElementById('btnModalApply')
};

// Initialize Application
function init() {
    setupEventListeners();
    updateUIControlsState();
    resetZoomAndPan();
}

// Set up UI Event Listeners
function setupEventListeners() {
    // File Upload Drag and Drop
    elements.dropzone.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    elements.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropzone.classList.add('dragover');
    });
    
    elements.dropzone.addEventListener('dragleave', () => {
        elements.dropzone.classList.remove('dragover');
    });
    
    elements.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    });

    // Demo & List Management Buttons
    elements.btnLoadDemo.addEventListener('click', loadDemoAnimation);
    elements.btnClearAll.addEventListener('click', clearAllGifs);
    elements.btnRemoveSelected.addEventListener('click', removeSelectedGif);
    elements.btnMoveUp.addEventListener('click', () => moveSelectedGif(-1));
    elements.btnMoveDown.addEventListener('click', () => moveSelectedGif(1));

    // Per-GIF Settings inputs
    elements.gifTargetFrames.addEventListener('input', () => {
        const gif = state.gifs.find(g => g.id === state.selectedGifId);
        if (gif) {
            const maxVal = gif.frames.length;
            let val = parseInt(elements.gifTargetFrames.value) || 1;
            val = Math.max(1, Math.min(maxVal, val));
            gif.targetFrameCount = val;
            
            // When manually setting downsample count, clear custom selection
            gif.customFrameIndices = null;
            elements.gifFrameSelection.value = "";
            
            // Re-render to update frame counts in listbox
            renderGifsList();
            refreshSpritesheet();
            setupPlayerAnimation();
        }
    });

    elements.gifFrameSelection.addEventListener('input', () => {
        const gif = state.gifs.find(g => g.id === state.selectedGifId);
        if (gif) {
            const val = elements.gifFrameSelection.value;
            const parsed = parseFrameSelection(val, gif.frames.length);
            gif.customFrameIndices = parsed;
            gif.targetFrameCount = parsed ? parsed.length : gif.frames.length;
            
            // Re-render
            renderGifsList();
            refreshSpritesheet();
            setupPlayerAnimation();
        }
    });

    elements.btnSelectFramesVisually.addEventListener('click', openVisualFrameSelector);

    elements.gifFitMode.addEventListener('change', () => {
        const gif = state.gifs.find(g => g.id === state.selectedGifId);
        if (gif) {
            gif.fitMode = elements.gifFitMode.value;
            refreshSpritesheet();
            setupPlayerAnimation();
        }
    });

    // Modal Event Listeners
    elements.btnModalClose.addEventListener('click', closeVisualFrameSelector);
    elements.btnModalCancel.addEventListener('click', closeVisualFrameSelector);
    elements.btnModalApply.addEventListener('click', applyVisualFrameSelection);
    elements.btnModalSelectAll.addEventListener('click', modalSelectAll);
    elements.btnModalClearAll.addEventListener('click', modalClearAll);
    elements.btnModalInvert.addEventListener('click', modalInvertSelection);
    elements.btnModalNth.addEventListener('click', modalSelectEveryNth);
    elements.frameSelectorModal.addEventListener('click', (e) => {
        if (e.target === elements.frameSelectorModal) {
            closeVisualFrameSelector();
        }
    });

    // Layout & Scaling Controls
    const updateInputs = [
        elements.layoutMode, elements.gridCols, elements.gridRows,
        elements.autoGrid, elements.autoRows,
        elements.spacing, elements.direction, elements.bgTransparent,
        elements.bgColor, elements.overrideSize, elements.frameWidth,
        elements.frameHeight, elements.fitMode, elements.resMode,
        elements.totalWidth, elements.totalHeight
    ];
    
    updateInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateUIControlsState();
            refreshSpritesheet();
        });
    });

    // Numerical inputs trigger redraws on input (realtime)
    elements.totalWidth.addEventListener('input', refreshSpritesheet);
    elements.totalHeight.addEventListener('input', refreshSpritesheet);

    elements.bgColor.addEventListener('input', (e) => {
        elements.bgColorText.value = e.target.value.toUpperCase();
        refreshSpritesheet();
    });

    elements.bgColorText.addEventListener('input', (e) => {
        let val = e.target.value;
        if (val.match(/^#[0-9A-F]{6}$/i)) {
            elements.bgColor.value = val;
            refreshSpritesheet();
        }
    });

    elements.scale.addEventListener('input', (e) => {
        const val = Math.round(e.target.value * 100);
        elements.scaleValue.textContent = `${val}%`;
        refreshSpritesheet();
    });

    // Zoom and Pan Interactions
    elements.btnZoomIn.addEventListener('click', () => adjustZoom(1.2));
    elements.btnZoomOut.addEventListener('click', () => adjustZoom(0.8));
    elements.btnZoomReset.addEventListener('click', resetZoomAndPan);
    
    elements.previewContainer.addEventListener('wheel', handleWheelZoom, { passive: false });
    elements.previewContainer.addEventListener('mousedown', startPan);
    window.addEventListener('mousemove', drawPan);
    window.addEventListener('mouseup', stopPan);

    // Player Controls
    elements.btnPlayPause.addEventListener('click', togglePlayer);
    elements.playerGifSelect.addEventListener('change', setupPlayerAnimation);
    elements.playerFps.addEventListener('change', () => {
        if (state.isPlaying) {
            stopPlayerLoop();
            startPlayerLoop();
        }
    });

    // Export Triggers
    elements.btnDownloadPNG.addEventListener('click', downloadSpritesheetPNG);
    elements.btnDownloadJSON.addEventListener('click', downloadMetadataJSON);
}

// Show/Hide Loading Spinner
function showLoading(text) {
    elements.loadingText.textContent = text || "Processing...";
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// Enable/Disable UI controls dynamically based on settings
function updateUIControlsState() {
    // Grid Options
    const isGrid = elements.layoutMode.value === 'grid';
    const isAutoGrid = elements.autoGrid.checked;
    
    document.querySelectorAll('.grid-only').forEach(el => {
        el.style.display = isGrid ? 'flex' : 'none';
    });
    
    elements.gridCols.disabled = !isGrid || isAutoGrid;
    
    // Auto Rows visibility and state
    if (isGrid && !isAutoGrid) {
        elements.lblAutoRows.style.display = 'flex';
        const isAutoRows = elements.autoRows.checked;
        elements.gridRows.disabled = isAutoRows;
        
        if (isAutoRows) {
            let totalFrames = 0;
            state.gifs.forEach(gif => {
                if (gif.active) {
                    totalFrames += Math.min(gif.frames.length, parseInt(gif.targetFrameCount) || gif.frames.length);
                }
            });
            const cols = parseInt(elements.gridCols.value) || 1;
            elements.gridRows.value = Math.ceil(totalFrames / cols) || 1;
        }
    } else {
        elements.lblAutoRows.style.display = 'none';
        elements.gridRows.disabled = true;
        if (isGrid && isAutoGrid) {
            let totalFrames = 0;
            state.gifs.forEach(gif => {
                if (gif.active) {
                    totalFrames += Math.min(gif.frames.length, parseInt(gif.targetFrameCount) || gif.frames.length);
                }
            });
            const cols = Math.ceil(Math.sqrt(totalFrames)) || 1;
            const rows = Math.ceil(totalFrames / cols) || 1;
            elements.gridCols.value = cols;
            elements.gridRows.value = rows;
        }
    }
    
    // Background Options
    const isTransparent = elements.bgTransparent.checked;
    elements.bgColor.disabled = isTransparent;
    elements.bgColorText.disabled = isTransparent;

    // Resolution Mode Options
    const mode = elements.resMode.value;
    if (mode === 'fixed') {
        document.querySelectorAll('.res-fixed-only').forEach(el => el.style.display = 'flex');
        document.querySelectorAll('.res-scale-only').forEach(el => el.style.display = 'none');
        // Hide individual override size when fixed total size is active
        document.querySelectorAll('.size-override').forEach(el => el.style.display = 'none');
    } else {
        document.querySelectorAll('.res-fixed-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.res-scale-only').forEach(el => el.style.display = 'flex');
        
        // Show size overrides based on original scale checkbox
        const isOverride = elements.overrideSize.checked;
        document.querySelectorAll('.size-override').forEach(el => {
            el.style.display = isOverride ? 'flex' : 'none';
        });
        elements.scale.disabled = isOverride;
        if (isOverride) {
            elements.scaleValue.style.opacity = '0.5';
        } else {
            elements.scaleValue.style.opacity = '1';
        }
    }

    // Per-GIF Settings Panel Visibility
    const selectedGif = state.gifs.find(g => g.id === state.selectedGifId);
    if (selectedGif) {
        elements.selectedFileSettings.style.display = 'block';
        elements.selectedFileName.textContent = `File Settings: ${selectedGif.name}`;
        
        // Update input values
        elements.gifTargetFrames.max = selectedGif.frames.length;
        elements.gifTargetFrames.value = selectedGif.targetFrameCount || selectedGif.frames.length;
        elements.gifFitMode.value = selectedGif.fitMode || 'stretch';
        
        // Update custom frame selection text
        if (selectedGif.customFrameIndices && selectedGif.customFrameIndices.length > 0) {
            elements.gifFrameSelection.value = formatFrameSelection(selectedGif.customFrameIndices);
        } else {
            elements.gifFrameSelection.value = "";
        }
    } else {
        elements.selectedFileSettings.style.display = 'none';
    }
}

// Handle File Selection
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        processFiles(e.target.files);
    }
}

// Process Uploaded Files
async function processFiles(files) {
    showLoading("Reading and decoding GIFs...");
    let loadedCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'image/gif') continue;
        
        try {
            const buffer = await readFileAsArrayBuffer(file);
            const processed = await parseAndProcessGif(buffer, file.name);
            
            // Assign unique ID
            processed.id = 'gif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            
            // Default target frame count and fit mode
            processed.targetFrameCount = processed.frameCount;
            processed.fitMode = 'stretch';
            
            state.gifs.push(processed);
            loadedCount++;
            
            // Auto-select the newly added file
            state.selectedGifId = processed.id;
        } catch (err) {
            alert(`Error decoding "${file.name}": It might not be a valid animated GIF or contains unsupported formats.`);
        }
    }
    
    hideLoading();
    
    if (loadedCount > 0) {
        onGifsListChanged();
    }
}

// File helper
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

// Load Programmatic Demo GIF
// Load Demo GIFs
async function loadDemoAnimation() {
    showLoading("Loading demo GIFs (morshu.gif & morshu2.gif)...");
    
    try {
        // Fetch morshu.gif
        const res1 = await fetch('morshu.gif');
        if (!res1.ok) throw new Error("morshu.gif not found");
        const buf1 = await res1.arrayBuffer();
        const processed1 = await parseAndProcessGif(buf1, 'morshu.gif');
        processed1.id = 'gif_morshu';
        processed1.targetFrameCount = 33;
        processed1.fitMode = 'stretch';
        // Set customFrameIndices to 0-32 by default to match the 33/90 frames screenshot
        processed1.customFrameIndices = Array.from({ length: 33 }, (_, i) => i);
        
        // Fetch morshu2.gif
        const res2 = await fetch('morshu2.gif');
        if (!res2.ok) throw new Error("morshu2.gif not found");
        const buf2 = await res2.arrayBuffer();
        const processed2 = await parseAndProcessGif(buf2, 'morshu2.gif');
        processed2.id = 'gif_morshu2';
        processed2.targetFrameCount = 30;
        processed2.fitMode = 'stretch';
        processed2.customFrameIndices = Array.from({ length: 30 }, (_, i) => i);
        
        state.gifs = [processed1, processed2];
        state.selectedGifId = 'gif_morshu2'; // Select morshu2
        
        // Set the UI controls to match the screenshot
        elements.layoutMode.value = 'grid';
        elements.autoGrid.checked = false;
        elements.autoRows.checked = false;
        elements.gridCols.value = 9;
        elements.gridRows.value = 7;
        elements.spacing.value = 0;
        elements.direction.value = 'row';
        elements.bgTransparent.checked = true;
        elements.resMode.value = 'fixed';
        elements.totalWidth.value = 2048;
        elements.totalHeight.value = 2048;
        
        hideLoading();
        onGifsListChanged();
        
        // Fit canvas preview to screen
        setTimeout(fitCanvasToContainer, 100);
    } catch (err) {
        console.error(err);
        alert("Failed to load demo GIFs. Please make sure 'morshu.gif' and 'morshu2.gif' are placed in the root directory.");
        hideLoading();
    }
}

// Clear all uploaded GIFs
function clearAllGifs() {
    stopPlayerLoop();
    state.gifs = [];
    state.selectedGifId = null;
    state.generatedSpritesheet = null;
    onGifsListChanged();
}

// Triggered when GIFs are added, removed, or reordered
function onGifsListChanged() {
    renderGifsList();
    updatePlayerDropdown();
    refreshSpritesheet();
    setupPlayerAnimation();
    
    // Reset preview canvas if empty
    if (state.gifs.length === 0) {
        const ctx = elements.spritesheetCanvas.getContext('2d');
        elements.spritesheetCanvas.width = 0;
        elements.spritesheetCanvas.height = 0;
        
        // Disable exports
        elements.btnDownloadPNG.disabled = true;
        elements.btnDownloadJSON.disabled = true;
        
        // Update status
        elements.statusTotalFrames.textContent = '0';
        elements.statusDimensions.textContent = '0 x 0 px';
        elements.statusGrid.textContent = '0 x 0';
    }
}

// Render the Listbox items in the sidebar
function renderGifsList() {
    elements.gifList.innerHTML = '';
    elements.gifCount.textContent = state.gifs.length;
    
    if (state.gifs.length === 0) {
        elements.gifList.innerHTML = '<div class="listbox-empty">No files selected</div>';
        elements.btnRemoveSelected.disabled = true;
        elements.btnClearAll.disabled = true;
        elements.btnMoveUp.disabled = true;
        elements.btnMoveDown.disabled = true;
        updateUIControlsState();
        return;
    }
    
    elements.btnClearAll.disabled = false;
    
    // Ensure the selectedGifId is valid
    if (state.selectedGifId && !state.gifs.some(g => g.id === state.selectedGifId)) {
        state.selectedGifId = state.gifs[0].id;
    } else if (!state.selectedGifId && state.gifs.length > 0) {
        state.selectedGifId = state.gifs[0].id;
    }
    
    state.gifs.forEach((gif, index) => {
        const item = document.createElement('div');
        item.className = `listbox-item ${gif.active ? '' : 'inactive'} ${state.selectedGifId === gif.id ? 'selected' : ''}`;
        item.dataset.id = gif.id;
        
        // Checkbox (inclusion toggle)
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'listbox-item-check';
        check.checked = gif.active;
        check.title = "Toggle inclusion in spritesheet";
        
        check.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't select row when clicking checkbox
        });
        
        check.addEventListener('change', (e) => {
            gif.active = e.target.checked;
            onGifsListChanged();
        });
        
        // Info wrapper
        const info = document.createElement('div');
        info.className = 'listbox-item-info';
        
        const name = document.createElement('span');
        name.className = 'listbox-item-name';
        name.textContent = gif.name;
        name.title = gif.name;
        
        const meta = document.createElement('span');
        meta.className = 'listbox-item-meta';
        const framesStr = gif.targetFrameCount !== gif.frames.length 
            ? `${gif.targetFrameCount}/${gif.frames.length} frames` 
            : `${gif.frames.length} frames`;
        meta.innerHTML = `<span>${gif.width}x${gif.height}</span> <span>•</span> <span>${framesStr}</span>`;
        
        info.appendChild(name);
        info.appendChild(meta);
        
        item.appendChild(check);
        item.appendChild(info);
        
        // Selection click handler
        item.addEventListener('click', () => {
            selectGif(gif.id);
        });
        
        elements.gifList.appendChild(item);
    });
    
    updateListboxActionsState();
    updateUIControlsState();
}

// Select a GIF in the listbox
function selectGif(id) {
    state.selectedGifId = id;
    renderGifsList();
}

// Update the disabled/enabled states of the action buttons based on selection
function updateListboxActionsState() {
    const index = state.gifs.findIndex(g => g.id === state.selectedGifId);
    
    if (index === -1) {
        elements.btnRemoveSelected.disabled = true;
        elements.btnMoveUp.disabled = true;
        elements.btnMoveDown.disabled = true;
    } else {
        elements.btnRemoveSelected.disabled = false;
        elements.btnMoveUp.disabled = index === 0;
        elements.btnMoveDown.disabled = index === state.gifs.length - 1;
    }
}

// Remove the currently selected GIF
function removeSelectedGif() {
    const index = state.gifs.findIndex(g => g.id === state.selectedGifId);
    if (index === -1) return;
    
    state.gifs.splice(index, 1);
    
    // Select the next logical item
    if (state.gifs.length > 0) {
        const nextIndex = Math.min(index, state.gifs.length - 1);
        state.selectedGifId = state.gifs[nextIndex].id;
    } else {
        state.selectedGifId = null;
    }
    
    onGifsListChanged();
}

// Move the currently selected GIF up or down in the list
function moveSelectedGif(delta) {
    const index = state.gifs.findIndex(g => g.id === state.selectedGifId);
    if (index === -1) return;
    
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= state.gifs.length) return;
    
    // Swap
    const temp = state.gifs[index];
    state.gifs[index] = state.gifs[targetIndex];
    state.gifs[targetIndex] = temp;
    
    onGifsListChanged();
}

// Update dropdown menu in player card
function updatePlayerDropdown() {
    const prevVal = elements.playerGifSelect.value;
    
    elements.playerGifSelect.innerHTML = '<option value="all">All Combined</option>';
    
    state.gifs.forEach(gif => {
        if (gif.active) {
            const opt = document.createElement('option');
            opt.value = gif.id;
            opt.textContent = gif.name;
            elements.playerGifSelect.appendChild(opt);
        }
    });
    
    // Try to restore previous selection if it still exists
    if (Array.from(elements.playerGifSelect.options).some(o => o.value === prevVal)) {
        elements.playerGifSelect.value = prevVal;
    }
}

// Helper to get processed frames of a GIF (respects customFrameIndices or targetFrameCount)
function getGifProcessedFrames(gif) {
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
                    const idx = Math.round(i * (originalCount - 1) / (targetCount - 1));
                    gifFramesToUse.push(gif.frames[idx]);
                }
            }
        }
    }
    return gifFramesToUse;
}

// Compile and draw the Spritesheet based on current settings
let debounceTimeout = null;
function refreshSpritesheet() {
    // Debounce to prevent multiple quick redraws
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(performSpritesheetGeneration, 50);
}

function performSpritesheetGeneration() {
    if (state.gifs.filter(g => g.active).length === 0) {
        state.generatedSpritesheet = null;
        return;
    }
    
    // Sync UI inputs with current auto calculations before generating
    updateUIControlsState();
    
    // Collect options
    const options = {
        layoutMode: elements.layoutMode.value,
        gridCols: parseInt(elements.gridCols.value) || 1,
        gridRows: parseInt(elements.gridRows.value) || 1,
        autoGrid: elements.autoGrid.checked,
        autoRows: elements.autoRows.checked,
        spacing: parseInt(elements.spacing.value) || 0,
        direction: elements.direction.value,
        backgroundColor: elements.bgTransparent.checked ? 'transparent' : elements.bgColor.value,
        
        // Resolution Mode options
        resMode: elements.resMode.value,
        scale: parseFloat(elements.scale.value) || 1.0,
        totalWidth: parseInt(elements.totalWidth.value) || 2048,
        totalHeight: parseInt(elements.totalHeight.value) || 1024,
        
        fixedSize: elements.overrideSize.checked ? {
            width: parseInt(elements.frameWidth.value) || 64,
            height: parseInt(elements.frameHeight.value) || 64
        } : null,
        fitMode: elements.fitMode.value
    };
    
    const result = generateSpritesheet(state.gifs, options);
    state.generatedSpritesheet = result;
    
    if (result.canvas) {
        // Update Canvas size and draw
        elements.spritesheetCanvas.width = result.canvas.width;
        elements.spritesheetCanvas.height = result.canvas.height;
        const ctx = elements.spritesheetCanvas.getContext('2d');
        ctx.clearRect(0, 0, result.canvas.width, result.canvas.height);
        ctx.drawImage(result.canvas, 0, 0);
        
        // Enable exports
        elements.btnDownloadPNG.disabled = false;
        elements.btnDownloadJSON.disabled = false;
        
        // Update Status bar / Metric Cards
        elements.statusTotalFrames.textContent = result.metadata.totalFrames;
        elements.statusDimensions.textContent = `${result.canvas.width} x ${result.canvas.height} px`;
        elements.statusGrid.textContent = `${result.metadata.layout.cols} x ${result.metadata.layout.rows}`;
        
        // Warning if canvas is too large
        const limit = 16384;
        if (result.canvas.width > limit || result.canvas.height > limit) {
            elements.canvasWarning.style.display = 'flex';
        } else {
            elements.canvasWarning.style.display = 'none';
        }
    }
}

// -----------------------------
// Interactive Preview Zoom & Pan
// -----------------------------

function resetZoomAndPan() {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
    applyZoomAndPan();
    fitCanvasToContainer();
}

function applyZoomAndPan() {
    elements.canvasWrapper.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    elements.zoomBadge.textContent = `${Math.round(state.zoom * 100)}%`;
}

function adjustZoom(factor) {
    state.zoom = Math.max(0.1, Math.min(10.0, state.zoom * factor));
    applyZoomAndPan();
}

function handleWheelZoom(e) {
    e.preventDefault();
    
    const zoomIntensity = 0.1;
    const mouseX = e.clientX - elements.previewContainer.getBoundingClientRect().left;
    const mouseY = e.clientY - elements.previewContainer.getBoundingClientRect().top;
    
    const prevZoom = state.zoom;
    if (e.deltaY < 0) {
        state.zoom = Math.min(10.0, state.zoom * (1 + zoomIntensity));
    } else {
        state.zoom = Math.max(0.1, state.zoom * (1 - zoomIntensity));
    }
    
    const zoomRatio = state.zoom / prevZoom;
    state.pan.x = mouseX - (mouseX - state.pan.x) * zoomRatio;
    state.pan.y = mouseY - (mouseY - state.pan.y) * zoomRatio;
    
    applyZoomAndPan();
}

function startPan(e) {
    if (e.button !== 0) return; // Left click only
    state.isDragging = true;
    state.dragStart = {
        x: e.clientX - state.pan.x,
        y: e.clientY - state.pan.y
    };
    elements.canvasWrapper.style.cursor = 'grabbing';
}

function drawPan(e) {
    if (!state.isDragging) return;
    state.pan.x = e.clientX - state.dragStart.x;
    state.pan.y = e.clientY - state.dragStart.y;
    applyZoomAndPan();
}

function stopPan() {
    if (!state.isDragging) return;
    state.isDragging = false;
    elements.canvasWrapper.style.cursor = 'grab';
}

function fitCanvasToContainer() {
    if (!state.generatedSpritesheet || !state.generatedSpritesheet.canvas) return;
    
    const canvas = state.generatedSpritesheet.canvas;
    const containerW = elements.previewContainer.clientWidth - 40;
    const containerH = elements.previewContainer.clientHeight - 40;
    
    const scaleX = containerW / canvas.width;
    const scaleY = containerH / canvas.height;
    
    state.zoom = Math.min(1.0, scaleX, scaleY);
    state.pan = { x: 0, y: 0 };
    applyZoomAndPan();
}

// -----------------------------
// Animation Preview Player
// -----------------------------

function setupPlayerAnimation() {
    stopPlayerLoop();
    state.playerFrameIndex = 0;
    state.playerActiveFrames = [];
    
    const selected = elements.playerGifSelect.value;
    
    if (selected === 'all') {
        state.gifs.forEach(gif => {
            if (gif.active) {
                const frames = getGifProcessedFrames(gif);
                frames.forEach(f => {
                    state.playerActiveFrames.push({
                        canvas: f.canvas,
                        gif: gif,
                        delay: f.delay
                    });
                });
            }
        });
    } else {
        const gif = state.gifs.find(g => g.id === selected);
        if (gif) {
            const frames = getGifProcessedFrames(gif);
            frames.forEach(f => {
                state.playerActiveFrames.push({
                    canvas: f.canvas,
                    gif: gif,
                    delay: f.delay
                });
            });
        }
    }
    
    drawPlayerFrame();
    
    if (state.isPlaying && state.playerActiveFrames.length > 1) {
        startPlayerLoop();
    } else if (state.playerActiveFrames.length <= 1) {
        setPlayState(false);
    }
}

function drawPlayerFrame() {
    if (state.playerActiveFrames.length === 0) {
        const ctx = elements.playerCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.playerCanvas.width, elements.playerCanvas.height);
        return;
    }
    
    const frame = state.playerActiveFrames[state.playerFrameIndex];
    
    // Determine the calculated frame width and height from the spritesheet
    // If not generated, fall back to the frame's canvas dimensions
    let targetW = frame.canvas.width;
    let targetH = frame.canvas.height;
    
    if (state.generatedSpritesheet && state.generatedSpritesheet.metadata && state.generatedSpritesheet.metadata.layout) {
        const firstFrame = state.generatedSpritesheet.metadata.frames[0];
        if (firstFrame) {
            targetW = firstFrame.w;
            targetH = firstFrame.h;
        }
    }
    
    elements.playerCanvas.width = targetW;
    elements.playerCanvas.height = targetH;
    
    const ctx = elements.playerCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetW, targetH);
    
    // Fill background if any
    const bgTransparent = elements.bgTransparent.checked;
    if (!bgTransparent) {
        ctx.fillStyle = elements.bgColor.value;
        ctx.fillRect(0, 0, targetW, targetH);
    }
    
    const srcW = frame.canvas.width;
    const srcH = frame.canvas.height;
    const fitMode = frame.gif ? (frame.gif.fitMode || 'stretch') : 'stretch';
    
    if (fitMode === 'contain') {
        const ratio = Math.min(targetW / srcW, targetH / srcH);
        const drawW = srcW * ratio;
        const drawH = srcH * ratio;
        const offsetX = (targetW - drawW) / 2;
        const offsetY = (targetH - drawH) / 2;
        ctx.drawImage(frame.canvas, offsetX, offsetY, drawW, drawH);
    } else {
        ctx.drawImage(frame.canvas, 0, 0, targetW, targetH);
    }
}

// Toggle Play / Pause
function togglePlayer() {
    if (state.playerActiveFrames.length <= 1) return;
    
    setPlayState(!state.isPlaying);
}

function setPlayState(play) {
    state.isPlaying = play;
    if (play) {
        elements.playText.style.display = 'none';
        elements.pauseText.style.display = 'flex';
        startPlayerLoop();
    } else {
        elements.playText.style.display = 'flex';
        elements.pauseText.style.display = 'none';
        stopPlayerLoop();
    }
}

function startPlayerLoop() {
    if (state.playerActiveFrames.length === 0) return;
    
    const fps = parseInt(elements.playerFps.value) || 15;
    const interval = 1000 / fps;
    
    const tick = () => {
        state.playerFrameIndex = (state.playerFrameIndex + 1) % state.playerActiveFrames.length;
        drawPlayerFrame();
        state.playerTimeout = setTimeout(tick, interval);
    };
    
    state.playerTimeout = setTimeout(tick, interval);
}

function stopPlayerLoop() {
    if (state.playerTimeout) {
        clearTimeout(state.playerTimeout);
        state.playerTimeout = null;
    }
}

// -----------------------------
// Exporting Functions
// -----------------------------

function downloadSpritesheetPNG() {
    if (!state.generatedSpritesheet || !state.generatedSpritesheet.canvas) return;
    
    const canvas = state.generatedSpritesheet.canvas;
    const link = document.createElement('a');
    
    const activeGifs = state.gifs.filter(g => g.active);
    let name = "bazq_spritesheet";
    if (activeGifs.length > 0) {
        name = activeGifs.map(g => g.name.split('.')[0]).join('_') + '_spritesheet';
    }
    
    link.download = `${name.toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Export JSON Metadata
function downloadMetadataJSON() {
    if (!state.generatedSpritesheet || !state.generatedSpritesheet.metadata) return;
    
    const metadata = state.generatedSpritesheet.metadata;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(metadata, null, 2));
    const link = document.createElement('a');
    
    const activeGifs = state.gifs.filter(g => g.active);
    let name = "bazq_spritesheet";
    if (activeGifs.length > 0) {
        name = activeGifs.map(g => g.name.split('.')[0]).join('_') + '_spritesheet';
    }
    
    link.download = `${name.toLowerCase()}.json`;
    link.href = dataStr;
    link.click();
}

// Run Initialization on Load
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', fitCanvasToContainer);

// -----------------------------
// Custom Frame Selection Helpers
// -----------------------------

// Parse custom frame selection string (e.g. "0-5, 8, 10-12") into sorted array of indices
function parseFrameSelection(str, maxCount) {
    if (!str || str.trim() === '') return null;
    
    const indices = new Set();
    const parts = str.split(',');
    
    for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
            const range = part.split('-');
            if (range.length === 2) {
                const start = parseInt(range[0].trim());
                const end = parseInt(range[1].trim());
                if (!isNaN(start) && !isNaN(end)) {
                    const s = Math.min(start, end);
                    const e = Math.max(start, end);
                    for (let i = s; i <= e; i++) {
                        if (i >= 0 && i < maxCount) {
                            indices.add(i);
                        }
                    }
                }
            }
        } else {
            const idx = parseInt(part);
            if (!isNaN(idx) && idx >= 0 && idx < maxCount) {
                indices.add(idx);
            }
        }
    }
    
    return Array.from(indices).sort((a, b) => a - b);
}

// Format sorted array of indices into a compact range string (e.g. "0-5, 8, 10-12")
function formatFrameSelection(indices) {
    if (!indices || indices.length === 0) return "";
    const sorted = [...indices].sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
            end = sorted[i];
        } else {
            if (start === end) {
                ranges.push(`${start}`);
            } else {
                ranges.push(`${start}-${end}`);
            }
            start = sorted[i];
            end = sorted[i];
        }
    }
    if (start === end) {
        ranges.push(`${start}`);
    } else {
        ranges.push(`${start}-${end}`);
    }
    return ranges.join(", ");
}

// Open Visual Frame Selector Modal
function openVisualFrameSelector() {
    const gif = state.gifs.find(g => g.id === state.selectedGifId);
    if (!gif) return;
    
    state.modalGif = gif;
    state.modalSelectedIndices = new Set(gif.customFrameIndices || Array.from({ length: gif.frames.length }, (_, i) => i));
    
    elements.modalGifName.textContent = gif.name;
    elements.frameSelectorModal.classList.add('active');
    
    renderModalFrameGrid();
    updateModalStatusText();
}

function closeVisualFrameSelector() {
    elements.frameSelectorModal.classList.remove('active');
    state.modalGif = null;
    state.modalSelectedIndices = new Set();
}

// Render the grid of thumbnails in the modal
function renderModalFrameGrid() {
    elements.modalFrameGrid.innerHTML = '';
    const gif = state.modalGif;
    if (!gif) return;
    
    gif.frames.forEach((frame, idx) => {
        const item = document.createElement('div');
        item.className = `frame-item ${state.modalSelectedIndices.has(idx) ? 'selected' : ''}`;
        item.dataset.index = idx;
        
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'frame-item-canvas-wrapper';
        
        const canvas = document.createElement('canvas');
        canvas.width = 72;
        canvas.height = 72;
        const ctx = canvas.getContext('2d');
        
        // Draw the frame centered inside the 72x72 canvas
        const ratio = Math.min(72 / frame.canvas.width, 72 / frame.canvas.height);
        const drawW = frame.canvas.width * ratio;
        const drawH = frame.canvas.height * ratio;
        const offsetX = (72 - drawW) / 2;
        const offsetY = (72 - drawH) / 2;
        ctx.drawImage(frame.canvas, offsetX, offsetY, drawW, drawH);
        
        canvasWrapper.appendChild(canvas);
        
        const label = document.createElement('span');
        label.className = 'frame-item-index';
        label.textContent = `#${idx}`;
        
        item.appendChild(canvasWrapper);
        item.appendChild(label);
        
        // Click handler to toggle frame selection
        item.addEventListener('click', () => {
            if (state.modalSelectedIndices.has(idx)) {
                state.modalSelectedIndices.delete(idx);
                item.classList.remove('selected');
            } else {
                state.modalSelectedIndices.add(idx);
                item.classList.add('selected');
            }
            updateModalStatusText();
        });
        
        elements.modalFrameGrid.appendChild(item);
    });
}

function updateModalStatusText() {
    const total = state.modalGif ? state.modalGif.frames.length : 0;
    const selected = state.modalSelectedIndices.size;
    elements.modalStatusText.textContent = `Selected: ${selected} / ${total} frames`;
}

// Modal Toolbar Actions
function modalSelectAll() {
    if (!state.modalGif) return;
    for (let i = 0; i < state.modalGif.frames.length; i++) {
        state.modalSelectedIndices.add(i);
    }
    renderModalFrameGrid();
    updateModalStatusText();
}

function modalClearAll() {
    state.modalSelectedIndices.clear();
    renderModalFrameGrid();
    updateModalStatusText();
}

function modalInvertSelection() {
    if (!state.modalGif) return;
    const total = state.modalGif.frames.length;
    for (let i = 0; i < total; i++) {
        if (state.modalSelectedIndices.has(i)) {
            state.modalSelectedIndices.delete(i);
        } else {
            state.modalSelectedIndices.add(i);
        }
    }
    renderModalFrameGrid();
    updateModalStatusText();
}

function modalSelectEveryNth() {
    if (!state.modalGif) return;
    const nth = parseInt(elements.modalNthInput.value) || 2;
    state.modalSelectedIndices.clear();
    for (let i = 0; i < state.modalGif.frames.length; i += nth) {
        state.modalSelectedIndices.add(i);
    }
    renderModalFrameGrid();
    updateModalStatusText();
}

// Apply the modal selection back to the state and UI
function applyVisualFrameSelection() {
    const gif = state.modalGif;
    if (!gif) return;
    
    const indices = Array.from(state.modalSelectedIndices).sort((a, b) => a - b);
    
    // If everything is selected, we can clear the custom selection (defaults to all)
    if (indices.length === gif.frames.length) {
        gif.customFrameIndices = null;
        gif.targetFrameCount = gif.frames.length;
    } else {
        gif.customFrameIndices = indices.length > 0 ? indices : null;
        gif.targetFrameCount = indices.length;
    }
    
    closeVisualFrameSelector();
    renderGifsList();
    refreshSpritesheet();
    setupPlayerAnimation();
    updateUIControlsState();
}
