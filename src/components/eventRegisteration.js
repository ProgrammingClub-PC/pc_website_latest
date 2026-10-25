import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import "./Register.css";
import {
  FaUsers, FaUser, FaIdBadge, FaEnvelope, FaListAlt, FaPhoneAlt,
  FaGraduationCap, FaHome, FaCode, FaPencilAlt,
  FaSuitcase, FaStar, FaPaperPlane, FaLock, FaCheckCircle,
  FaArrowLeft, FaSpinner, FaMailBulk, FaShieldAlt, FaTrophy,
  FaUserPlus, FaUserCheck, FaTimes
} from "react-icons/fa";
import { SiLeetcode, SiCodeforces, SiCodechef, SiHackerrank } from "react-icons/si";

const branchCodes = {
  ME: "40", ECE: "31", EE: "21", "CSE(Hindi)": "169", "CSE (Hindi)": "169",
  AIML: "164", "CSE(DS)": "154", "CSE (DS)": "154", "CSE(AIML)": "153",
  "CSE (AIML)": "153", IT: "13", CS: "12", CSIT: "11", "CS IT": "11",
  CSE: "10", CE: "0",
};

const GOOGLE_SITE_KEY = process.env.REACT_APP_GOOGLE_SITE_KEY;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const BACKEND_URL = `${API_BASE_URL}/api/register/`;

const MEMBER_FIELDS = [
  'fullName', 'studentNumber', 'emailId', 'phoneNumber',
  'branch', 'gender', 'hosteller', 'hackerrankProfile'
];

