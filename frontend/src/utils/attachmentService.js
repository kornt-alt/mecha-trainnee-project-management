// frontend/src/utils/attachmentService.js — Attachment storage adapter boundary.
//
// Separates attachment UI from file-storage implementation so the current local
// (browser-memory) implementation can later be replaced by an API-backed one
// without redesigning the UI. The UI layer only deals with AttachmentMetadata;
// this service owns LocalFileContent (actual File/Blob objects) and Object URLs.
//
// IMPORTANT: Content lives in browser memory only (a per-session Map). It is NOT
// persistent across page refreshes, and NOT stored as Base64 in MockDataContext
// or localStorage. Legacy metadata-only attachments (no File) are marked
// 'unavailable' and never get fake download actions.
//
// Interface concerns for future Backend integration:
//   - AttachmentMetadata   : { id, name, type, size, category, addedAt, ... }   (pure data)
//   - LocalFileContent     : { file: File }                                     (browser-only)
//   - StorageReference     : attachment id string (maps to content here, to a URL later)
//   - Operations           : setContent, getContent, getObjectUrl, download, remove, cleanup
//   - Status               : 'available' | 'unavailable' | 'uploading' | 'error'

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = [
  // images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

// Per-session in-memory content store, keyed by attachment id.
// Value: { file: File, objectUrl?: string, status, error? }
const contentStore = new Map();

// Object URLs created for preview/download, tracked for revocation.
const objectUrls = new Set();

// Human-readable file size (Thai labels used elsewhere in the app).
const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Validate a File before it is accepted. Returns { valid: true } or { valid: false, error }.
export const validateFile = (file) => {
  if (!file) return { valid: false, error: 'ไม่พบไฟล์ที่เลือก' };
  if (!(file instanceof File)) return { valid: false, error: 'ไฟล์ที่เลือกไม่ถูกต้อง' };
  if (!file.name || !file.name.trim()) return { valid: false, error: 'ชื่อไฟล์ว่างเปล่า' };
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { valid: false, error: 'ไฟล์ว่างเปล่าหรือขนาดไม่ถูกต้อง' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `ไฟล์ใหญ่เกินไป (สูงสุด ${formatFileSize(MAX_FILE_SIZE)})` };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `ชนิดไฟล์ "${file.type}" ไม่รองรับ` };
  }
  return { valid: true };
};

// Associate actual File content with an attachment id (called when user selects files).
// Metadata (name/type/size/category/…) stays in the component/state layer.
export const setAttachmentContent = (attachmentId, file) => {
  const validation = validateFile(file);
  if (!validation.valid) {
    contentStore.set(attachmentId, { file, status: 'error', error: validation.error });
    return validation;
  }
  // Drop any stale object URL for this id before storing new content.
  revokeObjectUrlFor(attachmentId);
  contentStore.set(attachmentId, { file, status: 'available' });
  return { valid: true };
};

// Mark an attachment as having no content (legacy metadata-only record).
export const markAttachmentUnavailable = (attachmentId) => {
  contentStore.set(attachmentId, { file: undefined, status: 'unavailable' });
};

// Get stored content for an attachment id. Returns null when nothing registered.
export const getAttachmentContent = (attachmentId) => {
  const entry = contentStore.get(attachmentId);
  if (!entry) return null;
  return { ...entry };
};

// Create (lazily) and cache an object URL for preview/download. Revoked on removal/unmount.
export const getAttachmentObjectUrl = (attachmentId) => {
  const entry = contentStore.get(attachmentId);
  if (!entry || entry.status !== 'available' || !entry.file) return null;
  if (entry.objectUrl && objectUrls.has(entry.objectUrl)) return entry.objectUrl;
  const url = URL.createObjectURL(entry.file);
  entry.objectUrl = url;
  objectUrls.add(url);
  return url;
};

// Revoke the cached object URL for an attachment id (if any).
export const revokeAttachmentObjectUrl = (attachmentId) => {
  revokeObjectUrlFor(attachmentId);
};

const revokeObjectUrlFor = (attachmentId) => {
  const entry = contentStore.get(attachmentId);
  if (entry && entry.objectUrl && objectUrls.has(entry.objectUrl)) {
    try { URL.revokeObjectURL(entry.objectUrl); } catch (e) { /* best effort */ }
    objectUrls.delete(entry.objectUrl);
    entry.objectUrl = undefined;
  }
};

// Trigger a browser download of the attachment's actual File content.
// Never downloads metadata-only or unavailable attachments.
export const downloadAttachment = (attachmentId) => {
  const entry = contentStore.get(attachmentId);
  if (!entry || entry.status !== 'available' || !entry.file) return false;
  const url = getAttachmentObjectUrl(attachmentId);
  if (!url) return false;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = entry.file.name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Keep the object URL cached for future previews; it will be revoked on remove/unmount.
  return true;
};

// Remove an attachment's content from the store and revoke its object URL.
export const removeAttachmentContent = (attachmentId) => {
  revokeObjectUrlFor(attachmentId);
  contentStore.delete(attachmentId);
};

// Check whether an attachment id has available local file content.
export const isAttachmentAvailable = (attachmentId) => {
  const entry = contentStore.get(attachmentId);
  return Boolean(entry && entry.status === 'available' && entry.file);
};

// Revoke every cached object URL and clear the store (call on component unmount).
export const cleanupAttachmentService = () => {
  objectUrls.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch (e) { /* best effort */ }
  });
  objectUrls.clear();
  contentStore.clear();
};

export { formatFileSize, MAX_FILE_SIZE, ALLOWED_TYPES };

// Adapter boundary object — UI components import this single name; future API-backed
// implementations can replace this object while keeping the same interface.
export const attachmentService = {
  validateFile,
  setAttachmentContent,
  markAttachmentUnavailable,
  getAttachmentContent,
  getAttachmentObjectUrl,
  downloadAttachment,
  removeAttachmentContent,
  isAttachmentAvailable,
  cleanupAttachmentService,
  formatFileSize,
};
