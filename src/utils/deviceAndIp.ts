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
    id: 'cartoon-boy-cap',
    nameFa: 'پسر ورزشکار با کلاه نقابدار',
    nameEn: 'Cap Guy',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%233B82F6"/><circle cx="60" cy="58" r="26" fill="%23FED7AA"/><path d="M34 52c0-14.36 11.64-26 26-26s26 11.64 26 26H34z" fill="%231E3A8A"/><path d="M50 26h38c6 0 10 4 12 7l4 2H50v-9z" fill="%232563EB"/><circle cx="51" cy="56" r="3.5" fill="%231E293B"/><circle cx="69" cy="56" r="3.5" fill="%231E293B"/><circle cx="52" cy="54.5" r="1.2" fill="%23FFFFFF"/><circle cx="70" cy="54.5" r="1.2" fill="%23FFFFFF"/><path d="M54 68c2 3 10 3 12 0" stroke="%23EA580C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%231D4ED8"/></svg>`
  },
  {
    id: 'cartoon-girl-glasses',
    nameFa: 'دختر با عینک گرد و موی فر',
    nameEn: 'Curly Glasses Girl',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%23EC4899"/><circle cx="38" cy="46" r="14" fill="%23EA580C"/><circle cx="82" cy="46" r="14" fill="%23EA580C"/><circle cx="60" cy="58" r="26" fill="%23FDE68A"/><path d="M34 50c0-14.36 11.64-26 26-26s26 11.64 26 26v4c-8-6-16-4-26 0-10-4-18-6-26 0v-4z" fill="%23C2410C"/><circle cx="50" cy="58" r="7" fill="none" stroke="%23374151" stroke-width="2.5"/><circle cx="70" cy="58" r="7" fill="none" stroke="%23374151" stroke-width="2.5"/><path d="M57 58h6" stroke="%23374151" stroke-width="2.5"/><circle cx="50" cy="58" r="3" fill="%231F2937"/><circle cx="70" cy="58" r="3" fill="%231F2937"/><circle cx="51" cy="56.5" r="1" fill="%23FFFFFF"/><circle cx="71" cy="56.5" r="1" fill="%23FFFFFF"/><path d="M54 70c2 3 10 3 12 0" stroke="%23BE185D" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M28 108c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="%23DB2777"/></svg>`
  },
  {
    id: 'cartoon-bearded-tech',
    nameFa: 'مهندس با ریش آراسته و عینک',
    nameEn: 'Tech Guy with Beard',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%2310B981"/><circle cx="60" cy="58" r="26" fill="%23FFEDD5"/><path d="M34 46c0-14 11-24 26-24s26 10 26 24H34z" fill="%23451A03"/><rect x="42" y="50" width="15" height="11" rx="3" fill="none" stroke="%231E293B" stroke-width="2.2"/><rect x="63" y="50" width="15" height="11" rx="3" fill="none" stroke="%231E293B" stroke-width="2.2"/><path d="M57 55h6" stroke="%231E293B" stroke-width="2.2"/><circle cx="49.5" cy="55.5" r="2.5" fill="%230F172A"/><circle cx="70.5" cy="55.5" r="2.5" fill="%230F172A"/><path d="M42 66c0 10 8 18 18 18s18-8 18-18c0-4-3-6-6-6-4 3-8 3-12 0-3 0-6 2-6 6z" fill="%2378350F"/><path d="M55 74c2 2 8 2 10 0" stroke="%23FFFFFF" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M28 108c0-17.673 14.327-32 32-32s32 14.327 32 32" fill="%23047857"/></svg>`
  },
  {
    id: 'cartoon-girl-ponytail',
    nameFa: 'دختر پرانرژی با هودی بنفش',
    nameEn: 'Ponytail Hoodie Girl',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%238B5CF6"/><circle cx="60" cy="56" r="26" fill="%23FED7AA"/><path d="M78 28c8-3 18 2 20 12-1 8-7 14-14 16l-6-28z" fill="%231E1B4B"/><path d="M34 50c0-14.36 11.64-26 26-26s26 11.64 26 26v4c-8-4-16-6-26-2-8-3-18 0-26 2v-4z" fill="%23312E81"/><circle cx="51" cy="56" r="3.5" fill="%231E293B"/><circle cx="69" cy="56" r="3.5" fill="%231E293B"/><circle cx="52" cy="54" r="1.2" fill="%23FFFFFF"/><circle cx="70" cy="54" r="1.2" fill="%23FFFFFF"/><circle cx="43" cy="62" r="3" fill="%23F472B6" opacity="0.6"/><circle cx="77" cy="62" r="3" fill="%23F472B6" opacity="0.6"/><path d="M54 66c2 3 10 3 12 0" stroke="%23C2410C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%236D28D9"/></svg>`
  },
  {
    id: 'cartoon-gamer-headphones',
    nameFa: 'گیمر با هدفون حرفه‌ای',
    nameEn: 'Gamer with Headset',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%2306B6D4"/><circle cx="60" cy="58" r="26" fill="%23FFEDD5"/><path d="M34 50c0-14 11-24 26-24s26 10 26 24l-8-6-10 4-8-4-14 6z" fill="%23374151"/><path d="M32 54c0-18 12-28 28-28s28 10 28 28" fill="none" stroke="%23111827" stroke-width="4.5"/><rect x="27" y="48" width="8" height="18" rx="4" fill="%23EF4444"/><rect x="85" y="48" width="8" height="18" rx="4" fill="%23EF4444"/><circle cx="51" cy="56" r="3.5" fill="%230F172A"/><circle cx="69" cy="56" r="3.5" fill="%230F172A"/><path d="M54 67c2 3 10 3 12 0" stroke="%23C2410C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%230E7490"/></svg>`
  },
  {
    id: 'cartoon-cute-bot',
    nameFa: 'ربات هوشمند و دوستانه',
    nameEn: 'Friendly AI Robot',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%236366F1"/><path d="M60 22v10" stroke="%23CBD5E1" stroke-width="3"/><circle cx="60" cy="20" r="4.5" fill="%23F59E0B"/><rect x="36" y="32" width="48" height="38" rx="14" fill="%23F8FAFC" stroke="%23E2E8F0" stroke-width="2"/><rect x="42" y="40" width="36" height="20" rx="8" fill="%230F172A"/><circle cx="51" cy="50" r="4" fill="%2338BDF8"/><circle cx="69" cy="50" r="4" fill="%2338BDF8"/><circle cx="52" cy="48.5" r="1.3" fill="%23FFFFFF"/><circle cx="70" cy="48.5" r="1.3" fill="%23FFFFFF"/><rect x="29" y="44" width="7" height="14" rx="3.5" fill="%23CBD5E1"/><rect x="84" y="44" width="7" height="14" rx="3.5" fill="%23CBD5E1"/><path d="M30 108c0-16.569 13.431-30 30-30s30 13.431 30 30" fill="%234338CA"/></svg>`
  },
  {
    id: 'cartoon-cat-hoodie',
    nameFa: 'کاراکتر فانتزی با کلاه گوش‌گربه‌ای',
    nameEn: 'Cat-eared Character',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%23F59E0B"/><path d="M38 28l-8 16 16-2zM82 28l8 16-16-2z" fill="%231E293B"/><circle cx="60" cy="58" r="28" fill="%231E293B"/><circle cx="60" cy="62" r="22" fill="%23FFEDD5"/><circle cx="52" cy="59" r="3.5" fill="%230F172A"/><circle cx="68" cy="59" r="3.5" fill="%230F172A"/><circle cx="53" cy="57.5" r="1.2" fill="%23FFFFFF"/><circle cx="69" cy="57.5" r="1.2" fill="%23FFFFFF"/><path d="M59 65l2 1.5 2-1.5" stroke="%23EA580C" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M57 69c1.5 1.5 4.5 1.5 6 0" stroke="%23EA580C" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%230F172A"/></svg>`
  },
  {
    id: 'cartoon-smiling-executive',
    nameFa: 'مدیر خندان با کراوات سرمه‌ای',
    nameEn: 'Smiling Executive',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%230284C7"/><circle cx="60" cy="54" r="26" fill="%23FFEDD5"/><path d="M34 44c0-14 11-24 26-24s26 10 26 24l-14-4-12 2-14-2-12 4z" fill="%231E293B"/><circle cx="51" cy="52" r="3.5" fill="%230F172A"/><circle cx="69" cy="52" r="3.5" fill="%230F172A"/><circle cx="52" cy="50.5" r="1.2" fill="%23FFFFFF"/><circle cx="70" cy="50.5" r="1.2" fill="%23FFFFFF"/><path d="M52 64c3 4 13 4 16 0" stroke="%23C2410C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%230369A1"/><path d="M54 74l6 8 6-8-3 18-3 6-3-6-3-18z" fill="%23EF4444"/><path d="M54 74h12l-6 6-6-6z" fill="%23991B1B"/></svg>`
  },
  {
    id: 'cartoon-warm-beanie',
    nameFa: 'کاربر صمیمی با کلاه بافتنی',
    nameEn: 'Warm Beanie Friend',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%23F97316"/><circle cx="60" cy="20" r="5" fill="%23FED7AA"/><path d="M36 48c0-14 10-24 24-24s24 10 24 24H36z" fill="%23C2410C"/><rect x="33" y="44" width="54" height="10" rx="5" fill="%239A3412"/><circle cx="60" cy="62" r="24" fill="%23FED7AA"/><circle cx="52" cy="60" r="3.5" fill="%231E293B"/><circle cx="68" cy="60" r="3.5" fill="%231E293B"/><circle cx="53" cy="58.5" r="1.2" fill="%23FFFFFF"/><circle cx="69" cy="58.5" r="1.2" fill="%23FFFFFF"/><path d="M54 71c2 3 10 3 12 0" stroke="%239A3412" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%23EA580C"/></svg>`
  },
  {
    id: 'cartoon-scarf-elegant',
    nameFa: 'کارشناس با روسری زمردی زیبا',
    nameEn: 'Elegant Emerald Scarf',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%2314B8A6"/><circle cx="60" cy="56" r="26" fill="%230F766E"/><ellipse cx="60" cy="58" rx="19" ry="22" fill="%23FFEDD5"/><circle cx="52" cy="56" r="3.5" fill="%230F172A"/><circle cx="68" cy="56" r="3.5" fill="%230F172A"/><circle cx="53" cy="54.5" r="1.2" fill="%23FFFFFF"/><circle cx="69" cy="54.5" r="1.2" fill="%23FFFFFF"/><circle cx="45" cy="62" r="3" fill="%23F472B6" opacity="0.6"/><circle cx="75" cy="62" r="3" fill="%23F472B6" opacity="0.6"/><path d="M55 66c2 2 8 2 10 0" stroke="%23BE185D" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%23115E59"/><path d="M48 76c4 4 20 4 24 0l-4 16-8-2-8 2-4-16z" fill="%230F766E"/></svg>`
  },
  {
    id: 'cartoon-starry-dreamer',
    nameFa: 'رویاپرداز با زمینه ستاره‌ای',
    nameEn: 'Starry Dreamer',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%231E1B4B"/><circle cx="30" cy="30" r="1.5" fill="%23FDE047"/><circle cx="95" cy="25" r="2" fill="%23FDE047"/><circle cx="85" cy="85" r="1.5" fill="%23FDE047"/><circle cx="60" cy="58" r="26" fill="%23FFEDD5"/><path d="M34 50c0-14 11-24 26-24s26 10 26 24c-6-4-14-6-26 0-8-4-18-2-26 0z" fill="%234338CA"/><circle cx="51" cy="56" r="3.5" fill="%231E1B4B"/><circle cx="69" cy="56" r="3.5" fill="%231E1B4B"/><circle cx="52" cy="54.5" r="1.2" fill="%23FFFFFF"/><circle cx="70" cy="54.5" r="1.2" fill="%23FFFFFF"/><path d="M54 68c2 3 10 3 12 0" stroke="%23EA580C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%23312E81"/></svg>`
  },
  {
    id: 'cartoon-yellow-hoodie',
    nameFa: 'شخصیت شاد با هودی زرد',
    nameEn: 'Happy Yellow Hoodie',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="%23EAB308"/><circle cx="60" cy="56" r="26" fill="%23FED7AA"/><path d="M34 48c0-14 11-24 26-24s26 10 26 24l-8-4-10 2-8-2-16 4z" fill="%23713F12"/><circle cx="51" cy="54" r="3.5" fill="%231F2937"/><circle cx="69" cy="54" r="3.5" fill="%231F2937"/><circle cx="52" cy="52.5" r="1.2" fill="%23FFFFFF"/><circle cx="70" cy="52.5" r="1.2" fill="%23FFFFFF"/><path d="M52 65c3 4 13 4 16 0" stroke="%23C2410C" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M26 108c0-18.778 15.222-34 34-34s34 15.222 34 34" fill="%23CA8A04"/></svg>`
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
