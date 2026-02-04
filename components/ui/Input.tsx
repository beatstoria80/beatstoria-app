
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-1 mb-3 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
      <input
        className="w-full bg-white text-gray-900 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
        {...props}
      />
    </div>
  );
};
