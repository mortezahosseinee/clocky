import React, { useState } from 'react';
import { Lock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { StorageService, validatePasswordStandard } from '../utils/storage';
import { PasswordInput } from './PasswordInput';

interface ChangePasswordModalProps {
  user: User;
  onSuccess: (updatedUser: User) => void;
  isPersian?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  user,
  onSuccess,
  isPersian = true
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validation = validatePasswordStandard(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      setError(isPersian ? 'رمز عبور با استانداردهای امنیتی مطابقت ندارد.' : 'Password does not meet security standards.');
      return;
    }
    if (!passwordsMatch) {
      setError(isPersian ? 'رمز عبور و تکرار آن یکسان نیستند.' : 'Passwords do not match.');
      return;
    }

    // Update user
    const updated: User = {
      ...user,
      mustChangePassword: false,
      passwordHash: newPassword.trim(),
      temporaryPasswordExpiry: undefined
    };

    StorageService.saveUser(updated);
    StorageService.setCurrentUser(updated);
    StorageService.addLog('PASSWORD_CHANGED', `رمز عبور کاربر ${user.username} با رعایت استانداردها تغییر یافت.`);
    onSuccess(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-slate-800">
        <div className="flex items-center gap-3 mb-4 text-blue-600">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isPersian ? 'تغییر اجباری رمز عبور در بدو ورود' : 'Mandatory Password Change'}
            </h2>
            <p className="text-xs text-slate-500">
              {isPersian ? 'ورود اولیه یا منقضی شدن رمز موقت' : 'First login or temporary credential reset'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          {isPersian
            ? 'برای تضمین امنیت دسترسی سازمانی، ورود به سامانه منوط به ثبت یک رمز عبور استاندارد و مستحکم است.'
            : 'For system security compliance, please define a strong password following global standards.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label={isPersian ? 'رمز عبور جدید' : 'New Password'}
            required
            isPersian={isPersian}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
          />

          <PasswordInput
            label={isPersian ? 'تکرار رمز عبور جدید' : 'Confirm New Password'}
            required
            isPersian={isPersian}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
          />

          {/* Standards checklist */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="font-semibold text-slate-600 mb-1">
              {isPersian ? 'معیارهای امنیت جهانی رمز عبور:' : 'Password Security Rules:'}
            </div>
            
            <div className="flex items-center gap-1.5">
              {newPassword.length >= 8 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={newPassword.length >= 8 ? 'text-green-700 font-medium' : 'text-slate-500'}>
                {isPersian ? 'حداقل ۸ کاراکتر' : 'At least 8 characters'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-green-700 font-medium' : 'text-slate-500'}>
                {isPersian ? 'شامل حروف کوچک و بزرگ انگلیسی' : 'Both lowercase & uppercase letters'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/[0-9]/.test(newPassword) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={/[0-9]/.test(newPassword) ? 'text-green-700 font-medium' : 'text-slate-500'}>
                {isPersian ? 'حداقل یک رقم عددی (0-9)' : 'At least one number'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) ? 'text-green-700 font-medium' : 'text-slate-500'}>
                {isPersian ? 'حداقل یک نماد خاص (!@#$%^&*)' : 'At least one special symbol'}
              </span>
            </div>

            {newPassword && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                {passwordsMatch ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={passwordsMatch ? 'text-green-700 font-medium' : 'text-red-500'}>
                  {isPersian ? 'تطابق تکرار رمز عبور' : 'Passwords match'}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!validation.isValid || !passwordsMatch}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-md transition-colors"
          >
            {isPersian ? 'تغییر رمز و ورود به سامانه' : 'Save Password & Proceed'}
          </button>
        </form>
      </div>
    </div>
  );
};
