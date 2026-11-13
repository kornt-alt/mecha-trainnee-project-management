// frontend/src/index.js — จุดเริ่มของแอป
import React from 'react';
import ReactDOM from 'react-dom/client';

// ⚠️ CSS ของทั้งแอป import ที่ไฟล์นี้ที่เดียว และลำดับนี้ห้ามสลับ
//   1. bootstrap  — สไตล์พื้นฐาน
//   2. tokens     — ตัวแปรสีของธีม + override ตัวแปรของ bootstrap (ต้องมาหลัง bootstrap ถึงจะชนะ)
//   3. index.css  — คลาสของแอป (ใช้ตัวแปรจาก tokens)
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/tokens.css';
import './index.css';
import './styles/project-modal.css';
import App from './App';
import { startScrollbarActivity } from './utils/scrollbarActivity';

startScrollbarActivity();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