const BRANCHES = [
  { value: 'CSE', label: 'CSE', years: ['1', '2'] },
  { value: 'CSE(AIML)', label: 'CSE (AI & ML)', years: ['1', '2'] },
  { value: 'CSE(DS)', label: 'CSE (Data Science)', years: ['1', '2'] },
  { value: 'CSE(HINDI)', label: 'CSE (Hindi)', years: ['1', '2'] },
  { value: 'IT', label: 'IT', years: ['1', '2'] },
  { value: 'ECE', label: 'ECE', years: ['1', '2'] },
  { value: 'EN', label: 'EN', years: ['1', '2'] },
  { value: 'ME', label: 'Mechanical (ME)', years: ['1', '2'] },
  { value: 'CE', label: 'Civil (CE)', years: ['1', '2'] },
  { value: 'CS', label: 'CS', years: ['2'] },
  { value: 'CS(IT)', label: 'CS (IT)', years: ['2'] },
  { value: 'AIML', label: 'AIML', years: ['2'] },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const HOSTELLER_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const OTP_CODE_LENGTH = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const EMPTY_MEMBER = {
  fullName: '', studentNumber: '', emailId: '', phoneNumber: '',
  branch: '', gender: '', hosteller: '', hackerrankProfile: ''
};

const EMPTY_FORM = {
  teamName: '', year: '', members: [EMPTY_MEMBER, EMPTY_MEMBER]
};

const FIELD_ORDER = [
  'teamName', 'year',
  '0.fullName', '0.studentNumber', '0.emailId', '0.phoneNumber',
  '0.branch', '0.gender', '0.hosteller', '0.hackerrankProfile',
  '1.fullName', '1.studentNumber', '1.emailId', '1.phoneNumber',
  '1.branch', '1.gender', '1.hosteller', '1.hackerrankProfile'
];

// Validation functions
const TEAM_NAME_PATTERN = /^[\p{L}\p{N} _.-]+$/u;
const NAME_PATTERN = /^[\p{L} ]+$/u;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const EMAIL_LOCAL_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;
const PROFILE_PATTERN = /^[A-Za-z0-9_.-]+$/;

const BRANCH_BY_VALUE = new Map(BRANCHES.map(b => [b.value, b]));
const GENDER_SET = new Set(['Male', 'Female', 'Other']);
const HOSTELLER_SET = new Set(['true', 'false']);

const TEAM_NAME_MIN = 3;
const TEAM_NAME_MAX = 30;
const MEMBER_NAME_MIN = 3;
const MEMBER_NAME_MAX = 40;

const EXPECTED_STUDENT_PREFIX = { '1': '26', '2': '25' };
const YEAR_LABEL = { '1': '1st year', '2': '2nd year' };

function getFieldError(errors, path) {
  if (path === 'teamName' || path === 'year') return errors[path];
  const [index, field] = path.split('.');
  return errors.members[Number(index)]?.[field];
}

function firstFieldError(errors) {
  for (const path of FIELD_ORDER) {
    const message = getFieldError(errors, path);
    if (message) return message;
  }
  return undefined;
}

function branchesForYear(year) {
  if (!year) return [];
  return BRANCHES.filter(b => b.years.includes(year));
}

function validateTeamName(teamName) {
  if (!teamName) return 'Please enter a team name.';
  if (teamName.length < TEAM_NAME_MIN) return `Team name must be at least ${TEAM_NAME_MIN} characters.`;
  if (teamName.length > TEAM_NAME_MAX) return `Team name cannot exceed ${TEAM_NAME_MAX} characters.`;
  if (!TEAM_NAME_PATTERN.test(teamName)) return 'Use only letters, numbers, spaces, underscores, periods and hyphens.';
  return undefined;
}

function isFakePhone(phone) {
  return /^(\d)\1{9}$/.test(phone) ||
    /(\d)\1{6,}/.test(phone) ||
    phone === '9876543210' ||
    phone === '9898989898';
}

function validateProfile(value, label, required) {
  if (!value) return required ? `Please enter this member's ${label} username.` : undefined;
  if (!PROFILE_PATTERN.test(value)) return `${label} usernames may only use letters, numbers, underscores, periods and hyphens.`;
  return undefined;
}

function validateMember(member, year) {
  const errors = {};
  const fullName = member.fullName.trim();
  if (!fullName) errors.fullName = "Please enter this member's full name.";
  else if (fullName.length < MEMBER_NAME_MIN) errors.fullName = `This member's name must be at least ${MEMBER_NAME_MIN} characters.`;
  else if (fullName.length > MEMBER_NAME_MAX) errors.fullName = `This member's name cannot exceed ${MEMBER_NAME_MAX} characters.`;
  else if (!NAME_PATTERN.test(fullName)) errors.fullName = 'Use only letters and spaces in the name.';

  const studentNumber = member.studentNumber.trim();
  const studentNumberValid = /^(25|26)\d{5,6}$/.test(studentNumber);
  if (!studentNumber) errors.studentNumber = "Please enter this member's student number.";
  else if (!studentNumberValid) errors.studentNumber = 'Student number must be 7 or 8 digits and start with 25 or 26.';
  else if (year && !studentNumber.startsWith(EXPECTED_STUDENT_PREFIX[year])) {
    errors.studentNumber = `${YEAR_LABEL[year]} student numbers start with ${EXPECTED_STUDENT_PREFIX[year]}.`;
  }

  const email = member.emailId.trim().toLowerCase();
  if (!email) errors.emailId = "Please enter this member's AKGEC email address.";
  else if (!EMAIL_PATTERN.test(email)) errors.emailId = 'Enter a valid email address.';
  else if (!email.endsWith('@akgec.ac.in')) errors.emailId = 'Use an AKGEC email address (name@akgec.ac.in).';
  else if (email.length > 100) errors.emailId = 'Email address is too long.';
  else if (studentNumberValid) {
    const [localPart] = email.split('@');
    if (!localPart.endsWith(studentNumber)) {
      errors.emailId = `The email must end with the student number: name${studentNumber}@akgec.ac.in.`;
    } else {
      const namePart = localPart.slice(0, -studentNumber.length);
      if (!namePart || !EMAIL_LOCAL_PREFIX_PATTERN.test(namePart)) {
        errors.emailId = `Use the format name${studentNumber}@akgec.ac.in.`;
      }
    }
  }

  const phoneNumber = member.phoneNumber.trim();
  if (!phoneNumber) errors.phoneNumber = "Please enter this member's phone number.";
  else if (!/^[6-9]\d{9}$/.test(phoneNumber)) errors.phoneNumber = 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
  else if (isFakePhone(phoneNumber)) errors.phoneNumber = 'Please enter a real mobile number.';

  const branch = BRANCH_BY_VALUE.get(member.branch);
  if (!member.branch) errors.branch = "Please select this member's branch.";
  else if (!branch) errors.branch = 'Select a branch from the list.';
  else if (year && !branch.years.includes(year)) errors.branch = `${branch.label} is not available for ${YEAR_LABEL[year]} students.`;

  if (!GENDER_SET.has(member.gender)) errors.gender = "Please select this member's gender.";
  if (!HOSTELLER_SET.has(member.hosteller)) errors.hosteller = 'Please tell us whether this member is a hosteller.';

  errors.hackerrankProfile = validateProfile(member.hackerrankProfile.trim(), 'HackerRank', true);
  return errors;
}

function flagDuplicate(errors, field, firstValue, secondValue, message) {
  if (!firstValue || !secondValue) return;
  if (firstValue.toLowerCase() !== secondValue.toLowerCase()) return;
  if (errors.members[0][field] || errors.members[1][field]) return;
  errors.members[0][field] = message;
  errors.members[1][field] = message;
}

function validateForm(values) {
  const errors = { members: [{}, {}] };
  const teamNameError = validateTeamName(values.teamName.trim());
  if (teamNameError) errors.teamName = teamNameError;
  if (values.year !== '1' && values.year !== '2') errors.year = 'Select whether this is a 1st year or 2nd year team.';
  errors.members[0] = validateMember(values.members[0], values.year);
  errors.members[1] = validateMember(values.members[1], values.year);
  flagDuplicate(errors, 'emailId', values.members[0].emailId.trim(), values.members[1].emailId.trim(), 'Each member must use a different email address.');
  flagDuplicate(errors, 'phoneNumber', values.members[0].phoneNumber.trim(), values.members[1].phoneNumber.trim(), 'Each member must use a different phone number.');
  flagDuplicate(errors, 'studentNumber', values.members[0].studentNumber.trim(), values.members[1].studentNumber.trim(), 'Each member must use a different student number.');
  return errors;
}

function allTouched() {
  return FIELD_ORDER.reduce((acc, path) => { acc[path] = true; return acc; }, {});
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length > 2 ? 2 : 1;
  return `${local.slice(0, visible)}${'•'.repeat(3)}@${domain}`;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollToElement(element, focus = false) {
  if (!element) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  if (focus) element.focus({ preventScroll: true });
}

function fieldElementId(path) {
  if (path === 'teamName') return 'field-teamName';
  if (path === 'year') return 'field-year';
  const [index, field] = path.split('.');
  return `field-m${Number(index) + 1}-${field}`;
}

function toSubmittedMember(member) {
  return { fullName: member.fullName.trim(), emailId: member.emailId.trim().toLowerCase(), studentNumber: member.studentNumber };
}

// TextField Component
function TextField({ id, name, label, Icon, value, onChange, onBlur, error, hint, type = 'text', placeholder, autoComplete, inputMode, maxLength, wide, optional }) {
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${wide ? ' field-wide' : ''}${error ? ' field-invalid' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {optional ? <span aria-hidden="true" className="optional-badge">(optional)</span> : <span aria-hidden="true">*</span>}
      </label>
      <div className="input-wrap">
        <Icon className="input-icon" size={17} aria-hidden="true" />
        <input
          id={id} name={name} type={type} value={value}
          onChange={e => onChange(e.target.value)} onBlur={onBlur}
          className="text-input" placeholder={placeholder}
          autoComplete={autoComplete} inputMode={inputMode} maxLength={maxLength}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
        />
      </div>
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`} role="alert"><FaLock size={14} aria-hidden="true" /> <span>{error}</span></p>}
    </div>
  );
}

// SelectField Component
function SelectField({ id, name, label, Icon, value, options, placeholder, onChange, onBlur, error, hint, disabled, optional }) {
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {optional ? <span aria-hidden="true" className="optional-badge">(optional)</span> : <span aria-hidden="true">*</span>}
      </label>
      <div className="input-wrap">
        <Icon className="input-icon" size={17} aria-hidden="true" />
        <select
          id={id} name={name} value={value}
          onChange={e => onChange(e.target.value)} onBlur={onBlur}
          className="select-input" disabled={disabled}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-error`} role="alert"><FaLock size={14} aria-hidden="true" /> <span>{error}</span></p>}
    </div>
  );
}

