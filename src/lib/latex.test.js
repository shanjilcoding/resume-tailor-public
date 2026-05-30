import { describe, expect, it } from 'vitest';
import { buildBaseLatexResume, escapeLatex, safeHref } from './latex.js';
import { normalizeResumeData } from './validation.js';

describe('escapeLatex', () => {
  it('escapes special latex characters', () => {
    expect(escapeLatex('A&B_100%')).toBe('A\\&B\\_100\\%');
  });
});

describe('safeHref', () => {
  it('prepends https:// when scheme is missing', () => {
    const result = safeHref('github.com/user');
    expect(result).toMatch(/^https:\/\//);
    expect(result).toContain('github.com/user');
  });

  it('passes through a valid https URL unchanged', () => {
    expect(safeHref('https://example.com/path')).toBe('https://example.com/path');
  });

  it('returns empty string for javascript: scheme', () => {
    expect(safeHref('javascript:alert(1)')).toBe('');
  });

  it('returns empty string for data: scheme', () => {
    expect(safeHref('data:text/html,<h1>x</h1>')).toBe('');
  });

  it('strips braces and backslashes from URL', () => {
    const result = safeHref('https://x.com/a}\\input{bad}');
    expect(result).not.toContain('}');
    expect(result).not.toContain('\\');
  });

  it('returns empty string for empty input', () => {
    expect(safeHref('')).toBe('');
    expect(safeHref(null)).toBe('');
  });

  it('email mode prefixes mailto: and strips dangerous chars', () => {
    const result = safeHref('user@example.com', { email: true });
    expect(result).toBe('mailto:user@example.com');
  });

  it('email mode strips braces and backslashes', () => {
    const result = safeHref('bad{}\\user@example.com', { email: true });
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
    expect(result).not.toContain('\\');
  });
});

describe('buildBaseLatexResume', () => {
  it('builds populated latex with education dates and certifications', () => {
    const data = normalizeResumeData({
      personal: { name: 'Jane Doe', email: 'jane@example.com', phone: '555', linkedin: 'https://linkedin.com/in/jane', github: 'https://github.com/jane' },
      education: [{ school: 'Uni', degree: 'BS', field: 'CS', gpa: '3.8', fromYear: '2022', toYear: '2026' }],
      workExperience: [{ title: 'Dev', company: 'Acme', location: 'Remote', fromMonth: '01', fromYear: '2024', toMonth: '05', toYear: '2025', bullets: ['Built APIs'] }],
      projects: [{ name: 'Bot', techStack: 'React', bullets: ['Automated tasks'] }],
      certifications: [{ name: 'AI-900', issuer: 'Microsoft', year: '2026' }],
      skills: 'Python, React, LLMs, Docker, Git',
    });
    const latex = buildBaseLatexResume(data);
    expect(latex).toContain('Jane Doe');
    expect(latex).toContain('2022 -- 2026');
    expect(latex).toContain('AI-900');
    expect(latex).toContain('Built APIs');
  });

  it('uses safeHref for linkedin and github links', () => {
    const data = normalizeResumeData({
      personal: { name: 'Test', email: 'a@b.com', phone: '', linkedin: 'https://linkedin.com/in/test', github: 'https://github.com/test' },
    });
    const latex = buildBaseLatexResume(data);
    expect(latex).toContain('\\href{https://linkedin.com/in/test}');
    expect(latex).toContain('\\href{https://github.com/test}');
  });
});
