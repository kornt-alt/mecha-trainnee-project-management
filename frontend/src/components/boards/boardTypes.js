// frontend/src/components/boards/boardTypes.js — Constants and helpers for board canvas objects.

export const STICKY_COLORS = {
  yellow: { id: 'yellow', label: 'Yellow', bg: '#FEF08A', border: 'rgba(234,179,8,0.35)', text: '#1E293B' },
  mint: { id: 'mint', label: 'Mint', bg: '#BBF7D0', border: 'rgba(34,197,94,0.35)', text: '#064E3B' },
  sky: { id: 'sky', label: 'Sky', bg: '#BAE6FD', border: 'rgba(14,165,233,0.35)', text: '#0C4A6E' },
  pink: { id: 'pink', label: 'Pink', bg: '#FBCFE8', border: 'rgba(236,72,153,0.32)', text: '#831843' },
  lavender: { id: 'lavender', label: 'Lilac', bg: '#E9D5FF', border: 'rgba(168,85,247,0.32)', text: '#3B0764' },
  peach: { id: 'peach', label: 'Peach', bg: '#FED7AA', border: 'rgba(249,115,22,0.35)', text: '#7C2D12' },
};

export const STICKY_COLOR_ORDER = ['yellow', 'mint', 'sky', 'pink', 'lavender', 'peach'];

export const TOOL_IDS = ['select', 'pan', 'sticky', 'group', 'comment', 'text', 'shapes', 'stickers', 'image', 'draw', 'frameworks', 'delete'];

export function defaultStickySize(wide = false) {
  return wide ? { width: 320, height: 170 } : { width: 200, height: 175 };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
