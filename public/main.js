const fileInput = document.getElementById("fileInput");
const resetBtn = document.getElementById("resetBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const cropSelectionBtn = document.getElementById("cropSelectionBtn");
const fillSelectionBtn = document.getElementById("fillSelectionBtn");
const applyBrushBtn = document.getElementById("applyBrushBtn");
const clearBrushBtn = document.getElementById("clearBrushBtn");
const undoBrushBtn = document.getElementById("undoBrushBtn");
const inpaintBtn = document.getElementById("inpaintBtn");
const downloadFullBtn = document.getElementById("downloadFullBtn");
const downloadPatchBtn = document.getElementById("downloadPatchBtn");
const promptInput = document.getElementById("promptInput");
const presetPromptSelect = document.getElementById("presetPromptSelect");
const endpointInput = document.getElementById("endpointInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const userConfigInput = document.getElementById("userConfigInput");
const modelSelect = document.getElementById("modelSelect");
const customModelInput = document.getElementById("customModelInput");
const selectionModeContainer = document.getElementById("selectionMode");
const featherSlider = document.getElementById("featherSlider");
const featherValue = document.getElementById("featherValue");
const brushSlider = document.getElementById("brushSlider");
const brushValue = document.getElementById("brushValue");
const colorPalette = document.getElementById("colorPalette");
const statusMessage = document.getElementById("statusMessage");
const statusBar = document.getElementById("statusBar");
const themeToggle = document.getElementById("themeToggle");

// Modal elements
const undoConfirmModal = document.getElementById("undoConfirmModal");
const undoConfirmCancel = document.getElementById("undoConfirmCancel");
const undoConfirmOk = document.getElementById("undoConfirmOk");
const clearAllModal = document.getElementById("clearAllModal");
const clearAllCancel = document.getElementById("clearAllCancel");
const clearAllConfirm = document.getElementById("clearAllConfirm");

// Zoom controls
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomFitBtn = document.getElementById("zoomFitBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const canvasWrapper = document.querySelector(".canvas-wrapper");

const workspaceEl = document.querySelector(".workspace");
const imageCanvas = document.getElementById("imageCanvas");
const overlayCanvas = document.getElementById("overlayCanvas");
const imageCtx = imageCanvas.getContext("2d");
const overlayCtx = overlayCanvas.getContext("2d");
const brushCanvas = document.createElement("canvas");
const brushCtx = brushCanvas.getContext("2d");
const canvasWrapperEl = document.getElementById("canvasWrapper");
const emptyStateEl = document.getElementById("emptyState");

const defaultPalette = [
  { label: "Green", value: "#00ff7f" },
  { label: "Red", value: "#ff4d4f" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Yellow", value: "#facc15" },
  { label: "Black", value: "#111827" },
  { label: "White", value: "#ffffff" },
];

const state = {
  originalImageData: null,
  currentImageData: null,
  imageWidth: 0,
  imageHeight: 0,
  isDrawing: false,
  selectionMode: "rectangle",
  livePath: null,
  selectionPath: null,
  selectionPoints: [],
  selectionBounds: null,
  brushColor: defaultPalette[0].value,
  brushSize: Number(brushSlider.value),
  hasBrush: false,
  feather: Number(featherSlider.value),
  prompt: "",
  isProcessing: false,
  pointerId: null,
  lastPatchData: null,
  modelsLoaded: false,
  pendingSelectionBounds: null,
  displayScale: 1,
  isCropping: false,
  zoomLevel: 100,
  presetPrompts: [],
  loadingTimer: null,
  loadingStartTime: null,
  // Undo history
  brushHistory: [],
  lastApplyImageData: null,
  lastActionWasApply: false,
};

function showEmptyState() {
  if (emptyStateEl) emptyStateEl.classList.remove("hidden");
  if (canvasWrapperEl) canvasWrapperEl.classList.add("hidden");
}

function hideEmptyState() {
  if (emptyStateEl) emptyStateEl.classList.add("hidden");
  if (canvasWrapperEl) canvasWrapperEl.classList.remove("hidden");
}

function clearAllAndReset() {
  // Reset all state
  state.originalImageData = null;
  state.currentImageData = null;
  state.imageWidth = 0;
  state.imageHeight = 0;
  state.selectionPath = null;
  state.selectionPoints = [];
  state.selectionBounds = null;
  state.livePath = null;
  state.hasBrush = false;
  state.lastPatchData = null;
  state.brushHistory = [];
  state.lastApplyImageData = null;
  state.lastActionWasApply = false;

  // Clear canvases
  imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);

  // Show empty state
  showEmptyState();

  // Reset buttons
  resetBtn.disabled = true;
  clearAllBtn.disabled = true;
  downloadFullBtn.disabled = true;
  downloadPatchBtn.disabled = true;
  updateButtonStates();

  setStatus("Upload an image to begin.");
}

function init() {
  initTheme();
  setupColorPalette();
  showEmptyState();
  hookEvents();
  requestNotificationPermission();
  fetch("/api/config")
    .then((res) => res.json())
    .then((data) => {
      populateModelSelect(data?.defaultModels || []);
      if (data?.defaultEndpoint) {
        endpointInput.value = data.defaultEndpoint;
      }
      state.modelsLoaded = true;
      updateButtonStates();
    })
    .catch(() => {
      populateModelSelect([]);
      state.modelsLoaded = true;
      updateButtonStates();
    });
  fetch("/api/prompts")
    .then((res) => res.json())
    .then((data) => {
      populatePresetPrompts(data?.presets || []);
    })
    .catch(() => {
      populatePresetPrompts([]);
    });
  setStatus("Upload an image to begin.");
}

function hookEvents() {
  fileInput.addEventListener("change", handleFileUpload);

  // Empty state click and drag-drop support
  if (emptyStateEl) {
    emptyStateEl.addEventListener("click", () => fileInput.click());
    emptyStateEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      emptyStateEl.classList.add("drag-over");
    });
    emptyStateEl.addEventListener("dragleave", () => {
      emptyStateEl.classList.remove("drag-over");
    });
    emptyStateEl.addEventListener("drop", (e) => {
      e.preventDefault();
      emptyStateEl.classList.remove("drag-over");
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFileUpload({ target: { files: [file] } });
      }
    });
  }

  resetBtn.addEventListener("click", () => {
    if (state.originalImageData) {
      loadImage(state.originalImageData, true);
      setStatus("Canvas reset to the original upload.");
    }
  });

  clearAllBtn.addEventListener("click", () => {
    clearAllModal.classList.remove("hidden");
  });

  clearAllCancel.addEventListener("click", () => {
    clearAllModal.classList.add("hidden");
  });

  clearAllConfirm.addEventListener("click", () => {
    clearAllModal.classList.add("hidden");
    clearAllAndReset();
  });

  promptInput.addEventListener("input", () => {
    state.prompt = promptInput.value;
    updateButtonStates();
  });

  presetPromptSelect.addEventListener("change", () => {
    const selectedValue = presetPromptSelect.value;
    if (selectedValue) {
      promptInput.value = selectedValue;
      state.prompt = selectedValue;
      updateButtonStates();
    }
  });

  selectionModeContainer.addEventListener("click", (event) => {
    const mode = event.target?.dataset?.mode;
    if (!mode) return;
    state.selectionMode = mode;
    [...selectionModeContainer.querySelectorAll("button")].forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === mode),
    );
    overlayCanvas.style.cursor = mode === "brush" ? "crosshair" : "default";
  });

  featherSlider.addEventListener("input", (event) => {
    state.feather = Number(event.target.value);
    featherValue.textContent = `${state.feather} px`;
  });

  brushSlider.addEventListener("input", (event) => {
    state.brushSize = Number(event.target.value);
    brushValue.textContent = `${state.brushSize} px`;
  });

  clearSelectionBtn.addEventListener("click", () => {
    clearSelection();
  });

  cropSelectionBtn.addEventListener("click", () => {
    cropSelectionToNewImage();
  });

  fillSelectionBtn.addEventListener("click", () => {
    fillSelectionWithColor();
  });

  applyBrushBtn.addEventListener("click", () => {
    applyBrushToImage();
  });

  clearBrushBtn.addEventListener("click", () => {
    clearBrushLayer();
  });

  undoBrushBtn.addEventListener("click", () => {
    handleUndo();
  });

  // Modal events
  undoConfirmCancel.addEventListener("click", () => {
    hideUndoModal();
  });

  undoConfirmOk.addEventListener("click", () => {
    undoApplyBrush();
    hideUndoModal();
  });

  undoConfirmModal.querySelector(".modal-backdrop").addEventListener("click", () => {
    hideUndoModal();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      handleUndo();
    }
  });

  inpaintBtn.addEventListener("click", runInpaint);
  downloadFullBtn.addEventListener("click", () => {
    if (state.currentImageData) {
      triggerDownload(state.currentImageData, "inpainter-full.png");
    }
  });
  downloadPatchBtn.addEventListener("click", async () => {
    if (state.lastPatchData) {
      triggerDownload(state.lastPatchData, "inpainter-patch.png");
    } else if (state.selectionBounds && state.currentImageData) {
      const patchData = await extractPatch(state.currentImageData, state.selectionBounds);
      if (patchData) {
        triggerDownload(patchData, "inpainter-patch.png");
      }
    }
  });

  overlayCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!state.imageWidth) return;
    overlayCanvas.setPointerCapture(event.pointerId);
    state.pointerId = event.pointerId;
    if (state.selectionMode === "brush") {
      startBrushStroke(event);
    } else {
      startSelection(event);
    }
  });

  overlayCanvas.addEventListener("pointermove", (event) => {
    event.preventDefault();
    if (!state.imageWidth) return;
    if (state.selectionMode === "brush" && state.isDrawing) {
      continueBrushStroke(event);
      return;
    }
    if (state.isDrawing) {
      updateSelection(event);
    }
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    overlayCanvas.addEventListener(evt, (event) => {
      event.preventDefault();
      if (state.pointerId !== null) {
        try {
          overlayCanvas.releasePointerCapture(state.pointerId);
        } catch (err) {
          // ignore release issues
        }
        state.pointerId = null;
      }

      if (state.selectionMode === "brush") {
        finishBrushStroke();
      } else if (state.isDrawing) {
        completeSelection(event);
      }
    });
  });

  modelSelect.addEventListener("change", updateButtonStates);
  customModelInput.addEventListener("input", updateButtonStates);

  window.addEventListener("resize", () => {
    updateCanvasDisplayScale();
  });

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Zoom controls
  zoomSlider.addEventListener("input", (e) => {
    setZoom(Number(e.target.value));
  });

  zoomInBtn.addEventListener("click", () => {
    setZoom(Math.min(300, state.zoomLevel + 25));
  });

  zoomOutBtn.addEventListener("click", () => {
    setZoom(Math.max(10, state.zoomLevel - 25));
  });

  zoomFitBtn.addEventListener("click", zoomToFit);

  zoomResetBtn.addEventListener("click", () => {
    setZoom(100);
  });

  // Mouse wheel zoom
  workspaceEl.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(Math.max(10, Math.min(300, state.zoomLevel + delta)));
    }
  }, { passive: false });
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  setTheme(theme);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
}

