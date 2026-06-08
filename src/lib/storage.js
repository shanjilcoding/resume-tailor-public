import { normalizeResumeData, newId } from './validation.js';

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-2.5-flash',
};

const KEYS = {
  resumeData:       'resumeData',
  apiKey:           'apiKey',           // legacy Anthropic key — kept for migration
  history:          'generationHistory',
  onboarding:       'onboardingDone',
  rewriteMode:      'rewriteMode',
  coverLetterTone:  'coverLetterTone',
  activeProvider:   'activeProvider',
  apiKeyAnthropic:  'apiKey_anthropic',
  apiKeyOpenai:     'apiKey_openai',
  apiKeyGemini:     'apiKey_gemini',
  modelAnthropic:   'model_anthropic',
  modelOpenai:      'model_openai',
  modelGemini:      'model_gemini',
  jobTargetDraft:   'jobTargetDraft',
};

export function getDefaultResumeData() {
  return normalizeResumeData({});
}

export function getResumeData() {
  try {
    const raw = localStorage.getItem(KEYS.resumeData);
    return raw ? normalizeResumeData(JSON.parse(raw)) : getDefaultResumeData();
  } catch {
    return getDefaultResumeData();
  }
}

export function saveResumeData(data) {
  localStorage.setItem(KEYS.resumeData, JSON.stringify(normalizeResumeData(data)));
}

// Legacy — reads old single key; kept so existing callers don't break before migration
export function getApiKey() {
  return getApiKeyForProvider('anthropic');
}

export function getActiveProvider() {
  return localStorage.getItem(KEYS.activeProvider) || 'anthropic';
}

export function saveActiveProvider(provider) {
  localStorage.setItem(KEYS.activeProvider, provider);
}

export function getApiKeyForProvider(provider) {
  const key = localStorage.getItem(`apiKey_${provider}`) || '';
  // Migrate: if no per-provider key saved yet, fall back to legacy apiKey for Anthropic
  if (!key && provider === 'anthropic') return localStorage.getItem(KEYS.apiKey) || '';
  return key;
}

export function saveApiKeyForProvider(provider, key) {
  localStorage.setItem(`apiKey_${provider}`, key.trim());
}

export function getActiveApiKey() {
  return getApiKeyForProvider(getActiveProvider());
}

export function getModelForProvider(provider) {
  return localStorage.getItem(`model_${provider}`) || DEFAULT_MODELS[provider] || '';
}

export function saveModelForProvider(provider, model) {
  localStorage.setItem(`model_${provider}`, model);
}

export function getActiveModel() {
  return getModelForProvider(getActiveProvider());
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(record) {
  const history = getHistory();
  history.unshift({ ...record, id: record.id || newId() });
  if (history.length > 25) history.splice(25);
  // localStorage caps around 5MB and saved Workday scripts are large, so a write
  // can fail. Drop the older half and retry rather than throwing on the newest run.
  while (history.length) {
    try {
      localStorage.setItem(KEYS.history, JSON.stringify(history));
      return;
    } catch {
      if (history.length === 1) throw new Error('Could not save to Versions — browser storage is full.');
      history.splice(Math.ceil(history.length / 2));
    }
  }
}

export function getJobTargetDraft() {
  try {
    const raw = localStorage.getItem(KEYS.jobTargetDraft);
    const draft = raw ? JSON.parse(raw) : {};
    return {
      jobDescription: typeof draft.jobDescription === 'string' ? draft.jobDescription : '',
      jobTitle: typeof draft.jobTitle === 'string' ? draft.jobTitle : '',
      company: typeof draft.company === 'string' ? draft.company : '',
    };
  } catch {
    return { jobDescription: '', jobTitle: '', company: '' };
  }
}

export function saveJobTargetDraft(draft) {
  const safeDraft = {
    jobDescription: draft.jobDescription || '',
    jobTitle: draft.jobTitle || '',
    company: draft.company || '',
  };
  localStorage.setItem(KEYS.jobTargetDraft, JSON.stringify(safeDraft));
}

export function deleteFromHistory(id) {
  const history = getHistory().filter(h => h.id !== id);
  localStorage.setItem(KEYS.history, JSON.stringify(history));
}

export function clearHistory() {
  localStorage.removeItem(KEYS.history);
}

export function getRewriteMode() {
  return localStorage.getItem(KEYS.rewriteMode) || 'balanced';
}

export function saveRewriteMode(mode) {
  localStorage.setItem(KEYS.rewriteMode, mode);
}

export function getCoverLetterTone() {
  return localStorage.getItem(KEYS.coverLetterTone) || 'professional';
}

export function saveCoverLetterTone(tone) {
  localStorage.setItem(KEYS.coverLetterTone, tone);
}

export function isOnboardingDone() {
  return localStorage.getItem(KEYS.onboarding) === 'true';
}

export function setOnboardingDone() {
  localStorage.setItem(KEYS.onboarding, 'true');
}

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function exportResumeJSON() {
  const data = getResumeData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importResumeJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const raw = JSON.parse(e.target.result);
        const normalized = normalizeResumeData(raw);
        saveResumeData(normalized);
        resolve(normalized);
      } catch {
        reject(new Error('Invalid JSON file. Please export a resume from this app and try again.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
