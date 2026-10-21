import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  isPersian?: boolean;
  showLockIcon?: boolean;
  error?: string | null;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  required = false,
  isPersian = true,
  showLockIcon = true,
  error,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {showLockIcon && (
          <div className="absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
        )}

        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={`w-full py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all ${
            showLockIcon
              ? 'rtl:pr-9 rtl:pl-10 ltr:pl-9 ltr:pr-10'
              : 'rtl:pr-3.5 rtl:pl-10 ltr:pl-3.5 ltr:pr-10'
          } ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer focus:outline-hidden"
          title={showPassword ? (isPersian ? 'مخفی‌سازی رمز' : 'Hide password') : (isPersian ? 'نمایش رمز عبور' : 'Show password')}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-blue-600" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {error && <p className="text-[11px] text-red-600 mt-1 font-b-nazanin">{error}</p>}
    </div>
  );
};
