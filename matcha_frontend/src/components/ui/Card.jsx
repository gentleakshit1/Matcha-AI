import React from 'react';

export const Card = ({ className = '', children, ...props }) => {
  return (
    <div className={`bg-[#ffffff] rounded-[16px] p-[24px] border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.04)] ${className}`} {...props}>
      {children}
    </div>
  );
};

export const GradientOrbCard = ({ color = 'mint', className = '', children, ...props }) => {
  const orbColors = {
    mint: 'var(--color-gradient-mint)',
    peach: 'var(--color-gradient-peach)',
    lavender: 'var(--color-gradient-lavender)',
    sky: 'var(--color-gradient-sky)',
    rose: 'var(--color-gradient-rose)',
  };

  return (
    <div className={`relative bg-[#fafafa] rounded-[24px] p-[32px] overflow-hidden ${className}`} {...props}>
      <div 
        className="absolute inset-0 opacity-40 mix-blend-multiply blur-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${orbColors[color]} 0%, transparent 60%)`
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
