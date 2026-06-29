import React, { useEffect, useState } from 'react';

const Preloader = ({ onComplete }) => {
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Keep the preloader visible for 2 seconds, then fade out
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => onComplete(), 800); // Wait for fade transition
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-canvas transition-opacity duration-700 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center justify-center text-center">
        {/* Soft pastel orbs behind text */}
        <div className="absolute w-96 h-96 bg-[radial-gradient(circle_at_center,_var(--color-gradient-mint)_0%,_transparent_70%)] opacity-40 animate-pulse-slow mix-blend-multiply blur-2xl -translate-x-12 -translate-y-8"></div>
        <div className="absolute w-96 h-96 bg-[radial-gradient(circle_at_center,_var(--color-gradient-peach)_0%,_transparent_70%)] opacity-30 animate-pulse-slow mix-blend-multiply blur-2xl translate-x-12 translate-y-8" style={{ animationDelay: '1s' }}></div>
        
        {/* Typography */}
        <h1 className="relative font-display text-5xl sm:text-6xl text-ink font-light tracking-tight mb-3 z-10" style={{ letterSpacing: '-0.02em' }}>Matcha AI</h1>
        <p className="relative font-sans text-[13px] text-muted tracking-[0.1em] uppercase font-semibold z-10">Curating Talent</p>
      </div>
    </div>
  );
};

export default Preloader;
