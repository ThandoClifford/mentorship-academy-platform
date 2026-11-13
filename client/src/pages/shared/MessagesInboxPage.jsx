import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as messageService from '../../services/messageService.js';
import * as mentorshipService from '../../services/mentorshipService.js';

const MESSAGEABLE_STATUSES = new Set(['ACCEPTED', 'ACTIVE', 'COMPLETED']);

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
}

function participant(relationship, isMentor) {
  const person = isMentor ? relationship.mentee : relationship.mentor;
  const name = `${person?.firstName || ''} ${person?.lastName || ''}`.trim();
  return {
    person,
    name: name || (isMentor ? 'Your mentee' : 'Your mentor'),
  };
}

export default function MessagesInboxPage({ role }) {
  const isMentor = role === 'MENTOR';
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async (isActive = () => true) => {
    setLoading(true);
    setError('');
    try {
      const result = isMentor
        ? await mentorshipService.getMentorMentorshipRelationships()
        : await mentorshipService.getMyMentorshipRelationships();
      const relationships = (result.relationships || []).filter((relationship) =>
        MESSAGEABLE_STATUSES.has(relationship.status));
      const messageResults = await Promise.allSettled(
        relationships.map(async (relationship) => {
          const response = isMentor
            ? await messageService.getMentorMessages(relationship.id)
            : await messageService.getMenteeMessages(relationship.id);
          const recentMessage = (response.messages || [])
            .slice()
            .sort((left, right) =>
              new Date(right.createdAt || 0) - new Date(left.createdAt || 0))[0];
          return { relationship, recentMessage };
        }),
      );
      const failed = messageResults.some((item) => item.status === 'rejected');
      const loaded = messageResults
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value)
        .sort((left, right) =>
          new Date(right.recentMessage?.createdAt || right.relationship.updatedAt || 0) -
          new Date(left.recentMessage?.createdAt || left.relationship.updatedAt || 0));
      if (isActive()) {
        setConversations(loaded);
        if (failed) setError('Some conversations could not be loaded.');
      }
    } catch (requestError) {
      if (isActive()) {
        setError(requestError.response?.data?.message || 'Could not load your conversations.');
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [isMentor]);

  useEffect(() => {
    let active = true;
    loadConversations(() => active);
    return () => {
      active = false;
    };
  }, [loadConversations]);

  return (
    <section className="mentee-messages-page">
      <header className="mentee-feature-header">
        <div>
          <span className="eyebrow">Stay connected</span>
          <h1>Messages</h1>
          <p>
            {isMentor
              ? 'Continue the conversations that support your mentees.'
              : 'Continue the conversations that support your mentorship journey.'}
          </p>
        </div>
      </header>

      {error && (
        <div className="mentee-feature-error" role="alert">
          <span>{error}</span>
          <button className="text-link" type="button" onClick={loadConversations}>Try again</button>
        </div>
      )}
      {loading ? (
        <p className="mentee-feature-state" role="status">Loading your conversations…</p>
      ) : conversations.length ? (
        <div className="mentee-conversation-list">
          {conversations.map(({ relationship, recentMessage }) => {
            const { person, name } = participant(relationship, isMentor);
            return (
              <Link
                className="mentee-conversation"
                key={relationship.id}
                to={`/${isMentor ? 'mentor' : 'mentee'}/mentorship/relationships/${relationship.id}/messages`}
              >
                <span className="mentee-conversation-avatar" aria-hidden="true">
                  {person?.profilePhoto
                    ? <img src={person.profilePhoto} alt="" />
                    : `${person?.firstName?.[0] || ''}${person?.lastName?.[0] || ''}`}
                </span>
                <span className="mentee-conversation-copy">
                  <strong>{name}</strong>
                  <span>{recentMessage?.content || `Start a conversation with ${isMentor ? 'your mentee' : 'your mentor'}.`}</span>
                </span>
                <span className="mentee-conversation-meta">
                  <span className="mentee-conversation-status">{relationship.status}</span>
                  {recentMessage?.createdAt && <time>{formatTime(recentMessage.createdAt)}</time>}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mentee-feature-empty">
          <h2>No conversations yet</h2>
          <p>
            {isMentor
              ? 'Once you have a mentorship relationship, you can message your mentees here.'
              : 'Once you have an accepted mentorship relationship, you can message your mentor here.'}
          </p>
          <Link className="button button-primary" to={isMentor ? '/mentor/mentees' : '/mentee/match'}>
            {isMentor ? 'View mentees' : 'Find a Mentor'}
          </Link>
        </div>
      )}
    </section>
  );
}