function updateThemeIcon(theme) {
  const sunIcon = themeToggle.querySelector(".icon-sun");
  const moonIcon = themeToggle.querySelector(".icon-moon");
  if (theme === "dark") {
    sunIcon?.classList.add("hidden");
    moonIcon?.classList.remove("hidden");
  } else {
    sunIcon?.classList.remove("hidden");
    moonIcon?.classList.add("hidden");
  }
}

function setZoom(level) {
  state.zoomLevel = level;
  zoomSlider.value = level;
  zoomValue.textContent = `${level}%`;
  applyZoom();
}

function applyZoom() {
  if (!state.imageWidth || !state.imageHeight) return;

  const scale = state.zoomLevel / 100;
  const displayWidth = Math.round(state.imageWidth * scale);
  const displayHeight = Math.round(state.imageHeight * scale);

  [imageCanvas, overlayCanvas].forEach((canvas) => {
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  });

  state.displayScale = scale;
}

function zoomToFit() {
  if (!state.imageWidth || !state.imageHeight) return;

  const workspaceWidth = workspaceEl.clientWidth - 48; // Account for padding
  const workspaceHeight = workspaceEl.clientHeight - 48;

  const scaleX = workspaceWidth / state.imageWidth;
  const scaleY = workspaceHeight / state.imageHeight;
  const fitScale = Math.min(scaleX, scaleY, 1) * 100;

  setZoom(Math.round(fitScale));
}

