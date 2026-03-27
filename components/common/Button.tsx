import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, fullWidth = false, className, ...props }) => {
  const widthClass = fullWidth ? 'w-full' : '';

  const baseClasses = [
    'px-6', 'py-3',
    'font-bold', 'text-white',
    'bg-blue-600', 'rounded-lg',
    'hover:bg-blue-700',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2', 'focus:ring-offset-slate-900', 'focus:ring-blue-500',
    'disabled:bg-slate-500', 'disabled:cursor-not-allowed',
    'transition-all', 'duration-300', 'ease-in-out',
    'shadow-lg', 'hover:shadow-blue-500/50',
    'transform', 'hover:-translate-y-0.5'
  ].join(' ');

  return (
    <button
      className={`${baseClasses} ${widthClass} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;