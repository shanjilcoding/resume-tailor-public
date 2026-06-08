import React, { useMemo, useReducer, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import OutputTabs from '../components/OutputTabs.jsx';
import Textarea from '../components/Textarea.jsx';
import { calculateCompleteness } from '../lib/validation.js';
import { generateCoverLetter, generateTailoredResume } from '../lib/api.js';
import { detectJobInfo } from '../lib/detect.js';
import { generateWorkdayScript } from '../lib/workday.js';
import {
  getActiveApiKey, getCoverLetterTone, getJobTargetDraft, getResumeData, getRewriteMode,
  isOnboardingDone, saveJobTargetDraft, saveToHistory, setOnboardingDone,
} from '../lib/storage.js';

const OUTPUT_OPTIONS = [
  { key: 'resume',  label: 'Resume' },
  { key: 'cover',   label: 'Cover letter' },
  { key: 'workday', label: 'Workday' },
];
const STEP_LABELS = { resume: 'Tailor resume with AI', cover: 'Write cover letter', workday: 'Prepare Workday script' };

const initialState = {
  jobDescription: '',
  jobTitle: '',
  company: '',
  outputs: null,
  activeStep: null,
  doneSteps: [],
  steps: [],
  error: '',
  onboardingDone: isOnboardingDone(),
};

function getInitialState() {
  return {
    ...initialState,
    ...getJobTargetDraft(),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, [action.key]: action.value };
    case 'GEN_START': return { ...state, error: '', doneSteps: [], activeStep: 0, steps: action.steps };
    case 'GEN_STEP': return { ...state, doneSteps: action.doneSteps, activeStep: action.next };
    case 'GEN_DONE': return {
      ...state,
      outputs: action.outputs,
      doneSteps: state.steps.map((_, i) => i),
      activeStep: null,
      onboardingDone: action.markDone ? true : state.onboardingDone,
    };
    case 'GEN_ERROR': return { ...state, activeStep: null, error: action.error };
    default: return state;
  }
}


function profileSignals(resumeData, completeness, apiKey) {
  const workReady    = resumeData.workExperience.some(we => we.title.trim() && we.company.trim() && we.bullets.some(b => b.trim()));
  const projectReady = resumeData.projects.some(p => p.name.trim() || p.techStack.trim() || p.bullets.some(b => b.trim()));
  const skillsReady  = Boolean(resumeData.skills.trim());
  const basicsReady  = resumeData.personal.name.trim() && resumeData.personal.email.trim();
  return [
    { label: 'API key saved',    done: Boolean(apiKey) },
    { label: 'Contact basics',   done: Boolean(basicsReady) },
    { label: 'Work bullets',     done: workReady },
    { label: 'Skills library',   done: skillsReady },
    { label: 'Projects / certs', done: projectReady || resumeData.certifications.some(c => c.name.trim()) },
    { label: 'Profile >= 50%',   done: completeness >= 50 },
  ];
}

function StepIcon({ status }) {
  if (status === 'done')   return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === 'active') return <Loader2 size={16} className="animate-spin text-indigo-600" />;
  return <Circle size={16} className="text-slate-300" />;
}

