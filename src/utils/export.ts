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
  const hasPersianChars = (str: string) => /[\u0600-\u06FF]/.test(str);

  // Map data to ordered rows matching column headers
  const rows = data.map((item, idx) => {
    const rowObj: Record<string, any> = {};
    if (isPersian) {
      rowObj['ردیف'] = idx + 1;
    }
    columns.forEach(col => {
      let val = item[col.key];
      if (col.format) {
        val = col.format(val, item);
      }
      let strVal = val !== undefined && val !== null && val !== '' ? String(val) : '-';
      if (isPersian && hasPersianChars(strVal) && !strVal.startsWith('\u200F')) {
        strVal = `\u200F${strVal}`;
      }
      rowObj[col.header] = strVal;
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths (including row index column if Persian)
  const colWidths = columns.map(c => ({ wch: Math.max(c.width || 18, 14) }));
  if (isPersian) {
    colWidths.unshift({ wch: 8 });
  }
  worksheet['!cols'] = colWidths;

  // Set Right-to-Left sheet view for Persian
  if (isPersian) {
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'].push({ rightToLeft: true });
  }

  const workbook = XLSX.utils.book_new();
  if (!workbook.Workbook) workbook.Workbook = {};
  if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
  if (isPersian) {
    workbook.Workbook.Views[0] = { RTL: true };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  try {
    const rawBuf = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const cfb = (XLSX as any).CFB;
    if (cfb && typeof TextDecoder !== 'undefined' && typeof TextEncoder !== 'undefined') {
      const zip = cfb.read(new Uint8Array(rawBuf), { type: 'array' });
      const dec = new TextDecoder();
      const enc = new TextEncoder();
      const fontName = isPersian ? 'B Mitra' : 'Times New Roman';
      const alignDir = isPersian
        ? '<alignment horizontal="right" vertical="center" readingOrder="2" wrapText="1"/>'
        : '<alignment horizontal="left" vertical="center" readingOrder="1" wrapText="1"/>';

      const stylesEntry = cfb.find(zip, '/xl/styles.xml');
      if (stylesEntry && stylesEntry.content) {
        let stylesXml = dec.decode(new Uint8Array(stylesEntry.content));
        stylesXml = stylesXml
          .replace(/<name val="Calibri"\/>/g, `<name val="${fontName}"/>`)
          .replace(/<sz val="12"\/>/g, '<sz val="12"/><b val="0"/>')
          .replace(/<scheme val="minor"\/>/g, '')
          .replace(
            /<cellStyleXfs count="1"><xf([^>]*)\/><\/cellStyleXfs>/g,
            `<cellStyleXfs count="1"><xf$1 applyFont="1" applyAlignment="1">${alignDir}</xf></cellStyleXfs>`
          )
          .replace(
            /<cellXfs count="1"><xf([^>]*)\/><\/cellXfs>/g,
            `<cellXfs count="1"><xf$1 applyFont="1" applyAlignment="1">${alignDir}</xf></cellXfs>`
          );
        const encodedStyles = enc.encode(stylesXml);
        stylesEntry.content = Array.from(encodedStyles);
        stylesEntry.size = encodedStyles.length;
      }

      const themeEntry = cfb.find(zip, '/xl/theme/theme1.xml');
      if (themeEntry && themeEntry.content) {
        let themeXml = dec
          .decode(new Uint8Array(themeEntry.content))
          .replace(/Calibri/g, fontName)
          .replace(/Cambria/g, fontName);
        const encodedTheme = enc.encode(themeXml);
        themeEntry.content = Array.from(encodedTheme);
        themeEntry.size = encodedTheme.length;
      }

      const sheetEntry = cfb.find(zip, '/xl/worksheets/sheet1.xml');
      if (sheetEntry && sheetEntry.content) {
        let sheetXml = dec.decode(new Uint8Array(sheetEntry.content));
        if (isPersian && !sheetXml.includes('rightToLeft="1"')) {
          sheetXml = sheetXml.replace('<sheetView ', '<sheetView rightToLeft="1" ');
        }
        // Explicitly bind style index 0 (B Mitra + RTL) to every cell
        sheetXml = sheetXml.replace(/<c r="([A-Z0-9]+)"(?![^>]*\bs=)/g, '<c r="$1" s="0"');
        const encodedSheet = enc.encode(sheetXml);
        sheetEntry.content = Array.from(encodedSheet);
        sheetEntry.size = encodedSheet.length;
      }

      const outArray = cfb.write(zip, { fileType: 'zip', type: 'array' });
      const blob = new Blob([new Uint8Array(outArray)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      return;
    }
  } catch (err) {
    console.warn('Excel style injection fallback:', err);
  }

  XLSX.writeFile(workbook, finalFilename);
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
