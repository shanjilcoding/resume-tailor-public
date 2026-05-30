import React from 'react';

function barColor(v) {
  if (v < 30) return 'bg-red-500';
  if (v < 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}
function labelColor(v) {
  if (v < 30) return 'text-red-600';
  if (v < 60) return 'text-amber-600';
  return 'text-emerald-600';
}

export default function CompletenessBar({ value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Profile strength</span>
        <span className={`font-semibold tabular-nums ${labelColor(value)}`}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
