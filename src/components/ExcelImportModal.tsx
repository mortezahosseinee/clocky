import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, Project, AttendanceRecord, AttendanceType } from '../types';
import { StorageService } from '../utils/storage';
import {
  gregorianToJalali,
  getTodayJalali,
  toPersianDigits,
  calculateFullDurationMinutes,
  formatMinutes,
  getJalaliWeekday
} from '../utils/jalali';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import {
  FileSpreadsheet,
  Upload,
  Check,
  X,
  AlertCircle,
  FolderKanban,
  CheckCircle2,
  CalendarCheck,
  Zap,
  Briefcase,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Clock,
  Edit3
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isPersian?: boolean;
  onImportSuccess: (count: number) => void;
}

interface ParsedImportRow {
  id: string;
  selected: boolean;
  rawProject: string;
  type: AttendanceType;
  leaveType?: string;
  specialWorkType?: string;
  missionDestination?: string;
  projectName: string;
  selectedProjectId: string; // project ID or 'CREATE_NEW'
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationMinutes: number;
}

export const TIMEZONE_OPTIONS = [
  { id: 'Asia/Tehran', label: 'ایران (تهران - GMT+03:30) [پیش‌فرض]', offsetMinutes: 0 },
  { id: 'UTC', label: 'گرینویچ / جهانی (UTC / GMT+00:00)', offsetMinutes: 210 },
  { id: 'Asia/Dubai', label: 'امارات متحده عربی (دبی - GMT+04:00)', offsetMinutes: -30 },
  { id: 'Europe/Istanbul', label: 'ترکیه (استانبول - GMT+03:00)', offsetMinutes: 30 },
  { id: 'Europe/Berlin', label: 'اروپای مرکزی (CET - GMT+01:00)', offsetMinutes: 150 },
  { id: 'Local', label: 'زمان محلی سیستم کاربر', offsetMinutes: 0 }
];

function parseFileDate(raw: any): string {
  if (!raw) return getTodayJalali();
  const str = String(raw).trim();
  const parts = str.split(/[\/\-\.]/).map(p => parseInt(p.trim(), 10));

  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
    // 1. Jalali YYYY/MM/DD (e.g. 1405/07/16)
    if (parts[0] >= 1300 && parts[0] < 1500) {
      return `${parts[0]}/${String(parts[1]).padStart(2, '0')}/${String(parts[2]).padStart(2, '0')}`;
    }
    // 2. Gregorian YYYY/MM/DD (e.g. 2026/10/07)
    if (parts[0] >= 1900) {
      const [jy, jm, jd] = gregorianToJalali(parts[0], parts[1], parts[2]);
      return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    }
    // 3. Gregorian DD/MM/YYYY or DD/MM/YY (e.g. 07/10/2026 or 23/09/2026)
    let year = parts[2];
    if (year < 100) year += 2000;
    if (year >= 1900) {
      const day = parts[0];
      const month = parts[1];
      const [jy, jm, jd] = gregorianToJalali(year, month, day);
      return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    }
  }

  return getTodayJalali();
}

