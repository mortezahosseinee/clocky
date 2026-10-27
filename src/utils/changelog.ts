import { ChangelogItem } from "../types";

export const APP_CURRENT_VERSION = "v2.0.17";

export const CHANGELOG: ChangelogItem[] = [
  {
    version: "v2.0.17",
    releaseDate: "2026-10-27",
    releaseDateFa: "۱۴۰۵/۰۸/۰۵",
    titleFa:
      "بازنشانی خودکار زمان شروع ثبت کارکرد زنده به زمان جاری پس از پایان و شروع همواره از لحظه فشردن دکمه",
    titleEn:
      "Auto Reset Live Tracker Start Time to Current Clock on Stop & Always Start Fresh from Click Moment",
    changesFa: [
      "رفع مشکل حفظ شدن ساعت دستی تنظیم‌شده در دفعات بعدی و اطمینان از شروع تایمر از همان لحظه فشردن دکمه شروع",
      "همگام‌سازی مداوم و خودکار فیلد ساعت شروع با زمان واقعی سیستم در حالت آماده به کار (Idle)",
      "بازگشت خودکار بخش ویرایش ساعت و تاریخ شروع به حالت اولیه بلافاصله پس از ثبت و پایان کارکرد",
    ],
    changesEn: [
      "Fixed manual start time persisting on subsequent work tracking sessions, ensuring it always starts from the click moment",
      "Continuously synchronized start time display with the real-time system clock while idle",
      "Automatically reset start time and date edit fields to the initial live clock state immediately upon finishing",
    ],
  },
  {
    version: "v2.0.16",
    releaseDate: "2026-10-25",
    releaseDateFa: "۱۴۰۵/۰۸/۰۳",
    titleFa:
      "امکان ویرایش زنده ساعت و تاریخ شروع در ثبت کارکرد، اعمال لایو روی زمان سپری‌شده و نمایش سراسری ارقام و تاریخ‌ها با فونت فارسی",
    titleEn:
      "Live Editable Start Date & Time in Work Tracker with Instant Recalculation & Universal Persian Numerals and Font Display",
    changesFa: [
      "افزودن امکان ویرایش مستقیم ساعت و تاریخ شروع در کارت «ثبت کارکرد زنده» و اعمال بلادرنگ تغییرات روی ثانیه‌شمار و زمان سپری‌شده",
      "امکان شروع کارکرد از زمان دلخواه یا تغییر ساعت شروع پس از استارت تایمر با حفظ و همگام‌سازی خودکار در سرور",
      "تبدیل تمامی اعداد، شمارنده‌ها، ردیف‌های جداول و تاریخ‌های باقیمانده به ارقام فارسی (در داشبورد اختصاصی، ردیف‌های گزارشات، کارکردها، لاگ‌ها، کاربران و گروه‌ها)",
      "اعمال سراسری ویژگی OpenType قلم وزیرمتن (ss01 و locl) برای نمایش یکپارچه اعداد به خط و قلم فارسی در تمامی بخش‌های سامانه",
    ],
    changesEn: [
      "Added inline editable inputs for start time and start date in Live Work Tracker with immediate elapsed timer recalculation",
      "Permitted retroactive timer adjustments and custom starting points with seamless cross-device synchronization",
      "Converted remaining English digits and dates across dashboard, tables, logs, backups, and user lists to Persian numerals",
      "Applied global OpenType font features (ss01 & locl) for clean Persian numeral rendering throughout the application",
    ],
  },
  {
    version: "v2.0.15",
    releaseDate: "2026-10-24",
    releaseDateFa: "۱۴۰۵/۰۸/۰۲",
    titleFa:
      "رفع قطعی پرش و ریست شدن ثبت کارکرد زنده در داشبورد اختصاصی و حفظ مداوم زمان پس از رفرش",
    titleEn:
      "Fixed Live Work Tracker Reset Glitch in Dashboard & Preserved Timer State Across Page Reloads",
    changesFa: [
      "رفع کامل مشکل پرش تایمر کارکرد زنده (حالتی که چند لحظه محاسبه زمان را نشان داده و سپس صفر شده و به دکمه شروع بازمی‌گشت)",
      "یکسان‌سازی کلیدهای شناسایی زمان شروع تایمر (startTs و startTimestamp) میان فرانت‌اند، ذخیره‌ساز مرورگر و سرور و جلوگیری از حذف تایمر فعال توسط همگام‌سازی‌های پس‌زمینه",
      "اصلاح منطق توقف تایمر به‌گونه‌ای که تایم‌استمپ‌های توقف‌های قبلی کاربر هرگز مانع اجرای تایمر تازه شروع‌شده نشوند",
      "حفظ و ادامه دقیق شمارش زمان ثبت کارکرد زنده در هنگام رفرش صفحه یا جابه‌جایی میان تب‌های سامانه",
    ],
    changesEn: [
      "Fixed live work tracker resetting to zero after briefly showing elapsed time upon page reload or tab switch",
      "Unified timer timestamp keys (startTs and startTimestamp) between client storage and server sync routines to prevent false cleanup",
      "Refined stop timestamp check so previous stop events never invalidate a freshly started live tracker session",
      "Guaranteed continuous live timer progress across page reloads and cross-component navigation",
    ],
  },
  {
    version: "v2.0.14",
    releaseDate: "2026-10-21",
    releaseDateFa: "۱۴۰۵/۰۷/۲۹",
    titleFa:
      "رفع کامل خطای ورود کاربران، جداسازی تنظیم مجدد رمز عبور از مودال ویرایش کاربر و همگام‌سازی مستقیم رمز در سرور",
    titleEn:
      "Fixed User Login Validation Across Devices, Separated Password Reset from User Edit Modal & Direct Server Password Sync",
    changesFa: [
      "رفع کامل مشکل خطای «نام کاربری یا رمز عبور اشتباه است» با افزودن اعتبارسنجی مستقیم سمت سرور (/api/login) و اصلاح اولویت همگام‌سازی رمز عبور از سرور",
      "حذف بخش تنظیم رمز عبور از داخل مودال ویرایش اطلاعات کاربر تا هنگام ویرایش مشخصات پرسنل، رمز عبور کاربر هرگز تغییر نکند یا ریست نشود",
      "قرارگیری دکمه مستقل «تنظیم رمز» دقیقاً در کنار دکمه «ویرایش» هر کاربر در جدول مدیریت کاربران به همراه نمایش و کپی رمز فعلی و صدور رمز جدید",
      "ذخیره و همگام‌سازی مبتنی بر زمان (Timestamp) برای اطلاعات کاربران در سرور جهت جلوگیری از بازنویسی رمزهای جدید توسط مرورگرهای دیگر",
    ],
    changesEn: [
      "Fixed invalid credentials login issue across all users by adding authoritative /api/login validation and fixing client-server password sync priority",
      "Removed password input section from the Edit User modal so editing user details strictly preserves the user’s existing password",
      "Placed a dedicated Reset Password button directly next to the Edit User button in the users table with current password display and instant reset",
      "Added timestamp-based user merging on the server so stale browser tabs never overwrite updated user passwords",
    ],
  },
  {
    version: "v2.0.13",
    releaseDate: "2026-10-21",
    releaseDateFa: "۱۴۰۵/۰۷/۲۹",
    titleFa:
      "رفع کامل بازگشت پروژه‌ها، تثبیت توقف ثبت زنده، دیالوگ ثبت سریع در داشبورد، ارتقای تم دارک و خروجی اکسل با فونت B Mitra",
    titleEn:
      "Permanent Project Sync & Deletion, Reliable Live Tracker Stop, Inline Quick-Add Modal in Dashboard, Dark Mode Overhaul & B Mitra RTL Excel Export",
    changesFa: [
      "رفع کامل مشکل بازگشت نام قبلی یا پروژه‌های حذف‌شده با همگام‌سازی مبتنی بر زمان (Timestamp) و ثبت دائمی شناسه‌های حذف‌شده در سرور",
      "توقف قطعی و فوری تایمر ثبت کارکرد زنده هنگام کلیک بر روی پایان و جلوگیری از بازگشت تایمر در همگام‌سازی‌های همزمان",
      "باز شدن مستقیم دیالوگ ثبت کارکرد (عادی، مرخصی، ماموریت، خاص) در همان صفحه داشبورد اختصاصی و نمایش کامل تمامی رکوردها بدون محدودیت ۱۵ تایی",
      "همگام‌سازی هوشمند تاریخ پایان با تاریخ شروع هنگام ثبت رکورد مگر در صورت تغییر دستی تاریخ پایان توسط کاربر",
      "رفع مشکل عدم ذخیره ویرایش سطرهای کارکرد مرخصی و اصلاح جابجایی ستون‌های تاریخ و ساعت در جداول و بارگذاری اکسل",
      "بازطراحی جامع تم دارک برای کنتراست عالی دکمه‌ها و کارت‌ها، جایگزینی ایموجی‌های آواتار با ایموجی‌های استاندارد جذاب، و اعمال فونت B Mitra و جهت راست‌به‌چپ واقعی در خروجی اکسل",
    ],
    changesEn: [
      "Fixed deleted or renamed projects reverting by enforcing server-side timestamp merging and persistent deleted ID broadcasting",
      "Fixed live work tracker continuing after stop by recording stopped timer timestamps across sync endpoints",
      "Opened inline record creation modals directly inside Personal Dashboard Quick Actions and displayed all user records without truncation",
      "Auto-synced End Date with Start Date during record creation unless manually overridden by the user",
      "Fixed leave record editing persistence, column alignment for dates/times, Dark Mode styling, standard emoji avatars, and B Mitra RTL Excel exports",
    ],
  },
  {
    version: "v2.0.9",
    releaseDate: "2026-10-20",
    releaseDateFa: "۱۴۰۵/۰۷/۲۸",
    titleFa:
      "بارگذاری فایل اکسل کارکرد در داشبورد، استقلال ثبت زنده از تایم‌زون، حذف قطعی تیم‌ها و رفرش اختیاری نسخه جدید",
    titleEn:
      "Excel Work Log Importer in Dashboard, Timezone-Agnostic Live Tracking, Permanent Group Deletion & Explicit Version Reload",
    changesFa: [
      "امکان بارگذاری مستقیم فایل‌های اکسل و CSV کارکرد در داشبورد با نگاشت خودکار مرخصی‌ها (Leave/ILeave/Sleave)، قطعی برق (NoPower) و ماموریت (Exhibition)",
      "نمایش لیست سطرها با قابلیت انتخاب ردیف‌ها و ایجاد خودکار پروژه‌های ناشناخته در «گروه عمومی»",
      "محاسبه ساعت پایان کارکرد زنده صرفاً بر اساس فاصله از ساعت شروع اولیه و مستقل از تایم‌زون دستگاه پایان‌دهنده",
      "حذف قطعی و دائمی تیم‌ها و گروه‌ها در پایگاه داده بدون بازگشت پس از رفرش صفحه",
      "توقف هرگونه رفرش خودکار اپلیکیشن هنگام انتشار نسخه جدید تا زمان کلیک عمدی کاربر بر روی دکمه اعلان",
    ],
    changesEn: [
      "Added Excel/CSV batch work log importer in dashboard with automated leave, power outage, and mission mapping plus auto-creating new projects in General Group",
      "Timezone-independent live tracking end-time calculation based on elapsed duration from start time",
      "Permanent team/group deletion via REST endpoint preventing resurrection on reload",
      "Strictly explicit new version reload only upon user clicking the update button",
    ],
  },
  {
    version: "v2.0.8",
    releaseDate: "2026-10-20",
    releaseDateFa: "۱۴۰۵/۰۷/۲۸",
    titleFa:
      "ثبت کارکرد زنده در داشبورد اختصاصی، حذف قطعی رکوردهای کارکرد بدون بازگشت، و حفظ صفحه جاری پس از رفرش",
    titleEn:
      "Live Work Tracker in Dedicated Dashboard, Permanent Record Deletion via REST API, and Tab State Persistence on Reload",
    changesFa: [
      "قرارگیری کارت «ثبت کارکرد زنده» در داشبورد اختصاصی با ارقام فارسی، فونت B Mitra و محاسبه هوشمند زمان",
      "حذف قطعی و دائمی سطرهای کارکرد بدون بازگشت پس از رفرش از طریق اندپوینت REST DELETE و ردیابی شناسه در دیتابیس",
      "ماندگاری کامل صفحه و تب فعال پس از رفرش (F5) و بازگشت به همان صفحه بدون ارجاع ناخواسته به داشبورد",
    ],
    changesEn: [
      "Added Live Work Tracker card directly into the dedicated dashboard with live timer and B Mitra typography",
      "Permanent record deletion via dedicated DELETE REST endpoint and deleted ID tracking to prevent resurrections on reload",
      "Preserved active page/tab upon page refresh through URL hash and local storage persistence",
    ],
  },
  {
    version: "v2.0.7",
    releaseDate: "2026-10-20",
    releaseDateFa: "۱۴۰۵/۰۷/۲۸",
    titleFa:
      "پیام‌رسان سازمانی داخلی، مدیریت نشست‌ها برای مدیر، ذخیره‌سازی ابری آواتار و هوشمندسازی اعلان نسخه جدید",
    titleEn:
      "Internal Corporate Messenger, Admin Session Management, Cloud Avatar Persistence & Smart Version Notification Banner",
    changesFa: [
      "افزودن ماژول پیام‌رسان داخلی به منوی تمام پرسنل با امکان گفتگوی دونفره، کانال عمومی، ارسال پیوست، اموجی و وضعیت تحویل/خوانده‌شده",
      "مدیریت نشست‌های سراسری کاربران در منوی مدیر با نمایش نام کاربری، آی‌پی، دستگاه و امکان قطع نشست‌های مشکوک",
      "محدود شدن نشست‌ها در بخش اطلاعات کاربری به نشست‌های شخصی خود کاربر (مشابه کاربران عادی)",
      "ذخیره‌سازی و پایداری بلادرنگ تصاویر و رنگ‌های آواتار در سمت سرور و پایگاه داده",
      "سیستم هوشمند اعلان نسخه جدید با قابلیت محافظت از فرم‌ها و مودال‌های باز کاربر تا زمان ذخیره و بسته‌شدن",
    ],
    changesEn: [
      "Added full-featured internal corporate messenger for all users with direct chat, public channel, file sharing, and read receipts",
      "Dedicated Session Management tab in Admin sidebar showing usernames, IPs, devices and terminate controls",
      "Restricted Account Information sessions strictly to current user across all roles",
      "Guaranteed real-time server persistence and syncing for custom avatars and color badges",
      "Smart new version notification protecting active open forms and modals from accidental refreshes",
    ],
  },
  {
    version: "v2.0.6",
    releaseDate: "2026-10-18",
    releaseDateFa: "۱۴۰۵/۰۷/۲۶",
    titleFa:
      "پوسته تیره و روشن (Dark / Light Mode) در تنظیمات، فونت اختصاصی بی میترا برای کلیه ساعت‌ها، و رفع قطعی پرش فوکوس در فرم‌ها",
    titleEn:
      "Dark & Light Theme Mode in Settings, Universal Persian B Mitra Typography for All Time Displays, and Elimination of Focus-Jump in Form Inputs",
    changesFa: [
      "افزودن بخش اختصاصی تنظیمات در پایین منو برای کلیه کاربران با امکان تغییر بلادرنگ پوسته بین حالت روشن (Light Mode)، حالت تاریک (Dark Mode) و هماهنگ با سیستم (System Mode)",
      "اعمال دقیق و تضمین‌شده فونت فارسی B Mitra (بی میترا) و ارقام فارسی برای کلیه ساعت‌ها در سراسر نرم‌افزار، به ویژه ساعت شروع و ساعت پایان و ساعت دیجیتال نوبار",
      "رفع کامل و قطعی باگ پرش ناخواسته فوکوس به خانه اول فرم هنگام تایپ در فیلدهای متنی و توضیحات مودال‌ها",
      "حذف کامل کلیه واژه‌ها و عبارات مربوط به «کرنومتر» و «ثبت زنده» و جایگزینی با عبارات استاندارد ثبت کارکرد",
    ],
    changesEn: [
      "Added dedicated Settings section at bottom of menu for all users allowing instant toggling between Light Mode, Dark Mode, and System Theme",
      "Enforced strict Persian B Mitra typography and Persian numerals across all time displays, especially start times, end times, and live navbar clock",
      "Permanently resolved input focus-jumping bug caused by focus trap re-render loops while typing in form fields",
      "Completely removed any stopwatch or live-tracking terminology across all cards and views",
    ],
  },
  {
    version: "v2.0.5",
    releaseDate: "2026-10-18",
    releaseDateFa: "۱۴۰۵/۰۷/۲۶",
    titleFa:
      "ثبت کارکرد زنده همگام در داشبورد و صفحه کارکردها، همگام‌سازی کامل نشست‌ها، سیستم اعلام نسخه جدید و رفع مشکل کلید Tab",
    titleEn:
      "Synchronized Live Work Tracker in Dashboard & Records, Multi-Device Session Sync, Smart New Version Banner & Tab Key Navigation",
    changesFa: [
      "نمایش بخش «ثبت کارکرد» زنده در هر دو بخش داشبورد و صفحه کارکردها با همگام‌سازی بلادرنگ و حفظ کامل وضعیت تایمر",
      "سیستم هوشمند اعلان نسخه جدید در بالای صفحه با امکان به‌روزرسانی دستی و رفرش خودکار هنگام خروج از صفحه جاری یا ورود جدید بدون قطع فرم فعال",
      "رفع کامل مشکل جابه‌جایی با کلید تب (Tab) بین کلیه فیلدهای ورودی، انتخابگرهای زمان و تقویم شمسی در تمام پنجره‌های مودال",
      "حذف پروژه‌های پیش‌فرض و استاتیک و بارگذاری ۱۰۰٪ پویا و مستقیم پروژه‌ها از پایگاه داده PostgreSQL و سرور",
      "ادغام دقیق نشست‌های چنددستگاهی در سرور جهت مشاهده کلیه نشست‌های فعال کاربر روی لپ‌تاپ و موبایل با تفکیک نشست فعلی",
      "اعمال فونت فارسی B Mitra و ارقام فارسی برای ساعت‌ها، ارقام تایمر دیجیتال و تقویم تاریخ",
    ],
    changesEn: [
      "Shared and synchronized live work tracker card across Dashboard and Work Records views maintaining active stopwatch state",
      "Smart top-of-screen new version notification banner with manual reload and auto-reload on tab transition/new login without disrupting active forms",
      "Complete keyboard Tab key accessibility and focus styling across all inputs, time pickers, and Jalali datepickers in modal dialogs",
      "Eliminated static initial default projects and enforced 100% dynamic loading from PostgreSQL database and server sync",
      "Accurate multi-device user session merging on server ensuring users see all their active phone/laptop sessions with current device distinction",
      "Applied Persian B Mitra typography and Persian numerals across clocks, digital stopwatch, and calendar elements",
    ],
  },
  {
    version: "v2.0.4",
    releaseDate: "2026-10-07",
    releaseDateFa: "۱۴۰۵/۰۷/۱۶",
    titleFa:
      "اتصال واقعی به پایگاه داده PostgreSQL و همگام‌سازی دائمی سرور با ماندگاری کامل داده‌ها بعد از Git Pull و Rebuild داکر",
    titleEn:
      "Real PostgreSQL Database Persistence & Multi-Device Server Synchronization Across Git Pulls and Docker Rebuilds",
    changesFa: [
      "برقراری اتصال واقعی بک‌اند به PostgreSQL 16 و ذخیره‌سازی جداول کاربران، گروه‌ها، پروژه‌ها و کارکردها در دیتابیس سرور",
      "ذخیره دائمی و دوطرفه اطلاعات در مسیر clocky-data/app/ جهت تضمین حفظ ۱۰۰٪ داده‌ها پس از هر بار git pull، راه‌اندازی مجدد داکر یا پاک شدن کش",
      "همگام‌سازی آنی تمام مرورگرها و دستگاه‌ها (موبایل و کامپیوتر) از طریق سرویس api/sync/ در بدو لود و هنگام ارسال فرم‌ها",
      "تلاش خودکار برای دریافت آخرین فهرست کاربران از سرور پیش از رد لاگین جهت اطمینان از امکان ورود فوری پرسنل جدید",
      "نمایش پیش‌فرض و آشکار رمز عبور هنگام تعریف کاربر جدید، ثبت هوشمند نام کاربری از پیشوند ایمیل و راهنمای شفاف رمزهای پیش‌فرض",
    ],
    changesEn: [
      "Established real PostgreSQL 16 backend integration persisting users, groups, projects, and work records in attendance_db",
      "Dual-persistent server storage to clocky-data/app/ ensuring 100% data retention across git pulls, container rebuilds, and cache purges",
      "Real-time multi-device and multi-browser synchronization via /api/sync on mount and user mutations",
      "Automatic server sync before rejecting login attempts to guarantee instant login for newly provisioned accounts",
      "Default visible password display during user creation, smart email prefix fallback for usernames, and explicit default password notices",
    ],
  },
  {
    version: "v2.0.3",
    releaseDate: "2026-10-07",
    releaseDateFa: "۱۴۰۵/۰۷/۱۶",
    titleFa:
      "حل قطعی مشکل لاگین کاربران جدید و رفع کار نکردن دکمه کپی اطلاعات ورود در محیط‌های HTTP و مدال ویرایش",
    titleEn:
      "Fix Login for Newly Created Users & Resolve Clipboard Copy Failure in HTTP & Edit Modal",
    changesFa: [
      "پیاده‌سازی مکانیزم کپی همه‌منظوره (copyToClipboard) با پشتیبانی کامل از پروتکل HTTP، دامنه‌ها و IPهای بدون SSL و آی‌فریم‌ها",
      "رفع خطای کار نکردن دکمه کپی اطلاعات ورود هنگام ویرایش کاربر و نمایش آنی تاییدیه سبز درون همان پنجره مدال",
      "افزودن دکمه‌های مجزا برای کپی نام کاربری، کپی فقط رمز عبور و کپی کل متن ورود در فرم‌های تعریف و ویرایش کاربر",
      "ارتقای متد validateUser برای پشتیبانی از پیشوند ایمیل، حروف عربی/فارسی (ی/ي و ک/ك)، کاراکترهای مخفی و پیش‌شماره‌های موبایل",
      "افزودن بنر دسترسی سریع به مشخصات ورود بلافاصله پس از ثبت یا ویرایش کاربر برای جلوگیری از فراموشی یا عدم دسترسی به رمز",
    ],
    changesEn: [
      "Implemented universal copyToClipboard fallback supporting insecure HTTP contexts, raw IP access, and iframes",
      "Fixed non-responsive copy credentials button in user edit modal and added immediate in-modal feedback",
      "Added separate quick-copy buttons for username, password only, and full login details in user forms",
      "Enhanced validateUser with email prefix, Arabic/Persian letter unification, zero-width space stripping, and phone format normalization",
      "Introduced post-save credentials alert banner offering immediate 1-click copy after user creation or update",
    ],
  },
  {
    version: "v2.0.2",
    releaseDate: "2026-10-06",
    releaseDateFa: "۱۴۰۵/۰۷/۱۵",
    titleFa:
      "رفع خطای ناشناخته بودن فلگ‌ها در اسکریپت init_ssl.sh و پشتیبانی خودکار از docker compose و docker-compose",
    titleEn:
      "Fix unknown flag error in init_ssl.sh and add auto-detection for docker compose vs docker-compose",
    changesFa: [
      "تشخیص هوشمند نسخه Docker Compose (پشتیبانی همزمان از پلاگین docker compose v2 و پکیج مستقل docker-compose v1)",
      "تولید مستقیم گواهی موقت با openssl میزبان در صورت در دسترس بودن بدون ایجاد وابستگی به فلگ‌های داکر",
      "حذف و پاک‌سازی مطمئن فایل‌های گواهی موقت با دستور بومی بدون نیاز به اجرای کانتینر اضافه",
      "لود مجدد مستقیم Nginx با کانتینر attendance_nginx و ارائه پیام‌های راهنمای شفاف در صورت عدم نصب داکر کامپوز",
    ],
    changesEn: [
      "Smart detection for Docker Compose binary (supports both docker compose v2 and legacy docker-compose v1)",
      "Direct dummy certificate generation with host OpenSSL when available bypassing container overhead",
      "Native cleanup of dummy certificate files preventing docker flag mismatches",
      "Direct nginx reload targeting attendance_nginx container and clear installation instructions",
    ],
  },
  {
    version: "v2.0.1",
    releaseDate: "2026-10-05",
    releaseDateFa: "۱۴۰۵/۰۷/۱۴",
    titleFa:
      "حل قطعی مشکل ورود با رمز عبور موقت و تعویض رمز، پشتیبانی از ورود با ایمیل/شماره موبایل و تبدیل اعداد فارسی",
    titleEn:
      "Fix Temporary Password Login & Reset, Support Login via Email/Mobile & Persian Numerals Normalization",
    changesFa: [
      "اصلاح و ارتقای متد validateUser جهت اعتبارسنجی همزمان با نام کاربری، ایمیل سازمانی یا شماره همراه ثبت‌شده",
      "پشتیبانی خودکار از تبدیل اعداد فارسی و عربی (۰-۹) به انگلیسی در نام کاربری و رمزهای عبور",
      "حذف فاصله‌های خالی ناخواسته (Whitespace Trimming) از رمز عبور در کپی/پیست و ذخیره‌سازی",
      "افزودن مدال و دکمه مستقیم «تعیین و تعویض رمز عبور موقت» در جدول کاربران با امکان کپی مجزای رمز عبور یا کل متن ورود",
      "تضمین فعال بودن حساب کاربری پس از تعیین رمز موقت و اصلاح ثبت نام کاربری هنگام ویرایش مشخصات پرسنل",
    ],
    changesEn: [
      "Enhanced validateUser method to support authentication via username, registered email, or mobile number",
      "Added automatic conversion of Persian/Arabic numerals to standard digits in credentials",
      "Implemented whitespace trimming preventing copy-paste trailing space mismatches in passwords",
      "Introduced dedicated Quick Temporary Password Reset modal in User Management with one-click copy actions",
      "Ensured user active status upon temporary credential creation and fixed username preservation during edits",
    ],
  },
  {
    version: "v2.0.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "رفع قطعی خطای اعتبارسنجی ورود (validateUser)، حذف Hintها، شخصی‌سازی کامل عناوین و نام پیش‌فرض «نرم افزار ثبت تردد»",
    titleEn:
      "Fix Login Validation (validateUser), Remove All Hints, Full Customizable Titles & Default Software Title",
    changesFa: [
      "پیاده‌سازی متد validateUser و ارتقای متد چندریختی recordLoginAttempt در StorageService جهت رفع کامل خطای ورود",
      "حذف کامل کلیه Hintها و متن‌های راهنما (placeholder) از فیلدهای نام کاربری و رمز عبور در صفحه ورود",
      "عدم نمایش هرگونه لوگو یا آیکون تستی تا پیش از آپلود اختصاصی توسط مدیر",
      "نمایش عبارت «نرم افزار ثبت تردد» به جای نام سازمان تا پیش از تنظیم توسط مدیر در تمامی بخش‌ها و سربرگ‌ها",
      "افزودن پنل جامع شخصی‌سازی تمامی عناوین، زیرعناوین و نام بخش‌های سامانه در تنظیمات مدیر با قابلیت جستجو و بازنشانی",
    ],
    changesEn: [
      "Implemented validateUser and polymorphic recordLoginAttempt in StorageService eliminating login exception",
      "Removed all placeholder hints from username and password fields on login page",
      "Prevented any logo/icon rendering until explicitly uploaded by administrator in settings",
      'Set default fallback organization title to "Attendance Tracking Software" across all headers and login',
      "Introduced comprehensive title and subtitle customization panel in Admin Settings with search and reset",
    ],
  },
  {
    version: "v1.9.1",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa: "رفع خطای getOrgName در صفحه ورود و بارگذاری لوگو و نام سازمانی",
    titleEn:
      "Fix getOrgName runtime function error on login page and logo loader",
    changesFa: [
      "پیاده‌سازی متدهای getOrgName و getOrgLogo در StorageService جهت رفع کامل خطای تایپ‌اسکریپت و ران‌تایم صفحه ورود",
    ],
    changesEn: [
      "Implemented getOrgName and getOrgLogo helper methods in StorageService resolving login page runtime error",
    ],
  },
  {
    version: "v1.9.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "حذف کادر اکانت‌های تست از صفحه ورود و پاک‌سازی کاربران دمو به جز مدیر ارشد",
    titleEn:
      "Remove Demo Accounts Banner from Login Page & Purge Mock Users except Super Admin",
    changesFa: [
      "حذف کامل بخش «اکانت‌های پیش‌فرض تست» از صفحه اول و فرم لاگین سامانه",
      "پاک‌سازی کلیه اکانت‌های پیش‌فرض دمو (بازرس، مدیر اجرایی و کارمندان تست) و ابقای انحصاری مدیر ارشد (admin/admin با الزام تغییر رمز در اولین ورود)",
    ],
    changesEn: [
      "Removed default credentials and test accounts helper banner from the login screen",
      "Purged all default mock test accounts retaining solely the Super Admin account (admin/admin with mandatory first-login password change)",
    ],
  },
  {
    version: "v1.8.3",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "پشتیبانی از پورت‌های منعطف در داکر کامپوز جهت رفع تداخل پورت ۸۰ و ۴۴۳",
    titleEn:
      "Configurable host ports in docker-compose to prevent port 80/443 collisions",
    changesFa: [
      "قابلیت تغییر آسان پورت‌های وب سرویس از طریق متغیرهای محیطی HTTP_PORT و HTTPS_PORT (پیش‌فرض ۸۰ و ۴۴۳)",
      "افزودن پورت مستقیم اپلیکیشن (APP_PORT:3000) برای استفاده‌های مستقل بدون پروکسی در صورت وجود تداخل",
    ],
    changesEn: [
      "Configurable HTTP_PORT and HTTPS_PORT environment variables avoiding host port collisions",
      "Exposed direct app port option (APP_PORT:3000) for optional direct access",
    ],
  },
  {
    version: "v1.8.2",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "بسته‌بندی خوداتکا (Self-Contained) سرور و حذف نیاز به اینترنت حین docker build",
    titleEn:
      "Zero-Install Self-Contained Server Bundle for Instant Docker Builds without Network Dependencies",
    changesFa: [
      "بسته‌بندی کامل و مستقل سرور اکسپرس در یک فایل مستقل (server.cjs) به همراه کلیه کتابخانه‌ها با esbuild",
      "حذف کامل دستورات npm install و دانلودهای اینترنتی در زمان docker compose up",
      "رفع قطعی خطای تایم‌اوت شبکه اینترنت سرور (EIDLETIMEOUT registry.npmjs.org) و بیلد بلادرنگ زیر ۱ ثانیه",
    ],
    changesEn: [
      "Bundled entire Express server and dependencies into a self-contained server.cjs via esbuild",
      "Completely removed npm install and external network downloads during docker compose up build phase",
      "Eliminated EIDLETIMEOUT registry.npmjs.org network failures with instant sub-second image builds",
    ],
  },
  {
    version: "v1.8.1",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "رفع خطای بیلد داکر در نصب پکیج‌ها و حذف تگ منسوخ‌شده version از docker-compose",
    titleEn:
      "Fix Docker build npm ci error and remove obsolete compose version attribute",
    changesFa: [
      "اصلاح لایه نصب داکر از npm ci به npm install --omit=dev --legacy-peer-deps جهت رفع خطای EUSAGE نبودن package-lock.json",
      "حذف ویژگی منسوخ‌شده version از ابتدای فایل docker-compose.yml جهت جلوگیری از هشدارهای مدرن داکر کامپوز",
    ],
    changesEn: [
      "Fixed Docker build layer from npm ci to npm install --omit=dev --legacy-peer-deps avoiding EUSAGE lockfile error",
      "Removed obsolete top-level version attribute from docker-compose.yml eliminating Docker compose warning",
    ],
  },
  {
    version: "v1.8.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "فیلترهای زمانی و پروژه‌ای در داشبورد اختصاصی و اسکریپت پارامتریک init_ssl.sh با نام دامنه",
    titleEn:
      "Dashboard Period & Project Filters for All Users and Parameterized init_ssl.sh Script",
    changesFa: [
      "افزودن فیلترهای بازه زمانی (از تاریخ / تا تاریخ)، کلیدهای سریع ماه جاری، ماه گذشته و همه زمان‌ها در داشبورد برای تمام کاربران",
      "افزودن امکان فیلتر بر اساس پروژه اختصاصی در داشبورد و به‌روزرسانی آنی شاخص‌های KPI و نمودارهای تحلیلی",
      "افزودن قابلیت مرتب‌سازی ستونی روی تاریخ، نوع، پروژه و مدت کارکرد در جدول داشبورد",
      "اصلاح خروجی‌های PDF و Excel داشبورد بر مبنای فیلترهای اعمال‌شده زمانی و پروژه‌ای",
      "ایجاد اسکریپت اجرایی خودکار init_ssl.sh با دریافت نام دامنه به عنوان آرگومان ورودی، هماهنگ‌سازی خودکار nginx.conf، ایجاد گواهی موقت و اخذ گواهی رسمی از Let's Encrypt",
    ],
    changesEn: [
      "Added comprehensive date range filters (from/to), quick period selectors (this month, last month, all time) to Dashboard for all users",
      "Added project-level filtering on Dashboard with live KPI card and distribution chart re-calculations",
      "Enabled multi-column sorting on Date, Type, Project, and Duration in the Dashboard table",
      "Aligned Dashboard PDF & Excel exports to strictly reflect active period and project filters",
      "Created parameterized init_ssl.sh script accepting domain name argument, auto-updating Nginx config, handling ACME validation and Let's Encrypt provisioning",
    ],
  },
  {
    version: "v1.7.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa: "انتقال محل مونت داده‌های داکر به دایرکتوری خارجی clocky-data",
    titleEn:
      "Relocate Docker data volume mounts to external clocky-data directory",
    changesFa: [
      "اصلاح فایل docker-compose.yml جهت مونت داده‌های پایگاه داده PostgreSQL در مسیر clocky-data/postgres/..",
      "اصلاح مسیر داده‌های کش و سشن‌های Redis در مسیر clocky-data/redis/..",
      "انتقال کانفیگ و لاگ‌های Nginx به مسیر clocky-data/nginx/..",
      "انتقال گواهی‌ها و فایل‌های اعتبارسنجی Certbot Let's Encrypt به مسیر clocky-data/certbot/.. خارج از پروژه",
      "به‌روزرسانی اسکریپت راه‌اندازی SSL اتوماتیک (init-letsencrypt.sh) متناسب با مسیر جدید clocky-data",
    ],
    changesEn: [
      "Updated docker-compose.yml to mount PostgreSQL data to ../clocky-data/postgres",
      "Updated Redis cache & sessions data mount to ../clocky-data/redis",
      "Relocated Nginx configuration and logs to ../clocky-data/nginx",
      "Relocated Certbot SSL certificates and ACME challenges to ../clocky-data/certbot outside the app root",
      "Updated automated SSL setup script (init-letsencrypt.sh) to reflect the new clocky-data path",
    ],
  },
  {
    version: "v1.6.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "بهینه‌سازی گزارش‌گیری، تفکیک تاریخ و ساعت شروع/پایان، قابلیت چشم در رمزها، چیدمان ساعت و مدیریت سشن در پروفایل",
    titleEn:
      "Report Criteria Optimization, Start/End Date-Time Split, Password Eye Toggles, Strict LTR Time and Profile Sessions",
    changesFa: [
      "افزودن دکمه نمایش/مخفی‌سازی (آیکون چشم) به تمامی فیلدهای ورود و تعریف رمز عبور در سراسر سامانه",
      "حذف فیلتر ساعت شروع و پایان از بخش گزارش‌گیری و متمرکزسازی بر بازه تاریخی و انتخاب پرسنل",
      "افزودن ستون‌های مستقل «تاریخ شروع»، «ساعت شروع»، «تاریخ پایان» و «ساعت پایان» در جدول و خروجی‌های PDF و اکسل گزارشات",
      "تضمین استفاده انحصاری از فونت بی میترا (B Mitra) در تمامی متون و سربرگ‌های گزارشات چاپی و PDF",
      "حذف مدیر ارشد سامانه از لیست‌های کارکرد، تخصیص گروه‌ها و گزارش‌گیری پرسنل ضمن حفظ دسترسی همه‌جانبه",
      "ادغام کامل بخش سشن‌ها در پروفایل کاربری با جزئیات ورودهای موفق/ناموفق و امکان خروج از سایر نشست‌ها به جز نشست جاری",
      "اصلاح چیدمان فیلد ساعت در زبان فارسی؛ قرارگیری دائمی ساعت در سمت چپ و دقیقه در سمت راست (HH:mm) با جهت LTR",
      "افزودن امکان مرتب‌سازی (Sort) و فیلتر ستونی بر روی کلیه ستون‌های تمامی جداول سامانه",
      "پشتیبانی از نام‌گذاری دوزبانه (فارسی و انگلیسی) انواع مرخصی و کارکرد خاص در تنظیمات با سوئیچ خودکار بر اساس زبان سامانه",
    ],
    changesEn: [
      "Added toggle eye icon (show/hide password) to all password input fields across the application",
      "Removed start and end time inputs from reports criteria, keeping date range filtering streamlined",
      "Added dedicated columns for Start Date, Start Time, End Date, and End Time in both table view and PDF/Excel exports",
      "Guaranteed B Mitra typography across all sections, headers, and tables of PDF and print reports",
      "Excluded Super Admin from staff attendance lists and report checklists while maintaining full administrative privileges",
      "Integrated active sessions management directly into User Profile, with ability to terminate other sessions except current",
      "Fixed time display in Persian UI; Hour is strictly positioned on the left and Minute on the right in LTR order",
      "Added comprehensive multi-column sorting and filtering across all system tables",
      "Bilingual naming (Persian and optional English) for Leave and Special Work types in Settings with automatic fallback",
    ],
  },
  {
    version: "v1.5.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "شخصی‌سازی نام و لوگوی سازمان، بهینه‌سازی کامل موبایل و تبلت و استانداردسازی چاپ A4",
    titleEn:
      "Corporate Branding & Logo, Full Mobile/Tablet Responsiveness, and Strict A4 Layout",
    changesFa: [
      "امکان تعریف نام رسمی شرکت / سازمان و بارگذاری لوگوی سازمانی در بخش تنظیمات توسط مدیر",
      "نمایش لوگو و نام سازمانی در بالای سایدبار، هدر سامانه و سربرگ رسمی گزارشات PDF و پرینت",
      "بهینه‌سازی کامل جهت استفاده در گوشی‌ها و تبلت‌ها با سایدبار کشویی (Drawer) و کنترل‌های لمسی",
      "طراحی دقیق خروجی پرینت و PDF منطبق بر استاندارد کاغذ A4 افقی بدون سرریز جدول از لبه‌های صفحه",
      "بهبود استایل‌های جداول، پدینگ‌ها و المان‌های رابط کاربری در ابعاد مختلف صفحه نمایش",
    ],
    changesEn: [
      "Organization name configuration and corporate logo upload in Admin Settings",
      "Display organization logo and brand name across sidebar, headers, and official PDF printouts",
      "Comprehensive mobile and tablet responsiveness with touch-friendly drawer navigation",
      "Strict A4 landscape export layout preventing table boundary overflow",
      "Refined responsive table styling, paddings, and typography hierarchy",
    ],
  },
  {
    version: "v1.4.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "پشتیبان‌گیری خودکار، دوره‌ای و هوشمند بر اساس تغییرات، اعلان‌های سیستمی و مدیریت لاگ‌ها",
    titleEn:
      "Automated Event-Driven & Periodic Backups, System Alerts, and Audit Logs",
    changesFa: [
      "سیستم پشتیبان‌گیری خودکار هوشمند به ازای هر ۳ تغییر مهم در پایگاه داده یا بر اساس زمان‌بندی دوره‌ای",
      "امکان دانلود، بازگردانی (Restore) و حذف نسخه‌های پشتیبان با تفکیک نوع دستی یا خودکار",
      "افزودن مرکز اعلان‌ها در هدر با نشانگر تعداد اعلان‌های خوانده‌نشده",
      "ثبت جامع کلیه رخدادها، ورود و خروج‌ها، تغییرات پروژه‌ها و کارکردها در بخش گزارش رخدادها (Logs)",
    ],
    changesEn: [
      "Event-driven smart automated backup triggers after 3 significant mutations or periodic intervals",
      "Complete backup management with download, restore, and deletion support for manual & automatic backups",
      "Interactive Notification Center in navbar with real-time unread badge indicators",
      "Comprehensive system audit logging for authentication, project edits, and attendance activities",
    ],
  },
  {
    version: "v1.3.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "سیستم ثبت‌نام عمومی پرسنل، گردش‌کار تایید توسط مدیر و مدیریت گروه‌های سازمانی",
    titleEn:
      "Public Employee Registration, Approval Workflow, and Organization Groups",
    changesFa: [
      "فرم درخواست ثبت‌نام حساب کاربری جدید برای کارمندان به همراه تعیین مشخصات و گروه‌های سازمانی مورد تقاضا",
      "بخش مدیریت درخواست‌های ثبت‌نام برای مدیر با قابلیت تایید یا رد درخواست به همراه ثبت علت",
      "تخصیص اتوماتیک نام کاربری و رمز عبور تصادفی استاندارد هنگام تایید و الزام تغییر رمز در اولین ورود",
      "مدیریت گروه‌های سازمانی (دپارتمان‌ها/شعب) و تخصیص کاربران و پروژه‌ها به گروه‌ها",
    ],
    changesEn: [
      "Public employee registration form with target department/group selections",
      "Admin approval workflow for incoming registration requests with rejection reasons",
      "Automatic strong credential generation upon approval with mandatory first-login password change",
      "Organizational group management (departments/teams) linking users and projects",
    ],
  },
  {
    version: "v1.2.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "خروجی رسمی PDF و اکسل، گزارش‌گیری پیشرفته مدیر و سطوح دسترسی ۴ گانه",
    titleEn:
      "Official PDF/Excel Export, Advanced Management Reports, and 4-Tier RBAC",
    changesFa: [
      "ماژول خروجی استاندارد PDF با رعایت کامل راست‌چین، سربرگ سازمانی و فونت بی میترا",
      "ماژول خروجی فایل اکسل (.xlsx) با فرمت‌بندی رسمی و مرتب‌سازی داده‌ها",
      "بخش جامع گزارش‌گیری مدیر با قابلیت فیلتر چندگانه پرسنل، بازه تاریخی، پروژه‌ها و انواع کارکرد",
      "پیاده‌سازی سطوح دسترسی شامل مدیر ارشد، بازرس، مدیر اجرایی و کارمند",
    ],
    changesEn: [
      "Standard PDF print & export module with full RTL layout, company headers, and B Mitra font",
      "Official formatted Excel (.xlsx) export with automatic column alignment",
      "Advanced management reporting view with multi-user selection, date filters, and project breakdown",
      "Role-based access control with Admin, Inspector, Executive, and Employee tiers",
    ],
  },
  {
    version: "v1.1.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa:
      "مدیریت تردد، ماموریت، مرخصی و کارکردهای خاص به همراه داشبورد تحلیلی",
    titleEn:
      "Attendance, Missions, Leaves, Special Work Records & Analytic Dashboard",
    changesFa: [
      "ثبت کارکرد عادی با تخصیص پروژه و محاسبه ساعات کاری",
      "بخش مجزای ثبت ماموریت با تعیین مقصد و ماموریت کاری",
      "بخش ثبت انواع مرخصی (عادی، استعلاجی، تشویقی، مناسبتی)",
      "بخش کارکردهای خاص نظیر قطعی برق، تعطیلی اضطراری و غیره",
      "داشبورد تحلیلی با نمودارهای آماری تردد، ساعت کاری هفتگی و وضعیت مرخصی‌ها",
    ],
    changesEn: [
      "Regular work attendance logging with project allocation and duration calculations",
      "Dedicated business mission logging with destination and purpose",
      "Comprehensive leave management (annual, sick, reward, special)",
      "Special condition work logging such as power outages or emergency shutdowns",
      "Analytic dashboard featuring visual charts, weekly work summaries, and leave quotas",
    ],
  },
  {
    version: "v1.0.0",
    releaseDate: "2026-10-04",
    releaseDateFa: "۱۴۰۵/۰۷/۱۳",
    titleFa: "انتشار نسخه اولیه سامانه مدیریت تردد و کارکرد کارکنان",
    titleEn: "Initial Release of Employee Attendance and Timesheet System",
    changesFa: [
      "پشتیبانی کامل از زبان‌های فارسی (پیش‌فرض، راست‌چین) و انگلیسی (چپ‌چین)",
      "تایپوگرافی اختصاصی با فونت‌های B Mitra، B Nazanin و Times New Roman",
      "حساب کاربری پیش‌فرض مدیر (admin/admin) با الزام تغییر رمز در ورود اول",
      "معماری آماده داکر (Docker Compose، PostgreSQL، Redis، Nginx و Certbot)",
    ],
    changesEn: [
      "Bilingual Persian (Default, RTL) and English (LTR) interface support",
      "Typography enforcement with B Mitra, B Nazanin, and Times New Roman fonts",
      "Default admin account with forced password change on initial login",
      "Containerized architecture ready with Docker Compose, PostgreSQL, Redis, Nginx & Certbot",
    ],
  },
];
