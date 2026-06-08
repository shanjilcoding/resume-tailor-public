import React, { Component, useState } from 'react';
import { Clock, FileText, Settings, Wand2 } from 'lucide-react';
import Toast from './components/Toast.jsx';
import Generator from './pages/Generator.jsx';
import History from './pages/History.jsx';
import MyExperience from './pages/MyExperience.jsx';
import SettingsPage from './pages/Settings.jsx';
import { getHistory } from './lib/storage.js';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="mb-1 font-semibold text-red-800">Something went wrong</p>
          <pre className="overflow-auto text-xs text-red-700">{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const pages = [
  { id: 'generator',  label: 'Tailor',    helper: 'Create application', Icon: Wand2,    component: Generator },
  { id: 'experience', label: 'My Experience', helper: 'Resume profile',    Icon: FileText, component: MyExperience },
  { id: 'history',    label: 'Versions',   helper: 'Saved outputs',      Icon: Clock,    component: History },
  { id: 'settings',   label: 'Settings',   helper: 'Defaults & privacy', Icon: Settings, component: SettingsPage },
];

export default function App() {
  const [page, setPage] = useState('generator');
  const [toast, setToast] = useState('');
  const [hasGenerationHistory, setHasGenerationHistory] = useState(() => getHistory().length > 0);
  const currentPage = pages.find(p => p.id === page) || pages[0];
  const Active = currentPage.component;

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(''), 2400);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,#eef2ff_0%,transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-slate-950 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar — desktop */}
      <aside className="hidden border-r border-slate-200/80 bg-white/90 backdrop-blur lg:flex lg:min-h-screen lg:flex-col lg:p-4">
        {/* Brand block */}
        <div className="mb-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-md">
          <div className="mb-2.5 inline-flex size-8 items-center justify-center rounded-lg bg-indigo-500 shadow-sm">
            <Wand2 size={15} />
          </div>
          <h1 className="text-base font-semibold tracking-tight">Resume Tailor</h1>
          <p className="mt-0.5 text-xs text-slate-400">Guided application workspace</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {pages.map(({ id, label, helper, Icon: NavIcon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPage(id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                  active
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                }`}>
                  {React.createElement(NavIcon, { size: 15 })}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${active ? 'text-indigo-900' : ''}`}>{label}</span>
                  <span className="block truncate text-xs text-slate-400">{helper}</span>
                </span>
                {active && <span className="ml-auto h-5 w-1 rounded-full bg-indigo-500" />}
              </button>
            );
          })}
        </nav>

        {/* Footer tip */}
        {!hasGenerationHistory && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <span className="font-medium text-slate-700">Flow:</span> build profile → paste job → tailor → review → export.
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
            <Wand2 size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold">Resume Tailor</span>
        </div>
        <span className="text-sm font-medium text-slate-700">{currentPage.label}</span>
      </header>

      {/* Page content */}
      <main className="p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
        <ErrorBoundary key={page}>
          <Active onToast={showToast} onGenerationSaved={() => setHasGenerationHistory(true)} />
        </ErrorBoundary>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200/80 bg-white/95 backdrop-blur lg:hidden">
        {pages.map(({ id, label, Icon: NavIcon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPage(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {React.createElement(NavIcon, { size: 18, className: active ? 'text-indigo-600' : 'text-slate-400' })}
              {label}
            </button>
          );
        })}
      </nav>

      <Toast message={toast} />
    </div>
  );
}
