import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Search, Trash2 } from 'lucide-react';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import OutputTabs from '../components/OutputTabs.jsx';
import { clearHistory, deleteFromHistory, getHistory } from '../lib/storage.js';

function scoreFromItem(item) {
  const jd    = (item.jobDescription || '').toLowerCase();
  const latex = (item.outputs?.latex || '').toLowerCase();
  const keys  = ['react','typescript','javascript','python','node','api','sql','aws','azure','testing','git','docker'];
  const hits  = keys.filter(k => jd.includes(k) && latex.includes(k)).length;
  return Math.min(96, 58 + hits * 5 + (item.jobTitle ? 7 : 0) + (item.company ? 5 : 0));
}

function scoreColor(score) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function formatDate(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

export default function History({ onToast }) {
  const [history, setHistory] = useState(getHistory);
  const [openId,  setOpenId]  = useState(null);
  const [query,   setQuery]   = useState('');

  const filtered = useMemo(
    () => history.filter(item => `${item.company} ${item.jobTitle}`.toLowerCase().includes(query.toLowerCase())),
    [history, query]
  );

  function remove(id) {
    deleteFromHistory(id);
    setHistory(getHistory());
    if (openId === id) setOpenId(null);
    onToast?.('Deleted history item.');
  }

  function clearAll() {
    if (!confirm('Clear all generation history?')) return;
    clearHistory();
    setHistory([]);
    onToast?.('History cleared.');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-500">Versions</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Versions</h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Reopen, export, and compare saved versions stored locally in this browser.
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="danger" onClick={clearAll}>
            <Trash2 size={14} /> Clear all history
          </Button>
        )}
      </div>

      {/* Search + count */}
      <Card className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div>
          <p className="font-semibold text-slate-900">{history.length} saved version{history.length === 1 ? '' : 's'}</p>
          <p className="text-xs text-slate-500">Newest first, stored in browser localStorage</p>
        </div>
        {history.length > 0 && (
          <label className="relative flex items-center" aria-label="Filter versions by company or role">
            <Search size={14} className="absolute left-3 text-slate-400" aria-hidden="true" />
            <input
              aria-label="Filter by company or role"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-72"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by company or role..."
            />
          </label>
        )}
      </Card>

      {/* Empty states */}
      {history.length === 0 && (
        <Card className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-100">
            <Clock size={24} className="text-slate-400" />
          </div>
          <h2 className="font-semibold text-slate-900">No saved versions yet</h2>
          <p className="mt-1 text-sm text-slate-500">Go to Tailor and create your first application packet.</p>
        </Card>
      )}
      {history.length > 0 && filtered.length === 0 && (
        <Card className="py-8 text-center text-sm text-slate-500">No versions match that filter.</Card>
      )}

      {/* History cards */}
      {filtered.map(item => {
        const isOpen = openId === item.id;
        const score  = scoreFromItem(item);
        return (
          <Card key={item.id} className="space-y-0 overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenId(isOpen ? null : item.id)}
              >
                <p className="mb-1 text-xs font-medium text-slate-400">{formatDate(item.date)}</p>
                <h2 className="text-base font-semibold text-slate-900">
                  {item.jobTitle || 'Unknown role'}
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-slate-600">{item.company || 'Unknown company'}</span>
                </h2>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">{item.jobDescription || 'No job description stored.'}</p>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${scoreColor(score)}`}>
                  Match {score}%
                </span>
                <Button size="sm" variant="secondary" onClick={() => setOpenId(isOpen ? null : item.id)}>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isOpen ? 'Close' : 'Open'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-1 border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-xs text-slate-500 sm:grid-cols-4">
              <span>Format: LaTeX</span>
              <span>Cover letter: included</span>
              <span>Workday script: included</span>
              <span>Mode: {item.meta?.rewriteMode || 'balanced'}</span>
            </div>

            {isOpen && (
              <div className="animate-fade-up border-t border-slate-200 p-5">
                <OutputTabs outputs={item.outputs} company={item.company} jobTitle={item.jobTitle} onToast={onToast} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
