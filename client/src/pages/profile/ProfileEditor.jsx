import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import * as profileService from '../../services/profileService.js';

const days = [
  ['MONDAY', 'Monday'],
  ['TUESDAY', 'Tuesday'],
  ['WEDNESDAY', 'Wednesday'],
  ['THURSDAY', 'Thursday'],
  ['FRIDAY', 'Friday'],
  ['SATURDAY', 'Saturday'],
  ['SUNDAY', 'Sunday'],
];

const mentorshipStyles = [
  ['STRUCTURED', 'Structured'],
  ['FLEXIBLE', 'Flexible'],
  ['GOAL_ORIENTED', 'Goal oriented'],
  ['CONVERSATIONAL', 'Conversational'],
  ['MIXED', 'A mix of styles'],
];

const careerStages = [
  ['STUDENT', 'Student'],
  ['EARLY_CAREER', 'Early career'],
  ['MID_CAREER', 'Mid-career'],
  ['SENIOR', 'Senior'],
  ['CAREER_CHANGE', 'Career change'],
];

const menteeConfig = {
  heading: 'Build your mentorship profile',
  intro: "Tell us about your background, goals and interests. We'll use this information to help you find better mentor matches.",
  getter: profileService.getMenteeProfile,
  updater: profileService.updateMenteeProfile,
  completionGetter: profileService.getMenteeProfileCompletion,
  sectionDescriptions: {
    'About You': 'Give mentors a brief introduction and a little context about you.',
    'Education & Career': 'Share your education and the career areas you are exploring.',
    'Your Goals': 'Tell us what you want to learn, achieve and build on.',
    'Mentor Preferences': 'Choose the experience and approach that would best support you.',
  },
  fields: [
    { name: 'profilePhoto', label: 'Profile photo URL', type: 'url', section: 'About You' },
    { name: 'bio', label: 'Introduction', type: 'textarea', section: 'About You', rows: 4 },
    { name: 'phone', label: 'Phone', section: 'About You' },
    { name: 'location', label: 'Location', section: 'About You' },
    { name: 'institution', label: 'Institution', section: 'Education & Career' },
    { name: 'qualification', label: 'Qualification', section: 'Education & Career' },
    { name: 'fieldOfStudy', label: 'Field of study', section: 'Education & Career' },
    { name: 'careerStage', label: 'Career stage', type: 'select', options: careerStages, section: 'Education & Career' },
    { name: 'industries', label: 'Industries', type: 'array', section: 'Education & Career' },
    { name: 'experienceAreas', label: 'Experience areas', type: 'array', section: 'Education & Career' },
    { name: 'careerGoals', label: 'Career goals', type: 'array', section: 'Your Goals' },
    { name: 'mentorshipGoals', label: 'Mentorship goals', type: 'array', section: 'Your Goals' },
    { name: 'interests', label: 'Interests', type: 'array', section: 'Your Goals' },
    { name: 'skills', label: 'Skills', type: 'array', section: 'Your Goals' },
    { name: 'preferredMentorExpertise', label: 'Preferred mentor expertise', type: 'array', section: 'Mentor Preferences' },
    { name: 'preferredIndustry', label: 'Preferred industries', type: 'array', section: 'Mentor Preferences' },
    { name: 'preferredMentorshipStyle', label: 'Preferred mentorship style', type: 'array-select', options: mentorshipStyles, section: 'Mentor Preferences' },
  ],
};

const mentorConfig = {
  heading: 'Mentor Profile',
  intro: 'Share your professional background and the areas where you can support others.',
  getter: profileService.getMentorProfile,
  updater: profileService.updateMentorProfile,
  completionGetter: profileService.getMentorProfileCompletion,
  fields: [
    { name: 'profilePhoto', label: 'Profile photo URL', type: 'url', section: 'About you' },
    { name: 'bio', label: 'About me', type: 'textarea', section: 'About you', rows: 4 },
    { name: 'phone', label: 'Phone', section: 'About you' },
    { name: 'location', label: 'Location', section: 'About you' },
    { name: 'jobTitle', label: 'Job title', section: 'Professional background' },
    { name: 'company', label: 'Company', section: 'Professional background' },
    { name: 'industry', label: 'Industry', section: 'Professional background' },
    { name: 'yearsOfExperience', label: 'Years of experience', type: 'number', section: 'Professional background' },
    { name: 'professionalBackground', label: 'Professional background', type: 'textarea', section: 'Professional background', rows: 4 },
    { name: 'expertise', label: 'Expertise', type: 'array', section: 'Expertise and mentorship' },
    { name: 'skills', label: 'Skills', type: 'array', section: 'Expertise and mentorship' },
    { name: 'specialisations', label: 'Specialisations', type: 'array', section: 'Expertise and mentorship' },
    { name: 'experienceAreas', label: 'Experience areas', type: 'array', section: 'Expertise and mentorship' },
    { name: 'mentorshipAreas', label: 'Mentorship areas', type: 'array', section: 'Expertise and mentorship' },
    { name: 'mentorshipStyle', label: 'Mentorship style', type: 'select', options: mentorshipStyles, section: 'Expertise and mentorship' },
    { name: 'languages', label: 'Languages', type: 'array', section: 'Expertise and mentorship' },
  ],
};

