/**
 * Device and IP Detection Utilities
 * Accurate User-Agent parsing, Client IP detection behind proxies/Kerio Control,
 * High-quality Cartoon Avatars and Solid Color Avatar Palettes.
 */

export interface ParsedDeviceInfo {
  rawDevice: string;
  os: string;
  browser: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  iconType: 'desktop' | 'mobile';
  displayTitleFa: string;
  displayTitleEn: string;
}

/**
 * Parse User-Agent string to determine exact OS, browser, and device form factor
 */
export function parseDeviceAndBrowser(userAgentString?: string): ParsedDeviceInfo {
  const ua = userAgentString || (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';

  let os = 'سایر / نامشخص';
  let osEn = 'Unknown OS';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  let iconType: 'desktop' | 'mobile' = 'desktop';

  // Detect Operating System
  if (/Windows NT 10.0/i.test(ua) || /Windows 11/i.test(ua) || /Windows 10/i.test(ua)) {
    os = 'ویندوز (رایانه / لپ‌تاپ)';
    osEn = 'Windows PC/Laptop';
  } else if (/Windows/i.test(ua)) {
    os = 'ویندوز';
    osEn = 'Windows';
  } else if (/iPhone/i.test(ua)) {
    os = 'گوشی آیفون (iOS)';
    osEn = 'Apple iPhone';
    deviceType = 'mobile';
    iconType = 'mobile';
  } else if (/iPad/i.test(ua)) {
    os = 'آیپد (iPadOS)';
    osEn = 'Apple iPad';
    deviceType = 'tablet';
    iconType = 'mobile';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'مک‌بوک / مک (macOS)';
    osEn = 'macOS Desktop/Laptop';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      os = 'گوشی اندروید (Android)';
      osEn = 'Android Smartphone';
      deviceType = 'mobile';
      iconType = 'mobile';
    } else {
      os = 'تبلت اندروید (Android Tablet)';
      osEn = 'Android Tablet';
      deviceType = 'tablet';
      iconType = 'mobile';
    }
  } else if (/Linux/i.test(ua)) {
    os = 'لینوکس (Linux)';
    osEn = 'Linux Desktop';
  }

  // Detect Browser
  let browser = 'مرورگر وب';
  let browserEn = 'Web Browser';

  if (/SamsungBrowser/i.test(ua)) {
    browser = 'سامسونگ اینترنت (Samsung Browser)';
    browserEn = 'Samsung Internet';
  } else if (/Edg\//i.test(ua)) {
    browser = 'مایکروسافت اج (Microsoft Edge)';
    browserEn = 'Microsoft Edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'گوگل کروم (Google Chrome)';
    browserEn = 'Google Chrome';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'فایرفاکس (Mozilla Firefox)';
    browserEn = 'Mozilla Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'سافاری (Apple Safari)';
    browserEn = 'Apple Safari';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'اپرا (Opera)';
    browserEn = 'Opera';
  }

  const displayTitleFa = `${os} - ${browser}`;
  const displayTitleEn = `${osEn} - ${browserEn}`;

  return {
    rawDevice: displayTitleFa,
    os,
    browser,
    deviceType,
    iconType,
    displayTitleFa,
    displayTitleEn
  };
}

/**
 * Cache for detected client IP to avoid redundant network calls
 */
let cachedClientIp: string | null = null;

/**
 * Detect client IP from:
 * 1. WebRTC local IP candidate (very useful behind Kerio / local NAT)
 * 2. Backend /api/my-ip reverse proxy headers (X-Forwarded-For, X-Real-IP)
 * 3. Public IP lookup APIs (ipify)
 */
