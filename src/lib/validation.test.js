import { describe, expect, it } from 'vitest';
import { normalizeResumeData } from './validation.js';

describe('normalizeResumeData', () => {
  it('creates a safe default shape for empty data', () => {
    const data = normalizeResumeData({});
    expect(data.personal.name).toBe('');
    expect(data.education).toHaveLength(1);
    expect(data.languages[0].language).toBe('English');
    expect(data.skills).toBe('');
  });

  it('normalizes malformed arrays and preserves valid work bullets', () => {
    const data = normalizeResumeData({
      workExperience: [{ company: 'Acme', bullets: ['Built tools', 42] }],
      projects: 'bad',
      languages: []
    });
    expect(data.workExperience[0].company).toBe('Acme');
    expect(data.workExperience[0].bullets).toEqual(['Built tools', '']);
    expect(data.projects).toEqual([]);
    expect(data.languages).toHaveLength(1);
  });
});
