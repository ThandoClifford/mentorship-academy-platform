import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as mentorshipService from '../../../services/mentorshipService.js';
import * as messageService from '../../../services/messageService.js';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

export default function MenteeMessagesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [relationship, setRelationship] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const listEndRef = useRef(null);
  const pollRef = useRef(null);

  const myId = String(user?._id || user?.id || '');
  const mentorName = useMemo(() => {
    const m = relationship?.mentor;
    return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Mentor' : 'Mentor';
  }, [relationship]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [relRes, msgRes] = await Promise.all([
        mentorshipService.getMentorshipRelationship(id),
        messageService.getMenteeMessages(id),
      ]);
      setRelationship(relRes.relationship || null);
      setMessages(msgRes.messages || []);
      setError('');
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.message || 'Could not load messages.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    pollRef.current = window.setInterval(() => {
      load({ silent: true });
    }, 5000);
    return () => {
      active = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await messageService.sendMenteeMessage(id, { content: text });
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
      } else {
        const msgRes = await messageService.getMenteeMessages(id);
        setMessages(msgRes.messages || []);
      }
      setContent('');
    } catch (err) {
      setSendError(err.response?.data?.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading messages…</p>
      </section>
    );
  }

  if (error && !relationship) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">{error}</p>
        <Link className="button button-primary" to="/mentee/mentorship/relationships">
          Back to Relationships
        </Link>
      </section>
    );
  }

  const status = relationship?.status;

  return (
    <section className="mentorship-page messages-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Messages</h1>
          <p>Conversation with {mentorName}</p>
        </div>
        <Link className="button button-secondary" to={`/mentee/mentorship/relationships/${id}`}>
          ← Back to Relationship
        </Link>
      </header>

      <div className="messages-panel">
        <div className="messages-meta">
          <span className="messages-meta-item">Relationship: <strong>{status}</strong></span>
        </div>

        {error && <p className="mentorship-message mentorship-error" role="alert">{error}</p>}

        <div className="messages-list" role="log" aria-live="polite">
          {messages.length === 0 ? (
            <p className="messages-empty">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((msg) => {
              const senderId = String(msg.sender?.id || msg.sender?._id || '');
              const mine = senderId && senderId === myId;
              const senderName = mine
                ? 'You'
                : `${msg.sender?.firstName || ''} ${msg.sender?.lastName || ''}`.trim() || 'Participant';
              return (
                <div key={msg.id} className={`message-row ${mine ? 'mine' : 'theirs'}`}>
                  <div className="message-bubble">
                    <div className="message-sender">{senderName}</div>
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">{formatTime(msg.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        {sendError && <p className="mentorship-message mentorship-error" role="alert">{sendError}</p>}

        <form className="message-compose" onSubmit={handleSend}>
          <label className="form-label" htmlFor="message-content">New message</label>
          <textarea
            id="message-content"
            className="form-textarea message-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message…"
            rows={3}
            maxLength={2000}
            disabled={sending}
          />
          <div className="message-compose-actions">
            <span className="message-hint">Messages are visible to both participants.</span>
            <button className="button button-primary" type="submit" disabled={sending || !content.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
