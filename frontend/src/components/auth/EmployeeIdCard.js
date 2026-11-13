// frontend/src/components/auth/EmployeeIdCard.js — renders the approved login employee card states.
import React from 'react';

function qrCells(id) {
  let seed = 0;
  for (const character of id) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  const cells = [];

  for (let row = 0; row < 11; row += 1) {
    for (let column = 0; column < 11; column += 1) {
      const finder = (row < 3 && column < 3)
        || (row < 3 && column > 7)
        || (row > 7 && column < 3);
      let enabled;
      if (finder) {
        enabled = !((row === 1 && column === 1)
          || (row === 1 && column === 9)
          || (row === 9 && column === 1));
      } else {
        seed = (seed * 1103515245 + 12345) >>> 0;
        enabled = (seed >>> 16) & 1;
      }
      if (enabled) cells.push({ row, column });
    }
  }
  return cells;
}

function CardHeader() {
  return (
    <div className="login-idc-head">
      <div className="login-idc-logo" aria-hidden="true">M</div>
      <span className="login-idc-brand">MECHA</span>
      <span className="login-idc-tag">Employee</span>
    </div>
  );
}

function EmployeePhoto({ tone }) {
  return (
    <svg viewBox="0 0 84 130" aria-hidden="true">
      <rect width="84" height="130" fill={tone} />
      <circle cx="42" cy="50" r="20" fill="var(--login-white)" opacity=".92" />
      <path d="M6 130C6 98 24 86 42 86s36 12 36 44z" fill="var(--login-white)" opacity=".92" />
    </svg>
  );
}

function DecorativeQr({ employeeId }) {
  return (
    <svg className="login-idc-qr" viewBox="0 0 55 55" aria-hidden="true">
      {qrCells(employeeId).map(({ row, column }) => (
        <rect
          key={`${row}-${column}`}
          x={column * 5}
          y={row * 5}
          width="4.4"
          height="4.4"
          rx=".8"
        />
      ))}
    </svg>
  );
}

function EmptyCard() {
  return (
    <div className="login-id-card is-empty">
      <CardHeader />
      <div className="login-idc-photo login-idc-photo-empty" aria-hidden="true">?</div>
      <div className="login-idc-info" aria-hidden="true">
        <div className="login-skeleton login-skeleton-80" />
        <div className="login-skeleton login-skeleton-55" />
        <div className="login-skeleton login-skeleton-65" />
      </div>
      <p className="login-idc-hint">Enter an Employee ID</p>
      <div className="login-idc-stripe" />
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="login-id-card is-not-found">
      <CardHeader />
      <div className="login-idc-message">
        <strong>Employee not found</strong>
        <span>Check the ID and try again.</span>
      </div>
      <div className="login-idc-stripe" />
    </div>
  );
}

function EmployeeCard({ employee }) {
  return (
    <div className="login-id-card">
      <CardHeader />
      <div className="login-idc-photo">
        <EmployeePhoto tone={employee.tone} />
      </div>
      <div className="login-idc-info">
        <p className="login-idc-name">{employee.name}</p>
        <p className="login-idc-position">{employee.position}</p>
        <div className="login-idc-field">
          <small>Department</small>
          <b>{employee.department}</b>
        </div>
        <div className="login-idc-field">
          <small>Employee ID</small>
          <b>{employee.id}</b>
        </div>
      </div>
      <DecorativeQr employeeId={employee.id} />
      <div className="login-idc-stripe" />
    </div>
  );
}

const EmployeeIdCard = React.memo(function EmployeeIdCard({ employee, notFound = false }) {
  if (employee) return <EmployeeCard employee={employee} />;
  if (notFound) return <NotFoundCard />;
  return <EmptyCard />;
});

export default EmployeeIdCard;