// MemberFields Component
function MemberFields({ index, year, values, errors, onChange, onBlur }) {
  const idFor = field => `field-m${index + 1}-${field}`;
  const nameFor = field => `member${index + 1}-${field}`;
  const change = (field, value) => onChange(index, field, value);
  const blur = field => onBlur(index, field);
  const isLeader = index === 0;

  const branchOptions = BRANCHES.filter(b => !year || b.years.includes(year)).map(b => ({ value: b.value, label: b.label }));

  return (
    <div className="form-grid">
      <TextField id={idFor('fullName')} name={nameFor('fullName')} label="Full Name" Icon={FaUser} value={values.fullName} onChange={v => change('fullName', v)} onBlur={() => blur('fullName')} error={errors.fullName} placeholder="Enter full name" autoComplete={isLeader ? 'name' : 'off'} maxLength={40} />
      <TextField id={idFor('studentNumber')} name={nameFor('studentNumber')} label="Student Number" Icon={FaIdBadge} value={values.studentNumber} onChange={v => change('studentNumber', v)} onBlur={() => blur('studentNumber')} error={errors.studentNumber} hint={year ? `${year === '1' ? '1st' : '2nd'} year: starts with ${year === '1' ? '26' : '25'}` : 'Starts with 25 or 26'} placeholder="e.g. 2610009" inputMode="numeric" autoComplete="off" maxLength={8} />
      <TextField id={idFor('emailId')} name={nameFor('emailId')} label="AKGEC Email" Icon={FaEnvelope} value={values.emailId} onChange={v => change('emailId', v)} onBlur={() => blur('emailId')} error={errors.emailId} placeholder="name{student_number}@akgec.ac.in" type="email" inputMode="email" autoComplete={isLeader ? 'email' : 'off'} maxLength={100} />
      <TextField id={idFor('phoneNumber')} name={nameFor('phoneNumber')} label="Phone Number" Icon={FaPhoneAlt} value={values.phoneNumber} onChange={v => change('phoneNumber', v)} onBlur={() => blur('phoneNumber')} error={errors.phoneNumber} placeholder="10-digit mobile number" type="tel" inputMode="tel" autoComplete={isLeader ? 'tel' : 'off'} maxLength={10} />
      <SelectField id={idFor('branch')} name={nameFor('branch')} label="Branch" Icon={FaGraduationCap} value={values.branch} options={branchOptions} placeholder="Select branch" onChange={v => change('branch', v)} onBlur={() => blur('branch')} error={errors.branch} disabled={!year} />
      <SelectField id={idFor('gender')} name={nameFor('gender')} label="Gender" Icon={FaUser} value={values.gender} options={GENDER_OPTIONS} placeholder="Select gender" onChange={v => change('gender', v)} onBlur={() => blur('gender')} error={errors.gender} />
      <SelectField id={idFor('hosteller')} name={nameFor('hosteller')} label="Hosteller?" Icon={FaHome} value={values.hosteller} options={HOSTELLER_OPTIONS} placeholder="Select an option" onChange={v => change('hosteller', v)} onBlur={() => blur('hosteller')} error={errors.hosteller} />
      <TextField id={idFor('hackerrankProfile')} name={nameFor('hackerrankProfile')} label="HackerRank Username" Icon={SiHackerrank} value={values.hackerrankProfile} onChange={v => change('hackerrankProfile', v)} onBlur={() => blur('hackerrankProfile')} error={errors.hackerrankProfile} hint="Contest submissions are linked to this username." placeholder="HackerRank username" autoComplete="off" maxLength={50} wide />
    </div>
  );
}