function populateModelSelect(models) {
  const defaults = models.length
    ? models
    : [
        "gemini-3.0-pro-image-preview-001",
        "gemini-3.0-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ];
  modelSelect.innerHTML = defaults
    .map((model) => `<option value="${model}">${model}</option>`)
    .join("");
}

function populatePresetPrompts(presets) {
  state.presetPrompts = presets;
  const defaultOption = '<option value="">-- Select a preset --</option>';
  const presetOptions = presets
    .map((p) => `<option value="${escapeHtml(p.prompt)}">${escapeHtml(p.name)}</option>`)
    .join("");
  presetPromptSelect.innerHTML = defaultOption + presetOptions;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupColorPalette() {
  defaultPalette.forEach((color, index) => {
    const swatch = document.createElement("button");
    swatch.className = "color-swatch";
    swatch.style.background = color.value;
    swatch.title = color.label;
    if (index === 0) {
      swatch.classList.add("selected");
    }
    swatch.addEventListener("click", () => {
      state.brushColor = color.value;
      [...colorPalette.children].forEach((child) => child.classList.remove("selected"));
      swatch.classList.add("selected");
    });
    colorPalette.appendChild(swatch);
  });
}

function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const dataUrl = loadEvent.target?.result;
    if (typeof dataUrl === "string") {
      loadImage(dataUrl);
    }
  };
  reader.readAsDataURL(file);
}

