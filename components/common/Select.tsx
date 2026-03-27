import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: SelectOption[];
  variant?: 'dark' | 'light';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, id, options, variant = 'dark', ...props }, ref) => {
  const darkClasses = "bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400";
  const lightClasses = "bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500";
  
  const labelDark = "text-slate-300";
  const labelLight = "text-gray-700";

  const darkArrow = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23d1d5db' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`;
  const lightArrow = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`;

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium text-slate-300 mb-2 ${variant === 'light' ? labelLight : labelDark}`}>
        {label}
      </label>
      <select
        id={id}
        ref={ref}
        className={`w-full appearance-none pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow duration-300 h-[42px] ${variant === 'light' ? lightClasses : darkClasses}`}
        style={{
          backgroundImage: variant === 'light' ? lightArrow : darkArrow,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1em',
        }}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;