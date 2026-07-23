const LETTERHEAD_URL = '/letterhead.png';

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
