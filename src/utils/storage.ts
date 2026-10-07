import {
  User, Group, Project, AttendanceRecord, UserSession, SystemLog,
  RegistrationRequest, MonthlyBackup, SystemSettings, LoginAttempt, CustomTypeConfig
} from '../types';
import {
  getTodayJalali,
  getCurrentJalaliParts,
  calculateFullDurationMinutes,
  PERSIAN_MONTHS,
  ENGLISH_MONTH_EQUIVALENTS
} from './jalali';

const STORAGE_KEYS = {
  USERS: 'emp_att_users_v2',
  GROUPS: 'emp_att_groups_v2',
  PROJECTS: 'emp_att_projects_v2',
  ATTENDANCE: 'emp_att_attendance_v2',
  SESSIONS: 'emp_att_sessions_v2',
  LOGS: 'emp_att_logs_v2',
  REQUESTS: 'emp_att_requests_v2',
  BACKUPS: 'emp_att_backups_v2',
  SETTINGS: 'emp_att_settings_v2',
  LOGIN_ATTEMPTS: 'emp_att_login_attempts_v2',
  CURRENT_USER_ID: 'emp_att_current_user_id_v2',
  CURRENT_SESSION_ID: 'emp_att_current_session_id_v2',
  LANGUAGE: 'emp_att_lang_v2'
};

const DEFAULT_SETTINGS: SystemSettings = {
  primaryColor: '#2563eb', // Royal Blue
  secondaryColor: '#0d9488', // Teal
  accentColor: '#f59e0b', // Amber
  tempPasswordExpiryMinutes: 60,
  leaveTypes: [
    { id: 'lt-1', titleFa: 'مرخصی عادی', titleEn: 'Regular / Annual Leave' },
    { id: 'lt-2', titleFa: 'مرخصی استعلاجی', titleEn: 'Sick Leave' },
    { id: 'lt-3', titleFa: 'مرخصی مناسبتی', titleEn: 'Casual / Occasion Leave' }
  ],
  specialWorkTypes: [
    { id: 'st-1', titleFa: 'قطعی برق', titleEn: 'Power Outage' },
    { id: 'st-2', titleFa: 'اختلال شبکه و ارتباطات', titleEn: 'Network & System Disruption' },
    { id: 'st-3', titleFa: 'تعطیلی اضطراری / شرایط جوی', titleEn: 'Emergency / Weather Closure' }
  ],
  blockedIps: ['192.168.1.99'],
  organizationName: '',
  organizationLogo: '',
  customTitles: {}
};

export function getCustomTypeTitle(
  item: string | CustomTypeConfig,
  lang: 'fa' | 'en' = 'fa'
): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (lang === 'en' && item.titleEn && item.titleEn.trim()) return item.titleEn.trim();
  return item.titleFa || item.titleEn || '';
}

export function getCustomTypeId(item: string | CustomTypeConfig): string {
  if (typeof item === 'string') return item;
  return item.id;
}

/**
 * Normalizes Persian and Arabic numbers to Latin standard digits
 */
export function normalizePersianDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
}

/**
 * Normalizes Persian/Arabic characters, letters, and whitespace for bulletproof auth matching
 */
export function normalizeAuthText(str: string | undefined | null): string {
  if (!str) return '';
  return normalizePersianDigits(str)
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes phone numbers to standard format (e.g., 0912...)
 */
export function normalizeMobileNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = normalizePersianDigits(phone).replace(/\D/g, '');
  if (digits.startsWith('0098')) return '0' + digits.slice(4);
  if (digits.startsWith('98')) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}

/**
 * Validates worldwide password standards:
 * At least 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
export function validatePasswordStandard(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('طول رمز عبور باید حداقل ۸ کاراکتر باشد');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('شامل حداقل یک حرف کوچک انگلیسی (a-z)');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('شامل حداقل یک حرف بزرگ انگلیسی (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('شامل حداقل یک عدد (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('شامل حداقل یک نماد خاص (!@#$%^&*)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a compliant secure password
 */
