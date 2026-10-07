import React from 'react';
import { X, GitCommit, Calendar, Tag } from 'lucide-react';
import { CHANGELOG, APP_CURRENT_VERSION } from '../utils/changelog';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPersian?: boolean;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  isPersian = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {isPersian ? 'تغییرات نسخه‌ها و گزارش به‌روزرسانی (Changelog)' : 'Release Notes & Changelog'}
              </h3>
              <p className="text-xs text-slate-500">
                {isPersian ? `نسخه فعلی فعال در سامانه: ${APP_CURRENT_VERSION}` : `Current active release: ${APP_CURRENT_VERSION}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto p-6 space-y-6">
          {CHANGELOG.map((item, idx) => {
            const isCurrent = item.version === APP_CURRENT_VERSION;
            return (
              <div
                key={item.version}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'border-blue-200 bg-blue-50/30 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                      isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        {isPersian ? 'نسخه فعلی' : 'Current'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isPersian ? item.releaseDateFa : item.releaseDate}</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-800 mb-2">
                  {isPersian ? item.titleFa : item.titleEn}
                </h4>

                <ul className="space-y-1.5 text-xs text-slate-600 list-disc pr-4 pl-4">
                  {(isPersian ? item.changesFa : item.changesEn).map((change, cIdx) => (
                    <li key={cIdx} className="leading-relaxed">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs"
          >
            {isPersian ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
