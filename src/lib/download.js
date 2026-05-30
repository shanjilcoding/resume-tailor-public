export function safeFileName(...parts) {
  const base = parts
    .map(p => String(p || ''))
    .join('-')
    .toLowerCase()
    .replace(/\+\+/g, 'pp')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base || 'resume-tailor-output';
}

export function downloadText(content, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadLatex(latex, company, jobTitle) {
  downloadText(latex, `resume-${safeFileName(company, jobTitle)}.tex`, 'application/x-tex;charset=utf-8');
}

export function downloadCoverLetter(text, company, jobTitle) {
  downloadText(text, `cover-letter-${safeFileName(company, jobTitle)}.txt`);
}

export function downloadWorkdayScript(script, company, jobTitle) {
  downloadText(script, `workday-${safeFileName(company, jobTitle)}.js`, 'text/javascript;charset=utf-8');
}

export const OVERLEAF_TEMPLATE_URL = 'https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs';

export function openInOverleaf() {
  window.open(OVERLEAF_TEMPLATE_URL, '_blank');
  alert([
    'Overleaf steps:',
    '1. Open as Template. Log in or create an account if prompted.',
    '2. Delete the example code in main.tex.',
    '3. Paste the LaTeX code from Resume Tailor.',
    '4. Recompile, review, then download the PDF.'
  ].join('\n'));
}