function loadImage(dataUrl, options = {}) {
  const normalizedOptions =
    typeof options === "boolean" ? { isReset: options } : options || {};
  const { isReset = false, preserveOriginal = false, statusMessage } = normalizedOptions;
  const image = new Image();
  image.onload = () => {
    hideEmptyState();
    setCanvasSize(image.width, image.height);
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(image, 0, 0, image.width, image.height);
    if (!preserveOriginal && (!isReset || !state.originalImageData)) {
      state.originalImageData = dataUrl;
    }
    state.currentImageData = dataUrl;
    clearSelection();
    clearBrushLayer();
    state.lastPatchData = null;
    drawOverlay();
    setStatus(statusMessage || "Image loaded. Select an area to start editing.");
    resetBtn.disabled = false;
    clearAllBtn.disabled = false;
    downloadFullBtn.disabled = false;
    updateButtonStates();
  };
  image.onerror = () => {
    setStatus("Failed to load image.", "error");
  };
  image.src = dataUrl;
}

function setCanvasSize(width, height) {
  state.imageWidth = width;
  state.imageHeight = height;
  [imageCanvas, overlayCanvas].forEach((canvas) => {
    canvas.width = width;
    canvas.height = height;
  });
  brushCanvas.width = width;
  brushCanvas.height = height;
  brushCtx.clearRect(0, 0, width, height);
  zoomToFit();
}

function updateCanvasDisplayScale() {
  applyZoom();
}

function startSelection(event) {
  state.isDrawing = true;
  state.livePath = null;
  state.selectionPoints = [];
  const firstPoint = getCanvasPoint(event);
  state.selectionPoints.push(firstPoint);
  if (state.selectionMode === "lasso") {
    state.livePath = new Path2D();
    state.livePath.moveTo(firstPoint.x, firstPoint.y);
  }
}

