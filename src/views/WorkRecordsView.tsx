import React, { useState, useMemo } from 'react';
import { User, AttendanceRecord, Project, WorkRecordType } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, getCustomTypeTitle } from '../utils/storage';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { TimePicker } from '../components/TimePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  getTodayJalali,
  calculateFullDurationMinutes,
  formatMinutes
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
  ArrowUpDown,
  Search,
  Calendar
} from 'lucide-react';

interface WorkRecordsViewProps {
  user: User;
  type: WorkRecordType;
  lang: Language;
}

type SortColumn = 'startDate' | 'startTime' | 'endDate' | 'endTime' | 'project' | 'duration' | 'typeSpecific' | 'notes';

export const WorkRecordsView: React.FC<WorkRecordsViewProps> = ({
  user,
  type,
  lang
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const settings = StorageService.getSettings();
  const allProjects = StorageService.getProjects();

  const availableProjects = useMemo(() => {
    if (user.role === 'admin' || user.role === 'executive') {
      return allProjects;
    }
    return allProjects.filter(p =>
      p.groupIds.some(gid => user.groupIds.includes(gid))
    );
  }, [allProjects, user]);

  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    StorageService.getAttendanceRecords().filter(r => r.userId === user.id && r.type === type)
  );

  // Filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortColumn>('startDate');
  const [sortAsc, setSortAsc] = useState(false);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Form fields
  const [formStartDate, setFormStartDate] = useState(getTodayJalali());
  const [formStartTime, setFormStartTime] = useState('08:30');
  const [formEndDate, setFormEndDate] = useState(getTodayJalali());
  const [formEndTime, setFormEndTime] = useState('16:30');
  const [formProjectId, setFormProjectId] = useState('');
  const [formLeaveType, setFormLeaveType] = useState(() =>
    settings.leaveTypes[0] ? getCustomTypeTitle(settings.leaveTypes[0], lang) : 'مرخصی عادی'
  );
  const [formSpecialType, setFormSpecialType] = useState(() =>
    settings.specialWorkTypes[0] ? getCustomTypeTitle(settings.specialWorkTypes[0], lang) : 'قطعی برق'
  );
  const [formMissionDestination, setFormMissionDestination] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const reloadRecords = () => {
    setRecords(StorageService.getAttendanceRecords().filter(r => r.userId === user.id && r.type === type));
  };

  const getTitle = () => {
    switch (type) {
      case 'regular': return t.regularWork;
      case 'mission': return t.missionRecord;
      case 'leave': return t.leaveRecord;
      case 'special': return t.specialWorkRecord;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'regular': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'mission': return <Briefcase className="w-5 h-5 text-indigo-600" />;
      case 'leave': return <CalendarCheck className="w-5 h-5 text-amber-600" />;
      case 'special': return <Zap className="w-5 h-5 text-rose-600" />;
    }
  };

  // Helpers for bilingual leave & special work types
  const getDisplayLeaveType = (rec: AttendanceRecord) => {
    if (!rec.leaveType && !rec.leaveTypeId) return '-';
    const found = settings.leaveTypes.find(
      lt => (typeof lt === 'object' && lt.id === rec.leaveTypeId) ||
            (typeof lt === 'object' && (lt.titleFa === rec.leaveType || lt.titleEn === rec.leaveType)) ||
            lt === rec.leaveType
    );
    if (found) return getCustomTypeTitle(found, lang);
    return rec.leaveType || '-';
  };

  const getDisplaySpecialType = (rec: AttendanceRecord) => {
    if (!rec.specialWorkType && !rec.specialWorkTypeId) return '-';
    const found = settings.specialWorkTypes.find(
      st => (typeof st === 'object' && st.id === rec.specialWorkTypeId) ||
            (typeof st === 'object' && (st.titleFa === rec.specialWorkType || st.titleEn === rec.specialWorkType)) ||
            st === rec.specialWorkType
    );
    if (found) return getCustomTypeTitle(found, lang);
    return rec.specialWorkType || '-';
  };

  const handleOpenAdd = () => {
    const today = getTodayJalali();
    setEditingRecord(null);
    setFormStartDate(today);
    setFormStartTime('08:30');
    setFormEndDate(today);
    setFormEndTime('16:30');
    const firstActive = availableProjects.find(p => p.isActive);
    setFormProjectId(firstActive ? firstActive.id : '');
    setFormLeaveType(settings.leaveTypes[0] ? getCustomTypeTitle(settings.leaveTypes[0], lang) : 'مرخصی عادی');
    setFormSpecialType(settings.specialWorkTypes[0] ? getCustomTypeTitle(settings.specialWorkTypes[0], lang) : 'قطعی برق');
    setFormMissionDestination('');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormStartDate(rec.startDate || rec.date || getTodayJalali());
    setFormStartTime(rec.startTime || '08:30');
    setFormEndDate(rec.endDate || rec.startDate || rec.date || getTodayJalali());
    setFormEndTime(rec.endTime || '16:30');
    setFormProjectId(rec.projectId || '');
    setFormLeaveType(rec.leaveType || (settings.leaveTypes[0] ? getCustomTypeTitle(settings.leaveTypes[0], lang) : ''));
    setFormSpecialType(rec.specialWorkType || (settings.specialWorkTypes[0] ? getCustomTypeTitle(settings.specialWorkTypes[0], lang) : ''));
    setFormMissionDestination(rec.missionDestination || '');
    setFormNotes(rec.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = calculateFullDurationMinutes(formStartDate, formStartTime, formEndDate, formEndTime);
    if (duration <= 0) {
      setFormError(
        isPersian
          ? 'تاریخ و ساعت پایان باید بعد از تاریخ و ساعت شروع باشد.'
          : 'End date & time must be strictly after start date & time.'
      );
      return;
    }

    if (formProjectId && !editingRecord) {
      const targetPrj = allProjects.find(p => p.id === formProjectId);
      if (targetPrj && !targetPrj.isActive) {
        setFormError(
          isPersian
            ? 'این پروژه غیرفعال است و امکان ثبت ساعت جدید برای آن وجود ندارد.'
            : 'This project is inactive and cannot accept new work hours.'
        );
        return;
      }
    }

    const selectedLeave = settings.leaveTypes.find(
      lt => getCustomTypeTitle(lt, lang) === formLeaveType ||
            (typeof lt === 'object' && (lt.titleFa === formLeaveType || lt.titleEn === formLeaveType))
    );
    const selectedSpecial = settings.specialWorkTypes.find(
      st => getCustomTypeTitle(st, lang) === formSpecialType ||
            (typeof st === 'object' && (st.titleFa === formSpecialType || st.titleEn === formSpecialType))
    );

    const newRecord: AttendanceRecord = {
      id: editingRecord ? editingRecord.id : `rec-${Date.now()}`,
      userId: user.id,
      type,
      startDate: formStartDate,
      startTime: formStartTime,
      endDate: formEndDate,
      endTime: formEndTime,
      date: formStartDate, // backward compatibility
      durationMinutes: duration,
      projectId: formProjectId || undefined,
      leaveTypeId: type === 'leave' && selectedLeave && typeof selectedLeave === 'object' ? selectedLeave.id : undefined,
      leaveType: type === 'leave' ? formLeaveType : undefined,
      specialWorkTypeId: type === 'special' && selectedSpecial && typeof selectedSpecial === 'object' ? selectedSpecial.id : undefined,
      specialWorkType: type === 'special' ? formSpecialType : undefined,
      missionDestination: type === 'mission' ? formMissionDestination : undefined,
      notes: formNotes,
      createdAt: editingRecord ? editingRecord.createdAt : getTodayJalali()
    };

    StorageService.saveAttendanceRecord(newRecord);
    StorageService.addLog(
      editingRecord ? 'UPDATE_ATTENDANCE' : 'CREATE_ATTENDANCE',
      `ثبت/ویرایش رکورد نوع ${type} از ${formStartDate} ${formStartTime} تا ${formEndDate} ${formEndTime} به مدت ${formatMinutes(duration, isPersian)}`
    );

    setIsModalOpen(false);
    reloadRecords();
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      StorageService.deleteAttendanceRecord(deleteTargetId);
      StorageService.addLog('DELETE_ATTENDANCE', `رکورد شناسه ${deleteTargetId} حذف شد.`);
      setDeleteTargetId(null);
      reloadRecords();
    }
  };

  const toggleSort = (col: SortColumn) => {
    if (sortField === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(col);
      setSortAsc(false);
    }
  };

  // Filtered and sorted records
  const filteredAndSortedRecords = useMemo(() => {
    return records
      .filter(r => {
        const sDate = r.startDate || r.date || '';
        const eDate = r.endDate || r.startDate || r.date || '';

        if (filterStartDate && sDate < filterStartDate) return false;
        if (filterEndDate && eDate > filterEndDate) return false;
        if (filterProjectId && r.projectId !== filterProjectId) return false;
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const matchNotes = r.notes?.toLowerCase().includes(q);
          const matchDest = r.missionDestination?.toLowerCase().includes(q);
          const matchLt = r.leaveType?.toLowerCase().includes(q);
          const matchSt = r.specialWorkType?.toLowerCase().includes(q);
          if (!matchNotes && !matchDest && !matchLt && !matchSt) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        const aStart = (a.startDate || a.date || '') + ' ' + (a.startTime || '');
        const bStart = (b.startDate || b.date || '') + ' ' + (b.startTime || '');
        const aEnd = (a.endDate || a.startDate || a.date || '') + ' ' + (a.endTime || '');
        const bEnd = (b.endDate || b.startDate || b.date || '') + ' ' + (b.endTime || '');

        if (sortField === 'startDate') diff = aStart.localeCompare(bStart);
        else if (sortField === 'startTime') diff = (a.startTime || '').localeCompare(b.startTime || '');
        else if (sortField === 'endDate') diff = aEnd.localeCompare(bEnd);
        else if (sortField === 'endTime') diff = (a.endTime || '').localeCompare(b.endTime || '');
        else if (sortField === 'duration') diff = a.durationMinutes - b.durationMinutes;
        else if (sortField === 'project') {
          const prjA = allProjects.find(p => p.id === a.projectId)?.title || '';
          const prjB = allProjects.find(p => p.id === b.projectId)?.title || '';
          diff = prjA.localeCompare(prjB);
        } else if (sortField === 'notes') {
          diff = (a.notes || '').localeCompare(b.notes || '');
        } else if (sortField === 'typeSpecific') {
          const valA = a.leaveType || a.specialWorkType || a.missionDestination || '';
          const valB = b.leaveType || b.specialWorkType || b.missionDestination || '';
          diff = valA.localeCompare(valB);
        }

        return sortAsc ? diff : -diff;
      });
  }, [records, filterStartDate, filterEndDate, filterProjectId, filterSearch, sortField, sortAsc, allProjects]);

  const totalFilteredMinutes = useMemo(() => {
    return filteredAndSortedRecords.reduce((acc, r) => acc + r.durationMinutes, 0);
  }, [filteredAndSortedRecords]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {getIcon()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{getTitle()}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'ثبت و پیگیری دقیق تاریخ و ساعت شروع و پایان با تقویم شمسی'
                : 'Log and track start/end date and time with minute precision'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addRecord}</span>
        </button>
      </div>

      {/* Filter Bar with all columns filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{t.filter}:</span>
        </div>

        <div className="w-44">
          <PersianDatePicker
            value={filterStartDate}
            onChange={setFilterStartDate}
            label={isPersian ? 'از تاریخ شروع' : 'From Start Date'}
            isPersian={isPersian}
          />
        </div>

        <div className="w-44">
          <PersianDatePicker
            value={filterEndDate}
            onChange={setFilterEndDate}
            label={isPersian ? 'تا تاریخ پایان' : 'To End Date'}
            isPersian={isPersian}
          />
        </div>

        {(type === 'regular' || type === 'mission' || type === 'special') && (
          <div className="w-52">
            <label className="block text-xs font-medium text-slate-700 mb-1">{t.projectCol}</label>
            <select
              value={filterProjectId}
              onChange={e => setFilterProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            >
              <option value="">{isPersian ? 'همه پروژه‌ها' : 'All Projects'}</option>
              {availableProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} {!p.isActive ? `(${t.inactiveStatus})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="w-48">
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {isPersian ? 'جستجو در شرح / مقصد' : 'Search Notes / Destination'}
          </label>
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder={isPersian ? 'کلمه کلیدی...' : 'Search...'}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          />
        </div>

        {(filterStartDate || filterEndDate || filterProjectId || filterSearch) && (
          <button
            onClick={() => {
              setFilterStartDate('');
              setFilterEndDate('');
              setFilterProjectId('');
              setFilterSearch('');
            }}
            className="mt-5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilter}</span>
          </button>
        )}

        <div className="mr-auto ml-auto sm:ml-0 text-xs text-slate-500 font-semibold self-end pb-2 font-b-nazanin">
          {isPersian ? 'مجموع فیلتر شده:' : 'Filtered Sum:'}{' '}
          <span className="text-slate-900 font-bold text-sm">
            {formatMinutes(totalFilteredMinutes, isPersian)}
          </span>
        </div>
      </div>

      {/* Records Table with all columns sortable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-10 text-center">#</th>

                {/* Start Date */}
                <th onClick={() => toggleSort('startDate')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'تاریخ شروع' : 'Start Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Start Time */}
                <th onClick={() => toggleSort('startTime')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'ساعت شروع' : 'Start Time'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* End Date */}
                <th onClick={() => toggleSort('endDate')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'تاریخ پایان' : 'End Date'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* End Time */}
                <th onClick={() => toggleSort('endTime')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'ساعت پایان' : 'End Time'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {(type === 'regular' || type === 'mission' || type === 'special') && (
                  <th onClick={() => toggleSort('project')} className="p-3 cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      <span>{t.projectCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {type === 'leave' && (
                  <th onClick={() => toggleSort('typeSpecific')} className="p-3 cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'نوع مرخصی' : 'Leave Type'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {type === 'special' && (
                  <th onClick={() => toggleSort('typeSpecific')} className="p-3 cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'نوع کارکرد خاص' : 'Special Type'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {type === 'mission' && (
                  <th onClick={() => toggleSort('typeSpecific')} className="p-3 cursor-pointer hover:bg-slate-100">
                    <div className="flex items-center gap-1">
                      <span>{isPersian ? 'مقصد / هدف' : 'Destination'}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Duration */}
                <th onClick={() => toggleSort('duration')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{t.durationCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Notes */}
                <th onClick={() => toggleSort('notes')} className="p-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>{t.notesCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th className="p-3 text-center">{t.actionsCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-b-nazanin">
              {filteredAndSortedRecords.map((rec, idx) => {
                const prj = allProjects.find(p => p.id === rec.projectId);

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-800">{rec.startDate || rec.date}</td>
                    <td className="p-3 font-mono text-slate-600 font-bold" dir="ltr">{rec.startTime}</td>
                    <td className="p-3 font-semibold text-slate-800">{rec.endDate || rec.startDate || rec.date}</td>
                    <td className="p-3 font-mono text-slate-600 font-bold" dir="ltr">{rec.endTime}</td>

                    {(type === 'regular' || type === 'mission' || type === 'special') && (
                      <td className="p-3 font-medium text-slate-800">
                        {prj ? (
                          <span className="flex items-center gap-1.5">
                            {prj.title}
                            {!prj.isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-bold">
                                {t.inactiveStatus}
                              </span>
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}

                    {type === 'leave' && (
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px]">
                          {getDisplayLeaveType(rec)}
                        </span>
                      </td>
                    )}

                    {type === 'special' && (
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px]">
                          {getDisplaySpecialType(rec)}
                        </span>
                      </td>
                    )}

                    {type === 'mission' && (
                      <td className="p-3 font-semibold text-indigo-700">
                        {rec.missionDestination || '-'}
                      </td>
                    )}

                    <td className="p-3 font-bold text-slate-900">
                      {formatMinutes(rec.durationMinutes, isPersian)}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{rec.notes || '-'}</td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={t.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(rec.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredAndSortedRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    {isPersian ? 'هیچ رکوردی با فیلترهای انتخابی یافت نشد.' : 'No records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal with Start Date, Start Time, End Date, End Time */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingRecord
                  ? (isPersian ? 'ویرایش رکورد' : 'Edit Record')
                  : (isPersian ? `ثبت جدید ${getTitle()}` : `Add New ${getTitle()}`)}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-b-nazanin">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Start Date and Start Time */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPersian ? 'شروع (تاریخ و ساعت):' : 'Start (Date & Time):'}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PersianDatePicker
                    value={formStartDate}
                    onChange={setFormStartDate}
                    label={isPersian ? 'تاریخ شروع' : 'Start Date'}
                    required
                    isPersian={isPersian}
                  />
                  <TimePicker
                    value={formStartTime}
                    onChange={setFormStartTime}
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
                    value={formEndDate}
                    onChange={setFormEndDate}
                    label={isPersian ? 'تاریخ پایان' : 'End Date'}
                    required
                    isPersian={isPersian}
                  />
                  <TimePicker
                    value={formEndTime}
                    onChange={setFormEndTime}
                    label={isPersian ? 'ساعت پایان' : 'End Time'}
                    required
                    isPersian={isPersian}
                  />
                </div>
              </div>

              {/* Calculated duration display */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs flex justify-between items-center font-b-nazanin">
                <span className="text-blue-700 font-semibold">{t.durationCol}:</span>
                <span className="font-bold text-blue-900 text-sm">
                  {formatMinutes(calculateFullDurationMinutes(formStartDate, formStartTime, formEndDate, formEndTime), isPersian)}
                </span>
              </div>

              {/* Project selector for regular, mission, special */}
              {(type === 'regular' || type === 'mission' || type === 'special') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.projectCol} {type === 'regular' && <span className="text-red-500">*</span>}
                    {type === 'special' && <span className="text-slate-400 font-normal">({t.optional})</span>}
                  </label>
                  <select
                    value={formProjectId}
                    onChange={e => setFormProjectId(e.target.value)}
                    required={type === 'regular'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="">{isPersian ? 'انتخاب پروژه...' : 'Select project...'}</option>
                    {availableProjects.map(p => (
                      <option key={p.id} value={p.id} disabled={!p.isActive && !editingRecord}>
                        {p.title} {!p.isActive ? `(${t.inactiveStatus} - غیرقابل ثبت)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bilingual Leave Type */}
              {type === 'leave' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'نوع مرخصی' : 'Leave Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formLeaveType}
                    onChange={e => setFormLeaveType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {settings.leaveTypes.map(lt => {
                      const title = getCustomTypeTitle(lt, lang);
                      return (
                        <option key={title} value={title}>{title}</option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Bilingual Special Work Type */}
              {type === 'special' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'نوع کارکرد خاص' : 'Special Work Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formSpecialType}
                    onChange={e => setFormSpecialType(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {settings.specialWorkTypes.map(st => {
                      const title = getCustomTypeTitle(st, lang);
                      return (
                        <option key={title} value={title}>{title}</option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Mission Destination */}
              {type === 'mission' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isPersian ? 'مقصد یا هدف ماموریت' : 'Mission Destination / Purpose'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formMissionDestination}
                    onChange={e => setFormMissionDestination(e.target.value)}
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
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder={isPersian ? 'شرح مختصری از اقدامات انجام‌شده...' : 'Brief description of activity...'}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
