import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  getTodayJalali,
  getDaysInJalaliMonth,
  jalaliToGregorian,
  toPersianDigits
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
  const [openUpwards, setOpenUpwards] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Convert Persian/Arabic digits to English digits
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  const initialParts = value ? value.split('/').map(Number) : [1405, 8, 1];
  const [viewYear, setViewYear] = useState<number>(initialParts[0] || 1405);
  const [viewMonth, setViewMonth] = useState<number>(initialParts[1] || 8);

  useEffect(() => {
    if (value) {
      setInputValue(value);
      const parts = value.split('/').map(Number);
      if (parts.length === 3 && parts[0] > 1300 && parts[1] >= 1 && parts[1] <= 12) {
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

  // Detect whether to open upwards or downwards to avoid clipping in modals / scroll containers
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const scrollParent = dropdownRef.current.closest('.overflow-y-auto') || dropdownRef.current.closest('.overflow-auto');
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceInParentBelow = parentRect.bottom - rect.bottom;
        if (spaceInParentBelow < 280 && rect.top - parentRect.top > 200) {
          setOpenUpwards(true);
          return;
        }
      }
      if (spaceBelow < 280 && rect.top > 250) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Parse and validate manual date input
  const parseJalaliInput = (raw: string): string | null => {
    const clean = toEnglishDigits(raw).trim();
    if (!clean) return null;

    let y = 0, m = 0, d = 0;

    if (clean.includes('/')) {
      const parts = clean.split('/').map(p => parseInt(p, 10));
      if (parts.length === 3) {
        [y, m, d] = parts;
      }
    } else if (/^\d{8}$/.test(clean)) {
      y = parseInt(clean.substring(0, 4), 10);
      m = parseInt(clean.substring(4, 6), 10);
      d = parseInt(clean.substring(6, 8), 10);
    }

    if (y >= 1300 && y <= 1500 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const maxDays = getDaysInJalaliMonth(y, m);
      const validDay = Math.min(d, maxDays);
      return `${y}/${String(m).padStart(2, '0')}/${String(validDay).padStart(2, '0')}`;
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    const parsed = parseJalaliInput(text);
    if (parsed) {
      onChange(parsed);
      const parts = parsed.split('/').map(Number);
      setViewYear(parts[0]);
      setViewMonth(parts[1]);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseJalaliInput(inputValue);
    if (parsed) {
      setInputValue(parsed);
      onChange(parsed);
      const parts = parsed.split('/').map(Number);
      setViewYear(parts[0]);
      setViewMonth(parts[1]);
    } else {
      setInputValue(value || getTodayJalali());
    }
  };

  const totalDays = getDaysInJalaliMonth(viewYear, viewMonth);

  // Calculate day of week for the first day of viewMonth
  const [gy, gm, gd] = jalaliToGregorian(viewYear, viewMonth, 1);
  const gDate = new Date(gy, gm - 1, gd);
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
    setInputValue(formatted);
    onChange(formatted);
    setIsOpen(false);
  };

  const setToday = () => {
    const today = getTodayJalali();
    setInputValue(today);
    onChange(today);
    const parts = today.split('/').map(Number);
    setViewYear(parts[0]);
    setViewMonth(parts[1]);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-40' : ''}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input container allowing direct keyboard typing + calendar button */}
      <div
        dir="ltr"
        className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5 rounded-md hover:bg-slate-100"
          title={isPersian ? 'باز کردن تقویم' : 'Open Calendar'}
        >
          <Calendar className="w-4 h-4 shrink-0" />
        </button>

        <input
          type="text"
          dir="ltr"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleInputBlur();
              setIsOpen(false);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder="1405/08/03"
          maxLength={10}
          className="w-full bg-transparent text-sm font-bold font-b-mitra text-slate-800 text-center focus:outline-hidden"
          title={isPersian ? 'تاریخ را تایپ کنید یا از تقویم انتخاب نمایید' : 'Type Jalali date or pick from calendar'}
        />

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded cursor-pointer select-none font-b-nazanin"
        >
          {isPersian ? 'تقویم' : 'Cal'}
        </button>
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 ${
            openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            isPersian ? 'right-0' : 'left-0'
          } w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={isPersian ? handleNextMonth : handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="font-bold text-sm text-slate-800 font-b-mitra">
              {PERSIAN_MONTHS[viewMonth - 1]} {isPersian ? toPersianDigits(viewYear) : viewYear}
            </div>
            <button
              type="button"
              onClick={isPersian ? handlePrevMonth : handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-1">
            {PERSIAN_WEEKDAYS.map((wd, i) => (
              <span key={i} className="py-1">
                {wd[0]}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-b-mitra">
            {Array.from({ length: persianFirstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const formattedDay = `${viewYear}/${String(viewMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
              const isSelected = value === formattedDay;
              const isToday = getTodayJalali() === formattedDay;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isToday
                      ? 'border border-blue-500 text-blue-600 hover:bg-blue-50'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {isPersian ? toPersianDigits(day) : day}
                </button>
              );
            })}
          </div>

          {/* Footer Today Button & Direct Typing Hint */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-b-nazanin">
            <span className="text-[11px] text-slate-400">
              {isPersian ? 'امکان تایپ مستقیم تاریخ' : 'Direct date typing enabled'}
            </span>
            <button
              type="button"
              onClick={setToday}
              className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {isPersian ? 'امروز' : 'Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
