// frontend/src/components/boards/BoardCanvasPage.js — Route wrapper for full-screen board canvas.
import { useNavigate, useParams } from 'react-router-dom';
import BoardCanvas from './BoardCanvas';

export default function BoardCanvasPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  return <BoardCanvas boardId={boardId} onClose={() => navigate('/boards')} />;
}