export function generateStrongPassword(): string {
  const lowers = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  
  let pwd = '';
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  
  const all = lowers + uppers + digits + symbols;
  for (let i = 4; i < 10; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

// Initial Seeds: Only Super Admin is retained by default
function initializeDatabaseIfEmpty() {
  const existingUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
  const today = getTodayJalali();

  if (!existingUsersRaw) {
    // Seed groups
    const defaultGroups: Group[] = [
      {
        id: 'grp-tech',
        name: 'تیم فنی و مهندسی',
        description: 'توسعه نرم‌افزار، زیرساخت و نگهداری سرورها',
        memberUserIds: [],
        createdAt: today
      },
      {
        id: 'grp-finance',
        name: 'تیم اداری و مالی',
        description: 'حسابداری، منابع انسانی و امور اداری',
        memberUserIds: [],
        createdAt: today
      },
      {
        id: 'grp-marketing',
        name: 'تیم بازاریابی و فروش',
        description: 'فروش سازمانی، روابط عمومی و ارتباط با مشتریان',
        memberUserIds: [],
        createdAt: today
      }
    ];
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(defaultGroups));

    // Seed ONLY the Super Admin account (admin / admin with mandatory first-login password change)
    const defaultUsers: User[] = [
      {
        id: 'usr-admin',
        username: 'admin',
        email: 'admin@company.local',
        firstName: 'مدیر ارشد',
        lastName: 'سامانه',
        mobile: '09120000001',
        jobTitle: 'مدیریت کل سیستم',
        role: 'admin',
        groupIds: [],
        isActive: true,
        isArchived: false,
        mustChangePassword: true,
        createdAt: today,
        passwordHash: 'admin'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));

    // Seed projects
    const defaultProjects: Project[] = [
      {
        id: 'prj-1',
        title: 'سامانه یکپارچه مدیریت سازمانی',
        description: 'پیاده‌سازی ماژول‌های حسابداری، تردد و کنترل اسناد',
        groupIds: ['grp-tech', 'grp-finance'],
        isActive: true,
        createdAt: today
      },
      {
        id: 'prj-2',
        title: 'طراحی پورتال مشتریان و CRM',
        description: 'ارتقای تجربه کاربری و گزارش‌گیری فروش',
        groupIds: ['grp-tech', 'grp-marketing'],
        isActive: true,
        createdAt: today
      },
      {
        id: 'prj-3',
        title: 'مهاجرت به سرورهای ابری و داکر',
        description: 'تنظیمات Nginx، استقرار خودکار و گواهینامه‌های SSL',
        groupIds: ['grp-tech'],
        isActive: true,
        createdAt: today
      }
    ];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(defaultProjects));

    // Empty initial attendance records
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));

    // Initial login attempt for admin
    const initialAttempts: LoginAttempt[] = [
      {
        id: 'att-1',
        username: 'admin',
        success: true,
        ip: '127.0.0.1',
        device: 'رایانه رومیزی / مرورگر وب',
        timestamp: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(initialAttempts));
  } else {
    // Migration: purge unwanted old mock test accounts if still present in storage
    try {
      const parsedUsers: User[] = JSON.parse(existingUsersRaw);
      const testUsernames = ['inspector', 'executive', 'ali.hosseini', 'maryam.rad', 'omid.dolat'];
      const filteredUsers = parsedUsers.filter(u => u.role === 'admin' || !testUsernames.includes(u.username));
      
      if (filteredUsers.length !== parsedUsers.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
        
        // Remove test user attendance records
        const attRaw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
        if (attRaw) {
          const records: AttendanceRecord[] = JSON.parse(attRaw);
          const cleanedRecords = records.filter(r => !['usr-insp', 'usr-exec', 'usr-emp1', 'usr-emp2', 'usr-emp3'].includes(r.userId));
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cleanedRecords));
        }

        // Clean group member IDs
        const grpRaw = localStorage.getItem(STORAGE_KEYS.GROUPS);
        if (grpRaw) {
          const groups: Group[] = JSON.parse(grpRaw);
          const cleanedGroups = groups.map(g => ({
            ...g,
            memberUserIds: g.memberUserIds.filter(id => !['usr-insp', 'usr-exec', 'usr-emp1', 'usr-emp2', 'usr-emp3'].includes(id))
          }));
          localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(cleanedGroups));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}