function updateSelection(event) {
  const point = getCanvasPoint(event);
  if (state.selectionMode === "rectangle") {
    const start = state.selectionPoints[0];
    state.livePath = buildRectanglePath(start, point);
    drawSelectionPreview();
    return;
  }
  state.selectionPoints.push(point);
  state.livePath = buildFreehandPath(state.selectionPoints);
  drawSelectionPreview();
}

function completeSelection(event) {
  state.isDrawing = false;
  const lastPoint = getCanvasPoint(event);
  if (state.selectionMode === "rectangle") {
    finalizeRectangle(state.selectionPoints[0], lastPoint);
  } else {
    finalizeLasso();
  }
}

function drawSelectionPreview() {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (state.livePath) {
    overlayCtx.save();
    overlayCtx.fillStyle = "rgba(37, 99, 235, 0.2)";
    overlayCtx.strokeStyle = "rgba(37, 99, 235, 0.85)";
    overlayCtx.lineWidth = 2;
    overlayCtx.fill(state.livePath);
    overlayCtx.stroke(state.livePath);
    overlayCtx.restore();
  }
}

function finalizeRectangle(start, end) {
  const width = end.x - start.x;
  const height = end.y - start.y;
  const normalized = normalizeRect(start.x, start.y, width, height);
  if (normalized.width < 5 || normalized.height < 5) {
    setStatus("Selection is too small.", "error");
    drawOverlay();
    return;
  }
  const path = new Path2D();
  path.rect(normalized.x, normalized.y, normalized.width, normalized.height);
  state.selectionPath = path;
  state.selectionBounds = normalized;
  clearBrushLayer();
  drawOverlay();
  updateButtonStates();
}

function finalizeLasso() {
  if (state.selectionPoints.length < 3) {
    setStatus("Lasso selection requires more points.", "error");
    drawOverlay();
    return;
  }
  const path = buildFreehandPath(state.selectionPoints, true);
  state.selectionPath = path;
  state.selectionBounds = boundsFromPoints(state.selectionPoints);
  clearBrushLayer();
  drawOverlay();
  updateButtonStates();
}

function buildRectanglePath(start, current) {
  const width = current.x - start.x;
  const height = current.y - start.y;
  const rect = normalizeRect(start.x, start.y, width, height);
  const path = new Path2D();
  path.rect(rect.x, rect.y, rect.width, rect.height);
  state.selectionBounds = rect;
  return path;
}

function buildFreehandPath(points, close = false) {
  const path = new Path2D();
  if (!points.length) return path;
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    path.lineTo(points[i].x, points[i].y);
  }
  if (close) {
    path.closePath();
  }
  return path;
}

