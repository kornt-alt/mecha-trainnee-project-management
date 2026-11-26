// frontend/src/components/boards/BoardCanvas.js — Infinite-canvas whiteboard object model, interactions, rendering, undo/redo.
//
// Integrates with MECHA conventions: React-Bootstrap modal/dialog patterns, project access via useMockData().access,
// existing icon set (Icons.js), and the dot-grid canvas look from post it.html.
//
// Persistence: frontend-only localStorage via boardStore.js (no backend dependency, no real cross-user sync).
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import {
  createBlankBoard, createObjectId, loadBoards, saveBoards, touchBoard,
} from '../../utils/boardStore';
import { STICKY_COLORS, STICKY_COLOR_ORDER, defaultStickySize } from './boardTypes';
import { X, Trash2, ChevronRight, LayoutGrid } from '../common/Icons';

function genId(prefix = 'obj') { return createObjectId(prefix); }
function cloneDeep(value) { return JSON.parse(JSON.stringify(value)); }
function newItem(type, overrides = {}) {
  const base = { id: genId(), type, x: 0, y: 0, width: 0, height: 0, zIndex: 10, text: '' };
  return { ...base, ...overrides };
}
function newGroup(overrides = {}) {
  return { id: genId('grp'), title: 'กลุ่มพื้นที่', x: 0, y: 0, width: 400, height: 300, ...overrides };
}
function newConnector(overrides = {}) {
  return { id: genId('conn'), fromId: '', toId: '', ...overrides };
}
function screenToWorld(panX, panY, scale, viewportRect, cx, cy) {
  return { x: (cx - viewportRect.left - panX) / scale, y: (cy - viewportRect.top - panY) / scale };
}

