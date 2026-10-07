import React, { useState, useMemo } from 'react';
import { User, SystemLog } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { exportTableToPdfPrint, exportTableToExcel, ExportColumn } from '../utils/export';
import {
  History,
  Download,
  Filter,
  Search,
  Calendar,
  User as UserIcon,
  ShieldAlert,
  X,
  ArrowUpDown
} from 'lucide-react';

interface LogsViewProps {
  user: User;
  lang: Language;
}

type LogSortColumn = 'username' | 'action' | 'details' | 'ip' | 'timestamp';

export const LogsView: React.FC<LogsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const isAdmin = user.role === 'admin';
  const allLogs = StorageService.getLogs();

  // Visibility: Admin sees all logs; others see only their own logs!
  const accessibleLogs = useMemo(() => {
    if (isAdmin) return allLogs;
    return allLogs.filter(l => l.userId === user.id || l.username === user.username);
  }, [allLogs, isAdmin, user]);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUsername, setFilterUsername] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<LogSortColumn>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);

  // Extract distinct actions & usernames
  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    accessibleLogs.forEach(l => set.add(l.action));
    return Array.from(set);
  }, [accessibleLogs]);

  const usernames = useMemo(() => {
    const set = new Set<string>();
    accessibleLogs.forEach(l => set.add(l.username));
    return Array.from(set);
  }, [accessibleLogs]);

  const toggleSort = (field: LogSortColumn) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'username' || field === 'action');
    }
  };

  const filteredLogs = useMemo(() => {
    return accessibleLogs
      .filter(l => {
        if (filterAction && l.action !== filterAction) return false;
        if (filterUsername && l.username !== filterUsername) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchUser = l.username.toLowerCase().includes(q);
          const matchDetails = l.details.toLowerCase().includes(q);
          const matchIp = l.ip.toLowerCase().includes(q);
          if (!matchUser && !matchDetails && !matchIp) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        switch (sortField) {
          case 'username':
            diff = a.username.localeCompare(b.username);
            break;
          case 'action':
            diff = a.action.localeCompare(b.action);
            break;
          case 'details':
            diff = a.details.localeCompare(b.details);
            break;
          case 'ip':
            diff = a.ip.localeCompare(b.ip);
            break;
          case 'timestamp':
            diff = a.timestamp.localeCompare(b.timestamp);
            break;
        }
        return sortAsc ? diff : -diff;
      });
  }, [accessibleLogs, filterAction, filterUsername, search, sortField, sortAsc]);

  const handleExportPdf = () => {
    const columns: ExportColumn[] = [
      { header: t.username, key: 'username', width: 16 },
      { header: isPersian ? 'عنوان رویداد' : 'Action', key: 'action', width: 20 },
      { header: isPersian ? 'شرح و جزئیات' : 'Details', key: 'details', width: 35 },
      { header: t.ipCol, key: 'ip', width: 14 },
      {
        header: isPersian ? 'زمان وقوع' : 'Timestamp',
        key: 'timestamp',
        width: 20,
        format: val => new Date(val).toLocaleString(isPersian ? 'fa-IR' : 'en-US')
      }
    ];

    exportTableToPdfPrint(
      isPersian ? 'گزارش لاگ فعالیت‌ها و رخدادهای امنیتی سامانه' : 'System Audit Trail Logs',
      isAdmin ? (isPersian ? 'کل فعالیت‌های پرسنل' : 'All Activities') : `${user.firstName} ${user.lastName}`,
      columns,
      filteredLogs,
      isPersian
    );
  };

  const handleExportExcel = () => {
    const columns: ExportColumn[] = [
      { header: t.username, key: 'username', width: 18 },
      { header: isPersian ? 'عنوان رویداد' : 'Action', key: 'action', width: 22 },
      { header: isPersian ? 'شرح و جزئیات' : 'Details', key: 'details', width: 40 },
      { header: t.ipCol, key: 'ip', width: 16 },
      {
        header: isPersian ? 'زمان وقوع' : 'Timestamp',
        key: 'timestamp',
        width: 22,
        format: val => new Date(val).toLocaleString(isPersian ? 'fa-IR' : 'en-US')
      }
    ];

    exportTableToExcel(
      `System_Logs_${Date.now()}`,
      'Logs',
      columns,
      filteredLogs,
      isPersian
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.systemLogs}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isAdmin
                ? (isPersian ? 'ثبت و پیگیری جامع تمامی رویدادها، ورود و خروج‌ها، ثبت کارکردها و تغییرات' : 'Comprehensive audit trail of all actions and logins')
                : (isPersian ? 'مشاهده سوابق و لاگ فعالیت‌های شخصی شما در سامانه' : 'Your personal activity logs')}
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{t.filter}:</span>
        </div>

        {isAdmin && (
          <div className="w-44">
            <select
              value={filterUsername}
              onChange={e => setFilterUsername(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            >
              <option value="">{isPersian ? 'همه کاربران' : 'All Users'}</option>
              {usernames.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}

        <div className="w-52">
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          >
            <option value="">{isPersian ? 'همه انواع رویدادها' : 'All Action Types'}</option>
            {actionTypes.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div className="w-64">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isPersian ? 'جستجو در جزئیات، کاربر یا IP...' : 'Search logs...'}
              className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {(filterAction || filterUsername || search) && (
          <button
            onClick={() => {
              setFilterAction('');
              setFilterUsername('');
              setSearch('');
            }}
            className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilter}</span>
          </button>
        )}

        <div className="mr-auto ml-auto sm:ml-0 text-xs text-slate-400 font-b-nazanin self-center">
          {filteredLogs.length} {isPersian ? 'رویداد ثبت‌شده' : 'events'}
        </div>
      </div>

      {/* Logs Table with all columns sortable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-3 w-10 text-center">#</th>

                <th
                  onClick={() => toggleSort('username')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.username}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('action')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'رویداد' : 'Action'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('details')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'شرح و جزئیات فعالیت' : 'Event Description'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('ip')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t.ipCol}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => toggleSort('timestamp')}
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{isPersian ? 'زمان وقوع' : 'Timestamp'}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-b-nazanin">
              {filteredLogs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono font-bold text-slate-900">{log.username}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 leading-relaxed max-w-md">{log.details}</td>
                  <td className="p-3 font-mono text-slate-500" dir="ltr">{log.ip}</td>
                  <td className="p-3 text-slate-400 font-mono" dir="ltr">
                    {new Date(log.timestamp).toLocaleString(isPersian ? 'fa-IR' : 'en-US')}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {isPersian ? 'هیچ لاگی یافت نشد.' : 'No audit logs found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
