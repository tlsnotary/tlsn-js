import React from 'react';
import { Logo } from './logo';

export function Header() {
  return (
    <div className="flex flex-col items-center justify-center gap-1 mb-8">
      <Logo />
      <span className="text-xs font-light tracking-wider uppercase">
        Verifier
      </span>
    </div>
  );
}