export default function BoardCanvas({ boardId, onClose }) {

  // ── Component state ──────────────────────────────────────────────────────────
  const { actorId } = useMockData();
  const navigate = useNavigate();

  const boardRef = useRef(null);
  const boardsRef = useRef([]);
  const [boards, setBoards] = useState([]);
  const [board, setBoard] = useState(null);
  const boardStateRef = useRef(null);
  const loadedBoardIdRef = useRef(null);
  useEffect(() => { boardStateRef.current = board; }, [board]);
  useEffect(() => { boardsRef.current = boards; }, [boards]);

  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [scale, setScale] = useState(1);

  const [currentTool, setCurrentTool] = useState('select');
  const [openFlyout, setOpenFlyout] = useState(null);
  const [penColor, setPenColor] = useState('#18181B');
  const [penWidth, setPenWidth] = useState(2.5);
  const [activeNoteColor, setActiveNoteColor] = useState('yellow');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const zCounterRef = useRef(10);

  // ── History (undo/redo) state (declared early so effects can reference it) ──
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [connectorFromId, setConnectorFromId] = useState(null);
  const [rightDrawerMode, setRightDrawerMode] = useState(null);
  const [minimapVisible, setMinimapVisible] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [boardTitleEdit, setBoardTitleEdit] = useState('');

  const [projectLinkModalOpen, setProjectLinkModalOpen] = useState(false);
  const [projectLinkInput, setProjectLinkInput] = useState('');

  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardVisibility, setNewBoardVisibility] = useState('private');
  const [newBoardProjectId, setNewBoardProjectId] = useState('');

  const [shareModalOpen, setShareModalOpen] = useState(false);

  const [selectionBarRect, setSelectionBarRect] = useState({ left: 0, top: 0, visible: false });

  const interaction = useRef(null);
  const textSaveTimer = useRef(null);

  // ── Load board / initialization ─────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.add('board-canvas-mode');
    return () => document.documentElement.classList.remove('board-canvas-mode');
  }, []);

  useEffect(() => {
    setBoards(loadBoards());
  }, []);

  useEffect(() => {
    const all = boardsRef.current.length ? boardsRef.current : loadBoards();
    const found = boardId ? all.find((b) => b.id === boardId) : (all[0] || null);
    if (!found) { setBoard(null); loadedBoardIdRef.current = null; return; }
    // Only re-hydrate transient canvas state when opening a (different) board,
    // not when the same board is saved back during editing.
    if (loadedBoardIdRef.current === found.id) return;
    loadedBoardIdRef.current = found.id;
    const normalized = {
      ...found,
      items: Array.isArray(found.items) ? found.items : [],
      groups: Array.isArray(found.groups) ? found.groups : [],
      connectors: Array.isArray(found.connectors) ? found.connectors : [],
      viewport: found.viewport && typeof found.viewport === 'object' ? found.viewport : { panX: 0, panY: 0, scale: 1 },
      updatedAt: new Date().toISOString(),
    };
    setBoard(normalized);
    setBoardTitleEdit(found.title);
    setPanX(found.viewport?.panX ?? 0);
    setPanY(found.viewport?.panY ?? 0);
    setScale(found.viewport?.scale ?? 1);
    setSelectedIds(new Set());
    setUndoStack([]);
    setRedoStack([]);
    setOpenFlyout(null);
    setCurrentTool('select');
    setConnectorFromId(null);
  }, [boardId]);

  // ── History (undo/redo) ─────────────────────────────────────────────────────

  const recordHistory = useCallback(() => {
    const b = boardStateRef.current;
    if (!b) return;
    const snap = JSON.stringify({ groups: b.groups, items: b.items, connectors: b.connectors });
    setUndoStack((prev) => {
      if (prev.length && prev[prev.length - 1] === snap) return prev;
      const next = [...prev, snap];
      if (next.length > 40) next.shift();
      setRedoStack([]);
      return next;
    });
  }, []);
  // ── Persistence ─────────────────────────────────────────────────────────────
  // Always persists the latest board state. Accepts an explicit board so callers
  // never rely on a stale `board` closure. Writing the same open board back does
  // NOT reset transient canvas state (viewport/selection/history are untouched).
  const saveCurrentBoard = useCallback((nextBoard) => {
    const b = nextBoard || boardStateRef.current;
    if (!b) return;
    setBoards((prev) => {
      const next = prev.map((bb) => (bb.id === b.id ? b : bb));
      saveBoards(next);
      return next;
    });
  }, []);

  // Commit a fully-formed next board: updates React state and persists to localStorage.
  const commitBoard = useCallback((nextBoard) => {
    if (!nextBoard) return;
    setBoard(nextBoard);
    saveCurrentBoard(nextBoard);
  }, [saveCurrentBoard]);

  // ── History (undo / redo) ───────────────────────────────────────────────────
  const undo = useCallback(() => {
    const b = boardStateRef.current;
    if (!b || undoStack.length === 0) return;
    const lastSnap = undoStack[undoStack.length - 1];
    const restored = JSON.parse(lastSnap);
    const next = { ...b, groups: restored.groups, items: restored.items, connectors: restored.connectors };
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, JSON.stringify({ groups: b.groups, items: b.items, connectors: b.connectors })]);
    setBoard(next);
    setSelectedIds(new Set());
    saveCurrentBoard(next);
  }, [undoStack, saveCurrentBoard]);

  const redo = useCallback(() => {
    if (!board || redoStack.length === 0) return;
    const lastSnap = redoStack[redoStack.length - 1];
    const restored = JSON.parse(lastSnap);
    const next = { ...boardStateRef.current, groups: restored.groups, items: restored.items, connectors: restored.connectors };
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, JSON.stringify({ groups: board.groups, items: board.items, connectors: board.connectors })]);
    setBoard(next);
    setSelectedIds(new Set());
    saveCurrentBoard(next);
  }, [board, redoStack, saveCurrentBoard]);

  // ── Object creation helpers ─────────────────────────────────────────────────
  const viewportCenterWorld = useCallback(() => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const r = boardRef.current.getBoundingClientRect();
    return screenToWorld(panX, panY, scale, r, r.left + r.width / 2, r.top + r.height / 2);
  }, [panX, panY, scale]);

  const addStickyNote = useCallback((color = 'yellow', wide = false) => {
    setActiveNoteColor(color);
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const center = viewportCenterWorld();
    const jitter = () => Math.round((Math.random() - 0.5) * 50);
    const size = defaultStickySize(wide);
    const item = newItem('sticky', {
      x: Math.round(center.x - size.width / 2 + jitter()),
      y: Math.round(center.y - size.height / 2 + jitter()),
      width: size.width, height: size.height, color,
      zIndex: ++zCounterRef.current,
    });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, viewportCenterWorld, recordHistory, commitBoard]);

  const addStickyNoteAt = useCallback((x, y, color, wide = false) => {
    if (!board) return;
    recordHistory();
    const size = defaultStickySize(wide);
    const item = newItem('sticky', { x: Math.round(x), y: Math.round(y), width: size.width, height: size.height, color, zIndex: ++zCounterRef.current });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, recordHistory, commitBoard]);

  const addTextItem = useCallback((variant = 'body') => {
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const center = viewportCenterWorld();
    const item = newItem('text', {
      x: Math.round(center.x - 130), y: Math.round(center.y - 30),
      width: variant === 'heading' ? 300 : 240, height: variant === 'heading' ? 56 : 80, variant,
      zIndex: ++zCounterRef.current,
    });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, viewportCenterWorld, recordHistory, commitBoard]);

  const addShapeItem = useCallback((shapeType) => {
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const center = viewportCenterWorld();
    const item = newItem('shape', {
      x: Math.round(center.x - 80), y: Math.round(center.y - 60),
      width: 160, height: shapeType === 'circle' || shapeType === 'diamond' ? 140 : 110, shapeType,
      zIndex: ++zCounterRef.current,
    });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, viewportCenterWorld, recordHistory, commitBoard]);

  const addStickerItem = useCallback((stickerName) => {
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const center = viewportCenterWorld();
    const item = newItem('sticker', { x: Math.round(center.x - 36), y: Math.round(center.y - 36), width: 72, height: 72, stickerName, zIndex: ++zCounterRef.current });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, viewportCenterWorld, recordHistory, commitBoard]);

  const addCommentPin = useCallback((wx, wy) => {
    if (!board) return;
    recordHistory();
    const item = newItem('commentPin', { x: Math.round(wx - 16), y: Math.round(wy - 16), width: 32, height: 32, text: 'ความคิดเห็นที่ปักหมุด', zIndex: ++zCounterRef.current });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
    setSelectedIds(new Set([item.id]));
    setCurrentTool('select');
    setRightDrawerMode('comments');
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, item] }));
  }, [board, recordHistory, commitBoard]);

  const createGroupFrame = useCallback(() => {
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const selItems = board.items.filter((i) => selectedIds.has(i.id));
    let gx, gy, gw, gh;
    if (selItems.length > 0) {
      const minX = Math.min(...selItems.map((i) => i.x));
      const minY = Math.min(...selItems.map((i) => i.y));
      const maxX = Math.max(...selItems.map((i) => i.x + i.width));
      const maxY = Math.max(...selItems.map((i) => i.y + i.height));
      gx = minX - 24; gy = minY - 52; gw = (maxX - minX) + 48; gh = (maxY - minY) + 76;
    } else {
      const center = viewportCenterWorld();
      gx = center.x - 230; gy = center.y - 170; gw = 460; gh = 340;
    }
    const grp = newGroup({ x: Math.round(gx), y: Math.round(gy), width: Math.round(gw), height: Math.round(gh) });
    setBoard((prev) => touchBoard({ ...prev, groups: [...prev.groups, grp] }));
    setSelectedIds(new Set([grp.id]));
    setCurrentTool('select');
    commitBoard(touchBoard({ ...boardStateRef.current, groups: [...board.groups, grp] }));
  }, [board, selectedIds, viewportCenterWorld, recordHistory, commitBoard]);

  const insertEmptyFramework = useCallback((kind) => {
    setOpenFlyout(null);
    if (!board) return;
    recordHistory();
    const center = viewportCenterWorld();
    const nextGroups = [...board.groups];
    let groupIdCounter = 0;
    const grpId = () => `grp-${Date.now()}-${groupIdCounter++}`;
    if (kind === '2x2') {
      const titles = ['Quadrant 1', 'Quadrant 2', 'Quadrant 3', 'Quadrant 4'];
      const offsets = [[-370, -270], [10, -270], [-370, 10], [10, 10]];
      offsets.forEach(([ox, oy], idx) => {
        nextGroups.push(newGroup({ id: `${grpId()}-${idx}`, title: titles[idx], x: Math.round(center.x + ox), y: Math.round(center.y + oy), width: 360, height: 260 }));
      });
    } else if (kind === 'strip') {
      ['Phase 1', 'Phase 2', 'Phase 3'].forEach((t, idx) => {
        nextGroups.push(newGroup({ id: `${grpId()}-${idx}`, title: t, x: Math.round(center.x - 555 + idx * 380), y: Math.round(center.y - 180), width: 360, height: 360 }));
      });
    }
    setBoard((prev) => touchBoard({ ...prev, groups: nextGroups }));
    commitBoard(touchBoard({ ...boardStateRef.current, groups: nextGroups }));
  }, [board, viewportCenterWorld, recordHistory, commitBoard]);

  // ── Selection / transform actions ───────────────────────────────────────────
  const selectOnly = useCallback((id) => {
    if (!selectedIds.has(id) || selectedIds.size > 1) setSelectedIds(new Set([id]));
  }, [selectedIds]);

  const recolorSelected = useCallback((color) => {
    if (!board) return;
    const stickySelected = board.items.filter((i) => selectedIds.has(i.id) && i.type === 'sticky');
    if (!stickySelected.length) return;
    recordHistory();
    setBoard((prev) => touchBoard({ ...prev, items: prev.items.map((i) => (selectedIds.has(i.id) && i.type === 'sticky') ? { ...i, color } : i) }));
    setActiveNoteColor(color);
    commitBoard(touchBoard({ ...boardStateRef.current, items: board.items.map((i) => (selectedIds.has(i.id) && i.type === 'sticky') ? { ...i, color } : i) }));
  }, [board, selectedIds, recordHistory, commitBoard]);

  const duplicateSelected = useCallback(() => {
    if (!board || selectedIds.size === 0) return;
    recordHistory();
    const copies = board.items.filter((i) => selectedIds.has(i.id)).map((orig) => {
      const copy = cloneDeep(orig); copy.id = genId(); copy.x += 28; copy.y += 28; copy.zIndex = ++zCounterRef.current; return copy;
    });
    setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, ...copies] }));
    setSelectedIds(new Set(copies.map((c) => c.id)));
    commitBoard(touchBoard({ ...boardStateRef.current, items: [...board.items, ...copies] }));
  }, [board, selectedIds, recordHistory, commitBoard]);

  const bringSelectedToFront = useCallback(() => {
    if (!board || selectedIds.size === 0) return;
    setBoard((prev) => touchBoard({ ...prev, items: prev.items.map((i) => (selectedIds.has(i.id) ? { ...i, zIndex: ++zCounterRef.current } : i)) }));
    commitBoard(touchBoard({ ...boardStateRef.current, items: board.items.map((i) => (selectedIds.has(i.id) ? { ...i, zIndex: ++zCounterRef.current } : i)) }));
  }, [board, selectedIds, commitBoard]);

  const deleteSelected = useCallback(() => {
    if (!board || selectedIds.size === 0) return;
    recordHistory();
    setBoard((prev) => touchBoard({
      ...prev,
      items: prev.items.filter((i) => !selectedIds.has(i.id)),
      groups: prev.groups.filter((g) => !selectedIds.has(g.id)),
      connectors: prev.connectors.filter((c) => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)),
    }));
    setSelectedIds(new Set());
    commitBoard(touchBoard({
      ...board,
      items: board.items.filter((i) => !selectedIds.has(i.id)),
      groups: board.groups.filter((g) => !selectedIds.has(g.id)),
      connectors: board.connectors.filter((c) => !selectedIds.has(c.fromId) && !selectedIds.has(c.toId)),
    }));
  }, [board, selectedIds, recordHistory, commitBoard]);

  const deleteSingleItem = useCallback((id) => {
    if (!board) return;
    recordHistory();
    setBoard((prev) => touchBoard({ ...prev, items: prev.items.filter((i) => i.id !== id), connectors: prev.connectors.filter((c) => c.fromId !== id && c.toId !== id) }));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    commitBoard(touchBoard({ ...boardStateRef.current, items: board.items.filter((i) => i.id !== id), connectors: board.connectors.filter((c) => c.fromId !== id && c.toId !== id) }));
  }, [board, recordHistory, commitBoard]);

  const autoArrangeSelectedGrid = useCallback(() => {
    if (!board) return;
    const targets = selectedIds.size > 0 ? board.items.filter((i) => selectedIds.has(i.id)) : board.items.filter((i) => i.type === 'sticky');
    if (targets.length < 2) return;
    recordHistory();
    const startX = Math.min(...targets.map((t) => t.x));
    const startY = Math.min(...targets.map((t) => t.y));
    const cols = Math.ceil(Math.sqrt(targets.length));
    setBoard((prev) => touchBoard({ ...prev, items: prev.items.map((item) => {
      if (!selectedIds.has(item.id)) return item;
      const idx = targets.indexOf(item); const col = idx % cols; const row = Math.floor(idx / cols);
      return { ...item, x: startX + col * (item.width + 24), y: startY + row * (item.height + 24) };
    })}));
    commitBoard(touchBoard({ ...boardStateRef.current, items: board.items.map((item) => {
      if (!selectedIds.has(item.id)) return item;
      const idx = targets.indexOf(item); const col = idx % cols; const row = Math.floor(idx / cols);
      return { ...item, x: startX + col * (item.width + 24), y: startY + row * (item.height + 24) };
    })}));
  }, [board, selectedIds, recordHistory, commitBoard]);

  // ── Connector mode ──────────────────────────────────────────────────────────
  const startConnectorMode = useCallback(() => { setOpenFlyout(null); setCurrentTool('connect'); setConnectorFromId(null); }, [setOpenFlyout]);
  const cancelConnectorMode = useCallback(() => { setConnectorFromId(null); if (currentTool === 'connect') setCurrentTool('select'); }, [currentTool]);

  const handleConnectorObjectClick = useCallback((id) => {
    if (!connectorFromId) { setConnectorFromId(id); }
    else if (connectorFromId !== id) {
      recordHistory();
      setBoard((prev) => touchBoard({ ...prev, connectors: [...prev.connectors, newConnector({ fromId: connectorFromId, toId: id })] }));
      setConnectorFromId(null); setCurrentTool('select');
      commitBoard(touchBoard({ ...boardStateRef.current, connectors: [...boardStateRef.current.connectors, newConnector({ fromId: connectorFromId, toId: id })] }));
    }
  }, [connectorFromId, recordHistory, commitBoard]);

  // ── Viewport / zoom / pan ───────────────────────────────────────────────────
  const applyTransform = useCallback((nextPanX, nextPanY, nextScale) => {
    setPanX(nextPanX); setPanY(nextPanY); setScale(nextScale);
    if (board) {
      const next = { ...boardStateRef.current, viewport: { panX: nextPanX, panY: nextPanY, scale: nextScale } };
      setBoard(next);
      saveCurrentBoard(next);
    }
  }, [board, saveCurrentBoard]);

  const zoomAt = useCallback((nextScale, cx, cy) => {
    if (!boardRef.current) return;
    const r = boardRef.current.getBoundingClientRect();
    const clamped = Math.min(2.2, Math.max(0.3, +nextScale.toFixed(2)));
    const ox = cx - r.left, oy = cy - r.top;
    const wx = (ox - panX) / scale, wy = (oy - panY) / scale;
    applyTransform(ox - wx * clamped, oy - wy * clamped, clamped);
  }, [panX, panY, scale, applyTransform]);

  const zoomBy = useCallback((delta) => {
    if (!boardRef.current) return;
    const r = boardRef.current.getBoundingClientRect();
    zoomAt(scale + delta, r.left + r.width / 2, r.top + r.height / 2);
  }, [scale, zoomAt]);

  const resetZoom = useCallback(() => applyTransform(0, 0, 1), [applyTransform]);

  const fitToScreen = useCallback(() => {
    if (!board || !boardRef.current) return;
    const all = [...board.items, ...board.groups];
    if (!all.length) { resetZoom(); return; }
    const minX = Math.min(...all.map((i) => i.x)); const minY = Math.min(...all.map((i) => i.y));
    const maxX = Math.max(...all.map((i) => i.x + i.width)); const maxY = Math.max(...all.map((i) => i.y + i.height));
    const r = boardRef.current.getBoundingClientRect();
    const cw = Math.max(1, maxX - minX), ch = Math.max(1, maxY - minY);
    const nextScale = +Math.min(1.2, Math.max(0.35, Math.min((r.width - 180) / cw, (r.height - 180) / ch))).toFixed(2);
    const nextPanX = (r.width - cw * nextScale) / 2 - minX * nextScale;
    const nextPanY = (r.height - ch * nextScale) / 2 - minY * nextScale;
    applyTransform(nextPanX, nextPanY, nextScale);
  }, [board, applyTransform, resetZoom]);

  // ── Pointer engine ──────────────────────────────────────────────────────────
  const onViewportPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    // If the click landed on a canvas item, let the item's own handler take over
    // (avoid starting a marquee/drag conflict between native viewport listener and React).
    if (e.target && e.target.closest && e.target.closest('.board-canvas-item')) return;
    setOpenFlyout(null); setNavDropdownOpen(false);
    const vp = boardRef.current; if (!vp) return;
    const r = vp.getBoundingClientRect();

    if (currentTool === 'pan') {
      interaction.current = { type: 'pan', sx: e.clientX, sy: e.clientY, px: panX, py: panY };
      vp.style.cursor = 'grabbing';
      return;
    }

    const wpt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);

    if (currentTool === 'comment') {
      addCommentPin(wpt.x, wpt.y); setCurrentTool('select'); setRightDrawerMode('comments');
      return;
    }
    if (currentTool === 'draw') {
      interaction.current = { type: 'draw', points: [[Math.round(wpt.x), Math.round(wpt.y)]] };
      return;
    }

    if (!e.shiftKey) setSelectedIds(new Set());
    interaction.current = { type: 'marquee', sx: e.clientX, sy: e.clientY, wx: wpt.x, wy: wpt.y };
    const box = document.getElementById('marqueeBox');
    if (box) { box.style.left = `${e.clientX - r.left}px`; box.style.top = `${e.clientY - r.top}px`; box.style.width = '0px'; box.style.height = '0px'; box.classList.remove('hidden'); }
  }, [currentTool, panX, panY, scale, addCommentPin, setRightDrawerMode]);

  const onItemPointerDown = useCallback((e, id) => {
    if (currentTool === 'pan' || currentTool === 'draw') return;
    e.stopPropagation();
    if (currentTool === 'connect') { handleConnectorObjectClick(id); return; }
    const vp = boardRef.current; const r = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
    const wpt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);
    const starts = new Map();
    const b = board;
    // targetIds computed synchronously: setSelectedIds is async, so selectedIds
    // would still be stale here and `starts` would end up empty.
    let targetIds: string[];
    if (e.shiftKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedIds(next);
      targetIds = [...next];
    } else {
      setSelectedIds(new Set([id]));
      targetIds = [id];
    }
    targetIds.forEach((targetId) => {
      const item = b.items.find((i) => i.id === targetId);
      if (item) starts.set(targetId, { x: item.x, y: item.y });
    });
    interaction.current = { type: 'dragItems', moved: false, wx: wpt.x, wy: wpt.y, starts };
  }, [currentTool, selectedIds, board, panX, panY, scale, handleConnectorObjectClick]);

  const onGroupPointerDown = useCallback((e, id) => {
    if (currentTool === 'pan' || currentTool === 'draw') return;
    e.stopPropagation();
    if (currentTool === 'connect') { handleConnectorObjectClick(id); return; }
    setSelectedIds(new Set([id]));
    const b = board; const grp = b.groups.find((g) => g.id === id); if (!grp) return;
    const vp = boardRef.current; const r = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
    const wpt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);
    const childStarts = new Map();
    b.items.forEach((i) => {
      const cx = i.x + i.width / 2, cy = i.y + i.height / 2;
      if (cx >= grp.x && cx <= grp.x + grp.width && cy >= grp.y && cy <= grp.y + grp.height) childStarts.set(i.id, { x: i.x, y: i.y });
    });
    interaction.current = { type: 'dragGroup', moved: false, id, wx: wpt.x, wy: wpt.y, gStart: { x: grp.x, y: grp.y }, childStarts };
  }, [currentTool, board, panX, panY, scale, handleConnectorObjectClick]);

  const onResizePointerDown = useCallback((e, kind, id) => {
    e.stopPropagation(); recordHistory();
    const b = board; const obj = kind === 'group' ? b.groups.find((g) => g.id === id) : b.items.find((i) => i.id === id);
    if (!obj) return;
    const vp = boardRef.current; const r = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
    const wpt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);
    interaction.current = { type: 'resize', kind, id, wx: wpt.x, wy: wpt.y, sw: obj.width, sh: obj.height };
  }, [board, panX, panY, scale, recordHistory]);

  const onWindowPointerMove = useCallback((e) => {
    if (!interaction.current) return;
    const b = board; if (!b) return;
    const vp = boardRef.current; const r = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 };
    const wpt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);

    if (interaction.current.type === 'pan') {
      applyTransform(interaction.current.px + (e.clientX - interaction.current.sx), interaction.current.py + (e.clientY - interaction.current.sy), scale);
      return;
    }
    if (interaction.current.type === 'draw') {
      interaction.current.points.push([Math.round(wpt.x), Math.round(wpt.y)]);
      const d = interaction.current.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
      const layer = document.getElementById('liveDrawLayer');
      if (layer) layer.innerHTML = `<path d="${d}" fill="none" stroke="${penColor}" stroke-width="${penWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
      return;
    }

    const dx = wpt.x - interaction.current.wx; const dy = wpt.y - interaction.current.wy;

    if (interaction.current.type === 'dragItems') {
      if (!interaction.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) interaction.current.moved = true;
      interaction.current.starts.forEach((pos, id) => { const item = b.items.find((i) => i.id === id); if (item) { item.x = Math.round(pos.x + dx); item.y = Math.round(pos.y + dy); } });
      setBoard({ ...b });
    } else if (interaction.current.type === 'dragGroup') {
      if (!interaction.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) interaction.current.moved = true;
      const grp = b.groups.find((g) => g.id === interaction.current.id); if (grp) { grp.x = Math.round(interaction.current.gStart.x + dx); grp.y = Math.round(interaction.current.gStart.y + dy); }
      interaction.current.childStarts.forEach((pos, id) => { const item = b.items.find((i) => i.id === id); if (item) { item.x = Math.round(pos.x + dx); item.y = Math.round(pos.y + dy); } });
      setBoard({ ...b });
    } else if (interaction.current.type === 'resize') {
      const obj = interaction.current.kind === 'group' ? b.groups.find((g) => g.id === interaction.current.id) : b.items.find((i) => i.id === interaction.current.id);
      if (obj) { obj.width = Math.max(48, Math.round(interaction.current.sw + dx)); obj.height = Math.max(48, Math.round(interaction.current.sh + dy)); setBoard({ ...b }); }
    } else if (interaction.current.type === 'marquee') {
      const box = document.getElementById('marqueeBox');
      if (box) { box.style.left = `${Math.min(interaction.current.sx, e.clientX) - r.left}px`; box.style.top = `${Math.min(interaction.current.sy, e.clientY) - r.top}px`; box.style.width = `${Math.abs(e.clientX - interaction.current.sx)}px`; box.style.height = `${Math.abs(e.clientY - interaction.current.sy)}px`; }
      const x1 = Math.min(interaction.current.wx, wpt.x), y1 = Math.min(interaction.current.wy, wpt.y);
      const x2 = Math.max(interaction.current.wx, wpt.x), y2 = Math.max(interaction.current.wy, wpt.y);
      setSelectedIds((prev) => { const next = new Set(prev); b.items.forEach((i) => { const hit = i.x < x2 && (i.x + i.width) > x1 && i.y < y2 && (i.y + i.height) > y1; if (hit) next.add(i.id); else if (!e.shiftKey) next.delete(i.id); }); return next; });
    }
  }, [board, panX, panY, scale, applyTransform, penColor, penWidth]);

  const onWindowPointerUp = useCallback(() => {
    if (!interaction.current) return;
    const b = board; if (!b) return;
    if (interaction.current.type === 'marquee') {
      const box = document.getElementById('marqueeBox'); if (box) box.classList.add('hidden');
    } else if (interaction.current.type === 'draw') {
      const layer = document.getElementById('liveDrawLayer'); if (layer) layer.innerHTML = '';
      const pts = interaction.current.points;
      if (pts.length > 2) {
        recordHistory();
        const minX = Math.min(...pts.map((p) => p[0])); const minY = Math.min(...pts.map((p) => p[1]));
        const maxX = Math.max(...pts.map((p) => p[0])); const maxY = Math.max(...pts.map((p) => p[1]));
        const relPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0] - minX} ${p[1] - minY}`).join(' ');
        const next = touchBoard({ ...boardStateRef.current, items: [...board.items, newItem('drawing', { x: minX, y: minY, width: Math.max(20, maxX - minX), height: Math.max(20, maxY - minY), path: relPath, strokeColor: penColor, strokeWidth: penWidth, zIndex: ++zCounterRef.current })] });
        setBoard(next);
        saveCurrentBoard(next);
      }
    } else {
      // drag / resize end: board was mutated in place during the move; persist it now
      const next = touchBoard(board);
      setBoard(next);
      saveCurrentBoard(next);
    }
    interaction.current = null;
  }, [board, penColor, penWidth, recordHistory, saveCurrentBoard]);

  const onViewportWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomBy(e.deltaY < 0 ? 0.08 : -0.08);
    else applyTransform(panX - e.deltaX, panY - e.deltaY, scale);
  }, [panX, panY, scale, applyTransform, zoomBy]);

  const onViewportDblClick = useCallback((e) => {
    const vp = boardRef.current;
    if (!vp) return;
    if (e.target !== vp && e.target.id !== 'wbItemsLayer' && e.target.id !== 'wbGroupsLayer' && e.target.id !== 'liveDrawLayer') return;
    const r = vp.getBoundingClientRect();
    const pt = screenToWorld(panX, panY, scale, r, e.clientX, e.clientY);
    addStickyNoteAt(pt.x - 100, pt.y - 85, activeNoteColor, false);
  }, [panX, panY, scale, addStickyNoteAt, activeNoteColor]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    const activeTag = (document.activeElement && document.activeElement.tagName) || '';
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || Boolean(document.activeElement?.isContentEditable);
    if (e.key === 'Escape') { setOpenFlyout(null); setNavDropdownOpen(false); cancelConnectorMode(); setRightDrawerMode(null); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !editing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !editing) { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !editing) { e.preventDefault(); duplicateSelected(); return; }
    if (editing) return;
    if (e.code === 'Space') e.preventDefault();
    else if (e.key.toLowerCase() === 'v') setCurrentTool('select');
    else if (e.key.toLowerCase() === 'h') setCurrentTool('pan');
    else if (e.key.toLowerCase() === 's') addStickyNote(activeNoteColor, false);
    else if (e.key.toLowerCase() === 'g') createGroupFrame();
    else if (e.key.toLowerCase() === 'c') setCurrentTool('comment');
    else if (e.key.toLowerCase() === 't') addTextItem('body');
    else if (e.key.toLowerCase() === 'p') { setOpenFlyout('draw'); setCurrentTool('draw'); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  }, [activeNoteColor, addStickyNote, addTextItem, createGroupFrame, deleteSelected, duplicateSelected, undo, redo, cancelConnectorMode, setRightDrawerMode]);

  const onKeyUp = useCallback((e) => { if (e.code === 'Space') setCurrentTool(currentTool === 'pan' ? 'pan' : 'select'); }, [currentTool, setCurrentTool]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [onKeyDown, onKeyUp]);

  useEffect(() => () => { clearTimeout(textSaveTimer.current); }, []);

  useEffect(() => {
    const vp = boardRef.current; if (!vp) return;
    vp.addEventListener('pointerdown', onViewportPointerDown);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    vp.addEventListener('mousedown', onViewportPointerDown);
    window.addEventListener('mousemove', onWindowPointerMove);
    window.addEventListener('mouseup', onWindowPointerUp);
    vp.addEventListener('wheel', onViewportWheel, { passive: false });
    vp.addEventListener('dblclick', onViewportDblClick);
    return () => { vp.removeEventListener('pointerdown', onViewportPointerDown); window.removeEventListener('pointermove', onWindowPointerMove); window.removeEventListener('pointerup', onWindowPointerUp); vp.removeEventListener('mousedown', onViewportPointerDown); window.removeEventListener('mousemove', onWindowPointerMove); window.removeEventListener('mouseup', onWindowPointerUp); vp.removeEventListener('wheel', onViewportWheel); vp.removeEventListener('dblclick', onViewportDblClick); };
  }, [onViewportPointerDown, onWindowPointerMove, onWindowPointerUp, panX, panY, scale, applyTransform, zoomBy, addStickyNoteAt, activeNoteColor, onViewportWheel, onViewportDblClick]);

  // ── Board lifecycle actions ─────────────────────────────────────────────────
  const renameBoard = useCallback((val) => {
    if (!board) return;
    const clean = val.trim() || 'Untitled board';
    setBoardTitleEdit(clean);
    const next = touchBoard({ ...boardStateRef.current, title: clean });
    setBoard(next);
    saveCurrentBoard(next);
  }, [board, saveCurrentBoard]);

  const linkProject = useCallback((projectId) => {
    if (!board) return;
    const next = touchBoard({ ...boardStateRef.current, projectId: projectId ? String(projectId) : '' });
    setBoard(next);
    saveCurrentBoard(next);
    setProjectLinkModalOpen(false);
  }, [board, saveCurrentBoard]);

  const updateItemText = useCallback((id, val) => {
    if (!board) return;
    const item = board.items.find((i) => i.id === id); if (!item) return;
    const nextItems = board.items.map((i) => i.id === id ? { ...i, text: val } : i);
    const next = touchBoard({ ...boardStateRef.current, items: nextItems });
    clearTimeout(textSaveTimer.current);
    setBoard(next);
    textSaveTimer.current = setTimeout(() => { saveCurrentBoard(next); }, 500);
  }, [board, saveCurrentBoard]);

  const renameGroup = useCallback((id, val) => {
    if (!board) return; const g = board.groups.find((grp) => grp.id === id); if (g) {
      const nextGroups = board.groups.map((grp) => grp.id === id ? { ...grp, title: val.trim() || 'กลุ่มพื้นที่' } : grp);
      const next = touchBoard({ ...boardStateRef.current, groups: nextGroups });
      setBoard(next);
      saveCurrentBoard(next);
    }
  }, [board, saveCurrentBoard]);

  const toggleBoardPublic = useCallback((isPublic) => {
    if (!board) return;
    const next = touchBoard({ ...boardStateRef.current, visibility: isPublic ? 'public' : 'private' });
    setBoard(next);
    saveCurrentBoard(next);
    setShareModalOpen(false);
  }, [board, saveCurrentBoard]);

  // ── Project integration for Project Workspace ───────────────────────────────

  const selectedCount = selectedIds.size;

  const boardSelectionBarRef = useRef(null);
  const applyPositionBarRef = useRef(null);

  // Recompute the selection bar position from the selected objects' actual rendered
  // bounding box, accounting for canvas pan and zoom. Centers the bar horizontally
  // over the combined selection and places it above the objects with a gap, clamping
  // so it never clips out of the viewport. Falls back below the selection when there
  // is not enough room above. Works for any number of selected objects (incl. groups)
  // and any zoom level / viewport size -- no hardcoded coordinates.
  const applyPositionBar = useCallback(() => {
    const bar = boardSelectionBarRef.current;
    if (!board || selectedCount === 0 || currentTool !== 'select' || !bar) {
      setSelectionBarRect({ left: 0, top: 0, visible: false });
      return;
    }
    const vp = boardRef.current;
    if (!vp) { setSelectionBarRect({ left: 0, top: 0, visible: false }); return; }
    const r = vp.getBoundingClientRect();
    const selected = board.items.filter((i) => selectedIds.has(i.id));
    const selectedGroups = board.groups.filter((g) => selectedIds.has(g.id));
    const all = [...selected, ...selectedGroups];
    if (!all.length) { setSelectionBarRect({ left: 0, top: 0, visible: false }); return; }
    const minX = Math.min(...all.map((o) => o.x));
    const minY = Math.min(...all.map((o) => o.y));
    const maxX = Math.max(...all.map((o) => o.x + o.width));
    const maxY = Math.max(...all.map((o) => o.y + o.height));
    // Canvas/world -> screen space (board-viewport has no transform; pan/scale live on board-world).
    const centerX = r.left + panX + ((minX + maxX) / 2) * scale;
    const topY = r.top + panY + minY * scale;    // top edge of the combined selection bounding box
    const bottomY = r.top + panY + maxY * scale; // bottom edge of the combined selection bounding box
    const br = bar.getBoundingClientRect();
    const GAP = 10;      // spacing between toolbar and selected object(s)
    const PAD = 12;      // minimum distance from viewport edge
    let left = centerX - br.width / 2;
    let top = topY - br.height - GAP; // above the object(s)
    if (top < PAD) {
      top = bottomY + GAP; // not enough room above -> place below the selection instead
    }
    left = Math.max(PAD, Math.min(window.innerWidth - br.width - PAD, left));
    top = Math.max(PAD, Math.min(window.innerHeight - br.height - PAD, top));
    setSelectionBarRect({ left, top, visible: true });
  }, [board, selectedIds, selectedCount, panX, panY, scale, currentTool]);

  // Keep the ref fresh so the window-resize listener always uses the latest state.
  applyPositionBarRef.current = applyPositionBar;

  // Reposition whenever selection, objects, pan, zoom, or tool changes.
  useLayoutEffect(() => {
    applyPositionBar();
  }, [applyPositionBar]);

  // Re-clamp on viewport resize (selection center does not move on resize, but bounds do).
  useEffect(() => {
    const onResize = () => { if (applyPositionBarRef.current) applyPositionBarRef.current(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Rendering ───────────────────────────────────────────────────────────────
  const isSelectionBarVisible = selectedCount > 0 && currentTool === 'select';
  const isEmpty = !board || (board.items.length === 0 && board.groups.length === 0);

  return (
    <section className="board-canvas-shell" data-testid="board-canvas">
      <nav className="board-top-left" aria-label="กระดานข้อมูล">
        <div className="board-pill board-pill-brand">
          <button type="button" onClick={() => setNavDropdownOpen((o) => !o)} className="board-brand-btn" aria-label="สลับมุมมองบอร์ด" title="สลับมุมมองบอร์ด">
            <svg viewBox="0 0 24 24" className="board-brand-icon" stroke="#FB7185" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M4 18V6L9.5 13L15 6V18" />
              <path d="M15 6L20 12V18" stroke="#38BDF8" />
            </svg>
          </button>
          <div className="board-title-wrap relative flex items-center">
            <input type="text" value={boardTitleEdit} onChange={(e) => setBoardTitleEdit(e.target.value)} onBlur={(e) => renameBoard(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameBoard(e.target.value)} className="board-title-input" title="คลิกเพื่อเปลี่ยนชื่อบอร์ด" />
            <button type="button" onClick={() => setNavDropdownOpen((o) => !o)} className="board-menu-btn" title="เมนูบอร์ดและมุมมอง"><ChevronRight size={14} strokeWidth={2.2} /></button>
            {navDropdownOpen && (
              <div className="board-dropdown">
                <div className="board-dropdown-section">MECHA Navigation</div>
                <button type="button" className="board-dropdown-item board-dropdown-item-active" onClick={() => setNavDropdownOpen(false)}><span>Whiteboard Canvas</span><span className="board-badge board-badge-active">ใช้งานอยู่</span></button>
                <button type="button" className="board-dropdown-item" onClick={() => { setNavDropdownOpen(false); navigate('/boards'); }}><span>Boards Overview</span><span className="board-badge">บอร์ดของฉัน / ร่วมกัน / สาธารณะ</span></button>
                <button type="button" className="board-dropdown-item" onClick={() => setNavDropdownOpen(false)}><span>Project Workspace</span><span className="board-badge">ลิงก์โปรเจกต์</span></button>
                <div className="board-dropdown-divider" />
                <button type="button" className="board-dropdown-item board-dropdown-item-create" onClick={() => { setNavDropdownOpen(false); setCreateBoardModalOpen(true); }}>+ สร้างบอร์ดใหม่</button>
                <button type="button" className="board-dropdown-item" onClick={() => { setNavDropdownOpen(false); exportBoardJSON(); }}>ส่งออกบอร์ด (.JSON)</button>
              </div>
            )}
          </div>
          <div className="board-sep" />
          <button type="button" onClick={undo} disabled={undoStack.length === 0} className="board-icon-btn" title="เลิกทำล่าสุด (Ctrl+Z)" aria-label="เลิกทำล่าสุด (Ctrl+Z)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
          <button type="button" onClick={redo} disabled={redoStack.length === 0} className="board-icon-btn" title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ (Ctrl+Y)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
          <div className="board-sep" />
          <button type="button" onClick={autoArrangeSelectedGrid} className="board-icon-btn board-icon-btn-amber" title="เรียงกริดอัตโนมัติ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></button>
          <div className="board-sep" />
          <button type="button" onClick={() => setProjectLinkModalOpen(true)} className="board-project-pill" title="เชื่อมโยงโปรเจกต์ MECHA">{board?.projectId ? board.projectId : 'Link Project'}</button>
        </div>
      </nav>

      <nav className="board-top-right" aria-label="เครื่องมือมุมขวาบน">
        <div className="board-pill board-pill-right">
          <button type="button" onClick={() => setRightDrawerMode('outline')} className="board-icon-btn" title="ภาพรวมรายการบนบอร์ด" aria-label="ภาพรวมรายการบนบอร์ด"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
          <button type="button" onClick={() => { setRightDrawerMode('comments'); }} className="board-icon-btn board-comment-btn relative" title="ความคิดเห็นบนบอร์ด" aria-label="ความคิดเห็นบนบอร์ด"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span className={`board-comment-badge ${board?.comments.length ? '' : 'hidden'}`}>{board?.comments.length}</span></button>
          <button type="button" onClick={() => navigate('/boards')} className="board-icon-btn" title="Boards Overview"><LayoutGrid size={16} /></button>
          <div className="board-sep" />
          <button type="button" onClick={() => setShareModalOpen(true)} className="board-share-btn" title="แชร์บอร์ด">Share</button>
          <button type="button" onClick={() => setShareModalOpen(true)} className="board-user-badge" title="ผู้ร่วมงานและสิทธิ์">ME</button>
        </div>
      </nav>

      <aside className="board-left-dock" aria-label="แถบเครื่องมือด้านซ้าย">
        <div className="board-dock-group">
          <button type="button" onClick={() => setCurrentTool('select')} className={`board-dock-btn ${currentTool === 'select' ? 'board-dock-btn-active' : ''}`} title="เลือกและย้าย (V)" aria-label="เลือกและย้าย (V)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3l16 8.5-7.2 1.8L10.5 21z"/></svg></button>
          <button type="button" onClick={() => setCurrentTool('pan')} className={`board-dock-btn ${currentTool === 'pan' ? 'board-dock-btn-active' : ''}`} title="มือ / ลากแคนวาส (H หรือกดค้าง Space)" aria-label="มือ / ลากแคนวาส (H หรือกดค้าง Space)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg></button>
        </div>
        <div className="board-dock-group">
          <button type="button" onClick={() => setOpenFlyout('sticky')} className={`board-dock-btn ${openFlyout === 'sticky' ? 'board-dock-btn-active' : ''}`} title="โพสต์อิท (S)" aria-label="โพสต์อิท (S)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg></button>
          <button type="button" onClick={createGroupFrame} className={`board-dock-btn ${openFlyout === 'group' ? 'board-dock-btn-active' : ''}`} title="สร้างกรอบกลุ่ม (G)" aria-label="สร้างกรอบกลุ่ม (G)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2"/><path d="M3 9h18"/></svg></button>
          <button type="button" onClick={() => setCurrentTool('comment')} className={`board-dock-btn ${currentTool === 'comment' ? 'board-dock-btn-active' : ''}`} title="ปักหมุดความคิดเห็น (C)" aria-label="ปักหมุดความคิดเห็น (C)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>
          <button type="button" onClick={() => setOpenFlyout('text')} className={`board-dock-btn ${openFlyout === 'text' ? 'board-dock-btn-active' : ''}`} title="ข้อความอิสระ (T)" aria-label="ข้อความอิสระ (T)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg></button>
          <button type="button" onClick={() => setOpenFlyout('shapes')} className={`board-dock-btn ${openFlyout === 'shapes' ? 'board-dock-btn-active' : ''}`} title="รูปทรงและลูกศรเชื่อม"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="4"/><rect x="13" y="13" width="7" height="7" rx="1"/><path d="M11 11l3 3"/></svg></button>
          <button type="button" onClick={() => setOpenFlyout('stickers')} className={`board-dock-btn ${openFlyout === 'stickers' ? 'board-dock-btn-active' : ''}`} title="สติกเกอร์และแถบสถานะ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>
          <button type="button" onClick={triggerImageUpload} className={`board-dock-btn ${openFlyout === 'image' ? 'board-dock-btn-active' : ''}`} title="อัปโหลดรูปภาพจากคอมพิวเตอร์"><input type="file" id="boardImageFileInput" accept="image/*" className="hidden" onChange={handleImageFileSelected} /><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></button>
          <button type="button" onClick={() => { setOpenFlyout('draw'); setCurrentTool('draw'); }} className={`board-dock-btn ${openFlyout === 'draw' ? 'board-dock-btn-active' : ''}`} title="วาดมืออิสระ (P)" aria-label="วาดมืออิสระ (P)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
          <button type="button" onClick={() => setOpenFlyout('frameworks')} className={`board-dock-btn ${openFlyout === 'frameworks' ? 'board-dock-btn-active' : ''}`} title="กรอบโครงสร้างว่างเปล่า"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg></button>
          <button type="button" onClick={deleteSelected} className={`board-dock-btn board-dock-btn-delete`} title="ลบวัตถุที่เลือก (Del)" aria-label="ลบวัตถุที่เลือก (Del)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
          {openFlyout && (
            <div className="board-tool-flyout">
              <div className={`board-flyout-panel board-flyout-${openFlyout}`} data-flyout={openFlyout}>
                {openFlyout === 'sticky' && (
                  <>
                    <div className="board-flyout-header"><span className="board-flyout-title">โพสต์อิท</span><span className="board-flyout-caption">คลิกสีเพื่อเพิ่ม</span></div>
                    <div className="board-sticky-color-grid">
                      {STICKY_COLOR_ORDER.map((c) => (
                        <button type="button" key={c} onClick={() => addStickyNote(c, false)} className="board-sticky-color-btn" style={{ backgroundColor: STICKY_COLORS[c].bg }} title={STICKY_COLORS[c].label} aria-label={STICKY_COLORS[c].label} />
                      ))}
                      <button type="button" onClick={() => addStickyNote(activeNoteColor, true)} className="board-sticky-wide-btn">โพสต์อิทขนาดกว้าง (320×170)</button>
                    </div>
                  </>
                )}
                {openFlyout === 'text' && (
                  <>
                    <span className="board-flyout-title">เพิ่มข้อความ</span>
                    <button type="button" onClick={() => addTextItem('heading')} className="board-flyout-item"><div className="board-flyout-item-head text-base font-extrabold text-zinc-900">หัวข้อข้อความ</div><div className="board-flyout-item-sub">หัวข้อหรือชื่อหัวข้อใหญ่ในส่วนต่าง ๆ</div></button>
                    <button type="button" onClick={() => addTextItem('body')} className="board-flyout-item"><div className="board-flyout-item-head text-xs font-medium text-zinc-800">ข้อความย่อหน้า</div><div className="board-flyout-item-sub">คำอธิบายอิสระบนแคนวาส</div></button>
                  </>
                )}
                {openFlyout === 'shapes' && (
                  <>
                    <span className="board-flyout-title">รูปทรงและตัวเชื่อมลูกศร</span>
                    <div className="board-shape-grid">
                      <button type="button" onClick={() => addShapeItem('rect')} className="board-shape-btn"><div className="board-shape-preview board-shape-rect" /><span>สี่เหลี่ยมผืนผ้า</span></button>
                      <button type="button" onClick={() => addShapeItem('rounded')} className="board-shape-btn"><div className="board-shape-preview board-shape-rounded" /><span>การ์ด</span></button>
                      <button type="button" onClick={() => addShapeItem('circle')} className="board-shape-btn"><div className="board-shape-preview board-shape-circle" /><span>วงกลม</span></button>
                      <button type="button" onClick={() => addShapeItem('diamond')} className="board-shape-btn"><div className="board-shape-preview board-shape-diamond" /><span>รูปสี่เหลี่ยมขนมเปียกปูน</span></button>
                    </div>
                    <button type="button" onClick={startConnectorMode} className="board-shape-connector" title="วาดตัวเชื่อมลูกศร"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mr-1.5"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg> วาดตัวเชื่อมลูกศร</button>
                  </>
                )}
                {openFlyout === 'stickers' && (
                  <>
                    <span className="board-flyout-title">สติกเกอร์ SVG และแถบสถานะ</span>
                    <div className="board-sticker-grid">
                      {['check', 'star', 'bulb', 'alert', 'flag', 'thumb', 'pin', 'bolt'].map((name) => (
                        <button type="button" key={name} onClick={() => addStickerItem(name)} className="board-sticker-btn" title={name} aria-label={name}><svg className="board-sticker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">{renderStickerSVG(name)}</svg></button>
                      ))}
                    </div>
                  </>
                )}
                {openFlyout === 'draw' && (
                  <>
                    <div className="board-flyout-header"><span className="board-flyout-title">ปากกาวาดอิสระ</span><button type="button" onClick={() => { setOpenFlyout(null); setCurrentTool('select'); }} className="board-flyout-done">เสร็จสิ้น</button></div>
                    <div className="board-pen-colors">{['#18181B', '#2563EB', '#E11D48', '#059669'].map((c) => (<button type="button" key={c} onClick={() => setPenColor(c)} className={`board-pen-color ${c === penColor ? 'board-pen-color-active' : ''}`} style={{ backgroundColor: c }} title={c} />))}</div>
                    <div className="board-pen-widths"><button type="button" onClick={() => setPenWidth(2.5)} className={`board-pen-width ${penWidth === 2.5 ? 'board-pen-width-active' : ''}`}>ละเอียด</button><button type="button" onClick={() => setPenWidth(5)} className={`board-pen-width ${penWidth === 5 ? 'board-pen-width-active' : ''}`}>ปากกาเมจิก</button></div>
                  </>
                )}
                {openFlyout === 'frameworks' && (
                  <>
                    <span className="board-flyout-title">กริดโครงสร้างว่างเปล่า</span>
                    <button type="button" onClick={() => insertEmptyFramework('2x2')} className="board-flyout-item"><div className="board-flyout-item-head text-xs font-bold text-zinc-900">2×2 แมทริกซ์ quadrant</div><div className="board-flyout-item-sub">พื้นที่กลุ่มว่าง 4 แห่งพร้อมหัวเรื่อง</div></button>
                    <button type="button" onClick={() => insertEmptyFramework('strip')} className="board-flyout-item"><div className="board-flyout-item-head text-xs font-bold text-zinc-900">แนวราบ 3 เฟส</div><div className="board-flyout-item-sub">กรอบกลุ่มว่าง 3 อันวางเรียงด้านข้างกัน</div></button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {isSelectionBarVisible && (
        <div
          ref={boardSelectionBarRef}
          className="board-selection-bar"
          aria-label="แถบเครื่องมือเมื่อเลือกวัตถุ"
          style={{ left: selectionBarRect.left, top: selectionBarRect.top, transform: 'none', visibility: selectionBarRect.visible ? 'visible' : 'hidden' }}
        >
          <span className="board-selection-count">{selectedCount} รายการที่เลือก</span>
          <div className="board-sep-v" />
          <div className="board-selection-colors">{STICKY_COLOR_ORDER.map((c) => (<button type="button" key={c} onClick={() => recolorSelected(c)} className="board-selection-color" style={{ backgroundColor: STICKY_COLORS[c].bg }} title={STICKY_COLORS[c].label} aria-label={STICKY_COLORS[c].label} />))}</div>
          <div className="board-sep-v" />
          <button type="button" onClick={duplicateSelected} className="board-selection-action" title="สำเนา (Ctrl+D)">สำเนา</button>
          <button type="button" onClick={bringSelectedToFront} className="board-selection-action" title="นำมาด้านหน้า">ด้านหน้า</button>
          <button type="button" onClick={createGroupFrame} className="board-selection-action board-selection-action-group" title="ห่อในกรอบกลุ่ม">กลุ่ม</button>
          <button type="button" onClick={deleteSelected} className="board-selection-action board-selection-action-delete" title="ลบ"><Trash2 size={14} strokeWidth={2.2} /></button>
        </div>
      )}

      {currentTool === 'connect' && (
        <div className="board-connector-banner"><span>{connectorFromId ? 'คลิกวัตถุเป้าหมายเพื่อเชื่อมลูกศร' : 'คลิกวัตถุต้นทางบนแคนวาส'}</span><button type="button" onClick={cancelConnectorMode} className="board-connector-cancel">ยกเลิก</button></div>
      )}

      <div className="board-viewport" ref={boardRef} style={{ touchAction: 'none', userSelect: 'none' }}>
        <div className="board-world" style={{ transform: `translate(${panX}px, ${panY}px) scale(${scale})` }}>
          <svg id="connectorsLayer" className="board-svg-layer" width="1" height="1">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3F3F46" /></marker>
            </defs>
            {board && board.connectors.map((conn) => {
              const from = board.items.find((i) => i.id === conn.fromId) || board.groups.find((g) => g.id === conn.fromId);
              const to = board.items.find((i) => i.id === conn.toId) || board.groups.find((g) => g.id === conn.toId);
              if (!from || !to) return null;
              const x1 = from.x + from.width / 2, y1 = from.y + from.height / 2;
              const x2 = to.x + to.width / 2, y2 = to.y + to.height / 2;
              return <line key={conn.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3F3F46" strokeWidth="2" markerEnd="url(#arrowhead)" />;
            })}
          </svg>
          <div className="board-groups-layer">
            {board && board.groups.map((g) => (
              <div key={g.id} data-obj-id={g.id} onPointerDown={(e) => onGroupPointerDown(e, g.id)} className={`board-canvas-item board-group ${selectedIds.has(g.id) ? 'selected' : ''}`} style={{ transform: `translate(${g.x}px, ${g.y}px)`, width: g.width, height: g.height }}>
                <div className="board-group-header px-2 py-1.5 flex items-center justify-between cursor-move">
                  <input type="text" value={g.title} onPointerDown={(e) => e.stopPropagation()} onChange={(e) => renameGroup(g.id, e.target.value)} className="board-group-title-input" />
                </div>
                <div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'group', g.id)} />
              </div>
            ))}
          </div>
          <div className="board-items-layer">
            {board && board.items.map((item) => {
              const selClass = selectedIds.has(item.id) ? 'selected' : '';
              const baseStyle = { transform: `translate(${item.x}px, ${item.y}px)`, width: item.width, height: item.height, zIndex: item.zIndex || 10 };
              if (item.type === 'sticky') {
                return (
                  <div
                    key={item.id}
                    data-obj-id={item.id}
                    onPointerDown={(e) => onItemPointerDown(e, item.id)}
                    onMouseDown={(e) => {
                      // mousedown bubbles up from the sticky textarea (whose
                      // pointerDown is stopped so a text click does not select
                      // the item), so this is what initiates a drag started
                      // from inside the sticky text. The resize handle stops
                      // propagation itself; guard it here too so a mousedown on
                      // the handle never starts a drag that would clobber a
                      // resize that pointerDown already set up.
                      if (e.target.closest && e.target.closest('.board-resize-handle')) return;
                      onItemPointerDown(e, item.id);
                    }}
                    style={{ ...baseStyle }}
                    className={`board-canvas-item board-sticky note-${item.color} ${selClass}`}
                  >
                    <div className="board-sticky-header px-2 pt-1 pb-1 flex items-center justify-between cursor-grab relative z-10"><span className="board-sticky-line" /><button type="button" onClick={(e) => { e.stopPropagation(); deleteSingleItem(item.id); }} className="board-sticky-delete" title="ลบรายการนี้">✕</button></div>
                    <textarea data-editor={item.id} onPointerDown={(e) => e.stopPropagation()} onFocus={() => selectOnly(item.id)} onChange={(e) => updateItemText(item.id, e.target.value)} placeholder="เขียนบันทึก..." className="board-sticky-textarea" value={item.text || ''} />
                    <div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'item', item.id)} />
                  </div>
                );
              }
              if (item.type === 'text') {
                const textCls = item.variant === 'heading' ? 'text-xl font-extrabold text-zinc-900' : 'text-sm font-medium text-zinc-800';
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} style={{ ...baseStyle }} className={`board-canvas-item board-text rounded-xl hover:bg-white/60 p-2 ${selClass} ${textCls}`}>
                    <textarea data-editor={item.id} onPointerDown={(e) => e.stopPropagation()} onFocus={() => selectOnly(item.id)} onChange={(e) => updateItemText(item.id, e.target.value)} placeholder={item.variant === 'heading' ? 'หัวข้อ...' : 'พิมพ์ข้อความ...'} className="board-text-textarea" value={item.text || ''} />
                    <div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'item', item.id)} />
                  </div>
                );
              }
              if (item.type === 'shape') {
                let shapeClasses = 'bg-white border-2 border-zinc-800 shadow-xs flex items-center justify-center p-3 ';
                if (item.shapeType === 'rounded') shapeClasses += 'rounded-2xl'; else if (item.shapeType === 'circle') shapeClasses += 'rounded-full'; else shapeClasses += 'rounded-sm';
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} style={{ ...baseStyle }} className={`board-canvas-item ${shapeClasses} ${selClass} cursor-move`}>
                    <input type="text" value={item.text || ''} onPointerDown={(e) => e.stopPropagation()} onChange={(e) => updateItemText(item.id, e.target.value)} placeholder="ป้ายกำกับ" className="board-shape-input" />
                    <div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'item', item.id)} />
                  </div>
                );
              }
              if (item.type === 'sticker') {
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} style={{ ...baseStyle }} className={`board-canvas-item board-sticker p-1 cursor-move ${selClass}`}>{renderStickerSVG(item.stickerName)}<div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'item', item.id)} /></div>
                );
              }
              if (item.type === 'image') {
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} style={{ ...baseStyle }} className={`board-canvas-item board-image rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-md cursor-move ${selClass}`}>
                    <img src={item.src} alt="อัปโหลด" className="board-image-img" />
                    <div className="board-resize-handle" onPointerDown={(e) => onResizePointerDown(e, 'item', item.id)} />
                  </div>
                );
              }
              if (item.type === 'drawing') {
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} style={{ ...baseStyle }} className={`board-canvas-item board-drawing cursor-move ${selClass}`}>
                    <svg width={item.width} height={item.height} viewBox={`0 0 ${item.width} ${item.height}`} className="board-drawing-svg"><path d={item.path} fill="none" stroke={item.strokeColor} strokeWidth={item.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                );
              }
              if (item.type === 'commentPin') {
                return (
                  <div key={item.id} data-obj-id={item.id} onPointerDown={(e) => onItemPointerDown(e, item.id)} onClick={() => setRightDrawerMode('comments')} style={{ ...baseStyle }} className={`board-canvas-item board-comment-pin w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center cursor-pointer ring-2 ring-white ${selClass}`} title={item.text || 'ตัวชี้ความคิดเห็น'}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                );
              }
              return null;
            })}
          </div>
          <svg id="liveDrawLayer" className="board-svg-layer" width="1" height="1"></svg>
        </div>

        <div className={`board-empty-hint ${isEmpty ? '' : 'hidden'}`} style={{ pointerEvents: 'none' }}>
          <div className="board-empty-card"><p className="board-empty-title">แคนวาสกระดานข้อมูลที่สะอาด</p><p className="board-empty-sub">เลือกเครื่องมือจากแถบด้านซ้าย ดับเบิลคลิกที่ตารางเพื่อวางโพสต์อิท หรือกด <kbd>S</kbd></p></div>
        </div>
        <div id="marqueeBox" className="board-marquee hidden"></div>
      </div>

      <div className="board-bottom-right">
        <div className={`board-minimap-panel ${minimapVisible ? '' : 'hidden'}`}>
          <div className="board-minimap-header"><span className="board-minimap-label">Minimap</span><span className="board-minimap-count">{board ? board.items.length + board.groups.length : 0} รายการ</span></div>
          <div className="board-minimap-body">
            <div className="board-minimap-objects">
              {board && [...board.groups, ...board.items].map((obj) => {
                const bg = obj.color ? STICKY_COLORS[obj.color]?.bg : '#94A3B8';
                return <div key={obj.id} className="board-minimap-object" style={{ left: 90 + obj.x * 0.04, top: 42 + obj.y * 0.04, width: Math.max(4, obj.width * 0.04), height: Math.max(4, obj.height * 0.04), backgroundColor: bg }} />;
              })}
            </div>
            <div className="board-minimap-viewport-rect" />
          </div>
        </div>
        <button type="button" onClick={fitToScreen} className="board-icon-btn board-fit-btn" title="พอดีจอทั้งหมด">Fit</button>
        <div className="board-zoom-pill">
          <button type="button" onClick={() => setMinimapVisible((v) => !v)} className="board-icon-btn" title="สลับมินิแมป">M</button>
          <div className="board-sep-v" />
          <button type="button" onClick={() => zoomBy(-0.15)} className="board-icon-btn" title="ย่อ">−</button>
          <button type="button" onClick={resetZoom} className="board-zoom-label" title="รีเซ็ตซูม 100%">{Math.round(scale * 100)}%</button>
          <button type="button" onClick={() => zoomBy(0.15)} className="board-icon-btn" title="ขยาย">＋</button>
        </div>
      </div>

      <aside className={`board-right-drawer ${rightDrawerMode ? '' : 'hidden'}`}>
        <div className="board-drawer-header"><h3 className="board-drawer-title">{rightDrawerMode === 'outline' ? 'โครงร่างบอร์ด' : 'ความคิดเห็นบอร์ด'}</h3><button type="button" onClick={() => setRightDrawerMode(null)} className="board-drawer-close"><X size={16} strokeWidth={2} /></button></div>
        <div className="board-drawer-body">
          {rightDrawerMode === 'outline' ? (
            <div className="board-outline-body">{isEmpty ? <p className="board-outline-empty">แคนวาสว่างเปล่า เพิ่มบันทึกหรือกรอบเพื่อแสดงในโครงร่าง</p> : renderOutline()}</div>
          ) : (
            <>
              <div className="board-comments-list">{board && board.comments.length === 0 ? <p className="board-outline-empty">ยังไม่มีความคิดเห็น เริ่มการสนทนาได้เลย</p> : renderComments()}</div>
              <form onSubmit={submitBoardComment} className="board-comment-form"><input type="text" id="boardCommentInput" required placeholder="เพิ่มความคิดเห็น..." className="board-comment-input" /><button type="submit" className="board-comment-post">โพสต์</button></form>
            </>
          )}
        </div>
      </aside>

      {createBoardModalOpen && (
        <div className="board-modal-overlay" onClick={() => setCreateBoardModalOpen(false)}>
          <div className="board-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="board-modal-title">สร้างกระดานข้อมูลใหม่</h3>
            <form onSubmit={handleCreateBoard} className="board-modal-form space-y-3">
              <div><label className="board-modal-label">ชื่อบอร์ด</label><input type="text" required defaultValue="" onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="Untitled mural" className="board-modal-input" /></div>
              <div><label className="board-modal-label">การมองเห็น</label><select value={newBoardVisibility} onChange={(e) => setNewBoardVisibility(e.target.value)} className="board-modal-input"><option value="private">ส่วนตัว (บอร์ดของฉัน)</option><option value="public">บอร์ดสาธารณะ</option></select></div>
              <div><label className="board-modal-label">เชื่อมโยงโปรเจกต์ MECHA (ไม่บังคับ)</label><input type="text" value={newBoardProjectId} onChange={(e) => setNewBoardProjectId(e.target.value)} placeholder="เช่น รหัสโปรเจกต์" className="board-modal-input" /></div>
              <div className="board-modal-actions"><button type="button" onClick={() => setCreateBoardModalOpen(false)} className="board-modal-cancel">ยกเลิก</button><button type="submit" className="board-modal-save">สร้างและเปิด</button></div>
            </form>
          </div>
        </div>
      )}
      {shareModalOpen && (
        <div className="board-modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="board-modal" onClick={(e) => e.stopPropagation()}>
            <div className="board-modal-header"><h3 className="board-modal-title">แชร์บอร์ด</h3><button type="button" onClick={() => setShareModalOpen(false)} className="board-modal-close">✕</button></div>
            <form onSubmit={handleInviteCollaborator} className="board-share-form"><input type="text" required placeholder="รหัสพนักงานหรืออีเมล..." className="board-share-input" /><select className="board-share-input"><option value="edit">แก้ไขได้</option><option value="view">ดูได้อย่างเดียว</option></select><button type="submit" className="board-share-invite">เชิญ</button></form>
            <div className="board-share-members">{renderShareMembers()}</div>
            <div className="board-share-public"><label className="board-share-public-label">แสดงในบอร์ดสาธารณะ <input type="checkbox" defaultChecked={board?.visibility === 'public'} onChange={(e) => toggleBoardPublic(e.target.checked)} /> </label></div>
            <div className="board-modal-actions"><button type="button" onClick={() => setShareModalOpen(false)} className="board-modal-cancel">เสร็จสิ้น</button></div>
          </div>
        </div>
      )}
      {projectLinkModalOpen && (
        <div className="board-modal-overlay" onClick={() => setProjectLinkModalOpen(false)}>
          <div className="board-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="board-modal-title">เชื่อมโยงกับโปรเจกต์ MECHA</h3>
            <input type="text" value={projectLinkInput} onChange={(e) => setProjectLinkInput(e.target.value)} placeholder="รหัสโปรเจกต์ (เช่น Rigid-FPCA-Layer1)" className="board-modal-input" />
            <div className="board-modal-actions"><button type="button" onClick={() => setProjectLinkModalOpen(false)} className="board-modal-cancel">ยกเลิก</button><button type="button" onClick={() => linkProject(projectLinkInput)} className="board-modal-save board-modal-save-link">บันทึกลิงก์</button></div>
          </div>
        </div>
      )}
    </section>
  );

  // ── Inline render helpers ───────────────────────────────────────────────────
  function handleImageFileSelected(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      recordHistory();
      if (!boardRef.current || !board) return;
      const r = boardRef.current.getBoundingClientRect();
      const center = screenToWorld(panX, panY, scale, r, r.left + r.width / 2, r.top + r.height / 2);
      const item = newItem('image', { x: Math.round(center.x - 150), y: Math.round(center.y - 110), width: 300, height: 220, src: ev.target.result, zIndex: ++zCounterRef.current });
      setBoard((prev) => touchBoard({ ...prev, items: [...prev.items, item] }));
      setSelectedIds(new Set([item.id])); setCurrentTool('select');
      saveCurrentBoard(boardStateRef.current || board);
    };
    reader.readAsDataURL(file); e.target.value = '';
  }
  function triggerImageUpload() { setOpenFlyout(null); const input = document.getElementById('boardImageFileInput'); if (input) input.click(); }

  function renderShareMembers() {
    if (!board) return null;
    return (
      <>
        <div className="board-share-member-row"><span className="board-share-member-me">ME (คุณ)</span><span className="board-share-member-role">เจ้าของ</span></div>
        {board.collaborators.map((c, idx) => (
          <div key={idx} className="board-share-member-row"><span className="board-share-member-user">{c.user}</span><div className="board-share-member-role-actions"><span className="board-share-member-role">{c.role === 'edit' ? 'แก้ไขได้' : 'ดูได้อย่างเดียว'}</span><button type="button" onClick={() => removeMember(idx)} className="board-share-remove">✕</button></div></div>
        ))}
      </>
    );
  }
  function removeMember(idx) { if (!board) return; const collaborators = [...board.collaborators]; collaborators.splice(idx, 1); const next = touchBoard({ ...boardStateRef.current, collaborators }); setBoard(next); saveCurrentBoard(next); }
  function handleInviteCollaborator(e) { e.preventDefault(); const userField = e.currentTarget.querySelector('input[type="text"]'); if (!userField) return; const u = userField.value.trim(); if (!u || !board) return; const next = touchBoard({ ...boardStateRef.current, collaborators: [...board.collaborators, { user: u, role: 'edit' }] }); setBoard(next); saveCurrentBoard(next); userField.value = ''; }
  function handleCreateBoard(e) {
    e.preventDefault();
    const board = createBlankBoard({ title: newBoardTitle.trim() || 'Untitled board', visibility: newBoardVisibility, projectId: newBoardProjectId, ownerId: actorId || '' });
    const next = [board, ...boards];
    setBoards(next); saveBoards(next); setBoard({ ...board }); setBoardTitleEdit(board.title); setPanX(0); setPanY(0); setScale(1); setSelectedIds(new Set()); setUndoStack([]); setRedoStack([]); setCreateBoardModalOpen(false); setCurrentTool('select');
  }
  function exportBoardJSON() { if (!board) return; const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(board, null, 2)); const a = document.createElement('a'); a.setAttribute('href', dataStr); a.setAttribute('download', `${board.title.replace(/\s+/g, '_')}.json`); document.body.appendChild(a); a.click(); a.remove(); }
  function renderOutline() { if (!board) return null; const entries = [...board.groups.map((g) => ({ id: g.id, label: g.title, tag: 'กลุ่ม', x: g.x, y: g.y })), ...board.items.map((i) => ({ id: i.id, label: i.text || i.type.toUpperCase(), tag: i.type, x: i.x, y: i.y }))]; return <div className="board-outline-list">{entries.map((ent) => (<button key={ent.id} type="button" className="board-outline-entry"><span className="board-outline-label">{ent.label}</span><span className="board-outline-tag">{ent.tag}</span></button>))}</div>; }
  function renderComments() { if (!board) return null; return board.comments.map((c, idx) => (<div key={idx} className="board-comment-entry"><div className="board-comment-meta"><span className="board-comment-author">{c.author}</span><span className="board-comment-time">{c.time}</span></div><p className="board-comment-text">{c.text}</p></div>)); }
  function submitBoardComment(e) { e.preventDefault(); const input = document.getElementById('boardCommentInput'); if (!input) return; const text = input.value.trim(); if (!text || !board) return; const comments = [...board.comments, { author: 'ME (คุณ)', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]; const next = touchBoard({ ...boardStateRef.current, comments }); setBoard(next); saveCurrentBoard(next); input.value = ''; }
  function renderStickerSVG(name) {
    const map = {
      check: (<><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.4" fill="none" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2.4" fill="none" /></>),
      star: (<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />),
      bulb: (<><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M9 18h6" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M10 22h4" fill="none" stroke="currentColor" strokeWidth="2.2" /></>),
      alert: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="none" stroke="currentColor" strokeWidth="2.2" /><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2.2" /><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2.2" /></>),
      flag: (<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="none" stroke="currentColor" strokeWidth="2.2" /><line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2.2" /></>),
      thumb: (<><path d="M7 10v12" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" fill="none" stroke="currentColor" strokeWidth="2.2" /></>),
      pin: (<><line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="2.2" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" fill="none" stroke="currentColor" strokeWidth="2.2" /></>),
      bolt: (<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />),
    };
    return <svg className="board-sticker-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">{map[name] || map.star}</svg>;
  }
}
