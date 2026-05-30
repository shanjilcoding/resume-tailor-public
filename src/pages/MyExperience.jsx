import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Code2,
  Download,
  Globe,
  GraduationCap,
  Languages,
  Lightbulb,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import CompletenessBar from '../components/CompletenessBar.jsx';
import Input from '../components/Input.jsx';
import SuggestInput from '../components/SuggestInput.jsx';
import Textarea from '../components/Textarea.jsx';
import { calculateCompleteness, newId } from '../lib/validation.js';
import { exportResumeJSON, getResumeData, importResumeJSON, saveResumeData } from '../lib/storage.js';
import { DEGREE_OPTIONS, FIELD_OF_STUDY_OPTIONS } from '../lib/workdayOptions.js';

const PROFICIENCIES = ['Advanced', 'Intermediate', 'Basic'];

const SECTION_DEFS = [
  { key: 'personal-info',   label: 'Personal Info',   Icon: User },
  { key: 'work-experience', label: 'Work Experience', Icon: Briefcase },
  { key: 'projects',        label: 'Projects',        Icon: Code2 },
  { key: 'education',       label: 'Education',       Icon: GraduationCap },
  { key: 'skills',          label: 'Skills',          Icon: Lightbulb },
  { key: 'certifications',  label: 'Certifications',  Icon: Award },
  { key: 'languages',       label: 'Languages',       Icon: Languages },
  { key: 'websites',        label: 'Websites',        Icon: Globe },
];

