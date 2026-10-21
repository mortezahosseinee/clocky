import React, { useState, useMemo, useEffect } from 'react';
import { User, AttendanceRecord, Project, WorkRecordType } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, getCustomTypeTitle } from '../utils/storage';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { TimePicker } from '../components/TimePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import {
  getTodayJalali,
  calculateFullDurationMinutes,
  formatMinutes,
  toPersianDigits,
  getJalaliWeekday,
  formatDateWithWeekday
} from '../utils/jalali';
import {
  Plus,
  Trash2,
  Edit2,
  Clock,
  Briefcase,
  CalendarCheck,
  Zap,
  Filter,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  CalendarDays,
  FolderKanban,
  CheckCircle2,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface AllRecordsViewProps {
  user: User;
  lang: Language;
  onNavigateTab?: (tab: any) => void;
}

interface DayGroup {
  date: string;
  weekday: string;
  records: AttendanceRecord[];
  totalMinutes: number;
  regularMinutes: number;
  leaveMinutes: number;
  missionMinutes: number;
  specialMinutes: number;
}

export const AllRecordsView: React.FC<AllRecordsViewProps> = ({
  user,
  lang,
  onNavigateTab
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Filter States
  const [selectedUserId, setSelectedUserId] = useState<string>(isAdmin ? 'all' : user.id);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded days (date strings). By default, all days are expanded!
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form States for Add / Edit
  const [formData, setFormData] = useState({
    type: 'regular' as WorkRecordType,
    projectId: '',
    startDate: getTodayJalali(),
    startTime: '08:00',
    endDate: getTodayJalali(),
    endTime: '17:00',
    leaveType: 'مرخصی عادی',
    leaveTypeId: '',
    missionDestination: '',
    specialWorkType: 'قطعی برق',
    specialWorkTypeId: '',
    notes: '',
    targetUserId: user.id
  });

  const modalRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: isModalOpen,
    onClose: () => setIsModalOpen(false)
  });

  const reloadData = () => {
    setRecords(StorageService.getAttendanceRecords());
    setProjects(StorageService.getProjects());
    setAllUsers(StorageService.getUsers(false));
  };

  useEffect(() => {
    reloadData();
    const handleSync = () => reloadData();
    window.addEventListener('app_storage_synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('app_storage_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filter accessible projects
  const availableProjects = useMemo(() => {
    if (isAdmin || user.role === 'executive') return projects;
    const userGroups = Array.isArray(user.groupIds) ? user.groupIds : [];
    return projects.filter(p => Array.isArray(p.groupIds) && p.groupIds.some(gid => userGroups.includes(gid)));
  }, [projects, isAdmin, user.groupIds]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // User scope
      if (selectedUserId !== 'all' && r.userId !== selectedUserId) return false;
      if (!isAdmin && r.userId !== user.id) return false;

      // Type filter
      if (filterType !== 'all' && r.type !== filterType) return false;

      // Project filter
      if (filterProjectId !== 'all' && r.projectId !== filterProjectId) return false;

      // Date range filter
      const rDate = r.startDate || r.date || '';
      if (filterStartDate && rDate < filterStartDate) return false;
      if (filterEndDate && rDate > filterEndDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prjName = projects.find(p => p.id === r.projectId)?.title.toLowerCase() || '';
        const notes = (r.notes || '').toLowerCase();
        const dest = (r.missionDestination || '').toLowerCase();
        const lType = (r.leaveType || '').toLowerCase();
        const sType = (r.specialWorkType || '').toLowerCase();
        const matches = prjName.includes(q) || notes.includes(q) || dest.includes(q) || lType.includes(q) || sType.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [records, selectedUserId, isAdmin, user.id, filterType, filterProjectId, filterStartDate, filterEndDate, searchQuery, projects]);

  // Group by Date & Calculate Daily Summaries
  const dayGroups: DayGroup[] = useMemo(() => {
    const groupsMap: Record<string, AttendanceRecord[]> = {};

    for (const r of filteredRecords) {
      const d = r.startDate || r.date || getTodayJalali();
      if (!groupsMap[d]) {
        groupsMap[d] = [];
      }
      groupsMap[d].push(r);
    }

    // Sort dates descending (newest first)
    const sortedDates = Object.keys(groupsMap).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => {
      const dayRecs = groupsMap[date].sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
      let totalMinutes = 0;
      let regularMinutes = 0;
      let leaveMinutes = 0;
      let missionMinutes = 0;
      let specialMinutes = 0;

      for (const r of dayRecs) {
        const dur = r.durationMinutes || 0;
        totalMinutes += dur;
        if (r.type === 'regular') regularMinutes += dur;
        else if (r.type === 'leave') leaveMinutes += dur;
        else if (r.type === 'mission') missionMinutes += dur;
        else if (r.type === 'special') specialMinutes += dur;
      }

      return {
        date,
        weekday: getJalaliWeekday(date),
        records: dayRecs,
        totalMinutes,
        regularMinutes,
        leaveMinutes,
        missionMinutes,
        specialMinutes
      };
    });
  }, [filteredRecords]);

  // Expand all by default on first load or when dates change
  useEffect(() => {
    if (dayGroups.length > 0 && expandedDates.size === 0) {
      setExpandedDates(new Set(dayGroups.map(g => g.date)));
    }
  }, [dayGroups]);

  const toggleDayExpanded = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedDates(new Set(dayGroups.map(g => g.date)));
  };

  const handleCollapseAll = () => {
    setExpandedDates(new Set());
  };

  // Grand totals across all days
  const grandStats = useMemo(() => {
    let total = 0;
    let regular = 0;
    let leave = 0;
    let mission = 0;
    let special = 0;

    for (const g of dayGroups) {
      total += g.totalMinutes;
      regular += g.regularMinutes;
      leave += g.leaveMinutes;
      mission += g.missionMinutes;
      special += g.specialMinutes;
    }

    return { total, regular, leave, mission, special, count: filteredRecords.length, daysCount: dayGroups.length };
  }, [dayGroups, filteredRecords]);

  // Open Create Modal (optionally for a specific date)
  const handleOpenCreateModal = (specificDate?: string) => {
    const targetDate = specificDate || getTodayJalali();
    setEditingRecord(null);
    setFormData({
      type: 'regular',
      projectId: availableProjects[0]?.id || '',
      startDate: targetDate,
      startTime: '08:00',
      endDate: targetDate,
      endTime: '17:00',
      leaveType: 'مرخصی عادی',
      leaveTypeId: '',
      missionDestination: '',
      specialWorkType: 'قطعی برق',
      specialWorkTypeId: '',
      notes: '',
      targetUserId: isAdmin && selectedUserId !== 'all' ? selectedUserId : user.id
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormData({
      type: rec.type,
      projectId: rec.projectId || '',
      startDate: rec.startDate || rec.date || getTodayJalali(),
      startTime: rec.startTime || '08:00',
      endDate: rec.endDate || rec.startDate || rec.date || getTodayJalali(),
      endTime: rec.endTime || '17:00',
      leaveType: rec.leaveType || 'مرخصی عادی',
      leaveTypeId: rec.leaveTypeId || '',
      missionDestination: rec.missionDestination || '',
      specialWorkType: rec.specialWorkType || 'قطعی برق',
      specialWorkTypeId: rec.specialWorkTypeId || '',
      notes: rec.notes || '',
      targetUserId: rec.userId
    });
    setIsModalOpen(true);
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();

    const duration = calculateFullDurationMinutes(
      formData.startDate,
      formData.startTime,
      formData.endDate,
      formData.endTime
    );

    if (duration <= 0) {
      alert(isPersian ? 'زمان پایان باید بعد از زمان شروع باشد.' : 'End time must be after start time.');
      return;
    }

    const rec: AttendanceRecord = {
      id: editingRecord ? editingRecord.id : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: formData.targetUserId,
      type: formData.type,
      projectId: formData.type === 'regular' ? formData.projectId : undefined,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      date: formData.startDate,
      durationMinutes: duration,
      leaveType: formData.type === 'leave' ? formData.leaveType : undefined,
      leaveTypeId: formData.type === 'leave' ? formData.leaveTypeId : undefined,
      missionDestination: formData.type === 'mission' ? formData.missionDestination : undefined,
      specialWorkType: formData.type === 'special' ? formData.specialWorkType : undefined,
      specialWorkTypeId: formData.type === 'special' ? formData.specialWorkTypeId : undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: editingRecord ? editingRecord.createdAt : getTodayJalali(),
      updatedAt: getTodayJalali()
    };

    StorageService.saveAttendanceRecord(rec);
    StorageService.addLog(
      editingRecord ? 'UPDATE_ATTENDANCE' : 'CREATE_ATTENDANCE',
      `${isPersian ? 'ثبت رکورد' : 'Record'} ${formData.type} در ${formData.startDate} (${formatMinutes(duration, isPersian)})`
    );

    setIsModalOpen(false);
    reloadData();
  };

  // Delete Record
  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      StorageService.deleteAttendanceRecord(deleteTargetId);
      setDeleteTargetId(null);
      reloadData();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      {
        header: isPersian ? 'روز و تاریخ' : 'Day & Date',
        key: 'startDate',
        width: 20,
        format: (val, r) => formatDateWithWeekday(val || r.date)
      },
      { header: isPersian ? 'ساعت شروع' : 'Start Time', key: 'startTime', width: 12 },
      { header: isPersian ? 'ساعت پایان' : 'End Time', key: 'endTime', width: 12 },
      {
        header: isPersian ? 'نوع' : 'Type',
        key: 'type',
        width: 15,
        format: val => {
          if (val === 'regular') return isPersian ? 'کارکرد عادی' : 'Regular';
          if (val === 'leave') return isPersian ? 'مرخصی' : 'Leave';
          if (val === 'mission') return isPersian ? 'ماموریت' : 'Mission';
          return isPersian ? 'کارکرد خاص' : 'Special';
        }
      },
      {
        header: isPersian ? 'عنوان پروژه / جزئیات' : 'Project / Details',
        key: 'projectId',
        width: 25,
        format: (pid, r) => {
          if (r.type === 'regular') return projects.find(p => p.id === pid)?.title || '-';
          if (r.type === 'leave') return r.leaveType || '-';
          if (r.type === 'mission') return r.missionDestination || '-';
          return r.specialWorkType || '-';
        }
      },
      {
        header: isPersian ? 'مدت زمان' : 'Duration',
        key: 'durationMinutes',
        width: 16,
        format: min => formatMinutes(min, isPersian)
      },
      { header: isPersian ? 'توضیحات' : 'Notes', key: 'notes', width: 30 }
    ];

    exportTableToExcel(
      `AllRecords_${getTodayJalali().replace(/\//g, '-')}`,
      'All_Work_Records',
      columns,
      filteredRecords,
      isPersian
    );
  };

  // Export to PDF
  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      {
        header: isPersian ? 'روز و تاریخ' : 'Day & Date',
        key: 'startDate',
        width: 20,
        format: (val, r) => formatDateWithWeekday(val || r.date)
      },
      { header: isPersian ? 'ساعت شروع' : 'Start Time', key: 'startTime', width: 12 },
      { header: isPersian ? 'ساعت پایان' : 'End Time', key: 'endTime', width: 12 },
      {
        header: isPersian ? 'نوع' : 'Type',
        key: 'type',
        width: 15,
        format: val => {
          if (val === 'regular') return isPersian ? 'کارکرد عادی' : 'Regular';
          if (val === 'leave') return isPersian ? 'مرخصی' : 'Leave';
          if (val === 'mission') return isPersian ? 'ماموریت' : 'Mission';
          return isPersian ? 'کارکرد خاص' : 'Special';
        }
      },
      {
        header: isPersian ? 'عنوان / پروژه' : 'Title / Project',
        key: 'projectId',
        width: 25,
        format: (pid, r) => {
          if (r.type === 'regular') return projects.find(p => p.id === pid)?.title || '-';
          if (r.type === 'leave') return r.leaveType || '-';
          if (r.type === 'mission') return r.missionDestination || '-';
          return r.specialWorkType || '-';
        }
      },
      {
        header: isPersian ? 'مدت' : 'Duration',
        key: 'durationMinutes',
        width: 15,
        format: min => formatMinutes(min, isPersian)
      }
    ];

    exportTableToPdfPrint(
      isPersian ? 'گزارش تجمیعی همه کارکردها (به تفکیک روز)' : 'All Work Records Consolidated Report',
      isPersian ? `تعداد کل روزها: ${toPersianDigits(dayGroups.length)} روز | کل ساعت: ${formatMinutes(grandStats.total, isPersian)}` : `Total Days: ${dayGroups.length} | Hours: ${formatMinutes(grandStats.total, isPersian)}`,
      columns,
      filteredRecords,
      isPersian
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {isPersian ? 'همه کارکردها' : 'All Work Records'}
              </h2>
              <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
                {isPersian
                  ? 'مشاهده و مدیریت کلیه کارکردها، مرخصی‌ها، ماموریت‌ها و کارکردهای خاص به صورت تجمیع‌شده روزانه'
                  : 'Consolidated daily overview of regular hours, leaves, missions, and special work'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isPersian ? 'ثبت رکورد جدید' : 'New Record'}</span>
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

      {/* KPI Cards across selected filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{isPersian ? 'مجموع ساعات ثبتی' : 'Total Hours'}</span>
          <div className="mt-2 text-base font-black text-emerald-600 font-b-mitra">
            {formatMinutes(grandStats.total, isPersian)}
          </div>
          <span className="text-[10px] text-slate-400 font-b-nazanin">{toPersianDigits(grandStats.daysCount)} روز کاری</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{isPersian ? 'کارکرد عادی' : 'Regular Work'}</span>
          <div className="mt-2 text-base font-black text-blue-600 font-b-mitra">
            {formatMinutes(grandStats.regular, isPersian)}
          </div>
          <span className="text-[10px] text-slate-400 font-b-nazanin">{isPersian ? 'موثر در پروژه‌ها' : 'Effective'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{isPersian ? 'مرخصی' : 'Leaves'}</span>
          <div className="mt-2 text-base font-black text-amber-600 font-b-mitra">
            {formatMinutes(grandStats.leave, isPersian)}
          </div>
          <span className="text-[10px] text-slate-400 font-b-nazanin">{isPersian ? 'عادی، استعلاجی، تولد' : 'Sick, standard, bday'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{isPersian ? 'ماموریت' : 'Missions'}</span>
          <div className="mt-2 text-base font-black text-purple-600 font-b-mitra">
            {formatMinutes(grandStats.mission, isPersian)}
          </div>
          <span className="text-[10px] text-slate-400 font-b-nazanin">{isPersian ? 'ماموریت‌های اداری' : 'Company visits'}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">{isPersian ? 'کارکرد خاص' : 'Special Work'}</span>
          <div className="mt-2 text-base font-black text-rose-600 font-b-mitra">
            {formatMinutes(grandStats.special, isPersian)}
          </div>
          <span className="text-[10px] text-slate-400 font-b-nazanin">{isPersian ? 'قطعی برق، اضطراری' : 'Power outage, etc.'}</span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>{isPersian ? 'فیلترهای پیشرفته و بازه زمانی' : 'Advanced Filters'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-xs px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isPersian ? 'باز کردن همه روزها' : 'Expand All'}
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-xs px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isPersian ? 'بستن همه روزها' : 'Collapse All'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* User selection (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t.userCol}
              </label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{isPersian ? 'کلیه کاربران' : 'All Users'}</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.typeCol}
            </label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isPersian ? 'همه نوع‌ها' : 'All Types'}</option>
              <option value="regular">{isPersian ? 'کارکرد عادی' : 'Regular'}</option>
              <option value="leave">{isPersian ? 'مرخصی' : 'Leave'}</option>
              <option value="mission">{isPersian ? 'ماموریت' : 'Mission'}</option>
              <option value="special">{isPersian ? 'کارکرد خاص' : 'Special'}</option>
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t.projectCol}
            </label>
            <select
              value={filterProjectId}
              onChange={e => setFilterProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isPersian ? 'همه پروژه‌ها' : 'All Projects'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {isPersian ? 'از تاریخ' : 'From Date'}
            </label>
            <PersianDatePicker
              value={filterStartDate}
              onChange={setFilterStartDate}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {isPersian ? 'تا تاریخ' : 'To Date'}
            </label>
            <PersianDatePicker
              value={filterEndDate}
              onChange={setFilterEndDate}
            />
          </div>
        </div>

        {/* Search bar & clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={isPersian ? 'جستجو در پروژه، توضیحات، مقصد ماموریت یا نوع مرخصی...' : 'Search...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-b-nazanin"
            />
          </div>

          <div className="flex items-center gap-2">
            {(filterStartDate || filterEndDate || filterProjectId !== 'all' || filterType !== 'all' || searchQuery || (isAdmin && selectedUserId !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterProjectId('all');
                  setFilterType('all');
                  setSearchQuery('');
                  setSelectedUserId(isAdmin ? 'all' : user.id);
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearFilter}</span>
              </button>
            )}

            <span className="text-xs text-slate-500 font-semibold font-b-nazanin">
              {toPersianDigits(dayGroups.length)} روز | {toPersianDigits(filteredRecords.length)} رکورد
            </span>
          </div>
        </div>
      </div>

      {/* Daily Groups Stream */}
      <div className="space-y-4">
        {dayGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
              {isPersian ? 'رکوردی مطابق فیلترهای انتخابی یافت نشد.' : 'No records found matching filters.'}
            </p>
            <p className="text-xs mt-1 font-b-nazanin">
              {isPersian ? 'بازه تاریخی یا فیلترها را تغییر دهید یا رکورد جدید ثبت نمایید.' : 'Try adjusting the date filters or add a new record.'}
            </p>
          </div>
        ) : (
          dayGroups.map(group => {
            const isExpanded = expandedDates.has(group.date);

            return (
              <div
                key={group.date}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Day Master Row / Accordion Header */}
                <div
                  onClick={() => toggleDayExpanded(group.date)}
                  className={`p-4 px-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                    isExpanded
                      ? 'bg-gradient-to-r from-blue-50/70 via-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Left: Date + Weekday badge */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      <CalendarDays className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-2xs font-b-mitra">
                          {group.weekday || getJalaliWeekday(group.date)}
                        </span>
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-b-mitra">
                          {toPersianDigits(group.date)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-b-nazanin mt-0.5 block">
                        {toPersianDigits(group.records.length)} رکورد ثبت‌شده در این روز
                      </span>
                    </div>
                  </div>

                  {/* Right: Daily Totals Breakdown & Expand Indicator */}
                  <div className="flex flex-wrap items-center gap-3 font-b-mitra">
                    {/* Grand Total for the day */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs">
                      <span>{isPersian ? 'کل کارکرد روز:' : 'Total:'}</span>
                      <span className="text-sm">{formatMinutes(group.totalMinutes, isPersian)}</span>
                    </div>

                    {/* Breakdown pills if present */}
                    {group.regularMinutes > 0 && (
                      <span className="text-[11px] px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                        عادی: {formatMinutes(group.regularMinutes, isPersian)}
                      </span>
                    )}
                    {group.leaveMinutes > 0 && (
                      <span className="text-[11px] px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800">
                        مرخصی: {formatMinutes(group.leaveMinutes, isPersian)}
                      </span>
                    )}
                    {group.missionMinutes > 0 && (
                      <span className="text-[11px] px-2 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-800">
                        ماموریت: {formatMinutes(group.missionMinutes, isPersian)}
                      </span>
                    )}
                    {group.specialMinutes > 0 && (
                      <span className="text-[11px] px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800">
                        خاص: {formatMinutes(group.specialMinutes, isPersian)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenCreateModal(group.date);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title={isPersian ? 'افزودن رکورد به این روز' : 'Add to this day'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content: Detailed Records Table for this day */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right divide-y divide-slate-100 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold">
                        <tr>
                          {isAdmin && <th className="p-3">{t.userCol}</th>}
                          <th className="p-3">{t.typeCol}</th>
                          <th className="p-3">{isPersian ? 'عنوان / پروژه / مقصد' : 'Title / Project / Destination'}</th>
                          <th className="p-3">{isPersian ? 'ساعت شروع' : 'Start Time'}</th>
                          <th className="p-3">{isPersian ? 'ساعت پایان' : 'End Time'}</th>
                          <th className="p-3 text-center">{t.durationCol}</th>
                          <th className="p-3">{t.notesCol}</th>
                          <th className="p-3 text-center">{t.actionsCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-b-nazanin">
                        {group.records.map(rec => {
                          const rUser = allUsers.find(u => u.id === rec.userId);
                          const prj = projects.find(p => p.id === rec.projectId);

                          return (
                            <tr
                              key={rec.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {isAdmin && (
                                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {rUser ? `${rUser.firstName} ${rUser.lastName}` : rec.userId}
                                </td>
                              )}

                              {/* Type Badge */}
                              <td className="p-3">
                                {rec.type === 'regular' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                                    <Briefcase className="w-3 h-3" />
                                    <span>{isPersian ? 'کارکرد عادی' : 'Regular'}</span>
                                  </span>
                                )}
                                {rec.type === 'leave' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                                    <CalendarCheck className="w-3 h-3" />
                                    <span>{rec.leaveType || (isPersian ? 'مرخصی' : 'Leave')}</span>
                                  </span>
                                )}
                                {rec.type === 'mission' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]">
                                    <Layers className="w-3 h-3" />
                                    <span>{isPersian ? 'ماموریت' : 'Mission'}</span>
                                  </span>
                                )}
                                {rec.type === 'special' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                    <Zap className="w-3 h-3" />
                                    <span>{rec.specialWorkType || (isPersian ? 'کارکرد خاص' : 'Special')}</span>
                                  </span>
                                )}
                              </td>

                              {/* Project or details */}
                              <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                                {rec.type === 'regular' && (prj?.title || (isPersian ? 'بدون پروژه' : 'Unassigned'))}
                                {rec.type === 'leave' && (rec.leaveType || '-')}
                                {rec.type === 'mission' && (rec.missionDestination || (isPersian ? 'ماموریت اداری' : 'Mission'))}
                                {rec.type === 'special' && (rec.specialWorkType || '-')}
                              </td>

                              {/* Start Time */}
                              <td className="p-3 font-b-mitra text-blue-600 font-bold text-sm">
                                {toPersianDigits(rec.startTime)}
                              </td>

                              {/* End Time */}
                              <td className="p-3 font-b-mitra text-blue-600 font-bold text-sm">
                                {toPersianDigits(rec.endTime)}
                              </td>

                              {/* Duration */}
                              <td className="p-3 text-center font-b-mitra font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {formatMinutes(rec.durationMinutes, isPersian)}
                              </td>

                              {/* Notes */}
                              <td className="p-3 text-slate-500 max-w-xs truncate text-[11px]">
                                {rec.notes || '-'}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(rec)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                                    title={t.edit}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTargetId(rec.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                    title={t.delete}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Unified Add / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {editingRecord
                    ? (isPersian ? 'ویرایش رکورد کارکرد' : 'Edit Work Record')
                    : (isPersian ? 'ثبت رکورد کارکرد جدید' : 'New Work Record')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 space-y-4 font-b-nazanin text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.typeCol}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, type: 'regular' }))}
                    className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      formData.type === 'regular'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isPersian ? 'کارکرد عادی' : 'Regular'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, type: 'leave' }))}
                    className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      formData.type === 'leave'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isPersian ? 'مرخصی' : 'Leave'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, type: 'mission' }))}
                    className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      formData.type === 'mission'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isPersian ? 'ماموریت' : 'Mission'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, type: 'special' }))}
                    className={`py-2 px-1 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                      formData.type === 'special'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isPersian ? 'کارکرد خاص' : 'Special'}
                  </button>
                </div>
              </div>

              {/* Type-specific inputs */}
              {formData.type === 'regular' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.projectCol}
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={e => setFormData(p => ({ ...p, projectId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{isPersian ? 'انتخاب پروژه...' : 'Select project...'}</option>
                    {availableProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.type === 'leave' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'نوع مرخصی' : 'Leave Type'}
                  </label>
                  <select
                    value={formData.leaveType}
                    onChange={e => setFormData(p => ({ ...p, leaveType: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="مرخصی عادی">مرخصی عادی</option>
                    <option value="مرخصی استعلاجی">مرخصی استعلاجی</option>
                    <option value="مرخصی تولد">مرخصی تولد</option>
                    <option value="مرخصی بدون حقوق">مرخصی بدون حقوق</option>
                  </select>
                </div>
              )}

              {formData.type === 'mission' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'مقصد و موضوع ماموریت' : 'Destination / Topic'}
                  </label>
                  <input
                    type="text"
                    value={formData.missionDestination}
                    onChange={e => setFormData(p => ({ ...p, missionDestination: e.target.value }))}
                    placeholder={isPersian ? 'مثال: نمایشگاه بین‌المللی، بازدید سایت' : 'Destination'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {formData.type === 'special' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'علت کارکرد خاص' : 'Special Work Type'}
                  </label>
                  <select
                    value={formData.specialWorkType}
                    onChange={e => setFormData(p => ({ ...p, specialWorkType: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="قطعی برق">قطعی برق</option>
                    <option value="شرایط اضطراری">شرایط اضطراری</option>
                    <option value="تعطیلی ناخواسته">تعطیلی ناخواسته</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
              )}

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'تاریخ' : 'Date'}
                  </label>
                  <PersianDatePicker
                    value={formData.startDate}
                    onChange={v => setFormData(p => ({ ...p, startDate: v, endDate: v }))}
                  />
                </div>
                <div className="flex items-end">
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-xs font-b-mitra w-full text-center">
                    {getJalaliWeekday(formData.startDate) || 'روز هفته'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'ساعت شروع' : 'Start Time'}
                  </label>
                  <TimePicker
                    value={formData.startTime}
                    onChange={v => setFormData(p => ({ ...p, startTime: v }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isPersian ? 'ساعت پایان' : 'End Time'}
                  </label>
                  <TimePicker
                    value={formData.endTime}
                    onChange={v => setFormData(p => ({ ...p, endTime: v }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.notesCol}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder={isPersian ? 'توضیحات و جزئیات فعالیت...' : 'Notes...'}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-b-nazanin"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isPersian ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingRecord ? (isPersian ? 'ذخیره تغییرات' : 'Save Changes') : (isPersian ? 'ثبت رکورد' : 'Add Record')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title={isPersian ? 'حذف قطعی رکورد' : 'Delete Record'}
        message={isPersian ? 'آیا از حذف این رکورد کارکرد اطمینان دارید؟ این عملیات دائمی است و پس از رفرش باز نخواهد گشت.' : 'Are you sure you want to permanently delete this record?'}
        confirmText={isPersian ? 'بله، حذف کن' : 'Delete'}
        isDestructive={true}
        isPersian={isPersian}
      />
    </div>
  );
};
