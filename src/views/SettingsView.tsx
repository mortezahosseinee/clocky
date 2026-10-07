import React, { useState, useRef } from 'react';
import { User, SystemSettings, CustomTypeConfig } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { EDITABLE_UI_TITLES } from '../utils/customTitles';
import {
  Settings,
  Palette,
  Save,
  RotateCcw,
  CheckCircle2,
  CalendarCheck,
  Zap,
  Plus,
  Trash2,
  Clock,
  Sliders,
  Building2,
  Image as ImageIcon,
  Upload,
  X,
  Languages,
  Type,
  HelpCircle
} from 'lucide-react';

interface SettingsViewProps {
  user: User;
  lang: Language;
}

function normalizeCustomTypes(items: (string | CustomTypeConfig)[]): CustomTypeConfig[] {
  return items.map((it, idx) => {
    if (typeof it === 'string') {
      return { id: `ct-${idx}-${Date.now()}`, titleFa: it, titleEn: '' };
    }
    return it;
  });
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const [settings, setSettings] = useState<SystemSettings>(() =>
    StorageService.getSettings()
  );

  // If organizationName was never explicitly configured by admin, start with empty string
  const [organizationName, setOrganizationName] = useState(
    settings.organizationName || ''
  );
  const [organizationLogo, setOrganizationLogo] = useState(settings.organizationLogo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [tempExpiry, setTempExpiry] = useState(settings.tempPasswordExpiryMinutes);

  // Custom UI Titles and Subtitles Dictionary
  const [customTitles, setCustomTitles] = useState<Record<string, string>>(
    () => settings.customTitles || {}
  );
  const [titleSearch, setTitleSearch] = useState('');

  // Custom Leave Types with Persian & English support
  const [leaveTypes, setLeaveTypes] = useState<CustomTypeConfig[]>(() =>
    normalizeCustomTypes(settings.leaveTypes)
  );
  const [newLeaveTitleFa, setNewLeaveTitleFa] = useState('');
  const [newLeaveTitleEn, setNewLeaveTitleEn] = useState('');

  // Custom Special Work Types with Persian & English support
  const [specialWorkTypes, setSpecialWorkTypes] = useState<CustomTypeConfig[]>(() =>
    normalizeCustomTypes(settings.specialWorkTypes)
  );
  const [newSpecialTitleFa, setNewSpecialTitleFa] = useState('');
  const [newSpecialTitleEn, setNewSpecialTitleEn] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(isPersian ? 'حجم تصویر نباید بیشتر از ۲ مگابایت باشد.' : 'Logo image must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setOrganizationLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setOrganizationLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Real-time preview of theme colors
  const handlePrimaryChange = (color: string) => {
    setPrimaryColor(color);
    document.documentElement.style.setProperty('--primary-color', color);
  };

  const handleSecondaryChange = (color: string) => {
    setSecondaryColor(color);
    document.documentElement.style.setProperty('--secondary-color', color);
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    document.documentElement.style.setProperty('--accent-color', color);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SystemSettings = {
      ...settings,
      organizationName: organizationName.trim(),
      organizationLogo,
      primaryColor,
      secondaryColor,
      accentColor,
      tempPasswordExpiryMinutes: Number(tempExpiry) || 60,
      leaveTypes,
      specialWorkTypes,
      customTitles
    };

    StorageService.saveSettings(updated);
    setSettings(updated);
    StorageService.addLog('UPDATE_SETTINGS', 'تنظیمات سراسری سامانه، عناوین و زیرعناوین و نام/لوگوی سازمان به‌روزرسانی شد.');

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetColors = () => {
    handlePrimaryChange('#2563eb');
    handleSecondaryChange('#0d9488');
    handleAccentChange('#f59e0b');
  };

  const handleAddLeaveType = () => {
    if (newLeaveTitleFa.trim()) {
      const newType: CustomTypeConfig = {
        id: `lt-${Date.now()}`,
        titleFa: newLeaveTitleFa.trim(),
        titleEn: newLeaveTitleEn.trim() || undefined
      };
      setLeaveTypes([...leaveTypes, newType]);
      setNewLeaveTitleFa('');
      setNewLeaveTitleEn('');
    }
  };

  const handleRemoveLeaveType = (id: string) => {
    setLeaveTypes(leaveTypes.filter(lt => lt.id !== id));
  };

  const handleAddSpecialType = () => {
    if (newSpecialTitleFa.trim()) {
      const newType: CustomTypeConfig = {
        id: `st-${Date.now()}`,
        titleFa: newSpecialTitleFa.trim(),
        titleEn: newSpecialTitleEn.trim() || undefined
      };
      setSpecialWorkTypes([...specialWorkTypes, newType]);
      setNewSpecialTitleFa('');
      setNewSpecialTitleEn('');
    }
  };

  const handleRemoveSpecialType = (id: string) => {
    setSpecialWorkTypes(specialWorkTypes.filter(st => st.id !== id));
  };

  const handleTitleChange = (key: string, val: string) => {
    setCustomTitles(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleResetSingleTitle = (key: string) => {
    setCustomTitles(prev => {
      const copy = { ...prev };
      delete copy[key];
      delete copy[`${key}_fa`];
      delete copy[`${key}_en`];
      return copy;
    });
  };

  const filteredTitles = EDITABLE_UI_TITLES.filter(item => {
    if (!titleSearch) return true;
    const q = titleSearch.toLowerCase();
    return (
      item.descriptionFa.toLowerCase().includes(q) ||
      item.descriptionEn.toLowerCase().includes(q) ||
      item.defaultFa.toLowerCase().includes(q) ||
      item.defaultEn.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.settings}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'شخصی‌سازی نام و لوگوی سازمان، ویرایش کلیه عناوین و زیرعناوین ثابت، رنگ‌بندی، و انواع کارکرد و مرخصی'
                : 'Corporate identity, custom UI titles/subtitles, theme colors, and custom work types'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{t.saveSettings}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.settingsSaved}</span>
        </div>
      )}

      {/* Section 0: Organization Name and Logo (Branding) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>{isPersian ? 'نام و لوگوی اختصاصی شرکت یا سازمان' : 'Corporate Identity & Branding'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Organization Name */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              {isPersian ? 'نام شرکت / سازمان / موسسه' : 'Organization / Company Name'}
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              placeholder={isPersian ? 'در صورت خالی بودن، عبارت «نرم افزار ثبت تردد» نمایش می‌یابد' : 'Default: Attendance Tracking Software'}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 font-b-nazanin leading-relaxed">
              {isPersian
                ? 'تا زمانی که این فیلد تکمیل نشده باشد، در بالای منو، گزارشات و صفحه ورود عبارت «نرم افزار ثبت تردد» درج می‌گردد.'
                : 'Until configured, the software displays "Attendance Tracking Software" across all headers.'}
            </p>
          </div>

          {/* Organization Logo */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              {isPersian ? 'لوگوی سازمانی (اختیاری)' : 'Corporate Logo (Optional)'}
            </label>

            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                {organizationLogo ? (
                  <img
                    src={organizationLogo}
                    alt="Uploaded Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center p-1">
                    <ImageIcon className="w-6 h-6 text-slate-300 mx-auto" />
                    <span className="text-[9px] text-slate-400 font-b-nazanin block mt-1">
                      {isPersian ? 'تنظیم نشده' : 'No Logo'}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isPersian ? 'انتخاب تصویر لوگو' : 'Upload Logo'}</span>
                  </button>

                  {organizationLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title={isPersian ? 'حذف لوگو' : 'Remove logo'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-b-nazanin">
                  {isPersian
                    ? 'تا زمانی که لوگویی آپلود نشده باشد، هیچ آیکون یا لوگویی در منو، هدر و صفحه ورود نمایش داده نمی‌شود.'
                    : 'No logo will be rendered until explicitly uploaded.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Comprehensive Custom Titles & Subtitles Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600" />
              <span>{isPersian ? 'مدیریت و ویرایش کلیه عناوین و زیرعناوین سامانه' : 'Custom Titles & Subtitles Management'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'مدیر می‌تواند تمامی عناوین صفحات، منوها، کارت‌ها و زیرعناوین را مطابق نیاز سازمان خود تغییر دهد.'
                : 'Modify and customize any fixed title, tab label, or subtitle throughout the platform.'}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={titleSearch}
              onChange={e => setTitleSearch(e.target.value)}
              placeholder={isPersian ? 'جستجو در عناوین...' : 'Search titles...'}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {filteredTitles.map(def => {
            const currentFa = customTitles[`${def.key}_fa`] ?? customTitles[def.key] ?? '';
            const currentEn = customTitles[`${def.key}_en`] ?? '';

            return (
              <div key={def.key} className="py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {isPersian ? def.descriptionFa : def.descriptionEn}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                      {def.key}
                    </span>
                  </div>

                  {(currentFa || currentEn) && (
                    <button
                      type="button"
                      onClick={() => handleResetSingleTitle(def.key)}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isPersian ? 'بازگردانی به پیش‌فرض' : 'Reset'}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      {isPersian ? 'عنوان فارسی سفارشی:' : 'Custom Persian Title:'}
                    </label>
                    <input
                      type="text"
                      value={currentFa}
                      onChange={e => handleTitleChange(`${def.key}_fa`, e.target.value)}
                      placeholder={def.defaultFa}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      {isPersian ? 'عنوان انگلیسی سفارشی (اختیاری):' : 'Custom English Title (Optional):'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={currentEn}
                      onChange={e => handleTitleChange(`${def.key}_en`, e.target.value)}
                      placeholder={def.defaultEn}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 1: Color Themes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>{t.themeColors}</span>
          </h3>

          <button
            type="button"
            onClick={handleResetColors}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isPersian ? 'بازنشانی رنگ‌ها' : 'Reset Colors'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {t.primaryColor}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => handlePrimaryChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
              />
              <span className="font-mono text-xs text-slate-600">{primaryColor}</span>
            </div>
          </div>

          <div className="p-3.5 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {t.secondaryColor}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => handleSecondaryChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
              />
              <span className="font-mono text-xs text-slate-600">{secondaryColor}</span>
            </div>
          </div>

          <div className="p-3.5 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              {t.accentColor}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={e => handleAccentChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
              />
              <span className="font-mono text-xs text-slate-600">{accentColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Security & Password Expiry */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>{t.tempPasswordExpiry}</span>
        </h3>

        <div className="max-w-md space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            {isPersian
              ? 'مدت زمان اعتبار رمزهای عبور یکبارمصرف یا موقت (دقیقه)'
              : 'Temporary password validity (Minutes)'}
          </label>
          <input
            type="number"
            min={5}
            max={1440}
            value={tempExpiry}
            onChange={e => setTempExpiry(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          <p className="text-[11px] text-slate-400 font-b-nazanin leading-relaxed">
            {isPersian
              ? 'پس از این بازه، رمزهای موقت صادرشده توسط مدیر منقضی می‌شوند و کاربر باید رمز جدید درخواست کند.'
              : 'Temporary credentials generated by admin expire after this duration.'}
          </p>
        </div>
      </div>

      {/* Section 3 & 4: Bilingual Leave & Special Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Bilingual Leave Types Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>{t.leaveTypesManagement}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-b-nazanin">
              {leaveTypes.length} {isPersian ? 'نوع تعریف‌شده' : 'types'}
            </span>
          </div>

          <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              value={newLeaveTitleFa}
              onChange={e => setNewLeaveTitleFa(e.target.value)}
              placeholder={isPersian ? 'عنوان فارسی نوع مرخصی (اجباری)...' : 'Persian title (Required)...'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            />
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={newLeaveTitleEn}
                onChange={e => setNewLeaveTitleEn(e.target.value)}
                placeholder={isPersian ? 'عنوان انگلیسی (اختیاری): Sick Leave...' : 'English title (Optional)...'}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddLeaveType}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isPersian ? 'افزودن' : 'Add'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-b-nazanin">
              {isPersian
                ? 'در صورتی که عنوان انگلیسی وارد شود، در حالت زبان انگلیسی نمایش داده خواهد شد؛ در غیر اینصورت عنوان فارسی نمایش داده می‌شود.'
                : 'English title will be shown when system language is English, falling back to Persian.'}
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {leaveTypes.map(lt => (
              <div key={lt.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">{lt.titleFa}</div>
                  {lt.titleEn && (
                    <div className="text-[10px] font-mono text-slate-500" dir="ltr">
                      {lt.titleEn}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLeaveType(lt.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                  title={isPersian ? 'حذف نوع مرخصی' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Bilingual Special Work Types Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose-600" />
              <span>{t.specialWorkTypesManagement}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-b-nazanin">
              {specialWorkTypes.length} {isPersian ? 'نوع تعریف‌شده' : 'types'}
            </span>
          </div>

          <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <input
              type="text"
              value={newSpecialTitleFa}
              onChange={e => setNewSpecialTitleFa(e.target.value)}
              placeholder={isPersian ? 'عنوان فارسی کارکرد خاص (اجباری)...' : 'Persian title (Required)...'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            />
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={newSpecialTitleEn}
                onChange={e => setNewSpecialTitleEn(e.target.value)}
                placeholder={isPersian ? 'عنوان انگلیسی (اختیاری): Power Outage...' : 'English title (Optional)...'}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddSpecialType}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isPersian ? 'افزودن' : 'Add'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-b-nazanin">
              {isPersian
                ? 'در صورتی که عنوان انگلیسی وارد شود، در حالت زبان انگلیسی نمایش داده خواهد شد؛ در غیر اینصورت عنوان فارسی نمایش داده می‌شود.'
                : 'English title will be shown when system language is English, falling back to Persian.'}
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {specialWorkTypes.map(st => (
              <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800">{st.titleFa}</div>
                  {st.titleEn && (
                    <div className="text-[10px] font-mono text-slate-500" dir="ltr">
                      {st.titleEn}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSpecialType(st.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                  title={isPersian ? 'حذف نوع کارکرد خاص' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
