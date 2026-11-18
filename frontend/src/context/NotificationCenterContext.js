// Shared in-memory mock state for notification, incident, audit, and export screens.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CURRENT_USER } from '../data/mockData';
import {
  MOCK_AUDIT_LOG,
  MOCK_EXPORT_HISTORY,
  MOCK_NOTIFICATIONS,
  MOCK_SECURITY_INCIDENTS,
} from '../data/notificationCenterMockData';

const NotificationCenterContext = createContext(null);
const currentTimestamp = () => new Date().toISOString();

export function NotificationCenterProvider({ children }) {
  const [notifications, setNotifications] = useState(() => MOCK_NOTIFICATIONS.map((item) => ({
    ...item,
    readStatus: item.unread ? 'unread' : 'read',
  })));
  const [incidents, setIncidents] = useState(() => MOCK_SECURITY_INCIDENTS.map((item) => ({ ...item, relatedIncidentIds: [...item.relatedIncidentIds] })));
  const [auditLog, setAuditLog] = useState(() => MOCK_AUDIT_LOG.map((item) => ({ ...item })));
  const [exports] = useState(() => MOCK_EXPORT_HISTORY.map((item) => ({ ...item, manifest: item.manifest.map((entry) => ({ ...entry })) })));
  const auditSequence = useRef(Math.max(...MOCK_AUDIT_LOG.map((record) => Number(record.id.split('-').pop()) || 0)));

  const appendAuditLog = useCallback((event) => {
    auditSequence.current += 1;
    const record = {
      id: `AUD-MOCK-${String(auditSequence.current).padStart(3, '0')}`,
      timestamp: currentTimestamp(),
      actor: CURRENT_USER.fullName,
      incidentId: '',
      description: '',
      integrityStatus: 'mock_recorded',
      ...event,
    };
    setAuditLog((previous) => [record, ...previous]);
    return record;
  }, []);

  const markNotifications = useCallback((ids, unread) => {
    const selectedIds = new Set(ids.map(String));
    const changed = notifications.filter((item) => selectedIds.has(String(item.id)) && item.unread !== unread);
    if (!changed.length) return 0;
    setNotifications((previous) => previous.map((item) => (
      selectedIds.has(String(item.id)) ? { ...item, unread, readStatus: unread ? 'unread' : 'read' } : item
    )));
    appendAuditLog({
      eventType: unread ? 'notifications_marked_unread' : 'notifications_marked_read',
      description: `${unread ? 'ตั้งค่าเป็นยังไม่อ่าน' : 'ทำเครื่องหมายว่าอ่านแล้ว'} ${changed.length} รายการ`,
    });
    return changed.length;
  }, [appendAuditLog, notifications]);

  const deleteNotifications = useCallback((ids) => {
    const selectedIds = new Set(ids.map(String));
    const removed = notifications.filter((item) => selectedIds.has(String(item.id)));
    if (!removed.length) return 0;
    setNotifications((previous) => previous.filter((item) => !selectedIds.has(String(item.id))));
    appendAuditLog({ eventType: 'notifications_deleted', description: `ลบการแจ้งเตือนตัวอย่าง ${removed.length} รายการ` });
    return removed.length;
  }, [appendAuditLog, notifications]);

  const updateIncident = useCallback((incidentId, patch, eventType, description) => {
    const current = incidents.find((item) => String(item.id) === String(incidentId));
    if (!current) return null;
    const updatedAt = currentTimestamp();
    const next = { ...current, ...patch, updatedAt };
    setIncidents((previous) => previous.map((item) => String(item.id) === String(incidentId) ? next : item));
    appendAuditLog({ eventType, incidentId: current.id, description });
    return next;
  }, [appendAuditLog, incidents]);

  const acknowledgeIncident = useCallback((incidentId) => {
    const incident = incidents.find((item) => String(item.id) === String(incidentId));
    if (!incident || incident.status !== 'reported') return null;
    return updateIncident(incidentId, {
      status: 'acknowledged',
      acknowledgedBy: CURRENT_USER.fullName,
      acknowledgedAt: currentTimestamp(),
    }, 'incident_acknowledged', `รับทราบเหตุการณ์ ${incident.id}`);
  }, [incidents, updateIncident]);

  const startIncidentInvestigation = useCallback((incidentId) => {
    const incident = incidents.find((item) => String(item.id) === String(incidentId));
    if (!incident || incident.status !== 'acknowledged') return null;
    return updateIncident(incidentId, { status: 'investigating' }, 'incident_investigation_started', `เริ่มตรวจสอบเหตุการณ์ ${incident.id}`);
  }, [incidents, updateIncident]);

  const resolveIncident = useCallback((incidentId, outcome, evidenceRef, resolution) => {
    const incident = incidents.find((item) => String(item.id) === String(incidentId));
    if (!incident || !['acknowledged', 'investigating'].includes(incident.status)) return null;
    const nextStatus = resolution === 'false_positive' ? 'false_positive' : 'resolved';
    return updateIncident(incidentId, {
      status: nextStatus,
      investigationOutcome: outcome.trim(),
      evidenceRef: evidenceRef.trim(),
    }, nextStatus === 'resolved' ? 'incident_resolved' : 'incident_closed_false_positive', `${incident.id}: ${outcome.trim()}`);
  }, [incidents, updateIncident]);

  const value = useMemo(() => ({
    notifications,
    incidents,
    auditLog,
    exports,
    markNotifications,
    deleteNotifications,
    acknowledgeIncident,
    startIncidentInvestigation,
    resolveIncident,
    appendAuditLog,
  }), [notifications, incidents, auditLog, exports, markNotifications, deleteNotifications,
    acknowledgeIncident, startIncidentInvestigation, resolveIncident, appendAuditLog]);

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) throw new Error('useNotificationCenter ต้องถูกใช้ภายใน <NotificationCenterProvider>');
  return context;
}
