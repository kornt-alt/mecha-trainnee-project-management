// frontend/src/components/boards/BoardsOverview.js — หน้ารวมบอร์ด: My Boards / Shared With Me / Public Boards, ค้นหา, กรองโปรเจกต์, สร้าง/เปิดบอร์ด
import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import { useMockData } from '../../context/MockDataContext';
import { createBlankBoard, loadBoards, saveBoards } from '../../utils/boardStore';
import { Folder, Layers, Plus } from '../common/Icons';
import '../../styles/boards.css';

const SECTIONS = [
  { key: 'mine', title: 'บอร์ดของฉัน' },
  { key: 'shared', title: 'แชร์กับฉัน' },
  { key: 'public', title: 'บอร์ดสาธารณะ' },
];

function isSharedWithMe(board, actorId) {
  const me = String(actorId || '');
  return (board.collaborators || []).some((c) => String(c.userId || c.user || '') === me);
}

export default function BoardsOverview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects, actorId } = useMockData();
  const [boards, setBoards] = useState(() => loadBoards());
  const [query, setQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    const pid = searchParams.get('project');
    if (pid) {
      setProjectFilter(pid);
      setProjectId(pid);
    }
  }, [searchParams]);

  // projects จาก MockDataContext กรองตามสิทธิ์แล้ว (visibleProjects) — หน้าใหม่ไม่ต้องกรองซ้ำตาม utils/access.js
  const visibleProjects = projects;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return boards.filter((b) => {
      const projectOk = projectFilter === 'all' || String(b.projectId || '') === String(projectFilter);
      const queryOk = !q || String(b.title || '').toLowerCase().includes(q);
      return projectOk && queryOk;
    });
  }, [boards, query, projectFilter]);

  const sectionBoards = useMemo(() => {
    const me = String(actorId || '');
    return {
      mine: filtered.filter((b) => String(b.ownerId || '') === me && b.visibility !== 'public'),
      shared: filtered.filter((b) => String(b.ownerId || '') !== me && (isSharedWithMe(b, actorId) || b.visibility === 'public')),
      public: filtered.filter((b) => b.visibility === 'public'),
    };
  }, [filtered, actorId]);

  const persist = (next) => {
    setBoards(next);
    saveBoards(next);
  };

  const onCreate = (e) => {
    e.preventDefault();
    const board = createBlankBoard({
      title: title.trim() || 'Untitled board',
      visibility,
      projectId,
      ownerId: actorId || '',
    });
    const next = [board, ...boards];
    persist(next);
    setShowCreate(false);
    setTitle('');
    setVisibility('private');
    setProjectId('');
    navigate(`/boards/${board.id}`);
  };

  const openBoard = (id) => navigate(`/boards/${id}`);

  return (
    <div className="boards-page" data-testid="boards-page">
      <div className="boards-header">
        <div>
          <h1 className="boards-title">บอร์ด</h1>
          <p className="boards-subtitle">พื้นที่ไวท์บอร์ดสำหรับระดมไอเดีย วางแผน และเชื่อมโยงกับโปรเจกต์</p>
        </div>
        <Button variant="primary" className="boards-create-btn" onClick={() => setShowCreate(true)} data-testid="boards-create-open">
          <Plus size={16} className="me-1" /> สร้างบอร์ด
        </Button>
      </div>

      <div className="boards-toolbar">
        <Form.Control
          className="boards-search"
          placeholder="ค้นหาบอร์ด..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="boards-search"
        />
        <Form.Select
          className="boards-project-filter"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          data-testid="boards-project-filter"
        >
          <option value="all">ทุกโปรเจกต์</option>
          {visibleProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Form.Select>
      </div>

      <div className="boards-note">
        ข้อมูลบอร์ดถูกเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น (frontend-only) ไม่มีการซิงก์ข้ามผู้ใช้/อุปกรณ์ และการแชร์เป็นข้อมูลเมตาใน UI เท่านั้น
      </div>

      {SECTIONS.map((section) => {
        const items = sectionBoards[section.key] || [];
        return (
          <section key={section.key} className="boards-section" data-testid={`boards-section-${section.key}`}>
            <div className="boards-section-head">
              <h2 className="boards-section-title">{section.title}</h2>
              <span className="boards-section-count">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <div className="boards-empty" data-testid={`boards-empty-${section.key}`}>
                <Layers size={28} className="boards-empty-icon" />
                <p className="boards-empty-title">ยังไม่มีบอร์ด</p>
                <p className="boards-empty-text">
                  {section.key === 'mine' ? 'สร้างบอร์ดใหม่เพื่อเริ่มทำงานบนแคนวาส' : 'บอร์ดที่เกี่ยวข้องจะแสดงที่นี่'}
                </p>
              </div>
            ) : (
              <div className="boards-grid">
                {items.map((board) => {
                  const project = projects.find((p) => String(p.id) === String(board.projectId));
                  return (
                    <button
                      key={board.id}
                      type="button"
                      className="board-card"
                      onClick={() => openBoard(board.id)}
                      data-testid={`board-card-${board.id}`}
                    >
                      <div className="board-card-preview">
                        <Layers size={30} className="board-card-preview-icon" />
                      </div>
                      <div className="board-card-body">
                        <div className="board-card-title">{board.title || 'Untitled board'}</div>
                        <div className="board-card-meta">
                          <span className={`board-card-visibility board-card-visibility-${board.visibility}`}>
                            {board.visibility === 'public' ? 'สาธารณะ' : 'ส่วนตัว'}
                          </span>
                          {project ? (
                            <span className="board-card-project"><Folder size={12} /> {project.name}</span>
                          ) : (
                            <span className="board-card-project board-card-project-none">ไม่เชื่อมโปรเจกต์</span>
                          )}
                        </div>
                        <div className="board-card-updated">อัปเดต {new Date(board.updatedAt || board.createdAt).toLocaleString('th-TH')}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {showCreate && (
        <div className="boards-modal-overlay" onClick={() => setShowCreate(false)} data-testid="boards-create-modal">
          <div className="boards-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="boards-modal-title">สร้างบอร์ดใหม่</h3>
            <form onSubmit={onCreate} className="boards-modal-form">
              <label className="boards-modal-label">ชื่อบอร์ด</label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Sprint Planning"
                data-testid="boards-create-title"
                autoFocus
              />
              <label className="boards-modal-label">การมองเห็น</label>
              <Form.Select value={visibility} onChange={(e) => setVisibility(e.target.value)} data-testid="boards-create-visibility">
                <option value="private">ส่วนตัว</option>
                <option value="public">สาธารณะ</option>
              </Form.Select>
              <label className="boards-modal-label">เชื่อมโยงโปรเจกต์ (ไม่บังคับ)</label>
              <Form.Select value={projectId} onChange={(e) => setProjectId(e.target.value)} data-testid="boards-create-project">
                <option value="">ไม่เชื่อมโยง</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Form.Select>
              <div className="boards-modal-actions">
                <Button variant="light" type="button" onClick={() => setShowCreate(false)}>ยกเลิก</Button>
                <Button variant="primary" type="submit" data-testid="boards-create-submit">สร้างและเปิด</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
