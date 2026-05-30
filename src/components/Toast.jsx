import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-toast-in flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
      <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
      {message}
    </div>
  );
}
