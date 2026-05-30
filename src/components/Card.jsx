import React from 'react';
export default function Card({ className = '', ...props }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}
