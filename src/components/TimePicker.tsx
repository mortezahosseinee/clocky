import React from 'react';
import { Clock } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  isPersian?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  isPersian = true
}) => {
  // Normalize value into hours and minutes
  const [h, m] = value && value.includes(':') ? value.split(':') : ['08', '00'];

  const handleHourChange = (newH: string) => {
    onChange(`${newH.padStart(2, '0')}:${m}`);
  };

  const handleMinuteChange = (newM: string) => {
    onChange(`${h}:${newM.padStart(2, '0')}`);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Force dir="ltr" so Hour is ALWAYS on the left and Minute is ALWAYS on the right */}
      <div
        dir="ltr"
        className="flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-xl shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent text-left"
      >
        <div className="flex items-center gap-1.5 font-b-mitra font-time">
          <Clock className="w-4 h-4 text-slate-400 shrink-0 mr-1" />

          {/* Hour Select (ALWAYS ON LEFT) */}
          <select
            tabIndex={0}
            value={h}
            onChange={(e) => handleHourChange(e.target.value)}
            className="bg-transparent text-xs font-bold font-b-mitra text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/70 cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-50 transition-all"
            title={isPersian ? 'ساعت' : 'Hour'}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const val = String(i).padStart(2, '0');
              return (
                <option key={val} value={val} className="font-b-mitra">
                  {isPersian ? toPersianDigits(val) : val}
                </option>
              );
            })}
          </select>

          <span className="text-slate-400 font-bold px-0.5">:</span>

          {/* Minute Select (ALWAYS ON RIGHT) */}
          <select
            tabIndex={0}
            value={m}
            onChange={(e) => handleMinuteChange(e.target.value)}
            className="bg-transparent text-xs font-bold font-b-mitra text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/70 cursor-pointer px-1 py-0.5 rounded-md hover:bg-slate-50 transition-all"
            title={isPersian ? 'دقیقه' : 'Minute'}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const val = String(i).padStart(2, '0');
              return (
                <option key={val} value={val} className="font-b-mitra">
                  {isPersian ? toPersianDigits(val) : val}
                </option>
              );
            })}
          </select>
        </div>

        <span className="text-[10px] text-slate-400 font-medium select-none ml-2">
          {isPersian ? 'ساعت : دقیقه' : 'HH : MM'}
        </span>
      </div>
    </div>
  );
};
