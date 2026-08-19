'use client';

import { useEffect } from 'react';
import { useMarkPageArrived, useNavigate } from '../lib/navigation';

export function NotFoundPage() {
  const navigate = useNavigate();
  // Tells app/loading.tsx the navigation that led here (if any) is over — see its comment.
  const markPageArrived = useMarkPageArrived();
  useEffect(markPageArrived, [markPageArrived]);

  return (
    <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center px-4">
      <div className="text-center max-w-lg animate-pop-in">
        <span className="material-symbols-outlined text-7xl! md:text-8xl! text-gray-600 animate-bounce inline-block">sports_soccer</span>
        <h1 className="text-8xl md:text-[10rem] leading-none font-black tracking-tighter mt-6">404</h1>
        <p className="text-gray-400 text-lg mt-5 mb-10">This page doesn't exist, or the match has already wrapped up.</p>
        <button
          className="px-8 py-4 bg-white text-black font-bold text-lg cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