function JobTargetSection({ state, onFieldChange, onDetect, detecting, canDetect }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
        <Target size={16} className="text-slate-400" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Job target</h2>
          <p className="text-xs text-slate-500">Paste the full posting and confirm the role details.</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <Textarea
            label="Job description"
            className="min-h-52"
            value={state.jobDescription}
            onChange={e => onFieldChange('jobDescription', e.target.value)}
            placeholder="Paste responsibilities, qualifications, and company details here..."
          />
          {state.jobDescription.length > 0 && (
            <p className="mt-1 text-right text-xs text-slate-400">{state.jobDescription.length.toLocaleString()} chars</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Job title" value={state.jobTitle} onChange={e => onFieldChange('jobTitle', e.target.value)} placeholder="Software Engineer" />
          <Input label="Company"   value={state.company}  onChange={e => onFieldChange('company', e.target.value)} placeholder="Company name" />
        </div>
        <Button variant="secondary" size="sm" onClick={onDetect} disabled={!canDetect || detecting}>
          {detecting
            ? <><Loader2 size={13} className="animate-spin" /> Detecting…</>
            : <><Sparkles size={13} /> Auto-detect title &amp; company</>}
        </Button>
      </div>
    </Card>
  );
}

export default function Generator({ onToast, onGenerationSaved }) {
  const [resumeData]        = useState(getResumeData);
  const [state, dispatch]   = useReducer(reducer, undefined, getInitialState);
  const [regenCLLoading, setRegenCLLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [selection, setSelection] = useState({ resume: true, cover: true, workday: true });

  const completeness    = useMemo(() => calculateCompleteness(resumeData), [resumeData]);
  const apiKey          = getActiveApiKey();
  const signals         = useMemo(() => profileSignals(resumeData, completeness, apiKey), [resumeData, completeness, apiKey]);
  const allSignalsReady = signals.every(s => s.done);

  const selectedLabels = OUTPUT_OPTIONS.filter(o => selection[o.key]).map(o => o.label);
  const anySelected    = selectedLabels.length > 0;
  const needsAi        = selection.resume || selection.cover; // resume + cover use the API and job description; Workday is local
  const generateLabel  = selectedLabels.length === OUTPUT_OPTIONS.length
    ? 'Generate full packet'
    : anySelected ? `Generate ${selectedLabels.join(' + ')}` : 'Generate';

  const disabledReason = !anySelected
    ? 'Select at least one output to generate.'
    : needsAi && !state.jobDescription.trim()
      ? 'Paste a job description first.'
      : needsAi && !apiKey
        ? 'Add an API key in Settings.'
        : completeness < 30
          ? 'Profile completeness must be at least 30%.'
          : '';

  function toggleOutput(key) {
    setSelection(s => ({ ...s, [key]: !s[key] }));
  }

  async function detectJobMeta() {
    setDetecting(true);
    try {
      const { title, company } = await detectJobInfo(state.jobDescription);
      if (!title && !company) { onToast?.('Could not detect title or company — enter them manually.'); return; }
      const draft = {
        jobDescription: state.jobDescription,
        jobTitle: title || state.jobTitle,
        company: company || state.company,
      };
      saveJobTargetDraft(draft);
      dispatch({ type: 'SET', key: 'jobTitle', value: draft.jobTitle });
      dispatch({ type: 'SET', key: 'company', value: draft.company });
      onToast?.('Detected job title and company.');
    } catch {
      onToast?.('Detection failed.');
    } finally {
      setDetecting(false);
    }
  }

  function updateJobTargetField(key, value) {
    const draft = { jobDescription: state.jobDescription, jobTitle: state.jobTitle, company: state.company, [key]: value };
    saveJobTargetDraft(draft);
    dispatch({ type: 'SET', key, value });
  }

  async function regenerateCoverLetter() {
    if (!state.outputs) return;
    setRegenCLLoading(true);
    try {
      const freshData = getResumeData();
      const cover = await generateCoverLetter(
        apiKey, freshData, state.jobTitle, state.company, state.jobDescription, getCoverLetterTone()
      );
      const cost = { ...(state.outputs.cost || {}), cover: cover.cost, model: cover.model };
      dispatch({ type: 'SET', key: 'outputs', value: { ...state.outputs, coverLetter: cover.text, cost } });
      onToast?.('Cover letter regenerated.');
    } catch (err) {
      onToast?.(`Cover letter failed: ${err.message}`);
    } finally {
      setRegenCLLoading(false);
    }
  }

  async function generate() {
    const order = OUTPUT_OPTIONS.filter(o => selection[o.key]).map(o => o.key);
    dispatch({ type: 'GEN_START', steps: order.map(k => STEP_LABELS[k]) });
    try {
      const rewriteMode = getRewriteMode();
      const tone        = getCoverLetterTone();
      const freshData   = getResumeData();
      // Merge onto any previous run so unselected outputs are preserved.
      const outputs = { ...(state.outputs || {}) };
      const cost    = { ...(state.outputs?.cost || {}) };
      let tailoredBullets = state.outputs?.tailoredBullets || [];
      const done = [];

      for (let i = 0; i < order.length; i++) {
        const key = order[i];
        if (key === 'resume') {
          const tailored = await generateTailoredResume(apiKey, freshData, state.jobDescription, rewriteMode);
          outputs.latex = tailored.latex;
          outputs.tailoredBullets = tailored.bullets;
          tailoredBullets = tailored.bullets;
          cost.resume = tailored.cost;
          cost.model = tailored.model;
        } else if (key === 'cover') {
          const cover = await generateCoverLetter(apiKey, freshData, state.jobTitle, state.company, state.jobDescription, tone);
          outputs.coverLetter = cover.text;
          cost.cover = cover.cost;
          cost.model = cost.model || cover.model;
        } else if (key === 'workday') {
          // Uses tailored bullets when the resume is part of this run (or a prior one); otherwise the originals.
          outputs.workdayScript = generateWorkdayScript(freshData, tailoredBullets);
        }
        done.push(i);
        dispatch({ type: 'GEN_STEP', doneSteps: [...done], next: i + 1 < order.length ? i + 1 : null });
      }

      outputs.cost = cost;
      const markDone = !state.onboardingDone && apiKey && completeness >= 50;
      if (markDone) setOnboardingDone();
      dispatch({ type: 'GEN_DONE', outputs, markDone });
      let historySaved = false;
      try {
        saveToHistory({ date: new Date().toISOString(), jobTitle: state.jobTitle, company: state.company, jobDescription: state.jobDescription, outputs, meta: { rewriteMode, tone } });
        onGenerationSaved?.();
        historySaved = true;
      } catch (err) {
        console.error('Failed to save generation history:', err);
      }
      onToast?.(historySaved ? 'Generation complete.' : 'Generated — could not save to Versions (storage full?).');
    } catch (err) {
      dispatch({ type: 'GEN_ERROR', error: err.message || 'Generation failed.' });
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-500">Tailor Resume</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Create a targeted application packet</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Paste a job description, then generate your resume, cover letter, and Workday export.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
          <span className={`size-2 rounded-full ${completeness >= 50 ? 'bg-emerald-500' : completeness >= 30 ? 'bg-amber-500' : 'bg-red-400'}`} />
          <span className="font-medium text-slate-700">Profile: {completeness}%</span>
        </div>
      </div>

      {/* First run checklist */}
      {!state.onboardingDone && (allSignalsReady ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 animate-fade-up">
          <CheckCircle2 size={14} />
          Profile ready
        </div>
      ) : (
        <Card className="border-indigo-200 bg-indigo-50/60 animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-indigo-950">First run checklist</h2>
              <p className="mt-0.5 text-sm text-indigo-700">Complete these once so every future resume starts stronger.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {signals.map(s => (
                <span key={s.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.done ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  {s.done ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Circle size={11} className="text-slate-400" />}
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <div className="space-y-5">
        <JobTargetSection
          state={state}
          onFieldChange={updateJobTargetField}
          onDetect={detectJobMeta}
          detecting={detecting}
          canDetect={Boolean(state.jobDescription.trim() && apiKey)}
        />

        {/* Generate area */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Generate:</span>
            {OUTPUT_OPTIONS.map(opt => {
              const on = selection[opt.key];
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleOutput(opt.key)}
                  disabled={state.activeStep !== null}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                    on ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {on ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {disabledReason && state.activeStep === null && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
              {disabledReason}
            </div>
          )}
          {state.error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
              {state.error}
            </div>
          )}
          <Button
            className="w-full py-3 text-base"
            disabled={Boolean(disabledReason) || state.activeStep !== null}
            onClick={generate}
          >
            {state.activeStep !== null
              ? <><Loader2 size={16} className="animate-spin" /> Generating&#8230;</>
              : <><Sparkles size={16} /> {generateLabel}</>}
          </Button>
          {state.activeStep !== null && (
            <div className="grid gap-2 sm:grid-cols-2 animate-fade-up">
              {state.steps.map((s, i) => {
                const status = state.doneSteps.includes(i) ? 'done' : state.activeStep === i ? 'active' : 'pending';
                return (
                  <div key={s} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
                    status === 'done'   ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
                    status === 'active' ? 'border-indigo-200 bg-indigo-50 text-indigo-800' :
                                         'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                    <StepIcon status={status} />
                    {s}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <OutputTabs
          outputs={state.outputs}
          loading={state.activeStep !== null}
          activeOutputs={selection}
          company={state.company}
          jobTitle={state.jobTitle}
          onToast={onToast}
          onRegenCoverLetter={state.outputs ? regenerateCoverLetter : null}
          regenCoverLetterLoading={regenCLLoading}
        />
      </div>
    </div>
  );
}
