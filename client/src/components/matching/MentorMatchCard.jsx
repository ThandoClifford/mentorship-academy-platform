import { Link } from 'react-router-dom';

const statusLabels = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const statusColors = {
  PENDING: 'status-pending',
  ACCEPTED: 'status-accepted',
  DECLINED: 'status-declined',
  ACTIVE: 'status-active',
  COMPLETED: 'status-completed',
  ARCHIVED: 'status-archived',
};

function ScoreBreakdown({ scoreBreakdown }) {
  if (!scoreBreakdown) return null;

  const categories = [
    { key: 'expertise', label: 'Expertise', weight: '30%' },
    { key: 'goals', label: 'Goals', weight: '25%' },
    { key: 'industry', label: 'Industry', weight: '15%' },
    { key: 'experience', label: 'Experience', weight: '15%' },
    { key: 'interests', label: 'Interests', weight: '10%' },
    { key: 'availability', label: 'Availability', weight: '5%' },
  ];

  return (
    <div className="match-score-breakdown">
      <h4 className="score-breakdown-title">Score Breakdown</h4>
      <div className="score-breakdown-grid">
        {categories.map(({ key, label, weight }) => {
          const score = scoreBreakdown[key];
          if (score === undefined || score === null) return null;
          return (
            <div key={key} className="score-breakdown-item">
              <div className="score-breakdown-header">
                <span className="score-breakdown-label">{label}</span>
                <span className="score-breakdown-weight">{weight}</span>
              </div>
              <div className="score-breakdown-bar">
                <div
                  className="score-breakdown-fill"
                  style={{ width: `${score}%` }}
                ></div>
              </div>
              <span className="score-breakdown-value">{score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchExplanations({ explanations }) {
  if (!explanations?.length) return null;

  return (
    <div className="match-explanations">
      <h4 className="explanations-title">Why this match</h4>
      <ul className="explanations-list">
        {explanations.map((explanation, idx) => (
          <li key={idx} className="explanation-item">
            {explanation}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MentorTags({ mentor }) {
  const tags = [];
  if (mentor.expertise?.length) {
    tags.push(...mentor.expertise.slice(0, 4).map((skill, idx) => ({
      key: `expertise-${idx}`,
      children: skill,
    })));
    if (mentor.expertise.length > 4) {
      tags.push({
        key: 'expertise-more',
        children: `+${mentor.expertise.length - 4} more`,
        className: 'mentor-skill-tag more',
      });
    }
  }
  if (mentor.specialisations?.length) {
    tags.push(...mentor.specialisations.slice(0, 2).map((skill, idx) => ({
      key: `specialisation-${idx}`,
      children: skill,
    })));
  }
  if (mentor.mentorshipAreas?.length) {
    tags.push(...mentor.mentorshipAreas.slice(0, 2).map((area, idx) => ({
      key: `mentorship-area-${idx}`,
      children: area,
    })));
  }

  if (!tags.length) return null;

  return (
    <div className="mentor-expertise" role="list">
      {tags.map((tag, idx) => (
        <span
          key={tag.key || idx}
          className={tag.className || 'mentor-skill-tag'}
          role="listitem"
        >
          {tag.children}
        </span>
      ))}
    </div>
  );
}

function MentorMatchCard({
  mentor,
  onRequestMentorship,
  requestingMentorId,
}) {
  const {
    mentorId,
    firstName,
    lastName,
    jobTitle,
    company,
    industry,
    yearsOfExperience,
    profilePhoto,
    bio,
    compatibilityScore,
    scoreBreakdown,
    explanations,
    hasExistingRelationship,
    hasPendingRequest,
  } = mentor;

  const isRequesting = requestingMentorId === mentorId;
  const isDisabled = hasExistingRelationship || hasPendingRequest || isRequesting;

  let actionContent;
  if (hasExistingRelationship) {
    actionContent = (
      <span className="match-action-status status-connected">
        Already connected
      </span>
    );
  } else if (hasPendingRequest) {
    actionContent = (
      <span className="match-action-status status-pending-request">
        Request pending
      </span>
    );
  } else {
    actionContent = (
      <button
        className="button button-primary"
        type="button"
        onClick={() => onRequestMentorship(mentorId)}
        disabled={isRequesting}
      >
        {isRequesting ? 'Requesting…' : 'Request Mentorship'}
      </button>
    );
  }

  return (
    <article className="match-card">
      <div className="match-card-header">
        <div className="match-compatibility-badge">
          <span className="compatibility-score">{compatibilityScore}%</span>
          <span className="compatibility-label">Match</span>
        </div>
        <div className="mentor-card-header">
          {profilePhoto ? (
            <img
              className="mentor-avatar"
              src={profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="mentor-avatar placeholder" aria-hidden="true">
              {firstName?.[0]}{lastName?.[0]}
            </div>
          )}
          <div className="mentor-info">
            <h3 className="mentor-name">
              {firstName} {lastName}
            </h3>
            <p className="mentor-title">
              {jobTitle || 'Mentor'}{' '}
              {company ? `at ${company}` : ''}
            </p>
            {industry && (
              <p className="mentor-industry">{industry}</p>
            )}
            {yearsOfExperience !== null && yearsOfExperience !== undefined && (
              <p className="mentor-detail-experience">
                {yearsOfExperience} years experience
              </p>
            )}
          </div>
        </div>
      </div>

      {bio && (
        <p className="mentor-bio">{bio}</p>
      )}

      <MentorTags mentor={mentor} />

      <div className="match-card-details">
        <ScoreBreakdown scoreBreakdown={scoreBreakdown} />
        <MatchExplanations explanations={explanations} />
      </div>

      <div className="match-card-actions">
        <Link
          className="button button-secondary"
          to={`/mentee/mentorship/request/${mentorId}`}
        >
          View Profile
        </Link>
        {actionContent}
      </div>
    </article>
  );
}

export default MentorMatchCard;