const emptyAvailability = {
  days: [],
  timeZone: '',
  timeSlots: [],
};

function createEmptyProfile(config) {
  return config.fields.reduce(
    (profile, field) => {
      profile[field.name] =
        field.type === 'array' || field.type === 'array-select'
          ? []
          : field.type === 'number'
            ? null
            : '';
      return profile;
    },
    { availability: { ...emptyAvailability } },
  );
}

function profilePayload(profile, fields) {
  const editableProfile = fields.reduce((payload, field) => {
    payload[field.name] = profile[field.name];
    return payload;
  }, {});

  return {
    ...editableProfile,
    availability: {
      days: profile.availability.days,
      timeZone: profile.availability.timeZone,
      timeSlots:
        profile.availability.start && profile.availability.end
          ? [{ start: profile.availability.start, end: profile.availability.end }]
          : [],
    },
  };
}

function getFieldError(errors, field) {
  if (!errors) return '';
  return errors[field] || errors[`availability.${field}`] || '';
}

const completionFieldLabels = {
  bio: 'About me',
  location: 'Location',
  institution: 'Institution',
  qualification: 'Qualification',
  fieldOfStudy: 'Field of study',
  careerStage: 'Career stage',
  careerGoals: 'Career goals',
  mentorshipGoals: 'Mentorship goals',
  interests: 'Interests',
  preferredMentorExpertise: 'Preferred mentor expertise',
  preferredIndustry: 'Preferred industries',
  preferredMentorshipStyle: 'Preferred mentorship style',
  skills: 'Skills',
  industries: 'Industries',
  experienceAreas: 'Experience areas',
  availability: 'Availability',
};

function getCompletionFieldLabel(field) {
  if (completionFieldLabels[field]) return completionFieldLabels[field];
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}

