import React, { useState, useEffect, useMemo } from 'react';
import { User, Project, AttendanceRecord } from '../types';
import { StorageService } from '../utils/storage';
import {
  toPersianDigits,
  getTodayJalali,
  calculateFullDurationMinutes,
  formatMinutes,
  addMinutesToTime,
  jalaliToGregorian
} from '../utils/jalali';
import { Play, Square, Timer, FolderKanban, CheckCircle2, X, Calendar, Clock } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface LiveWorkTrackerCardProps {
  user: User;
  isPersian?: boolean;
  projectsList: Project[];
  onRecordSaved?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const LiveWorkTrackerCard: React.FC<LiveWorkTrackerCardProps> = ({
  user,
  isPersian = true,
  projectsList,
  onRecordSaved,
  onNavigateTab
}) => {
  const isAdmin = user.role === 'admin';

  // Available projects accessible by current user
  const availableProjects = useMemo(() => {
    if (isAdmin || user.role === 'executive') return projectsList;
    const userGroups = Array.isArray(user.groupIds) ? user.groupIds : [];
    return projectsList.filter(p => Array.isArray(p.groupIds) && p.groupIds.some(gid => userGroups.includes(gid)));
  }, [projectsList, isAdmin, user.groupIds]);

  // Initial time helper
  const getCurrentTimeStr = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Live Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartTs, setTimerStartTs] = useState<number | null>(null);
  const [timerStartTimeStr, setTimerStartTimeStr] = useState(getCurrentTimeStr);
  const [timerStartDateStr, setTimerStartDateStr] = useState(getTodayJalali);
  const [timerProjectId, setTimerProjectId] = useState('');
  const [timerNotes, setTimerNotes] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerSuccessNotice, setTimerSuccessNotice] = useState<string | null>(null);

  // Missing Project Dialog
  const [isMissingProjectModalOpen, setIsMissingProjectModalOpen] = useState(false);
  const [modalSelectedProjectId, setModalSelectedProjectId] = useState('');

  const missingProjectModalTrapRef = useModalFocusTrap<HTMLDivElement>({
    isOpen: isMissingProjectModalOpen,
    onClose: () => {
      if (modalSelectedProjectId === '') {
        setIsMissingProjectModalOpen(false);
      }
    }
  });

  // Calculate precise timestamp from Jalali date and HH:mm time in local timezone
  const recalculateStartTs = (dateStr: string, timeStr: string): number => {
    try {
      const safeDate = dateStr && dateStr.includes('/') ? dateStr : getTodayJalali();
      const [jy, jm, jd] = safeDate.split('/').map(Number);
      const [h, m] = (timeStr || '00:00').split(':').map(Number);
      const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
      const d = new Date(gy, gm - 1, gd, h || 0, m || 0, 0);
      const ts = d.getTime();
      return isNaN(ts) ? Date.now() : ts;
    } catch {
      return Date.now();
    }
  };

  // Format digital stopwatch in Persian digits and B Mitra font
  const formatStopwatchPersian = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hStr = toPersianDigits(String(hours).padStart(2, '0'));
    const mStr = toPersianDigits(String(minutes).padStart(2, '0'));
    const sStr = toPersianDigits(String(seconds).padStart(2, '0'));
    return `${hStr}:${mStr}:${sStr}`;
  };

  // Sync state from storage
  const applyTimerData = (t: any) => {
    const startTs = Number(t?.startTs || t?.startTimestamp || 0);
    if (t && t.isRunning && startTs > 0) {
      const stoppedTs = Math.max(
        Number(localStorage.getItem(`attendance_live_timer_stopped_${user.id}`) || '0'),
        Number(localStorage.getItem(`attendance_stopped_timer_ts_${user.id}`) || '0')
      );
      if (stoppedTs && startTs <= stoppedTs) {
        setTimerRunning(false);
        setTimerStartTs(null);
        setSecondsElapsed(0);
        return;
      }
      setTimerRunning(true);
      setTimerStartTs(startTs);
      setTimerStartTimeStr(t.startTimeStr || getCurrentTimeStr());
      setTimerStartDateStr(t.startDateStr || getTodayJalali());
      setTimerProjectId(t.projectId || '');
      setTimerNotes(t.notes || '');
      const diff = Math.floor((Date.now() - startTs) / 1000);
      setSecondsElapsed(diff > 0 ? diff : 0);
    } else {
      setTimerRunning(false);
      setTimerStartTs(null);
      setSecondsElapsed(0);
    }
  };

  // 1. Initial restore + Server sync + Cross-component sync
  useEffect(() => {
    const localTimer = StorageService.getActiveTimer(user.id);
    applyTimerData(localTimer);

    // Cross-device sync from backend
    fetch(`/api/active-timer/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.activeTimer && data.activeTimer.isRunning) {
          const startTs = Number(data.activeTimer.startTs || data.activeTimer.startTimestamp || 0);
          const stoppedTs = Math.max(
            Number(localStorage.getItem(`attendance_live_timer_stopped_${user.id}`) || '0'),
            Number(localStorage.getItem(`attendance_stopped_timer_ts_${user.id}`) || '0')
          );
          if (stoppedTs && startTs <= stoppedTs) {
            StorageService.clearActiveTimer(user.id);
            applyTimerData(null);
            return;
          }
          const enriched = { ...data.activeTimer, startTs, startTimestamp: startTs };
          StorageService.setActiveTimer(user.id, enriched);
          applyTimerData(enriched);
        } else if (data && data.activeTimer === null) {
          // If local storage has a running timer, do not let null from server cancel it immediately
          const localRunning = StorageService.getActiveTimer(user.id);
          if (!localRunning || !localRunning.isRunning) {
            localStorage.removeItem(`attendance_live_timer_${user.id}`);
            applyTimerData(null);
          }
        }
      })
      .catch(() => {});

    // Listen to local sync events between Dashboard and WorkRecordsView
    const handleTimerSync = (e: any) => {
      if (e && e.type === 'active_timer_sync' && 'detail' in e) {
        applyTimerData(e.detail);
      } else {
        const current = StorageService.getActiveTimer(user.id);
        applyTimerData(current);
      }
    };

    window.addEventListener('active_timer_sync', handleTimerSync);
    window.addEventListener('storage', handleTimerSync);
    window.addEventListener('app_storage_synced', handleTimerSync);

    return () => {
      window.removeEventListener('active_timer_sync', handleTimerSync);
      window.removeEventListener('storage', handleTimerSync);
      window.removeEventListener('app_storage_synced', handleTimerSync);
    };
  }, [user.id]);

  // 2. Continuous Live Ticker
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerStartTs) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - timerStartTs) / 1000);
        setSecondsElapsed(diff > 0 ? diff : 0);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerStartTs]);

  // Live update start time
  const handleStartTimeChange = (newTime: string) => {
    setTimerStartTimeStr(newTime);
    if (timerRunning) {
      const newTs = recalculateStartTs(timerStartDateStr, newTime);
      setTimerStartTs(newTs);
      const diff = Math.floor((Date.now() - newTs) / 1000);
      setSecondsElapsed(diff > 0 ? diff : 0);
      const updated = {
        isRunning: true,
        startTs: newTs,
        startTimestamp: newTs,
        startTimeStr: newTime,
        startDateStr: timerStartDateStr,
        projectId: timerProjectId,
        notes: timerNotes,
        userId: user.id
      };
      StorageService.setActiveTimer(user.id, updated);
      window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: updated }));
    }
  };

  // Live update start date
  const handleStartDateChange = (newDate: string) => {
    setTimerStartDateStr(newDate);
    if (timerRunning) {
      const newTs = recalculateStartTs(newDate, timerStartTimeStr);
      setTimerStartTs(newTs);
      const diff = Math.floor((Date.now() - newTs) / 1000);
      setSecondsElapsed(diff > 0 ? diff : 0);
      const updated = {
        isRunning: true,
        startTs: newTs,
        startTimestamp: newTs,
        startTimeStr: timerStartTimeStr,
        startDateStr: newDate,
        projectId: timerProjectId,
        notes: timerNotes,
        userId: user.id
      };
      StorageService.setActiveTimer(user.id, updated);
      window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: updated }));
    }
  };

  const handleStartTimer = (overrideProjectId?: string, overrideNotes?: string) => {
    const chosenDate = timerStartDateStr || getTodayJalali();
    const chosenTime = timerStartTimeStr || getCurrentTimeStr();
    const startTs = recalculateStartTs(chosenDate, chosenTime);
    const prjId = overrideProjectId !== undefined ? overrideProjectId : timerProjectId;
    const notes = overrideNotes !== undefined ? overrideNotes : timerNotes;

    const timer = {
      isRunning: true,
      startTs,
      startTimestamp: startTs,
      startTimeStr: chosenTime,
      startDateStr: chosenDate,
      projectId: prjId,
      notes,
      userId: user.id
    };

    setTimerStartTs(startTs);
    setTimerStartTimeStr(chosenTime);
    setTimerStartDateStr(chosenDate);
    setTimerProjectId(prjId);
    setTimerNotes(notes);
    const diff = Math.floor((Date.now() - startTs) / 1000);
    setSecondsElapsed(diff > 0 ? diff : 0);
    setTimerRunning(true);
    setTimerSuccessNotice(null);

    try {
      localStorage.removeItem(`attendance_stopped_timer_ts_${user.id}`);
      localStorage.removeItem(`attendance_live_timer_stopped_${user.id}`);
    } catch {}

    StorageService.setActiveTimer(user.id, timer);
    window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: timer }));
  };

  const handleStopTimerClick = () => {
    if (!timerRunning || !timerStartTs) return;

    if (!timerProjectId || timerProjectId.trim() === '') {
      setModalSelectedProjectId('');
      setIsMissingProjectModalOpen(true);
      return;
    }

    commitFinalizeRecord(timerProjectId);
  };

  const commitFinalizeRecord = (finalProjectId?: string) => {
    if (!timerRunning || !timerStartTs) return;

    const stoppedStartTs = timerStartTs;
    // Calculate elapsed duration strictly from start timestamp, independent of device timezone
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - stoppedStartTs) / 1000));
    const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));

    // Calculate end time and end date purely by adding duration to start time (100% timezone independent)
    const { endDateJalali, endTime } = addMinutesToTime(timerStartDateStr, timerStartTimeStr, durationMins);
    const endDateStr = endDateJalali;
    const endTimeStr = endTime;

    const prj = availableProjects.find(p => p.id === finalProjectId);
    const prjName = prj ? prj.title : (finalProjectId ? '' : (isPersian ? 'بدون پروژه' : 'Unassigned Project'));

    let finalNotes = timerNotes.trim();
    if (!finalProjectId) {
      finalNotes = finalNotes ? `${finalNotes} (${isPersian ? 'بدون پروژه' : 'No Project'})` : (isPersian ? 'بدون پروژه' : 'No Project');
    }

    // CRITICAL: Clear active timer FIRST before saving attendance record so pushToServer() never sends a running timer back!
    try {
      localStorage.setItem(`attendance_stopped_timer_ts_${user.id}`, String(stoppedStartTs));
    } catch {}
    setTimerRunning(false);
    setTimerStartTs(null);
    setSecondsElapsed(0);
    setTimerProjectId('');
    setTimerNotes('');
    setTimerStartTimeStr(getCurrentTimeStr());
    setTimerStartDateStr(getTodayJalali());
    setIsMissingProjectModalOpen(false);

    StorageService.clearActiveTimer(user.id);
    window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: null }));

    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now()}`,
      userId: user.id,
      type: 'regular',
      startDate: timerStartDateStr,
      startTime: timerStartTimeStr,
      endDate: endDateStr,
      endTime: endTimeStr,
      date: timerStartDateStr,
      durationMinutes: durationMins,
      projectId: finalProjectId || undefined,
      notes: finalNotes || (isPersian ? 'ثبت کارکرد' : 'Work record tracked'),
      createdAt: getTodayJalali(),
      updatedAt: new Date().toISOString()
    };

    StorageService.saveAttendanceRecord(newRecord);
    StorageService.addLog(
      'CREATE_ATTENDANCE',
      `ثبت کارکرد از ${timerStartDateStr} ${timerStartTimeStr} تا ${endDateStr} ${endTimeStr} (${formatMinutes(durationMins, isPersian)}) [${prjName}]`
    );

    setTimerSuccessNotice(
      isPersian
        ? `کارکرد با موفقیت ثبت شد: از ${toPersianDigits(timerStartTimeStr)} تا ${toPersianDigits(endTimeStr)} (مدت: ${formatMinutes(durationMins, isPersian)}) - [${prjName}]`
        : `Work record saved: from ${timerStartTimeStr} to ${endTimeStr} (${formatMinutes(durationMins, isPersian)}) - [${prjName}]`
    );

    if (onRecordSaved) {
      onRecordSaved();
    }
  };

  return (
    <div className="space-y-3">
      {/* Success Notification Banner */}
      {timerSuccessNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between gap-3 shadow-2xs font-b-nazanin animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{timerSuccessNotice}</span>
          </div>
          <button
            tabIndex={0}
            onClick={() => setTimerSuccessNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 cursor-pointer focus:ring-2 focus:ring-emerald-500 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Live Card - "ثبت کارکرد" */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          timerRunning
            ? 'bg-gradient-to-r from-emerald-900 to-teal-900 text-white border-emerald-500/40 shadow-lg'
            : 'bg-white text-slate-800 border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Title, Status and Live Date/Time controls */}
          <div className="space-y-3 w-full lg:w-auto">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3 rounded-xl ${
                  timerRunning
                    ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/30 animate-pulse'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-bold ${timerRunning ? 'text-white' : 'text-slate-900'}`}>
                    {isPersian ? 'ثبت کارکرد زنده' : 'Live Work Tracker'}
                  </h3>
                  {timerRunning ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{isPersian ? 'در حال ثبت کارکرد...' : 'Tracking work time...'}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      {isPersian ? 'آماده شروع' : 'Ready'}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 font-b-nazanin ${timerRunning ? 'text-emerald-200/80' : 'text-slate-500'}`}>
                  {timerRunning
                    ? (isPersian
                        ? 'تغییر تاریخ یا ساعت شروع در زیر، بلافاصله در محاسبه زمان سپری‌شده اعمال می‌شود.'
                        : 'Editing start date or time below updates elapsed timer live.')
                    : (isPersian
                        ? 'پروژه را انتخاب کنید و دکمه شروع را بزنید تا ساعت کارکرد محاسبه و ثبت شود.'
                        : 'Select project and click Start to track and save work hours.')}
                </p>
              </div>
            </div>

            {/* Editable Start Date & Start Time - Live customizable */}
            <div className={`flex flex-wrap items-center gap-2.5 p-2 rounded-xl border ${
              timerRunning
                ? 'bg-emerald-950/40 border-emerald-500/30'
                : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Start Date */}
              <div className="flex items-center gap-1.5">
                <Calendar className={`w-3.5 h-3.5 ${timerRunning ? 'text-emerald-300' : 'text-slate-400'}`} />
                <span className={`text-[11px] font-bold font-b-nazanin ${timerRunning ? 'text-emerald-200' : 'text-slate-600'}`}>
                  {isPersian ? 'تاریخ شروع:' : 'Start Date:'}
                </span>
                <input
                  type="text"
                  value={timerStartDateStr}
                  onChange={e => handleStartDateChange(e.target.value)}
                  placeholder="1405/08/03"
                  className={`w-28 px-2.5 py-1 rounded-lg text-xs font-b-mitra font-bold text-center border focus:outline-hidden transition-colors ${
                    timerRunning
                      ? 'bg-emerald-950/80 text-white border-emerald-400/50 focus:ring-2 focus:ring-emerald-400'
                      : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  dir="ltr"
                />
              </div>

              {/* Start Time */}
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${timerRunning ? 'text-emerald-300' : 'text-slate-400'}`} />
                <span className={`text-[11px] font-bold font-b-nazanin ${timerRunning ? 'text-emerald-200' : 'text-slate-600'}`}>
                  {isPersian ? 'ساعت شروع:' : 'Start Time:'}
                </span>
                <input
                  type="time"
                  value={timerStartTimeStr}
                  onChange={e => handleStartTimeChange(e.target.value)}
                  className={`w-24 px-2 py-1 rounded-lg text-xs font-b-mitra font-time font-bold text-center border focus:outline-hidden transition-colors ${
                    timerRunning
                      ? 'bg-emerald-950/80 text-white border-emerald-400/50 focus:ring-2 focus:ring-emerald-400'
                      : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                  dir="ltr"
                />
              </div>

              {timerRunning && (
                <span className="text-[10px] text-emerald-300/80 font-b-nazanin hidden sm:inline">
                  {isPersian ? '(محاسبه لایو زمان بر اساس ساعت بالا)' : '(Live recalculation active)'}
                </span>
              )}
            </div>
          </div>

          {/* Center Digital Stopwatch Display in B Mitra Font & Persian Digits */}
          <div
            className={`flex flex-col items-center justify-center px-6 py-2.5 rounded-xl border ${
              timerRunning
                ? 'bg-black/30 border-emerald-500/30 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-0.5 font-b-nazanin">
              {isPersian ? 'مدت زمان سپری شده' : 'Elapsed Time'}
            </span>
            <div className="text-3xl sm:text-4xl font-b-mitra font-time font-bold tracking-widest" dir="ltr">
              {formatStopwatchPersian(secondsElapsed)}
            </div>
          </div>

          {/* Right Inputs & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Project Selector */}
            <div className="w-full sm:w-56">
              <select
                tabIndex={0}
                value={timerProjectId}
                onChange={e => {
                  setTimerProjectId(e.target.value);
                  if (timerRunning && timerStartTs) {
                    const updated = {
                      isRunning: true,
                      startTs: timerStartTs,
                      startTimestamp: timerStartTs,
                      startTimeStr: timerStartTimeStr,
                      startDateStr: timerStartDateStr,
                      projectId: e.target.value,
                      notes: timerNotes,
                      userId: user.id
                    };
                    StorageService.setActiveTimer(user.id, updated);
                    window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: updated }));
                  }
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden transition-colors ${
                  timerRunning
                    ? 'bg-emerald-950/60 text-white border border-emerald-400/40 focus:ring-2 focus:ring-emerald-400'
                    : 'bg-white text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              >
                <option value="" className="text-slate-800">
                  {isPersian ? '-- انتخاب پروژه --' : '-- Select Project --'}
                </option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-800">
                    {p.title} {!p.isActive ? `(${isPersian ? 'غیرفعال' : 'Inactive'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Note */}
            <div className="w-full sm:w-44">
              <input
                tabIndex={0}
                type="text"
                placeholder={isPersian ? 'یادداشت کوتاه کارکرد...' : 'Note...'}
                value={timerNotes}
                onChange={e => {
                  setTimerNotes(e.target.value);
                  if (timerRunning && timerStartTs) {
                    const updated = {
                      isRunning: true,
                      startTs: timerStartTs,
                      startTimestamp: timerStartTs,
                      startTimeStr: timerStartTimeStr,
                      startDateStr: timerStartDateStr,
                      projectId: timerProjectId,
                      notes: e.target.value,
                      userId: user.id
                    };
                    StorageService.setActiveTimer(user.id, updated);
                    window.dispatchEvent(new CustomEvent('active_timer_sync', { detail: updated }));
                  }
                }}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden transition-colors ${
                  timerRunning
                    ? 'bg-emerald-950/60 text-white placeholder-emerald-300/50 border border-emerald-400/40 focus:ring-2 focus:ring-emerald-400'
                    : 'bg-white text-slate-800 placeholder-slate-400 border border-slate-300 focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            {/* Start / Finish Buttons */}
            {!timerRunning ? (
              <button
                tabIndex={0}
                type="button"
                onClick={() => handleStartTimer()}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-102 focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isPersian ? 'شروع' : 'Start'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <button
                  tabIndex={0}
                  type="button"
                  onClick={handleStopTimerClick}
                  className="flex-1 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-102 focus:ring-2 focus:ring-rose-400 focus:outline-hidden"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>{isPersian ? 'پایان و ثبت کارکرد' : 'Finish & Add Record'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Missing Project Dialog */}
      {isMissingProjectModalOpen && (
        <div
          onClick={e => {
            if (e.target === e.currentTarget && modalSelectedProjectId === '') {
              setIsMissingProjectModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
        >
          <div
            ref={missingProjectModalTrapRef}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-slate-800 cursor-default"
          >
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isPersian ? 'انتخاب پروژه جهت ثبت کارکرد' : 'Select Project to Finalize Work'}
                </h3>
                <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
                  {isPersian ? 'فیلد پروژه برای این کارکرد خالی مانده است' : 'No project was chosen for this work session'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-b-nazanin mb-4">
              {isPersian
                ? 'لطفاً پروژه مرتبط با این بازه زمانی را انتخاب نمایید، یا در صورتی که کارکرد متعلق به پروژه خاصی نیست، دکمه «ثبت به عنوان بدون پروژه» را بزنید.'
                : 'Please select a project for this session, or save it as unassigned without project.'}
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-slate-700">
                {isPersian ? 'لیست پروژه‌های فعال:' : 'Active Projects:'}
              </label>
              <select
                tabIndex={0}
                value={modalSelectedProjectId}
                onChange={e => setModalSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">{isPersian ? '-- انتخاب پروژه --' : '-- Choose Project --'}</option>
                {availableProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {!p.isActive ? `(${isPersian ? 'غیرفعال' : 'Inactive'})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-100">
              <button
                tabIndex={0}
                type="button"
                disabled={!modalSelectedProjectId}
                onClick={() => commitFinalizeRecord(modalSelectedProjectId)}
                className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {isPersian ? 'ثبت با این پروژه' : 'Save with Selected Project'}
              </button>

              <button
                tabIndex={0}
                type="button"
                onClick={() => commitFinalizeRecord(undefined)}
                className="w-full sm:flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer focus:ring-2 focus:ring-slate-400 focus:outline-hidden"
              >
                {isPersian ? 'ثبت به عنوان بدون پروژه' : 'Save as Unassigned'}
              </button>

              <button
                tabIndex={0}
                type="button"
                onClick={() => setIsMissingProjectModalOpen(false)}
                className="w-full sm:w-auto py-2.5 px-3 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer focus:ring-2 focus:ring-slate-300 rounded-lg focus:outline-hidden"
              >
                {isPersian ? 'انصراف' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
