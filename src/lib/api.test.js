import { describe, expect, it } from 'vitest';
import { applyTailoring, parseResumeResponse } from './api.js';

describe('parseResumeResponse', () => {
  it('parses tailored JSON wrapped in <json> tags', () => {
    const text = `<json>
{"work":[{"id":0,"bullets":["Built API"]}],"projects":[{"id":1,"bullets":["Shipped app"]}],"skills":"Go, React"}
</json>`;
    const result = parseResumeResponse(text);
    expect(result.work).toEqual([{ id: 0, bullets: ['Built API'] }]);
    expect(result.projects).toEqual([{ id: 1, bullets: ['Shipped app'] }]);
    expect(result.skills).toBe('Go, React');
  });

  it('parses bare JSON with no tags', () => {
    const result = parseResumeResponse('{"work":[{"id":0,"bullets":["x"]}]}');
    expect(result.work[0].bullets[0]).toBe('x');
    expect(result.projects).toEqual([]);
    expect(result.skills).toBe('');
  });

  it('strips markdown code fences', () => {
    const text = '<json>\n```json\n{"work":[{"id":0,"bullets":["y"]}]}\n```\n</json>';
    expect(parseResumeResponse(text).work[0].bullets[0]).toBe('y');
  });

  it('falls back to the first {...} block amid stray prose', () => {
    const text = 'Here is your resume:\n{"work":[{"id":0,"bullets":["z"]}]}\nHope that helps!';
    expect(parseResumeResponse(text).work[0].bullets[0]).toBe('z');
  });

  it('throws when no usable JSON is present', () => {
    expect(() => parseResumeResponse('no json here')).toThrow('did not return tailored resume content');
  });

  it('throws on empty string', () => {
    expect(() => parseResumeResponse('')).toThrow();
  });
});

describe('applyTailoring', () => {
  const base = {
    personal: { name: 'A' },
    workExperience: [
      { title: 'Dev', company: 'Acme', bullets: ['orig a1', 'orig a2'] },
      { title: 'Eng', company: 'Beta', bullets: ['orig b1'] },
    ],
    projects: [
      { name: 'P0', techStack: 'JS', bullets: ['p0 orig'] },
      { name: 'P1', techStack: 'Go', bullets: ['p1 orig'] },
    ],
    skills: 'Go, React, SQL',
  };

  it('replaces work bullets by id and keeps roles the model omitted', () => {
    const out = applyTailoring(base, { work: [{ id: 0, bullets: ['new a1', 'new a2'] }], projects: [], skills: '' });
    expect(out.workExperience[0].bullets).toEqual(['new a1', 'new a2']);
    expect(out.workExperience[1].bullets).toEqual(['orig b1']); // untouched
  });

  it('keeps original bullets when the model returns an empty list', () => {
    const out = applyTailoring(base, { work: [{ id: 0, bullets: [] }], projects: [], skills: '' });
    expect(out.workExperience[0].bullets).toEqual(['orig a1', 'orig a2']);
  });

  it('falls back to original when the model returns fewer bullets than the source', () => {
    // role 0 has two bullets; a one-bullet reply means a bullet was dropped
    const out = applyTailoring(base, { work: [{ id: 0, bullets: ['only one'] }], projects: [], skills: '' });
    expect(out.workExperience[0].bullets).toEqual(['orig a1', 'orig a2']);
  });

  it('reorders projects to the model order and appends any it left out', () => {
    const out = applyTailoring(base, { work: [], projects: [{ id: 1, bullets: ['new p1'] }], skills: '' });
    expect(out.projects.map(p => p.name)).toEqual(['P1', 'P0']); // P1 first, P0 appended
    expect(out.projects[0].bullets).toEqual(['new p1']);
    expect(out.projects[1].bullets).toEqual(['p0 orig']);
  });

  it('accepts reordered skills only when every original skill survives', () => {
    const kept = applyTailoring(base, { work: [], projects: [], skills: 'React, SQL, Go' });
    expect(kept.skills).toBe('React, SQL, Go');
    const dropped = applyTailoring(base, { work: [], projects: [], skills: 'React, Go' });
    expect(dropped.skills).toBe('Go, React, SQL'); // SQL missing -> fall back
  });

  it('ignores out-of-range and malformed ids', () => {
    const out = applyTailoring(base, {
      work: [{ id: 9, bullets: ['nope'] }, { id: 'x', bullets: ['nope'] }],
      projects: [{ id: 5, bullets: ['nope'] }],
      skills: '',
    });
    expect(out.workExperience[0].bullets).toEqual(['orig a1', 'orig a2']);
    expect(out.projects.map(p => p.name)).toEqual(['P0', 'P1']);
  });
});
