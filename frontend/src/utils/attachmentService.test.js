// frontend/src/utils/attachmentService.test.js — unit tests for the attachment adapter boundary.
//
// Covers: file validation, content registration, object URL lifecycle (create/revoke),
// download content integrity, unavailable legacy attachments, and cleanup on unmount.
// Uses small in-memory File/Blob objects; no persistent sample files or mock records.

// jsdom does not implement URL.createObjectURL/revokeObjectURL — mock them for tests.
Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: () => `blob:mock-${Math.random().toString(36).slice(2)}`,
    revokeObjectURL: () => { /* no-op */ },
  },
  configurable: true,
});

import {
  attachmentService,
  validateFile,
  setAttachmentContent,
  markAttachmentUnavailable,
  getAttachmentContent,
  getAttachmentObjectUrl,
  downloadAttachment,
  removeAttachmentContent,
  isAttachmentAvailable,
  cleanupAttachmentService,
} from './attachmentService';

const makeFile = (name, type, bytes) => new File([bytes], name, { type });

describe('attachmentService — file validation', () => {
  it('accepts a valid image file', () => {
    const file = makeFile('photo.png', 'image/png', new Uint8Array([137, 80, 78, 71]));
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it('accepts a valid PDF file', () => {
    const file = makeFile('doc.pdf', 'application/pdf', new Uint8Array([37, 80, 68, 70]));
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it('rejects a file that is too large', () => {
    const file = makeFile('big.bin', 'application/octet-stream', new Uint8Array(1024 * 1024 * 1025));
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ใหญ่เกินไป');
  });

  it('rejects an unsupported file type', () => {
    const file = makeFile('script.sh', 'application/x-sh', new Uint8Array([1, 2, 3]));
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ไม่รองรับ');
  });

  it('rejects an empty file', () => {
    const file = makeFile('empty.txt', 'text/plain', new Uint8Array(0));
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ว่างเปล่า');
  });
});

describe('attachmentService — content lifecycle', () => {
  afterEach(() => {
    cleanupAttachmentService();
  });

  it('stores available file content and reports availability', () => {
    const file = makeFile('report.pdf', 'application/pdf', new Uint8Array([37, 80, 68, 70]));
    setAttachmentContent('att-1', file);
    expect(isAttachmentAvailable('att-1')).toBe(true);
    expect(getAttachmentContent('att-1')?.status).toBe('available');
  });

  it('marks legacy metadata-only attachments as unavailable', () => {
    markAttachmentUnavailable('att-legacy');
    expect(isAttachmentAvailable('att-legacy')).toBe(false);
    expect(getAttachmentContent('att-legacy')?.status).toBe('unavailable');
  });

  it('returns null for unknown attachment id', () => {
    expect(getAttachmentContent('does-not-exist')).toBe(null);
  });

  it('creates and revokes object URLs safely', () => {
    const file = makeFile('image.png', 'image/png', new Uint8Array([137, 80, 78, 71]));
    setAttachmentContent('att-img', file);
    const url = getAttachmentObjectUrl('att-img');
    expect(url).toMatch(/^blob:/);
    // Same URL returned for repeated calls (cached).
    expect(getAttachmentObjectUrl('att-img')).toBe(url);
    // Revoke on removal.
    removeAttachmentContent('att-img');
    expect(isAttachmentAvailable('att-img')).toBe(false);
    expect(getAttachmentObjectUrl('att-img')).toBe(null);
  });

  it('downloadAttachment returns original file content', () => {
    const bytes = new Uint8Array([37, 80, 68, 70, 1, 2, 3]);
    const file = makeFile('doc.pdf', 'application/pdf', bytes);
    setAttachmentContent('att-download', file);

    // Spy on anchor click to verify download is triggered without navigating.
    const clicks = [];
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = (tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = () => clicks.push({ href: el.href, download: el.download });
      }
      return el;
    };

    try {
      const result = downloadAttachment('att-download');
      expect(result).toBe(true);
      expect(clicks.length).toBe(1);
      expect(clicks[0].download).toBe('doc.pdf');
      expect(clicks[0].href).toMatch(/^blob:/);
    } finally {
      document.createElement = originalCreateElement;
    }
  });

  it('downloadAttachment does not download unavailable attachments', () => {
    markAttachmentUnavailable('att-legacy');
    expect(downloadAttachment('att-legacy')).toBe(false);
    expect(downloadAttachment('unknown-id')).toBe(false);
  });

  it('cleanup revokes all object URLs and clears the store', () => {
    setAttachmentContent('a', makeFile('a.txt', 'text/plain', new Uint8Array([1])));
    setAttachmentContent('b', makeFile('b.txt', 'text/plain', new Uint8Array([2])));
    getAttachmentObjectUrl('a');
    getAttachmentObjectUrl('b');
    cleanupAttachmentService();
    expect(isAttachmentAvailable('a')).toBe(false);
    expect(isAttachmentAvailable('b')).toBe(false);
  });

  it('replacement revokes stale object URL before storing new content', () => {
    const file1 = makeFile('old.txt', 'text/plain', new Uint8Array([1]));
    const file2 = makeFile('new.txt', 'text/plain', new Uint8Array([2]));
    setAttachmentContent('att-replace', file1);
    const url1 = getAttachmentObjectUrl('att-replace');
    setAttachmentContent('att-replace', file2);
    const url2 = getAttachmentObjectUrl('att-replace');
    expect(url1).not.toBe(url2);
    // Old URL should be revoked (no longer in objectUrls tracking).
    expect(getAttachmentObjectUrl('att-replace')).toBe(url2);
  });
});

describe('attachmentService — storage separation', () => {
  afterEach(() => {
    cleanupAttachmentService();
  });

  it('metadata-only attachments never get a download action', () => {
    markAttachmentUnavailable('att-legacy');
    expect(isAttachmentAvailable('att-legacy')).toBe(false);
    expect(downloadAttachment('att-legacy')).toBe(false);
    expect(getAttachmentObjectUrl('att-legacy')).toBe(null);
  });
});