export async function detectClientIp(): Promise<string> {
  if (cachedClientIp) {
    return cachedClientIp;
  }

  // 1. Try local backend /api/my-ip first (reads Kerio X-Forwarded-For / X-Real-IP)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('/api/my-ip', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') {
        cachedClientIp = data.ip;
        return data.ip;
      }
    }
  } catch {}

  // 2. Try WebRTC candidate to extract real client IP in LAN / NAT environment
  try {
    const rtcIp = await new Promise<string>((resolve) => {
      const RTCPC = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection;
      if (!RTCPC) return resolve('');
      const pc = new RTCPC({ iceServers: [] });
      pc.createDataChannel('');
      let done = false;

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) return;
        const cand = event.candidate.candidate;
        const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(cand);
        if (match && match[1] && !done) {
          done = true;
          try { pc.close(); } catch {}
          resolve(match[1]);
        }
      };

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {});

      setTimeout(() => {
        if (!done) {
          done = true;
          try { pc.close(); } catch {}
          resolve('');
        }
      }, 1000);
    });

    if (rtcIp) {
      cachedClientIp = rtcIp;
      return rtcIp;
    }
  } catch {}

  // 3. Try external public IP service
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedClientIp = data.ip;
        return data.ip;
      }
    }
  } catch {}

  // Fallback
  return '192.168.1.100';
}

/**
 * 12 High-Quality Cartoon Character Avatars (Vector SVGs)
 */
export const DEFAULT_AVATAR_PRESETS = [
  {
    id: 'emoji-cool',
    nameFa: 'خوش‌استایل',
    nameEn: 'Cool',
    emoji: '😎',
    bgColor: '#2563EB',
    dataUrl: 'emoji:😎|#2563EB'
  },
  {
    id: 'emoji-rocket',
    nameFa: 'پیشرو و پرشتاب',
    nameEn: 'Rocket',
    emoji: '🚀',
    bgColor: '#4F46E5',
    dataUrl: 'emoji:🚀|#4F46E5'
  },
  {
    id: 'emoji-crown',
    nameFa: 'تاج طلایی',
    nameEn: 'Crown',
    emoji: '👑',
    bgColor: '#D97706',
    dataUrl: 'emoji:👑|#D97706'
  },
  {
    id: 'emoji-star',
    nameFa: 'ستاره درخشان',
    nameEn: 'Glowing Star',
    emoji: '🌟',
    bgColor: '#CA8A04',
    dataUrl: 'emoji:🌟|#CA8A04'
  },
  {
    id: 'emoji-fire',
    nameFa: 'پرانرژی و آتشین',
    nameEn: 'Fire',
    emoji: '🔥',
    bgColor: '#DC2626',
    dataUrl: 'emoji:🔥|#DC2626'
  },
  {
    id: 'emoji-lightning',
    nameFa: 'صاعقه سرعت',
    nameEn: 'Lightning',
    emoji: '⚡',
    bgColor: '#0284C7',
    dataUrl: 'emoji:⚡|#0284C7'
  },
  {
    id: 'emoji-lion',
    nameFa: 'شیر قدرتمند',
    nameEn: 'Lion',
    emoji: '🦁',
    bgColor: '#EA580C',
    dataUrl: 'emoji:🦁|#EA580C'
  },
  {
    id: 'emoji-fox',
    nameFa: 'روباه باهوش',
    nameEn: 'Clever Fox',
    emoji: '🦊',
    bgColor: '#E11D48',
    dataUrl: 'emoji:🦊|#E11D48'
  },
  {
    id: 'emoji-panda',
    nameFa: 'پاندای دوست‌داشتنی',
    nameEn: 'Panda',
    emoji: '🐼',
    bgColor: '#059669',
    dataUrl: 'emoji:🐼|#059669'
  },
  {
    id: 'emoji-unicorn',
    nameFa: 'یونیکورن جادویی',
    nameEn: 'Unicorn',
    emoji: '🦄',
    bgColor: '#9333EA',
    dataUrl: 'emoji:🦄|#9333EA'
  },
  {
    id: 'emoji-tiger',
    nameFa: 'ببر جسور',
    nameEn: 'Tiger',
    emoji: '🐯',
    bgColor: '#B45309',
    dataUrl: 'emoji:🐯|#B45309'
  },
  {
    id: 'emoji-owl',
    nameFa: 'جغد دانا',
    nameEn: 'Wise Owl',
    emoji: '🦉',
    bgColor: '#4338CA',
    dataUrl: 'emoji:🦉|#4338CA'
  },
  {
    id: 'emoji-butterfly',
    nameFa: 'پروانه رنگارنگ',
    nameEn: 'Butterfly',
    emoji: '🦋',
    bgColor: '#DB2777',
    dataUrl: 'emoji:🦋|#DB2777'
  },
  {
    id: 'emoji-diamond',
    nameFa: 'الماس درخشان',
    nameEn: 'Diamond',
    emoji: '💎',
    bgColor: '#0891B2',
    dataUrl: 'emoji:💎|#0891B2'
  },
  {
    id: 'emoji-target',
    nameFa: 'هدفمند و دقیق',
    nameEn: 'Target',
    emoji: '🎯',
    bgColor: '#0D9488',
    dataUrl: 'emoji:🎯|#0D9488'
  },
  {
    id: 'emoji-headphones',
    nameFa: 'تمرکز و موسیقی',
    nameEn: 'Headphones',
    emoji: '🎧',
    bgColor: '#7C3AED',
    dataUrl: 'emoji:🎧|#7C3AED'
  },
  {
    id: 'emoji-coffee',
    nameFa: 'قهوه و کار',
    nameEn: 'Coffee',
    emoji: '☕',
    bgColor: '#78350F',
    dataUrl: 'emoji:☕|#78350F'
  },
  {
    id: 'emoji-laptop',
    nameFa: 'متخصص فناوری',
    nameEn: 'Tech Pro',
    emoji: '💻',
    bgColor: '#1E293B',
    dataUrl: 'emoji:💻|#1E293B'
  }
];

