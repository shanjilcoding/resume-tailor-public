import { describe, expect, it } from 'vitest';
import { OVERLEAF_TEMPLATE_URL, safeFileName } from './download.js';

describe('safeFileName', () => {
  it('creates lowercase filesystem-safe names', () => {
    expect(safeFileName('Magna Electronics', 'IoT Developer / C++')).toBe('magna-electronics-iot-developer-cpp');
  });
});

describe('OVERLEAF_TEMPLATE_URL', () => {
  it('points to Jake\'s resume template instead of the direct snippet URL', () => {
    expect(OVERLEAF_TEMPLATE_URL).toBe('https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs');
    expect(OVERLEAF_TEMPLATE_URL).not.toContain('/docs?snip=');
  });
});
