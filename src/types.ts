export type UserRole = 'admin' | 'inspector' | 'executive' | 'employee';

export type WorkRecordType = 'regular' | 'mission' | 'leave' | 'special';

export interface CustomTypeConfig {
  id: string;
  titleFa: string;
  titleEn?: string;
}

export interface CustomUiText {
  key: string;
  defaultText: string;
  customText: string;
  description: string;
}

export interface SystemSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tempPasswordExpiryMinutes: number;
  leaveTypes: (string | CustomTypeConfig)[];
  specialWorkTypes: (string | CustomTypeConfig)[];
  blockedIps: string[];
  organizationName?: string;
  organizationLogo?: string;
  customTitles?: Record<string, string>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  jobTitle?: string;
  role: UserRole;
  groupIds: string[];
  isActive: boolean;
  isArchived: boolean;
  mustChangePassword: boolean;
  temporaryPasswordExpiry?: string | number;
  lastLoginAt?: string;
  createdAt: string;
  passwordHash: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberUserIds: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  groupIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  type: WorkRecordType;
  projectId?: string;
  date?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  durationMinutes: number;
  missionDestination?: string;
  leaveType?: string;
  leaveTypeId?: string;
  specialWorkType?: string;
  specialWorkTypeId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  ip: string;
  userAgent: string;
  device: string;
  loginAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface SystemLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  username: string;
  success: boolean;
  reason?: string;
  ip: string;
  device: string;
  timestamp: string;
}

export interface RegistrationRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  jobTitle?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface MonthlyBackup {
  id: string;
  monthKey: string;
  monthTitleFa: string;
  monthTitleEn: string;
  dateCreated: string;
  recordsCount: number;
  activeUsersCount: number;
  totalDurationMinutes: number;
  fileNameExcel: string;
  fileNamePdf: string;
  dataSummary: {
    userId: string;
    userName: string;
    jobTitle: string;
    regularMinutes: number;
    leaveMinutes: number;
    missionMinutes: number;
    specialMinutes: number;
    totalMinutes: number;
  }[];
}

export interface ChangelogItem {
  version: string;
  releaseDate: string;
  releaseDateFa: string;
  titleFa: string;
  titleEn: string;
  changesFa: string[];
  changesEn: string[];
}
