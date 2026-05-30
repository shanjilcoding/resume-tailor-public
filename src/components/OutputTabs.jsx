import React, { useState } from 'react';
import { AlertTriangle, Check, ClipboardCopy, Download, ExternalLink, FileCode2, Loader2, Mail, TerminalSquare } from 'lucide-react';
import Button from './Button.jsx';
import Card from './Card.jsx';
import { copyToClipboard } from '../lib/clipboard.js';
import { downloadCoverLetter, downloadLatex, downloadWorkdayScript, openInOverleaf } from '../lib/download.js';

const PLACEHOLDERS = {
  latex:         'Your tailored resume will appear here after you generate.',
  coverLetter:   'Your cover letter will appear here after you generate.',
  workdayScript: 'Your Workday autofill script will appear here after you generate.',
};

const INSTRUCTIONS = {
  latex:         'Click "Copy", then "Open in Overleaf". In Overleaf, open Jake\'s resume as a template, log in/create an account if needed, delete the example main.tex code, paste your LaTeX, recompile, then download the PDF. Use "Download .tex" if you want a local backup.',
  coverLetter:   'Click "Copy" and paste into your application, email, or a document. Review and personalize before sending.',
  workdayScript: "Open the employer's Workday \"My Experience\" page, press F12, open the Console tab, paste the script, and press Enter. It clears existing entries and refills everything. Review every field before saving. Workday layouts vary by company — best-effort automation.",
};

function OutputCard({ title, subtitle, Icon, content, loading, placeholder, instructions, onToast, children }) {
  const [copied, setCopied] = useState(false);
  const isFilled = !!content && !loading;

  async function copy() {
    const ok = await copyToClipboard(content || '');
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
    onToast?.(ok ? 'Copied!' : 'Copy failed.');
  }

  const previewLines = (content || '').split('\n').slice(0, 4).join('\n');
  const hasMore = (content || '').split('\n').length > 4;

  return (
    <Card className={`flex flex-col gap-4 transition-colors ${!isFilled && !loading ? 'border-slate-200/60 bg-slate-50/50' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isFilled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
          <Icon size={16} />
        </span>
        <div>
          <p className={`font-semibold transition-colors ${isFilled ? 'text-slate-900' : 'text-slate-500'}`}>{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex min-h-20 items-center justify-center rounded-lg bg-slate-100 animate-pulse">
          <Loader2 size={16} className="animate-spin text-slate-400" />
        </div>
      ) : isFilled ? (
        <pre className="max-h-20 overflow-hidden rounded-lg bg-slate-950 px-3 py-2.5 text-[10px] leading-relaxed text-slate-400 select-none">
          {previewLines}{hasMore && '\n…'}
        </pre>
      ) : (
        <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center">
          <p className="text-xs text-slate-400">{placeholder}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy} disabled={!isFilled}>
          {copied ? <Check size={13} className="text-emerald-600" /> : <ClipboardCopy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        {React.Children.map(children, child =>
          React.isValidElement(child) ? React.cloneElement(child, { disabled: !isFilled }) : child
        )}
      </div>

      {/* Per-box instructions */}
      <div className={`mt-auto border-t border-slate-100 pt-3 transition-opacity ${!isFilled ? 'opacity-50' : ''}`}>
        <p className="text-xs leading-relaxed text-slate-500">{instructions}</p>
      </div>
    </Card>
  );
}

export default function OutputTabs({ outputs, loading, company, jobTitle, onToast }) {
  return (
    <div className="space-y-4">
      {outputs && !loading && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
          Wording can be optimized, but verify dates, metrics, tools used, and seniority level before submitting.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <OutputCard
          title="Tailored Resume"
          subtitle="LaTeX format"
          Icon={FileCode2}
          content={outputs?.latex}
          loading={loading}
          placeholder={PLACEHOLDERS.latex}
          instructions={INSTRUCTIONS.latex}
          onToast={onToast}
        >
          <Button variant="secondary" size="sm" onClick={() => downloadLatex(outputs?.latex, company, jobTitle)}>
            <Download size={13} /> Download .tex
          </Button>
          <Button size="sm" onClick={() => openInOverleaf(outputs?.latex)}>
            <ExternalLink size={13} /> Open in Overleaf
          </Button>
        </OutputCard>

        <OutputCard
          title="Cover Letter"
          subtitle="Plain text"
          Icon={Mail}
          content={outputs?.coverLetter}
          loading={loading}
          placeholder={PLACEHOLDERS.coverLetter}
          instructions={INSTRUCTIONS.coverLetter}
          onToast={onToast}
        >
          <Button variant="secondary" size="sm" onClick={() => downloadCoverLetter(outputs?.coverLetter, company, jobTitle)}>
            <Download size={13} /> Download .txt
          </Button>
        </OutputCard>

        <OutputCard
          title="Workday Script"
          subtitle="Browser console script"
          Icon={TerminalSquare}
          content={outputs?.workdayScript}
          loading={loading}
          placeholder={PLACEHOLDERS.workdayScript}
          instructions={INSTRUCTIONS.workdayScript}
          onToast={onToast}
        >
          <Button variant="secondary" size="sm" onClick={() => downloadWorkdayScript(outputs?.workdayScript, company, jobTitle)}>
            <Download size={13} /> Download .js
          </Button>
        </OutputCard>
      </div>
    </div>
  );
}
