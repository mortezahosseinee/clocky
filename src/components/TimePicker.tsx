import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';
import { toPersianDigits } from '../utils/jalali';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  isPersian?: boolean;
}

const COMMON_TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:15', '17:30', '17:45',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '22:00', '23:00'
];

const PRESETS = [
  { labelFa: '۰۸:۰۰', labelEn: '08:00', time: '08:00' },
  { labelFa: '۰۸:۳۰', labelEn: '08:30', time: '08:30' },
  { labelFa: '۱۲:۰۰', labelEn: '12:00', time: '12:00' },
  { labelFa: '۱۴:۰۰', labelEn: '14:00', time: '14:00' },
  { labelFa: '۱۷:۰۰', labelEn: '17:00', time: '17:00' }
];

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  isPersian = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'custom'>('list');
  const [inputValue, setInputValue] = useState(value || '08:00');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Normalize digits from Persian/Arabic to English
  const toEnglishDigits = (str: string) => {
    return str
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  // Synchronize internal state with external value prop
  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse hours and minutes from current value
  const [currentH, currentM] = (value && value.includes(':') ? value : '08:00').split(':');

  // Parse and validate manual user input
  const parseTime = (raw: string): string | null => {
    const clean = toEnglishDigits(raw).trim();
    if (!clean) return null;

    // Pattern 1: HH:mm or H:m
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1] !== undefined && parts[1] !== '' ? parseInt(parts[1], 10) : 0;
      if (!isNaN(h) && h >= 0 && h < 24 && !isNaN(m) && m >= 0 && m < 60) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // Pattern 2: Pure digits (e.g., "8", "14", "830", "1430")
    if (/^\d{1,4}$/.test(clean)) {
      if (clean.length <= 2) {
        const h = parseInt(clean, 10);
        if (h >= 0 && h < 24) {
          return `${String(h).padStart(2, '0')}:00`;
        }
      } else if (clean.length === 3) {
        // e.g. 830 -> 08:30
        const h = parseInt(clean.substring(0, 1), 10);
        const m = parseInt(clean.substring(1, 3), 10);
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      } else if (clean.length === 4) {
        // e.g. 1430 -> 14:30
        const h = parseInt(clean.substring(0, 2), 10);
        const m = parseInt(clean.substring(2, 4), 10);
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      }
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // If user typed a full valid time (e.g. "08:30" or "14:15"), trigger onChange immediately
    const parsed = parseTime(text);
    if (parsed && text.includes(':') && text.length >= 4) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseTime(inputValue);
    if (parsed) {
      setInputValue(parsed);
      onChange(parsed);
    } else {
      setInputValue(value || '08:00');
    }
  };

  const handleSelectTime = (timeStr: string) => {
    setInputValue(timeStr);
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const formatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    handleSelectTime(formatted);
  };

  const handleHourClick = (newH: string) => {
    const formatted = `${newH}:${currentM || '00'}`;
    setInputValue(formatted);
    onChange(formatted);
  };

  const handleMinuteClick = (newM: string) => {
    const formatted = `${currentH || '08'}:${newM}`;
    setInputValue(formatted);
    onChange(formatted);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Input Container with Direct Typing & Dropdown Toggle */}
      <div
        dir="ltr"
        className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
      >
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5 rounded-md hover:bg-slate-100"
            title={isPersian ? 'نمایش لیست ساعات' : 'Show Time List'}
          >
            <Clock className="w-4 h-4 shrink-0" />
          </button>

          {/* Editable text input for typing time manually */}
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
            placeholder="08:00"
            maxLength={8}
            className="w-full bg-transparent text-sm font-bold font-b-mitra font-time text-slate-800 text-left focus:outline-hidden"
            title={isPersian ? 'ساعت را تایپ کنید یا از لیست انتخاب نمایید' : 'Type time or pick from list'}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 px-1 py-0.5 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
          title={isPersian ? 'انتخاب از لیست' : 'Select from list'}
        >
          <span className="text-[10px] text-slate-400 font-medium select-none hidden sm:inline">
            {isPersian ? 'HH:mm' : 'HH:mm'}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Dropdown Panel with Quick Presets, Times List, and Hour/Minute Picker */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={handleSetCurrentTime}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition-colors shrink-0 font-b-nazanin cursor-pointer"
            >
              {isPersian ? 'هم‌اکنون' : 'Now'}
            </button>
            {PRESETS.map((p) => {
              const isSelected = value === p.time;
              return (
                <button
                  key={p.time}
                  type="button"
                  onClick={() => handleSelectTime(p.time)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors shrink-0 font-b-mitra cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isPersian ? p.labelFa : p.labelEn}
                </button>
              );
            })}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg mb-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-1 rounded-md transition-all cursor-pointer font-b-nazanin ${
                activeTab === 'list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isPersian ? 'لیست ساعات' : 'Times List'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-1 rounded-md transition-all cursor-pointer font-b-nazanin ${
                activeTab === 'custom'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isPersian ? 'ساعت و دقیقه' : 'Hour & Minute'}
            </button>
          </div>

          {/* Tab 1: Scrollable List of Common Times */}
          {activeTab === 'list' && (
            <div
              ref={listContainerRef}
              className="max-h-52 overflow-y-auto grid grid-cols-3 gap-1.5 p-1 pr-2"
              dir="ltr"
            >
              {COMMON_TIMES.map((t) => {
                const isSelected = value === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSelectTime(t)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold font-b-mitra transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/60'
                    }`}
                  >
                    <span>{isPersian ? toPersianDigits(t) : t}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Hour and Minute Columns */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-2 gap-2 pt-1" dir="ltr">
              {/* Hours Column */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1 text-center font-b-nazanin">
                  {isPersian ? 'ساعت (۰-۲۳)' : 'Hour (0-23)'}
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1 p-0.5 border border-slate-100 rounded-xl bg-slate-50/50">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hStr = String(i).padStart(2, '0');
                    const isSelected = currentH === hStr;
                    return (
                      <button
                        key={hStr}
                        type="button"
                        onClick={() => handleHourClick(hStr)}
                        className={`w-full py-1 rounded-md text-xs font-bold font-b-mitra transition-colors cursor-pointer text-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'hover:bg-blue-50 text-slate-700'
                        }`}
                      >
                        {isPersian ? toPersianDigits(hStr) : hStr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Column */}
              <div>
                <span className="block text-[10px] font-bold text-slate-400 mb-1 text-center font-b-nazanin">
                  {isPersian ? 'دقیقه (۵ دقیقه‌ای)' : 'Minute (0-55)'}
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1 p-0.5 border border-slate-100 rounded-xl bg-slate-50/50">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const mStr = String(i * 5).padStart(2, '0');
                    const isSelected = currentM === mStr;
                    return (
                      <button
                        key={mStr}
                        type="button"
                        onClick={() => handleMinuteClick(mStr)}
                        className={`w-full py-1 rounded-md text-xs font-bold font-b-mitra transition-colors cursor-pointer text-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'hover:bg-blue-50 text-slate-700'
                        }`}
                      >
                        {isPersian ? toPersianDigits(mStr) : mStr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Close Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-b-nazanin">
            <span className="text-[11px] text-slate-400">
              {isPersian ? 'امکان تایپ مستقیم در فیلد وجود دارد' : 'Direct keyboard typing supported'}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isPersian ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
