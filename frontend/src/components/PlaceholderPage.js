// frontend/src/components/PlaceholderPage.js — หน้าตัวอย่างสำหรับเมนูที่อยู่ระหว่างพัฒนา
import React from 'react';
import { Card, Button, Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { House, Layers } from './common/Icons';

export default function PlaceholderPage({ title, description, backLink = '/', backLabel = 'กลับหน้าแรก' }) {
  return (
    <div className="placeholder-page">
      <Breadcrumb className="small mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          <House size={14} className="me-1" />
          หน้าแรก
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{title}</Breadcrumb.Item>
      </Breadcrumb>

      <Card className="border-0 shadow-sm p-4 text-center">
        <div className="my-4">
          <div className="placeholder-icon-wrap mx-auto mb-3 text-primary">
            <Layers size={40} />
          </div>
          <h2 className="h4 fw-bold text-ink mb-2">{title}</h2>
          <p className="text-muted mx-auto" style={{ maxWidth: 500 }}>
            {description || 'หน้านี้อยู่ในระหว่างการพัฒนาตามแผนงานของระบบ Project Management System'}
          </p>
          <div className="mt-4 d-flex justify-content-center gap-2">
            <Button as={Link} to={backLink} variant="primary">
              {backLabel}
            </Button>
            <Button as={Link} to="/projects" variant="outline-primary">
              ไปยังหน้าโปรเจกต์
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