// OtpVerification Component
function OtpVerification({ email, error, isSubmitting, onChangeEmail, onResend, onVerify }) {
  const [digits, setDigits] = useState(Array(OTP_CODE_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const inputsRef = useRef(Array(OTP_CODE_LENGTH).fill(null));
  const isComplete = digits.every(Boolean);

  const focusDigit = (index) => {
    const target = Math.min(Math.max(index, 0), OTP_CODE_LENGTH - 1);
    inputsRef.current[target]?.focus();
    inputsRef.current[target]?.select();
  };

  useEffect(() => { focusDigit(0); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const setDigit = (index, value) => setDigits(prev => { const next = [...prev]; next[index] = value; return next; });

  const handleDigitChange = (index, rawValue) => {
    const cleaned = rawValue.replace(/\D/g, '');
    if (!cleaned) { setDigit(index, ''); return; }
    setDigits(prev => {
      const next = [...prev];
      for (let offset = 0; offset < cleaned.length && index + offset < OTP_CODE_LENGTH; offset++) {
        next[index + offset] = cleaned[offset];
      }
      return next;
    });
    focusDigit(index + cleaned.length);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) setDigit(index, '');
      else if (index > 0) { setDigit(index - 1, ''); focusDigit(index - 1); }
      return;
    }
    if (event.key === 'Delete') { event.preventDefault(); setDigit(index, ''); return; }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); focusDigit(index - 1); return; }
    if (event.key === 'ArrowRight' && index < OTP_CODE_LENGTH - 1) { event.preventDefault(); focusDigit(index + 1); }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(() => {
      const next = Array(OTP_CODE_LENGTH).fill('');
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      return next;
    });
    focusDigit(pasted.length);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isComplete || isSubmitting) return;
    onVerify(digits.join(''));
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || isSubmitting) return;
    setIsResending(true); setResendNotice('');
    try {
      const sent = await onResend();
      if (!sent) return;
      setDigits(Array(OTP_CODE_LENGTH).fill(''));
      setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setResendNotice('A new code is on its way. Check your inbox.');
      focusDigit(0);
    } finally { setIsResending(false); }
  };

  return (
    <section className="form-card otp-card" aria-labelledby="otp-heading" style={{animation: 'fadeInUp 0.35s ease-out'}}>
      <div className="form-intro otp-intro">
        <span className="otp-badge" aria-hidden="true"><FaMailBulk size={22} /></span>
        <div>
          <h2 id="otp-heading">Verify the team leader's email</h2>
          <p>We sent a {OTP_CODE_LENGTH}-digit code to the team leader at <strong>{maskEmail(email)}</strong>. Enter it below to finish registering your team.</p>
        </div>
      </div>
      <form className="otp-form" onSubmit={handleSubmit} noValidate>
        <div className="otp-inputs" role="group" aria-label={`${OTP_CODE_LENGTH}-digit verification code`} onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input key={index} ref={el => inputsRef.current[index] = el} className="otp-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} value={digit} onChange={e => handleDigitChange(index, e.target.value)} onKeyDown={e => handleKeyDown(index, e)} onFocus={e => e.target.select()} aria-label={`Digit ${index + 1} of ${OTP_CODE_LENGTH}`} aria-invalid={error ? true : undefined} aria-describedby={error ? 'otp-error' : undefined} disabled={isSubmitting} />
          ))}
        </div>
        {error && <p className="field-error otp-error" id="otp-error" role="alert"><FaLock size={14} aria-hidden="true" /> <span>{error}</span></p>}
        <button type="submit" className="submit-button otp-submit" disabled={!isComplete || isSubmitting} aria-busy={isSubmitting} style={{width: '100%', marginTop: '24px'}}>
          {isSubmitting ? <> <FaSpinner className="spin" size={19} aria-hidden="true" /> Verifying and registering... </> : <> <FaShieldAlt size={18} aria-hidden="true" /> Verify & Register </>}
        </button>
        <div className="otp-actions">
          <button type="button" className="otp-link" onClick={handleResend} disabled={cooldown > 0 || isResending || isSubmitting}>
            {isResending ? 'Sending a new code...' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <span className="otp-actions-divider" aria-hidden="true" />
          <button type="button" className="otp-link" onClick={onChangeEmail} disabled={isSubmitting}>
            <FaArrowLeft size={14} aria-hidden="true" /> Change email
          </button>
        </div>
        {resendNotice && <p className="otp-notice" role="status">{resendNotice}</p>}
      </form>
    </section>
  );
}

