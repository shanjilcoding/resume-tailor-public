import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub localStorage — Vitest runs in node env by default, which has no window.localStorage.
// storage.js only accesses localStorage inside function bodies, so stubbing here (before
// any test functions run) is sufficient.
const store = {};
vi.stubGlobal('localStorage', {
  getItem:    k     => store[k] ?? null,
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: k     => { delete store[k]; },
  clear:      ()    => Object.keys(store).forEach(k => delete store[k]),
});

import {
  clearAllData,
  getActiveProvider,
  getApiKeyForProvider,
  getHistory,
  getModelForProvider,
  getResumeData,
  saveActiveProvider,
  saveApiKeyForProvider,
  saveModelForProvider,
  saveToHistory,
  DEFAULT_MODELS,
} from './storage.js';

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

describe('getResumeData', () => {
  it('returns normalized defaults when localStorage is empty', () => {
    const data = getResumeData();
    expect(data.personal.name).toBe('');
    expect(data.skills).toBe('');
    expect(data.education).toHaveLength(1);
  });

  it('returns normalized defaults when localStorage has bad JSON', () => {
    store['resumeData'] = 'not-json{{';
    const data = getResumeData();
    expect(data.personal.name).toBe('');
  });
});

describe('saveToHistory / getHistory', () => {
  it('stores a record and retrieves it', () => {
    saveToHistory({ date: '2026-01-01', jobTitle: 'Dev', company: 'Acme', outputs: {}, meta: {} });
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].jobTitle).toBe('Dev');
  });

  it('prepends newest record first', () => {
    saveToHistory({ date: '2026-01-01', jobTitle: 'First',  company: 'A', outputs: {}, meta: {} });
    saveToHistory({ date: '2026-01-02', jobTitle: 'Second', company: 'B', outputs: {}, meta: {} });
    expect(getHistory()[0].jobTitle).toBe('Second');
  });

  it('caps history at 50 records', () => {
    for (let i = 0; i < 55; i++) {
      saveToHistory({ date: `2026-01-${String(i).padStart(2,'0')}`, jobTitle: `Job ${i}`, company: 'X', outputs: {}, meta: {} });
    }
    expect(getHistory()).toHaveLength(50);
  });
});

describe('clearAllData', () => {
  it('removes resume data, api keys, history, and provider settings', () => {
    store['resumeData']      = '{}';
    store['apiKey_anthropic'] = 'sk-ant-test';
    store['activeProvider']  = 'anthropic';
    store['generationHistory'] = '[]';
    clearAllData();
    expect(store['resumeData']).toBeUndefined();
    expect(store['apiKey_anthropic']).toBeUndefined();
    expect(store['activeProvider']).toBeUndefined();
    expect(store['generationHistory']).toBeUndefined();
  });
});

describe('provider and model storage', () => {
  it('defaults to anthropic provider', () => {
    expect(getActiveProvider()).toBe('anthropic');
  });

  it('saves and retrieves active provider', () => {
    saveActiveProvider('openai');
    expect(getActiveProvider()).toBe('openai');
  });

  it('saves and retrieves api key per provider', () => {
    saveApiKeyForProvider('anthropic', 'sk-ant-abc');
    expect(getApiKeyForProvider('anthropic')).toBe('sk-ant-abc');
  });

  it('migrates legacy apiKey to anthropic key lookup', () => {
    store['apiKey'] = 'sk-ant-legacy';
    expect(getApiKeyForProvider('anthropic')).toBe('sk-ant-legacy');
  });

  it('per-provider key takes precedence over legacy key', () => {
    store['apiKey'] = 'sk-ant-legacy';
    saveApiKeyForProvider('anthropic', 'sk-ant-new');
    expect(getApiKeyForProvider('anthropic')).toBe('sk-ant-new');
  });

  it('defaults model to DEFAULT_MODELS value', () => {
    expect(getModelForProvider('anthropic')).toBe(DEFAULT_MODELS.anthropic);
    expect(getModelForProvider('openai')).toBe(DEFAULT_MODELS.openai);
    expect(getModelForProvider('gemini')).toBe(DEFAULT_MODELS.gemini);
  });

  it('saves and retrieves model per provider', () => {
    saveModelForProvider('anthropic', 'claude-opus-4-7');
    expect(getModelForProvider('anthropic')).toBe('claude-opus-4-7');
  });
});