/**
 * 12 Vibrant Solid Colors that the user can pick instead of an avatar image
 * ("کاربر بتونه جای اواتار رنگ بزاره")
 */
export const DEFAULT_AVATAR_COLORS = [
  { id: 'c-blue', nameFa: 'آبی سلطنتی', hex: '#2563EB' },
  { id: 'c-teal', nameFa: 'فیروزه‌ای زنده', hex: '#0D9488' },
  { id: 'c-emerald', nameFa: 'زمردی سرسبز', hex: '#059669' },
  { id: 'c-purple', nameFa: 'بنفش لوکس', hex: '#7C3AED' },
  { id: 'c-rose', nameFa: 'سرخابی پرنشاط', hex: '#E11D48' },
  { id: 'c-amber', nameFa: 'طلایی گرم', hex: '#D97706' },
  { id: 'c-indigo', nameFa: 'نیلی اقیانوسی', hex: '#4F46E5' },
  { id: 'c-orange', nameFa: 'نارنجی تابان', hex: '#EA580C' },
  { id: 'c-cyan', nameFa: 'آبی آسمانی', hex: '#0891B2' },
  { id: 'c-fuchsia', nameFa: 'سرخ‌فام بنفش', hex: '#C026D3' },
  { id: 'c-slate', nameFa: 'سربی شیک', hex: '#334155' },
  { id: 'c-red', nameFa: 'یاقوتی کلاسیک', hex: '#DC2626' }
];

export function isEmojiAvatar(avatar?: string): boolean {
  if (!avatar) return false;
  return avatar.startsWith('emoji:');
}

export function parseEmojiAvatar(avatar?: string): { emoji: string; bgColor: string } {
  if (!avatar || !avatar.startsWith('emoji:')) {
    return { emoji: '😎', bgColor: '#2563EB' };
  }
  const raw = avatar.slice('emoji:'.length);
  const [emoji, bgColor] = raw.split('|');
  return {
    emoji: emoji || '😎',
    bgColor: bgColor || '#2563EB'
  };
}

export function isColorAvatar(avatar?: string): boolean {
  if (!avatar) return false;
  return avatar.startsWith('color:') || avatar.startsWith('#');
}

export function getColorFromAvatar(avatar?: string): string {
  if (!avatar) return '#2563EB';
  if (avatar.startsWith('color:')) return avatar.replace('color:', '');
  if (avatar.startsWith('#')) return avatar;
  return '#2563EB';
}

