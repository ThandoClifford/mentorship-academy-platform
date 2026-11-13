import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import * as goalService from '../../services/goalService.js';
import * as matchingService from '../../services/matchingService.js';
import * as messageService from '../../services/messageService.js';
import * as mentorshipService from '../../services/mentorshipService.js';
import * as notificationService from '../../services/notificationService.js';
import * as profileService from '../../services/profileService.js';
import './MenteeDashboardPage.css';

const EMPTY_SECTION = { loading: true, error: '', data: null };
const ACTIVE_RELATIONSHIP_STATUSES = new Set(['ACCEPTED', 'ACTIVE', 'COMPLETED']);
const STATUS_ORDER = ['ACTIVE', 'ACCEPTED', 'PENDING', 'COMPLETED', 'ARCHIVED', 'DECLINED'];

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, options);
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function mentorName(relationship) {
  const mentor = relationship?.mentor;
  return mentor
    ? `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim() || 'Your mentor'
    : 'Your mentor';
}

function SectionError({ message, onRetry }) {
  return (
    <div className="mentee-dashboard-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button className="text-link" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function LoadingText({ children }) {
  return <p className="mentee-dashboard-loading" role="status">{children}</p>;
}

function SectionHeading({ eyebrow, title, to, linkLabel }) {
  return (
    <div className="mentee-dashboard-section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {to && <Link className="text-link" to={to}>{linkLabel} <span aria-hidden="true">→</span></Link>}
    </div>
  );
}

export default function MenteeDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(EMPTY_SECTION);
  const [matches, setMatches] = useState(EMPTY_SECTION);
  const [relationships, setRelationships] = useState(EMPTY_SECTION);
  const [goals, setGoals] = useState(EMPTY_SECTION);
  const [messages, setMessages] = useState(EMPTY_SECTION);
  const [notifications, setNotifications] = useState(EMPTY_SECTION);

  const loadProfile = useCallback(async () => {
    setProfile((current) => ({ ...current, loading: true, error: '' }));
    try {
      const completion = await profileService.getMenteeProfileCompletion();
      setProfile({ loading: false, error: '', data: completion });
    } catch (error) {
      setProfile({
        loading: false,
        error: getErrorMessage(error, 'Could not load profile completion.'),
        data: null,
      });
    }
  }, []);

  const loadMatches = useCallback(async () => {
    setMatches((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await matchingService.getMentorMatches();
      setMatches({ loading: false, error: '', data: result, incompleteProfile: false });
    } catch (error) {
      const incompleteProfile = error.response?.status === 404;
      setMatches({
        loading: false,
        error: incompleteProfile
          ? 'Complete your profile to unlock personalized mentor matches.'
          : getErrorMessage(error, 'Could not load mentor matches.'),
        data: null,
        incompleteProfile,
      });
    }
  }, []);

  const loadRelationships = useCallback(async () => {
    setRelationships((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [relationshipResult, requestResult] = await Promise.all([
        mentorshipService.getMyMentorshipRelationships(),
        mentorshipService.getMyMentorshipRequests(),
      ]);
      const combined = [
        ...(relationshipResult.relationships || []),
        ...(requestResult.relationships || []),
      ];
      const unique = [...new Map(combined.map((relationship) => [relationship.id, relationship])).values()];
      unique.sort((left, right) => {
        const statusDifference = STATUS_ORDER.indexOf(left.status) - STATUS_ORDER.indexOf(right.status);
        if (statusDifference !== 0) return statusDifference;
        return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
      });
      setRelationships({ loading: false, error: '', data: unique });
      return unique;
    } catch (error) {
      setRelationships({
        loading: false,
        error: getErrorMessage(error, 'Could not load mentorship relationships.'),
        data: null,
      });
      return null;
    }
  }, []);

  const loadGoals = useCallback(async (relationshipList) => {
    const eligible = relationshipList.filter((relationship) =>
      ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(relationship.status));
    if (!eligible.length) {
      setGoals({ loading: false, error: '', data: [] });
      return;
    }

    setGoals((current) => ({ ...current, loading: true, error: '' }));
    const results = await Promise.allSettled(
      eligible.map(async (relationship) => {
        const result = await goalService.getMenteeGoals(relationship.id);
        return (result.goals || []).map((goal) => ({
          ...goal,
          relationshipId: relationship.id,
          mentor: relationship.mentor,
        }));
      }),
    );
    const loadedGoals = results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);
    const failed = results.some((result) => result.status === 'rejected');
    setGoals({
      loading: false,
      error: failed ? 'Could not load goals for all your relationships.' : '',
      data: loadedGoals,
    });
  }, []);

  const loadMessages = useCallback(async (relationshipList) => {
    const eligible = relationshipList.filter((relationship) =>
      ACTIVE_RELATIONSHIP_STATUSES.has(relationship.status));
    if (!eligible.length) {
      setMessages({ loading: false, error: '', data: [] });
      return;
    }

    setMessages((current) => ({ ...current, loading: true, error: '' }));
    const results = await Promise.allSettled(
      eligible.map(async (relationship) => {
        const result = await messageService.getMenteeMessages(relationship.id);
        return (result.messages || []).map((message) => ({
          ...message,
          relationshipId: relationship.id,
          mentor: relationship.mentor,
        }));
      }),
    );
    const recent = results
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 3);
    const failed = results.some((result) => result.status === 'rejected');
    setMessages({
      loading: false,
      error: failed ? 'Could not load messages for all your relationships.' : '',
      data: recent,
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifications((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [notificationResult, unreadResult] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getUnreadNotificationCount(),
      ]);
      setNotifications({
        loading: false,
        error: '',
        data: {
          items: (notificationResult.notifications || []).slice(0, 3),
          unreadCount: unreadResult.count || 0,
        },
      });
    } catch (error) {
      setNotifications({
        loading: false,
        error: getErrorMessage(error, 'Could not load notifications.'),
        data: null,
      });
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    loadProfile();
    loadNotifications();
    loadRelationships();
    return undefined;
  }, [authLoading, user, loadProfile, loadNotifications, loadRelationships]);

  useEffect(() => {
    if (profile.loading || relationships.loading) return;
    if (profile.error || relationships.error) {
      setMatches({
        loading: false,
        error: 'Could not determine whether mentor matching is needed. Please retry.',
        data: null,
      });
      return;
    }
    if (!relationships.data) return;

    const hasPendingRequest = relationships.data.some((relationship) =>
      relationship.status === 'PENDING');
    const hasAssignedMentor = relationships.data.some((relationship) =>
      ['ACCEPTED', 'ACTIVE'].includes(relationship.status));
    if (hasPendingRequest || hasAssignedMentor) {
      setMatches({ loading: false, error: '', data: null, incompleteProfile: false });
      return;
    }

    if (!profile.data?.isComplete) {
      setMatches({
        loading: false,
        error: 'Complete your profile to unlock personalized mentor matches.',
        data: null,
        incompleteProfile: true,
      });
      return;
    }

    loadMatches();
  }, [
    profile.data,
    profile.error,
    profile.loading,
    relationships.data,
    relationships.error,
    relationships.loading,
    loadMatches,
  ]);

  useEffect(() => {
    if (relationships.data) {
      loadGoals(relationships.data);
      loadMessages(relationships.data);
    }
  }, [relationships.data, loadGoals, loadMessages]);

  const currentRelationship = useMemo(
    () => relationships.data?.[0] || null,
    [relationships.data],
  );
  const hasAssignedMentor = ['ACCEPTED', 'ACTIVE'].includes(currentRelationship?.status);
  const hasPendingRequest = currentRelationship?.status === 'PENDING';
  const profileIsComplete = Boolean(profile.data?.isComplete);
  const findMentorPath = hasAssignedMentor
    ? '/mentee/mentor'
    : hasPendingRequest
      ? '/mentee/mentorship/requests'
      : profileIsComplete
        ? '/mentee/match'
        : '/mentee/profile';
  const findMentorLabel = hasAssignedMentor
    ? 'My Mentor'
    : hasPendingRequest
      ? 'View request'
      : profileIsComplete
        ? 'Find a Mentor'
        : 'Complete your profile';
  const allGoals = goals.data || [];
  const activeGoals = allGoals.filter((goal) => goal.status === 'ACTIVE');
  const completedGoals = allGoals.filter((goal) => goal.status === 'COMPLETED');
  const averageProgress = allGoals.length
    ? Math.round(allGoals.reduce((sum, goal) => sum + (Number(goal.progress) || 0), 0) / allGoals.length)
    : 0;
  const completionPercentage = profile.data?.percentage ?? 0;
  const firstName = user?.firstName || 'there';
  const relationshipStatusCopy = {
    PENDING: {
      title: 'Mentor request pending',
      description: 'Your request is waiting for mentor review.',
      action: 'View request',
      to: '/mentee/mentorship/requests',
    },
    ACCEPTED: {
      title: 'Mentorship accepted',
      description: `Your mentorship with ${mentorName(currentRelationship)} has been accepted.`,
      action: 'View mentorship',
      to: '/mentee/mentor',
    },
    ACTIVE: {
      title: 'Mentorship active',
      description: `You're currently working with ${mentorName(currentRelationship)}.`,
      action: 'View mentorship',
      to: '/mentee/mentor',
    },
    COMPLETED: {
      title: 'Mentorship completed',
      description: `Your mentorship with ${mentorName(currentRelationship)} is complete. You can find a new mentor when you’re ready.`,
      action: profileIsComplete ? 'Find a new mentor' : 'Complete your profile',
      to: findMentorPath,
    },
    ARCHIVED: {
      title: 'Past mentorship',
      description: `View your completed mentorship with ${mentorName(currentRelationship)}.`,
      action: profileIsComplete ? 'Find a new mentor' : 'Complete your profile',
      to: findMentorPath,
    },
    DECLINED: {
      title: 'Request declined',
      description: 'You can explore other mentors and find a new match.',
      action: profileIsComplete ? 'Find a Mentor' : 'Complete your profile',
      to: findMentorPath,
    },
  };
  const relationshipStatus = currentRelationship
    ? relationshipStatusCopy[currentRelationship.status]
    : null;
  const activityItems = [
    ...(notifications.data?.items || []).map((notification) => ({
      id: `notification-${notification.id}`,
      title: notification.title,
      description: notification.message,
      date: notification.createdAt,
      to: notification.relatedEntityType === 'MESSAGE' && notification.relatedEntityId
        ? `/mentee/mentorship/relationships/${notification.relatedEntityId}/messages`
        : notification.relatedEntityType === 'MENTORSHIP' && notification.relatedEntityId
          ? `/mentee/mentorship/relationships/${notification.relatedEntityId}`
          : null,
    })),
    ...(messages.data || []).map((message) => ({
      id: `message-${message.id}`,
      title: `Message from ${mentorName({ mentor: message.mentor })}`,
      description: message.content,
      date: message.createdAt,
      to: `/mentee/mentorship/relationships/${message.relationshipId}/messages`,
    })),
    ...allGoals.map((goal) => ({
      id: `goal-${goal.id}`,
      title: 'Goal progress updated',
      description: `${goal.title} · ${goal.progress ?? 0}% complete`,
      date: goal.updatedAt || goal.createdAt,
      to: `/mentee/goals/${goal.relationshipId}/${goal.id}`,
    })),
  ]
    .filter((item) => item.date)
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 4);
  const activityLoading = goals.loading || messages.loading || notifications.loading;
  const activityFailed = Boolean(goals.error && messages.error && notifications.error);

  if (authLoading) {
    return (
      <section className="mentee-dashboard mentorship-page" role="status">
        <LoadingText>Loading your dashboard…</LoadingText>
      </section>
    );
  }

  return (
    <section className="mentee-dashboard mentorship-page">
      <header className="mentee-dashboard-welcome">
        <div>
          <span className="eyebrow">YOUR MENTORSHIP JOURNEY</span>
          <h1>{getGreeting()}, {firstName} <span aria-hidden="true">👋</span></h1>
          <p>Your mentorship journey starts here. Track your goals, connect with mentors, and keep moving forward.</p>
        </div>
        <Link className="button button-primary" to={findMentorPath}>{findMentorLabel}</Link>
      </header>

      <div className="mentee-dashboard-top-grid">
        <article className="mentee-dashboard-card mentee-profile-card">
          <SectionHeading eyebrow="A better introduction" title="Complete your profile" to="/mentee/profile" linkLabel="Complete profile" />
          {profile.loading ? (
            <LoadingText>Checking your profile…</LoadingText>
          ) : profile.error ? (
            <SectionError message={profile.error} onRetry={loadProfile} />
          ) : (
            <>
              <div className="mentee-profile-progress-label">
                <strong>Your profile is {completionPercentage}% complete</strong>
                <span>{completionPercentage}%</span>
              </div>
              <div
                className="mentee-profile-progress-track"
                role="progressbar"
                aria-label="Profile completion"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={completionPercentage}
              >
                <span style={{ width: `${completionPercentage}%` }} />
              </div>
              <p>
                {profile.data?.isComplete
                  ? 'Your profile is ready. Keep it up to date to get recommendations that fit.'
                  : 'Help us understand your goals and interests so we can find better mentor matches.'}
              </p>
              {!profile.data?.isComplete && (
                <Link className="text-link" to="/mentee/profile">Complete profile <span aria-hidden="true">→</span></Link>
              )}
            </>
          )}
        </article>

        <article className="mentee-dashboard-card mentee-relationship-card">
          <SectionHeading eyebrow="Your connection" title="Mentorship status" />
          {relationships.loading ? (
            <LoadingText>Loading your mentorship status…</LoadingText>
          ) : relationships.error ? (
            <SectionError message={relationships.error} onRetry={loadRelationships} />
          ) : relationshipStatus ? (
            <div className="mentee-status-content">
              <span className={`mentee-status-indicator status-${currentRelationship.status.toLowerCase()}`} aria-hidden="true" />
              <div>
                <h3>{relationshipStatus.title}</h3>
                <p>{relationshipStatus.description}</p>
                {currentRelationship.startedAt && (
                  <small>Started {formatDate(currentRelationship.startedAt)}</small>
                )}
              </div>
              <Link className="text-link" to={relationshipStatus.to}>
                {relationshipStatus.action} <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="mentee-status-empty">
              <span className="mentee-status-indicator" aria-hidden="true" />
              <div>
                <h3>No mentor yet</h3>
                <p>{profileIsComplete ? 'Find a mentor to start your journey.' : 'Complete your profile before exploring mentor matches.'}</p>
              </div>
              <Link className="text-link" to={findMentorPath}>{findMentorLabel} <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </article>
      </div>

      <section className="mentee-dashboard-card mentee-matches-section">
        <SectionHeading
          eyebrow="A thoughtful place to start"
          title={hasAssignedMentor ? 'Your mentor' : hasPendingRequest ? 'Request pending' : 'Recommended mentors'}
          to={hasAssignedMentor ? '/mentee/mentor' : hasPendingRequest ? '/mentee/mentorship/requests' : '/mentee/match'}
          linkLabel={hasAssignedMentor ? 'View My Mentor' : hasPendingRequest ? 'View request' : 'View all matches'}
        />
        {!hasAssignedMentor && !hasPendingRequest && (
          <p className="mentee-section-description">Based on your goals, interests and experience.</p>
        )}
        {hasAssignedMentor ? (
          <div className="mentee-dashboard-empty">
            <p>You’re connected with {mentorName(currentRelationship)}. Continue your work together through your relationship.</p>
            <Link className="button button-secondary" to="/mentee/mentor">Go to My Mentor</Link>
          </div>
        ) : hasPendingRequest ? (
          <div className="mentee-dashboard-empty">
            <p>Your mentorship request is waiting for the mentor to respond.</p>
            <Link className="button button-secondary" to="/mentee/mentorship/requests">View request</Link>
          </div>
        ) : matches.loading ? (
          <LoadingText>Finding mentors who fit your goals…</LoadingText>
        ) : matches.error ? (
          matches.incompleteProfile ? (
            <div className="mentee-dashboard-empty">
              <p>{matches.error}</p>
              <Link className="button button-secondary" to="/mentee/profile">Complete your profile</Link>
            </div>
          ) : (
            <SectionError message={matches.error} onRetry={loadMatches} />
          )
        ) : matches.data?.matches?.length ? (
          <div className="mentee-match-grid">
            {matches.data.matches.slice(0, 2).map((match) => (
              <article className="mentee-match-card" key={match.mentorId}>
                <div className="mentee-match-card-header">
                  <div className="mentee-match-avatar" aria-hidden="true">
                    {match.profilePhoto
                      ? <img src={match.profilePhoto} alt="" />
                      : `${match.firstName?.[0] || ''}${match.lastName?.[0] || ''}`}
                  </div>
                  <div>
                    <h3>{match.firstName} {match.lastName}</h3>
                    <p>{match.jobTitle || 'Mentor'}</p>
                    <small>{match.industry || match.company || 'Mentorship Academy mentor'}</small>
                  </div>
                  <span className="mentee-match-score">{match.compatibilityScore}% <small>match</small></span>
                </div>
                {match.company && <p className="mentee-match-company">{match.company}</p>}
                {match.expertise?.length > 0 && (
                  <div className="mentee-match-tags">
                    {match.expertise.slice(0, 3).map((expertise) => <span key={expertise}>{expertise}</span>)}
                  </div>
                )}
                {match.explanations?.[0] && <p className="mentee-match-explanation">{match.explanations[0]}</p>}
                <Link className="button button-secondary mentee-match-action" to={`/mentee/mentorship/request/${match.mentorId}`}>
                  View profile
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mentee-dashboard-empty">
            <p>
              {profileIsComplete
                ? 'No mentor matches are available right now. Please check back later.'
                : 'Complete your profile to improve your mentor recommendations.'}
            </p>
            {!profileIsComplete && (
              <Link className="text-link" to="/mentee/profile">Build your profile <span aria-hidden="true">→</span></Link>
            )}
          </div>
        )}
      </section>

      <div className="mentee-dashboard-bottom-grid">
        <article className="mentee-dashboard-card mentee-goals-card">
          <SectionHeading eyebrow="Small steps add up" title="Goals overview" to="/mentee/goals" linkLabel="View goals" />
          {goals.loading ? (
            <LoadingText>Loading your goals…</LoadingText>
          ) : goals.error ? (
            <SectionError
              message={goals.error}
              onRetry={() => loadGoals(relationships.data || [])}
            />
          ) : (
            <>
              <div className="mentee-goal-stats">
                <div><strong>{activeGoals.length}</strong><span>Active</span></div>
                <div><strong>{completedGoals.length}</strong><span>Completed</span></div>
                <div><strong>{averageProgress}%</strong><span>Average progress</span></div>
              </div>
              {activeGoals.length ? (
                <ul className="mentee-active-goals">
                  {activeGoals.slice(0, 2).map((goal) => (
                    <li key={goal.id}>
                      <Link to={`/mentee/goals/${goal.relationshipId}/${goal.id}`}>{goal.title}</Link>
                      <span>{goal.progress ?? 0}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mentee-dashboard-muted">No active goals yet. Create one to start tracking your progress.</p>
              )}
              <Link className="text-link" to="/mentee/progress">See all progress <span aria-hidden="true">→</span></Link>
            </>
          )}
        </article>

        <article className="mentee-dashboard-card mentee-activity-card">
          <SectionHeading eyebrow="The latest from your journey" title="Recent activity" />
          {activityLoading ? (
            <LoadingText>Gathering your recent activity…</LoadingText>
          ) : activityFailed ? (
            <SectionError message="Recent activity is temporarily unavailable." onRetry={() => {
              loadNotifications();
              loadRelationships();
            }} />
          ) : activityItems.length ? (
            <ul className="mentee-activity-list">
              {activityItems.map((item) => (
                <li key={item.id}>
                  <span className="mentee-activity-dot" aria-hidden="true" />
                  <div>
                    {item.to ? <Link to={item.to}>{item.title}</Link> : <strong>{item.title}</strong>}
                    <p>{item.description}</p>
                    <time>{formatTime(item.date)}</time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mentee-dashboard-empty"><p>Your recent messages, goals and notifications will appear here.</p></div>
          )}
        </article>
      </div>

      <section className="mentee-dashboard-card mentee-messages-section">
        <SectionHeading eyebrow="Stay connected" title="Recent messages" to="/mentee/messages" linkLabel="View messages" />
        {messages.loading ? (
          <LoadingText>Loading recent messages…</LoadingText>
        ) : messages.error ? (
          <SectionError
            message={messages.error}
            onRetry={() => loadMessages(relationships.data || [])}
          />
        ) : messages.data?.length ? (
          <ul className="mentee-dashboard-list">
            {messages.data.slice(0, 2).map((message) => {
              const senderId = String(message.sender?.id || message.sender?._id || '');
              const sender = senderId === String(user?._id || user?.id)
                ? 'You'
                : mentorName({ mentor: message.mentor });
              return (
                <li key={message.id}>
                  <Link to={`/mentee/mentorship/relationships/${message.relationshipId}/messages`}>
                    <strong>{sender}</strong>
                    <span>{message.content}</span>
                    <time>{formatTime(message.createdAt)}</time>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mentee-dashboard-empty"><p>No recent messages.</p></div>
        )}
      </section>
    </section>
  );
}