function parseFileTime(raw: any, timezoneOffsetMinutes = 0): string {
  if (raw === null || raw === undefined || raw === '') return '08:00';

  let totalMinutes = 0;
  let parsed = false;

  // 1. JS Date object
  if (raw instanceof Date) {
    totalMinutes = raw.getHours() * 60 + raw.getMinutes();
    parsed = true;
  }

  let rawStr = String(raw).trim();
  // Standardize Persian/Arabic digits to English digits
  rawStr = rawStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
                 .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // 2. Date or ISO string with time (e.g. "2026-10-21T08:30:00" or "1403/07/28 14:30")
  if (!parsed && (rawStr.includes('T') || rawStr.includes(' '))) {
    const timePart = rawStr.split(/[T ]/)[1];
    if (timePart && timePart.includes(':')) {
      rawStr = timePart.trim();
    }
  }

  // 3. String with colon e.g. "11:00", "08:30:00", "2:30 PM", "11:15 AM", "۱۱:۰۰"
  if (!parsed) {
    const isPM = /pm|ب\.ظ|عصر/i.test(rawStr);
    const isAM = /am|ق\.ظ|صبح/i.test(rawStr);
    const colonMatch = rawStr.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (colonMatch) {
      let h = parseInt(colonMatch[1], 10);
      const m = parseInt(colonMatch[2], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      totalMinutes = (h % 24) * 60 + (m % 60);
      parsed = true;
    }
  }

  // 4. Numeric value (Excel fractional day serial, direct hour, or date+time serial)
  if (!parsed) {
    const num = typeof raw === 'number' ? raw : parseFloat(rawStr);
    if (!isNaN(num)) {
      if (num >= 0 && num < 1) {
        // Excel day fraction (e.g. 0.458333 is 11:00, 0.5 is 12:00)
        const totalSec = Math.round(num * 86400);
        const h = Math.floor(totalSec / 3600) % 24;
        const m = Math.floor((totalSec % 3600) / 60);
        totalMinutes = h * 60 + m;
        parsed = true;
      } else if (num >= 1 && num < 24) {
        // Direct decimal hour (e.g. 11 is 11:00, 8.5 is 08:30, 14.25 is 14:15)
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        totalMinutes = (h % 24) * 60 + (m % 60);
        parsed = true;
      } else if (num >= 1000) {
        // Excel full date-time serial (e.g. 45234.458333)
        const dayFraction = num - Math.floor(num);
        const totalSec = Math.round(dayFraction * 86400);
        const h = Math.floor(totalSec / 3600) % 24;
        const m = Math.floor((totalSec % 3600) / 60);
        totalMinutes = h * 60 + m;
        parsed = true;
      }
    }
  }

  if (!parsed) {
    return '08:00';
  }

  // Apply timezone adjustment if configured
  totalMinutes = (totalMinutes + timezoneOffsetMinutes + 1440 * 10) % 1440;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  user,
  isPersian = true,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Timezone selection (defaulting to Iran)
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Tehran');
  const [applyTimezoneConversion, setApplyTimezoneConversion] = useState(false);

  const timezoneShiftMinutes = useMemo(() => {
    if (!applyTimezoneConversion) return 0;
    const tz = TIMEZONE_OPTIONS.find(t => t.id === selectedTimezone);
    return tz ? tz.offsetMinutes : 0;
  }, [selectedTimezone, applyTimezoneConversion]);

  // Handle direct inline edits for date and time fields
  const handleUpdateRowField = (
    rowId: string,
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime',
    value: string
  ) => {
    setParsedRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };
        updated.durationMinutes = calculateFullDurationMinutes(
          updated.startDate,
          updated.startTime,
          updated.endDate,
          updated.endTime
        );
        return updated;
      })
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingProjects = useMemo(() => StorageService.getProjects(), [isOpen]);
  const existingGroups = useMemo(() => StorageService.getGroups(), [isOpen]);

  const modalRef = useModalFocusTrap<HTMLDivElement>({
    isOpen,
    onClose
  });

  if (!isOpen) return null;

  // Process uploaded file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setIsProcessing(true);

    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          processCsvText(text);
        } catch (err: any) {
          setErrorMsg(isPersian ? 'خطا در خواندن فایل CSV: ' + err.message : 'Error reading CSV file');
          setIsProcessing(false);
        }
      };
      reader.readAsText(selectedFile, 'utf-8');
    } else {
      // Excel file (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows: any[] = XLSX.utils.sheet_to_json(firstSheet, { raw: false });
          processStructuredRows(jsonRows);
        } catch (err: any) {
          setErrorMsg(isPersian ? 'خطا در خواندن فایل اکسل: ' + err.message : 'Error reading Excel file');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const processCsvText = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      setErrorMsg(isPersian ? 'فایل ارسالی خالی است یا رکوردی ندارد.' : 'The uploaded file has no rows.');
      setIsProcessing(false);
      return;
    }

    // Header mapping
    const headerCols = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const projectColIdx = headerCols.findIndex(h => h.includes('project') || h.includes('پروژه'));
    const startDateColIdx = headerCols.findIndex(h => h.includes('start date') || h.includes('تاریخ شروع') || h === 'startdate' || h === 'date');
    const startTimeColIdx = headerCols.findIndex(h => h.includes('start time') || h.includes('ساعت شروع') || h === 'starttime');
    const endDateColIdx = headerCols.findIndex(h => h.includes('end date') || h.includes('تاریخ پایان') || h === 'enddate');
    const endTimeColIdx = headerCols.findIndex(h => h.includes('end time') || h.includes('ساعت پایان') || h === 'endtime');

    const resultRows: ParsedImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Split by comma ignoring commas inside quotes
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols.some(c => c.length > 0)) continue;

      const rawProject = (projectColIdx >= 0 ? cols[projectColIdx] : cols[0]) || '';
      const rawStartDate = (startDateColIdx >= 0 ? cols[startDateColIdx] : cols[1]) || '';
      const rawStartTime = (startTimeColIdx >= 0 ? cols[startTimeColIdx] : cols[2]) || '08:00';
      const rawEndDate = (endDateColIdx >= 0 ? cols[endDateColIdx] : (cols[3] || rawStartDate)) || rawStartDate;
      const rawEndTime = (endTimeColIdx >= 0 ? cols[endTimeColIdx] : cols[4]) || '17:00';

      const parsedRow = mapSingleRow(rawProject, rawStartDate, rawStartTime, rawEndDate, rawEndTime, i);
      resultRows.push(parsedRow);
    }

    setParsedRows(resultRows);
    setIsProcessing(false);
  };

  const processStructuredRows = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setErrorMsg(isPersian ? 'رکوردی در فایل یافت نشد.' : 'No data rows found in file.');
      setIsProcessing(false);
      return;
    }

    const resultRows: ParsedImportRow[] = rows.map((r, idx) => {
      // Find keys case-insensitively
      const findVal = (keywords: string[]) => {
        for (const k of Object.keys(r)) {
          const lower = k.toLowerCase().replace(/[\s_\-]/g, '');
          if (keywords.some(kw => lower.includes(kw))) {
            return r[k];
          }
        }
        return '';
      };

      const rawProject = findVal(['project', 'پروژه']);
      const rawStartDate = findVal(['startdate', 'تاریخشروع', 'date', 'تاریخ']);
      const rawStartTime = findVal(['starttime', 'ساعتشروع', 'start']);
      const rawEndDate = findVal(['enddate', 'تاریخپایان']) || rawStartDate;
      const rawEndTime = findVal(['endtime', 'ساعتپایان', 'end']);

      return mapSingleRow(rawProject, rawStartDate, rawStartTime, rawEndDate, rawEndTime, idx + 1);
    });

    setParsedRows(resultRows);
    setIsProcessing(false);
  };

  // Map row according to requested rules:
  // - Leave => مرخصی عادی
  // - ILeave => مرخصی تولد
  // - Sleave => مرخصی استعلاجی
  // - NoPower => کارکرد خاص قطعی برق
  // - Exhibition => ماموریت (نمایشگاه)
  // - Other => Regular project (match existing or auto-create in general group)
  const mapSingleRow = (
    rawProject: string,
    rawStartDate: any,
    rawStartTime: any,
    rawEndDate: any,
    rawEndTime: any,
    idx: number
  ): ParsedImportRow => {
    const trimmedProject = String(rawProject || '').trim();
    const pUpper = trimmedProject.toUpperCase();

    let type: AttendanceType = 'regular';
    let leaveType: string | undefined = undefined;
    let specialWorkType: string | undefined = undefined;
    let missionDestination: string | undefined = undefined;
    let projectName = trimmedProject || (isPersian ? 'بدون نام' : 'Untitled');
    let selectedProjectId = 'CREATE_NEW';

    if (pUpper === 'LEAVE' || pUpper === 'مرخصی عادی') {
      type = 'leave';
      leaveType = 'مرخصی عادی';
      projectName = isPersian ? 'مرخصی عادی' : 'Standard Leave';
      selectedProjectId = '';
    } else if (pUpper === 'ILEAVE' || pUpper === 'مرخصی تولد') {
      type = 'leave';
      leaveType = 'مرخصی تولد';
      projectName = isPersian ? 'مرخصی تولد' : 'Birthday Leave';
      selectedProjectId = '';
    } else if (pUpper === 'SLEAVE' || pUpper === 'مرخصی استعلاجی') {
      type = 'leave';
      leaveType = 'مرخصی استعلاجی';
      projectName = isPersian ? 'مرخصی استعلاجی' : 'Sick Leave';
      selectedProjectId = '';
    } else if (pUpper === 'NOPOWER' || pUpper === 'قطعی برق') {
      type = 'special';
      specialWorkType = 'قطعی برق';
      projectName = isPersian ? 'کارکرد خاص (قطعی برق)' : 'Special (Power Outage)';
      selectedProjectId = '';
    } else if (pUpper === 'EXHIBITION' || pUpper === 'نمایشگاه') {
      type = 'mission';
      missionDestination = isPersian ? 'نمایشگاه' : 'Exhibition';
      projectName = isPersian ? 'ماموریت (نمایشگاه)' : 'Mission (Exhibition)';
      selectedProjectId = '';
    } else {
      type = 'regular';
      // Match with existing project
      const matched = existingProjects.find(
        p => p.title.trim().toLowerCase() === trimmedProject.toLowerCase()
      );
      if (matched) {
        selectedProjectId = matched.id;
        projectName = matched.title;
      } else {
        selectedProjectId = 'CREATE_NEW';
      }
    }

    const startDate = parseFileDate(rawStartDate);
    const startTime = parseFileTime(rawStartTime, timezoneShiftMinutes);
    const endDate = rawEndDate ? parseFileDate(rawEndDate) : startDate;
    const endTime = parseFileTime(rawEndTime, timezoneShiftMinutes);

    const durationMinutes = calculateFullDurationMinutes(startDate, startTime, endDate, endTime);

    return {
      id: `import-row-${idx}-${Date.now()}`,
      selected: true, // initially all checked
      rawProject: trimmedProject,
      type,
      leaveType,
      specialWorkType,
      missionDestination,
      projectName,
      selectedProjectId,
      startDate,
      startTime,
      endDate,
      endTime,
      durationMinutes: durationMinutes > 0 ? durationMinutes : 60
    };
  };

  // Toggle selection
  const handleToggleRow = (id: string) => {
    setParsedRows(prev =>
      prev.map(r => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const allSelected = parsedRows.length > 0 && parsedRows.every(r => r.selected);
  const handleToggleAll = () => {
    const next = !allSelected;
    setParsedRows(prev => prev.map(r => ({ ...r, selected: next })));
  };

  // Change project for regular record
  const handleProjectChange = (rowId: string, val: string) => {
    setParsedRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        if (val === 'CREATE_NEW') {
          return { ...r, selectedProjectId: 'CREATE_NEW' };
        }
        const found = existingProjects.find(p => p.id === val);
        return {
          ...r,
          selectedProjectId: val,
          projectName: found ? found.title : r.projectName
        };
      })
    );
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const toImport = parsedRows.filter(r => r.selected);
    if (toImport.length === 0) {
      alert(isPersian ? 'هیچ رکوردی برای افزودن انتخاب نشده است.' : 'No rows selected for import.');
      return;
    }

    // Ensure general group exists for new projects
    let generalGroup = existingGroups.find(
      g => g.name.includes('عمومی') || g.name.toLowerCase().includes('general')
    );
    if (!generalGroup) {
      generalGroup = {
        id: `grp-general-${Date.now()}`,
        name: isPersian ? 'گروه عمومی' : 'General Group',
        description: isPersian ? 'گروه پیش‌فرض و عمومی کلیه پرسنل' : 'Default organization general group',
        memberUserIds: [],
        createdAt: getTodayJalali()
      };
      StorageService.saveGroup(generalGroup);
    }

    // Map to keep track of dynamically created projects during this batch
    const createdProjectsMap: Record<string, Project> = {};

    let successCount = 0;

    for (const row of toImport) {
      let finalProjectId: string | undefined = undefined;

      if (row.type === 'regular') {
        if (row.selectedProjectId && row.selectedProjectId !== 'CREATE_NEW') {
          finalProjectId = row.selectedProjectId;
        } else {
          // Check if already created in this batch
          const projNameKey = row.projectName.trim().toLowerCase();
          if (createdProjectsMap[projNameKey]) {
            finalProjectId = createdProjectsMap[projNameKey].id;
          } else {
            // Check if exists in system
            const existingPrj = existingProjects.find(
              p => p.title.trim().toLowerCase() === projNameKey
            );
            if (existingPrj) {
              finalProjectId = existingPrj.id;
            } else {
              // Create in General Group as requested
              const newPrj: Project = {
                id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title: row.projectName.trim(),
                description: isPersian ? 'ایجاد خودکار از طریق بارگذاری اکسل' : 'Auto-created from Excel import',
                groupIds: [generalGroup.id],
                isActive: true,
                createdAt: getTodayJalali()
              };
              StorageService.saveProject(newPrj);
              createdProjectsMap[projNameKey] = newPrj;
              finalProjectId = newPrj.id;
            }
          }
        }
      }

      const newRecord: AttendanceRecord = {
        id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        type: row.type,
        startDate: row.startDate,
        startTime: row.startTime,
        endDate: row.endDate,
        endTime: row.endTime,
        date: row.startDate,
        durationMinutes: row.durationMinutes,
        leaveType: row.leaveType,
        specialWorkType: row.specialWorkType,
        missionDestination: row.missionDestination,
        projectId: finalProjectId,
        notes: isPersian ? `ثبت دسته‌جمعی از فایل اکسل (${row.rawProject})` : `Imported from Excel (${row.rawProject})`,
        createdAt: getTodayJalali()
      };

      StorageService.saveAttendanceRecord(newRecord);
      successCount++;
    }

    StorageService.addLog(
      'IMPORT_EXCEL',
      `بارگذاری دسته‌جمعی ${toPersianDigits(successCount)} رکورد کارکرد از فایل اکسل توسط ${user.firstName} ${user.lastName}`
    );

    StorageService.pushToServer();
    onImportSuccess(successCount);
    onClose();
  };

  const selectedCount = parsedRows.filter(r => r.selected).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isPersian ? 'بارگذاری فایل کارکرد (اکسل / CSV)' : 'Import Work Records from Excel / CSV'}
              </h3>
              <p className="text-xs text-emerald-100 font-b-nazanin">
                {isPersian
                  ? 'خواندن خودکار کارکردها، مرخصی‌ها (Leave/ILeave/Sleave)، قطعی برق (NoPower) و ماموریت (Exhibition)'
                  : 'Automatic mapping for regular projects, leaves, power outage and missions'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Timezone Question / Configuration */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block">
                  {isPersian ? 'تایم‌زون ثبت ساعت در فایل کجاست؟' : 'What is the recorded timezone of the file?'}
                </span>
                <span className="text-[11px] text-slate-500 font-b-nazanin">
                  {isPersian ? 'پیش‌فرض: ایران (ساعت‌ها مطابق ساعت رسمی کشور استخراج می‌شوند)' : 'Default: Iran Standard Time (Asia/Tehran)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedTimezone}
                onChange={e => setSelectedTimezone(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                {TIMEZONE_OPTIONS.map(tz => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </select>

              {selectedTimezone !== 'Asia/Tehran' && (
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTimezoneConversion}
                    onChange={e => setApplyTimezoneConversion(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{isPersian ? 'تبدیل ساعت‌ها به افق رسمی ایران' : 'Convert to Iran Time'}</span>
                </label>
              )}
            </div>
          </div>

          {/* Upload Area if no file or want to re-upload */}
          {parsedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-10 text-center space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-xs">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  {isPersian ? 'فایل اکسل یا CSV خود را انتخاب کنید' : 'Select your Excel or CSV file'}
                </h4>
                <p className="text-xs text-slate-500 font-b-nazanin mt-1 max-w-md">
                  {isPersian
                    ? 'فایل‌های با پسوند csv. و xlsx. با ستون‌های Project، Start Date، Start Time، End Date و End Time پشتیبانی می‌شوند.'
                    : 'Supports CSV and XLSX files with Project, Start Date, Start Time, End Date and End Time columns.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102 cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isPersian ? 'انتخاب فایل از رایانه' : 'Browse File'}</span>
                </button>
              </div>

              {isProcessing && (
                <div className="text-xs text-emerald-700 font-semibold animate-pulse">
                  {isPersian ? 'در حال پردازش و استخراج سطرها...' : 'Processing file rows...'}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2 font-b-nazanin">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Sample info pill */}
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 text-right max-w-lg font-b-nazanin">
                <span className="font-bold block text-slate-900 dark:text-slate-100 mb-1">
                  💡 راهنمای نگاشت خودکار ستون Project:
                </span>
                <ul className="list-disc pr-5 space-y-0.5">
                  <li><strong className="font-mono">Leave</strong> ⬅️ مرخصی عادی</li>
                  <li><strong className="font-mono">ILeave</strong> ⬅️ مرخصی تولد</li>
                  <li><strong className="font-mono">Sleave</strong> ⬅️ مرخصی استعلاجی</li>
                  <li><strong className="font-mono">NoPower</strong> ⬅️ کارکرد خاص قطعی برق</li>
                  <li><strong className="font-mono">Exhibition</strong> ⬅️ ماموریت نمایشگاه</li>
                  <li>سایر موارد ⬅️ کارکرد عادی با ایجاد خودکار در گروه عمومی</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Parsed rows preview table */
            <div className="space-y-4">
              {/* Summary toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-b-nazanin">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {file?.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                    {toPersianDigits(selectedCount)} از {toPersianDigits(parsedRows.length)} رکورد انتخاب شده
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFile(null);
                    }}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    {isPersian ? 'بارگذاری فایل دیگر' : 'Change File'}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-xs text-right divide-y divide-slate-100 dark:divide-slate-800">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleToggleAll}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">{isPersian ? 'نوع کارکرد' : 'Type'}</th>
                      <th className="p-3">{isPersian ? 'پروژه / جزئیات' : 'Project / Details'}</th>
                      <th className="p-3">
                        <div className="flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isPersian ? 'تاریخ و ساعت شروع' : 'Start Date & Time'}</span>
                        </div>
                      </th>
                      <th className="p-3">
                        <div className="flex items-center gap-1">
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isPersian ? 'تاریخ و ساعت پایان' : 'End Date & Time'}</span>
                        </div>
                      </th>
                      <th className="p-3 text-center">{isPersian ? 'مدت زمان' : 'Duration'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-b-nazanin">
                    {parsedRows.map((r, i) => {
                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            r.selected
                              ? 'bg-white dark:bg-slate-900 hover:bg-emerald-50/30'
                              : 'bg-slate-50/50 dark:bg-slate-900/30 opacity-50'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => handleToggleRow(r.id)}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Type Badge */}
                          <td className="p-3">
                            {r.type === 'regular' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                                <Briefcase className="w-3 h-3" />
                                <span>{isPersian ? 'کارکرد عادی' : 'Regular'}</span>
                              </span>
                            )}
                            {r.type === 'leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                                <CalendarCheck className="w-3 h-3" />
                                <span>{r.leaveType}</span>
                              </span>
                            )}
                            {r.type === 'special' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                <Zap className="w-3 h-3" />
                                <span>{r.specialWorkType}</span>
                              </span>
                            )}
                            {r.type === 'mission' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]">
                                <Layers className="w-3 h-3" />
                                <span>{r.missionDestination}</span>
                              </span>
                            )}
                          </td>

                          {/* Project dropdown or label */}
                          <td className="p-3">
                            {r.type === 'regular' ? (
                              <div className="flex items-center gap-1.5 max-w-xs">
                                <select
                                  value={r.selectedProjectId}
                                  onChange={e => handleProjectChange(r.id, e.target.value)}
                                  className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                >
                                  {r.selectedProjectId === 'CREATE_NEW' && (
                                    <option value="CREATE_NEW">
                                      ➕ {r.projectName} (ایجاد خودکار در گروه عمومی)
                                    </option>
                                  )}
                                  {existingProjects.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.title}
                                    </option>
                                  ))}
                                  {r.selectedProjectId !== 'CREATE_NEW' && (
                                    <option value="CREATE_NEW">
                                      ➕ نام جدید: {r.rawProject} (گروه عمومی)
                                    </option>
                                  )}
                                </select>
                              </div>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-400 font-semibold text-xs">
                                {r.projectName}
                              </span>
                            )}
                          </td>

                          {/* Start Date & Time (Editable) */}
                          <td className="p-2 font-b-mitra text-xs">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1">
                                {isPersian && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] shrink-0">
                                    {getJalaliWeekday(r.startDate)}
                                  </span>
                                )}
                                <input
                                  type="text"
                                  value={r.startDate}
                                  onChange={e => handleUpdateRowField(r.id, 'startDate', e.target.value)}
                                  className="w-24 px-1.5 py-0.5 text-center font-bold font-time bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                                  title={isPersian ? 'ویرایش تاریخ شروع (مثال: 1405/07/28)' : 'Edit Start Date'}
                                />
                              </div>
                              <input
                                type="text"
                                value={r.startTime}
                                onChange={e => handleUpdateRowField(r.id, 'startTime', e.target.value)}
                                className="w-20 px-1.5 py-0.5 text-center font-bold text-blue-600 font-time bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                                placeholder="08:00"
                                title={isPersian ? 'ویرایش ساعت شروع (مثال: 08:30)' : 'Edit Start Time'}
                              />
                            </div>
                          </td>

                          {/* End Date & Time (Editable) */}
                          <td className="p-2 font-b-mitra text-xs">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1">
                                {isPersian && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold text-[10px] shrink-0">
                                    {getJalaliWeekday(r.endDate)}
                                  </span>
                                )}
                                <input
                                  type="text"
                                  value={r.endDate}
                                  onChange={e => handleUpdateRowField(r.id, 'endDate', e.target.value)}
                                  className="w-24 px-1.5 py-0.5 text-center font-bold font-time bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                                  title={isPersian ? 'ویرایش تاریخ پایان' : 'Edit End Date'}
                                />
                              </div>
                              <input
                                type="text"
                                value={r.endTime}
                                onChange={e => handleUpdateRowField(r.id, 'endTime', e.target.value)}
                                className="w-20 px-1.5 py-0.5 text-center font-bold text-blue-600 font-time bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                                placeholder="17:00"
                                title={isPersian ? 'ویرایش ساعت پایان' : 'Edit End Time'}
                              />
                            </div>
                          </td>

                          {/* Duration */}
                          <td className="p-3 text-center font-b-mitra font-bold text-slate-700 dark:text-slate-300 text-sm">
                            {formatMinutes(r.durationMinutes, isPersian)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {isPersian ? 'انصراف' : 'Cancel'}
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirmImport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-102 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isPersian
                  ? `تایید و افزودن به سیستم (${toPersianDigits(selectedCount)} سطر)`
                  : `Confirm & Add (${selectedCount} rows)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
