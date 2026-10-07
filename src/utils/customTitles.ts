import { translations, Language } from './translations';
import { StorageService } from './storage';

export interface UiTitleDefinition {
  key: string;
  category: string;
  descriptionFa: string;
  descriptionEn: string;
  defaultFa: string;
  defaultEn: string;
}

export const EDITABLE_UI_TITLES: UiTitleDefinition[] = [
  {
    key: 'appTitle',
    category: 'عمومی و سربرگ (General & Header)',
    descriptionFa: 'عنوان اصلی نرم‌افزار در هدر و صفحه لاگین (در صورت خالی بودن نام سازمان)',
    descriptionEn: 'Main Application Title',
    defaultFa: 'سامانه مدیریت تردد و کارکرد کارکنان',
    defaultEn: 'Employee Attendance & Timesheet System'
  },
  {
    key: 'appSubtitle',
    category: 'عمومی و سربرگ (General & Header)',
    descriptionFa: 'زیرعنوان اصلی نرم‌افزار در صفحه ورود',
    descriptionEn: 'Application Subtitle on login',
    defaultFa: 'ثبت، پایش و تحلیل هوشمند کارکرد پرسنل',
    defaultEn: 'Smart Attendance & Timesheet Tracking'
  },
  {
    key: 'dashboard',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش داشبورد',
    descriptionEn: 'Dashboard Section Title',
    defaultFa: 'داشبورد اختصاصی',
    defaultEn: 'Dashboard'
  },
  {
    key: 'attendance',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش کارکرد عادی',
    descriptionEn: 'Regular Work Attendance Section',
    defaultFa: 'ثبت کارکرد',
    defaultEn: 'Work Timesheets'
  },
  {
    key: 'missions',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش ماموریت‌ها',
    descriptionEn: 'Missions Section',
    defaultFa: 'ماموریت‌ها',
    defaultEn: 'Missions'
  },
  {
    key: 'leaves',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش مرخصی‌ها',
    descriptionEn: 'Leaves Section',
    defaultFa: 'مرخصی‌ها',
    defaultEn: 'Leaves'
  },
  {
    key: 'specialWork',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش کارکرد خاص',
    descriptionEn: 'Special Work Section',
    defaultFa: 'کارکرد خاص',
    defaultEn: 'Special Conditions'
  },
  {
    key: 'projects',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش پروژه‌ها',
    descriptionEn: 'Projects Section',
    defaultFa: 'پروژه‌ها',
    defaultEn: 'Projects'
  },
  {
    key: 'reports',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش گزارش‌گیری جامع',
    descriptionEn: 'Reports Section',
    defaultFa: 'گزارش‌گیری جامع',
    defaultEn: 'Advanced Reports'
  },
  {
    key: 'backups',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش پشتیبان‌گیری',
    descriptionEn: 'Backups Section',
    defaultFa: 'پشتیبان‌گیری ماهانه',
    defaultEn: 'Monthly Backups'
  },
  {
    key: 'userManagement',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش مدیریت کاربران',
    descriptionEn: 'User Management Section',
    defaultFa: 'مدیریت کاربران',
    defaultEn: 'User Management'
  },
  {
    key: 'groupManagement',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش مدیریت گروه‌ها',
    descriptionEn: 'Group Management Section',
    defaultFa: 'مدیریت گروه‌ها',
    defaultEn: 'Organization Groups'
  },
  {
    key: 'registrationRequests',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش درخواست‌های عضویت',
    descriptionEn: 'Registration Requests Section',
    defaultFa: 'درخواست‌های عضویت',
    defaultEn: 'Registration Requests'
  },
  {
    key: 'sessionsAndSecurity',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش سشن‌ها و امنیت',
    descriptionEn: 'Sessions and Security Section',
    defaultFa: 'سشن‌ها و امنیت',
    defaultEn: 'Sessions & Security'
  },
  {
    key: 'systemLogs',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش لاگ فعالیت‌ها',
    descriptionEn: 'System Logs Section',
    defaultFa: 'لاگ فعالیت‌ها',
    defaultEn: 'System Logs'
  },
  {
    key: 'settings',
    category: 'منو و بخش‌ها (Navigation & Sections)',
    descriptionFa: 'عنوان بخش تنظیمات',
    descriptionEn: 'Settings Section',
    defaultFa: 'تنظیمات سامانه',
    defaultEn: 'System Settings'
  },
  {
    key: 'regularWork',
    category: 'عناوین کارکرد (Work Types)',
    descriptionFa: 'نام کارکرد عادی پروژه',
    descriptionEn: 'Regular project work label',
    defaultFa: 'کارکرد اصلی',
    defaultEn: 'Regular Work'
  },
  {
    key: 'missionRecord',
    category: 'عناوین کارکرد (Work Types)',
    descriptionFa: 'نام رکورد ماموریت',
    descriptionEn: 'Mission record label',
    defaultFa: 'ماموریت',
    defaultEn: 'Mission'
  },
  {
    key: 'leaveRecord',
    category: 'عناوین کارکرد (Work Types)',
    descriptionFa: 'نام رکورد مرخصی',
    descriptionEn: 'Leave record label',
    defaultFa: 'مرخصی',
    defaultEn: 'Leave'
  },
  {
    key: 'specialWorkRecord',
    category: 'عناوین کارکرد (Work Types)',
    descriptionFa: 'نام رکورد کارکرد خاص',
    descriptionEn: 'Special condition record label',
    defaultFa: 'کارکرد خاص',
    defaultEn: 'Special Conditions'
  }
];

export function getCustomizedTitle(key: string, lang: Language): string {
  const customTitles = StorageService.getSettings().customTitles || {};
  const localizedKey = `${key}_${lang}`;
  if (customTitles[localizedKey] && customTitles[localizedKey].trim()) {
    return customTitles[localizedKey].trim();
  }
  if (customTitles[key] && customTitles[key].trim()) {
    return customTitles[key].trim();
  }
  const defaultEntry = (translations[lang] as any)[key];
  return defaultEntry || '';
}
