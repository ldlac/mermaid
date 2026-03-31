import mermaid from "mermaid";

const STORAGE_KEY = "mermaid-diagrams";
const ACTIVE_KEY = "mermaid-active-id";

const DEFAULT_DIAGRAM = `flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    B -->|No| D[End]
    C --> D`;

const editor = document.getElementById("code-editor");
const output = document.getElementById("diagram-output");
const errorDisplay = document.getElementById("error-display");
const diagramTypeBadge = document.getElementById("diagram-type");
const exportPngBtn = document.getElementById("export-png");
const exportSvgBtn = document.getElementById("export-svg");
const formatBtn = document.getElementById("format-btn");
const newDiagramBtn = document.getElementById("new-diagram");
const saveDiagramBtn = document.getElementById("save-diagram");
const diagramNameInput = document.getElementById("diagram-name");
const diagramList = document.getElementById("diagram-list");

let renderTimeout = null;
let currentDiagramId = null;

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  sequence: {
    useMaxWidth: true,
  },
});

function getDiagrams() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDiagrams(diagrams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diagrams));
}

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY);
}

function setActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function createNewDiagram() {
  const diagrams = getDiagrams();
  const id = "diagram-" + Date.now();
  const name = "Untitled";

  diagrams[id] = { name, code: DEFAULT_DIAGRAM };
  saveDiagrams(diagrams);
  setActiveId(id);
  loadDiagram(id);
  renderDiagramList();
}

function saveCurrentDiagram() {
  const diagrams = getDiagrams();
  const id = currentDiagramId;

  if (!id || !diagrams[id]) return;

  const name = diagramNameInput.value.trim() || "Untitled";
  diagrams[id].name = name;
  diagrams[id].code = editor.value;

  saveDiagrams(diagrams);
  renderDiagramList();
}

function loadDiagram(id) {
  const diagrams = getDiagrams();
  const diagram = diagrams[id];

  if (!diagram) return;

  currentDiagramId = id;
  setActiveId(id);
  editor.value = diagram.code || "";
  diagramNameInput.value = diagram.name || "Untitled";
  renderDiagramList();
  renderDiagram();
}

function deleteDiagram(e, id) {
  e.stopPropagation();
  const diagrams = getDiagrams();

  if (!diagrams[id]) return;

  delete diagrams[id];
  saveDiagrams(diagrams);

  if (currentDiagramId === id) {
    const remainingIds = Object.keys(diagrams);
    if (remainingIds.length > 0) {
      loadDiagram(remainingIds[0]);
    } else {
      createNewDiagram();
    }
  }

  renderDiagramList();
}

function renderDiagramList() {
  const diagrams = getDiagrams();
  const ids = Object.keys(diagrams);

  diagramList.innerHTML = ids
    .map(
      (id) => `
    <div class="diagram-item ${id === currentDiagramId ? "active" : ""}" data-id="${id}">
      <span class="diagram-item-name">${diagrams[id].name || "Untitled"}</span>
      <button class="diagram-item-delete" data-id="${id}" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `
    )
    .join("");

  diagramList.querySelectorAll(".diagram-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (!e.target.closest(".diagram-item-delete")) {
        loadDiagram(item.dataset.id);
      }
    });
  });

  diagramList.querySelectorAll(".diagram-item-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => deleteDiagram(e, btn.dataset.id));
  });
}

function detectDiagramType(code) {
  const trimmed = code.trim().toLowerCase();
  if (trimmed.startsWith("flowchart") || trimmed.startsWith("graph"))
    return "flowchart";
  if (trimmed.startsWith("sequence")) return "sequence";
  if (trimmed.startsWith("class")) return "class";
  if (trimmed.startsWith("state")) return "state";
  if (trimmed.startsWith("er")) return "er";
  if (trimmed.startsWith("journey")) return "journey";
  if (trimmed.startsWith("gantt")) return "gantt";
  if (trimmed.startsWith("pie")) return "pie";
  if (trimmed.startsWith("mindmap")) return "mindmap";
  if (trimmed.startsWith("timeline")) return "timeline";
  return "diagram";
}

async function renderDiagram() {
  const code = editor.value.trim();

  if (!code) {
    output.innerHTML =
      '<p style="color: var(--text-muted);">Enter mermaid code to preview</p>';
    diagramTypeBadge.textContent = "-";
    errorDisplay.classList.add("hidden");
    return;
  }

  const type = detectDiagramType(code);
  diagramTypeBadge.textContent = type;

  const id = "diagram-" + Date.now();

  try {
    const { svg } = await mermaid.render(id, code);
    output.innerHTML = svg;
    errorDisplay.classList.add("hidden");
  } catch (err) {
    const errorMessage = err.message || String(err);
    output.innerHTML = "";
    errorDisplay.textContent = errorMessage;
    errorDisplay.classList.remove("hidden");
    console.error("Mermaid render error:", err);
  }
}

function debounceRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    renderDiagram();
    saveCurrentDiagram();
  }, 500);
}

async function exportAsPng() {
  const svgElement = output.querySelector("svg");
  if (!svgElement) {
    alert("No diagram to export");
    return;
  }

  let width = svgElement.getAttribute("width");
  let height = svgElement.getAttribute("height");

  if (!width || !height || width === "0" || height === "0") {
    const viewBox = svgElement.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(/[\s,]+/).filter(Boolean);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
  }

  if (!width || width === "0") width = "800";
  if (!height || height === "0") height = "600";

  const svgClone = svgElement.cloneNode(true);
  svgClone.setAttribute("width", width);
  svgClone.setAttribute("height", height);
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const serializer = new XMLSerializer();
  const svgData = serializer.serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    const w = parseFloat(width) || img.width;
    const h = parseFloat(height) || img.height;
    canvas.width = w * scale;
    canvas.height = h * scale;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "diagram.png";
    link.href = pngUrl;
    link.click();

    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    alert("Failed to load SVG for export");
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

async function exportAsSvg() {
  const svgElement = output.querySelector("svg");
  if (!svgElement) {
    alert("No diagram to export");
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const link = document.createElement("a");
  link.download = "diagram.svg";
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

function init() {
  const diagrams = getDiagrams();
  const activeId = getActiveId();

  if (Object.keys(diagrams).length === 0) {
    createNewDiagram();
  } else if (activeId && diagrams[activeId]) {
    loadDiagram(activeId);
  } else {
    const firstId = Object.keys(diagrams)[0];
    loadDiagram(firstId);
  }

  renderDiagramList();
}

editor.addEventListener("input", debounceRender);
exportPngBtn.addEventListener("click", exportAsPng);
exportSvgBtn.addEventListener("click", exportAsSvg);
newDiagramBtn.addEventListener("click", createNewDiagram);
saveDiagramBtn.addEventListener("click", () => {
  saveCurrentDiagram();
  renderDiagram();
});
diagramNameInput.addEventListener("input", debounceRender);

init();
