import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  variant?: 'dark' | 'light';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, variant = 'dark', ...props }, ref) => {
  const darkClasses = "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-blue-500 read-only:bg-slate-800 read-only:cursor-default read-only:text-slate-400";
  const lightClasses = "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 read-only:bg-gray-200 read-only:text-gray-500 read-only:cursor-default";
  
  const labelDark = "text-slate-300";
  const labelLight = "text-gray-700";

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium text-slate-300 mb-2 ${variant === 'light' ? labelLight : labelDark}`}>
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow duration-300 h-[42px] ${variant === 'light' ? lightClasses : darkClasses}`}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export default Input;