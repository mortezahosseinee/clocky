import React, { useState } from 'react';
import { User, UserSession } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Shield,
  Monitor,
  Smartphone,
  LogOut,
  Ban,
  Unlock,
  CheckCircle2,
  Clock,
  Globe,
  AlertTriangle
} from 'lucide-react';

interface SessionsSecurityViewProps {
  user: User;
  lang: Language;
}

export const SessionsSecurityView: React.FC<SessionsSecurityViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const [sessions, setSessions] = useState<UserSession[]>(() =>
    StorageService.getSessions()
  );
  const [settings, setSettings] = useState(() => StorageService.getSettings());

  const [terminateTargetId, setTerminateTargetId] = useState<string | null>(null);
  const [ipToBlock, setIpToBlock] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const reload = () => {
    setSessions(StorageService.getSessions());
    setSettings(StorageService.getSettings());
  };

  const handleTerminateSession = () => {
    if (terminateTargetId) {
      StorageService.terminateSession(terminateTargetId);
      setTerminateTargetId(null);
      setNotification(t.sessionTerminated);
      setTimeout(() => setNotification(null), 3000);
      reload();
    }
  };

  const handleBlockIp = (ip: string) => {
    if (ip) {
      StorageService.blockIp(ip);
      setNotification(t.ipBlockedSuccess);
      setTimeout(() => setNotification(null), 3000);
      reload();
    }
  };

  const handleUnblockIp = (ip: string) => {
    StorageService.unblockIp(ip);
    reload();
  };

  const handleManualAddBlockedIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (ipToBlock.trim()) {
      handleBlockIp(ipToBlock.trim());
      setIpToBlock('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.sessionsAndSecurity}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'پایش اتصالات فعال، اخراج نشست‌های مشکوک و مسدودسازی آدرس‌های IP'
                : 'Monitor active sessions, terminate connections, and manage IP firewall rules'}
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-blue-600" />
            <span>{isPersian ? 'نشست‌ها و کاربران آنلاین در سامانه' : 'Active User Sessions'}</span>
          </h3>
          <span className="text-xs text-slate-400 font-b-nazanin">
            {isPersian ? `${sessions.filter(s => s.isActive).length} نشست فعال` : `${sessions.filter(s => s.isActive).length} active`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">{t.username}</th>
                <th className="p-3">{t.ipCol}</th>
                <th className="p-3">{t.deviceCol}</th>
                <th className="p-3">{t.loginTimeCol}</th>
                <th className="p-3">{t.lastActiveCol}</th>
                <th className="p-3">{t.statusCol}</th>
                <th className="p-3 text-center">{t.actionsCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-b-nazanin">
              {sessions.map((sess, idx) => {
                const isBlocked = settings.blockedIps.includes(sess.ip);

                return (
                  <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 font-mono text-sm">
                      {sess.username}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700">
                      {sess.ip}
                      {isBlocked && (
                        <span className="mr-2 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                          {isPersian ? 'مسدود' : 'Blocked'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {sess.device.includes('گوشی') ? (
                          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{sess.device}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">{sess.loginAt}</td>
                    <td className="p-3 text-slate-500">{sess.lastActiveAt}</td>
                    <td className="p-3">
                      {sess.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{t.activeStatus}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px]">
                          {isPersian ? 'پایان‌یافته' : 'Terminated'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sess.isActive && (
                          <button
                            onClick={() => setTerminateTargetId(sess.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            title={t.terminateSession}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>{t.terminateSession}</span>
                          </button>
                        )}

                        {!isBlocked ? (
                          <button
                            onClick={() => handleBlockIp(sess.ip)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 cursor-pointer"
                            title={t.blockIp}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblockIp(sess.ip)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                            title={t.unblockIp}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blocked IPs Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" />
              <span>{isPersian ? 'لیست سیاه آدرس‌های IP مسدود شده' : 'Blacklisted IP Addresses'}</span>
            </h3>
            <span className="text-xs text-slate-400 font-b-nazanin font-bold">
              {settings.blockedIps.length} مورد
            </span>
          </div>

          <form onSubmit={handleManualAddBlockedIp} className="flex gap-2">
            <input
              type="text"
              required
              value={ipToBlock}
              onChange={e => setIpToBlock(e.target.value)}
              placeholder="192.168.1.1..."
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
            >
              {isPersian ? 'مسدودسازی دستی' : 'Block IP'}
            </button>
          </form>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {settings.blockedIps.map(ip => (
              <div key={ip} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-800">{ip}</span>
                <button
                  onClick={() => handleUnblockIp(ip)}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{t.unblockIp}</span>
                </button>
              </div>
            ))}

            {settings.blockedIps.length === 0 && (
              <div className="py-4 text-center text-slate-400 text-xs">
                {isPersian ? 'هیچ آی‌پی در لیست سیاه قرار ندارد.' : 'No blocked IP addresses.'}
              </div>
            )}
          </div>
        </div>

        {/* Security Policy Note */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{isPersian ? 'سیاست‌های امنیتی کنترل تردد' : 'Security Access Rules'}</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-2.5 mt-4 list-disc pr-4 pl-4 font-b-nazanin leading-relaxed">
              <li>
                {isPersian
                  ? 'قطع سشن بلافاصله کاربر را از نشست فعال خارج نموده و کلید احراز هویت را ابطال می‌نماید.'
                  : 'Terminating a session immediately revokes access and boots the user out.'}
              </li>
              <li>
                {isPersian
                  ? `مدت اعتبار اولیه رمز عبور موقت صادرشده توسط مدیر: ${settings.tempPasswordExpiryMinutes} دقیقه.`
                  : `Temporary password validity period: ${settings.tempPasswordExpiryMinutes} minutes.`}
              </li>
              <li>
                {isPersian
                  ? 'آدرس‌های IP مسدود شده حتی با داشتن نام کاربری و رمز عبور صحیح، امکان مشاهده یا تبادل اطلاعات را نخواهند داشت.'
                  : 'Blocked IPs cannot access system APIs or login pages.'}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terminate Session Confirm */}
      <ConfirmModal
        isOpen={Boolean(terminateTargetId)}
        title={t.terminateSession}
        message={isPersian ? 'آیا مطمئن هستید؟ با تایید، کاربر بلافاصله از سیستم خارج می‌شود.' : 'Are you sure? The user will be immediately logged out.'}
        confirmText={t.terminateSession}
        cancelText={t.cancel}
        onConfirm={handleTerminateSession}
        onCancel={() => setTerminateTargetId(null)}
        isDestructive={true}
      />
    </div>
  );
};
