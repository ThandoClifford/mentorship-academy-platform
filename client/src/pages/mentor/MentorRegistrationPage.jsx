import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import * as mentorApplicationService from '../../services/mentorApplicationService.js';
import './MentorRegistrationPage.css';

const MENTORSHIP_STYLES = [
  'STRUCTURED',
  'FLEXIBLE',
  'GOAL_ORIENTED',
  'CONVERSATIONAL',
  'MIXED',
];

const AVAILABILITY_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const LIST_LIMITS = {
  expertise: { maxItems: 60, maxLength: 100 },
  skills: { maxItems: 60, maxLength: 100 },
  specialisations: { maxItems: 40, maxLength: 100 },
  experienceAreas: { maxItems: 40, maxLength: 100 },
  mentorshipAreas: { maxItems: 40, maxLength: 100 },
  languages: { maxItems: 30, maxLength: 80 },
};

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  jobTitle: '',
  company: '',
  industry: '',
  yearsOfExperience: '',
  professionalBackground: '',
  expertise: '',
  skills: '',
  specialisations: '',
  experienceAreas: '',
  mentorshipAreas: '',
  mentorshipStyle: '',
  languages: '',
  motivation: '',
};

function splitList(value) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function apiErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function Field({ id, label, hint, children }) {
  return (
    <label className="mentor-registration-field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function MentorRegistrationPage() {
  const { user, isAuthenticated, loading: authLoading, register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [availability, setAvailability] = useState({
    days: [],
    timeZone: '',
    timeSlots: [{ start: '', end: '' }],
  });
  const [applicationState, setApplicationState] = useState({
    loading: false,
    checked: false,
    error: '',
    application: null,
  });
  const [error, setError] = useState('');
  const [signInRequired, setSignInRequired] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadApplication = useCallback(async () => {
    setApplicationState((current) => ({ ...current, loading: true, checked: false, error: '' }));
    try {
      const result = await mentorApplicationService.getMyMentorApplication();
      setApplicationState({
        loading: false,
        checked: true,
        error: '',
        application: result.application || null,
      });
    } catch (requestError) {
      setApplicationState({
        loading: false,
        checked: true,
        error: apiErrorMessage(requestError, 'Could not load your mentor application status.'),
        application: null,
      });
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (user?.role === 'MENTOR') {
      navigate('/mentor', { replace: true });
      return;
    }

    if (isAuthenticated && user?.role === 'MENTEE') {
      loadApplication();
      return;
    }

    setApplicationState({
      loading: false,
      checked: true,
      error: '',
      application: null,
    });
  }, [authLoading, isAuthenticated, loadApplication, navigate, user?.role]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  }

  function toggleDay(day) {
    setAvailability((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((item) => item !== day)
        : [...current.days, day],
    }));
  }

  function updateTimeSlot(index, field, value) {
    setAvailability((current) => ({
      ...current,
      timeSlots: current.timeSlots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  }

  function validateAndBuildApplication() {
    const years = form.yearsOfExperience.trim();
    if (years && (!Number.isFinite(Number(years)) || Number(years) < 0 || Number(years) > 80)) {
      return { error: 'Years of experience must be between 0 and 80.' };
    }

    const lists = {};
    for (const [field, limits] of Object.entries(LIST_LIMITS)) {
      const values = splitList(form[field]);
      if (values.length > limits.maxItems || values.some((value) => value.length > limits.maxLength)) {
        return {
          error: `${field} allows up to ${limits.maxItems} entries, each no longer than ${limits.maxLength} characters.`,
        };
      }
      lists[field] = values;
    }

    if (availability.timeZone.length > 80) {
      return { error: 'Time zone must be 80 characters or fewer.' };
    }

    const timeSlots = availability.timeSlots.filter((slot) => slot.start || slot.end);
    if (timeSlots.some((slot) => !slot.start || !slot.end)) {
      return { error: 'Provide both a start and end time for each availability slot.' };
    }
    if (timeSlots.some((slot) => slot.end <= slot.start)) {
      return { error: 'Each availability end time must be after its start time.' };
    }
    if (timeSlots.length > 8) {
      return { error: 'You can provide up to eight availability time slots.' };
    }

    return {
      payload: {
        jobTitle: form.jobTitle.trim(),
        company: form.company.trim(),
        industry: form.industry.trim(),
        yearsOfExperience: years ? Number(years) : null,
        professionalBackground: form.professionalBackground.trim(),
        ...lists,
        mentorshipStyle: form.mentorshipStyle,
        motivation: form.motivation.trim(),
        availability: {
          days: availability.days,
          timeZone: availability.timeZone.trim(),
          timeSlots,
        },
      },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSignInRequired(false);

    if (!isAuthenticated) {
      if (form.password !== form.confirmPassword) {
        setError('Your passwords do not match.');
        return;
      }
      if (
        form.password.length < 8 ||
        new TextEncoder().encode(form.password).length > 72
      ) {
        setError('Password must be at least 8 characters and no more than 72 bytes.');
        return;
      }
    }

    const { payload, error: validationError } = validateAndBuildApplication();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isAuthenticated && user?.role !== 'MENTEE') {
      setError('Sign in with a mentee account to submit a mentor application.');
      return;
    }

    setSubmitting(true);
    if (!isAuthenticated) {
      if (accountCreated) {
        setSignInRequired(true);
        setError('Your account has already been created. Sign in to continue your mentor application.');
        setSubmitting(false);
        return;
      }

      try {
        await register({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        setAccountCreated(true);
      } catch (requestError) {
        setSignInRequired(requestError.response?.status === 409);
        setError(apiErrorMessage(requestError, 'We could not create your account. Please try again.'));
        setSubmitting(false);
        return;
      }

      try {
        await login({ email: form.email.trim(), password: form.password });
        setAccountCreated(false);
      } catch {
        setSignInRequired(true);
        setError('Your account was created, but we could not sign you in automatically. Sign in to continue your application.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const result = await mentorApplicationService.submitMentorApplication(payload);
      setApplicationState({
        loading: false,
        checked: true,
        error: '',
        application: result.application,
      });
      setError('');
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'Could not submit your mentor application. Please try again.'));
      if (requestError.response?.status === 401) {
        setSignInRequired(true);
      } else if (requestError.response?.status === 409) {
        await loadApplication();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || (isAuthenticated && user?.role === 'MENTOR')) {
    return <section className="mentor-registration-page" role="status">Checking your account…</section>;
  }

  if (isAuthenticated && user?.role !== 'MENTEE') {
    return (
      <section className="mentor-registration-page">
        <div className="mentor-registration-shell">
          <div className="mentor-registration-card">
            <p className="mentor-registration-eyebrow">Mentor registration</p>
            <h1>Use a mentee account to apply</h1>
            <p>Your current account cannot submit a mentor application.</p>
            <Link className="button button-secondary" to="/">Back to the Academy</Link>
          </div>
        </div>
      </section>
    );
  }

  const application = applicationState.application;
  const applicationStatus = application?.status;
  const hasActiveApplication = ['PENDING', 'APPROVED', 'SUSPENDED'].includes(applicationStatus);

  return (
    <section className="mentor-registration-page">
      <div className="mentor-registration-shell">
        <header className="mentor-registration-header">
          <Link className="mentor-registration-brand" to="/" aria-label="Mentorship Academy home">
            <span className="mentor-registration-mark">MA</span>
            <span>MENTORSHIP ACADEMY</span>
          </Link>
          {!isAuthenticated && <Link className="mentor-registration-login" to="/login" state={{ journey: 'mentor' }}>Sign in</Link>}
        </header>

        <section className="mentor-registration-card">
          <p className="mentor-registration-eyebrow">Join our mentor community</p>
          <h1>Become a Mentor</h1>
          <p className="mentor-registration-intro">
            Share your experience and help the next generation grow.
          </p>

          {applicationState.loading && (
            <p className="mentor-registration-notice" role="status">Checking your application status…</p>
          )}
          {applicationState.error && (
            <div className="mentor-registration-error" role="alert">
              <span>{applicationState.error}</span>
              <button type="button" onClick={loadApplication}>Try again</button>
            </div>
          )}
          {error && <p className="mentor-registration-error" role="alert">{error}</p>}

          {application && (
            <div className={`mentor-registration-status mentor-registration-status--${application.status.toLowerCase()}`} role="status">
              <p className="mentor-registration-eyebrow">Application status</p>
              <h2>{application.status === 'PENDING' ? 'Mentor application submitted' : `Application ${application.status.toLowerCase()}`}</h2>
              {application.status === 'PENDING' ? (
                <p>Your application has been sent to the Academy administrators for review. You will be notified once a decision has been made.</p>
              ) : application.status === 'APPROVED' ? (
                <p>Your application is approved. If your account has not been upgraded to the mentor workspace, please contact the Academy administrators.</p>
              ) : application.status === 'REJECTED' ? (
                <p>Your previous application was not approved. You may submit a new application below.</p>
              ) : (
                <p>Your mentor application is suspended. Please contact the Academy administrators for assistance.</p>
              )}
              {application.adminNotes && <p><strong>Administrator notes:</strong> {application.adminNotes}</p>}
            </div>
          )}

          {applicationState.checked && !applicationState.error && !hasActiveApplication && (
            <form className="mentor-registration-form" onSubmit={handleSubmit}>
              {isAuthenticated ? (
                <div className="mentor-registration-account" aria-label="Signed-in account">
                  Applying as <strong>{user.firstName} {user.lastName}</strong> · {user.email}
                </div>
              ) : (
                <section className="mentor-registration-section">
                  <h2>Account details</h2>
                  <div className="mentor-registration-grid">
                    <Field id="mentor-first-name" label="First name">
                      <input id="mentor-first-name" name="firstName" autoComplete="given-name" maxLength={80} required value={form.firstName} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-last-name" label="Last name">
                      <input id="mentor-last-name" name="lastName" autoComplete="family-name" maxLength={80} required value={form.lastName} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-email" label="Email address">
                      <input id="mentor-email" name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-password" label="Password" hint="At least 8 characters; maximum 72 UTF-8 bytes.">
                      <input id="mentor-password" name="password" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-confirm-password" label="Confirm password">
                      <input id="mentor-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required value={form.confirmPassword} onChange={updateForm} />
                    </Field>
                  </div>
                  <p className="mentor-registration-existing">
                    Already have an account? <Link to="/login" state={{ journey: 'mentor' }}>Sign in to continue your mentor application</Link>.
                  </p>
                  {accountCreated && (
                    <p className="mentor-registration-notice" role="status">
                      Your account has been created. Sign in to continue your application.
                    </p>
                  )}
                  {signInRequired && (
                    <p className="mentor-registration-existing">
                      <Link to="/login" state={{ journey: 'mentor' }}>Sign in with your existing account</Link>
                    </p>
                  )}
                </section>
              )}

              <section className="mentor-registration-section">
                  <h2>Professional details</h2>
                  <div className="mentor-registration-grid">
                    <Field id="mentor-job-title" label="Job title">
                      <input id="mentor-job-title" name="jobTitle" autoComplete="organization-title" maxLength={200} required value={form.jobTitle} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-company" label="Company">
                      <input id="mentor-company" name="company" autoComplete="organization" maxLength={200} required value={form.company} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-industry" label="Industry">
                      <input id="mentor-industry" name="industry" maxLength={150} required value={form.industry} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-experience-years" label="Years of experience">
                      <input id="mentor-experience-years" name="yearsOfExperience" type="number" min="0" max="80" step="1" value={form.yearsOfExperience} onChange={updateForm} />
                    </Field>
                    <Field id="mentor-professional-background" label="Professional background">
                      <textarea id="mentor-professional-background" name="professionalBackground" maxLength={3000} rows={4} required value={form.professionalBackground} onChange={updateForm} />
                    </Field>
                    {[
                      ['expertise', 'Areas of expertise'],
                      ['skills', 'Skills'],
                      ['specialisations', 'Specialisations'],
                      ['experienceAreas', 'Experience areas'],
                      ['mentorshipAreas', 'Mentorship areas'],
                      ['languages', 'Languages'],
                    ].map(([field, label]) => (
                      <Field id={`mentor-${field}`} label={label} hint="Separate entries with commas or new lines." key={field}>
                        <textarea id={`mentor-${field}`} name={field} rows={2} value={form[field]} onChange={updateForm} />
                      </Field>
                    ))}
                    <Field id="mentor-mentorship-style" label="Mentorship style">
                      <select id="mentor-mentorship-style" name="mentorshipStyle" value={form.mentorshipStyle} onChange={updateForm}>
                        <option value="">Select a style</option>
                        {MENTORSHIP_STYLES.map((style) => <option value={style} key={style}>{style.replaceAll('_', ' ')}</option>)}
                      </select>
                    </Field>
                    <Field id="mentor-motivation" label="Why would you like to mentor?">
                      <textarea id="mentor-motivation" name="motivation" maxLength={3000} rows={4} required value={form.motivation} onChange={updateForm} />
                    </Field>
                  </div>
              </section>

              <section className="mentor-registration-section">
                  <h2>Availability</h2>
                  <fieldset className="mentor-registration-days">
                    <legend>Days you are available</legend>
                    <div>
                      {AVAILABILITY_DAYS.map((day) => (
                        <label key={day}>
                          <input type="checkbox" checked={availability.days.includes(day)} onChange={() => toggleDay(day)} />
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field id="mentor-time-zone" label="Time zone" hint="Optional, for example Africa/Johannesburg.">
                    <input id="mentor-time-zone" maxLength={80} value={availability.timeZone} onChange={(event) => setAvailability((current) => ({ ...current, timeZone: event.target.value }))} />
                  </Field>
                  <div className="mentor-registration-slots">
                    <div className="mentor-registration-slots-heading">
                      <span>Available time slots (optional)</span>
                      {availability.timeSlots.length < 8 && (
                        <button type="button" onClick={() => setAvailability((current) => ({ ...current, timeSlots: [...current.timeSlots, { start: '', end: '' }] }))}>Add a time slot</button>
                      )}
                    </div>
                    {availability.timeSlots.map((slot, index) => (
                      <div className="mentor-registration-slot" key={index}>
                        <Field id={`mentor-slot-start-${index}`} label={`Slot ${index + 1} starts`}>
                          <input id={`mentor-slot-start-${index}`} type="time" value={slot.start} onChange={(event) => updateTimeSlot(index, 'start', event.target.value)} />
                        </Field>
                        <Field id={`mentor-slot-end-${index}`} label={`Slot ${index + 1} ends`}>
                          <input id={`mentor-slot-end-${index}`} type="time" value={slot.end} onChange={(event) => updateTimeSlot(index, 'end', event.target.value)} />
                        </Field>
                        {availability.timeSlots.length > 1 && (
                          <button className="mentor-registration-remove-slot" type="button" onClick={() => setAvailability((current) => ({ ...current, timeSlots: current.timeSlots.filter((_, slotIndex) => slotIndex !== index) }))}>Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
              </section>
              <button className="button button-primary mentor-registration-submit" type="submit" disabled={submitting || applicationState.loading}>
                {submitting ? 'Submitting application…' : isAuthenticated ? 'Submit mentor application' : 'Create account & submit application'}
              </button>
            </form>
          )}
        </section>
      </div>
    </section>
  );
}
