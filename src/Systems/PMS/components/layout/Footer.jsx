import React from 'react';

export function Footer({ className = '' }) {
  return (
    <footer className={`py-1 px-4 text-center text-[10px] leading-none text-slate-400 flex items-center justify-center gap-1 uppercase tracking-wider font-medium select-none ${className}`}>
      <span>Powered by</span>
      <strong className="font-bold text-slate-700 tracking-wider">Botivate</strong>
    </footer>
  );
}

