import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-1 mb-3 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
      <select
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 transition-all"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-gray-900 bg-white">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};