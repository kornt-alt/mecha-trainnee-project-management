// frontend/src/utils/boardStore.js — Frontend-only board persistence for the Boards module.
//
// Limitations (must be documented in UI/reporting where relevant):
// - Data lives in browser localStorage on this device/browser profile only.
// - No cross-user, cross-device, or real-time synchronization.
// - "Shared With Me" / "Public Boards" / collaborator roles are local UI metadata only;
//   they do NOT enforce real access control or sharing.
// - Clearing browser storage removes boards.

const STORAGE_KEY = 'mecha.boards.v1';

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadBoards() {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveBoards(boards) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(boards) ? boards : []));
  } catch {
    // Quota or privacy mode; caller keeps in-memory state.
  }
}

export function createBoardId() {
  return `board-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createObjectId(prefix = 'obj') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankBoard({ title = 'Untitled board', visibility = 'private', projectId = '', ownerId = '' } = {}) {
  const now = new Date().toISOString();
  return {
    id: createBoardId(),
    title: String(title || 'Untitled board').trim() || 'Untitled board',
    visibility: visibility === 'public' ? 'public' : 'private',
    projectId: projectId ? String(projectId) : '',
    ownerId: ownerId ? String(ownerId) : '',
    createdAt: now,
    updatedAt: now,
    collaborators: [], // local metadata only; not real access control
    comments: [],
    groups: [],
    items: [],
    connectors: [],
    viewport: { panX: 0, panY: 0, scale: 1 },
  };
}

export function touchBoard(board) {
  return { ...board, updatedAt: new Date().toISOString() };
}

export function boardMatchesProject(board, project) {
  if (!board || !project) return false;
  return String(board.projectId || '') === String(project.id);
}
