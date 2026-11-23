import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Download, FileImage, FilePlus2,
  FileText, Files, ImagePlus, LoaderCircle, LockKeyhole, MousePointer2,
  RotateCcw, RotateCw, Scissors, ShieldCheck, Sparkles, Trash2, Upload, X,
  FileArchive, FileSpreadsheet, FileType2, ScanText, KeyRound, Stamp, Keyboard, Languages,
} from 'lucide-react';

// PDF.js is large. Load it only after a PDF is selected so the initial
// corporate workspace stays fast and the PDF renderer is cached separately.
let pdfJsModulePromise;
let pdfJsApi;
async function loadPdfJs() {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjsLib, pdfWorker]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
      pdfJsApi = pdfjsLib;
      return pdfjsLib;
    }).catch((error) => {
      // Permit retry after a transient chunk/network failure.
      pdfJsModulePromise = undefined;
      throw error;
    });
  }
  return pdfJsModulePromise;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

const BUILT_IN_STAMPS = [
  { id: 'approved', name: 'APPROVED', text: 'APPROVED', color: '#b42318', fontSize: 25 },
  { id: 'received', name: 'RECEIVED', text: 'RECEIVED', color: '#175cd3', fontSize: 24 },
  { id: 'draft', name: 'DRAFT', text: 'DRAFT', color: '#b54708', fontSize: 26 },
  { id: 'confidential', name: 'CONFIDENTIAL', text: 'CONFIDENTIAL', color: '#6941c6', fontSize: 21 },
  { id: 'copy', name: 'COPY', text: 'COPY', color: '#475467', fontSize: 26 },
];


const RIBBON_GROUPS = {
  Home: [
    ['Upload PDF', 'Open a PDF document from your computer', 'available', 'upload'],
    ['Export PDF', 'Save your current document changes', 'available', 'export'],
    ['Undo', 'Undo the latest page or overlay edit', 'available', 'undo'],
    ['Redo', 'Restore the last undone edit', 'available', 'redo'],
    ['Merge PDFs', 'Combine multiple documents in order', 'available', 'merge'],
    ['Split PDF', 'Extract selected pages or page ranges', 'available', 'split'],
  ],
  Organize: [
    ['Organize pages', 'Reorder, rotate and delete pages', 'available', 'pages'],
    ['Duplicate pages', 'Create a copy of the active page in the page list', 'available', 'duplicate'],
    ['Crop pages', 'Trim margins and set page dimensions', 'planned', 'roadmap'],
    ['PDF overlay / letterhead', 'Place one PDF over another document', 'planned', 'roadmap'],
    ['Page numbers', 'Add sequential page labels', 'available', 'watermark'],
  ],
  Edit: [
    ['Find & Replace', 'Search words, phrases and sentences', 'available', 'find'],
    ['Add text', 'Place text on the current page', 'available', 'text'],
    ['Insert image', 'Add a logo, photo or signature image', 'available', 'image'],
    ['Shapes & arrows', 'Draw boxes, circles and directional arrows', 'planned', 'roadmap'],
    ['Whiteout / cover-up', 'Permanently cover selected page content', 'planned', 'roadmap'],
    ['Paragraph reflow', 'Edit existing paragraphs like a word processor', 'planned', 'roadmap'],
  ],
  Convert: [
    ['PDF to Word', 'Export image-faithful or editable DOCX', 'available', 'word'],
    ['PDF to Excel', 'Extract tables into XLSX', 'available', 'excel'],
    ['PDF to RTF', 'Export rich text format', 'available', 'rtf'],
    ['Office to PDF', 'Convert Word, Excel and PowerPoint files', 'planned', 'roadmap'],
    ['PDF to images', 'Render pages as JPG or PNG', 'planned', 'roadmap'],
    ['Images to PDF', 'Combine JPG, PNG, TIFF and BMP images into one PDF', 'available', 'images-pdf'],
    ['Office to PDF', 'Convert Word, Excel and PowerPoint files', 'planned', 'roadmap'],
    ['Webpage to PDF', 'Capture a formatted webpage as a PDF', 'planned', 'roadmap'],
    ['CAD / Visio to PDF', 'Convert technical drawings and diagrams', 'planned', 'roadmap'],
    ['E-invoice PDF', 'Create ZUGFeRD / Factur-X invoice packages', 'planned', 'roadmap'],
    ['PDF portfolio', 'Bundle mixed file types with navigation', 'planned', 'roadmap'],
  ],
  Review: [
    ['Highlight & markup', 'Highlight, underline and strike through text', 'planned', 'roadmap'],
    ['Sticky notes', 'Attach review comments to pages', 'planned', 'roadmap'],
    ['Highlight / underline', 'Mark important lines and passages', 'planned', 'roadmap'],
    ['Freehand drawing', 'Annotate with a pen or touch input', 'planned', 'roadmap'],
    ['Compare PDFs', 'Find differences between two document versions', 'planned', 'roadmap'],
    ['Bates numbering', 'Apply sequential legal identifiers', 'planned', 'roadmap'],
    ['Document comparison', 'Highlight changed text and images across versions', 'planned', 'roadmap'],
  ],
  'Forms & Sign': [
    ['Fill & Sign', 'Place a saved signature image', 'available', 'signature'],
    ['Stamp library', 'Use reusable business stamps', 'available', 'stamps'],
    ['Fillable forms', 'Add fields, checkboxes and dropdowns', 'planned', 'roadmap'],
    ['Request signatures', 'Send multi-party signing requests', 'planned', 'roadmap'],
    ['Signature audit trail', 'Create a signing evidence certificate', 'planned', 'roadmap'],
  ],
  Protect: [
    ['AES-256 password', 'Encrypt the exported PDF', 'available', 'protect'],
    ['Permissions', 'Restrict printing, copying and editing', 'planned', 'roadmap'],
    ['Permanent redaction', 'Remove confidential content irreversibly', 'planned', 'roadmap'],
    ['Unlock PDF', 'Remove a password from an authorised PDF', 'planned', 'roadmap'],
    ['Permanent redaction', 'Remove confidential content irreversibly', 'planned', 'roadmap'],
    ['Repair PDF', 'Recover damaged or unreadable documents', 'planned', 'roadmap'],
    ['Web optimize', 'Linearize PDFs for faster first-page loading', 'planned', 'roadmap'],
  ],
  OCR: [
    ['Searchable OCR', 'Recognise scanned pages and create searchable PDFs', 'available', 'ocr'],
    ['Layout OCR', 'Export recognised text with page coordinates', 'available', 'layout-ocr'],
    ['Deskew scans', 'Straighten crooked scanned pages', 'planned', 'roadmap'],
  ],
  Batch: [
    ['Batch compression', 'Compress multiple PDFs in one operation', 'planned', 'roadmap'],
    ['Batch OCR', 'Run OCR across a folder of documents', 'planned', 'roadmap'],
    ['Batch watermark', 'Apply a common watermark to many PDFs', 'planned', 'roadmap'],
    ['Batch find & replace', 'Replace text across multiple PDFs', 'planned', 'roadmap'],
    ['ZIP package', 'Bundle selected PDFs into a ZIP archive', 'available', 'zip'],
  ],
  Measure: [
    ['Blueprint calibration', 'Set drawing scale from a known dimension', 'planned', 'roadmap'],
    ['Distance & perimeter', 'Measure lengths directly on a PDF plan', 'planned', 'roadmap'],
    ['Area takeoff', 'Calculate surface areas from calibrated drawings', 'planned', 'roadmap'],
    ['E-invoice PDF', 'Create structured ZUGFeRD / Factur-X invoices', 'planned', 'roadmap'],
    ['PDF portfolio', 'Bundle mixed file types with navigation', 'planned', 'roadmap'],
  ],
};
const RIBBON_TABS = Object.keys(RIBBON_GROUPS);

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function responseError(response) {
  try {
    const body = await response.json();
    return body.detail || body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function PdfPageCanvas({ document, pageIndex, rotation = 0, thumbnail = false, onTextClick, selectedTextEdit, onDraftChange, onApplyEdit, onCancelEdit, inlineTextEdits = [] }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [textItems, setTextItems] = useState([]);
  const [dimensions, setDimensions] = useState(null);
  const [displayScale, setDisplayScale] = useState(1);

  // PDF.js positions are measured in the canvas's intrinsic pixels. On narrow
  // screens CSS shrinks the canvas, so keep every click target/editor in the
  // same displayed coordinate space as the visible page.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !dimensions?.width) return undefined;
    const updateScale = () => {
      const rect = wrapper.getBoundingClientRect();
      if (rect.width > 0) setDisplayScale(rect.width / dimensions.width);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [dimensions]);
  useEffect(() => {
    let cancelled = false;
    let renderTask;
    async function draw() {
      if (!document || !canvasRef.current) return;
      try {
        const page = await document.getPage(pageIndex + 1);
        if (cancelled) return;
        const scale = thumbnail ? 0.27 : 1.35;
        const viewport = page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 });
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        setDimensions({ width: viewport.width, height: viewport.height });
        renderTask = page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport });
        await renderTask.promise;
        if (!thumbnail && onTextClick && pdfJsApi?.Util) {
          const content = await page.getTextContent();
          if (cancelled) return;
          const rows = [];
          content.items.forEach((item, index) => {
            if (!item.str || !item.str.trim()) return;
            const tx = pdfJsApi.Util.transform(viewport.transform, item.transform);
            const baseline = Math.round(tx[5] / 3) * 3;
            let row = rows.find((r) => Math.abs(r.baseline - baseline) <= 3);
            if (!row) { row = { baseline, entries: [] }; rows.push(row); }
            row.entries.push({ item, index, tx });
          });
          const positioned = [];
          rows.forEach((row) => {
            row.entries.sort((a, b) => a.tx[4] - b.tx[4]);
            const line = row.entries.map((entry) => entry.item.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
            if (!line) return;
            const left = Math.min(...row.entries.map((entry) => entry.tx[4]));
            const top = Math.min(...row.entries.map((entry) => entry.tx[5] - Math.max(8, Math.hypot(entry.tx[2], entry.tx[3]))));
            const right = Math.max(...row.entries.map((entry) => entry.tx[4] + Math.max(5, entry.item.width * scale)));
            const bottom = Math.max(...row.entries.map((entry) => entry.tx[5]));
            const [pdfX1, pdfY1] = viewport.convertToPdfPoint(left, top);
            const [pdfX2, pdfY2] = viewport.convertToPdfPoint(right, bottom);
            const bbox = [Math.min(pdfX1, pdfX2), Math.min(pdfY1, pdfY2), Math.max(pdfX1, pdfX2), Math.max(pdfY1, pdfY2)];
            const fontSize = Math.max(5, ...row.entries.map((entry) => entry.item.height || Math.hypot(entry.tx[2], entry.tx[3]) / scale));
            positioned.push({ id: row.entries[0].index, text: line, line, left, top, width: Math.max(8, right-left), height: Math.max(10, bottom-top), bbox, fontSize });
          });
          setTextItems(positioned);
        } else setTextItems([]);
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') console.warn('PDF page render failed', error);
      }
    }
    draw();
    return () => { cancelled = true; try { renderTask?.cancel(); } catch { /* no-op */ } };
  }, [document, pageIndex, rotation, thumbnail, onTextClick]);
  return (
    <div ref={wrapperRef} className={thumbnail ? 'pdf-canvas-wrap thumbnail-wrap' : 'pdf-canvas-wrap'} style={!thumbnail && dimensions ? { width: dimensions.width, height: dimensions.height, position: 'relative' } : undefined}>
      <canvas className={thumbnail ? 'thumbnail-canvas' : 'document-canvas'} ref={canvasRef} />
      {!thumbnail && textItems.length > 0 && <div className="pdf-click-text-layer">
        {textItems.map((item) => <button key={item.id} type="button" className="pdf-click-text" style={{ left: item.left * displayScale, top: item.top * displayScale, width: item.width * displayScale, height: item.height * displayScale }} title="Click to edit this sentence" onClick={() => onTextClick({ ...item, page: pageIndex })}>{item.text}</button>)}
        {inlineTextEdits.filter((edit) => edit.page === pageIndex).map((edit) => <div key={edit.id} className="pdf-inline-preview" style={{ left: edit.displayRect.left * displayScale, top: edit.displayRect.top * displayScale, width: edit.displayRect.width * displayScale, minHeight: edit.displayRect.height * displayScale }}>{edit.text}</div>)}
        {selectedTextEdit?.page === pageIndex && <div className="pdf-inline-editor" style={{ left: selectedTextEdit.displayRect.left * displayScale, top: selectedTextEdit.displayRect.top * displayScale, minWidth: Math.max(220, selectedTextEdit.displayRect.width * displayScale), width: Math.min(520, Math.max(220, selectedTextEdit.displayRect.width * displayScale)), minHeight: Math.max(46, selectedTextEdit.displayRect.height * displayScale) }} onClick={(event) => event.stopPropagation()}>
          <input autoFocus aria-label="Edit selected PDF sentence" value={selectedTextEdit.draft} onChange={(event) => onDraftChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onApplyEdit(); } if (event.key === 'Escape') onCancelEdit(); }} />
          <div className="pdf-inline-actions"><button type="button" onClick={onApplyEdit}>Apply</button><button type="button" onClick={onCancelEdit}>Cancel</button></div>
        </div>}
      </div>}
    </div>
  );
}

