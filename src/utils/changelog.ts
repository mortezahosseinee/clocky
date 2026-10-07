import { ChangelogItem } from '../types';

export const APP_CURRENT_VERSION = 'v2.0.3';

export const CHANGELOG: ChangelogItem[] = [
  {
    version: 'v2.0.3',
    releaseDate: '2026-10-07',
    releaseDateFa: '۱۴۰۵/۰۷/۱۶',
    titleFa: 'حل قطعی مشکل لاگین کاربران جدید و رفع کار نکردن دکمه کپی اطلاعات ورود در محیط‌های HTTP و مدال ویرایش',
    titleEn: 'Fix Login for Newly Created Users & Resolve Clipboard Copy Failure in HTTP & Edit Modal',
    changesFa: [
      'پیاده‌سازی مکانیزم کپی همه‌منظوره (copyToClipboard) با پشتیبانی کامل از پروتکل HTTP، دامنه‌ها و IPهای بدون SSL و آی‌فریم‌ها',
      'رفع خطای کار نکردن دکمه کپی اطلاعات ورود هنگام ویرایش کاربر و نمایش آنی تاییدیه سبز درون همان پنجره مدال',
      'افزودن دکمه‌های مجزا برای کپی نام کاربری، کپی فقط رمز عبور و کپی کل متن ورود در فرم‌های تعریف و ویرایش کاربر',
      'ارتقای متد validateUser برای پشتیبانی از پیشوند ایمیل، حروف عربی/فارسی (ی/ي و ک/ك)، کاراکترهای مخفی و پیش‌شماره‌های موبایل',
      'افزودن بنر دسترسی سریع به مشخصات ورود بلافاصله پس از ثبت یا ویرایش کاربر برای جلوگیری از فراموشی یا عدم دسترسی به رمز'
    ],
    changesEn: [
      'Implemented universal copyToClipboard fallback supporting insecure HTTP contexts, raw IP access, and iframes',
      'Fixed non-responsive copy credentials button in user edit modal and added immediate in-modal feedback',
      'Added separate quick-copy buttons for username, password only, and full login details in user forms',
      'Enhanced validateUser with email prefix, Arabic/Persian letter unification, zero-width space stripping, and phone format normalization',
      'Introduced post-save credentials alert banner offering immediate 1-click copy after user creation or update'
    ]
  },
  {
    version: 'v2.0.2',
    releaseDate: '2026-10-06',
    releaseDateFa: '۱۴۰۵/۰۷/۱۵',
    titleFa: 'رفع خطای ناشناخته بودن فلگ‌ها در اسکریپت init_ssl.sh و پشتیبانی خودکار از docker compose و docker-compose',
    titleEn: 'Fix unknown flag error in init_ssl.sh and add auto-detection for docker compose vs docker-compose',
    changesFa: [
      'تشخیص هوشمند نسخه Docker Compose (پشتیبانی همزمان از پلاگین docker compose v2 و پکیج مستقل docker-compose v1)',
      'تولید مستقیم گواهی موقت با openssl میزبان در صورت در دسترس بودن بدون ایجاد وابستگی به فلگ‌های داکر',
      'حذف و پاک‌سازی مطمئن فایل‌های گواهی موقت با دستور بومی بدون نیاز به اجرای کانتینر اضافه',
      'لود مجدد مستقیم Nginx با کانتینر attendance_nginx و ارائه پیام‌های راهنمای شفاف در صورت عدم نصب داکر کامپوز'
    ],
    changesEn: [
      'Smart detection for Docker Compose binary (supports both docker compose v2 and legacy docker-compose v1)',
      'Direct dummy certificate generation with host OpenSSL when available bypassing container overhead',
      'Native cleanup of dummy certificate files preventing docker flag mismatches',
      'Direct nginx reload targeting attendance_nginx container and clear installation instructions'
    ]
  },
  {
    version: 'v2.0.1',
    releaseDate: '2026-10-05',
    releaseDateFa: '۱۴۰۵/۰۷/۱۴',
    titleFa: 'حل قطعی مشکل ورود با رمز عبور موقت و تعویض رمز، پشتیبانی از ورود با ایمیل/شماره موبایل و تبدیل اعداد فارسی',
    titleEn: 'Fix Temporary Password Login & Reset, Support Login via Email/Mobile & Persian Numerals Normalization',
    changesFa: [
      'اصلاح و ارتقای متد validateUser جهت اعتبارسنجی همزمان با نام کاربری، ایمیل سازمانی یا شماره همراه ثبت‌شده',
      'پشتیبانی خودکار از تبدیل اعداد فارسی و عربی (۰-۹) به انگلیسی در نام کاربری و رمزهای عبور',
      'حذف فاصله‌های خالی ناخواسته (Whitespace Trimming) از رمز عبور در کپی/پیست و ذخیره‌سازی',
      'افزودن مدال و دکمه مستقیم «تعیین و تعویض رمز عبور موقت» در جدول کاربران با امکان کپی مجزای رمز عبور یا کل متن ورود',
      'تضمین فعال بودن حساب کاربری پس از تعیین رمز موقت و اصلاح ثبت نام کاربری هنگام ویرایش مشخصات پرسنل'
    ],
    changesEn: [
      'Enhanced validateUser method to support authentication via username, registered email, or mobile number',
      'Added automatic conversion of Persian/Arabic numerals to standard digits in credentials',
      'Implemented whitespace trimming preventing copy-paste trailing space mismatches in passwords',
      'Introduced dedicated Quick Temporary Password Reset modal in User Management with one-click copy actions',
      'Ensured user active status upon temporary credential creation and fixed username preservation during edits'
    ]
  },
  {
    version: 'v2.0.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'رفع قطعی خطای اعتبارسنجی ورود (validateUser)، حذف Hintها، شخصی‌سازی کامل عناوین و نام پیش‌فرض «نرم افزار ثبت تردد»',
    titleEn: 'Fix Login Validation (validateUser), Remove All Hints, Full Customizable Titles & Default Software Title',
    changesFa: [
      'پیاده‌سازی متد validateUser و ارتقای متد چندریختی recordLoginAttempt در StorageService جهت رفع کامل خطای ورود',
      'حذف کامل کلیه Hintها و متن‌های راهنما (placeholder) از فیلدهای نام کاربری و رمز عبور در صفحه ورود',
      'عدم نمایش هرگونه لوگو یا آیکون تستی تا پیش از آپلود اختصاصی توسط مدیر',
      'نمایش عبارت «نرم افزار ثبت تردد» به جای نام سازمان تا پیش از تنظیم توسط مدیر در تمامی بخش‌ها و سربرگ‌ها',
      'افزودن پنل جامع شخصی‌سازی تمامی عناوین، زیرعناوین و نام بخش‌های سامانه در تنظیمات مدیر با قابلیت جستجو و بازنشانی'
    ],
    changesEn: [
      'Implemented validateUser and polymorphic recordLoginAttempt in StorageService eliminating login exception',
      'Removed all placeholder hints from username and password fields on login page',
      'Prevented any logo/icon rendering until explicitly uploaded by administrator in settings',
      'Set default fallback organization title to "Attendance Tracking Software" across all headers and login',
      'Introduced comprehensive title and subtitle customization panel in Admin Settings with search and reset'
    ]
  },
  {
    version: 'v1.9.1',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'رفع خطای getOrgName در صفحه ورود و بارگذاری لوگو و نام سازمانی',
    titleEn: 'Fix getOrgName runtime function error on login page and logo loader',
    changesFa: [
      'پیاده‌سازی متدهای getOrgName و getOrgLogo در StorageService جهت رفع کامل خطای تایپ‌اسکریپت و ران‌تایم صفحه ورود'
    ],
    changesEn: [
      'Implemented getOrgName and getOrgLogo helper methods in StorageService resolving login page runtime error'
    ]
  },
  {
    version: 'v1.9.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'حذف کادر اکانت‌های تست از صفحه ورود و پاک‌سازی کاربران دمو به جز مدیر ارشد',
    titleEn: 'Remove Demo Accounts Banner from Login Page & Purge Mock Users except Super Admin',
    changesFa: [
      'حذف کامل بخش «اکانت‌های پیش‌فرض تست» از صفحه اول و فرم لاگین سامانه',
      'پاک‌سازی کلیه اکانت‌های پیش‌فرض دمو (بازرس، مدیر اجرایی و کارمندان تست) و ابقای انحصاری مدیر ارشد (admin/admin با الزام تغییر رمز در اولین ورود)'
    ],
    changesEn: [
      'Removed default credentials and test accounts helper banner from the login screen',
      'Purged all default mock test accounts retaining solely the Super Admin account (admin/admin with mandatory first-login password change)'
    ]
  },
  {
    version: 'v1.8.3',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'پشتیبانی از پورت‌های منعطف در داکر کامپوز جهت رفع تداخل پورت ۸۰ و ۴۴۳',
    titleEn: 'Configurable host ports in docker-compose to prevent port 80/443 collisions',
    changesFa: [
      'قابلیت تغییر آسان پورت‌های وب سرویس از طریق متغیرهای محیطی HTTP_PORT و HTTPS_PORT (پیش‌فرض ۸۰ و ۴۴۳)',
      'افزودن پورت مستقیم اپلیکیشن (APP_PORT:3000) برای استفاده‌های مستقل بدون پروکسی در صورت وجود تداخل'
    ],
    changesEn: [
      'Configurable HTTP_PORT and HTTPS_PORT environment variables avoiding host port collisions',
      'Exposed direct app port option (APP_PORT:3000) for optional direct access'
    ]
  },
  {
    version: 'v1.8.2',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'بسته‌بندی خوداتکا (Self-Contained) سرور و حذف نیاز به اینترنت حین docker build',
    titleEn: 'Zero-Install Self-Contained Server Bundle for Instant Docker Builds without Network Dependencies',
    changesFa: [
      'بسته‌بندی کامل و مستقل سرور اکسپرس در یک فایل مستقل (server.cjs) به همراه کلیه کتابخانه‌ها با esbuild',
      'حذف کامل دستورات npm install و دانلودهای اینترنتی در زمان docker compose up',
      'رفع قطعی خطای تایم‌اوت شبکه اینترنت سرور (EIDLETIMEOUT registry.npmjs.org) و بیلد بلادرنگ زیر ۱ ثانیه'
    ],
    changesEn: [
      'Bundled entire Express server and dependencies into a self-contained server.cjs via esbuild',
      'Completely removed npm install and external network downloads during docker compose up build phase',
      'Eliminated EIDLETIMEOUT registry.npmjs.org network failures with instant sub-second image builds'
    ]
  },
  {
    version: 'v1.8.1',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'رفع خطای بیلد داکر در نصب پکیج‌ها و حذف تگ منسوخ‌شده version از docker-compose',
    titleEn: 'Fix Docker build npm ci error and remove obsolete compose version attribute',
    changesFa: [
      'اصلاح لایه نصب داکر از npm ci به npm install --omit=dev --legacy-peer-deps جهت رفع خطای EUSAGE نبودن package-lock.json',
      'حذف ویژگی منسوخ‌شده version از ابتدای فایل docker-compose.yml جهت جلوگیری از هشدارهای مدرن داکر کامپوز'
    ],
    changesEn: [
      'Fixed Docker build layer from npm ci to npm install --omit=dev --legacy-peer-deps avoiding EUSAGE lockfile error',
      'Removed obsolete top-level version attribute from docker-compose.yml eliminating Docker compose warning'
    ]
  },
  {
    version: 'v1.8.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'فیلترهای زمانی و پروژه‌ای در داشبورد اختصاصی و اسکریپت پارامتریک init_ssl.sh با نام دامنه',
    titleEn: 'Dashboard Period & Project Filters for All Users and Parameterized init_ssl.sh Script',
    changesFa: [
      'افزودن فیلترهای بازه زمانی (از تاریخ / تا تاریخ)، کلیدهای سریع ماه جاری، ماه گذشته و همه زمان‌ها در داشبورد برای تمام کاربران',
      'افزودن امکان فیلتر بر اساس پروژه اختصاصی در داشبورد و به‌روزرسانی آنی شاخص‌های KPI و نمودارهای تحلیلی',
      'افزودن قابلیت مرتب‌سازی ستونی روی تاریخ، نوع، پروژه و مدت کارکرد در جدول داشبورد',
      'اصلاح خروجی‌های PDF و Excel داشبورد بر مبنای فیلترهای اعمال‌شده زمانی و پروژه‌ای',
      'ایجاد اسکریپت اجرایی خودکار init_ssl.sh با دریافت نام دامنه به عنوان آرگومان ورودی، هماهنگ‌سازی خودکار nginx.conf، ایجاد گواهی موقت و اخذ گواهی رسمی از Let\'s Encrypt'
    ],
    changesEn: [
      'Added comprehensive date range filters (from/to), quick period selectors (this month, last month, all time) to Dashboard for all users',
      'Added project-level filtering on Dashboard with live KPI card and distribution chart re-calculations',
      'Enabled multi-column sorting on Date, Type, Project, and Duration in the Dashboard table',
      'Aligned Dashboard PDF & Excel exports to strictly reflect active period and project filters',
      'Created parameterized init_ssl.sh script accepting domain name argument, auto-updating Nginx config, handling ACME validation and Let\'s Encrypt provisioning'
    ]
  },
  {
    version: 'v1.7.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'انتقال محل مونت داده‌های داکر به دایرکتوری خارجی clocky-data',
    titleEn: 'Relocate Docker data volume mounts to external clocky-data directory',
    changesFa: [
      'اصلاح فایل docker-compose.yml جهت مونت داده‌های پایگاه داده PostgreSQL در مسیر clocky-data/postgres/..',
      'اصلاح مسیر داده‌های کش و سشن‌های Redis در مسیر clocky-data/redis/..',
      'انتقال کانفیگ و لاگ‌های Nginx به مسیر clocky-data/nginx/..',
      'انتقال گواهی‌ها و فایل‌های اعتبارسنجی Certbot Let\'s Encrypt به مسیر clocky-data/certbot/.. خارج از پروژه',
      'به‌روزرسانی اسکریپت راه‌اندازی SSL اتوماتیک (init-letsencrypt.sh) متناسب با مسیر جدید clocky-data'
    ],
    changesEn: [
      'Updated docker-compose.yml to mount PostgreSQL data to ../clocky-data/postgres',
      'Updated Redis cache & sessions data mount to ../clocky-data/redis',
      'Relocated Nginx configuration and logs to ../clocky-data/nginx',
      'Relocated Certbot SSL certificates and ACME challenges to ../clocky-data/certbot outside the app root',
      'Updated automated SSL setup script (init-letsencrypt.sh) to reflect the new clocky-data path'
    ]
  },
  {
    version: 'v1.6.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'بهینه‌سازی گزارش‌گیری، تفکیک تاریخ و ساعت شروع/پایان، قابلیت چشم در رمزها، چیدمان ساعت و مدیریت سشن در پروفایل',
    titleEn: 'Report Criteria Optimization, Start/End Date-Time Split, Password Eye Toggles, Strict LTR Time and Profile Sessions',
    changesFa: [
      'افزودن دکمه نمایش/مخفی‌سازی (آیکون چشم) به تمامی فیلدهای ورود و تعریف رمز عبور در سراسر سامانه',
      'حذف فیلتر ساعت شروع و پایان از بخش گزارش‌گیری و متمرکزسازی بر بازه تاریخی و انتخاب پرسنل',
      'افزودن ستون‌های مستقل «تاریخ شروع»، «ساعت شروع»، «تاریخ پایان» و «ساعت پایان» در جدول و خروجی‌های PDF و اکسل گزارشات',
      'تضمین استفاده انحصاری از فونت بی میترا (B Mitra) در تمامی متون و سربرگ‌های گزارشات چاپی و PDF',
      'حذف مدیر ارشد سامانه از لیست‌های کارکرد، تخصیص گروه‌ها و گزارش‌گیری پرسنل ضمن حفظ دسترسی همه‌جانبه',
      'ادغام کامل بخش سشن‌ها در پروفایل کاربری با جزئیات ورودهای موفق/ناموفق و امکان خروج از سایر نشست‌ها به جز نشست جاری',
      'اصلاح چیدمان فیلد ساعت در زبان فارسی؛ قرارگیری دائمی ساعت در سمت چپ و دقیقه در سمت راست (HH:mm) با جهت LTR',
      'افزودن امکان مرتب‌سازی (Sort) و فیلتر ستونی بر روی کلیه ستون‌های تمامی جداول سامانه',
      'پشتیبانی از نام‌گذاری دوزبانه (فارسی و انگلیسی) انواع مرخصی و کارکرد خاص در تنظیمات با سوئیچ خودکار بر اساس زبان سامانه'
    ],
    changesEn: [
      'Added toggle eye icon (show/hide password) to all password input fields across the application',
      'Removed start and end time inputs from reports criteria, keeping date range filtering streamlined',
      'Added dedicated columns for Start Date, Start Time, End Date, and End Time in both table view and PDF/Excel exports',
      'Guaranteed B Mitra typography across all sections, headers, and tables of PDF and print reports',
      'Excluded Super Admin from staff attendance lists and report checklists while maintaining full administrative privileges',
      'Integrated active sessions management directly into User Profile, with ability to terminate other sessions except current',
      'Fixed time display in Persian UI; Hour is strictly positioned on the left and Minute on the right in LTR order',
      'Added comprehensive multi-column sorting and filtering across all system tables',
      'Bilingual naming (Persian and optional English) for Leave and Special Work types in Settings with automatic fallback'
    ]
  },
  {
    version: 'v1.5.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'شخصی‌سازی نام و لوگوی سازمان، بهینه‌سازی کامل موبایل و تبلت و استانداردسازی چاپ A4',
    titleEn: 'Corporate Branding & Logo, Full Mobile/Tablet Responsiveness, and Strict A4 Layout',
    changesFa: [
      'امکان تعریف نام رسمی شرکت / سازمان و بارگذاری لوگوی سازمانی در بخش تنظیمات توسط مدیر',
      'نمایش لوگو و نام سازمانی در بالای سایدبار، هدر سامانه و سربرگ رسمی گزارشات PDF و پرینت',
      'بهینه‌سازی کامل جهت استفاده در گوشی‌ها و تبلت‌ها با سایدبار کشویی (Drawer) و کنترل‌های لمسی',
      'طراحی دقیق خروجی پرینت و PDF منطبق بر استاندارد کاغذ A4 افقی بدون سرریز جدول از لبه‌های صفحه',
      'بهبود استایل‌های جداول، پدینگ‌ها و المان‌های رابط کاربری در ابعاد مختلف صفحه نمایش'
    ],
    changesEn: [
      'Organization name configuration and corporate logo upload in Admin Settings',
      'Display organization logo and brand name across sidebar, headers, and official PDF printouts',
      'Comprehensive mobile and tablet responsiveness with touch-friendly drawer navigation',
      'Strict A4 landscape export layout preventing table boundary overflow',
      'Refined responsive table styling, paddings, and typography hierarchy'
    ]
  },
  {
    version: 'v1.4.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'پشتیبان‌گیری خودکار، دوره‌ای و هوشمند بر اساس تغییرات، اعلان‌های سیستمی و مدیریت لاگ‌ها',
    titleEn: 'Automated Event-Driven & Periodic Backups, System Alerts, and Audit Logs',
    changesFa: [
      'سیستم پشتیبان‌گیری خودکار هوشمند به ازای هر ۳ تغییر مهم در پایگاه داده یا بر اساس زمان‌بندی دوره‌ای',
      'امکان دانلود، بازگردانی (Restore) و حذف نسخه‌های پشتیبان با تفکیک نوع دستی یا خودکار',
      'افزودن مرکز اعلان‌ها در هدر با نشانگر تعداد اعلان‌های خوانده‌نشده',
      'ثبت جامع کلیه رخدادها، ورود و خروج‌ها، تغییرات پروژه‌ها و کارکردها در بخش گزارش رخدادها (Logs)'
    ],
    changesEn: [
      'Event-driven smart automated backup triggers after 3 significant mutations or periodic intervals',
      'Complete backup management with download, restore, and deletion support for manual & automatic backups',
      'Interactive Notification Center in navbar with real-time unread badge indicators',
      'Comprehensive system audit logging for authentication, project edits, and attendance activities'
    ]
  },
  {
    version: 'v1.3.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'سیستم ثبت‌نام عمومی پرسنل، گردش‌کار تایید توسط مدیر و مدیریت گروه‌های سازمانی',
    titleEn: 'Public Employee Registration, Approval Workflow, and Organization Groups',
    changesFa: [
      'فرم درخواست ثبت‌نام حساب کاربری جدید برای کارمندان به همراه تعیین مشخصات و گروه‌های سازمانی مورد تقاضا',
      'بخش مدیریت درخواست‌های ثبت‌نام برای مدیر با قابلیت تایید یا رد درخواست به همراه ثبت علت',
      'تخصیص اتوماتیک نام کاربری و رمز عبور تصادفی استاندارد هنگام تایید و الزام تغییر رمز در اولین ورود',
      'مدیریت گروه‌های سازمانی (دپارتمان‌ها/شعب) و تخصیص کاربران و پروژه‌ها به گروه‌ها'
    ],
    changesEn: [
      'Public employee registration form with target department/group selections',
      'Admin approval workflow for incoming registration requests with rejection reasons',
      'Automatic strong credential generation upon approval with mandatory first-login password change',
      'Organizational group management (departments/teams) linking users and projects'
    ]
  },
  {
    version: 'v1.2.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'خروجی رسمی PDF و اکسل، گزارش‌گیری پیشرفته مدیر و سطوح دسترسی ۴ گانه',
    titleEn: 'Official PDF/Excel Export, Advanced Management Reports, and 4-Tier RBAC',
    changesFa: [
      'ماژول خروجی استاندارد PDF با رعایت کامل راست‌چین، سربرگ سازمانی و فونت بی میترا',
      'ماژول خروجی فایل اکسل (.xlsx) با فرمت‌بندی رسمی و مرتب‌سازی داده‌ها',
      'بخش جامع گزارش‌گیری مدیر با قابلیت فیلتر چندگانه پرسنل، بازه تاریخی، پروژه‌ها و انواع کارکرد',
      'پیاده‌سازی سطوح دسترسی شامل مدیر ارشد، بازرس، مدیر اجرایی و کارمند'
    ],
    changesEn: [
      'Standard PDF print & export module with full RTL layout, company headers, and B Mitra font',
      'Official formatted Excel (.xlsx) export with automatic column alignment',
      'Advanced management reporting view with multi-user selection, date filters, and project breakdown',
      'Role-based access control with Admin, Inspector, Executive, and Employee tiers'
    ]
  },
  {
    version: 'v1.1.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'مدیریت تردد، ماموریت، مرخصی و کارکردهای خاص به همراه داشبورد تحلیلی',
    titleEn: 'Attendance, Missions, Leaves, Special Work Records & Analytic Dashboard',
    changesFa: [
      'ثبت کارکرد عادی با تخصیص پروژه و محاسبه ساعات کاری',
      'بخش مجزای ثبت ماموریت با تعیین مقصد و ماموریت کاری',
      'بخش ثبت انواع مرخصی (عادی، استعلاجی، تشویقی، مناسبتی)',
      'بخش کارکردهای خاص نظیر قطعی برق، تعطیلی اضطراری و غیره',
      'داشبورد تحلیلی با نمودارهای آماری تردد، ساعت کاری هفتگی و وضعیت مرخصی‌ها'
    ],
    changesEn: [
      'Regular work attendance logging with project allocation and duration calculations',
      'Dedicated business mission logging with destination and purpose',
      'Comprehensive leave management (annual, sick, reward, special)',
      'Special condition work logging such as power outages or emergency shutdowns',
      'Analytic dashboard featuring visual charts, weekly work summaries, and leave quotas'
    ]
  },
  {
    version: 'v1.0.0',
    releaseDate: '2026-10-04',
    releaseDateFa: '۱۴۰۵/۰۷/۱۳',
    titleFa: 'انتشار نسخه اولیه سامانه مدیریت تردد و کارکرد کارکنان',
    titleEn: 'Initial Release of Employee Attendance and Timesheet System',
    changesFa: [
      'پشتیبانی کامل از زبان‌های فارسی (پیش‌فرض، راست‌چین) و انگلیسی (چپ‌چین)',
      'تایپوگرافی اختصاصی با فونت‌های B Mitra، B Nazanin و Times New Roman',
      'حساب کاربری پیش‌فرض مدیر (admin/admin) با الزام تغییر رمز در ورود اول',
      'معماری آماده داکر (Docker Compose، PostgreSQL، Redis، Nginx و Certbot)'
    ],
    changesEn: [
      'Bilingual Persian (Default, RTL) and English (LTR) interface support',
      'Typography enforcement with B Mitra, B Nazanin, and Times New Roman fonts',
      'Default admin account with forced password change on initial login',
      'Containerized architecture ready with Docker Compose, PostgreSQL, Redis, Nginx & Certbot'
    ]
  }
];