// SuccessState Component
function SuccessState({ registration, onReset }) {
  const headingRef = useRef(null);
  const leaderEmail = registration.members[0].emailId;
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <section className="success-card" aria-labelledby="success-heading" style={{animation: 'fadeInUp 0.5s ease-out'}}>
      <div className="success-icon" aria-hidden="true"><FaCheckCircle size={38} /></div>
      <p className="success-eyebrow">Team registration received</p>
      <h1 id="success-heading" ref={headingRef} tabIndex={-1} className="success-title">Your team is in!</h1>
      <p className="success-lead"><strong>{registration.teamName}</strong> is registered for CodeCrush. Both members are on the list.</p>
      <div className="success-summary">
        <div className="summary-row"><span>Team</span><strong>{registration.teamName}</strong></div>
        {registration.members.map((member, index) => (
          <div className="summary-row" key={index}>
            <span>{index === 0 ? 'Member 1 · Leader' : 'Member 2'}</span>
            <div className="summary-member-copy">
              <strong>{member.fullName}</strong>
              <small>{member.studentNumber} · {member.emailId}</small>
            </div>
          </div>
        ))}
      </div>
      <p className="success-note"><FaMailBulk size={16} aria-hidden="true" /> QR tickets have been emailed to both members. Keep an eye on {leaderEmail} for confirmation and further instructions from Programming Club.</p>
      <button type="button" className="submit-button" onClick={onReset} style={{width: 'auto', minWidth: 0}}><FaUserPlus size={18} aria-hidden="true" /> Register another team</button>
      <p className="success-help">Need to correct a detail? Reach out to us on <a href="https://www.instagram.com/programmingclub.akgec/" target="_blank" rel="noreferrer">Instagram</a>.</p>
    </section>
  );
}

