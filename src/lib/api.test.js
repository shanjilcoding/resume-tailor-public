import { describe, expect, it } from 'vitest';
import { parseResumeResponse } from './api.js';

describe('parseResumeResponse', () => {
  it('parses a valid response with latex and bullets', () => {
    const text = `<latex>
LATEX_HERE
</latex>
<bullets>
[{"company":"Acme","title":"Dev","bullets":["Built API"]}]
</bullets>`;
    const result = parseResumeResponse(text);
    expect(result.latex).toBe('LATEX_HERE');
    expect(result.bullets).toHaveLength(1);
    expect(result.bullets[0].company).toBe('Acme');
    expect(result.bullets[0].bullets[0]).toBe('Built API');
  });

  it('throws if the <latex> tag is missing', () => {
    expect(() => parseResumeResponse('no latex here')).toThrow('AI did not return a valid LaTeX resume');
  });

  it('throws on empty string', () => {
    expect(() => parseResumeResponse('')).toThrow();
  });

  it('returns empty bullets array when <bullets> tag is missing but latex is present', () => {
    const text = '<latex>\nLATEX_CONTENT\n</latex>';
    const result = parseResumeResponse(text);
    expect(result.latex).toBe('LATEX_CONTENT');
    expect(result.bullets).toEqual([]);
  });

  it('returns empty bullets array on malformed JSON but preserves latex', () => {
    const text = '<latex>\nLATEX_CONTENT\n</latex>\n<bullets>\nnot valid json\n</bullets>';
    const result = parseResumeResponse(text);
    expect(result.latex).toBe('LATEX_CONTENT');
    expect(result.bullets).toEqual([]);
  });

  it('handles bullets wrapped in markdown code fences', () => {
    const text = `<latex>
LATEX
</latex>
<bullets>
\`\`\`json
[{"company":"X","title":"Y","bullets":["did thing"]}]
\`\`\`
</bullets>`;
    const result = parseResumeResponse(text);
    expect(result.latex).toBe('LATEX');
    expect(result.bullets[0].company).toBe('X');
  });
});