function App() {
  const inputRef = useRef(null);
  const mergeInputRef = useRef(null);
  const zipInputRef = useRef(null);
  const imagesToPdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const findInputRef = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState('Home');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageOrder, setPageOrder] = useState([]);
  const [activePage, setActivePage] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [rotations, setRotations] = useState({});
  const [overlays, setOverlays] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const [textValue, setTextValue] = useState('Add your text here');
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState('#20243a');
  const [positionX, setPositionX] = useState(10);
  const [positionY, setPositionY] = useState(12);
  const [imageWidth, setImageWidth] = useState(22);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState(null);
  const [clickedPdfLine, setClickedPdfLine] = useState('');
  const [selectedTextEdit, setSelectedTextEdit] = useState(null);
  const [inlineTextEdits, setInlineTextEdits] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [apiReady, setApiReady] = useState(false);
  const [splitRanges, setSplitRanges] = useState('1');
  const [wordMode, setWordMode] = useState('faithful');
  const [compressionQuality, setCompressionQuality] = useState('82');
  const [ocrLanguages, setOcrLanguages] = useState('eng+tam');
  const [protectPassword, setProtectPassword] = useState('');
  const [stampText, setStampText] = useState('REVIEWED');
  const [stampTemplates, setStampTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pdfstudio-stamp-templates') || '[]'); }
    catch { return []; }
  });
  const [signatureTemplates, setSignatureTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pdfstudio-signature-templates') || '[]'); }
    catch { return []; }
  });
  const [signatureTemplateName, setSignatureTemplateName] = useState('My signature');
  const [saveSignatureImage, setSaveSignatureImage] = useState(false);
  const [selectedSignatureId, setSelectedSignatureId] = useState('');
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const pageCount = pageOrder.length;
  const currentIndex = pageOrder.indexOf(activePage);
  const selectedCount = selectedPages.size;

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  }, []);

  const snapshotEdits = () => ({
    pageOrder: [...pageOrder],
    selectedPages: [...selectedPages],
    rotations: { ...rotations },
    overlays: [...overlays],
    inlineTextEdits: [...inlineTextEdits],
    activePage,
    watermarkEnabled,
    watermarkText,
    pageNumbers,
  });

  const pushHistory = () => {
    historyRef.current.push(snapshotEdits());
    if (historyRef.current.length > 40) historyRef.current.shift();
    redoRef.current = [];
  };

  const restoreEdits = (snapshot) => {
    setPageOrder(snapshot.pageOrder);
    setSelectedPages(new Set(snapshot.selectedPages));
    setRotations(snapshot.rotations);
    setOverlays(snapshot.overlays);
    setInlineTextEdits(snapshot.inlineTextEdits || []);
    setWatermarkEnabled(snapshot.watermarkEnabled);
    setWatermarkText(snapshot.watermarkText);
    setPageNumbers(snapshot.pageNumbers);
    setActivePage(snapshot.activePage ?? snapshot.pageOrder[0] ?? 0);
  };

  const undoEdits = () => {
    const previous = historyRef.current.pop();
    if (!previous) { showToast('Nothing to undo.'); return; }
    redoRef.current.push(snapshotEdits());
    restoreEdits(previous);
    showToast('Last edit undone.');
  };

  const redoEdits = () => {
    const next = redoRef.current.pop();
    if (!next) { showToast('Nothing to redo.'); return; }
    historyRef.current.push(snapshotEdits());
    restoreEdits(next);
    showToast('Edit restored.');
  };

  useEffect(() => {
    try { localStorage.setItem('pdfstudio-stamp-templates', JSON.stringify(stampTemplates)); } catch { /* browser storage may be full or disabled */ }
  }, [stampTemplates]);

  useEffect(() => {
    try { localStorage.setItem('pdfstudio-signature-templates', JSON.stringify(signatureTemplates)); } catch { /* browser storage may be full or disabled */ }
  }, [signatureTemplates]);

  const refreshApiStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/health`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Python API returned HTTP ${response.status}.`);
      await response.json();
      setApiReady(true);
      return true;
    } catch {
      setApiReady(false);
      return false;
    }
  }, []);

  useEffect(() => { refreshApiStatus(); }, [refreshApiStatus]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    async function openPdf() {
      if (!pdfFile) {
        setPdfDocument(null);
        return;
      }
      setBusy(true);
      setStatusMessage('Preparing PDF preview…');
      try {
        const [bytes, pdfjsLib] = await Promise.all([pdfFile.arrayBuffer(), loadPdfJs()]);
        if (cancelled) return;
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
        const document = await loadingTask.promise;
        if (cancelled) return;
        setPdfDocument(document);
        historyRef.current = [];
        redoRef.current = [];
        const initialOrder = Array.from({ length: document.numPages }, (_, index) => index);
        setPageOrder(initialOrder);
        setActivePage(0);
        setSelectedPages(new Set(initialOrder));
        setRotations({});
        setOverlays([]);
        setInlineTextEdits([]);
        setSelectedTextEdit(null);
        setFindResults(null);
        setWatermarkEnabled(false);
        setPageNumbers(false);
        setStatusMessage('');
      } catch (error) {
        console.error(error);
        showToast(`Could not open this PDF: ${error.message || 'Invalid or damaged file'}`);
        setPdfFile(null);
        setPdfDocument(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    openPdf();
    return () => {
      cancelled = true;
      try { loadingTask?.destroy(); } catch { /* no-op */ }
    };
  }, [pdfFile, showToast]);

  const loadFile = useCallback((file) => {
    if (!file) return;
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
    const hasPdfMime = file.type === 'application/pdf' || file.type === 'application/x-pdf';
    if (!hasPdfExtension && !hasPdfMime) {
      showToast('Please choose a PDF file. Other file types are not supported here.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('This PDF is larger than the 100 MB upload limit.');
      return;
    }
    if (file.size === 0) {
      showToast('This file is empty. Choose a valid PDF document.');
      return;
    }
    setPdfFile(file);
    setStatusMessage('Opening PDF…');
  }, [showToast]);

  // Keep one file input mounted for the whole application. This makes the
  // upload action reliable from the header, welcome screen and Ctrl+O shortcut.
  const openPdfPicker = useCallback(() => {
    const picker = inputRef.current;
    if (!picker) {
      showToast('The PDF upload control is not mounted. Refresh the page and try again.');
      return;
    }
    // Reset first so choosing the same file twice still fires a change event.
    picker.value = '';
    try {
      // showPicker() is the browser-native picker API and is preferred in modern browsers.
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else picker.click();
    } catch (error) {
      // Older browsers or embedded contexts may reject showPicker; fall back to click().
      try { picker.click(); }
      catch { showToast('The browser blocked the file picker. Use the browser window directly and try again.'); }
    }
  }, [showToast]);

  const onPdfInputChange = (event) => {
    const picker = event.currentTarget;
    const selectedFile = picker.files?.[0] || null;
    // Store the File object before clearing the input. This permits re-selecting it later.
    if (selectedFile) loadFile(selectedFile);
    picker.value = '';
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) loadFile(files[0]);
  };

  const buildConfig = (selectedOnly = false) => {
    const watermark = watermarkEnabled && watermarkText.trim()
      ? { text: watermarkText.trim(), fontSize: 42, opacity: 0.18, color: '#8b90a0' }
      : null;
    return {
      order: pageOrder,
      rotations,
      selectedPages: selectedOnly ? Array.from(selectedPages) : [],
      overlays,
      inlineTextEdits,
      watermark,
      pageNumbers,
      replacements: [],
    };
  };

  const requestPdf = async (endpoint, config) => {
    if (!pdfFile) throw new Error('Open a PDF first.');
    const form = new FormData();
    form.append('file', pdfFile, pdfFile.name);
    form.append('config', JSON.stringify(config));
    const response = await fetch(`${API_BASE}/api/pdf/${endpoint}`, { method: 'POST', body: form });
    if (!response.ok) throw new Error(await responseError(response));
    return response.blob();
  };

  const downloadPdfEndpoint = async (endpoint, fields = {}, filename = 'ds-pdf-studio-tool-output') => {
    if (!pdfFile) { showToast('Open a PDF first.'); return; }
    setBusy(true);
    setStatusMessage('Processing document…');
    try {
      const currentEditedPdf = await requestPdf('export', buildConfig(false));
      const form = new FormData();
      form.append('file', new File([currentEditedPdf], pdfFile.name, { type: 'application/pdf' }));
      Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
      const response = await fetch(`${API_BASE}/api/pdf/${endpoint}`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const extension = endpoint.includes('split/zip') || endpoint === 'zip' ? 'zip' : endpoint === 'convert/docx' ? 'docx' : endpoint === 'convert/xlsx' ? 'xlsx' : endpoint === 'convert/rtf' ? 'rtf' : 'pdf';
      downloadBlob(blob, `${filename}.${extension}`);
      if (endpoint === 'compress') {
        const ratio = response.headers.get('x-compression-percent');
        showToast(ratio !== null ? `Compressed PDF prepared (${ratio}% size change).` : 'Compressed PDF prepared.');
      } else {
        showToast('Your file is ready to download.');
      }
    } catch (error) {
      showToast(error.message || 'The operation failed.');
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  };

  const handlePdfTextClick = useCallback((item) => {
    const value = String(item?.line || item?.text || '').trim();
    if (!value || !Array.isArray(item?.bbox)) return;
    setSelectedTextEdit({
      id: crypto.randomUUID(),
      page: Number(item.page),
      originalText: value,
      draft: value,
      bbox: item.bbox.map(Number),
      displayRect: { left: item.left, top: item.top, width: item.width, height: item.height },
      fontSize: Number(item.fontSize) || 10,
    });
    setActiveRibbonTab('Edit');
    showToast('Edit directly on the selected PDF sentence, then press Apply.');
  }, [showToast]);

  const applyInlineTextEdit = useCallback(() => {
    if (!selectedTextEdit) return;
    const text = String(selectedTextEdit.draft || '');
    if (!text.trim()) { showToast('Enter replacement text, or cancel the edit.'); return; }
    pushHistory();
    setInlineTextEdits((previous) => [...previous, { ...selectedTextEdit, text }]);
    setSelectedTextEdit(null);
    showToast('Sentence edit applied to the page preview. Export the PDF to save it.');
  }, [selectedTextEdit, showToast]);

  const findInDocument = async () => {
    if (!pdfFile) { showToast('Upload a PDF before searching.'); return null; }
    const query = findText.trim();
    if (!query) { showToast('Enter a word or sentence to find in this PDF.'); return null; }
    setBusy(true);
    setStatusMessage('Searching selectable PDF text…');
    setFindResults(null);
    try {
      const form = new FormData();
      form.append('file', pdfFile, pdfFile.name);
      form.append('query', query);
      const response = await fetch(`${API_BASE}/api/pdf/find`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const results = await response.json();
      setFindResults(results);
      if (results.totalMatches === 0) {
        showToast('No selectable-text match found. Scanned PDFs need OCR before text replacement.');
      } else {
        showToast(`Found ${results.totalMatches} match(es) on ${results.pages.length} page(s).`);
      }
      return results;
    } catch (error) {
      showToast(error.message || 'Text search failed.');
      setFindResults(null);
      return null;
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  };

  const replaceAndDownload = async () => {
    if (!pdfFile) { showToast('Upload a PDF first.'); return; }
    if (!findText.trim()) { showToast('Enter the sentence or phrase to replace.'); return; }
    if (replaceText === '') { showToast('Enter replacement text. Leave a single space if you intend to blank the text.'); return; }
    let results = findResults;
    if (!results || results.query !== findText.trim()) results = await findInDocument();
    if (!results || results.totalMatches < 1) return;

    setBusy(true);
    setStatusMessage('Applying text replacements and preparing the edited PDF…');
    try {
      const config = { ...buildConfig(false), replacements: [{ find: findText.trim(), replace: replaceText }] };
      const blob = await requestPdf('export', config);
      downloadBlob(blob, `${pdfFile.name.replace(/\.pdf$/i, '')}-text-edited.pdf`);
      showToast(`Replacement exported. ${results.totalMatches} match(es) were found in the source PDF.`);
    } catch (error) {
      showToast(error.message || 'Could not apply the text replacement.');
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  };

  const runOcr = async () => {
    await downloadPdfEndpoint('ocr', { languages: ocrLanguages, output: 'pdf' }, `${pdfFile?.name.replace(/\.pdf$/i, '') || 'document'}-searchable-ocr`);
  };

  const runLayoutOcr = async () => {
    if (!pdfFile) { showToast('Open a PDF first.'); return; }
    setBusy(true);
    setStatusMessage('Extracting text, coordinates and page layout…');
    try {
      const currentEditedPdf = await requestPdf('export', buildConfig(false));
      const form = new FormData();
      form.append('file', new File([currentEditedPdf], pdfFile.name, { type: 'application/pdf' }));
      form.append('languages', ocrLanguages);
      form.append('output', 'layout');
      const response = await fetch(`${API_BASE}/api/pdf/ocr`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const json = await response.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json;charset=utf-8' });
      downloadBlob(blob, `${pdfFile.name.replace(/\.pdf$/i, '')}-ocr-layout.json`);
      showToast('Layout OCR extracted with text block positions.');
    } catch (error) {
      showToast(error.message || 'Layout OCR failed.');
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  };

  const protectPdf = async () => {
    if (protectPassword.length < 8) { showToast('Use a password with at least 8 characters.'); return; }
    await downloadPdfEndpoint('protect', { user_password: protectPassword }, `${pdfFile?.name.replace(/\.pdf$/i, '') || 'document'}-protected`);
    setProtectPassword('');
  };

  const saveStampTemplate = () => {
    if (!stampText.trim()) { showToast('Enter stamp text first.'); return; }
    const template = { id: crypto.randomUUID(), name: stampText.trim().slice(0, 24), text: stampText.trim().slice(0, 80), color: textColor, fontSize: Number(textSize) || 20 };
    setStampTemplates((previous) => [...previous.slice(-11), template]);
    showToast('Stamp saved in this browser.');
  };

  const applyStamp = (template) => {
    if (!template || !pdfFile) return;
    pushHistory();
    setOverlays((previous) => [...previous, {
      id: crypto.randomUUID(), page: activePage, type: 'text', text: template.text,
      x: 0.56, y: 0.13, width: 0.4, height: 0.12,
      fontSize: Number(template.fontSize) || 24, color: template.color || '#b42318',
    }]);
    showToast(`${template.name || template.text} stamp added.`);
  };

  const applySavedSignature = () => {
    const template = signatureTemplates.find((item) => item.id === selectedSignatureId);
    if (!template) { showToast('Choose a saved signature first.'); return; }
    pushHistory();
    setOverlays((previous) => [...previous, {
      id: crypto.randomUUID(), page: activePage, type: 'image', dataUrl: template.dataUrl,
      x: positionX / 100, y: positionY / 100, width: imageWidth / 100, height: 0.18,
    }]);
    showToast('Saved signature added to the page.');
  };

  const exportPdf = async (selectedOnly = false) => {
    if (selectedOnly && selectedPages.size === 0) {
      showToast('Select at least one page to split.');
      return;
    }
    setBusy(true);
    setStatusMessage(selectedOnly ? 'Preparing selected pages…' : 'Applying edits and preparing download…');
    try {
      const blob = await requestPdf(selectedOnly ? 'split' : 'export', buildConfig(selectedOnly));
      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      downloadBlob(blob, selectedOnly ? `${baseName}-selected-pages.pdf` : `${baseName}-edited.pdf`);
      showToast(selectedOnly ? 'Selected pages exported.' : 'Your edited PDF is ready.');
    } catch (error) {
      showToast(error.message || 'PDF export failed.');
    } finally {
      setBusy(false);
      setStatusMessage('');
    }
  };

  const mergePdfs = async (files) => {
    const extraFiles = Array.from(files || []).filter((file) => file.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFile || !extraFiles.length) return;
    setBusy(true);
    setStatusMessage('Applying current edits and merging documents…');
    try {
      const currentBlob = await requestPdf('export', buildConfig(false));
      const form = new FormData();
      form.append('files', new File([currentBlob], 'current-edits.pdf', { type: 'application/pdf' }));
      extraFiles.forEach((file) => form.append('files', file, file.name));
      const response = await fetch(`${API_BASE}/api/pdf/merge`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const mergedBlob = await response.blob();
      const mergedFile = new File([mergedBlob], 'merged-document.pdf', { type: 'application/pdf' });
      setPdfFile(mergedFile);
      showToast(`Merged ${extraFiles.length + 1} PDF documents.`);
    } catch (error) {
      showToast(error.message || 'Could not merge the PDFs.');
    } finally {
      setBusy(false);
      setStatusMessage('');
      if (mergeInputRef.current) mergeInputRef.current.value = '';
    }
  };

  const zipPdfs = async (files) => {
    const extraFiles = Array.from(files || []).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFile || !extraFiles.length) return;
    setBusy(true);
    setStatusMessage('Creating a compressed ZIP archive…');
    try {
      const currentBlob = await requestPdf('export', buildConfig(false));
      const form = new FormData();
      form.append('files', new File([currentBlob], `${pdfFile.name.replace(/\.pdf$/i, '')}-edited.pdf`, { type: 'application/pdf' }));
      extraFiles.forEach((file) => form.append('files', file, file.name));
      const response = await fetch(`${API_BASE}/api/pdf/zip`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      downloadBlob(await response.blob(), `${pdfFile.name.replace(/\.pdf$/i, '')}-pdf-archive.zip`);
      showToast(`ZIP archive created with ${extraFiles.length + 1} PDFs.`);
    } catch (error) {
      showToast(error.message || 'Could not create the ZIP archive.');
    } finally {
      setBusy(false);
      setStatusMessage('');
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const convertImagesToPdf = async (files) => {
    const images = Array.from(files || []).filter((file) => ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'].includes(file.type) || /\.(jpe?g|png|tiff?|bmp)$/i.test(file.name));
    if (!images.length) { showToast('Choose JPG, PNG, TIFF or BMP images.'); return; }
    if (images.length > 100) { showToast('Choose up to 100 images per PDF.'); return; }
    const form = new FormData();
    images.forEach((file) => form.append('files', file, file.name));
    setBusy(true);
    setStatusMessage('Converting images into PDF pages…');
    try {
      const response = await fetch(`${API_BASE}/api/pdf/from-images`, { method: 'POST', body: form });
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      downloadBlob(blob, 'images-to-pdf.pdf');
      showToast(`Created a PDF with ${images.length} image page(s).`);
    } catch (error) {
      showToast(error.message || 'Images to PDF conversion failed.');
    } finally {
      setBusy(false);
      setStatusMessage('');
      if (imagesToPdfInputRef.current) imagesToPdfInputRef.current.value = '';
    }
  };

  const toggleSelected = (index) => {
    setSelectedPages((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPages(selectedCount === pageCount ? new Set() : new Set(pageOrder));
  };

  const movePage = (direction) => {
    const index = pageOrder.indexOf(activePage);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= pageOrder.length) return;
    pushHistory();
    setPageOrder((previous) => {
      const next = [...previous];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const rotatePage = (direction) => {
    pushHistory();
    setRotations((previous) => ({ ...previous, [activePage]: ((previous[activePage] || 0) + direction + 360) % 360 }));
  };

  const deletePage = () => {
    if (pageCount <= 1) {
      showToast('A PDF must contain at least one page.');
      return;
    }
    pushHistory();
    const removedIndex = pageOrder.indexOf(activePage);
    const nextOrder = pageOrder.filter((index) => index !== activePage);
    setPageOrder(nextOrder);
    setSelectedPages((previous) => {
      const next = new Set(previous);
      next.delete(activePage);
      return next;
    });
    setActivePage(nextOrder[Math.min(removedIndex, nextOrder.length - 1)]);
    setOverlays((previous) => previous.filter((overlay) => overlay.page !== activePage));
  };

  const addTextOverlay = () => {
    if (!textValue.trim()) {
      showToast('Enter some text first.');
      return;
    }
    pushHistory();
    setOverlays((previous) => [...previous, {
      id: crypto.randomUUID(), page: activePage, type: 'text', text: textValue,
      x: positionX / 100, y: positionY / 100, width: 0.78, height: 0.2,
      fontSize: Number(textSize), color: textColor,
    }]);
    showToast('Text layer added to the active page.');
  };

  const addImageOverlay = async (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      showToast('Choose a PNG or JPG image.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Inserted images must be 15 MB or smaller.');
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    pushHistory();
    setOverlays((previous) => [...previous, {
      id: crypto.randomUUID(), page: activePage, type: 'image', dataUrl,
      x: positionX / 100, y: positionY / 100, width: imageWidth / 100, height: 0.18,
    }]);
    if (saveSignatureImage) {
      if (file.size > 650 * 1024) {
        showToast('Image added, but signature templates must be 650 KB or smaller for browser storage.');
      } else {
        const template = { id: crypto.randomUUID(), name: signatureTemplateName.trim() || 'Saved signature', dataUrl };
        setSignatureTemplates((previous) => [...previous.slice(-3), template]);
        setSelectedSignatureId(template.id);
        showToast('Image added and signature saved in this browser.');
        return;
      }
    }
    showToast('Image layer added to the active page.');
  };

  const clearCurrentOverlays = () => {
    pushHistory();
    setOverlays((previous) => previous.filter((overlay) => overlay.page !== activePage));
    showToast('Layers cleared from the active page.');
  };

  const resetEdits = () => {
    if (!pdfDocument) return;
    pushHistory();
    const initialOrder = Array.from({ length: pdfDocument.numPages }, (_, index) => index);
    setPageOrder(initialOrder);
    setActivePage(0);
    setSelectedPages(new Set(initialOrder));
    setRotations({});
    setOverlays([]);
    setWatermarkEnabled(false);
    setPageNumbers(false);
    setReplaceEnabled(false);
    showToast('Page changes and overlays have been reset.');
  };

  const activeOverlayCount = useMemo(() => overlays.filter((overlay) => overlay.page === activePage).length, [overlays, activePage]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (
        target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      );
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        openPdfPicker();
        return;
      }
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (event.shiftKey) exportPdf(true); else exportPdf(false);
        return;
      }
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        findInputRef.current?.focus();
        return;
      }
      if (typing) return;
      if (event.key === 'PageDown' && currentIndex < pageCount - 1) {
        event.preventDefault();
        setActivePage(pageOrder[currentIndex + 1]);
      } else if (event.key === 'PageUp' && currentIndex > 0) {
        event.preventDefault();
        setActivePage(pageOrder[currentIndex - 1]);
      } else if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redoEdits(); else undoEdits();
      } else if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redoEdits();
      } else if (mod && event.key === 'ArrowLeft') {
        event.preventDefault();
        rotatePage(-90);
      } else if (mod && event.key === 'ArrowRight') {
        event.preventDefault();
        rotatePage(90);
      } else if (event.key === 'Delete' && pdfFile) {
        event.preventDefault();
        deletePage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const openToolSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.classList.add('tool-section-focus');
    window.setTimeout(() => target?.classList.remove('tool-section-focus'), 1300);
  };

  const handleRibbonFeature = (feature) => {
    if (feature.action === 'upload') { openPdfPicker(); return; }
    if (feature.action === 'export') { if (pdfFile) exportPdf(false); else showToast('Upload a PDF before exporting.'); return; }
    if (feature.action === 'merge') { if (pdfFile) mergeInputRef.current?.click(); else openPdfPicker(); return; }
    if (feature.action === 'zip') { if (pdfFile) zipInputRef.current?.click(); else showToast('Upload a PDF before creating a ZIP.'); return; }
    if (feature.action === 'images-pdf') { imagesToPdfInputRef.current?.click(); return; }
    if (feature.action === 'split') { openToolSection('ribbon-split'); return; }
    if (feature.action === 'duplicate') {
      if (!pdfFile) { openPdfPicker(); return; }
      const current = pageOrder.indexOf(activePage);
      if (current < 0) { showToast('Select a page to duplicate.'); return; }
      if (pageOrder.length >= 500) { showToast('The 500-page workspace limit has been reached.'); return; }
      pushHistory();
      setPageOrder((previous) => [...previous.slice(0, current + 1), activePage, ...previous.slice(current + 1)]);
      setSelectedPages((previous) => new Set([...previous, activePage]));
      showToast('Page ' + (current + 1) + ' duplicated. Export PDF to save the copy.');
      return;
    }
    if (feature.action === 'pages') { if (!pdfFile) openPdfPicker(); else openToolSection('ribbon-pages'); return; }
    if (feature.action === 'find') { if (!pdfFile) openPdfPicker(); else { openToolSection('ribbon-find'); window.setTimeout(() => findInputRef.current?.focus(), 250); } return; }
    if (feature.action === 'text') { if (!pdfFile) openPdfPicker(); else openToolSection('ribbon-text'); return; }
    if (feature.action === 'image') { if (!pdfFile) openPdfPicker(); else imageInputRef.current?.click(); return; }
    if (feature.action === 'watermark') { if (!pdfFile) openPdfPicker(); else openToolSection('ribbon-watermark'); return; }
    if (feature.action === 'word' || feature.action === 'excel' || feature.action === 'rtf') {
      if (!pdfFile) { openPdfPicker(); return; }
      const endpoint = feature.action === 'word' ? 'convert/docx' : feature.action === 'excel' ? 'convert/xlsx' : 'convert/rtf';
      downloadPdfEndpoint(endpoint, feature.action === 'word' ? { mode: wordMode } : {}, `${pdfFile.name.replace(/\.pdf$/i, '')}-${feature.action}`); return;
    }
    if (feature.action === 'ocr') { if (!pdfFile) openPdfPicker(); else runOcr(); return; }
    if (feature.action === 'layout-ocr') { if (!pdfFile) openPdfPicker(); else runLayoutOcr(); return; }
    if (feature.action === 'protect') { if (!pdfFile) openPdfPicker(); else openToolSection('ribbon-protect'); return; }
    if (feature.action === 'signature' || feature.action === 'stamps') { if (!pdfFile) openPdfPicker(); else openToolSection('ribbon-stamps'); return; }
    if (feature.action === 'undo') { undoEdits(); return; }
    if (feature.action === 'redo') { redoEdits(); return; }
    showToast(`${feature.name || 'This tool'} is included in the DS PDF Studio roadmap. Its full processing workflow is not enabled in this release.`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-icon"><FileText size={19} strokeWidth={2.4} /></div>
          <div><div className="brand-name">DS PDF Studio Tool</div><div className="brand-caption">PROFESSIONAL DOCUMENT WORKSPACE</div></div>
        </div>
        <div className="topbar-context" aria-label="Workspace capabilities">
          <span>EDIT</span><i /> <span>CONVERT</span><i /> <span>PROTECT</span>
        </div>
        <div className="topbar-right">
          <div className={`privacy-pill ${apiReady ? 'online' : 'offline'}`}><ShieldCheck size={14} /> {apiReady ? 'Python engine connected' : 'API not connected'}</div>
          <button type="button" className="button button-primary top-upload" onClick={openPdfPicker} title="Choose a PDF from your computer (Ctrl+O)">
            <Upload size={15} /> {pdfFile ? 'Open PDF' : 'Upload PDF'}
          </button>
          {pdfFile && <button type="button" className="button button-primary top-download" onClick={() => exportPdf(false)} disabled={busy}><Download size={16} /> Export PDF</button>}
        </div>
      </header>

      <nav className="nitro-ribbon" aria-label="PDF tool categories">
        <div className="ribbon-tabs" role="tablist" aria-label="Tool categories">
          {RIBBON_TABS.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeRibbonTab === tab} className={`ribbon-tab ${activeRibbonTab === tab ? 'active' : ''}`} onClick={() => setActiveRibbonTab(tab)}>{tab}</button>)}
        </div>
        <div className="ribbon-tools" role="tabpanel">
          {RIBBON_GROUPS[activeRibbonTab].map(([name, description, status, action]) => (
            <button key={name} type="button" className={`ribbon-tool ${status === 'planned' ? 'is-planned' : ''}`} onClick={() => handleRibbonFeature({ name, description, status, action })} title={description}>
              <span className="ribbon-tool-icon">{status === 'available' ? <FileText size={18} /> : <Sparkles size={18} />}</span>
              <span className="ribbon-tool-name">{name}</span>
              <span className={`ribbon-tool-status ${status}`}>{status === 'available' ? 'Ready' : 'Roadmap'}</span>
            </button>
          ))}
        </div>
      </nav>

      <input
        ref={inputRef}
        id="pdf-upload-input"
        name="pdf-upload"
        type="file"
        accept="application/pdf,.pdf"
        className="hidden-input"
        aria-label="Choose a PDF document to edit"
        onChange={onPdfInputChange}
      />

      <main className="page-main">
        {!pdfFile ? (
          <section className="welcome-wrap">
            <div className="welcome-copy">
              <div className="eyebrow"><Sparkles size={14} /> DOCUMENT MANAGEMENT · MADE SIMPLE</div>
              <h1>Your PDF workflow,<br /><span>under one roof.</span></h1>
              <p>Work with documents in one focused workspace. Edit pages, convert files, run multilingual OCR, translate content, apply signatures and protect sensitive PDFs with a streamlined professional toolkit.</p>
              <div className="feature-pills"><span><Check size={14} /> Page management</span><span><Check size={14} /> Word / Excel / RTF</span><span><Check size={14} /> Indian-language OCR</span><span><Check size={14} /> AI translation</span></div>
            </div>
            <div className={`upload-card ${dragOver ? 'drag-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
              <div className="upload-icon"><Upload size={25} /></div>
              <h2>Drop your PDF here</h2>
              <p>or choose a document from your computer</p>
              <button type="button" className="button button-primary upload-button" onClick={openPdfPicker}><Upload size={17} /> Upload PDF to Edit</button>
              <div className="upload-foot"><LockKeyhole size={13} /> Files are processed in memory by your local Python service.</div>
              <div className="upload-action-hint">You can also press <strong>Ctrl + O</strong> or drag a PDF into this area.</div><div className="upload-limit">PDF only · Maximum 100 MB</div>
            </div>
            <div className="welcome-stats"><div><strong>01</strong><span><b>Import</b><small>Open a PDF securely</small></span></div><div><strong>02</strong><span><b>Work</b><small>Edit and transform</small></span></div><div><strong>03</strong><span><b>Deliver</b><small>Export your document</small></span></div></div>
          </section>
        ) : (
          <>
            <div className="document-heading">
              <div className="document-title-wrap"><div className="file-badge"><FileText size={19} /></div><div><h1>{pdfFile.name}</h1><p>{formatBytes(pdfFile.size)} <span>·</span> {pageCount} pages <span>·</span> {overlays.length} added layers</p></div></div>
              <div className="document-actions"><button type="button" className="button button-light" onClick={openPdfPicker}><FilePlus2 size={15} /> Open another</button><button className="button button-light" onClick={() => mergeInputRef.current?.click()}><Files size={15} /> Merge PDFs</button><button className="button button-light" onClick={() => zipInputRef.current?.click()}><FileArchive size={15} /> ZIP PDFs</button><button className="button button-primary" onClick={() => exportPdf(false)} disabled={busy}><Download size={15} /> Export</button></div>
              <input ref={mergeInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden-input" onChange={(event) => mergePdfs(event.target.files)} />
              <input ref={zipInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden-input" onChange={(event) => zipPdfs(event.target.files)} />
              <input ref={imagesToPdfInputRef} type="file" accept="image/jpeg,image/png,image/tiff,image/bmp,.jpg,.jpeg,.png,.tif,.tiff,.bmp" multiple className="hidden-input" onChange={(event) => convertImagesToPdf(event.target.files)} />
            </div>

            <section className="workspace-grid">
              <aside className="panel page-panel" id="ribbon-pages">
                <div className="panel-heading"><div><h2>Pages <span className="count-bubble">{pageCount}</span></h2><p>Choose and arrange pages</p></div><button className="text-action" onClick={selectAll}>{selectedCount === pageCount ? 'Clear' : 'Select all'}</button></div>
                <div className="page-list">
                  {pageOrder.map((pageIndex, displayIndex) => (
                    <div key={`${pageIndex}-${displayIndex}`} className={`page-tile ${activePage === pageIndex ? 'active' : ''}`} onClick={() => setActivePage(pageIndex)}>
                      <input type="checkbox" checked={selectedPages.has(pageIndex)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(pageIndex)} aria-label={`Select page ${displayIndex + 1}`} />
                      <div className="thumb-container"><PdfPageCanvas document={pdfDocument} pageIndex={pageIndex} rotation={rotations[pageIndex] || 0} thumbnail /><div className="tile-meta"><span>Page {displayIndex + 1}</span>{rotations[pageIndex] ? <span>{rotations[pageIndex]}°</span> : null}</div></div>
                    </div>
                  ))}
                </div>
                <div className="page-panel-footer"><span>{selectedCount} selected</span><button className="text-action" onClick={() => exportPdf(true)} disabled={busy || selectedCount === 0}><Scissors size={13} /> Split selection</button></div>
              </aside>

              <section className="panel editor-panel">
                <div className="editor-toolbar">
                  <div className="toolbar-group"><button className="icon-button" title="Rotate left" onClick={() => rotatePage(-90)} disabled={!pageCount}><RotateCcw size={16} /></button><button className="icon-button" title="Rotate right" onClick={() => rotatePage(90)} disabled={!pageCount}><RotateCw size={16} /></button><span className="toolbar-divider" /><button className="icon-button" title="Move page up" onClick={() => movePage(-1)} disabled={currentIndex <= 0}><ArrowUp size={16} /></button><button className="icon-button" title="Move page down" onClick={() => movePage(1)} disabled={currentIndex < 0 || currentIndex >= pageCount - 1}><ArrowDown size={16} /></button><button className="icon-button danger-hover" title="Delete page" onClick={deletePage} disabled={pageCount <= 1}><Trash2 size={16} /></button></div>
                  <div className="toolbar-right"><span className="page-indicator">Page <strong>{Math.max(0, currentIndex) + 1}</strong> of {pageCount}</span><button className="icon-button" title="Reset edits" onClick={resetEdits}><RotateCcw size={15} /></button></div>
                </div>
                <div className="document-stage">
                  {pdfDocument && pageCount > 0 ? (
                    <div className="paper-frame">
                      <PdfPageCanvas document={pdfDocument} pageIndex={activePage} rotation={rotations[activePage] || 0} onTextClick={handlePdfTextClick} selectedTextEdit={selectedTextEdit} onDraftChange={(draft) => setSelectedTextEdit((current) => current ? { ...current, draft } : current)} onApplyEdit={applyInlineTextEdit} onCancelEdit={() => setSelectedTextEdit(null)} inlineTextEdits={inlineTextEdits} />
                      <div className="overlay-preview-layer">
                        {overlays.filter((overlay) => overlay.page === activePage).map((overlay) => (
                          <div key={overlay.id} className="overlay-preview-item" style={{
                            left: `${overlay.x * 100}%`, top: `${overlay.y * 100}%`,
                            width: `${overlay.width * 100}%`, height: `${overlay.height * 100}%`,
                            color: overlay.color || '#20243a', fontSize: `${(Number(overlay.fontSize) || 18) * 1.2}px`,
                          }}>
                            {overlay.type === 'text' ? overlay.text : <img src={overlay.dataUrl} alt="Inserted PDF overlay" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="empty-page">No page selected</div>}
                </div>
                <div className="editor-footer"><span><span className="status-dot" /> {busy ? (statusMessage || 'Processing') : 'Ready to edit'}</span><span>Preview · Page {Math.max(0, currentIndex) + 1}</span></div>
              </section>

              <aside className="panel tools-panel">
                <div className="tools-heading"><div><h2>Editing tools</h2><p>Apply changes to your document</p></div><div className="tool-spark"><Sparkles size={16} /></div></div>
                <div className="tool-section" id="ribbon-text">
                  <div className="section-title"><span className="section-icon"><FileText size={15} /></span> Add text</div>
                  <label className="field-label">Text content</label><textarea className="text-area" rows="2" value={textValue} onChange={(event) => setTextValue(event.target.value)} />
                  <div className="two-fields"><div><label className="field-label">Font size</label><input className="field-input" type="number" min="5" max="96" value={textSize} onChange={(event) => setTextSize(event.target.value)} /></div><div><label className="field-label">Text colour</label><input className="color-input" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></div></div>
                  <div className="two-fields"><div><label className="field-label">X position (%)</label><input className="field-input" type="number" min="0" max="100" value={positionX} onChange={(event) => setPositionX(event.target.value)} /></div><div><label className="field-label">Y position (%)</label><input className="field-input" type="number" min="0" max="100" value={positionY} onChange={(event) => setPositionY(event.target.value)} /></div></div>
                  <button className="button button-soft full-button" onClick={addTextOverlay}><span>+</span> Add text to page</button>
                </div>

                <div className="tool-section">
                  <div className="section-title"><span className="section-icon"><ImagePlus size={15} /></span> Insert image or signature</div>
                  <div className="two-fields"><div><label className="field-label">Image width (%)</label><input className="field-input" type="number" min="3" max="100" value={imageWidth} onChange={(event) => setImageWidth(event.target.value)} /></div><div className="field-action"><label className="field-label">Select image</label><button className="button button-light compact-button" onClick={() => imageInputRef.current?.click()}><FileImage size={14} /> Browse</button></div></div>
                  <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden-input" onChange={(event) => { addImageOverlay(event.target.files?.[0]); event.target.value = ''; }} />
                </div>

                <div className="tool-section" id="ribbon-watermark">
                  <div className="section-title"><span className="section-icon"><Sparkles size={15} /></span> Watermark & numbering</div>
                  <label className="toggle-row"><span>Apply watermark</span><input type="checkbox" checked={watermarkEnabled} onChange={(event) => { pushHistory(); setWatermarkEnabled(event.target.checked); }} /></label>
                  {watermarkEnabled && <input className="field-input watermark-input" value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} placeholder="Watermark text" />}
                  <label className="toggle-row"><span>Add page numbers</span><input type="checkbox" checked={pageNumbers} onChange={(event) => { pushHistory(); setPageNumbers(event.target.checked); }} /></label>
                </div>

                <div className="tool-section" id="ribbon-find">
                  <div className="section-title"><span className="section-icon"><MousePointer2 size={15} /></span> Find & replace text</div>
                  <p className="micro-note">For direct editing, click a sentence on the PDF page itself. The editor opens over that sentence; this separate search box is optional. Scanned pages require OCR first.</p>
                  {clickedPdfLine && <div className="clicked-text-preview"><strong>Selected PDF sentence</strong><span>{clickedPdfLine}</span><button type="button" className="text-action" onClick={() => { setClickedPdfLine(''); setFindText(''); setReplaceText(''); }}>Clear selection</button></div>}
                  <label className="field-label">Find sentence or phrase</label>
                  <input ref={findInputRef} className="field-input" value={findText} onChange={(event) => { setFindText(event.target.value); setFindResults(null); }} placeholder="Enter exact text from the PDF" />
                  <button type="button" className="button button-light compact-button full-button" onClick={findInDocument} disabled={busy || !findText.trim()}><MousePointer2 size={13} /> Find in document</button>
                  {findResults && findResults.query === findText.trim() && (
                    <div className={`find-results ${findResults.totalMatches ? 'has-matches' : 'no-matches'}`}>
                      <strong>{findResults.totalMatches} match(es) found</strong>
                      {findResults.pages.map((item) => (
                        <button type="button" key={item.page} className="find-result-page" onClick={() => setActivePage(item.page)}>
                          Page {item.pageNumber} · {item.count} match(es)
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="field-label field-label-spaced">Replace with</label>
                  <input className="field-input" value={replaceText} onChange={(event) => setReplaceText(event.target.value)} placeholder="Enter replacement sentence" />
                  <button type="button" className="button button-primary compact-button full-button" onClick={replaceAndDownload} disabled={busy || !findText.trim() || !replaceText.trim()}><Check size={13} /> Apply replacement & download PDF</button>
                  <p className="micro-note">Search first, then apply. The updated PDF downloads as a new file; the source PDF remains unchanged. This works with selectable PDF text. Run OCR first for scanned pages. Original font and spacing may need manual review.</p>
                </div>

                <div className="tool-section">
                  <div className="section-title"><span className="section-icon"><FileType2 size={15} /></span> Convert & compress</div>
                  <label className="field-label">Word conversion mode</label>
                  <select className="field-input" value={wordMode} onChange={(event) => setWordMode(event.target.value)}>
                    <option value="faithful">Preserve page appearance (image-backed)</option>
                    <option value="editable">Editable Word reconstruction</option>
                  </select>
                  <div className="two-fields">
                    <button className="button button-light compact-button" onClick={() => downloadPdfEndpoint('convert/docx', { mode: wordMode }, `${pdfFile.name.replace(/\.pdf$/i, '')}-converted`)} disabled={busy}><FileText size={13} /> Word</button>
                    <button className="button button-light compact-button" onClick={() => downloadPdfEndpoint('convert/xlsx', {}, `${pdfFile.name.replace(/\.pdf$/i, '')}-tables`)} disabled={busy}><FileSpreadsheet size={13} /> Excel</button>
                  </div>
                  <button className="button button-light compact-button full-button" onClick={() => downloadPdfEndpoint('convert/rtf', {}, `${pdfFile.name.replace(/\.pdf$/i, '')}-converted`)} disabled={busy}><FileType2 size={13} /> Export to RTF</button>
                  <label className="field-label field-label-spaced">Image quality</label>
                  <select className="field-input" value={compressionQuality} onChange={(event) => setCompressionQuality(event.target.value)}><option value="92">High (92%)</option><option value="82">Balanced (82%)</option><option value="70">Smaller file (70%)</option><option value="55">Maximum compression (55%)</option></select>
                  <button className="button button-soft compact-button full-button" onClick={() => downloadPdfEndpoint('compress', { image_quality: compressionQuality }, `${pdfFile.name.replace(/\.pdf$/i, '')}-compressed`)} disabled={busy}><FileArchive size={13} /> Compress PDF</button>
                  <p className="micro-note">Excel export extracts table data. Word faithful mode preserves page visuals; editable mode reconstructs document elements.</p>
                </div>

                <div className="tool-section" id="ribbon-split">
                  <div className="section-title"><span className="section-icon"><Scissors size={15} /></span> Advanced split & ZIP</div>
                  <label className="field-label">Page ranges (example: 1-3,5,8-10)</label>
                  <input className="field-input" value={splitRanges} onChange={(event) => setSplitRanges(event.target.value)} placeholder="1-3,5,8-10" />
                  <button className="button button-light compact-button full-button" onClick={() => downloadPdfEndpoint('split/zip', { ranges: splitRanges }, `${pdfFile.name.replace(/\.pdf$/i, '')}-split-files`)} disabled={busy}><FileArchive size={13} /> Split ranges into ZIP</button>
                </div>

                <div className="tool-section">
                  <div className="section-title"><span className="section-icon"><ScanText size={15} /></span> Multilingual OCR</div>
                  <label className="field-label">Tesseract language codes</label>
                  <input className="field-input" value={ocrLanguages} onChange={(event) => setOcrLanguages(event.target.value)} placeholder="eng+tam+hin" />
                  <button className="button button-light compact-button full-button" onClick={runOcr} disabled={busy}><ScanText size={13} /> Create searchable PDF</button>
                  <p className="micro-note">Examples: eng, tam, hin, eng+tam, eng+hin. Install matching Tesseract language packs on the Python server.</p>
                </div>

                <div className="tool-section" id="ribbon-stamps">
                  <div className="section-title"><span className="section-icon"><Stamp size={15} /></span> Stamp & signature library</div>
                  <label className="field-label">Built-in stamps</label>
                  <div className="stamp-chip-list">
                    {BUILT_IN_STAMPS.map((stamp) => <button key={stamp.id} className="stamp-chip" onClick={() => applyStamp(stamp)}>{stamp.name}</button>)}
                  </div>
                  <label className="field-label field-label-spaced">Custom stamp text</label>
                  <div className="two-fields"><input className="field-input" value={stampText} onChange={(event) => setStampText(event.target.value)} placeholder="Your stamp" /><button className="button button-light compact-button" onClick={saveStampTemplate}>Save</button></div>
                  {stampTemplates.length > 0 && <div className="stamp-chip-list saved-stamps">{stampTemplates.map((stamp) => <button key={stamp.id} className="stamp-chip" onClick={() => applyStamp(stamp)}>{stamp.name}</button>)}</div>}
                  <label className="field-label field-label-spaced">Signature image template</label>
                  <input className="field-input" value={signatureTemplateName} onChange={(event) => setSignatureTemplateName(event.target.value)} placeholder="Signature name" />
                  <label className="toggle-row"><span>Save next image as template</span><input type="checkbox" checked={saveSignatureImage} onChange={(event) => setSaveSignatureImage(event.target.checked)} /></label>
                  <button className="button button-light compact-button full-button" onClick={() => imageInputRef.current?.click()}>Upload signature image</button>
                  {signatureTemplates.length > 0 && <><select className="field-input" value={selectedSignatureId} onChange={(event) => setSelectedSignatureId(event.target.value)}><option value="">Select saved signature</option>{signatureTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button button-light compact-button full-button" onClick={applySavedSignature}>Add saved signature to page</button></>}
                  <p className="micro-note">Templates stay in this browser only. Image signatures are visual stamps, not cryptographic digital signatures.</p>
                </div>

                <div className="tool-section" id="ribbon-protect">
                  <div className="section-title"><span className="section-icon"><KeyRound size={15} /></span> Password protection</div>
                  <label className="field-label">Open password (minimum 8 characters)</label>
                  <input className="field-input" type="password" autoComplete="new-password" value={protectPassword} onChange={(event) => setProtectPassword(event.target.value)} placeholder="Set PDF password" />
                  <button className="button button-light compact-button full-button" onClick={protectPdf} disabled={busy || protectPassword.length < 8}><LockKeyhole size={13} /> Encrypt with AES-256</button>
                  <p className="micro-note">This locks the exported file. Keep the password safe; this starter does not recover lost passwords.</p>
                </div>

                <div className="tool-section">
                  <div className="section-title"><span className="section-icon"><Keyboard size={15} /></span> Keyboard shortcuts</div>
                  <div className="shortcut-list">
                    <span>Open PDF</span><kbd>Ctrl O</kbd>
                    <span>Find text</span><kbd>Ctrl F</kbd>
                    <span>Export PDF</span><kbd>Ctrl S</kbd>
                    <span>Split selected pages</span><kbd>Ctrl Shift S</kbd>
                    <span>Undo / Redo</span><kbd>Ctrl Z / Ctrl Y</kbd>
                    <span>Rotate page</span><kbd>Ctrl ← / →</kbd>
                    <span>Change page</span><kbd>Page Up / Down</kbd>
                    <span>Delete active page</span><kbd>Delete</kbd>
                  </div>
                </div>

                <div className="tool-section last-section">
                  <div className="section-title"><span className="section-icon"><Files size={15} /></span> Layer management</div>
                  <div className="layer-summary"><span>{activeOverlayCount} layer(s) on this page</span><button className="text-action" onClick={clearCurrentOverlays} disabled={!activeOverlayCount}>Clear</button></div>
                  <div className="export-note"><LockKeyhole size={14} /><span>PDF processing is in memory. Saved stamp and signature templates are stored locally in this browser.</span></div>
                  <button className="button button-primary full-button export-bottom" onClick={() => exportPdf(false)} disabled={busy}><Download size={15} /> {busy ? 'Processing…' : 'Export edited PDF'}</button>
                </div>
              </aside>
            </section>
          </>
        )}
      </main>

      {busy && <div className="busy-ribbon"><LoaderCircle className="spin" size={15} /> {statusMessage || 'Working on your PDF…'}</div>}
      {toast && <div className="toast-message"><Check size={15} /> {toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
      <footer className="site-footer"><span>DS PDF Studio Tool</span><span>Professional PDF workspace <i /> Local-first document processing <i /> React · Python</span></footer>
    </div>
  );
}

export default App;
