const LETTERHEAD_URL = '/letterhead.png';

import type { CollectionCustomerDto } from './apiTypes';

export type CollectionsForPrint = {
  totalOutstanding: number;
  totalOverdue: number;
  dueToday: number;
  customers: CollectionCustomerDto[];
};

export function openCollectionsPrintWindow(collections: CollectionsForPrint): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const money = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
  const rows = collections.customers.map((customer) => `<tr>
    <td><strong>${escapePrintHtml(customer.customerName)}</strong><br><small>${escapePrintHtml(customer.contactPerson || customer.email || customer.phone || 'No contact details')}</small></td>
    <td class="amount">KES ${money.format(customer.outstandingBalance)}</td>
    <td class="amount">KES ${money.format(customer.overdueBalance)}</td>
    <td>${escapePrintHtml(customer.riskStatus)}</td>
    <td>${escapePrintHtml(customer.followUpStatus)}${customer.nextFollowUpDate ? `<br><small>${escapePrintHtml(customer.nextFollowUpDate)}</small>` : ''}</td>
  </tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receivables & Collections</title><style>
    @page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#111827;font-size:11px}h1{margin:0;font-size:22px}p{margin:4px 0;color:#64748b}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.metric{border:1px solid #cbd5e1;border-radius:6px;padding:9px}.metric span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;margin-top:4px;font-size:16px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top}.amount{text-align:right;white-space:nowrap}small{color:#64748b}@media print{button{display:none}}
  </style></head><body><div class="header"><div><h1>Receivables & Collections</h1><p>Nurtured Choice Products</p></div><p>Printed ${escapePrintHtml(date)}</p></div><div class="summary"><div class="metric"><span>Total outstanding</span><strong>KES ${money.format(collections.totalOutstanding)}</strong></div><div class="metric"><span>Overdue</span><strong>KES ${money.format(collections.totalOverdue)}</strong></div><div class="metric"><span>Due today</span><strong>KES ${money.format(collections.dueToday)}</strong></div></div><table><thead><tr><th>Customer</th><th>Outstanding</th><th>Overdue</th><th>Risk status</th><th>Follow-up</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No customers match the current view.</td></tr>'}</tbody></table></body></html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 150);
}

export type StatementForPrint = {
  customerName: string;
  startDate: string;
  endDate: string;
  transactions: Array<{ date: string; document: string; description: string; debit: number; credit: number; balance: number }>;
};

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'statement';
}

async function loadLetterheadDataUrl() {
  try {
    const response = await fetch(LETTERHEAD_URL, { cache: 'force-cache' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read the company letterhead.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Download the same customer-facing statement as a self-contained PDF. */
export async function downloadStatementPdf(statement: StatementForPrint): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const letterhead = await loadLetterheadDataUrl();
  const contentStart = letterhead ? 61 : 36;
  const today = new Intl.DateTimeFormat('en-GB').format(new Date());
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
    .format(new Date(`${statement.startDate}T00:00:00`)).toUpperCase();
  const money = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
  const lines = statement.transactions.filter((transaction) => transaction.document !== 'OPENING' && transaction.debit > 0);
  const total = lines.reduce((sum, transaction) => sum + transaction.debit, 0);

  const drawPage = () => {
    if (letterhead) {
      pdf.addImage(letterhead, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    } else {
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 28, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text('NURTURED CHOICE PRODUCTS', margin, 13);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Sales & Distribution', margin, 19);
    }
  };

  drawPage();
  let y = contentStart;
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Dear sir/Madam,', margin, y);
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text(statement.customerName.toUpperCase(), margin, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`DATE. ${today}`, margin, y);
  y += 6;
  pdf.text('Att: Account payables', margin, y);
  y += 13;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(`ACCOUNT STATEMENT FOR ${period}.`, margin, y);
  y += 10;

  const columns = [margin, margin + 34, margin + 72, pageWidth - margin];
  const drawTableHeader = () => {
    pdf.setDrawColor(17, 24, 39);
    pdf.line(margin, y - 4, pageWidth - margin, y - 4);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('DATE', columns[0], y);
    pdf.text('INVOICE.NO', columns[1], y);
    pdf.text('BRANCH', columns[2], y);
    pdf.text('AMOUNT', columns[3], y, { align: 'right' });
    pdf.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 9;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
  };
  drawTableHeader();

  lines.forEach((transaction) => {
    if (y > pageHeight - 28) {
      pdf.addPage();
      drawPage();
      y = contentStart;
      drawTableHeader();
    }
    pdf.text(new Intl.DateTimeFormat('en-GB').format(new Date(`${transaction.date}T00:00:00`)), columns[0], y);
    pdf.text(transaction.document || '-', columns[1], y);
    pdf.text(pdf.splitTextToSize(transaction.description || '-', 55), columns[2], y);
    pdf.text(money.format(transaction.debit), columns[3], y, { align: 'right' });
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 8;
  });

  if (y > pageHeight - 48) {
    pdf.addPage();
    drawPage();
    y = contentStart;
  }
  pdf.setDrawColor(17, 24, 39);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', margin, y);
  pdf.text(money.format(total), columns[3], y, { align: 'right' });
  y += 22;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Thanks in advance.', margin, y);
  y += 18;
  pdf.text('Priscilla Nzalu', margin, y);

  const filename = `Statement-${safeFilename(statement.customerName)}-${statement.startDate}-to-${statement.endDate}.pdf`;
  pdf.save(filename);
}

function escapePrintHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

export function openStatementPrintWindow(statement: StatementForPrint): void {
  const today = new Intl.DateTimeFormat('en-GB').format(new Date());
  const period = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${statement.startDate}T00:00:00`)).toUpperCase();
  const money = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
  const lines = statement.transactions.filter((transaction) => transaction.document !== 'OPENING' && transaction.debit > 0);
  const rows = lines.map((transaction) => `<tr><td>${new Intl.DateTimeFormat('en-GB').format(new Date(`${transaction.date}T00:00:00`))}</td><td>${escapePrintHtml(transaction.document || '-')}</td><td>${escapePrintHtml(transaction.description || '-')}</td><td class="amount">${money.format(transaction.debit)}</td></tr>`).join('');
  const total = lines.reduce((sum, transaction) => sum + transaction.debit, 0);

  openLetterheadPrintWindow(`Account Statement - ${statement.customerName}`, `<div class="statement-heading"><p>Dear sir/Madam,</p><p class="customer">${escapePrintHtml(statement.customerName.toUpperCase())}.</p><p><strong>DATE.</strong>${today}</p><p><strong>Att:</strong> Account payables</p><h1>ACCOUNT STATEMENT FOR ${period}.</h1></div><table class="statement-table"><thead><tr><th>DATE</th><th>INVOICE.NO</th><th>BRANCH</th><th class="amount">AMOUNT</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No transactions recorded for this period.</td></tr>'}<tr class="total"><td colspan="3">TOTAL</td><td class="amount">${money.format(total)}</td></tr></tbody></table><div class="closing"><p>Thanks in advance.</p><p>Priscilla Nzalu</p></div>`, `.statement-heading{font-size:13px;line-height:1.35}.statement-heading p{margin:0 0 7px}.statement-heading .customer{font-weight:700;margin-top:14px}.statement-heading h1{font-size:16px;margin:22px 0 16px}.statement-table{width:100%;border-collapse:collapse;font-size:12px}.statement-table th,.statement-table td{padding:7px 6px;border-bottom:1px solid #111;text-align:left}.statement-table th{border-top:1px solid #111}.statement-table .amount{text-align:right}.statement-table .total td{font-weight:700;border-top:1px solid #111;border-bottom:0;padding-top:11px}.closing{font-size:13px;margin-top:28px}.closing p{margin:0 0 28px}`);
}

const baseStyles = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
  .letterhead-page {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    background: #fff url('${LETTERHEAD_URL}') center top / 210mm 297mm no-repeat;
    page-break-after: always;
    break-after: page;
  }
  .letterhead-page:last-child { page-break-after: auto; break-after: auto; }
  .letterhead-content {
    min-height: 297mm;
    padding: 61mm 18mm 18mm;
  }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  @media screen {
    body { background: #e5e7eb; padding: 12px; }
    .letterhead-page { margin: 0 auto 12px; box-shadow: 0 2px 12px rgba(15, 23, 42, .15); }
  }
  @media print {
    .letterhead-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function openLetterheadPrintWindow(title: string, body: string, styles = ''): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  const html = `<!doctype html>
    <html><head><meta charset="utf-8"><title>${title}</title><style>${baseStyles}${styles}</style></head>
    <body><main class="letterhead-page"><section class="letterhead-content">${body}</section></main></body></html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  const print = () => printWindow.print();
  if (printWindow.document.fonts?.ready) {
    printWindow.document.fonts.ready.then(print).catch(print);
  } else {
    printWindow.setTimeout(print, 100);
  }
}
