import React from 'react';

export const Button = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-sans text-[15px] font-medium h-[40px] rounded-[9999px] transition-colors cursor-pointer';
  
  const variants = {
    primary: 'bg-[#292524] text-[#ffffff] hover:bg-[#0c0a09] px-[20px]',
    outline: 'bg-transparent text-[#0c0a09] border border-[#d6d3d1] hover:bg-[#fafafa] px-[19px]',
    ghost: 'bg-transparent text-[#0c0a09] hover:bg-[#fafafa] px-[20px]',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