// Main RegistrationForm Component
function RegistrationForm({ onSuccess }) {
  const recaptchaRef = useRef(null);
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({ members: [{}, {}] });
  const [touched, setTouched] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState('form'); // 'form' | 'otp' | 'success'
  const [otpEmail, setOtpEmail] = useState('');
  const [otpError, setOtpError] = useState('');
  const [recaptchaError, setRecaptchaError] = useState('');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [statusChecked, setStatusChecked] = useState(false);
  const [submittedRegistration, setSubmittedRegistration] = useState(null);
  const alertRef = useRef(null);
  const submittingRef = useRef(false);

  // Check registration status on mount
  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_BASE_URL}/api/status/`)
      .then(res => { if (!cancelled) { setRegistrationsOpen(res.data.registration_open); setStatusChecked(true); } })
      .catch(err => { if (!cancelled) { setApiError(err.message || 'Could not check registration status. Please refresh the page.'); setStatusChecked(true); } });
    return () => { cancelled = true; };
  }, []);

  // Live-revalidate fields once the user has interacted with them.
  useEffect(() => {
    const allErrors = validateForm(values);
    const next = { members: [{}, {}] };
    if (touched.teamName && allErrors.teamName) next.teamName = allErrors.teamName;
    if (touched.year && allErrors.year) next.year = allErrors.year;
    for (const index of [0, 1]) {
      for (const field of MEMBER_FIELDS) {
        const path = `${index}.${field}`;
        if (!touched[path]) continue;
        const message = allErrors.members[index][field];
        if (message) next.members[index][field] = message;
      }
    }
    setErrors(next);
  }, [values, touched]);

  const focusField = (path) => scrollToElement(document.getElementById(fieldElementId(path)), true);
  const clearApiError = () => { if (apiError) setApiError(''); };

  const handleTeamNameChange = (rawValue) => {
    setValues(prev => ({ ...prev, teamName: rawValue.slice(0, 30) }));
    clearApiError();
  };
  const handleYearChange = (year) => {
    setValues(prev => ({
      ...prev, year,
      members: prev.members.map((member, idx) => ({
        ...member,
        branch: year && idx === 1 && member.branch && branchesForYear(year).find(b => b.value === member.branch) ? member.branch : ''
      }))
    }));
    clearApiError();
  };
  const handleMemberChange = (index, field, rawValue) => {
    let value = rawValue;
    if (field === 'phoneNumber') value = rawValue.replace(/\D/g, '').slice(0, 10);
    else if (field === 'studentNumber') value = rawValue.replace(/\D/g, '').slice(0, 8);
    else if (field === 'fullName') value = rawValue.slice(0, 40);
    else if (field === 'emailId') value = rawValue.slice(0, 100);
    else if (field === 'hackerrankProfile') value = rawValue.slice(0, 50);
    setValues(prev => { const members = [...prev.members]; members[index] = { ...members[index], [field]: value }; return { ...prev, members }; });
    clearApiError();
  };
  const handleTeamNameBlur = () => setTouched(prev => ({ ...prev, teamName: true }));
  const handleYearBlur = () => setTouched(prev => ({ ...prev, year: true }));
  const handleMemberBlur = (index, field) => setTouched(prev => ({ ...prev, [`${index}.${field}`]: true }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setApiError(''); setRecaptchaError('');
    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    setTouched(allTouched());
    const firstError = FIELD_ORDER.find(path => getFieldError(nextErrors, path));
    if (firstError) { setTimeout(() => focusField(firstError), 0); return; }

    if (!recaptchaRef.current) { setRecaptchaError('reCAPTCHA not ready, please try again.'); return; }
    submittingRef.current = true; setIsSubmitting(true);
    let captchaToken;
    try { captchaToken = recaptchaRef.current.getValue(); } catch { setIsSubmitting(false); submittingRef.current = false; setRecaptchaError('reCAPTCHA verification failed. Please try again.'); return; }
    if (!captchaToken) { setIsSubmitting(false); submittingRef.current = false; setRecaptchaError('Please complete the reCAPTCHA checkbox.'); return; }

    try {
      const payload = {
        team_name: values.teamName.trim(),
        recaptcha_token: captchaToken,
        leader: {
          full_name: values.members[0].fullName.trim(),
          email_id: values.members[0].emailId.trim().toLowerCase(),
          phone_number: values.members[0].phoneNumber,
          student_number: values.members[0].studentNumber,
          branch: values.members[0].branch,
          gender: values.members[0].gender,
          hosteller: values.members[0].hosteller === 'true',
          hackerrank_profile: values.members[0].hackerrankProfile.trim(),
        },
        member: {
          full_name: values.members[1].fullName.trim(),
          email_id: values.members[1].emailId.trim().toLowerCase(),
          phone_number: values.members[1].phoneNumber,
          student_number: values.members[1].studentNumber,
          branch: values.members[1].branch,
          gender: values.members[1].gender,
          hosteller: values.members[1].hosteller === 'true',
          hackerrank_profile: values.members[1].hackerrankProfile.trim(),
        }
      };
      const res = await axios.post(BACKEND_URL, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 25000 });
      // Reset reCAPTCHA for next attempt (tokens are single-use)
      recaptchaRef.current?.reset();
      setOtpEmail(res.data.email_id || values.members[0].emailId.trim().toLowerCase());
      setOtpError('');
      setStage('otp');
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } catch (error) {
      // Reset reCAPTCHA for next attempt (tokens are single-use)
      recaptchaRef.current?.reset();
      const rawErrors = error.response?.data?.errors;
      const backendMsg = error.response?.data?.message || error.response?.data?.detail || error.message;
      
      // Don't show generic "Invalid request data" when we have field errors (they're shown inline)
      const msg = rawErrors && backendMsg?.includes('Invalid request')
        ? 'Please fix the highlighted fields and try again.'
        : backendMsg || 'Something went wrong while submitting your registration. Please try again.';
      setApiError(msg);
      
      if (rawErrors) {
        // Normalize backend errors: { team_name: ["msg"], leader: { phone_number: ["msg"] }, member: { student_number: ["msg"] } }
        // into our internal format: { teamName: "msg", members: [{ phoneNumber: "msg" }, { studentNumber: "msg" }] }
        const normalizedErrors = { members: [{}, {}] };
        
        // Top-level fields
        if (rawErrors.team_name) normalizedErrors.teamName = rawErrors.team_name[0];
        
        // Leader errors
        if (rawErrors.leader) {
          Object.entries(rawErrors.leader).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              // Map backend field names to our internal names
              const fieldMap = {
                full_name: 'fullName',
                student_number: 'studentNumber',
                email_id: 'emailId',
                phone_number: 'phoneNumber',
                hackerrank_profile: 'hackerrankProfile'
              };
              const internalField = fieldMap[field] || field;
              normalizedErrors.members[0][internalField] = messages[0];
            }
          });
        }
        
        // Member errors
        if (rawErrors.member) {
          Object.entries(rawErrors.member).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              const fieldMap = {
                full_name: 'fullName',
                student_number: 'studentNumber',
                email_id: 'emailId',
                phone_number: 'phoneNumber',
                hackerrank_profile: 'hackerrankProfile'
              };
              const internalField = fieldMap[field] || field;
              normalizedErrors.members[1][internalField] = messages[0];
            }
          });
        }
        
        setErrors(prev => ({
          ...prev,
          ...normalizedErrors,
          members: [
            { ...prev.members[0], ...normalizedErrors.members[0] },
            { ...prev.members[1], ...normalizedErrors.members[1] }
          ]
        }));
        
        const firstApiField = FIELD_ORDER.find(path => getFieldError(normalizedErrors, path));
        if (firstApiField) setTimeout(() => focusField(firstApiField), 0);
      } else {
        setTimeout(() => scrollToElement(alertRef.current), 0);
      }
    } finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  const handleOtpVerify = async (code) => {
    if (submittingRef.current) return;
    setOtpError(''); submittingRef.current = true; setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/verify/`, { email_id: otpEmail, otp: code }, { timeout: 25000 });
      const registration = { teamName: res.data.team_name || values.teamName, members: [toSubmittedMember(values.members[0]), toSubmittedMember(values.members[1])] };
      setSubmittedRegistration(registration);
      setStage('success');
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } catch (error) {
      const rawErrors = error.response?.data?.errors;
      const otpErr = rawErrors?.otp?.[0] || error.response?.data?.message;
      if (otpErr) { setOtpError(otpErr); return; }
      
      if (rawErrors) {
        // Normalize backend errors (same structure as register)
        const normalizedErrors = { members: [{}, {}] };
        
        if (rawErrors.team_name) normalizedErrors.teamName = rawErrors.team_name[0];
        
        if (rawErrors.leader) {
          Object.entries(rawErrors.leader).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              const fieldMap = {
                full_name: 'fullName', student_number: 'studentNumber',
                email_id: 'emailId', phone_number: 'phoneNumber',
                hackerrank_profile: 'hackerrankProfile'
              };
              const internalField = fieldMap[field] || field;
              normalizedErrors.members[0][internalField] = messages[0];
            }
          });
        }
        
        if (rawErrors.member) {
          Object.entries(rawErrors.member).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              const fieldMap = {
                full_name: 'fullName', student_number: 'studentNumber',
                email_id: 'emailId', phone_number: 'phoneNumber',
                hackerrank_profile: 'hackerrankProfile'
              };
              const internalField = fieldMap[field] || field;
              normalizedErrors.members[1][internalField] = messages[0];
            }
          });
        }
        
        setStage('form'); setOtpError(''); setApiError(error.response?.data?.message || 'Registration rejected. Please correct the highlighted fields.');
        setErrors(prev => ({
          ...prev,
          ...normalizedErrors,
          members: [
            { ...prev.members[0], ...normalizedErrors.members[0] },
            { ...prev.members[1], ...normalizedErrors.members[1] }
          ]
        }));
        const firstApiField = FIELD_ORDER.find(path => getFieldError(normalizedErrors, path));
        if (firstApiField) setTimeout(() => focusField(firstApiField), 0);
      } else {
        setOtpError('Something went wrong while verifying your code. Please try again.');
      }
    } finally { submittingRef.current = false; setIsSubmitting(false); }
  };

  const handleReset = () => {
    setSubmittedRegistration(null);
    setStage('form');
    setValues(EMPTY_FORM);
    setErrors({ members: [{}, {}] });
    setTouched({});
    setOtpEmail('');
    setOtpError('');
    setApiError('');
    recaptchaRef.current?.reset();
  };

  const handleOtpResend = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/resend-otp/`, { email_id: otpEmail }, { timeout: 25000 });
      setOtpError(''); return true;
    } catch (error) {
      setOtpError(error.response?.data?.message || error.response?.data?.detail || 'We could not send a new code. Please try again.'); return false;
    }
  };

  const handleChangeEmail = () => { setStage('form'); setOtpError(''); setOtpEmail(''); setTimeout(() => focusField('0.emailId'), 0); recaptchaRef.current?.reset(); };

  if (!statusChecked) return (
    <div className="form-card loading-state" style={{animation: 'fadeIn 0.3s ease-out'}}>
      <FaSpinner className="spin" size={28} aria-hidden="true" />
      <p>Checking registration status…</p>
    </div>
  );

  if (!registrationsOpen) return (
    <div className="form-card closed-state" style={{animation: 'fadeIn 0.3s ease-out'}}>
      <FaLock size={48} aria-hidden="true" className="closed-icon" />
      <h2>Registrations are closed</h2>
      <p>CodeCrush registration is not currently open.</p>
    </div>
  );

  if (stage === 'success') {
    return <SuccessState registration={submittedRegistration} onReset={handleReset} />;
  }

  return (
    <>
      <section className="hero" style={{animation: 'fadeInUp 0.5s ease-out'}}>
        <div className="hero-eyebrow"><span className="status-dot" aria-hidden="true" /> Team Registrations Open</div>
        <h1 className="hero-title">Code<span className="accent">Crush</span> <span className="hero-title-sub">Registration</span></h1>
        <p className="hero-subtitle">Organised by <strong>Programming Club</strong>, AKGEC</p>
        <div className="hero-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="hero-pill">Teams of 2 · 1st & 2nd year students</span>
          <span className="divider-line divider-line-right" />
        </div>
      </section>

      {stage === 'otp' ? (
        <OtpVerification email={otpEmail} error={otpError} isSubmitting={isSubmitting} onChangeEmail={handleChangeEmail} onResend={handleOtpResend} onVerify={handleOtpVerify} />
      ) : (
        <form className="form-card" onSubmit={handleSubmit} noValidate style={{animation: 'fadeInUp 0.5s ease-out 0.08s both'}}>
          <div className="form-intro">
            <h2>Team Registration</h2>
            <p>Register a team of two AKGEC students. <strong>Member 1 is the team leader</strong> and receives all confirmation emails and the OTP. Fields marked <span aria-hidden="true">*</span> are required.</p>
          </div>

          {apiError && (
            <div className="alert" role="alert" ref={alertRef}>
              <FaLock size={20} aria-hidden="true" />
              <div className="alert-body"><strong>We could not submit your registration</strong><p>{apiError}</p></div>
              <button type="button" className="alert-dismiss" aria-label="Dismiss error" onClick={() => setApiError('')}>
                <FaTimes size={18} aria-hidden="true" />
              </button>
            </div>
          )}

          <section className="form-section" aria-labelledby="section-team">
            <div className="section-header">
              <span className="section-icon" aria-hidden="true"><FaUsers size={16} /></span>
              <h2 id="section-team">Team Details</h2>
              <span className="section-line" aria-hidden="true" />
            </div>
            <div className="form-grid form-grid-single">
              <TextField id="field-teamName" name="teamName" label="Team Name" Icon={FaUsers} value={values.teamName} onChange={handleTeamNameChange} onBlur={handleTeamNameBlur} error={errors.teamName} hint="Choose a name your teammates will recognise." placeholder="e.g. Runtime Terrors" autoComplete="organization" maxLength={30} />
            </div>
            <div className="form-grid form-grid-single">
              <div className="field">
                <label className="field-label" htmlFor="field-year">Team Year <span aria-hidden="true">*</span></label>
                <div className="year-toggle" role="radiogroup" aria-label="Select team year">
                  <label className="year-toggle-option"><input type="radio" id="field-year" name="year" value="1" checked={values.year === '1'} onChange={e => handleYearChange(e.target.value)} onBlur={handleYearBlur} /> <span>1st Year</span></label>
                  <label className="year-toggle-option"><input type="radio" id="field-year" name="year" value="2" checked={values.year === '2'} onChange={e => handleYearChange(e.target.value)} onBlur={handleYearBlur} /> <span>2nd Year</span></label>
                </div>
                {errors.year && <p className="field-error" role="alert" id="field-year-error"><FaLock size={14} aria-hidden="true" /> <span>{errors.year}</span></p>}
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="section-leader">
            <div className="section-header">
              <span className="section-icon" aria-hidden="true"><FaTrophy size={16} /></span>
              <h2 id="section-leader">Team Leader</h2>
              <span className="section-tag">Member 1</span>
              <span className="section-line" aria-hidden="true" />
            </div>
            <MemberFields index={0} year={values.year} values={values.members[0]} errors={errors.members[0]} onChange={handleMemberChange} onBlur={handleMemberBlur} />
          </section>

          <section className="form-section" aria-labelledby="section-member-two">
            <div className="section-header">
              <span className="section-icon" aria-hidden="true"><FaUserCheck size={16} /></span>
              <h2 id="section-member-two">Team Member</h2>
              <span className="section-tag">Member 2</span>
              <span className="section-line" aria-hidden="true" />
            </div>
            <MemberFields index={1} year={values.year} values={values.members[1]} errors={errors.members[1]} onChange={handleMemberChange} onBlur={handleMemberBlur} />
          </section>

          <aside className="info-card team-info">
            <span className="info-card-icon" aria-hidden="true"><FaTrophy size={18} /></span>
            <div><h3>Before you submit</h3><p>Double-check both HackerRank usernames. Contest submissions are matched to them, and the OTP goes to the team leader&apos;s AKGEC address.</p></div>
          </aside>

          <div className="recaptcha-row" style={{marginTop: '34px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.06)'}}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={GOOGLE_SITE_KEY}
              size="normal"
              theme="dark"
              badge="inline"
            />
            {recaptchaError && (
              <p className="field-error" role="alert"><FaLock size={14} aria-hidden="true" /> <span>{recaptchaError}</span></p>
            )}
          </div>

          <div className="submit-row">
            <button type="submit" className="submit-button" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? <> <FaSpinner className="spin" size={19} aria-hidden="true" /> Sending OTP... </> : <> <FaPaperPlane size={18} aria-hidden="true" /> Send OTP </>}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

// Wrapper to provide reCAPTCHA
export default function EventRegisteration() {
  return (
    <RegistrationForm onSuccess={registration => {
      // Success is handled internally by RegistrationForm via SuccessState
      // This prop is kept for API compatibility
    }} />
  );
}