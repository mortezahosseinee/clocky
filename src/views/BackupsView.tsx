import React, { useState, useMemo } from 'react';
import { User, MonthlyBackup } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatMinutes } from '../utils/jalali';
import {
  DatabaseBackup,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface BackupsViewProps {
  user: User;
  lang: Language;
}

export const BackupsView: React.FC<BackupsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const [backups, setBackups] = useState<MonthlyBackup[]>(() =>
    StorageService.getBackups()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'month' | 'date' | 'hours'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reload = () => {
    setBackups(StorageService.getBackups());
  };

  const filteredAndSortedBackups = useMemo(() => {
    return backups
      .filter(b => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchMonthFa = b.monthTitleFa.toLowerCase().includes(q);
          const matchMonthEn = b.monthTitleEn.toLowerCase().includes(q);
          const matchKey = b.monthKey.toLowerCase().includes(q);
          if (!matchMonthFa && !matchMonthEn && !matchKey) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'month') diff = a.monthKey.localeCompare(b.monthKey);
        else if (sortField === 'date') diff = a.dateCreated.localeCompare(b.dateCreated);
        else if (sortField === 'hours') diff = a.totalDurationMinutes - b.totalDurationMinutes;
        return sortAsc ? diff : -diff;
      });
  }, [backups, searchQuery, sortField, sortAsc]);

  const handleGenerateNow = () => {
    const created = StorageService.generateMonthlyBackup(true);
    if (created) {
      setSuccessMessage(
        isPersian
          ? `پشتیبان ${created.monthTitleFa} با موفقیت تولید شد و فایل روزهای قبلی همین ماه جایگزین گردید.`
          : `Backup for ${created.monthTitleEn} successfully refreshed.`
      );
      reload();
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      StorageService.deleteBackup(deleteTargetId);
      setDeleteTargetId(null);
      reload();
    }
  };

  const downloadBackupExcel = (bkp: MonthlyBackup) => {
    const columns: ExportColumn[] = [
      { header: t.userCol, key: 'userName', width: 22 },
      { header: t.jobTitle, key: 'jobTitle', width: 20 },
      {
        header: t.regularWork,
        key: 'regularMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.leaveRecord,
        key: 'leaveMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.missionRecord,
        key: 'missionMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.specialWorkRecord,
        key: 'specialMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: isPersian ? 'مجموع کل کارکرد' : 'Grand Total',
        key: 'totalMinutes',
        width: 20,
        format: min => formatMinutes(min, isPersian)
      }
    ];

    exportTableToExcel(
      bkp.fileNameExcel,
      'MonthlyBackup',
      columns,
      bkp.dataSummary,
      isPersian
    );
  };

  const downloadBackupPdf = (bkp: MonthlyBackup) => {
    const columns: ExportColumn[] = [
      { header: t.userCol, key: 'userName', width: 22 },
      { header: t.jobTitle, key: 'jobTitle', width: 18 },
      {
        header: t.regularWork,
        key: 'regularMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.leaveRecord,
        key: 'leaveMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.missionRecord,
        key: 'missionMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: t.specialWorkRecord,
        key: 'specialMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      {
        header: isPersian ? 'مجموع کل کارکرد' : 'Grand Total',
        key: 'totalMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      }
    ];

    exportTableToPdfPrint(
      isPersian ? `نسخه پشتیبان و بایگانی کارکرد ماه ${bkp.monthTitleFa}` : `Monthly Attendance Backup - ${bkp.monthTitleEn}`,
      isPersian ? `تاریخ ثبت آرشیو: ${bkp.dateCreated}` : `Archived Date: ${bkp.dateCreated}`,
      columns,
      bkp.dataSummary,
      isPersian
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <DatabaseBackup className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.backups}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'آرشیو اتوماتیک پایان شب و مدیریت فایل‌های ماهانه به تفکیک پرسنل فعال'
                : 'Automated nightly snapshots and monthly attendance archives'}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateNow}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t.createBackupNow}</span>
        </button>
      </div>

      {/* Logic Notice Box */}
      {/* "به صورت خودکار هر شب ساعت دوازده شب یه گزارش از کارکردها به تفکیک افراد در هر سطر (کارکنان فعال) گرفته میشه مربوط به اون ماه جاری شمسی بعد در یک فایل اکسل و پی دی اف ذخیره میشه... خودکار گزارش دیروز رو پاک میکنه... در نهایت من هیچ وقت در فایل هام برای یک ماه شمسی بیش از یه فایل ندارم." */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 space-y-1">
          <div className="font-bold">
            {isPersian ? 'مکانیزم هوشمند پشتیبان‌گیری و پاکسازی روزانه:' : 'Automated Retention & Cleanup Policy:'}
          </div>
          <p className="leading-relaxed font-b-nazanin">
            {t.autoBackupNotice}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm text-slate-800">
              {isPersian ? 'فهرست فایل‌های پشتیبان ماهانه' : 'Monthly Archive Files'}
            </h3>
            <span className="text-xs text-slate-400 font-b-nazanin">
              {filteredAndSortedBackups.length} {isPersian ? 'فایل' : 'files'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-52">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isPersian ? 'جستجو در ماه‌ها...' : 'Search months...'}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-semibold">{t.filter}:</span>
              <button
                onClick={() => {
                  if (sortField === 'month') setSortAsc(!sortAsc);
                  else { setSortField('month'); setSortAsc(false); }
                }}
                className={`px-2 py-1 rounded-md cursor-pointer ${sortField === 'month' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {isPersian ? 'ماه' : 'Month'}
              </button>
              <button
                onClick={() => {
                  if (sortField === 'date') setSortAsc(!sortAsc);
                  else { setSortField('date'); setSortAsc(false); }
                }}
                className={`px-2 py-1 rounded-md cursor-pointer ${sortField === 'date' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {isPersian ? 'تاریخ ایجاد' : 'Date'}
              </button>
              <button
                onClick={() => {
                  if (sortField === 'hours') setSortAsc(!sortAsc);
                  else { setSortField('hours'); setSortAsc(false); }
                }}
                className={`px-2 py-1 rounded-md cursor-pointer ${sortField === 'hours' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {isPersian ? 'ساعات' : 'Hours'}
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAndSortedBackups.map((bkp: MonthlyBackup) => (
            <div
              key={bkp.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">
                    {isPersian ? bkp.monthTitleFa : bkp.monthTitleEn}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono">
                    {bkp.monthKey}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-b-nazanin">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isPersian ? 'زمان تولید:' : 'Generated:'} {bkp.dateCreated}</span>
                  </div>
                  <div>
                    {isPersian ? 'پرسنل فعال پوشش‌داده‌شده:' : 'Active Staff:'}{' '}
                    <span className="font-bold text-slate-700">{bkp.activeUsersCount} نفر</span>
                  </div>
                  <div>
                    {isPersian ? 'مجموع کارکرد ماه:' : 'Total Hours:'}{' '}
                    <span className="font-bold text-slate-900">
                      {formatMinutes(bkp.totalDurationMinutes, isPersian)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadBackupExcel(bkp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  title={t.downloadExcel}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t.downloadExcel}</span>
                </button>

                <button
                  onClick={() => downloadBackupPdf(bkp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  title={t.downloadPdf}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t.downloadPdf}</span>
                </button>

                <button
                  onClick={() => setDeleteTargetId(bkp.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                  title={t.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {backups.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs">
              {isPersian
                ? 'هنوز فایل پشتیبانی ایجاد نشده است. دکمه "تولید نسخه پشتیبان" را بزنید.'
                : 'No monthly backups generated yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title={t.deleteConfirmTitle}
        message={t.deleteConfirmDesc}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
