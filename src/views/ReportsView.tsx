import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, Project, WorkRecordType } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, getCustomTypeTitle } from '../utils/storage';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import {
  getCurrentJalaliParts,
  getPredefinedDateRanges,
  formatMinutes,
  getTodayJalali
} from '../utils/jalali';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Filter,
  CheckSquare,
  Square,
  FileText,
  ArrowUpDown,
  Search,
  X
} from 'lucide-react';

interface ReportsViewProps {
  user: User;
  lang: Language;
}

type DetailedSortColumn =
  | 'user'
  | 'startDate'
  | 'startTime'
  | 'endDate'
  | 'endTime'
  | 'type'
  | 'project'
  | 'duration'
  | 'notes';

type SummarySortColumn =
  | 'userName'
  | 'jobTitle'
  | 'regular'
  | 'leave'
  | 'mission'
  | 'special'
  | 'total';

export const ReportsView: React.FC<ReportsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const jalaliParts = getCurrentJalaliParts();
  const datePresets = getPredefinedDateRanges(jalaliParts);

  const allUsers = StorageService.getUsers(true);
  // "مدیر ارشد سامانه هیچ جا نیاد و به همه چی و همه جا دسترسی داره"
  // Super Admin is excluded from attendance reports checklist
  const activeUsers = useMemo(() => StorageService.getEmployeesForReports(), []);
  const allProjects = StorageService.getProjects();
  const allRecords = StorageService.getAttendanceRecords();

  // Selected users (Default: all active staff checked!)
  // "پیش فرض همه کاربران فعال تیک خورده اند"
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() =>
    activeUsers.map(u => u.id)
  );

  // Date range filters (Note: "ساعت شروع و پایان برای گزارش گرفتن لازم نیست" - start & end time removed)
  const [startDate, setStartDate] = useState(datePresets.currentMonth.startDate);
  const [endDate, setEndDate] = useState(datePresets.currentMonth.endDate);

  // Additional column filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Sorting for Detailed Report
  const [detailedSortField, setDetailedSortField] = useState<DetailedSortColumn>('startDate');
  const [detailedSortAsc, setDetailedSortAsc] = useState<boolean>(false);

  // Sorting for Summary Report
  const [summarySortField, setSummarySortField] = useState<SummarySortColumn>('total');
  const [summarySortAsc, setSummarySortAsc] = useState<boolean>(false);

  // Report format: 'detailed' (خروجی تفکیک شده) vs 'summary' (خروجی تجمیعی)
  const [reportFormat, setReportFormat] = useState<'detailed' | 'summary'>('detailed');

  // Toggle user checkbox
  const toggleUser = (uid: string) => {
    if (selectedUserIds.includes(uid)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== uid));
    } else {
      setSelectedUserIds([...selectedUserIds, uid]);
    }
  };

  const selectAll = () => {
    setSelectedUserIds(activeUsers.map(u => u.id));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  // Quick preset applied
  const applyPreset = (preset: { startDate: string; endDate: string }) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  const toggleDetailedSort = (field: DetailedSortColumn) => {
    if (detailedSortField === field) {
      setDetailedSortAsc(!detailedSortAsc);
    } else {
      setDetailedSortField(field);
      setDetailedSortAsc(true);
    }
  };

  const toggleSummarySort = (field: SummarySortColumn) => {
    if (summarySortField === field) {
      setSummarySortAsc(!summarySortAsc);
    } else {
      setSummarySortField(field);
      setSummarySortAsc(false);
    }
  };

  // Filter & sort detailed records
  // "در خروجی گزارش ها ستون تاریخ شروع ساعت شروع و تاریخ پایان ساعت پایان لازمه"
  const filteredAndSortedRecords = useMemo(() => {
    return allRecords
      .filter(r => {
        if (!selectedUserIds.includes(r.userId)) return false;
        const recStartDate = r.startDate || r.date || '';
        const recEndDate = r.endDate || r.startDate || r.date || '';

        if (startDate && recEndDate < startDate) return false;
        if (endDate && recStartDate > endDate) return false;

        if (filterType !== 'all' && r.type !== filterType) return false;
        if (filterProjectId && r.projectId !== filterProjectId) return false;

        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const u = allUsers.find(item => item.id === r.userId);
          const userName = u ? `${u.firstName} ${u.lastName}`.toLowerCase() : '';
          const prjTitle = allProjects.find(p => p.id === r.projectId)?.title.toLowerCase() || '';
          const notes = (r.notes || '').toLowerCase();
          const extra = (r.missionDestination || r.leaveType || r.specialWorkType || '').toLowerCase();
          if (!userName.includes(q) && !prjTitle.includes(q) && !notes.includes(q) && !extra.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        const uA = allUsers.find(item => item.id === a.userId);
        const uB = allUsers.find(item => item.id === b.userId);
        const nameA = uA ? `${uA.firstName} ${uA.lastName}` : '';
        const nameB = uB ? `${uB.firstName} ${uB.lastName}` : '';

        const startA = `${a.startDate || a.date || ''} ${a.startTime || ''}`;
        const startB = `${b.startDate || b.date || ''} ${b.startTime || ''}`;
        const endA = `${a.endDate || a.startDate || a.date || ''} ${a.endTime || ''}`;
        const endB = `${b.endDate || b.startDate || b.date || ''} ${b.endTime || ''}`;

        switch (detailedSortField) {
          case 'user':
            diff = nameA.localeCompare(nameB);
            break;
          case 'startDate':
            diff = startA.localeCompare(startB);
            break;
          case 'startTime':
            diff = (a.startTime || '').localeCompare(b.startTime || '');
            break;
          case 'endDate':
            diff = endA.localeCompare(endB);
            break;
          case 'endTime':
            diff = (a.endTime || '').localeCompare(b.endTime || '');
            break;
          case 'type':
            diff = a.type.localeCompare(b.type);
            break;
          case 'project': {
            const pA = allProjects.find(p => p.id === a.projectId)?.title || '';
            const pB = allProjects.find(p => p.id === b.projectId)?.title || '';
            diff = pA.localeCompare(pB);
            break;
          }
          case 'duration':
            diff = a.durationMinutes - b.durationMinutes;
            break;
          case 'notes':
            diff = (a.notes || '').localeCompare(b.notes || '');
            break;
        }

        return detailedSortAsc ? diff : -diff;
      });
  }, [
    allRecords,
    selectedUserIds,
    startDate,
    endDate,
    filterType,
    filterProjectId,
    filterSearch,
    detailedSortField,
    detailedSortAsc,
    allUsers,
    allProjects
  ]);

  // Aggregated summary data (1 row per user)
  // "خروجی تجمیعی هر سطر یک نفر میشه هر ستون (کارکرد اصلی، مرخصی، ماموریت، کارکرد خاص) و ستون اخر مجموع"
  const summaryData = useMemo(() => {
    return selectedUserIds
      .map(uid => {
        const u = allUsers.find(item => item.id === uid);
        const userRecords = filteredAndSortedRecords.filter(r => r.userId === uid);

        let regular = 0;
        let leave = 0;
        let mission = 0;
        let special = 0;

        userRecords.forEach(r => {
          if (r.type === 'regular') regular += r.durationMinutes;
          else if (r.type === 'leave') leave += r.durationMinutes;
          else if (r.type === 'mission') mission += r.durationMinutes;
          else if (r.type === 'special') special += r.durationMinutes;
        });

        return {
          userId: uid,
          userName: u ? `${u.firstName} ${u.lastName}` : uid,
          jobTitle: u?.jobTitle || '-',
          regularMinutes: regular,
          leaveMinutes: leave,
          missionMinutes: mission,
          specialMinutes: special,
          totalMinutes: regular + leave + mission + special
        };
      })
      .sort((a, b) => {
        let diff = 0;
        switch (summarySortField) {
          case 'userName':
            diff = a.userName.localeCompare(b.userName);
            break;
          case 'jobTitle':
            diff = a.jobTitle.localeCompare(b.jobTitle);
            break;
          case 'regular':
            diff = a.regularMinutes - b.regularMinutes;
            break;
          case 'leave':
            diff = a.leaveMinutes - b.leaveMinutes;
            break;
          case 'mission':
            diff = a.missionMinutes - b.missionMinutes;
            break;
          case 'special':
            diff = a.specialMinutes - b.specialMinutes;
            break;
          case 'total':
            diff = a.totalMinutes - b.totalMinutes;
            break;
        }
        return summarySortAsc ? diff : -diff;
      });
  }, [selectedUserIds, filteredAndSortedRecords, allUsers, summarySortField, summarySortAsc]);

  // Total calculated minutes across all filtered records
  const totalFilteredMinutes = useMemo(() => {
    return filteredAndSortedRecords.reduce((acc, r) => acc + r.durationMinutes, 0);
  }, [filteredAndSortedRecords]);

  // PDF Export
  // "تو گزارش پی دی اف همه چی فونت بی میترا باشه"
  // "در خروجی گزارش ها ستون تاریخ شروع ساعت شروع و تاریخ پایان ساعت پایان لازمه"
  const handleExportPdf = () => {
    if (reportFormat === 'detailed') {
      const columns: ExportColumn[] = [
        {
          header: t.userCol,
          key: 'userId',
          width: 18,
          format: uid => {
            const u = allUsers.find(item => item.id === uid);
            return u ? `${u.firstName} ${u.lastName}` : uid;
          }
        },
        {
          header: isPersian ? 'تاریخ شروع' : 'Start Date',
          key: 'startDate',
          width: 14,
          format: (_, row) => row.startDate || row.date || '-'
        },
        {
          header: isPersian ? 'ساعت شروع' : 'Start Time',
          key: 'startTime',
          width: 12
        },
        {
          header: isPersian ? 'تاریخ پایان' : 'End Date',
          key: 'endDate',
          width: 14,
          format: (_, row) => row.endDate || row.startDate || row.date || '-'
        },
        {
          header: isPersian ? 'ساعت پایان' : 'End Time',
          key: 'endTime',
          width: 12
        },
        {
          header: t.typeCol,
          key: 'type',
          width: 15,
          format: val => {
            if (val === 'regular') return t.regularWork;
            if (val === 'mission') return t.missionRecord;
            if (val === 'leave') return t.leaveRecord;
            return t.specialWorkRecord;
          }
        },
        {
          header: t.projectCol,
          key: 'projectId',
          width: 20,
          format: (pid, row) => {
            if (row.type === 'leave') return row.leaveType ? `${row.leaveType}` : '-';
            if (row.type === 'special') return row.specialWorkType ? `${row.specialWorkType}` : '-';
            if (row.type === 'mission' && row.missionDestination) return `${row.missionDestination}`;
            return allProjects.find(p => p.id === pid)?.title || '-';
          }
        },
        {
          header: t.durationCol,
          key: 'durationMinutes',
          width: 16,
          format: min => formatMinutes(min, isPersian)
        },
        { header: t.notesCol, key: 'notes', width: 22 }
      ];

      exportTableToPdfPrint(
        isPersian ? 'گزارش تفکیک‌شده تردد و کارکرد پرسنل' : 'Detailed Staff Attendance Report',
        isPersian ? `بازه زمانی: ${startDate} تا ${endDate}` : `Period: ${startDate} to ${endDate}`,
        columns,
        filteredAndSortedRecords,
        isPersian
      );
    } else {
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
        isPersian ? 'گزارش تجمیعی کارکرد و تردد پرسنل' : 'Aggregated Staff Attendance Summary',
        isPersian ? `بازه زمانی: ${startDate} تا ${endDate}` : `Period: ${startDate} to ${endDate}`,
        columns,
        summaryData,
        isPersian
      );
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (reportFormat === 'detailed') {
      const columns: ExportColumn[] = [
        {
          header: t.userCol,
          key: 'userId',
          width: 20,
          format: uid => {
            const u = allUsers.find(item => item.id === uid);
            return u ? `${u.firstName} ${u.lastName}` : uid;
          }
        },
        {
          header: isPersian ? 'تاریخ شروع' : 'Start Date',
          key: 'startDate',
          width: 16,
          format: (_, row) => row.startDate || row.date || '-'
        },
        {
          header: isPersian ? 'ساعت شروع' : 'Start Time',
          key: 'startTime',
          width: 14
        },
        {
          header: isPersian ? 'تاریخ پایان' : 'End Date',
          key: 'endDate',
          width: 16,
          format: (_, row) => row.endDate || row.startDate || row.date || '-'
        },
        {
          header: isPersian ? 'ساعت پایان' : 'End Time',
          key: 'endTime',
          width: 14
        },
        {
          header: t.typeCol,
          key: 'type',
          width: 16,
          format: val => {
            if (val === 'regular') return t.regularWork;
            if (val === 'mission') return t.missionRecord;
            if (val === 'leave') return t.leaveRecord;
            return t.specialWorkRecord;
          }
        },
        {
          header: t.projectCol,
          key: 'projectId',
          width: 24,
          format: (pid, row) => {
            if (row.type === 'leave') return row.leaveType ? `${row.leaveType}` : '-';
            if (row.type === 'special') return row.specialWorkType ? `${row.specialWorkType}` : '-';
            if (row.type === 'mission' && row.missionDestination) return `${row.missionDestination}`;
            return allProjects.find(p => p.id === pid)?.title || '-';
          }
        },
        {
          header: t.durationCol,
          key: 'durationMinutes',
          width: 18,
          format: min => formatMinutes(min, isPersian)
        },
        { header: t.notesCol, key: 'notes', width: 28 }
      ];

      exportTableToExcel(
        `Detailed_Report_${startDate.replace(/\//g, '-')}_to_${endDate.replace(/\//g, '-')}`,
        'DetailedReport',
        columns,
        filteredAndSortedRecords,
        isPersian
      );
    } else {
      const columns: ExportColumn[] = [
        { header: t.userCol, key: 'userName', width: 24 },
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
        `Summary_Report_${startDate.replace(/\//g, '-')}_to_${endDate.replace(/\//g, '-')}`,
        'SummaryReport',
        columns,
        summaryData,
        isPersian
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.reports}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'فیلتر هوشمند تاریخ، انتخاب افراد، مرتب‌سازی تمام ستون‌ها و خروجی چاپی A4 و اکسل'
                : 'Advanced date range, multi-user filters, full-column sorting, and strict A4 / Excel exports'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportExcel}</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportPdf}</span>
          </button>
        </div>
      </div>

      {/* Quick Period Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{isPersian ? 'میانبرهای سریع بازه زمانی:' : 'Quick Period Shortcuts:'}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Current Month */}
          <button
            onClick={() => applyPreset(datePresets.currentMonth)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition-colors cursor-pointer"
          >
            {isPersian ? datePresets.currentMonth.titleFa : datePresets.currentMonth.titleEn}
          </button>

          {/* Month Shortcuts */}
          {datePresets.monthShortcuts.map(m => (
            <button
              key={m.key}
              onClick={() => applyPreset(m)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              {isPersian ? m.titleFa : m.titleEn}
            </button>
          ))}

          {/* Quarters */}
          {datePresets.quarters.map(q => (
            <button
              key={q.key}
              onClick={() => applyPreset(q)}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            >
              {isPersian ? q.titleFa : q.titleEn}
            </button>
          ))}

          {/* Current Year */}
          <button
            onClick={() => applyPreset(datePresets.currentYear)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            {isPersian ? datePresets.currentYear.titleFa : datePresets.currentYear.titleEn}
          </button>
        </div>
      </div>

      {/* Filter and Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User Multi-Selection Box */}
        {/* "در این بخش امکان انتخاب لیست افراد (پیش فرض همه کاربران فعال تیک خورده اند) هست" */}
        {/* Super admin excluded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col max-h-96">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{isPersian ? 'انتخاب افراد' : 'Select Employees'}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({selectedUserIds.length}/{activeUsers.length})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectAll}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                {t.selectAll}
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={deselectAll}
                className="text-slate-500 hover:underline cursor-pointer"
              >
                {t.deselectAll}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activeUsers.map(u => {
              const checked = selectedUserIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    checked
                      ? 'bg-purple-50/50 border-purple-200 text-slate-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span>{u.firstName} {u.lastName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal font-b-nazanin">
                    {u.jobTitle || u.role}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Date, Filters & Format Selector */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>{isPersian ? 'تنظیمات محدوده و فیلترهای گزارش' : 'Report Criteria & Filters'}</span>
            </h3>

            {/* Format toggle: Detailed vs Summary */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setReportFormat('detailed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportFormat === 'detailed'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.detailedReport}
              </button>
              <button
                onClick={() => setReportFormat('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportFormat === 'summary'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.summaryReport}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PersianDatePicker
              value={startDate}
              onChange={setStartDate}
              label={isPersian ? 'از تاریخ شروع' : 'From Start Date'}
              isPersian={isPersian}
            />

            <PersianDatePicker
              value={endDate}
              onChange={setEndDate}
              label={isPersian ? 'تا تاریخ پایان' : 'To End Date'}
              isPersian={isPersian}
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.typeCol}
              </label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">{isPersian ? 'همه انواع کارکردها' : 'All Types'}</option>
                <option value="regular">{t.regularWork}</option>
                <option value="mission">{t.missionRecord}</option>
                <option value="leave">{t.leaveRecord}</option>
                <option value="special">{t.specialWorkRecord}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {t.projectCol}
              </label>
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="">{isPersian ? 'همه پروژه‌ها' : 'All Projects'}</option>
                {allProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder={isPersian ? 'جستجو در نام کاربر، پروژه، توضیحات...' : 'Search records...'}
                  className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            {(filterType !== 'all' || filterProjectId || filterSearch) && (
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterProjectId('');
                  setFilterSearch('');
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearFilter}</span>
              </button>
            )}

            <div className="mr-auto ml-auto sm:ml-0 text-xs text-slate-600 font-semibold self-center font-b-nazanin">
              {isPersian ? 'مجموع ساعات منطبق:' : 'Total Matching Duration:'}{' '}
              <span className="text-slate-900 font-bold text-sm">
                {formatMinutes(totalFilteredMinutes, isPersian)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table Preview with all columns sortable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>
              {reportFormat === 'detailed' ? t.detailedReport : t.summaryReport}
            </span>
          </h3>

          <span className="text-xs text-slate-500 font-b-nazanin">
            {reportFormat === 'detailed'
              ? `${filteredAndSortedRecords.length} ${isPersian ? 'رکورد کارکرد' : 'records'}`
              : `${summaryData.length} ${isPersian ? 'سطر تجمیعی پرسنل' : 'summary rows'}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportFormat === 'detailed' ? (
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>

                  {/* User Column */}
                  <th
                    onClick={() => toggleDetailedSort('user')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.userCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Start Date */}
                  <th
                    onClick={() => toggleDetailedSort('startDate')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'تاریخ شروع' : 'Start Date'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Start Time */}
                  <th
                    onClick={() => toggleDetailedSort('startTime')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'ساعت شروع' : 'Start Time'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* End Date */}
                  <th
                    onClick={() => toggleDetailedSort('endDate')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'تاریخ پایان' : 'End Date'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* End Time */}
                  <th
                    onClick={() => toggleDetailedSort('endTime')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'ساعت پایان' : 'End Time'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Record Type */}
                  <th
                    onClick={() => toggleDetailedSort('type')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.typeCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Project / Specific */}
                  <th
                    onClick={() => toggleDetailedSort('project')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.projectCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Duration */}
                  <th
                    onClick={() => toggleDetailedSort('duration')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.durationCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  {/* Notes */}
                  <th
                    onClick={() => toggleDetailedSort('notes')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.notesCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-b-nazanin">
                {filteredAndSortedRecords.map((r, idx) => {
                  const u = allUsers.find(item => item.id === r.userId);
                  const prj = allProjects.find(p => p.id === r.projectId);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {u ? `${u.firstName} ${u.lastName}` : r.userId}
                      </td>
                      <td className="p-3 text-slate-700">{r.startDate || r.date}</td>
                      <td className="p-3 text-slate-600 font-mono font-bold" dir="ltr">
                        {r.startTime}
                      </td>
                      <td className="p-3 text-slate-700">{r.endDate || r.startDate || r.date}</td>
                      <td className="p-3 text-slate-600 font-mono font-bold" dir="ltr">
                        {r.endTime}
                      </td>
                      <td className="p-3">
                        {r.type === 'regular' && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            {t.regularWork}
                          </span>
                        )}
                        {r.type === 'mission' && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                            {t.missionRecord} ({r.missionDestination || '-'})
                          </span>
                        )}
                        {r.type === 'leave' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px]">
                            {t.leaveRecord} ({r.leaveType || '-'})
                          </span>
                        )}
                        {r.type === 'special' && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px]">
                            {t.specialWorkRecord} ({r.specialWorkType || '-'})
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{prj ? prj.title : '-'}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {formatMinutes(r.durationMinutes, isPersian)}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{r.notes || '-'}</td>
                    </tr>
                  );
                })}

                {filteredAndSortedRecords.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      {isPersian ? 'رکوردی مطابق با فیلترهای انتخابی یافت نشد.' : 'No records match the filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>

                  <th
                    onClick={() => toggleSummarySort('userName')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.userCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('jobTitle')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.jobTitle}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('regular')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.regularWork}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('leave')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.leaveRecord}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('mission')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.missionRecord}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('special')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.specialWorkRecord}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th
                    onClick={() => toggleSummarySort('total')}
                    className="p-3 cursor-pointer hover:bg-slate-100 transition-colors font-black text-slate-900"
                  >
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'مجموع کل کارکرد' : 'Grand Total'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-b-nazanin">
                {summaryData.map((row, idx) => (
                  <tr key={row.userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 text-sm">{row.userName}</td>
                    <td className="p-3 text-slate-600">{row.jobTitle}</td>
                    <td className="p-3 text-slate-800 font-semibold">{formatMinutes(row.regularMinutes, isPersian)}</td>
                    <td className="p-3 text-amber-700 font-semibold">{formatMinutes(row.leaveMinutes, isPersian)}</td>
                    <td className="p-3 text-indigo-700 font-semibold">{formatMinutes(row.missionMinutes, isPersian)}</td>
                    <td className="p-3 text-rose-700 font-semibold">{formatMinutes(row.specialMinutes, isPersian)}</td>
                    <td className="p-3 font-black text-blue-700 text-sm">{formatMinutes(row.totalMinutes, isPersian)}</td>
                  </tr>
                ))}

                {summaryData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isPersian ? 'کاربری برای نمایش انتخاب نشده است.' : 'No users selected.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