function ArrayField({ field, id, value, onChange, error }) {
  const [draft, setDraft] = useState('');

  function addValue(event) {
    event.preventDefault();
    const item = draft.trim();
    if (!item || value.includes(item)) return;
    onChange([...value, item]);
    setDraft('');
  }

  return (
    <div className="profile-array-field">
      <div className="profile-chip-list" aria-label={`${field.label} selected values`}>
        {value.map((item, index) => (
          <span className="profile-chip" key={`${item}-${index}`}>
            {item}
            <button
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="profile-array-entry">
        <input
          id={id}
          aria-label={`Add ${field.label}`}
          value={draft}
          maxLength={field.maxLength || 100}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addValue(event);
          }}
        />
        <button className="profile-secondary-button" onClick={addValue} type="button">
          Add
        </button>
      </div>
      {error && <span className="profile-field-error">{error}</span>}
    </div>
  );
}

function ProfileField({ field, value, onChange, error }) {
  const id = `profile-${field.name}`;
  const describedBy = error ? `${id}-error` : undefined;

  if (field.type === 'array') {
    return (
      <ArrayField
        field={field}
        id={id}
        value={value}
        onChange={onChange}
        error={error}
      />
    );
  }

  if (field.type === 'array-select') {
    return (
      <div className="profile-checkbox-list">
        {field.options.map(([optionValue, label]) => (
          <label className="profile-checkbox" key={optionValue}>
            <input
              checked={value.includes(optionValue)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, optionValue]
                    : value.filter((item) => item !== optionValue),
                )
              }
              type="checkbox"
            />
            <span>{label}</span>
          </label>
        ))}
        {error && <span className="profile-field-error">{error}</span>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <>
        <select
          id={id}
          value={value}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an option</option>
          {field.options.map(([optionValue, label]) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
        {error && (
          <span className="profile-field-error" id={describedBy}>
            {error}
          </span>
        )}
      </>
    );
  }

  const commonProps = {
    id,
    value: field.type === 'number' && value === null ? '' : value,
    'aria-describedby': describedBy,
    onChange: (event) => {
      const nextValue =
        field.type === 'number'
          ? event.target.value === ''
            ? null
            : Number(event.target.value)
          : event.target.value;
      onChange(nextValue);
    },
  };

  return (
    <>
      {field.type === 'textarea' ? (
        <textarea {...commonProps} rows={field.rows || 3} maxLength={field.maxLength || 3000} />
      ) : (
        <input
          {...commonProps}
          type={field.type || 'text'}
          maxLength={field.maxLength || (field.type === 'number' ? undefined : 200)}
          min={field.type === 'number' ? 0 : undefined}
          max={field.type === 'number' ? 80 : undefined}
          step={field.type === 'number' ? 0.5 : undefined}
        />
      )}
      {error && (
        <span className="profile-field-error" id={describedBy}>
          {error}
        </span>
      )}
    </>
  );
}

export default function ProfileEditor({ role }) {
  const config = role === 'MENTEE' ? menteeConfig : mentorConfig;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => createEmptyProfile(config));
  const [completion, setCompletion] = useState(null);
  const [mentorStatus, setMentorStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      config.getter().catch((error) => {
        if (error.response?.status === 404) return null;
        throw error;
      }),
      config.completionGetter(),
    ])
      .then(([savedProfile, profileCompletion]) => {
        if (!active) return;
        const blankProfile = createEmptyProfile(config);
        const loadedProfile = savedProfile || {};
        setProfile({
          ...blankProfile,
          ...loadedProfile,
          availability: {
            ...emptyAvailability,
            ...loadedProfile.availability,
            start: loadedProfile.availability?.timeSlots?.[0]?.start || '',
            end: loadedProfile.availability?.timeSlots?.[0]?.end || '',
          },
        });
        setMentorStatus(loadedProfile.status || '');
        setCompletion(profileCompletion);
      })
      .catch((error) => {
        if (active) {
          setPageError(
            error.response?.data?.message ||
              'We could not load your profile. Please try again.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [config]);

  function updateField(name, value) {
    setProfile((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setSuccess('');
  }

  function updateAvailability(name, value) {
    setProfile((current) => ({
      ...current,
      availability: { ...current.availability, [name]: value },
    }));
    setFieldErrors((current) => ({ ...current, [`availability.${name}`]: '' }));
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const wasComplete = Boolean(completion?.isComplete);
    setSaving(true);
    setPageError('');
    setFieldErrors({});
    setSuccess('');

    try {
      const savedProfile = await config.updater(
        profilePayload(profile, config.fields),
      );
      const profileCompletion = await config.completionGetter();
      setProfile((current) => ({
        ...current,
        ...savedProfile,
        availability: {
          ...emptyAvailability,
          ...savedProfile.availability,
          start: savedProfile.availability?.timeSlots?.[0]?.start || '',
          end: savedProfile.availability?.timeSlots?.[0]?.end || '',
        },
      }));
      setMentorStatus(savedProfile.status || mentorStatus);
      setCompletion(profileCompletion);
      setSuccess('Your profile has been saved.');
      if (role === 'MENTEE' && !wasComplete && profileCompletion?.isComplete) {
        navigate('/mentee/match', { replace: true });
      }
    } catch (error) {
      setFieldErrors(error.response?.data?.errors || {});
      setPageError(
        error.response?.data?.message ||
          'We could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className={`profile-page${role === 'MENTEE' ? ' profile-page-mentee' : ''}`} role="status">
        <p className="profile-loading">Loading your profile…</p>
      </section>
    );
  }

  const sections = [...new Set(config.fields.map((field) => field.section))];

  return (
    <section className={`profile-page${role === 'MENTEE' ? ' profile-page-mentee' : ''}`}>
      <header className="profile-page-header">
        <div>
          <span className="eyebrow">{role === 'MENTEE' ? 'Your mentorship journey' : 'The Mentorship Academy'}</span>
          <h1>{config.heading}</h1>
          <p>{config.intro}</p>
          {user && (
            <span className="profile-account-name">
              {user.firstName} {user.lastName}
            </span>
          )}
        </div>
        <div className="profile-completion" aria-live="polite">
          <div className="profile-completion-heading">
            <span>Profile completion</span>
            <strong>{completion?.percentage ?? 0}%</strong>
          </div>
          <div
            className="profile-progress-track"
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion?.percentage ?? 0}
          >
            <span style={{ width: `${completion?.percentage ?? 0}%` }} />
          </div>
          {role === 'MENTEE' ? (
            <>
              <p>
                {completion?.isComplete
                  ? 'Your profile is ready to help us recommend mentors who fit your goals.'
                  : 'Complete your profile to help us understand your goals and recommend mentors who are a better fit.'}
              </p>
              {completion?.missingFields?.length > 0 && (
                <ul className="profile-missing-list">
                  {[...new Set(completion.missingFields.map(getCompletionFieldLabel))].map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <small>
              {completion?.completedFields ?? 0} of {completion?.totalFields ?? 0}{' '}
              recommended fields
            </small>
          )}
        </div>
      </header>

      {mentorStatus && (
        <div className="profile-status">
          Mentor profile status: <strong>{mentorStatus}</strong>
        </div>
      )}
      {pageError && (
        <p className="profile-message profile-error" role="alert">
          {pageError}
        </p>
      )}
      {success && (
        <p className="profile-message profile-success" role="status">
          {success}
        </p>
      )}

      <form className="profile-form" onSubmit={handleSubmit}>
        {sections.map((section) => (
          <fieldset className="profile-section" key={section}>
            <legend>{section}</legend>
            {config.sectionDescriptions?.[section] && (
              <p className="profile-subsection-description">{config.sectionDescriptions[section]}</p>
            )}
            <div className="profile-field-grid">
              {config.fields
                .filter((field) => field.section === section)
                .map((field) => (
                  <div
                    className={`profile-field${field.type === 'textarea' || field.type === 'array' || field.type === 'array-select' ? ' profile-field-wide' : ''}`}
                    key={field.name}
                  >
                    {field.type === 'array-select' ? (
                      <span className="profile-field-label">{field.label}</span>
                    ) : (
                      <label htmlFor={`profile-${field.name}`}>{field.label}</label>
                    )}
                    <ProfileField
                      field={field}
                      value={profile[field.name]}
                      onChange={(value) => updateField(field.name, value)}
                      error={getFieldError(fieldErrors, field.name)}
                    />
                  </div>
                ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="profile-section">
          <legend>Availability</legend>
          <div className="profile-availability">
            <span className="profile-sub-label">Available days</span>
            <div className="profile-day-list">
              {days.map(([day, label]) => (
                <label className="profile-checkbox" key={day}>
                  <input
                    checked={profile.availability.days.includes(day)}
                    onChange={(event) =>
                      updateAvailability(
                        'days',
                        event.target.checked
                          ? [...profile.availability.days, day]
                          : profile.availability.days.filter((item) => item !== day),
                      )
                    }
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="profile-field-grid availability-field-grid">
              <div className="profile-field">
                <label htmlFor="availability-timezone">Time zone</label>
                <input
                  id="availability-timezone"
                  value={profile.availability.timeZone}
                  maxLength={80}
                  onChange={(event) =>
                    updateAvailability('timeZone', event.target.value)
                  }
                  placeholder="e.g. Africa/Johannesburg"
                />
              </div>
              <div className="profile-field">
                <span className="profile-sub-label">Preferred time window</span>
                <div className="profile-time-range">
                  <label>
                    <span className="visually-hidden">Start time</span>
                    <input
                      aria-label="Availability start time"
                      type="time"
                      value={profile.availability.start}
                      onChange={(event) =>
                        updateAvailability('start', event.target.value)
                      }
                    />
                  </label>
                  <span>to</span>
                  <label>
                    <span className="visually-hidden">End time</span>
                    <input
                      aria-label="Availability end time"
                      type="time"
                      value={profile.availability.end}
                      onChange={(event) =>
                        updateAvailability('end', event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
            {(getFieldError(fieldErrors, 'days') ||
              getFieldError(fieldErrors, 'timeZone') ||
              getFieldError(fieldErrors, 'timeSlots')) && (
              <span className="profile-field-error">
                {getFieldError(fieldErrors, 'days') ||
                  getFieldError(fieldErrors, 'timeZone') ||
                  getFieldError(fieldErrors, 'timeSlots')}
              </span>
            )}
          </div>
        </fieldset>

        <div className="profile-form-actions">
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? 'Saving profile…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
