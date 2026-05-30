export function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function cleanUrl(url) {
  return String(url || '').trim();
}

export function safeHref(raw, { email = false } = {}) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (email) {
    return 'mailto:' + value.replace(/[{}\\%\n\r]/g, '');
  }
  let url = value;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().replace(/[{}\\\n\r]/g, '');
  } catch {
    return '';
  }
}

function displayUrl(url) {
  return cleanUrl(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function dateRange(from, to) {
  if (from && to) return `${from} -- ${to}`;
  return from || to || '';
}

function workDateRange(we) {
  const from = we.fromMonth && we.fromYear ? `${we.fromMonth}/${we.fromYear}` : we.fromYear || '';
  const to = we.currentlyWork ? 'Present' : (we.toMonth && we.toYear ? `${we.toMonth}/${we.toYear}` : we.toYear || '');
  return dateRange(from, to);
}

function bulletItems(bullets) {
  const lines = [];
  for (const b of bullets) {
    if (b.trim()) lines.push(`  \\resumeItem{${escapeLatex(b)}}`);
  }
  return lines.join('\n');
}

export function buildBaseLatexResume(resumeData) {
  const { personal, workExperience, projects, education, skills, certifications } = resumeData;
  const e = escapeLatex;

  const preamble = `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{charter}
\\usepackage[T1]{fontenc}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-6pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-7pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-3pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-3pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-9pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-9pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-8pt}}`;

  const emailHref    = safeHref(personal.email, { email: true });
  const linkedinHref = safeHref(personal.linkedin);
  const githubHref   = safeHref(personal.github);

  const contact = [
    personal.phone && e(personal.phone),
    emailHref    && `\\href{${emailHref}}{\\underline{${e(personal.email)}}}`,
    linkedinHref && `\\href{${linkedinHref}}{\\underline{${e(displayUrl(personal.linkedin))}}}`,
    githubHref   && `\\href{${githubHref}}{\\underline{${e(displayUrl(personal.github))}}}`
  ].filter(Boolean).join(' $|$ ');

  const header = `\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${e(personal.name)}} \\\\ \\vspace{1pt}
    \\small ${contact}
\\end{center}`;

  const eduItems = [];
  for (const ed of education) {
    if (!ed.school.trim()) continue;
    const dates  = dateRange(e(ed.fromYear), e(ed.toYear));
    const degree = [ed.degree, ed.field && `in ${ed.field}`].filter(Boolean).join(' ');
    const meta   = ed.gpa ? `GPA: ${e(ed.gpa)}` : '';
    eduItems.push(`  \\resumeSubheading
    {${e(ed.school)}}{${dates}}
    {${e(degree)}}{${meta}}`);
  }
  const educationSection = eduItems.length ? `\\section{Education}
  \\resumeSubHeadingListStart
${eduItems.join('\n')}
  \\resumeSubHeadingListEnd` : '';

  const sortedWork = [...workExperience].sort((a, b) => {
    if (a.currentlyWork && !b.currentlyWork) return -1;
    if (!a.currentlyWork && b.currentlyWork) return 1;
    const yearDiff = (parseInt(b.fromYear) || 0) - (parseInt(a.fromYear) || 0);
    if (yearDiff !== 0) return yearDiff;
    return (parseInt(b.fromMonth) || 0) - (parseInt(a.fromMonth) || 0);
  });

  const workItems = [];
  for (const we of sortedWork) {
    if (!we.title.trim() && !we.company.trim()) continue;
    workItems.push(`    \\resumeSubheading
      {${e(we.title)}}{${workDateRange(we)}}
      {${e(we.company)}}{${e(we.location)}}
      \\resumeItemListStart
${bulletItems(we.bullets)}
      \\resumeItemListEnd`);
  }
  const workSection = workItems.length ? `\\section{Experience}
  \\resumeSubHeadingListStart
${workItems.join('\n')}
  \\resumeSubHeadingListEnd` : '';

  const projectItems = [];
  for (const p of projects) {
    if (!p.name.trim()) continue;
    const topBullets = p.bullets.filter(b => b.trim()).slice(0, 2);
    projectItems.push(`      \\resumeProjectHeading
          {\\textbf{${e(p.name)}} $|$ \\emph{${e(p.techStack)}}}{}
          \\resumeItemListStart
${bulletItems(topBullets)}
          \\resumeItemListEnd`);
  }
  const projectsSection = projectItems.length ? `\\section{Projects}
    \\resumeSubHeadingListStart
${projectItems.join('\n')}
    \\resumeSubHeadingListEnd` : '';

  const certParts = [];
  for (const c of certifications) {
    if (!c.name.trim()) continue;
    certParts.push([c.name, c.issuer, c.year].filter(Boolean).join(' -- '));
  }
  const certLine = certParts.length
    ? ` \\\\\n     \\textbf{Certifications}{: ${e(certParts.join(', '))}}`
    : '';

  const skillsSection = skills.trim() ? `\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Skills}{: ${e(skills)}}${certLine}
    }}
 \\end{itemize}` : '';

  return [preamble, header, educationSection, skillsSection, workSection, projectsSection, '\\end{document}']
    .filter(Boolean)
    .join('\n\n');
}