function boundsFromPoints(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function normalizeRect(x, y, width, height) {
  const rect = {
    x: width < 0 ? x + width : x,
    y: height < 0 ? y + height : y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

function clearSelection() {
  state.selectionPath = null;
  state.selectionBounds = null;
  state.selectionPoints = [];
  state.livePath = null;
  state.pendingSelectionBounds = null;
  drawOverlay();
  updateButtonStates();
}

async function cropSelectionToNewImage() {
  if (state.isCropping) return;
  if (!state.selectionBounds || !state.currentImageData) {
    setStatus("Select an area before cropping.", "error");
    return;
  }
  state.isCropping = true;
  updateButtonStates();
  try {
    const { x, y, width, height } = state.selectionBounds;
    if (width <= 2 || height <= 2) {
      setStatus("Selection is too small to crop.", "error");
      return;
    }
    const imageElement = await loadImageElement(state.currentImageData);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(imageElement, x, y, width, height, 0, 0, width, height);
    const croppedDataUrl = tempCanvas.toDataURL("image/png");
    loadImage(croppedDataUrl, {
      preserveOriginal: true,
      statusMessage: "Cropped selection ready. Continue editing.",
    });
  } catch (error) {
    console.error("Crop failed", error);
    setStatus("Failed to crop selection.", "error");
  } finally {
    state.isCropping = false;
    updateButtonStates();
  }
}

function setStatus(message, level = "info") {
  // Clear any existing loading timer
  if (state.loadingTimer) {
    clearInterval(state.loadingTimer);
    state.loadingTimer = null;
    state.loadingStartTime = null;
  }

  // Remove elapsed time element if exists
  const existingElapsed = statusBar.querySelector(".elapsed-time");
  if (existingElapsed) {
    existingElapsed.remove();
  }

  statusMessage.textContent = message;
  statusBar.className = "status-bar " + level;

  // Update status icon based on level
  const iconSvg = statusBar.querySelector(".status-icon");
  if (iconSvg) {
    if (level === "error") {
      iconSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>';
    } else if (level === "success") {
      iconSvg.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>';
    } else if (level === "loading") {
      iconSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>';
    } else {
      iconSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>';
    }
  }
}

function startLoadingStatus(message) {
  setStatus(message, "loading");
  state.loadingStartTime = Date.now();

  // Create elapsed time element
  const elapsedSpan = document.createElement("span");
  elapsedSpan.className = "elapsed-time";
  elapsedSpan.textContent = "0s";
  statusBar.appendChild(elapsedSpan);

  // Update timer every second
  state.loadingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.loadingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    if (minutes > 0) {
      elapsedSpan.textContent = `${minutes}m ${seconds}s`;
    } else {
      elapsedSpan.textContent = `${seconds}s`;
    }
  }, 1000);
}

function startBrushStroke(event) {
  // Save current brush canvas state before starting new stroke
  saveBrushSnapshot();
  state.isDrawing = true;
  state.lastActionWasApply = false;
  drawBrushAtEvent(event);
}

function continueBrushStroke(event) {
  drawBrushAtEvent(event);
}

function finishBrushStroke() {
  state.isDrawing = false;
}

function drawBrushAtEvent(event) {
  const point = getCanvasPoint(event);
  brushCtx.fillStyle = state.brushColor;
  brushCtx.globalAlpha = 1;
  brushCtx.beginPath();
  brushCtx.arc(point.x, point.y, state.brushSize / 2, 0, Math.PI * 2);
  brushCtx.fill();
  state.hasBrush = true;
  drawOverlay();
  updateButtonStates();
}

function saveBrushSnapshot() {
  // Create a snapshot of the current brush canvas
  const snapshot = document.createElement("canvas");
  snapshot.width = brushCanvas.width;
  snapshot.height = brushCanvas.height;
  const snapshotCtx = snapshot.getContext("2d");
  snapshotCtx.drawImage(brushCanvas, 0, 0);
  state.brushHistory.push(snapshot);
  // Limit history to prevent memory issues (max 50 strokes)
  if (state.brushHistory.length > 50) {
    state.brushHistory.shift();
  }
  updateButtonStates();
}

function applyBrushToImage() {
  if (!state.hasBrush) return;
  // Save image state before applying for potential undo
  state.lastApplyImageData = state.currentImageData;
  imageCtx.drawImage(brushCanvas, 0, 0);
  state.currentImageData = imageCanvas.toDataURL("image/png");
  // Clear brush history since we've applied
  state.brushHistory = [];
  state.lastActionWasApply = true;
  clearBrushLayer();
  setStatus("Brush strokes applied to image.", "success");
}

function handleUndo() {
  if (state.lastActionWasApply && state.lastApplyImageData) {
    // Show confirmation modal for undoing apply
    showUndoModal();
  } else if (state.brushHistory.length > 0) {
    // Undo last brush stroke
    undoBrushStroke();
  }
}

function undoBrushStroke() {
  if (state.brushHistory.length === 0) return;
  const lastSnapshot = state.brushHistory.pop();
  brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
  brushCtx.drawImage(lastSnapshot, 0, 0);
  // Check if there's any content on the brush canvas
  state.hasBrush = !isBrushCanvasEmpty();
  drawOverlay();
  updateButtonStates();
  setStatus("Undid last brush stroke.", "info");
}

function undoApplyBrush() {
  if (!state.lastApplyImageData) return;
  // Restore the image to before apply
  const img = new Image();
  img.onload = () => {
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageCtx.drawImage(img, 0, 0);
    state.currentImageData = state.lastApplyImageData;
    state.lastApplyImageData = null;
    state.lastActionWasApply = false;
    updateButtonStates();
    setStatus("Undid apply brush operation.", "info");
  };
  img.src = state.lastApplyImageData;
}

function isBrushCanvasEmpty() {
  const imageData = brushCtx.getImageData(0, 0, brushCanvas.width, brushCanvas.height);
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) return false;
  }
  return true;
}

