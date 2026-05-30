import { describe, expect, it } from 'vitest';
import { generateWorkdayScript } from './workday.js';
import { normalizeResumeData } from './validation.js';

describe('generateWorkdayScript', () => {
  it('generates valid JavaScript and safely embeds apostrophes', () => {
    const data = normalizeResumeData({
      workExperience: [{ title: 'Founder', company: "Alex's Automations", location: 'Remote', fromMonth: '01', fromYear: '2026', currentlyWork: true, bullets: ['Built agents'] }]
    });
    const script = generateWorkdayScript(data, [{ company: "Alex's Automations", title: 'Founder', bullets: ['Tailored bullet'] }]);
    expect(script).toContain("Alex's Automations");
    expect(script).toContain('Tailored bullet');
    expect(script).toMatch(/^\(async function \(\)/);
    expect(script).toMatch(/\}\)\(\);$/s);
  });

  it('maps app data into the Workday v2 label-keyed RESUME_DATA shape', () => {
    const data = normalizeResumeData({
      workExperience: [{
        title: 'AI Automation Intern',
        company: 'Acme',
        location: 'Remote',
        fromMonth: '01',
        fromYear: '2024',
        toMonth: '05',
        toYear: '2025',
        bullets: ['Original bullet']
      }],
      education: [{ school: 'UMGC', degree: 'Bachelors', field: 'Computer Science', gpa: '3.8', fromYear: '2019', toYear: '2025' }],
      languages: [{ language: 'English', fluent: true, reading: 'Advanced', speaking: 'Advanced', writing: 'Advanced' }],
      certifications: [{ name: 'AZ-900', year: '2026' }],
      websites: ['https://example.com'],
      skills: 'Python, JavaScript,  React'
    });

    const script = generateWorkdayScript(data, [{ company: 'Acme', bullets: ['Tailored bullet'] }]);

    expect(script).toContain('const RESUME_DATA = {');
    expect(script).toContain('"Job Title": "AI Automation Intern"');
    expect(script).toContain('"Role Description": "- Tailored bullet"');
    expect(script).toContain('"To (Actual or Expected)": {');
    expect(script).toContain('"Reading": "Advanced"');
    expect(script).toContain('"Speaking": "Advanced"');
    expect(script).toContain('"Writing": "Advanced"');
    expect(script).toContain('"Certification Number": ""');
    expect(script).toContain('"URL": "https://example.com"');
    expect(script).toContain('"skills": "Python, JavaScript, React"');
  });
});
