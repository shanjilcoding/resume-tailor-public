import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Key, Loader2, Shield, SlidersHorizontal, Trash2, XCircle } from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import { testConnection } from '../lib/api.js';
import { estimatePacketCost, formatCost, priceForModel } from '../lib/pricing.js';
import {
  clearAllData,
  DEFAULT_MODELS,
  getActiveProvider,
  getApiKeyForProvider,
  getCoverLetterTone,
  getModelForProvider,
  getRewriteMode,
  saveActiveProvider,
  saveApiKeyForProvider,
  saveCoverLetterTone,
  saveModelForProvider,
  saveRewriteMode,
} from '../lib/storage.js';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', keyLabel: 'Anthropic API key', placeholder: 'sk-ant-...' },
  { id: 'openai',    label: 'OpenAI (GPT)',        keyLabel: 'OpenAI API key',     placeholder: 'sk-...' },
  { id: 'gemini',    label: 'Google (Gemini)',      keyLabel: 'Gemini API key',     placeholder: 'AIza...' },
];

const PROVIDER_MODELS = {
  anthropic: [
    { id: 'claude-opus-4-8',           label: 'Claude Opus 4.8 (most capable)' },
    { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7' },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (balanced — recommended)' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
  ],
  openai: [
    { id: 'gpt-5.5',      label: 'GPT-5.5 (flagship, most capable)' },
    { id: 'gpt-5.4',      label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini (faster, cheaper — recommended)' },
    { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano (fastest, cheapest)' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (latest — recommended)' },
    { id: 'gemini-3.5-flash',      label: 'Gemini 3.5 Flash (fast)' },
    { id: 'gemini-3.1-pro',        label: 'Gemini 3.1 Pro (strongest reasoning)' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (cheapest)' },
  ],
};

const REWRITE_MODES = [
  { id: 'light',    label: 'Light',    desc: 'Safest — minimal edits.' },
  { id: 'balanced', label: 'Balanced', desc: 'Rewrites bullets, keeps claims.' },
  { id: 'strong',   label: 'Strong',   desc: 'Assertive — review carefully.' },
];

const COVER_LETTER_TONES = [
  { id: 'professional',   label: 'Professional',   desc: 'Formal and direct.' },
  { id: 'conversational', label: 'Conversational', desc: 'Warm and natural.' },
  { id: 'technical',      label: 'Technical',      desc: 'Emphasizes technical specifics.' },
];

function getValidModel(provider, saved) {
  const models = PROVIDER_MODELS[provider] || [];
  return models.find(m => m.id === saved) ? saved : (DEFAULT_MODELS[provider] || models[0]?.id || '');
}

export default function Settings({ onToast }) {
  const initProvider = getActiveProvider();
  const [provider,        setProvider]        = useState(initProvider);
  const [apiKey,          setApiKey]          = useState(() => getApiKeyForProvider(initProvider));
  const [showKey,         setShowKey]         = useState(false);
  const [model,           setModel]           = useState(() => getValidModel(initProvider, getModelForProvider(initProvider)));
  const [keyError,        setKeyError]        = useState('');
  const [testState,       setTestState]       = useState({ status: 'idle', message: '' });
  const [rewriteMode,     setRewriteMode]     = useState(getRewriteMode);
  const [coverLetterTone, setCoverLetterTone] = useState(getCoverLetterTone);

  function handleProviderChange(next) {
    setProvider(next);
    setApiKey(getApiKeyForProvider(next));
    setModel(getValidModel(next, getModelForProvider(next)));
    setKeyError('');
    setTestState({ status: 'idle', message: '' });
    saveActiveProvider(next);
  }

  function handleModelChange(next) {
    setModel(next);
    saveModelForProvider(provider, next);
  }

  function save() {
    if (!apiKey.trim()) { setKeyError('API key cannot be empty.'); return; }
    let warn = '';
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-'))
      warn = 'Anthropic key should start with sk-ant- — check for typos.';
    else if (provider === 'openai' && !apiKey.startsWith('sk-'))
      warn = 'OpenAI key should start with sk- — check for typos.';
    setKeyError(warn);
    saveApiKeyForProvider(provider, apiKey);
    saveActiveProvider(provider);
    onToast?.('API key saved.');
  }

  async function runTest() {
    const key = apiKey.trim() || getApiKeyForProvider(provider);
    if (!key) { setTestState({ status: 'error', message: 'Enter an API key first.' }); return; }
    setTestState({ status: 'loading', message: '' });
    const result = await testConnection(provider, key, model);
    if (result.ok) {
      saveApiKeyForProvider(provider, key);
      saveActiveProvider(provider);
      saveModelForProvider(provider, model);
      setKeyError('');
      setTestState({ status: 'success', message: 'Connection successful. API key saved.' });
      setTimeout(() => setTestState({ status: 'idle', message: '' }), 4000);
    } else {
      setTestState({ status: 'error', message: result.error });
    }
  }

  function clear() {
    if (!confirm('Are you sure? This will delete your resume, history, and all API keys.')) return;
    clearAllData();
    setApiKey('');
    setTestState({ status: 'idle', message: '' });
    onToast?.('All local data cleared.');
  }

  const providerMeta = PROVIDERS.find(p => p.id === provider);
  const models       = PROVIDER_MODELS[provider] || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-500">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">AI provider</h1>
        <p className="mt-1.5 max-w-xl text-sm text-slate-500">
          Choose a provider, add your API key, and pick a model. Keys are stored only in your browser.
        </p>
      </div>

      {/* AI Provider card */}
      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Key size={16} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">AI provider</h2>
            <p className="text-xs text-slate-500">Used only when generating tailored outputs.</p>
          </div>
        </div>

        {/* Provider selector */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderChange(p.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                provider === p.id
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* API key input */}
        <div className="relative">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{providerMeta.keyLabel}</span>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setKeyError(''); }}
              placeholder={providerMeta.placeholder}
              className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm transition-colors placeholder:text-slate-400 outline-none ${
                keyError
                  ? 'border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
              }`}
            />
            {keyError && <span className="mt-1 block text-xs text-amber-700">{keyError}</span>}
          </label>
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="absolute right-3 top-8 text-slate-400 transition-colors hover:text-slate-600"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {/* Model dropdown */}
        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Model</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={model}
              onChange={e => handleModelChange(e.target.value)}
            >
              {models.map(m => {
                const est = estimatePacketCost(m.id);
                return (
                  <option key={m.id} value={m.id}>{m.label}{est != null ? ` · ~${formatCost(est)}/app` : ''}</option>
                );
              })}
            </select>
          </label>
          <p className="mt-1.5 text-xs text-slate-500">More capable models cost more per generation. Faster models are cheaper. The recommended option is a good balance for resume tailoring.</p>
          {priceForModel(model) && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              {model}: ${priceForModel(model).input.toFixed(2)} / 1M input · ${priceForModel(model).output.toFixed(2)} / 1M output · ~{formatCost(estimatePacketCost(model))} per application
            </p>
          )}
        </div>

        {/* Safety warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Shield size={14} className="mt-0.5 shrink-0 text-blue-600" />
          <p className="text-sm leading-relaxed text-blue-900">
            Your API key is stored only in this browser and sent directly to the provider you selected — never to any other server. Use this app only on a trusted personal device. Create a dedicated API key with a spending limit for maximum safety.
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}><Key size={14} /> Save API key</Button>
            <Button variant="secondary" onClick={runTest} disabled={testState.status === 'loading'}>
              {testState.status === 'loading'
                ? <><Loader2 size={14} className="animate-spin" /> Testing…</>
                : 'Test connection'}
            </Button>
            <Button variant="danger" onClick={clear}><Trash2 size={14} /> Clear all local data</Button>
          </div>
          {testState.status === 'success' && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 size={14} className="text-emerald-500" /> {testState.message}
            </div>
          )}
          {testState.status === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <XCircle size={14} className="text-red-500" /> {testState.message}
            </div>
          )}
        </div>
      </Card>

      {/* Generation preferences */}
      <Card className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <SlidersHorizontal size={16} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Generation preferences</h2>
            <p className="text-xs text-slate-500">Set once — applied to every generation.</p>
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-sm font-medium text-slate-700">Rewrite mode</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {REWRITE_MODES.map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => { setRewriteMode(mode.id); saveRewriteMode(mode.id); }}
                className={`rounded-xl border p-3.5 text-left transition-all duration-150 ${
                  rewriteMode === mode.id
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`block text-sm font-semibold ${rewriteMode === mode.id ? 'text-indigo-900' : 'text-slate-900'}`}>{mode.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-sm font-medium text-slate-700">Cover letter tone</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {COVER_LETTER_TONES.map(tone => (
              <button
                key={tone.id}
                type="button"
                onClick={() => { setCoverLetterTone(tone.id); saveCoverLetterTone(tone.id); }}
                className={`rounded-xl border p-3.5 text-left transition-all duration-150 ${
                  coverLetterTone === tone.id
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`block text-sm font-semibold ${coverLetterTone === tone.id ? 'text-indigo-900' : 'text-slate-900'}`}>{tone.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{tone.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