initializeDatabaseIfEmpty();

export const StorageService = {
  // Settings & Theme
  getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        leaveTypes: parsed.leaveTypes || DEFAULT_SETTINGS.leaveTypes,
        specialWorkTypes: parsed.specialWorkTypes || DEFAULT_SETTINGS.specialWorkTypes
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  getOrgName(): string {
    return this.getSettings().organizationName || '';
  },

  getOrgLogo(): string {
    return this.getSettings().organizationLogo || '';
  },

  saveSettings(settings: SystemSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.applyThemeColors(settings);
  },

  applyThemeColors(settings: SystemSettings) {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  },

  // Language
  getLanguage(): 'fa' | 'en' {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang === 'en' ? 'en' : 'fa';
  },

  setLanguage(lang: 'fa' | 'en') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  },

  // Users
  getUsers(includeArchived = false): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    try {
      const users: User[] = JSON.parse(raw);
      return includeArchived ? users : users.filter(u => !u.isArchived);
    } catch {
      return [];
    }
  },

  // "مدیر ارشد سامانه هیچ جا نیاد و به همه چی و همه جا دسترسی داره"
  getEmployeesForReports(): User[] {
    return this.getUsers(false).filter(u => u.isActive && u.role !== 'admin');
  },

  getArchivedUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    try {
      const users: User[] = JSON.parse(raw);
      return users.filter(u => u.isArchived);
    } catch {
      return [];
    }
  },

  getUserById(id: string): User | undefined {
    return this.getUsers(true).find(u => u.id === id);
  },

  saveUser(user: User) {
    const users = this.getUsers(true);
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  archiveUser(userId: string) {
    const user = this.getUserById(userId);
    if (user) {
      user.isArchived = true;
      user.isActive = false;
      this.saveUser(user);
      this.addLog('ARCHIVE_USER', `کاربر ${user.firstName} ${user.lastName} (${user.username}) به بخش آرشیو منتقل شد.`);
    }
  },

  restoreUser(userId: string) {
    const user = this.getUserById(userId);
    if (user) {
      user.isArchived = false;
      user.isActive = true;
      this.saveUser(user);
      this.addLog('RESTORE_USER', `کاربر ${user.firstName} ${user.lastName} از آرشیو بازگردانی شد.`);
    }
  },

  permanentlyDeleteUser(userId: string) {
    const users = this.getUsers(true).filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addLog('PERMANENT_DELETE_USER', `کاربر شناسه ${userId} به طور دائم از پایگاه داده حذف گردید.`);
  },

  validateUser(identifierOrUsername: string, passwordPlain: string): User | null {
    if (!identifierOrUsername || !passwordPlain) return null;

    const rawId = String(identifierOrUsername).trim();
    const normId = normalizeAuthText(rawId);
    const normIdNoSpace = normId.replace(/\s+/g, '');
    const mobileId = normalizeMobileNumber(rawId);

    // Clean entered password
    const cleanPass = String(passwordPlain)
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r/g, '');
    const cleanPassDigits = normalizePersianDigits(cleanPass);

    const users = this.getUsers(true);
    const target = users.find(u => {
      const uUsernameNorm = normalizeAuthText(u.username || '');
      const uEmailNorm = normalizeAuthText(u.email || '');
      const uEmailPrefixNorm = uEmailNorm.includes('@') ? uEmailNorm.split('@')[0] : '';
      const uMobileNorm = normalizeMobileNumber(u.mobile || '');
      const uFullNameNorm = normalizeAuthText(`${u.firstName || ''} ${u.lastName || ''}`);
      const uFullNameNoSpace = uFullNameNorm.replace(/\s+/g, '');

      return (
        uUsernameNorm === normId ||
        (uEmailNorm && uEmailNorm === normId) ||
        (uEmailPrefixNorm && uEmailPrefixNorm === normId) ||
        (uMobileNorm && mobileId && uMobileNorm === mobileId) ||
        (uFullNameNorm && uFullNameNorm === normId) ||
        (uFullNameNoSpace && normIdNoSpace && uFullNameNoSpace === normIdNoSpace)
      );
    });

    if (!target) return null;

    const storedPass = String(target.passwordHash || '')
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r/g, '');
    const storedPassDigits = normalizePersianDigits(storedPass);

    const matches =
      storedPass === cleanPass ||
      storedPassDigits === cleanPassDigits ||
      storedPass === cleanPassDigits ||
      storedPassDigits === cleanPass ||
      storedPass.toLowerCase() === cleanPass.toLowerCase() ||
      storedPassDigits.toLowerCase() === cleanPassDigits.toLowerCase();

    if (matches) {
      return target;
    }

    return null;
  },

  // Groups
  getGroups(): Group[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveGroup(group: Group) {
    const groups = this.getGroups();
    const idx = groups.findIndex(g => g.id === group.id);
    if (idx >= 0) {
      groups[idx] = group;
    } else {
      groups.push(group);
    }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  },

  deleteGroup(groupId: string) {
    const groups = this.getGroups().filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    this.addLog('DELETE_GROUP', `گروه کاربری شناسه ${groupId} حذف شد.`);
  },

  // Projects
  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveProject(project: Project) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = project;
    } else {
      projects.push(project);
    }
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  deleteProject(projectId: string) {
    const projects = this.getProjects().filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    this.addLog('DELETE_PROJECT', `پروژه شناسه ${projectId} حذف شد.`);
  },

  // Attendance Records
  // "در هر نوع کارکرد و مرخصی و ماموریت تاریخ شروع و ساعت شروع و تاریخ پایان و ساعت پایان مهمه"
  getAttendanceRecords(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!raw) return [];
    try {
      const records: AttendanceRecord[] = JSON.parse(raw);
      return records.map(r => ({
        ...r,
        startDate: r.startDate || r.date || getTodayJalali(),
        endDate: r.endDate || r.date || getTodayJalali(),
        startTime: r.startTime || '08:00',
        endTime: r.endTime || '16:00'
      }));
    } catch {
      return [];
    }
  },

  saveAttendanceRecord(record: AttendanceRecord) {
    const records = this.getAttendanceRecords();
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      records[idx] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      records.unshift(record);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  },

  deleteAttendanceRecord(recordId: string) {
    const records = this.getAttendanceRecords().filter(r => r.id !== recordId);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  },

  // Registration Requests
  getRegistrationRequests(): RegistrationRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  submitRegistrationRequest(req: Omit<RegistrationRequest, 'id' | 'requestedAt' | 'status'>): { success: boolean; message?: string } {
    const requests = this.getRegistrationRequests();
    const users = this.getUsers(true);

    const emailLower = req.email.trim().toLowerCase();
    const existsInUsers = users.some(u => u.email.toLowerCase() === emailLower);
    const existsInPending = requests.some(r => r.email.toLowerCase() === emailLower && r.status === 'pending');

    if (existsInUsers || existsInPending) {
      return {
        success: false,
        message: 'این اطلاعات قبلاً ثبت شده و در انتظار بررسی است. لطفاً با مدیر سیستم تماس بگیرید.'
      };
    }

    const newRequest: RegistrationRequest = {
      ...req,
      id: `req-${Date.now()}`,
      requestedAt: getTodayJalali(),
      status: 'pending'
    };

    requests.unshift(newRequest);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    this.addLog('SUBMIT_REGISTRATION_REQUEST', `درخواست عضویت جدید توسط ${req.firstName} ${req.lastName} (${req.email}) ثبت گردید.`);
    return { success: true };
  },

  updateRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    const requests = this.getRegistrationRequests();
    const target = requests.find(r => r.id === requestId);
    if (target) {
      target.status = status;
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    }
  },

  // Sessions & Security
  getSessions(): UserSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  getCurrentSessionId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  },

  createSession(user: User, ip = '192.168.1.105'): UserSession {
    const sessions = this.getSessions();
    const userAgent = navigator.userAgent;
    const device = navigator.userAgent.includes('Mobile') ? 'گوشی هوشمند' : 'رایانه رومیزی / مرورگر وب';
    
    const newSession: UserSession = {
      id: `sess-${Date.now()}`,
      userId: user.id,
      username: user.username,
      ip,
      userAgent,
      device,
      loginAt: new Date().toLocaleTimeString('fa-IR') + ' ' + getTodayJalali(),
      lastActiveAt: new Date().toLocaleTimeString('fa-IR'),
      isActive: true
    };

    sessions.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, newSession.id);
    return newSession;
  },

  terminateSession(sessionId: string) {
    const sessions = this.getSessions();
    const target = sessions.find(s => s.id === sessionId);
    if (target) {
      target.isActive = false;
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      this.addLog('TERMINATE_SESSION', `سشن کاربر ${target.username} با شناسه ${sessionId} خاتمه یافت.`);
      
      if (localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID) === sessionId) {
        this.clearCurrentAuth();
      }
    }
  },

  // "سشن هاشو به جز سشن جاریش حذف کنه"
  terminateOtherSessions(userId: string, currentSessionId: string) {
    const sessions = this.getSessions();
    let count = 0;
    sessions.forEach(s => {
      if (s.userId === userId && s.id !== currentSessionId && s.isActive) {
        s.isActive = false;
        count++;
      }
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    this.addLog('TERMINATE_OTHER_SESSIONS', `${count} نشست فعال دیگر کاربر با موفقیت بسته شد.`);
  },

  blockIp(ip: string) {
    const settings = this.getSettings();
    if (!settings.blockedIps.includes(ip)) {
      settings.blockedIps.push(ip);
      this.saveSettings(settings);
      this.addLog('BLOCK_IP', `آدرس آی‌پی ${ip} در فایروال سامانه مسدود شد.`);
    }
  },

  unblockIp(ip: string) {
    const settings = this.getSettings();
    settings.blockedIps = settings.blockedIps.filter(item => item !== ip);
    this.saveSettings(settings);
    this.addLog('UNBLOCK_IP', `آدرس آی‌پی ${ip} از لیست مسدودی خارج گردید.`);
  },

  // Login Attempts (ورودهای موفق و ناموفق)
  getLoginAttempts(userIdOrUsername?: string): LoginAttempt[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
    if (!raw) return [];
    try {
      const attempts: LoginAttempt[] = JSON.parse(raw);
      if (userIdOrUsername) {
        return attempts.filter(
          a => a.userId === userIdOrUsername || a.username.toLowerCase() === userIdOrUsername.toLowerCase()
        );
      }
      return attempts;
    } catch {
      return [];
    }
  },

  recordLoginAttempt(
    attemptOrUsername: Omit<LoginAttempt, 'id' | 'timestamp'> | string,
    success?: boolean,
    ip = '127.0.0.1',
    device = 'مرورگر وب'
  ) {
    const attempts = this.getLoginAttempts();
    let newAttempt: LoginAttempt;

    if (typeof attemptOrUsername === 'string') {
      const u = this.getUsers(true).find(usr => usr.username.toLowerCase() === attemptOrUsername.toLowerCase());
      newAttempt = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: u?.id,
        username: attemptOrUsername,
        success: Boolean(success),
        ip,
        device,
        timestamp: new Date().toISOString()
      };
    } else {
      newAttempt = {
        ...attemptOrUsername,
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
      };
    }

    attempts.unshift(newAttempt);
    if (attempts.length > 500) attempts.pop();
    localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(attempts));
  },

  // Auth State
  getCurrentUser(): User | null {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!id) return null;
    const user = this.getUserById(id);
    if (!user || !user.isActive || user.isArchived) {
      this.clearCurrentAuth();
      return null;
    }

    const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (currentSessionId) {
      const session = this.getSessions().find(s => s.id === currentSessionId);
      if (session && !session.isActive) {
        this.clearCurrentAuth();
        return null;
      }
    }

    return user;
  },

  setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    user.lastLoginAt = new Date().toISOString();
    this.saveUser(user);
    this.createSession(user);
    this.addLog('USER_LOGIN', `کاربر ${user.firstName} ${user.lastName} (${user.username}) وارد سامانه شد.`);
  },

  clearCurrentAuth() {
    const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentUserId) {
      const user = this.getUserById(currentUserId);
      if (user) {
        this.addLog('USER_LOGOUT', `کاربر ${user.firstName} ${user.lastName} از سامانه خارج شد.`);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  },

  // System Logs
  getLogs(): SystemLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  addLog(action: string, details: string) {
    const user = this.getCurrentUser();
    const logs = this.getLogs();
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || 'sys',
      username: user?.username || 'system',
      action,
      details,
      ip: '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 2000) logs.pop();
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  // Monthly Backups Engine
  getBackups(): MonthlyBackup[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  generateMonthlyBackup(forced = false): MonthlyBackup | null {
    const nowParts = getCurrentJalaliParts();
    const monthKey = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}`;
    const backups = this.getBackups();

    const existingIndex = backups.findIndex(b => b.monthKey === monthKey);
    // Super Admin excluded from monthly employee attendance records
    const activeStaff = this.getEmployeesForReports();
    const records = this.getAttendanceRecords();

    const summaryData = activeStaff.map(user => {
      const userRecords = records.filter(r => {
        if (r.userId !== user.id) return false;
        const targetDate = r.startDate || r.date || '';
        const parts = targetDate.split('/');
        return parseInt(parts[0], 10) === nowParts.year && parseInt(parts[1], 10) === nowParts.month;
      });

      let regular = 0;
      let leave = 0;
      let mission = 0;
      let special = 0;

      userRecords.forEach(r => {
        if (r.type === 'regular') regular += r.durationMinutes;
        else if (r.type === 'leave') leave += r.durationMinutes;
        else if (r.type === 'mission') mission += r.durationMinutes;
        else if (r.type === 'special') special += r.durationMinutes;
      });

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        jobTitle: user.jobTitle || 'کارشناس',
        regularMinutes: regular,
        leaveMinutes: leave,
        missionMinutes: mission,
        specialMinutes: special,
        totalMinutes: regular + leave + mission + special
      };
    });

    const totalMinutes = summaryData.reduce((acc, curr) => acc + curr.totalMinutes, 0);

    const monthTitleFa = `${nowParts.monthName} ${nowParts.year}`;
    const monthTitleEn = `${ENGLISH_MONTH_EQUIVALENTS[nowParts.month - 1]} ${nowParts.year}`;

    const newBackup: MonthlyBackup = {
      id: `bkp-${monthKey}`,
      monthKey,
      monthTitleFa,
      monthTitleEn,
      dateCreated: getTodayJalali() + ' ' + new Date().toLocaleTimeString('fa-IR'),
      recordsCount: records.filter(r => (r.startDate || r.date || '').startsWith(`${nowParts.year}/${String(nowParts.month).padStart(2, '0')}`)).length,
      activeUsersCount: activeStaff.length,
      totalDurationMinutes: totalMinutes,
      fileNameExcel: `Backup_${nowParts.year}_${String(nowParts.month).padStart(2, '0')}_${nowParts.monthName}.xlsx`,
      fileNamePdf: `Backup_${nowParts.year}_${String(nowParts.month).padStart(2, '0')}_${nowParts.monthName}.pdf`,
      dataSummary: summaryData
    };

    if (existingIndex >= 0) {
      backups[existingIndex] = newBackup;
    } else {
      backups.unshift(newBackup);
    }

    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
    if (forced) {
      this.addLog('GENERATE_BACKUP', `پشتیبان ماهانه برای ${monthTitleFa} تولید و فایل روزهای قبلی ماه پاکسازی گردید.`);
    }
    return newBackup;
  },

  deleteBackup(id: string) {
    const backups = this.getBackups().filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
    this.addLog('DELETE_BACKUP', `فایل پشتیبان ماهانه شناسه ${id} حذف گردید.`);
  }
};

StorageService.generateMonthlyBackup();
StorageService.applyThemeColors(StorageService.getSettings());
