import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { User, SystemSettings, AiFlowIntegrationConfig } from '../types';
import { StorageService } from '../utils/storage';
import { Language } from '../utils/translations';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { toPersianDigits, getTodayJalali } from '../utils/jalali';

interface IntegrationsViewProps {
  user: User;
  lang: Language;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ user, lang }) => {
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());

  // AI Flow Config State
  const initialConfig = settings.aiFlowConfig || {
    enabled: false,
    apiUrl: 'http://127.0.0.1:6060/api/workhours',
    apiToken: '',
    userKeyMappings: {}
  };

  const [enabled, setEnabled] = useState<boolean>(initialConfig.enabled || false);
  const [apiUrl, setApiUrl] = useState<string>(initialConfig.apiUrl || '');
  const [apiToken, setApiToken] = useState<string>(initialConfig.apiToken || '');
  const [showToken, setShowToken] = useState<boolean>(false);
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

  // User Filter State
  const [userSearch, setUserSearch] = useState<string>('');

  // Handle saving main settings
  const handleSaveConfig = async () => {
    const updatedConfig: AiFlowIntegrationConfig = {
      ...settings.aiFlowConfig,
      enabled,
      apiUrl: apiUrl.trim(),
      apiToken: apiToken.trim(),
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

    setBatchSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/integrations/ai-flow/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: syncStartDate || undefined,
          endDate: syncEndDate || undefined,
          userKeyMappings
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

        {/* Filter Search */}
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder={isPersian ? 'جستجو در نام، نام کاربری یا کلید جیرا...' : 'Search employees...'}
              className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-b-nazanin"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold font-b-nazanin">
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">{isPersian ? 'نام و نام خانوادگی' : 'Full Name'}</th>
                <th className="p-3">{isPersian ? 'نام کاربری در سامانه' : 'Clocky Username'}</th>
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
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-b-nazanin">
                    {isPersian ? 'هیچ کاربری یافت نشد.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const currentVal = userKeyMappings[u.id] !== undefined ? userKeyMappings[u.id] : (u.username || '');
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-400">{toPersianDigits(idx + 1)}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">
                        {u.username}
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
            disabled={batchSyncing}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-purple-500/20 transition-all cursor-pointer font-b-nazanin disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${batchSyncing ? 'animate-pulse' : ''}`} />
            <span>{batchSyncing ? (isPersian ? 'در حال ارسال بسته‌ها...' : 'Sending batches...') : (isPersian ? 'ارسال سوابق به AI Flow' : 'Send Records to AI Flow')}</span>
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

