import React, { useState, useEffect, useMemo } from 'react';
import {
  Webhook,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Link2,
  ShieldCheck,
  Send,
  HelpCircle,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  Sparkles,
  Info,
  Users,
  Layers,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import { User, Group, SystemSettings, AiFlowIntegrationConfig } from '../types';
import { StorageService } from '../utils/storage';
import { Language } from '../utils/translations';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { toPersianDigits, getTodayJalali, getCurrentJalaliParts } from '../utils/jalali';

interface IntegrationsViewProps {
  user: User;
  lang: Language;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ user, lang }) => {
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [groups, setGroups] = useState<Group[]>(() => StorageService.getGroups());

  // AI Flow Config State
  const initialConfig = settings.aiFlowConfig || {
    enabled: false,
    apiUrl: 'http://127.0.0.1:6060/api/workhours',
    apiToken: '',
    userKeyMappings: {},
    syncScope: 'all',
    selectedUserIds: [],
    selectedGroupIds: []
  };

  const [enabled, setEnabled] = useState<boolean>(initialConfig.enabled || false);
  const [apiUrl, setApiUrl] = useState<string>(initialConfig.apiUrl || '');
  const [apiToken, setApiToken] = useState<string>(initialConfig.apiToken || '');
  const [showToken, setShowToken] = useState<boolean>(false);
  const [syncScope, setSyncScope] = useState<'all' | 'specific'>(initialConfig.syncScope || 'all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialConfig.selectedUserIds || []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialConfig.selectedGroupIds || []);
  const [userKeyMappings, setUserKeyMappings] = useState<Record<string, string>>(
    () => initialConfig.userKeyMappings || {}
  );

  // Status & Feedback States
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Historical Batch Sync States
  const [batchSyncing, setBatchSyncing] = useState<boolean>(false);
  const [syncStartDate, setSyncStartDate] = useState<string>('');
  const [syncEndDate, setSyncEndDate] = useState<string>(() => getTodayJalali());
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);

  // User Filter & Scope State
  const [userSearch, setUserSearch] = useState<string>('');
  const [scopeUserSearch, setScopeUserSearch] = useState<string>('');
  const [onlyShowIncluded, setOnlyShowIncluded] = useState<boolean>(false);

  // Helper: check if a user is covered by selected groups
  const getUserInheritedGroup = (userId: string): Group | undefined => {
    if (selectedGroupIds.length === 0) return undefined;
    const targetUser = users.find(u => u.id === userId);
    if (targetUser && targetUser.role === 'admin') return undefined; // Admin does not belong to groups
    return groups.find(g => {
      if (!selectedGroupIds.includes(g.id)) return false;
      if (Array.isArray(g.memberUserIds) && g.memberUserIds.includes(userId)) return true;
      if (targetUser && Array.isArray(targetUser.groupIds) && targetUser.groupIds.includes(g.id)) return true;
      return false;
    });
  };

  // Helper: check if a user is eligible for syncing under current scope
  const isUserIncluded = (userId: string): boolean => {
    if (syncScope === 'all') return true;
    if (selectedUserIds.includes(userId)) return true;
    return !!getUserInheritedGroup(userId);
  };

  const [attendanceRecords] = useState(() => StorageService.getAttendanceRecords());

  const eligibleRecordsPreview = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const r of attendanceRecords) {
      if (!isUserIncluded(r.userId)) continue;
      const d = r.date || r.startDate;
      if (!d) continue;
      if (syncStartDate && d < syncStartDate) continue;
      if (syncEndDate && d > syncEndDate) continue;
      const key = `${r.userId}_${d}`;
      dayMap.set(key, (dayMap.get(key) || 0) + (Number(r.durationMinutes) || 0));
    }
    const eligibleUsers = users.filter(u => isUserIncluded(u.id));
    return {
      totalDays: dayMap.size,
      eligibleUsersCount: eligibleUsers.length
    };
  }, [attendanceRecords, syncScope, selectedUserIds, selectedGroupIds, syncStartDate, syncEndDate, users]);

  // Toggle user in specific selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Toggle group in specific selection
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // Handle saving main settings
  const handleSaveConfig = async () => {
    const updatedConfig: AiFlowIntegrationConfig = {
      ...settings.aiFlowConfig,
      enabled,
      apiUrl: apiUrl.trim(),
      apiToken: apiToken.trim(),
      syncScope,
      selectedUserIds,
      selectedGroupIds,
      userKeyMappings
    };

    const updatedSettings: SystemSettings = {
      ...settings,
      aiFlowConfig: updatedConfig
    };

    StorageService.saveSettings(updatedSettings);
    setSettings(updatedSettings);

    // Also push config to server API endpoint for immediate backend synchronization
    try {
      await fetch('/api/integrations/ai-flow/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
    } catch {}

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle testing connectivity to AI Flow health endpoint
  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      setTestResult({
        ok: false,
        message: isPersian ? 'لطفاً ابتدا آدرس API را وارد نمایید.' : 'Please enter the API URL first.'
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/integrations/ai-flow/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: apiUrl.trim(),
          apiToken: apiToken.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          message: isPersian
            ? (data.message || 'ارتباط با سرویس AI Flow با موفقیت برقرار شد.')
            : (data.message || 'Connected to AI Flow service successfully.')
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || (isPersian ? 'عدم برقراری ارتباط با سرویس AI Flow' : 'Failed to connect to AI Flow')
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: isPersian ? `خطا در برقراری ارتباط: ${err.message}` : `Connection error: ${err.message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle sending historical batch data
  const handleBatchSync = async () => {
    if (!apiUrl.trim() || !apiToken.trim()) {
      setSyncResult({
        ok: false,
        message: isPersian ? 'لطفاً ابتدا آدرس API و توکن را تکمیل و ذخیره نمایید.' : 'Please configure API URL and token first.'
      });
      return;
    }

    if (eligibleRecordsPreview.totalDays === 0) {
      setSyncResult({
        ok: false,
        message: isPersian ? 'هیچ رکوردی برای کاربران مشمول در بازه انتخابی یافت نشد.' : 'No records found for eligible users in this date range.'
      });
      return;
    }

    setBatchSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/integrations/ai-flow/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: apiUrl.trim(),
          apiToken: apiToken.trim(),
          startDate: syncStartDate || undefined,
          endDate: syncEndDate || undefined,
          userKeyMappings,
          syncScope,
          selectedUserIds,
          selectedGroupIds
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSyncResult({
          ok: true,
          message: isPersian
            ? `ارسال موفقیت‌آمیز بود! تعداد ${toPersianDigits(data.totalRecords || 0)} رکورد در قالب ${toPersianDigits(data.batches || 1)} بسته به AI Flow ارسال گردید.`
            : `Sync succeeded! Sent ${data.totalRecords || 0} records across ${data.batches || 1} batch(es) to AI Flow.`
        });
      } else {
        setSyncResult({
          ok: false,
          message: data.error || (isPersian ? 'خطا در ارسال دسته‌ای به AI Flow' : 'Batch sync failed.')
        });
      }
    } catch (err: any) {
      setSyncResult({
        ok: false,
        message: isPersian ? `خطای ارتباطی: ${err.message}` : `Network error: ${err.message}`
      });
    } finally {
      setBatchSyncing(false);
    }
  };

  // Update Jira UserKey mapping for a single employee
  const handleUserKeyChange = (userId: string, keyVal: string) => {
    setUserKeyMappings(prev => ({
      ...prev,
      [userId]: keyVal.trim()
    }));
  };

  // Auto-fill all blank mappings with employee username
  const handleAutoFillUsernames = () => {
    const updated = { ...userKeyMappings };
    users.forEach(u => {
      if (!updated[u.id]) {
        updated[u.id] = u.username;
      }
    });
    setUserKeyMappings(updated);
  };

  const filteredUsers = users.filter(u => {
    if (onlyShowIncluded && !isUserIncluded(u.id)) return false;
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const uName = (u.username || '').toLowerCase();
    const mapKey = (userKeyMappings[u.id] || '').toLowerCase();
    return fullName.includes(term) || uName.includes(term) || mapKey.includes(term);
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Webhook className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-b-mitra">
                {isPersian ? 'یکپارچه‌سازی با سامانه AI Flow' : 'AI Flow Integration & Webhooks'}
              </h2>
              <span
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                  enabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {enabled ? (isPersian ? 'ارسال خودکار فعال' : 'Auto-Sync Active') : (isPersian ? 'غیرفعال' : 'Disabled')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin mt-0.5">
              {isPersian
                ? 'ارسال بلادرنگ ساعات کارکرد پرسنل به سامانه هوش مصنوعی AI Flow جهت مقایسه حضور با کارکردهای ثبت‌شده در جیرا (Jira).'
                : 'Real-time workhours integration with AI Flow to compare presence data with Jira worklogs.'}
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer font-b-nazanin shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{isPersian ? 'ذخیره کل تنظیمات' : 'Save All Settings'}</span>
          </button>
        )}
      </div>

      {/* Success Notification Bar */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 font-b-nazanin animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{isPersian ? 'تنظیمات یکپارچه‌سازی AI Flow با موفقیت ذخیره گردید.' : 'AI Flow integration settings saved successfully.'}</span>
        </div>
      )}

      {/* Main Settings Card: Toggle, API URL, Token */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{isPersian ? 'تنظیمات اتصال و احراز هویت' : 'Connection & Authentication Settings'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin">
              {isPersian
                ? 'با فعال‌سازی این گزینه، هر زمان که رکوردی جدید ثبت یا ویرایش شود، کارکرد آن روز برای سرور AI Flow ارسال می‌گردد.'
                : 'When enabled, adding or editing work records automatically pushes daily totals to AI Flow.'}
            </p>
          </div>

          {/* Enable / Disable Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API URL Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-b-nazanin">
              {isPersian ? 'آدرس اندپوینت ثبت کارکرد AI Flow (API URL)' : 'AI Flow Workhours API URL'}
              <span className="text-red-500 mr-1">*</span>
            </label>
            <input
              type="text"
              dir="ltr"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="http://AI_FLOW_SERVER_IP:6060/api/workhours"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 font-b-nazanin mt-1">
              {isPersian
                ? 'مثال: http://192.168.20.10:6060/api/workhours (پورت پیش‌فرض AI Flow مقدار ۶۰۶۰ است)'
                : 'Example: http://192.168.20.10:6060/api/workhours (Default AI Flow port is 6060)'}
            </p>
          </div>

          {/* Bearer Token Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 font-b-nazanin">
              {isPersian ? 'توکن اختصاصی دسترسی (Bearer Token)' : 'Bearer Token'}
              <span className="text-red-500 mr-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                dir="ltr"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="مقدار توکن از فایل workhours-api.token"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-b-nazanin mt-1">
              {isPersian
                ? 'در سرور AI Flow با دستور sudo cat /etc/ai-flow/workhours-api.token قابل مشاهده است.'
                : 'Obtained via sudo cat /etc/ai-flow/workhours-api.token on the AI Flow server.'}
            </p>
          </div>
        </div>

        {/* Test Connection and Feedback */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer font-b-nazanin disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? (isPersian ? 'در حال بررسی اتصال...' : 'Testing...') : (isPersian ? 'تست ارتباط با AI Flow' : 'Test Connection')}</span>
          </button>

          {testResult && (
            <div
              className={`text-xs px-3 py-1.5 rounded-xl font-bold font-b-nazanin flex items-center gap-1.5 ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scope Settings Card: All vs Selected Users & Groups */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>{isPersian ? 'محدوده ارسال داده‌ها (پرسنل و گروه‌ها)' : 'Data Sync Scope (Users & Groups)'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin">
              {isPersian
                ? 'تعیین کنید اطلاعات کارکرد کدام پرسنل یا کدام گروه‌های کاری به سامانه AI Flow ارسال گردد.'
                : 'Specify which users or groups will have their workhours pushed to AI Flow.'}
            </p>
          </div>

          {/* Scope Selector Segmented Control */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setSyncScope('all')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer font-b-nazanin ${
                syncScope === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isPersian ? 'همه پرسنل (بدون فیلتر)' : 'All Personnel'}
            </button>
            <button
              type="button"
              onClick={() => setSyncScope('specific')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer font-b-nazanin ${
                syncScope === 'specific'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isPersian ? 'پرسنل و گروه‌های منتخب' : 'Selected Users & Groups'}
            </button>
          </div>
        </div>

        {syncScope === 'all' ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 font-b-nazanin flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {isPersian
                  ? `حالت سراسری فعال است: کارکرد تمام ${toPersianDigits(users.length)} کاربر سامانه به AI Flow ارسال خواهد شد.`
                  : `Global scope active: all ${users.length} users will be synced to AI Flow.`}
              </span>
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg font-b-mitra">
              {isPersian ? 'ارسال کامل' : 'Full Sync'}
            </span>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Section 1: Groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-b-nazanin">
                    {isPersian ? '۱. گروه‌های کاری منتخب:' : '1. Selected Groups:'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-b-mitra">
                    ({isPersian ? `${toPersianDigits(selectedGroupIds.length)} گروه انتخاب شده` : `${selectedGroupIds.length} groups selected`})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedGroupIds(groups.map(g => g.id))}
                    className="text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer font-b-nazanin text-[11px] font-bold"
                  >
                    {isPersian ? 'انتخاب همه گروه‌ها' : 'Select All'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupIds([])}
                    className="text-slate-500 hover:underline cursor-pointer font-b-nazanin text-[11px]"
                  >
                    {isPersian ? 'لغو انتخاب' : 'Clear'}
                  </button>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-400 text-xs text-center font-b-nazanin">
                  {isPersian ? 'هیچ گروهی در سیستم تعریف نشده است.' : 'No groups defined.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {groups.map(g => {
                    const isChecked = selectedGroupIds.includes(g.id);
                    const memberCount = Array.isArray(g.memberUserIds)
                      ? g.memberUserIds.filter(id => {
                          const u = users.find(x => x.id === id);
                          return u && u.role !== 'admin';
                        }).length
                      : 0;
                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGroupSelection(g.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                          isChecked
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-2xs'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate font-b-nazanin">{g.name}</span>
                            {g.description && (
                              <span className="text-[10px] text-slate-400 block truncate">{g.description}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold shrink-0 font-b-mitra">
                          {isPersian ? `${toPersianDigits(memberCount)} کاربر` : `${memberCount} users`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Individual Users */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-b-nazanin">
                    {isPersian ? '۲. کاربران اختصاصی منتخب:' : '2. Individual Selected Users:'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-b-mitra">
                    ({isPersian ? `${toPersianDigits(selectedUserIds.length)} کاربر مستقیم` : `${selectedUserIds.length} direct users`})
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  <input
                    type="text"
                    value={scopeUserSearch}
                    onChange={e => setScopeUserSearch(e.target.value)}
                    placeholder={isPersian ? 'جستجو در پرسنل...' : 'Search users...'}
                    className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-b-nazanin"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {users
                  .filter(u => {
                    if (!scopeUserSearch) return true;
                    const q = scopeUserSearch.toLowerCase();
                    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                  })
                  .map(u => {
                    const inheritedGroup = getUserInheritedGroup(u.id);
                    const isDirectlyChecked = selectedUserIds.includes(u.id);
                    const isCovered = isDirectlyChecked || !!inheritedGroup;

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (inheritedGroup) return; // already included via group
                          toggleUserSelection(u.id);
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 select-none ${
                          inheritedGroup
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200 cursor-default'
                            : isDirectlyChecked
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-200 cursor-pointer shadow-2xs'
                            : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isCovered ? (
                            <CheckSquare className={`w-4 h-4 shrink-0 ${inheritedGroup ? 'text-purple-500' : 'text-blue-600'}`} />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate font-b-nazanin">{u.firstName} {u.lastName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate" dir="ltr">{u.username}</span>
                          </div>
                        </div>
                        {inheritedGroup ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold shrink-0 font-b-nazanin" title={`عضو گروه ${inheritedGroup.name}`}>
                            {inheritedGroup.name}
                          </span>
                        ) : isDirectlyChecked ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold shrink-0 font-b-nazanin">
                            {isPersian ? 'مستقیم' : 'Direct'}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
              </div>

              {/* Total Included Summary */}
              <div className="flex items-center justify-between text-xs font-b-nazanin pt-2 text-slate-500 dark:text-slate-400">
                <span>
                  {isPersian
                    ? `مجموعاً ${toPersianDigits(users.filter(u => isUserIncluded(u.id)).length)} کاربر از کل ${toPersianDigits(users.length)} کاربر مشمول ارسال به AI Flow هستند.`
                    : `Total ${users.filter(u => isUserIncluded(u.id)).length} of ${users.length} users will be synced to AI Flow.`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee to Jira userKey Mapping Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{isPersian ? 'جدول نگاشت پرسنل به کلید کاربری جیرا (Jira userKey)' : 'Employee to Jira userKey Mapping'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin">
              {isPersian
                ? 'سامانه AI Flow رکوردها را با کلید کاربری جیرا (userKey) تطبیق می‌دهد. برای هر پرسنل کلید کاربری معادل را در ستون زیر وارد نمایید.'
                : 'AI Flow matches presence records to Jira rows using userKey. Define the corresponding Jira userKey for each user below.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoFillUsernames}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer font-b-nazanin"
              title={isPersian ? 'تنظیم خودکار کلیدها برابر با نام کاربری Clocky' : 'Set keys to Clocky username'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isPersian ? 'تکمیل خودکار با نام کاربری' : 'Auto-fill with Username'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Search & Only Included Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder={isPersian ? 'جستجو در نام، نام کاربری یا کلید جیرا...' : 'Search employees...'}
              className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-b-nazanin"
            />
          </div>

          <button
            type="button"
            onClick={() => setOnlyShowIncluded(!onlyShowIncluded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer font-b-nazanin shrink-0 ${
              onlyShowIncluded
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isPersian ? 'فقط نمایش پرسنل مشمول ارسال' : 'Only Eligible Users'}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold font-b-nazanin">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">{isPersian ? 'نام و نام خانوادگی' : 'Full Name'}</th>
                <th className="p-3">{isPersian ? 'نام کاربری در سامانه' : 'Clocky Username'}</th>
                <th className="p-3">{isPersian ? 'وضعیت ارسال' : 'Sync Status'}</th>
                <th className="p-3">{isPersian ? 'عنوان شغلی' : 'Job Title'}</th>
                <th className="p-3 min-w-[220px]">
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <span>{isPersian ? 'کلید کاربری در جیرا (userKey)' : 'Jira userKey'}</span>
                    <span className="text-red-500">*</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-b-mitra">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-b-nazanin">
                    {isPersian ? 'هیچ کاربری یافت نشد.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const currentVal = userKeyMappings[u.id] !== undefined ? userKeyMappings[u.id] : (u.username || '');
                  const included = isUserIncluded(u.id);
                  const inherited = getUserInheritedGroup(u.id);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-400">{toPersianDigits(idx + 1)}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">
                        {u.username}
                      </td>
                      <td className="p-3">
                        {included ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-b-nazanin"
                            title={inherited ? `شامل شده از طریق گروه ${inherited.name}` : undefined}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{inherited ? (isPersian ? `گروه: ${inherited.name}` : inherited.name) : (isPersian ? 'مشمول ارسال' : 'Eligible')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-b-nazanin">
                            <span>{isPersian ? 'عدم ارسال' : 'Excluded'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 font-b-nazanin">
                        {u.jobTitle || '—'}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={currentVal}
                          onChange={e => handleUserKeyChange(u.id, e.target.value)}
                          placeholder={u.username || 'userKey'}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Data Batch Sync Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{isPersian ? 'ارسال دسته‌ای سوابق گذشته (Historical Batch Sync)' : 'Historical Data Batch Sync'}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-b-nazanin">
            {isPersian
              ? 'طبق بخش ۹ مستندات AI Flow، پس از تأیید تست ارتباط اولیه می‌توانید سوابق کارکرد گذشته را در بسته‌های استاندارد حداکثر ۱۰۰۰ تایی ارسال فرمایید.'
              : 'As per section 9 of the AI Flow guide, send historical presence data in batches of up to 1000 records.'}
          </p>
        </div>

        {/* Live Records Preview & Quick Date Shortcuts */}
        <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-b-nazanin">
          <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
            <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              {isPersian
                ? `پیش‌نمایش ارسال: ${toPersianDigits(eligibleRecordsPreview.totalDays)} روز/کارکرد برای ${toPersianDigits(eligibleRecordsPreview.eligibleUsersCount)} کاربر مشمول (${syncScope === 'all' ? 'همه کاربران' : 'کاربران منتخب'}) در این بازه تاریخی یافت شد.`
                : `Preview: ${eligibleRecordsPreview.totalDays} daily records found for ${eligibleRecordsPreview.eligibleUsersCount} eligible users in this range.`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            <span className="text-[11px] text-slate-500 font-bold ml-1">{isPersian ? 'میانبر بازه:' : 'Shortcuts:'}</span>
            <button
              type="button"
              onClick={() => {
                const parts = getCurrentJalaliParts();
                setSyncStartDate(`${parts.year}/${String(parts.month).padStart(2, '0')}/01`);
                setSyncEndDate(getTodayJalali());
              }}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              {isPersian ? 'ماه جاری' : 'This Month'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSyncStartDate('');
                setSyncEndDate(getTodayJalali());
              }}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isPersian ? 'همه سوابق' : 'All History'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          {/* Start Date */}
          <PersianDatePicker
            value={syncStartDate}
            onChange={setSyncStartDate}
            label={isPersian ? 'از تاریخ (اختیاری):' : 'From Date (Optional):'}
            isPersian={isPersian}
          />

          {/* End Date */}
          <PersianDatePicker
            value={syncEndDate}
            onChange={setSyncEndDate}
            label={isPersian ? 'تا تاریخ:' : 'To Date:'}
            isPersian={isPersian}
          />

          {/* Trigger Button */}
          <button
            type="button"
            onClick={handleBatchSync}
            disabled={batchSyncing || eligibleRecordsPreview.totalDays === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-purple-500/20 transition-all cursor-pointer font-b-nazanin disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className={`w-3.5 h-3.5 ${batchSyncing ? 'animate-pulse' : ''}`} />
            <span>{batchSyncing ? (isPersian ? 'در حال ارسال بسته‌ها...' : 'Sending batches...') : (isPersian ? `ارسال سوابق به AI Flow (${toPersianDigits(eligibleRecordsPreview.totalDays)} رکورد)` : `Send Records to AI Flow (${eligibleRecordsPreview.totalDays})`)}</span>
          </button>
        </div>

        {syncResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold font-b-nazanin flex items-center gap-2 ${
              syncResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}
          >
            {syncResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{syncResult.message}</span>
          </div>
        )}
      </div>

      {/* Guide & Rules Card based on user specification */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-xs text-slate-600 dark:text-slate-400 space-y-3 font-b-nazanin">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{isPersian ? 'نکات مهم یکپارچه‌سازی AI Flow' : 'AI Flow Integration Rules & Reference'}</span>
        </h4>
        <ul className="list-disc list-inside space-y-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
          <li>
            {isPersian
              ? 'تطبیق کارکردها بر اساس userKey جیرا انجام می‌گیرد و ارسال مجدد همان تاریخ و کاربر، رکورد قبلی را به‌روزرسانی (Upsert) می‌کند و ایجاد رکورد تکراری نمی‌کند.'
              : 'Submitting the same userKey and date updates the existing daily record without duplicates.'}
          </li>
          <li>
            {isPersian
              ? 'ارسال‌ها به صورت مستقل توسط سرور Clocky انجام می‌شوند تا امنیت توکن حفظ شده و خطاهای CORS یا Mixed Content رخ ندهد.'
              : 'Requests are securely dispatched by the Clocky server to preserve the bearer token.'}
          </li>
          <li>
            {isPersian
              ? 'تاریخ‌های شمسی در نرم‌افزار به صورت خودکار به تاریخ میلادی استاندارد YYYY-MM-DD تبدیل و مجموع ساعات حضور (بین ۰ تا ۲۴) ارسال می‌گردد.'
              : 'Dates are automatically formatted to YYYY-MM-DD and hours calculated as a float between 0 and 24.'}
          </li>
        </ul>
      </div>
    </div>
  );
};

