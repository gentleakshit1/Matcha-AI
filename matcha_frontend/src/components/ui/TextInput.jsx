import React from 'react';

export const TextInput = ({ className = '', ...props }) => {
  return (
    <input 
      className={`bg-[#ffffff] text-[#0c0a09] font-sans text-[16px] rounded-[8px] px-[16px] py-[12px] h-[44px] border border-[#d6d3d1] focus:outline-none focus:border-[2px] focus:border-[#0c0a09] focus:px-[15px] focus:py-[11px] transition-all w-full ${className}`}
      {...props}
    />
  );
};
