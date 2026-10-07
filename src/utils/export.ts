import * as XLSX from 'xlsx';
import { formatMinutes } from './jalali';
import { StorageService } from './storage';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // relative weight/width
  format?: (val: any, row?: any) => string;
}

export function exportTableToExcel(
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  data: any[],
  isPersian = true
) {
  // Map data to ordered rows matching column headers
  const rows = data.map(item => {
    const rowObj: Record<string, any> = {};
    columns.forEach(col => {
      let val = item[col.key];
      if (col.format) {
        val = col.format(val, item);
      }
      rowObj[col.header] = val ?? '-';
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = columns.map(c => ({ wch: c.width || 18 }));

  // Set Right-to-Left sheet view for Persian
  if (isPersian) {
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'].push({ rightToLeft: true });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportTableToPdfPrint(
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: any[],
  isPersian = true
) {
  const dir = isPersian ? 'rtl' : 'ltr';
  const lang = isPersian ? 'fa' : 'en';
  // "تو گزارش پی دی اف همه چی فونت بی میترا باشه"
  const pdfFont = isPersian ? "'B Mitra', 'BMitra', Tahoma, sans-serif" : "'Times New Roman', Times, serif";

  const settings = StorageService.getSettings();
  const orgName = settings.organizationName || (isPersian ? 'نرم افزار ثبت تردد' : 'Attendance Tracking Software');
  const orgLogo = settings.organizationLogo;

  // Calculate proportional column percentage width so table NEVER overflows A4 paper bounds
  const totalWeight = columns.reduce((acc, col) => acc + (col.width || 15), 5); // +5 for index col

  const indexColPercent = Number(((5 / totalWeight) * 100).toFixed(2));
  const colPercentages = columns.map(col => {
    const weight = col.width || 15;
    return Number(((weight / totalWeight) * 100).toFixed(2));
  });

  const rowsHtml = data.map((item, index) => {
    const cells = columns.map(col => {
      let val = item[col.key];
      if (col.format) val = col.format(val, item);
      return `<td>${val ?? '-'}</td>`;
    }).join('');
    return `<tr><td style="text-align: center; font-weight: bold;">${index + 1}</td>${cells}</tr>`;
  }).join('');

  const headersHtml = columns.map((col, idx) =>
    `<th style="width: ${colPercentages[idx]}%;">${col.header}</th>`
  ).join('');

  const printWindow = window.open('', '_blank', 'width=1120,height=800');
  if (!printWindow) {
    alert(isPersian ? 'لطفاً به مرورگر اجازه باز کردن پنجره چاپ را بدهید.' : 'Please allow popups to print/export PDF.');
    return;
  }

  const printDoc = `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        /* Strict A4 formatting: zero paper overflow guarantee */
        @page {
          size: A4 landscape;
          margin: 8mm 10mm 10mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: ${pdfFont} !important;
        }
        html, body {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: ${pdfFont} !important;
          direction: ${dir};
          font-size: 11px;
          line-height: 1.3;
        }
        .report-container {
          width: 100% !important;
          max-width: 100% !important;
          padding: 4px;
          font-family: ${pdfFont} !important;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-logo {
          max-height: 48px;
          max-width: 120px;
          object-fit: contain;
          border-radius: 4px;
        }
        .header-titles {
          display: flex;
          flex-direction: column;
        }
        .org-name {
          font-size: 14px;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 2px;
          font-family: ${pdfFont} !important;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          color: #0f172a;
          font-family: ${pdfFont} !important;
        }
        .subtitle {
          font-size: 11px;
          color: #475569;
          font-family: ${pdfFont} !important;
        }
        .meta {
          text-align: ${isPersian ? 'left' : 'right'};
          font-size: 10px;
          color: #475569;
          font-family: ${pdfFont} !important;
          line-height: 1.5;
        }
        /* Table strictly fits A4 width with word-wrap */
        table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          margin-top: 6px;
          font-size: 10.5px;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          font-family: ${pdfFont} !important;
        }
        thead {
          display: table-header-group;
        }
        tr {
          page-break-inside: avoid;
        }
        th {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          font-weight: bold;
          padding: 6px 4px !important;
          border: 1px solid #94a3b8 !important;
          text-align: ${isPersian ? 'right' : 'left'};
          font-family: ${pdfFont} !important;
          font-size: 10.5px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        td {
          padding: 4.5px 5px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 10px;
          font-family: ${pdfFont} !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        tr:nth-child(even) {
          background-color: #f8fafc !important;
        }
        .footer {
          margin-top: 10px;
          border-top: 1px solid #cbd5e1;
          padding-top: 6px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #64748b;
          font-family: ${pdfFont} !important;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div class="header-brand">
            ${orgLogo ? `<img src="${orgLogo}" alt="Logo" class="header-logo" />` : ''}
            <div class="header-titles">
              <div class="org-name">${orgName}</div>
              <div class="title">${title}</div>
              <div class="subtitle">${subtitle}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>${isPersian ? 'تاریخ گزارش:' : 'Report Date:'}</strong> ${new Date().toLocaleDateString(isPersian ? 'fa-IR' : 'en-US')}</div>
            <div><strong>${isPersian ? 'سامانه مدیریت تردد و کارکرد' : 'Attendance Management System'}</strong></div>
            <div>${isPersian ? 'قالب استاندارد قطع A4 افقی' : 'Standard A4 Landscape Layout'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: ${indexColPercent}%; text-align: center;">#</th>
              ${headersHtml}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>${isPersian ? `تعداد کل سطرهای این گزارش: ${data.length}` : `Total Rows in Report: ${data.length}`}</div>
          <div>${isPersian ? `${orgName} - سامانه جامع حضور، غیاب و کارکرد پرسنل` : `${orgName} - Enterprise Time & Attendance System`}</div>
          <div>${isPersian ? 'چاپ بدون خروج از صفحه A4' : 'Fit to A4 Page'}</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printDoc);
  printWindow.document.close();
}