const PERSONAL_FIELDS = [
  { key: 'name',     label: 'Name',     placeholder: 'Alex Morgan' },
  { key: 'email',    label: 'Email',    placeholder: 'alex@example.com' },
  { key: 'phone',    label: 'Phone',    placeholder: '555-010-1234' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/alex-morgan/' },
  { key: 'github',   label: 'GitHub',   placeholder: 'https://github.com/alexmorgan' },
];

const EDUCATION_FIELDS = [
  { key: 'school',   label: 'School',                       placeholder: 'University Name' },
  { key: 'gpa',      label: 'GPA',                          placeholder: '3.5' },
  { key: 'fromYear', label: 'From year',                    placeholder: '2020' },
  { key: 'toYear',   label: 'To year (actual or expected)', placeholder: '2024' },
];

const CERT_FIELDS = [
  { key: 'name',   label: 'Name',   placeholder: 'AWS Certified Cloud Practitioner' },
  { key: 'issuer', label: 'Issuer', placeholder: 'Amazon Web Services' },
  { key: 'year',   label: 'Year',   placeholder: '2024' },
];

function setPath(obj, path, value) {
  const copy = structuredClone(obj);
  let cur = copy;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
  return copy;
}

function FieldGrid({ children }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function SectionCard({ id, Icon, title, description, children }) {
  return (
    <Card id={id} className="scroll-mt-6 space-y-5 p-0 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/70 px-5 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Icon size={15} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 px-5 pb-5">{children}</div>
    </Card>
  );
}

function EntryCard({ children, onDelete, title, subtitle }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title    && <p className="truncate text-sm font-semibold text-slate-900">{title}</p>}
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
        <Button size="sm" variant="ghost" onClick={onDelete} className="shrink-0 text-red-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={13} />
        </Button>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function missingSuggestions(data, completeness) {
  const items = [];
  if (!data.personal.linkedin.trim()) items.push('Add LinkedIn for recruiter context.');
  if (!data.personal.github.trim())   items.push('Add GitHub or portfolio link.');
  if (!data.workExperience.some(we => we.bullets.some(b => /\d|%|\$|users|reduced|increased|improved/i.test(b))))
    items.push('Add quantified achievements to bullets.');
  if (!data.skills.trim())
    items.push('Fill skills so ATS keywords have a source.');
  if (completeness < 50)
    items.push('Reach 50% profile strength before generating serious applications.');
  return items.slice(0, 4);
}

export default function MyExperience({ onToast }) {
  const [data, setData] = useState(getResumeData);
  const completeness    = useMemo(() => calculateCompleteness(data), [data]);
  const suggestions     = useMemo(() => missingSuggestions(data, completeness), [data, completeness]);

  useEffect(() => {
    saveResumeData(data);
  }, [data]);

  function update(path, value)  { setData(d => setPath(d, path, value)); }
  function addItem(key, item)   { setData(d => ({ ...d, [key]: [...d[key], { id: newId(), ...item }] })); }
  function removeItem(key, id)  { setData(d => ({ ...d, [key]: d[key].filter(x => x.id !== id) })); }
  function addBullet(key, idx) {
    setData(d => { const c = structuredClone(d); c[key][idx].bullets.push(''); return c; });
  }
  function removeBullet(key, idx, bIdx) {
    setData(d => {
      const c = structuredClone(d);
      c[key][idx].bullets.splice(bIdx, 1);
      if (!c[key][idx].bullets.length) c[key][idx].bullets.push('');
      return c;
    });
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importResumeJSON(file);
      setData(imported);
      onToast?.('Resume JSON imported.');
    } catch (err) { onToast?.(err.message); }
    e.target.value = '';
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-500">My Experience</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">My Experience</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">Add your work, projects, education, skills, and links once. Tailor reuses this as your resume source of truth.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportResumeJSON}>
            <Download size={14} /> Export JSON
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50">
            <Upload size={14} />
            Import JSON
            <input type="file" accept="application/json" onChange={handleImport} className="sr-only" />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Profile strength" value={`${completeness}%`} />
        <Stat label="Work entries"     value={data.workExperience.length} />
        <Stat label="Projects"         value={data.projects.length} />
        <Stat label="Certifications"   value={data.certifications.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sticky sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-4">
            <CompletenessBar value={completeness} />
            {suggestions.length > 0 && (
              <div className="border-t border-slate-200 pt-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-700">Improve next</p>
                </div>
                <ul className="space-y-1.5">
                  {suggestions.map(s => (
                    <li key={s} className="text-xs leading-snug text-slate-500">· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            <nav className="space-y-0.5">
              {SECTION_DEFS.map(({ key, label, Icon }) => (
                <a
                  key={key}
                  href={`#${key}`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <Icon size={13} className="shrink-0 text-slate-400" />
                  {label}
                </a>
              ))}
            </nav>
          </Card>
        </aside>

        {/* Sections */}
        <main className="space-y-5">
          {/* Personal Info */}
          <SectionCard id="personal-info" Icon={User} title="Personal Info" description="Used for resume headers, cover letters, and export metadata.">
            <FieldGrid>
              {PERSONAL_FIELDS.map(({ key, label, placeholder }) => (
                <Input
                  key={key}
                  label={label}
                  value={data.personal[key]}
                  onChange={e => update(['personal', key], e.target.value)}
                  placeholder={placeholder}
                />
              ))}
            </FieldGrid>
          </SectionCard>

          {/* Work Experience */}
          <SectionCard id="work-experience" Icon={Briefcase} title="Work Experience" description="Use concrete bullets with action, tool, and result where possible.">
            {data.workExperience.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No work entries yet. Add internships, jobs, freelance work, or campus roles.
              </div>
            )}
            {data.workExperience.map((we, i) => (
              <EntryCard
                key={we.id}
                title={we.title || 'Untitled role'}
                subtitle={we.company || 'Company not set'}
                onDelete={() => removeItem('workExperience', we.id)}
              >
                <FieldGrid>
                  <Input label="Job title"  value={we.title}    onChange={e => update(['workExperience', i, 'title'],    e.target.value)} placeholder="Software Engineer" />
                  <Input label="Company"    value={we.company}  onChange={e => update(['workExperience', i, 'company'],  e.target.value)} placeholder="Acme Corporation" />
                  <Input label="Location"   value={we.location} onChange={e => update(['workExperience', i, 'location'], e.target.value)} placeholder="City, State" />
                  <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      aria-label="I currently work here"
                      checked={we.currentlyWork}
                      onChange={e => update(['workExperience', i, 'currentlyWork'], e.target.checked)}
                      className="rounded"
                    />
                    I currently work here
                  </label>
                  <Input label="From month" value={we.fromMonth} onChange={e => update(['workExperience', i, 'fromMonth'], e.target.value)} placeholder="01" />
                  <Input label="From year"  value={we.fromYear}  onChange={e => update(['workExperience', i, 'fromYear'],  e.target.value)} placeholder="2023" />
                  {!we.currentlyWork && (
                    <>
                      <Input label="To month" value={we.toMonth} onChange={e => update(['workExperience', i, 'toMonth'], e.target.value)} placeholder="12" />
                      <Input label="To year"  value={we.toYear}  onChange={e => update(['workExperience', i, 'toYear'],  e.target.value)} placeholder="2024" />
                    </>
                  )}
                </FieldGrid>
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-slate-700">Bullet points</p>
                  {we.bullets.map((b, bIdx) => (
                    <div key={`${we.id}-b${bIdx}`} className="flex gap-2">
                      <Textarea
                        className="min-h-16 flex-1"
                        value={b}
                        onChange={e => update(['workExperience', i, 'bullets', bIdx], e.target.value)}
                        placeholder="Built and shipped X that improved Y by Z%"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeBullet('workExperience', i, bIdx)} className="mt-0.5 text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="secondary" onClick={() => addBullet('workExperience', i)}>
                    <Plus size={13} /> Add bullet
                  </Button>
                </div>
              </EntryCard>
            ))}
            <Button
              variant="secondary"
              onClick={() => addItem('workExperience', { title: '', company: '', location: '', currentlyWork: false, fromMonth: '', fromYear: '', toMonth: '', toYear: '', bullets: ['', ''] })}
            >
              <Plus size={14} /> Add work experience
            </Button>
          </SectionCard>

          {/* Projects */}
          <SectionCard id="projects" Icon={Code2} title="Projects" description="Projects help tailor entry-level and career-switcher resumes.">
            {data.projects.map((p, i) => (
              <EntryCard
                key={p.id}
                title={p.name || 'Untitled project'}
                subtitle={p.techStack || 'Tech stack not set'}
                onDelete={() => removeItem('projects', p.id)}
              >
                <FieldGrid>
                  <Input label="Project name" value={p.name}      onChange={e => update(['projects', i, 'name'],      e.target.value)} placeholder="Real-Time Chat Platform" />
                  <Input label="Tech stack"   value={p.techStack} onChange={e => update(['projects', i, 'techStack'], e.target.value)} placeholder="React, Node.js, PostgreSQL, Docker" />
                </FieldGrid>
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-slate-700">Bullet points</p>
                  {p.bullets.map((b, bIdx) => (
                    <div key={`${p.id}-b${bIdx}`} className="flex gap-2">
                      <Textarea
                        className="min-h-16 flex-1"
                        value={b}
                        onChange={e => update(['projects', i, 'bullets', bIdx], e.target.value)}
                        placeholder="Designed and deployed X using Y, handling Z requests/day"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeBullet('projects', i, bIdx)} className="mt-0.5 text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="secondary" onClick={() => addBullet('projects', i)}>
                    <Plus size={13} /> Add bullet
                  </Button>
                </div>
              </EntryCard>
            ))}
            <Button variant="secondary" onClick={() => addItem('projects', { name: '', techStack: '', bullets: ['', ''] })}>
              <Plus size={14} /> Add project
            </Button>
          </SectionCard>

          {/* Education */}
          <SectionCard id="education" Icon={GraduationCap} title="Education">
            {data.education.map((ed, i) => (
              <EntryCard
                key={ed.id}
                title={ed.school || 'New education entry'}
                subtitle={[ed.degree, ed.field].filter(Boolean).join(' · ')}
                onDelete={() => removeItem('education', ed.id)}
              >
                <FieldGrid>
                  <Input label="School" value={ed.school} onChange={e => update(['education', i, 'school'], e.target.value)} placeholder="University Name" />
                  <SuggestInput
                    label="Degree"
                    value={ed.degree}
                    onChange={val => update(['education', i, 'degree'], val)}
                    options={DEGREE_OPTIONS}
                    placeholder="e.g. Bachelors, Bachelor of Science, Bachelor of Engineering..."
                  />
                  <SuggestInput
                    label="Field of study"
                    value={ed.field}
                    onChange={val => update(['education', i, 'field'], val)}
                    options={FIELD_OF_STUDY_OPTIONS}
                    placeholder="e.g. Computer Science, or type your own..."
                  />
                  <Input label="GPA" value={ed.gpa} onChange={e => update(['education', i, 'gpa'], e.target.value)} placeholder="3.5" />
                  <Input label="From year" value={ed.fromYear} onChange={e => update(['education', i, 'fromYear'], e.target.value)} placeholder="2020" />
                  <Input label="To year (actual or expected)" value={ed.toYear} onChange={e => update(['education', i, 'toYear'], e.target.value)} placeholder="2024" />
                </FieldGrid>
              </EntryCard>
            ))}
            <Button variant="secondary" onClick={() => addItem('education', { school: '', degree: '', field: '', gpa: '', fromYear: '', toYear: '' })}>
              <Plus size={14} /> Add education
            </Button>
          </SectionCard>

          {/* Skills */}
          <SectionCard id="skills" Icon={Lightbulb} title="Skills">
            <div>
              <Textarea
                label="Skills"
                value={data.skills}
                onChange={e => update(['skills'], e.target.value)}
                placeholder="Python, JavaScript, React, Node.js, PostgreSQL, Docker, AWS, Git"
              />
              <p className="mt-1.5 text-xs text-slate-500">List all your skills, comma-separated — languages, frameworks, tools, platforms, everything.</p>
            </div>
          </SectionCard>

          {/* Certifications */}
          <SectionCard id="certifications" Icon={Award} title="Certifications">
            {data.certifications.map((c, i) => (
              <EntryCard
                key={c.id}
                title={c.name || 'Certification not set'}
                subtitle={c.issuer || 'Issuer not set'}
                onDelete={() => removeItem('certifications', c.id)}
              >
                <FieldGrid>
                  {CERT_FIELDS.map(({ key, label, placeholder }) => (
                    <Input key={key} label={label} value={c[key]} onChange={e => update(['certifications', i, key], e.target.value)} placeholder={placeholder} />
                  ))}
                </FieldGrid>
              </EntryCard>
            ))}
            <Button variant="secondary" onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })}>
              <Plus size={14} /> Add certification
            </Button>
          </SectionCard>

          {/* Languages */}
          <SectionCard id="languages" Icon={Languages} title="Languages">
            {data.languages.map((l, i) => (
              <EntryCard
                key={l.id}
                title={l.language || 'Language not set'}
                subtitle={l.fluent ? 'Fluent' : 'Non-native'}
                onDelete={() => removeItem('languages', l.id)}
              >
                <FieldGrid>
                  <Input label="Language" value={l.language} onChange={e => update(['languages', i, 'language'], e.target.value)} placeholder="English" />
                  <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      aria-label="Fluent in this language"
                      checked={l.fluent}
                      onChange={e => update(['languages', i, 'fluent'], e.target.checked)}
                      className="rounded"
                    />
                    Fluent in this language
                  </label>
                  {['reading', 'speaking', 'writing'].map(k => (
                    <label key={k} className="block">
                      <span className="mb-1.5 block text-sm font-medium capitalize text-slate-700">{k} proficiency</span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        value={l[k]}
                        onChange={e => update(['languages', i, k], e.target.value)}
                      >
                        {PROFICIENCIES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </label>
                  ))}
                </FieldGrid>
              </EntryCard>
            ))}
            <Button variant="secondary" onClick={() => addItem('languages', { language: '', fluent: true, reading: 'Advanced', speaking: 'Advanced', writing: 'Advanced' })}>
              <Plus size={14} /> Add language
            </Button>
          </SectionCard>

          {/* Websites */}
          <SectionCard id="websites" Icon={Globe} title="Websites">
            {data.websites.map((site, i) => (
              <div key={`website-${i}`} className="flex gap-2">
                <Input
                  label={i === 0 ? 'Website URL' : undefined}
                  value={site}
                  onChange={e => update(['websites', i], e.target.value)}
                  placeholder="https://your-portfolio.com"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Remove website"
                  className={`text-slate-400 hover:text-red-500 ${i === 0 ? 'mt-6' : ''}`}
                  onClick={() => setData(d => ({ ...d, websites: d.websites.filter((_, idx) => idx !== i) }))}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setData(d => ({ ...d, websites: [...d.websites, ''] }))}>
              <Plus size={14} /> Add website
            </Button>
          </SectionCard>
        </main>
      </div>
    </div>
  );
}
