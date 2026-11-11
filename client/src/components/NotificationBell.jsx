import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as notificationService from '../services/notificationService.js';

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function NotificationBell({ basePath }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const loadCount = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadNotificationCount();
      setUnreadCount(data?.count ?? 0);
    } catch {
      // keep previous count on transient errors
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data?.notifications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const id = window.setInterval(loadCount, 30000);
    return () => window.clearInterval(id);
  }, [loadCount]);

  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadNotifications();
      await loadCount();
    }
  }

  async function handleMarkRead(id) {
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update notification.');
    }
  }

  async function handleMarkAll() {
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update notifications.');
    }
  }

  function resolveLink(n) {
    const relId = n.relatedEntityId;
    if (!relId) return null;
    if (n.relatedEntityType === 'MENTORSHIP') {
      return `${basePath}/mentorship/relationships/${relId}`;
    }
    if (n.relatedEntityType === 'MESSAGE') {
      return `${basePath}/mentorship/relationships/${relId}/messages`;
    }
    if (n.relatedEntityType === 'GOAL') {
      return `${basePath}/goals`;
    }
    return null;
  }

  async function handleNavigate(n) {
    if (!n.isRead) {
      try { await notificationService.markNotificationRead(n.id); } catch { /* ignore */ }
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - (n.isRead ? 0 : 1)));
    }
    const link = resolveLink(n);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <span aria-hidden="true">Notifications</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            <button
              type="button"
              className="notification-mark-all"
              onClick={handleMarkAll}
              disabled={!notifications.some((n) => !n.isRead)}
            >
              Mark all as read
            </button>
          </div>
          {error && <p className="notification-error" role="alert">{error}</p>}
          {loading ? (
            <p className="notification-state">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <p className="notification-state">No notifications yet.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => {
                const link = resolveLink(n);
                return (
                  <li key={n.id} className={`notification-item ${n.isRead ? 'is-read' : 'is-unread'}`}>
                    <button
                      type="button"
                      className="notification-item-main"
                      onClick={() => (link ? handleNavigate(n) : handleMarkRead(n.id))}
                    >
                      <span className="notification-title">{n.title}</span>
                      <span className="notification-message">{n.message}</span>
                      <span className="notification-time">{formatTime(n.createdAt)}</span>
                    </button>
                    {!n.isRead && (
                      <button
                        type="button"
                        className="notification-read-btn"
                        onClick={() => handleMarkRead(n.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
