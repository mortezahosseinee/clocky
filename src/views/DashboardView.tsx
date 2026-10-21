import React, { useState, useMemo, useEffect } from 'react';
import { User, AttendanceRecord, Project, WorkRecordType } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, getCustomTypeTitle } from '../utils/storage';
import { formatMinutes, getCurrentJalaliParts, getTodayJalali, toPersianDigits, calculateFullDurationMinutes, formatDateWithWeekday } from '../utils/jalali';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { TimePicker } from '../components/TimePicker';
import {
  Clock,
  Briefcase,
  CalendarCheck,
  Zap,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  FolderKanban,
  Filter,
  X,
  ArrowUpDown,
  Play,
  Square,
  Timer,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { LiveWorkTrackerCard } from '../components/LiveWorkTrackerCard';
import { ExcelImportModal } from '../components/ExcelImportModal';

interface DashboardViewProps {
  user: User;
  lang: Language;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  lang,
  onNavigateTab
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const jalaliParts = getCurrentJalaliParts();
  const today = getTodayJalali();

  const [recordsList, setRecordsList] = useState<AttendanceRecord[]>(() => StorageService.getAttendanceRecords());
  const [projectsList, setProjectsList] = useState<Project[]>(() => StorageService.getProjects());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSuccessNotice, setImportSuccessNotice] = useState<string | null>(null);
  const allProjects = projectsList;
  const allUsers = StorageService.getUsers(false);

  // Available projects accessible by current user
  const availableProjects = useMemo(() => {
    if (isAdmin || user.role === 'executive') return projectsList;
    const userGroups = Array.isArray(user.groupIds) ? user.groupIds : [];
    return projectsList.filter(p => Array.isArray(p.groupIds) && p.groupIds.some(gid => userGroups.includes(gid)));
  }, [projectsList, isAdmin, user.groupIds]);

  // Sync latest projects and records from server on mount & dynamically
  useEffect(() => {
    const handleSync = () => {
      setProjectsList(StorageService.getProjects());
      setRecordsList(StorageService.getAttendanceRecords());
    };
    window.addEventListener('app_storage_synced', handleSync);
    window.addEventListener('storage', handleSync);
    StorageService.syncFromServer().then(handleSync);
    return () => {
      window.removeEventListener('app_storage_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user.id]);

  // Time and project filters for everyone
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [quickPeriod, setQuickPeriod] = useState<'thisMonth' | 'lastMonth' | 'all' | 'custom'>('all');

  // Inline Quick Add Record Modal State
  const settings = StorageService.getSettings();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<WorkRecordType>('regular');
  const [qStartDate, setQStartDate] = useState(today);
  const [qStartTime, setQStartTime] = useState('08:30');
  const [qEndDate, setQEndDate] = useState(today);
  const [qEndTime, setQEndTime] = useState('16:30');
  const [isQEndDateManuallySet, setIsQEndDateManuallySet] = useState(false);
  const [qProjectId, setQProjectId] = useState('');
  const [qLeaveType, setQLeaveType] = useState('مرخصی عادی');
  const [qSpecialType, setQSpecialType] = useState('قطعی برق');
  const [qMissionDestination, setQMissionDestination] = useState('');
  const [qNotes, setQNotes] = useState('');
  const [qError, setQError] = useState<string | null>(null);

  const leaveTypeOptions = useMemo(() => {
    const base = (settings.leaveTypes || []).map(lt => getCustomTypeTitle(lt, lang)).filter(Boolean);
    const defaults = isPersian
      ? ['مرخصی عادی', 'مرخصی استعلاجی', 'مرخصی مناسبتی', 'مرخصی تولد', 'مرخصی بدون حقوق', 'مرخصی ساعتی']
      : ['Regular / Annual Leave', 'Sick Leave', 'Casual / Occasion Leave', 'Birthday Leave', 'Unpaid Leave', 'Hourly Leave'];
    return Array.from(new Set([...base, ...defaults]));
  }, [settings.leaveTypes, lang, isPersian]);

  const specialTypeOptions = useMemo(() => {
    const base = (settings.specialWorkTypes || []).map(st => getCustomTypeTitle(st, lang)).filter(Boolean);
    const defaults = isPersian
      ? ['قطعی برق', 'اختلال شبکه و ارتباطات', 'تعطیلی اضطراری / شرایط جوی', 'سایر']
      : ['Power Outage', 'Network & System Disruption', 'Emergency / Weather Closure', 'Other'];
    return Array.from(new Set([...base, ...defaults]));
  }, [settings.specialWorkTypes, lang, isPersian]);

  const handleOpenQuickAdd = (type: WorkRecordType) => {
    const currentToday = getTodayJalali();
    setQuickAddType(type);
    setQStartDate(currentToday);
    setQStartTime('08:30');
    setQEndDate(currentToday);
    setQEndTime('16:30');
    setIsQEndDateManuallySet(false);
    const firstActive = availableProjects.find(p => p.isActive);
    setQProjectId(firstActive ? firstActive.id : '');
    setQLeaveType(leaveTypeOptions[0] || 'مرخصی عادی');
    setQSpecialType(specialTypeOptions[0] || 'قطعی برق');
    setQMissionDestination('');
    setQNotes('');
    setQError(null);
    setIsQuickAddOpen(true);
  };

  const handleSaveQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calculateFullDurationMinutes(qStartDate, qStartTime, qEndDate, qEndTime);
    if (duration <= 0) {
      setQError(
        isPersian
          ? 'تاریخ و ساعت پایان باید بعد از تاریخ و ساعت شروع باشد.'
          : 'End date & time must be strictly after start date & time.'
      );
      return;
    }

    if ((quickAddType === 'regular' || quickAddType === 'mission') && qProjectId) {
      const targetPrj = projectsList.find(p => p.id === qProjectId);
      if (targetPrj && !targetPrj.isActive) {
        setQError(
          isPersian
            ? 'این پروژه غیرفعال است و امکان ثبت ساعت جدید برای آن وجود ندارد.'
            : 'This project is inactive and cannot accept new work hours.'
        );
        return;
      }
    }

    const selectedLeave = settings.leaveTypes.find(
      lt => getCustomTypeTitle(lt, lang) === qLeaveType ||
            (typeof lt === 'object' && (lt.titleFa === qLeaveType || lt.titleEn === qLeaveType))
    );
    const selectedSpecial = settings.specialWorkTypes.find(
      st => getCustomTypeTitle(st, lang) === qSpecialType ||
            (typeof st === 'object' && (st.titleFa === qSpecialType || st.titleEn === qSpecialType))
    );

    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      userId: user.id,
      type: quickAddType,
      startDate: qStartDate,
      startTime: qStartTime,
      endDate: qEndDate,
      endTime: qEndTime,
      date: qStartDate,
      durationMinutes: duration,
      projectId: (quickAddType === 'regular' || quickAddType === 'mission') ? (qProjectId || undefined) : undefined,
      leaveTypeId: quickAddType === 'leave' && selectedLeave && typeof selectedLeave === 'object' ? selectedLeave.id : undefined,
      leaveType: quickAddType === 'leave' ? qLeaveType : undefined,
      specialWorkTypeId: quickAddType === 'special' && selectedSpecial && typeof selectedSpecial === 'object' ? selectedSpecial.id : undefined,
      specialWorkType: quickAddType === 'special' ? qSpecialType : undefined,
      missionDestination: quickAddType === 'mission' ? qMissionDestination : undefined,
      notes: qNotes,
      createdAt: getTodayJalali(),
      updatedAt: new Date().toISOString()
    };

    StorageService.saveAttendanceRecord(newRecord);
    StorageService.addLog(
      'CREATE_ATTENDANCE',
      `ثبت سریع رکورد نوع ${quickAddType} از ${qStartDate} ${qStartTime} تا ${qEndDate} ${qEndTime} به مدت ${formatMinutes(duration, isPersian)}`
    );

    setRecordsList(StorageService.getAttendanceRecords());
    setIsQuickAddOpen(false);
    setImportSuccessNotice(
      isPersian
        ? `رکورد ${quickAddType === 'regular' ? t.regularWork : quickAddType === 'leave' ? t.leaveRecord : quickAddType === 'mission' ? t.missionRecord : t.specialWorkRecord} با موفقیت ثبت شد.`
        : 'Record saved successfully.'
    );
    setTimeout(() => setImportSuccessNotice(null), 4000);
  };

  // Table sorting
  const [sortField, setSortField] = useState<'date' | 'type' | 'project' | 'duration'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Base records accessible by user role
  const baseRecords = useMemo(() => {
    if (isAdmin) return recordsList;
    return recordsList.filter(r => r.userId === user.id);
  }, [recordsList, isAdmin, user.id]);

  // Handle quick period switch
  const handleQuickPeriodChange = (period: 'thisMonth' | 'lastMonth' | 'all' | 'custom') => {
    setQuickPeriod(period);
    if (period === 'thisMonth') {
      const ym = `${jalaliParts.year}/${String(jalaliParts.month).padStart(2, '0')}`;
      setFilterStartDate(`${ym}/01`);
      setFilterEndDate(`${ym}/31`);
    } else if (period === 'lastMonth') {
      let prevM = jalaliParts.month - 1;
      let prevY = jalaliParts.year;
      if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
      }
      const ym = `${prevY}/${String(prevM).padStart(2, '0')}`;
      setFilterStartDate(`${ym}/01`);
      setFilterEndDate(`${ym}/31`);
    } else if (period === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Filtered records based on StartDate, EndDate, and Project
  const filteredRecords = useMemo(() => {
    return baseRecords.filter(r => {
      const recDate = r.startDate || r.date || '';

      // Start Date check
      if (filterStartDate && recDate < filterStartDate) {
        return false;
      }

      // End Date check
      if (filterEndDate && recDate > filterEndDate) {
        return false;
      }

      // Project filter
      if (filterProjectId !== 'all') {
        if (r.projectId !== filterProjectId) {
          return false;
        }
      }

      return true;
    });
  }, [baseRecords, filterStartDate, filterEndDate, filterProjectId]);

  // Sorted records for the table
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let diff = 0;
      if (sortField === 'date') {
        const da = a.startDate || a.date || '';
        const db = b.startDate || b.date || '';
        diff = da.localeCompare(db);
      } else if (sortField === 'type') {
        diff = a.type.localeCompare(b.type);
      } else if (sortField === 'project') {
        const pa = allProjects.find(p => p.id === a.projectId)?.title || '';
        const pb = allProjects.find(p => p.id === b.projectId)?.title || '';
        diff = pa.localeCompare(pb);
      } else if (sortField === 'duration') {
        diff = a.durationMinutes - b.durationMinutes;
      }
      return sortAsc ? diff : -diff;
    });
  }, [filteredRecords, sortField, sortAsc, allProjects]);

  const toggleSort = (field: 'date' | 'type' | 'project' | 'duration') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for date and duration
    }
  };

  // Aggregated totals in minutes from filtered records
  const stats = useMemo(() => {
    let regular = 0;
    let mission = 0;
    let leave = 0;
    let special = 0;

    filteredRecords.forEach(r => {
      if (r.type === 'regular') regular += r.durationMinutes;
      else if (r.type === 'mission') mission += r.durationMinutes;
      else if (r.type === 'leave') leave += r.durationMinutes;
      else if (r.type === 'special') special += r.durationMinutes;
    });

    return {
      regular,
      mission,
      leave,
      special,
      total: regular + mission + leave + special
    };
  }, [filteredRecords]);

  // Project breakdown from filtered records
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { title: string; minutes: number }> = {};
    filteredRecords.forEach(r => {
      if (r.projectId) {
        const prj = allProjects.find(p => p.id === r.projectId);
        const title = prj ? prj.title : (isPersian ? 'نامشخص' : 'Unknown');
        if (!map[r.projectId]) {
          map[r.projectId] = { title, minutes: 0 };
        }
        map[r.projectId].minutes += r.durationMinutes;
      }
    });
    return Object.values(map).sort((a, b) => b.minutes - a.minutes);
  }, [filteredRecords, allProjects, isPersian]);

  // Export filtered summary to PDF
  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      { header: isPersian ? 'تاریخ شروع' : 'Start Date', key: 'startDate', width: 14, format: (val, r) => val || r.date || '-' },
      { header: isPersian ? 'ساعت شروع' : 'Start Time', key: 'startTime', width: 12 },
      { header: isPersian ? 'تاریخ پایان' : 'End Date', key: 'endDate', width: 14, format: (val, r) => val || r.startDate || r.date || '-' },
      { header: isPersian ? 'ساعت پایان' : 'End Time', key: 'endTime', width: 12 },
      {
        header: t.typeCol,
        key: 'type',
        width: 14,
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
        width: 22,
        format: pid => allProjects.find(p => p.id === pid)?.title || '-'
      },
      {
        header: t.durationCol,
        key: 'durationMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      { header: t.notesCol, key: 'notes', width: 22 }
    ];

    if (isAdmin) {
      columns.unshift({
        header: t.userCol,
        key: 'userId',
        width: 16,
        format: uid => {
          const u = allUsers.find(item => item.id === uid);
          return u ? `${u.firstName} ${u.lastName}` : uid;
        }
      });
    }

    const periodLabel = filterStartDate || filterEndDate
      ? (isPersian ? `بازه زمانی: از ${filterStartDate || 'ابتدا'} تا ${filterEndDate || 'انتها'}` : `Period: ${filterStartDate || 'Beginning'} to ${filterEndDate || 'End'}`)
      : (isPersian ? 'کلیه سوابق ثبت‌شده' : 'All Historical Records');

    const prjLabel = filterProjectId !== 'all'
      ? (isPersian ? ` | پروژه: ${allProjects.find(p => p.id === filterProjectId)?.title || ''}` : ` | Project: ${allProjects.find(p => p.id === filterProjectId)?.title || ''}`)
      : '';

    exportTableToPdfPrint(
      isPersian ? 'گزارش تحلیلی داشبورد کارکرد پرسنل' : 'Dashboard Attendance & Work Report',
      `${periodLabel}${prjLabel}`,
      columns,
      sortedRecords,
      isPersian
    );
  };

  // Export filtered summary to Excel
  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { header: isPersian ? 'تاریخ شروع' : 'Start Date', key: 'startDate', width: 15, format: (val, r) => val || r.date || '-' },
      { header: isPersian ? 'ساعت شروع' : 'Start Time', key: 'startTime', width: 12 },
      { header: isPersian ? 'تاریخ پایان' : 'End Date', key: 'endDate', width: 15, format: (val, r) => val || r.startDate || r.date || '-' },
      { header: isPersian ? 'ساعت پایان' : 'End Time', key: 'endTime', width: 12 },
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
        width: 25,
        format: pid => allProjects.find(p => p.id === pid)?.title || '-'
      },
      {
        header: t.durationCol,
        key: 'durationMinutes',
        width: 18,
        format: min => formatMinutes(min, isPersian)
      },
      { header: t.notesCol, key: 'notes', width: 30 }
    ];

    if (isAdmin) {
      columns.unshift({
        header: t.userCol,
        key: 'userId',
        width: 20,
        format: uid => {
          const u = allUsers.find(item => item.id === uid);
          return u ? `${u.firstName} ${u.lastName}` : uid;
        }
      });
    }

    exportTableToExcel(
      `Dashboard_${jalaliParts.year}_${jalaliParts.month}`,
      'Dashboard_Records',
      columns,
      sortedRecords,
      isPersian
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t.dashboard}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-b-nazanin">
            {isPersian
              ? 'مشاهده آمار و نمودارهای تحلیلی کارکرد، ماموریت و مرخصی با قابلیت فیلتر زمانی و پروژه‌ای برای کلیه کاربران'
              : 'Analytic work, mission, and leave metrics with customizable date and project filtering'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isPersian ? 'بارگذاری فایل اکسل کارکرد' : 'Import Excel / CSV'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportExcel}</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportPdf}</span>
          </button>
        </div>
      </div>

      {/* Import Success Notice */}
      {importSuccessNotice && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold font-b-nazanin animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importSuccessNotice}</span>
        </div>
      )}

      {/* Filter Section: Date Range & Project Filter for EVERYONE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>{isPersian ? 'فیلترهای اختصاصی داشبورد (زمان و پروژه)' : 'Dashboard Filters (Period & Project)'}</span>
          </div>

          {/* Quick period selectors */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => handleQuickPeriodChange('thisMonth')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                quickPeriod === 'thisMonth' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isPersian ? 'ماه جاری' : 'This Month'}
            </button>
            <button
              onClick={() => handleQuickPeriodChange('lastMonth')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                quickPeriod === 'lastMonth' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isPersian ? 'ماه گذشته' : 'Last Month'}
            </button>
            <button
              onClick={() => handleQuickPeriodChange('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                quickPeriod === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isPersian ? 'همه زمان‌ها' : 'All Time'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Start Date */}
          <div>
            <PersianDatePicker
              label={isPersian ? 'از تاریخ' : 'From Date'}
              value={filterStartDate}
              onChange={val => {
                setFilterStartDate(val);
                setQuickPeriod('custom');
              }}
              isPersian={isPersian}
            />
          </div>

          {/* End Date */}
          <div>
            <PersianDatePicker
              label={isPersian ? 'تا تاریخ' : 'To Date'}
              value={filterEndDate}
              onChange={val => {
                setFilterEndDate(val);
                setQuickPeriod('custom');
              }}
              isPersian={isPersian}
            />
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.projectCol}
            </label>
            <div className="relative">
              <select
                value={filterProjectId}
                onChange={e => setFilterProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">{isPersian ? 'کلیه پروژه‌ها' : 'All Projects'}</option>
                {allProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {!p.isActive ? `(${t.inactiveStatus})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filter & Count */}
          <div className="flex items-center gap-2">
            {(filterStartDate || filterEndDate || filterProjectId !== 'all') && (
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterProjectId('all');
                  setQuickPeriod('all');
                }}
                className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearFilter}</span>
              </button>
            )}

            <div className="mr-auto text-xs text-slate-500 font-semibold font-b-nazanin py-2">
              {isPersian ? 'تعداد رکورد فیلترشده:' : 'Records:'}{' '}
              <span className="text-slate-900 font-bold">{filteredRecords.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Work Tracker Card - "ثبت کارکرد زنده" */}
      <LiveWorkTrackerCard
        user={user}
        isPersian={isPersian}
        projectsList={projectsList}
        onRecordSaved={() => {
          setRecordsList(StorageService.getAttendanceRecords());
        }}
        onNavigateTab={onNavigateTab}
      />

      {/* KPI Cards based on filtered data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total regular work */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalWorkHours}</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-black text-slate-900">
            {formatMinutes(stats.regular, isPersian)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-b-nazanin">
            {isPersian ? 'کارکرد موثر روی پروژه‌ها' : 'Effective project work'}
          </div>
        </div>

        {/* Total Missions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalMissionHours}</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-black text-slate-900">
            {formatMinutes(stats.mission, isPersian)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-b-nazanin">
            {isPersian ? 'جلسات و ماموریت‌های برون‌سازمانی' : 'External client meetings'}
          </div>
        </div>

        {/* Total Leaves */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalLeaveHours}</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-black text-slate-900">
            {formatMinutes(stats.leave, isPersian)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-b-nazanin">
            {isPersian ? 'استعلاجی، عادی و مناسبتی' : 'Sick, standard & casual'}
          </div>
        </div>

        {/* Total Special Work */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.totalSpecialHours}</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-black text-slate-900">
            {formatMinutes(stats.special, isPersian)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-b-nazanin">
            {isPersian ? 'قطعی برق، شرایط اضطراری' : 'Power outages, emergencies'}
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isPersian ? 'کل ساعات ثبتی' : 'Total Logged Hours'}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-black text-emerald-700">
            {formatMinutes(stats.total, isPersian)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-b-nazanin">
            {isPersian ? 'مجموع کل کارکرد، ماموریت و مرخصی' : 'Sum of all categories'}
          </div>
        </div>
      </div>

      {/* Project Allocation Chart & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-800">
                {isPersian ? 'تفکیک کارکرد پروژه‌ها بر اساس فیلتر اعمال‌شده' : 'Filtered Project Hours Breakdown'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-b-nazanin">
              {projectBreakdown.length} {isPersian ? 'پروژه فعال دارای کارکرد' : 'projects'}
            </span>
          </div>

          {projectBreakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-b-nazanin">
              {isPersian ? 'برای بازه و پروژه انتخابی، رکوردی ثبت نشده است.' : 'No project hours in selected period.'}
            </div>
          ) : (
            <div className="space-y-4">
              {projectBreakdown.map(item => {
                const percentage = stats.regular > 0 ? Math.round((item.minutes / stats.regular) * 100) : 0;
                return (
                  <div key={item.title} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-800">{item.title}</span>
                      <span className="text-slate-500 font-semibold font-b-nazanin">
                        {formatMinutes(item.minutes, isPersian)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: 'var(--primary-color)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick action / Work Type shortcuts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-800 mb-2">
              {isPersian ? 'اقدام سریع و ثبت حضور' : 'Quick Actions'}
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-b-nazanin">
              {isPersian
                ? `امروز: ${today} - دسترسی مستقیم به بخش‌های ثبت کارکرد، ماموریت و مرخصی.`
                : `Today: ${today} - Direct access to logging attendance, missions & leaves.`}
            </p>

            {!isAdmin ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd('regular')}
                  className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-between transition-colors border border-blue-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t.regularWork}
                  </span>
                  <span className="text-[11px] font-normal">{isPersian ? '+ ثبت جدید' : '+ Add'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd('mission')}
                  className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-between transition-colors border border-indigo-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {t.missionRecord}
                  </span>
                  <span className="text-[11px] font-normal">{isPersian ? '+ ثبت جدید' : '+ Add'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd('leave')}
                  className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl flex items-center justify-between transition-colors border border-amber-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" />
                    {t.leaveRecord}
                  </span>
                  <span className="text-[11px] font-normal">{isPersian ? '+ ثبت جدید' : '+ Add'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd('special')}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-between transition-colors border border-rose-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {t.specialWorkRecord}
                  </span>
                  <span className="text-[11px] font-normal">{isPersian ? '+ ثبت جدید' : '+ Add'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed font-b-nazanin space-y-2">
                <p>
                  {isPersian
                    ? 'حساب مدیر کل به تمام رکوردهای کارمندان دسترسی دارد. با فیلترهای بالا می‌توانید آمار پروژه‌ها یا بازه‌های زمانی خاص را تحلیل و استخراج نمایید.'
                    : 'Administrator account has access to all organizational work logs.'}
                </p>
                <button
                  onClick={() => onNavigateTab('reports')}
                  className="w-full mt-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  {isPersian ? 'مشاهده بخش گزارش‌گیری جامع' : 'Go to Full Reports'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtered & Sortable Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-800">
            {isPersian ? 'رکوردهای کارکرد مطابق فیلتر' : 'Tracked Records in Selected Period'}
          </h3>
          <span className="text-xs text-slate-500 font-b-nazanin">
            {isPersian ? `${sortedRecords.length} رکورد یافت شد` : `${sortedRecords.length} records found`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                {isAdmin && <th className="p-3">{t.userCol}</th>}
                <th onClick={() => toggleSort('date')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'تاریخ' : 'Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => toggleSort('type')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>{t.typeCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => toggleSort('project')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>{t.projectCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">{t.startTimeCol}</th>
                <th className="p-3">{t.endTimeCol}</th>
                <th onClick={() => toggleSort('duration')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1">
                    <span>{t.durationCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3">{t.notesCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-b-nazanin">
              {sortedRecords.map(record => {
                const prj = allProjects.find(p => p.id === record.projectId);
                const recUser = allUsers.find(u => u.id === record.userId);

                return (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    {isAdmin && (
                      <td className="p-3 font-semibold text-slate-800">
                        {recUser ? `${recUser.firstName} ${recUser.lastName}` : record.userId}
                      </td>
                    )}
                    <td className="p-3 text-slate-700 font-b-mitra text-xs font-semibold text-right">
                      {isPersian ? formatDateWithWeekday(record.startDate || record.date) : (record.startDate || record.date)}
                    </td>
                    <td className="p-3">
                      {record.type === 'regular' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {t.regularWork}
                        </span>
                      )}
                      {record.type === 'mission' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                          {t.missionRecord} ({record.missionDestination || '-'})
                        </span>
                      )}
                      {record.type === 'leave' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px]">
                          {t.leaveRecord} ({record.leaveType || '-'})
                        </span>
                      )}
                      {record.type === 'special' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px]">
                          {t.specialWorkRecord} ({record.specialWorkType || '-'})
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {prj ? prj.title : '-'}
                    </td>
                    <td className="p-3 text-slate-800 font-b-mitra font-time text-sm font-bold text-right">
                      <span dir="ltr" className="inline-block">{toPersianDigits(record.startTime)}</span>
                    </td>
                    <td className="p-3 text-slate-800 font-b-mitra font-time text-sm font-bold text-right">
                      <span dir="ltr" className="inline-block">{toPersianDigits(record.endTime)}</span>
                    </td>
                    <td className="p-3 font-b-mitra font-time font-bold text-slate-900 text-sm">
                      {formatMinutes(record.durationMinutes, isPersian)}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">
                      {record.notes || '-'}
                    </td>
                  </tr>
                );
              })}

              {sortedRecords.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-slate-400">
                    {isPersian ? 'رکوردی مطابق فیلترهای انتخابی یافت نشد.' : 'No records match selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Quick Add Record Modal */}
      {isQuickAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {quickAddType === 'regular' && <Clock className="w-5 h-5 text-blue-600" />}
                {quickAddType === 'mission' && <Briefcase className="w-5 h-5 text-indigo-600" />}
                {quickAddType === 'leave' && <CalendarCheck className="w-5 h-5 text-amber-600" />}
                {quickAddType === 'special' && <Zap className="w-5 h-5 text-rose-600" />}
                <h3 className="font-bold text-base text-slate-800">
                  {t.addRecord} -{' '}
                  {quickAddType === 'regular'
                    ? t.regularWork
                    : quickAddType === 'mission'
                    ? t.missionRecord
                    : quickAddType === 'leave'
                    ? t.leaveRecord
                    : t.specialWorkRecord}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {qError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-b-nazanin">
                {qError}
              </div>
            )}

            <form onSubmit={handleSaveQuickAdd} className="space-y-4">
              {/* Start Date and Start Time */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPersian ? 'شروع (تاریخ و ساعت):' : 'Start (Date & Time):'}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PersianDatePicker
                    value={qStartDate}
                    onChange={(newDate) => {
                      setQStartDate(newDate);
                      if (!isQEndDateManuallySet) {
                        setQEndDate(newDate);
                      }
                    }}
                    label={isPersian ? 'تاریخ شروع' : 'Start Date'}
                    required
                    isPersian={isPersian}
                  />
                  <TimePicker
                    value={qStartTime}
                    onChange={setQStartTime}
                    label={isPersian ? 'ساعت شروع' : 'Start Time'}
                    required
                    isPersian={isPersian}
                  />
                </div>
              </div>

              {/* End Date and End Time */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPersian ? 'پایان (تاریخ و ساعت):' : 'End (Date & Time):'}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PersianDatePicker
                    value={qEndDate}
                    onChange={(newDate) => {
                      setQEndDate(newDate);
                      setIsQEndDateManuallySet(true);
                    }}
                    label={isPersian ? 'تاریخ پایان' : 'End Date'}
                    required
                    isPersian={isPersian}
                  />
                  <TimePicker
                    value={qEndTime}
                    onChange={setQEndTime}
                    label={isPersian ? 'ساعت پایان' : 'End Time'}
                    required
                    isPersian={isPersian}
                  />
                </div>
              </div>

              {/* Calculated duration display */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs flex justify-between items-center font-b-nazanin">
                <span className="text-blue-700 font-semibold">{t.durationCol}:</span>
                <span className="font-bold text-blue-900 text-sm font-b-mitra">
                  {formatMinutes(calculateFullDurationMinutes(qStartDate, qStartTime, qEndDate, qEndTime), isPersian)}
                </span>
              </div>

              {/* Project selector for regular, mission */}
              {(quickAddType === 'regular' || quickAddType === 'mission') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.projectCol} {quickAddType === 'regular' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={qProjectId}
                    onChange={e => setQProjectId(e.target.value)}
                    required={quickAddType === 'regular'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">{isPersian ? 'انتخاب پروژه...' : 'Select project...'}</option>
                    {availableProjects.map(p => (
                      <option key={p.id} value={p.id} disabled={!p.isActive}>
                        {p.title} {!p.isActive ? `(${t.inactiveStatus} - غیرقابل ثبت)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Leave Type */}
              {quickAddType === 'leave' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'نوع مرخصی' : 'Leave Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={qLeaveType}
                    onChange={e => setQLeaveType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {leaveTypeOptions.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Special Work Type */}
              {quickAddType === 'special' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'نوع کارکرد خاص' : 'Special Work Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={qSpecialType}
                    onChange={e => setQSpecialType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {specialTypeOptions.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mission Destination */}
              {quickAddType === 'mission' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'مقصد یا هدف ماموریت' : 'Mission Destination / Purpose'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={qMissionDestination}
                    onChange={e => setQMissionDestination(e.target.value)}
                    placeholder={isPersian ? 'مثال: دفتر کارفرما، بازدید فنی...' : 'e.g. Client headquarters'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.notesCol} <span className="text-slate-400 font-normal">({t.optional})</span>
                </label>
                <textarea
                  rows={2}
                  value={qNotes}
                  onChange={e => setQNotes(e.target.value)}
                  placeholder={isPersian ? 'شرح مختصری از اقدامات انجام‌شده...' : 'Brief description of activity...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel / CSV Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        user={user}
        isPersian={isPersian}
        onImportSuccess={(count) => {
          setRecordsList(StorageService.getAttendanceRecords());
          setProjectsList(StorageService.getProjects());
          setImportSuccessNotice(
            isPersian
              ? `${toPersianDigits(count)} رکورد کارکرد با موفقیت از فایل اکسل به سیستم اضافه گردید.`
              : `Successfully imported ${count} work records from Excel.`
          );
          setTimeout(() => setImportSuccessNotice(null), 5000);
        }}
      />
    </div>
  );
};
