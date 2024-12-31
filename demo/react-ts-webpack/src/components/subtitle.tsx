import React from 'react';

export function Subtitle({ title }: { title: string }) {
  return (
    <div className="text-sm font-semibold text-gray-400 uppercase">{title}</div>
  );
}