function showUndoModal() {
  undoConfirmModal.classList.remove("hidden");
}

function hideUndoModal() {
  undoConfirmModal.classList.add("hidden");
}

function fillSelectionWithColor() {
  if (!state.selectionPath) return;
  // 直接在imageCanvas上填充颜色
  imageCtx.save();
  imageCtx.clip(state.selectionPath);
  imageCtx.fillStyle = state.brushColor;
  imageCtx.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
  imageCtx.restore();
  // 更新当前图片数据
  state.currentImageData = imageCanvas.toDataURL("image/png");
  // 清除brush图层
  clearBrushLayer();
  setStatus("Area filled with color. You can continue editing or download.", "success");
}

function clearBrushLayer() {
  brushCtx.clearRect(0, 0, brushCanvas.width, brushCanvas.height);
  state.hasBrush = false;
  state.brushHistory = [];
  state.lastActionWasApply = false;
  drawOverlay();
  updateButtonStates();
}

function drawOverlay() {
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (state.selectionPath) {
    overlayCtx.save();
    overlayCtx.fillStyle = "rgba(37, 99, 235, 0.18)";
    overlayCtx.strokeStyle = "#2563eb";
    overlayCtx.lineWidth = 2;
    overlayCtx.fill(state.selectionPath);
    overlayCtx.stroke(state.selectionPath);
    overlayCtx.restore();
  }
  overlayCtx.save();
  overlayCtx.globalAlpha = 1;
  overlayCtx.drawImage(brushCanvas, 0, 0);
  overlayCtx.restore();
}

function getCanvasPoint(event) {
  const rect = overlayCanvas.getBoundingClientRect();
  const scaleX = overlayCanvas.width / rect.width;
  const scaleY = overlayCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function buildMaskData() {
  if (!state.selectionPath) {
    return null;
  }
  const baseMask = document.createElement("canvas");
  baseMask.width = state.imageWidth;
  baseMask.height = state.imageHeight;
  const maskCtx = baseMask.getContext("2d");
  maskCtx.fillStyle = "#ffffff";
  maskCtx.fill(state.selectionPath);

  const outputMask = document.createElement("canvas");
  outputMask.width = baseMask.width;
  outputMask.height = baseMask.height;
  const outputCtx = outputMask.getContext("2d");
  if (state.feather > 0) {
    outputCtx.filter = `blur(${state.feather}px)`;
  }
  outputCtx.drawImage(baseMask, 0, 0);

  let colorData = null;
  if (state.hasBrush) {
    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = baseMask.width;
    colorCanvas.height = baseMask.height;
    const colorCtx = colorCanvas.getContext("2d");
    colorCtx.drawImage(brushCanvas, 0, 0);
    colorCtx.globalCompositeOperation = "destination-in";
    colorCtx.drawImage(outputMask, 0, 0);
    colorData = colorCanvas.toDataURL("image/png");
  }

  return {
    maskData: outputMask.toDataURL("image/png"),
    colorData,
  };
}

async function runInpaint() {
  const currentPrompt = promptInput.value.trim();
  if (state.isProcessing || !state.selectionPath || !currentPrompt) {
    return;
  }
  const maskPayload = buildMaskData();
  if (!maskPayload) {
    setStatus("Please select an area first.", "error");
    return;
  }
  const selectionSnapshot = state.selectionBounds
    ? { ...state.selectionBounds }
    : null;
  state.pendingSelectionBounds = selectionSnapshot;

  state.isProcessing = true;
  updateButtonStates();
  startLoadingStatus("Calling Gemini, please wait...");

  try {
    const response = await fetch("/api/inpaint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: currentPrompt,
        imageData: state.currentImageData,
        maskData: maskPayload.maskData,
        colorData: maskPayload.colorData,
        model: getSelectedModel(),
        endpoint: endpointInput.value,
        apiKey: apiKeyInput.value,
        feather: state.feather,
        userConfig: userConfigInput.value?.trim() || undefined,
        selectionBounds: selectionSnapshot,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || "Gemini call failed.");
    }
    await applyInpaintResult(payload);
    setStatus("Redraw complete. You can download or continue editing.", "success");
    notifySuccess("Redraw complete. You can download or continue editing.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Failed to redraw.", "error");
    notifyError(error.message || "Failed to redraw.");
  } finally {
    state.pendingSelectionBounds = null;
    state.isProcessing = false;
    updateButtonStates();
  }
}

