export function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2);
}

function ensureArray(val) {
  return Array.isArray(val) ? val : [];
}

function ensureString(val) {
  return typeof val === 'string' ? val : '';
}

function normalizeBullets(bullets) {
  const arr = ensureArray(bullets);
  if (arr.length === 0) return ['', ''];
  return arr.map(ensureString);
}

export function normalizeResumeData(data) {
  if (!data || typeof data !== 'object') data = {};

  const personal = data.personal || {};

  const workExperience = ensureArray(data.workExperience).map((we = {}) => ({
    id: ensureString(we.id) || newId(),
    title: ensureString(we.title),
    company: ensureString(we.company),
    location: ensureString(we.location),
    currentlyWork: Boolean(we.currentlyWork),
    fromMonth: ensureString(we.fromMonth),
    fromYear: ensureString(we.fromYear),
    toMonth: ensureString(we.toMonth),
    toYear: ensureString(we.toYear),
    bullets: normalizeBullets(we.bullets)
  }));

  const projects = ensureArray(data.projects).map((p = {}) => ({
    id: ensureString(p.id) || newId(),
    name: ensureString(p.name),
    techStack: ensureString(p.techStack),
    bullets: normalizeBullets(p.bullets)
  }));

  const education = ensureArray(data.education).map((e = {}) => ({
    id: ensureString(e.id) || newId(),
    school: ensureString(e.school),
    degree: ensureString(e.degree),
    field: ensureString(e.field),
    gpa: ensureString(e.gpa),
    fromYear: ensureString(e.fromYear),
    toYear: ensureString(e.toYear)
  }));
  if (education.length === 0) education.push({ id: newId(), school: '', degree: '', field: '', gpa: '', fromYear: '', toYear: '' });

  const rawSkills = data.skills;
  let skills;
  if (typeof rawSkills === 'string') {
    skills = rawSkills;
  } else if (rawSkills && typeof rawSkills === 'object') {
    skills = ['languages', 'frameworks', 'ai', 'platforms', 'tools']
      .map(k => (rawSkills[k] || '').trim())
      .filter(Boolean)
      .join(', ');
  } else {
    skills = '';
  }

  const certifications = ensureArray(data.certifications).map((c = {}) => ({
    id: ensureString(c.id) || newId(),
    name: ensureString(c.name),
    issuer: ensureString(c.issuer),
    year: ensureString(c.year)
  }));

  const languages = ensureArray(data.languages).map((l = {}) => ({
    id: ensureString(l.id) || newId(),
    language: ensureString(l.language) || 'English',
    fluent: l.fluent !== false,
    reading: ensureString(l.reading) || 'Advanced',
    speaking: ensureString(l.speaking) || 'Advanced',
    writing: ensureString(l.writing) || 'Advanced'
  }));
  if (languages.length === 0) languages.push({ id: newId(), language: 'English', fluent: true, reading: 'Advanced', speaking: 'Advanced', writing: 'Advanced' });

  const websites = ensureArray(data.websites).map(ensureString);

  return {
    personal: {
      name: ensureString(personal.name),
      email: ensureString(personal.email),
      phone: ensureString(personal.phone),
      linkedin: ensureString(personal.linkedin),
      github: ensureString(personal.github)
    },
    workExperience,
    projects,
    education,
    skills,
    certifications,
    languages,
    websites
  };
}

export function calculateCompleteness(resumeData) {
  const data = normalizeResumeData(resumeData);
  let score = 0;
  if (data.personal.name.trim() && data.personal.email.trim()) score += 20;
  if (data.workExperience.some(we => we.title.trim() && we.company.trim() && we.bullets.some(b => b.trim()))) score += 25;
  if (data.education.some(e => e.school.trim())) score += 15;
  if (data.skills.trim()) score += 15;
  if (data.projects.some(p => p.name.trim() || p.techStack.trim() || p.bullets.some(b => b.trim()))) score += 15;
  if (data.personal.linkedin.trim()) score += 10;
  return score;
}
