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
import { buildBaseLatexResume } from '../lib/latex.js';
import { calculateCompleteness } from '../lib/validation.js';
import { detectJobInfo } from '../lib/detect.js';
import { generateCoverLetter, generateTailoredResume } from '../lib/api.js';
import { generateWorkdayScript } from '../lib/workday.js';
import {
  getActiveApiKey, getCoverLetterTone, getResumeData, getRewriteMode,
  isOnboardingDone, saveToHistory, setOnboardingDone,
} from '../lib/storage.js';

const GEN_STEPS = ['Build base resume', 'Tailor with AI', 'Write cover letter', 'Prepare Workday script'];

const initialState = {
  jobDescription: '',
  jobTitle: '',
  company: '',
  outputs: null,
  activeStep: null,
  doneSteps: [],
  error: '',
  detecting: false,
  onboardingDone: isOnboardingDone(),
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, [action.key]: action.value };
    case 'DETECT_START': return { ...state, detecting: true };
    case 'DETECT_DONE': return { ...state, detecting: false, jobTitle: action.title?.trim() || state.jobTitle, company: action.company?.trim() || state.company };
    case 'GEN_START': return { ...state, error: '', outputs: null, doneSteps: [], activeStep: 0 };
    case 'GEN_STEP': return { ...state, doneSteps: action.doneSteps, activeStep: action.next };
    case 'GEN_DONE': return {
      ...state,
      outputs: action.outputs,
      doneSteps: [0, 1, 2, 3],
      activeStep: null,
      onboardingDone: action.markDone ? true : state.onboardingDone,
    };
    case 'GEN_ERROR': return { ...state, activeStep: null, error: action.error };
    default: return state;
  }
}

function analyzeJob(text, title, company) {
  const lower = text.toLowerCase();
  const dict = ['react','typescript','javascript','python','node','api','sql','aws','azure','git','testing','ci/cd','accessibility','tailwind','docker','linux','communication','agile'];
  const keywords = dict.filter(k => lower.includes(k));
  const seniority = /senior|lead|principal/.test(lower)
    ? 'Senior' : /intern|junior|entry|new grad/.test(lower)
    ? 'Entry-level' : 'Mid-level / unspecified';
  return {
    role: title || (lower.includes('frontend') ? 'Frontend role' : lower.includes('software') ? 'Software role' : 'Role not detected'),
    company: company || 'Company not set',
    seniority,
    keywords: keywords.slice(0, 8),
  };
}

function profileSignals(resumeData, completeness, apiKey) {
  const workReady    = resumeData.workExperience.some(we => we.title.trim() && we.company.trim() && we.bullets.some(b => b.trim()));
  const projectReady = resumeData.projects.some(p => p.name.trim() || p.techStack.trim() || p.bullets.some(b => b.trim()));
  const skillsReady  = Object.values(resumeData.skills).some(v => v.trim());
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

function JobTargetSection({ state, dispatch, apiKey, jobAnalysis }) {
  const hasJobDescription = state.jobDescription.trim().length > 0;

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
        <Textarea
          label="Job description"
          className="min-h-52"
          value={state.jobDescription}
          onChange={e => dispatch({ type: 'SET', key: 'jobDescription', value: e.target.value })}
          placeholder="Paste responsibilities, qualifications, and company details here..."
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input label="Job title" value={state.jobTitle} onChange={e => dispatch({ type: 'SET', key: 'jobTitle', value: e.target.value })} placeholder="Software Engineer" />
          <Input label="Company"   value={state.company}  onChange={e => dispatch({ type: 'SET', key: 'company',  value: e.target.value })} placeholder="Company name" />
          <Button
            variant="secondary"
            className="mt-6 whitespace-nowrap"
            disabled={state.detecting || !apiKey || !state.jobDescription.trim()}
            onClick={() => {
              dispatch({ type: 'DETECT_START' });
              detectJobInfo(state.jobDescription).then(info =>
                dispatch({ type: 'DETECT_DONE', title: info.title, company: info.company })
              );
            }}
          >
            {state.detecting ? <Loader2 size={14} className="animate-spin" /> : null}
            {state.detecting ? 'Detecting...' : 'Auto-detect'}
          </Button>
        </div>
        {hasJobDescription && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs leading-relaxed text-slate-600">
            <span className="font-medium text-slate-800">Detected:</span> {jobAnalysis.role} · {jobAnalysis.seniority}
            {jobAnalysis.keywords.length > 0 && <> · <span className="font-medium text-slate-800">Keywords:</span> {jobAnalysis.keywords.join(', ')}</>}
          </p>
        )}
      </div>
    </Card>
  );
}

export default function Generator({ onToast, onGenerationSaved }) {
  const [resumeData]      = useState(getResumeData);
  const [state, dispatch] = useReducer(reducer, initialState);

  const completeness    = useMemo(() => calculateCompleteness(resumeData), [resumeData]);
  const apiKey          = getActiveApiKey();
  const jobAnalysis     = useMemo(() => analyzeJob(state.jobDescription, state.jobTitle, state.company), [state.jobDescription, state.jobTitle, state.company]);
  const signals         = useMemo(() => profileSignals(resumeData, completeness, apiKey), [resumeData, completeness, apiKey]);
  const allSignalsReady = signals.every(s => s.done);

  const disabledReason = !state.jobDescription.trim()
    ? 'Paste a job description first.'
    : !apiKey
      ? 'Add an API key in Settings.'
      : completeness < 30
        ? 'Profile completeness must be at least 30%.'
        : '';

  async function generate() {
    dispatch({ type: 'GEN_START' });
    try {
      const rewriteMode = getRewriteMode();
      const tone        = getCoverLetterTone();
      const baseLatex   = buildBaseLatexResume(resumeData);
      dispatch({ type: 'GEN_STEP', doneSteps: [0], next: 1 });
      const [tailored, coverLetter] = await Promise.all([
        generateTailoredResume(apiKey, baseLatex, resumeData, state.jobDescription, rewriteMode),
        generateCoverLetter(apiKey, resumeData, state.jobTitle, state.company, state.jobDescription, tone),
      ]);
      dispatch({ type: 'GEN_STEP', doneSteps: [0, 1, 2], next: 3 });
      const workdayScript = generateWorkdayScript(resumeData, tailored.bullets);
      const outputs = { latex: tailored.latex, coverLetter, workdayScript, tailoredBullets: tailored.bullets };
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
        <JobTargetSection state={state} dispatch={dispatch} apiKey={apiKey} jobAnalysis={jobAnalysis} />

        {/* Generate area */}
        <div className="space-y-4">
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
              : <><Sparkles size={16} /> Generate tailored packet</>}
          </Button>
          {state.activeStep !== null && (
            <div className="grid gap-2 sm:grid-cols-2 animate-fade-up">
              {GEN_STEPS.map((s, i) => {
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
          company={state.company}
          jobTitle={state.jobTitle}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