function getSelectedModel() {
  return customModelInput.value?.trim() || modelSelect.value;
}

async function applyInpaintResult(payload) {
  const { imageBase64, mimeType } = payload;
  if (!imageBase64) {
    throw new Error("Gemini response is missing image data.");
  }
  const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;
  const img = await loadImageElement(dataUrl);
  imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
  imageCtx.drawImage(img, 0, 0, state.imageWidth, state.imageHeight);
  state.currentImageData = imageCanvas.toDataURL("image/png");
  const boundsForPatch = state.pendingSelectionBounds || state.selectionBounds;
  // Use currentImageData (scaled to canvas size) instead of raw Gemini response
  state.lastPatchData = boundsForPatch ? await extractPatch(state.currentImageData, boundsForPatch) : null;
  state.pendingSelectionBounds = null;
  clearBrushLayer();
  drawOverlay();
  updateButtonStates();
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function extractPatch(dataUrl, bounds) {
  if (!bounds) return null;
  const { x, y, width, height } = bounds;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  try {
    const img = await loadImageElement(dataUrl);
    tempCtx.drawImage(img, x, y, width, height, 0, 0, width, height);
    return tempCanvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to build patch", error);
    return null;
  }
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function updateButtonStates() {
  const hasImage = Boolean(state.currentImageData);
  const hasSelection = Boolean(state.selectionPath);
  const promptReady = Boolean(promptInput.value.trim());

  clearSelectionBtn.disabled = !hasSelection;
  cropSelectionBtn.disabled = !hasSelection || state.isProcessing || state.isCropping;
  fillSelectionBtn.disabled = !hasSelection;
  applyBrushBtn.disabled = !state.hasBrush;
  clearBrushBtn.disabled = !state.hasBrush;
  downloadFullBtn.disabled = !hasImage;

  // Undo button: enabled when there's brush history OR when last action was apply
  const canUndo = state.brushHistory.length > 0 || (state.lastActionWasApply && state.lastApplyImageData);
  undoBrushBtn.disabled = !canUndo;

  const patchReady = Boolean(state.lastPatchData) || Boolean(state.selectionBounds);
  downloadPatchBtn.disabled = !patchReady || !hasImage;

  inpaintBtn.disabled = !hasImage || !hasSelection || !promptReady || state.isProcessing || !state.modelsLoaded;
}

// ==========================================================================
// Notification Functions
// ==========================================================================

function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted");
      }
    });
  }
}

function sendNotification(title, options = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Don't send notification if the page is visible/focused
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const defaultOptions = {
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "inpainter-notification",
    renotify: true,
  };

  const notification = new Notification(title, { ...defaultOptions, ...options });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

function notifySuccess(message) {
  sendNotification("Inpainting Complete", {
    body: message || "Your image has been processed successfully.",
    tag: "inpainter-success",
  });
}

function notifyError(message) {
  sendNotification("Inpainting Error", {
    body: message || "An error occurred while processing your image.",
    tag: "inpainter-error",
  });
}

init();
