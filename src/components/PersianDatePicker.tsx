import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  getTodayJalali,
  getCurrentJalaliParts,
  getDaysInJalaliMonth,
  jalaliToGregorian
} from '../utils/jalali';

interface PersianDatePickerProps {
  value: string; // YYYY/MM/DD
  onChange: (val: string) => void;
  label?: string;
  isPersian?: boolean;
  required?: boolean;
}

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  label,
  isPersian = true,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialParts = value ? value.split('/').map(Number) : [1405, 7, 1];
  const [viewYear, setViewYear] = useState<number>(initialParts[0] || 1405);
  const [viewMonth, setViewMonth] = useState<number>(initialParts[1] || 7);

  useEffect(() => {
    if (value) {
      const parts = value.split('/').map(Number);
      if (parts.length === 3) {
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalDays = getDaysInJalaliMonth(viewYear, viewMonth);

  // Calculate day of week for the first day of viewMonth
  const [gy, gm, gd] = jalaliToGregorian(viewYear, viewMonth, 1);
  const gDate = new Date(gy, gm - 1, gd);
  // In JS, 0 is Sunday, 6 is Saturday. In Persian, Saturday is index 0.
  const jsDay = gDate.getDay();
  const persianFirstDayOffset = (jsDay + 1) % 7;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const setToday = () => {
    const today = getTodayJalali();
    onChange(today);
    const parts = today.split('/').map(Number);
    setViewYear(parts[0]);
    setViewMonth(parts[1]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-xs cursor-pointer hover:border-slate-400 focus:outline-hidden text-sm"
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {value || (isPersian ? 'انتخاب تاریخ شمسی...' : 'Select Jalali Date...')}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-slate-800">
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={isPersian ? handleNextMonth : handlePrevMonth}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="font-bold text-sm text-slate-800">
              {PERSIAN_MONTHS[viewMonth - 1]} {viewYear}
            </div>
            <button
              type="button"
              onClick={isPersian ? handlePrevMonth : handleNextMonth}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
            {PERSIAN_WEEKDAYS.map((wd, i) => (
              <span key={i} className="py-1">
                {wd.substring(0, 1)}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: persianFirstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const formattedDay = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
              const isSelected = value === formattedDay;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 mx-auto rounded-full text-xs font-medium transition-colors flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-blue-50 text-slate-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick buttons */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={setToday}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isPersian ? 'امروز' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              {isPersian ? 'پاک کردن' : 'Clear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
