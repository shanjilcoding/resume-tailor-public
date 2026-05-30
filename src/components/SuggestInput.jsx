import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SuggestInput({ label, value, onChange, options, placeholder }) {
  const [open, setOpen]           = useState(false);
  const [dropPos, setDropPos]     = useState({ top: 0, left: 0, width: 0 });
  const containerRef              = useRef(null);
  const inputRef                  = useRef(null);

  // Show all options when empty or when the value is an exact match (user may want to change).
  // Otherwise filter by substring.
  const exactMatch = options.some(o => o.toLowerCase() === (value || '').toLowerCase());
  const filtered   = !value || exactMatch
    ? options
    : options.filter(o => o.toLowerCase().includes(value.toLowerCase()));

  // Compute fixed-position coordinates whenever the dropdown opens so that it
  // escapes the SectionCard's overflow:hidden without needing a portal.
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm transition-colors placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show suggestions"
          className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400 hover:text-slate-600"
          onClick={() => setOpen(o => !o)}
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          className="z-50 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm"
        >
          {filtered.map(opt => (
            <li
              key={opt}
              className="cursor-pointer px-3 py-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
              onMouseDown={e => {
                e.preventDefault(); // keep input focused so blur doesn't close before click
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
