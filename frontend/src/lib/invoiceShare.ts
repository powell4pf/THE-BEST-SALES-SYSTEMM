import type { InvoiceDetailsDto } from './apiTypes';

type InvoiceCustomer = {
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type InvoiceBranch = {
  branchName: string;
  contactPerson?: string | null;
  address?: string | null;
};

export type InvoicePdfData = {
  invoice: InvoiceDetailsDto;
  customer?: InvoiceCustomer;
  branch?: InvoiceBranch;
};

export type InvoiceShareResult = 'shared' | 'downloaded';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function money(value: number) {
  return `KES ${currency.format(value)}`;
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'invoice';
}

function lineTotal(quantity: number, unitPrice: number, suppliedTotal: number) {
  return suppliedTotal || quantity * unitPrice;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatContact(customer?: InvoiceCustomer) {
  return [customer?.companyName, customer?.contactPerson, customer?.address, customer?.phone, customer?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');
}

function formatBranch(branch?: InvoiceBranch, salesperson?: string | null) {
  return [branch?.branchName, branch?.address, branch?.contactPerson, salesperson]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n');
}

async function loadLetterhead() {
  try {
    const response = await fetch('/letterhead.png', { cache: 'force-cache' });
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

export async function createInvoicePdf({ invoice, customer, branch }: InvoicePdfData): Promise<File> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const letterhead = await loadLetterhead();
  const contentStart = letterhead ? 68 : 45;
  let y = contentStart;

  const drawPageBackground = () => {
    if (letterhead) pdf.addImage(letterhead, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 20) return;
    pdf.addPage();
    drawPageBackground();
    y = contentStart;
  };

  drawPageBackground();
  if (!letterhead) {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 34, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(19);
    pdf.text('NURTURED CHOICE PRODUCTS', margin, 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Sales & Distribution', margin, 21);
  }
  pdf.setTextColor(letterhead ? 17 : 255, letterhead ? 24 : 255, letterhead ? 39 : 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('INVOICE', pageWidth - margin, letterhead ? 57 : 15, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(invoice.invoiceNumber, pageWidth - margin, letterhead ? 63 : 22, { align: 'right' });
  pdf.setTextColor(17, 24, 39);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Bill to', margin, y);
  pdf.text('Invoice details', pageWidth / 2 + 5, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const customerLines = pdf.splitTextToSize(formatContact(customer) || 'Customer details unavailable', contentWidth / 2 - 10);
  const detailLines = [
    `Invoice date: ${invoice.invoiceDate}`,
    `Due date: ${invoice.dueDate || 'Not specified'}`,
    `Payment terms: ${invoice.paymentTerms || 'Not specified'}`,
    `Status: ${invoice.status}`,
    invoice.lpoNumber ? `LPO number: ${invoice.lpoNumber}` : null,
    formatBranch(branch, invoice.salesperson) ? `Branch: ${formatBranch(branch, invoice.salesperson).replace(/\n/g, ', ')}` : null
  ].filter((value): value is string => Boolean(value));
  const details = pdf.splitTextToSize(detailLines.join('\n'), contentWidth / 2 - 10);
  pdf.text(customerLines, margin, y + 7);
  pdf.text(details, pageWidth / 2 + 5, y + 7);
  y += Math.max(customerLines.length, details.length) * 4.5 + 17;

  ensureSpace(20);
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, contentWidth, 8, 'F');
  pdf.setTextColor(51, 65, 85);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('PRODUCT', margin + 3, y + 5.2);
  pdf.text('QTY', pageWidth - margin - 66, y + 5.2, { align: 'right' });
  pdf.text('UNIT PRICE', pageWidth - margin - 35, y + 5.2, { align: 'right' });
  pdf.text('TOTAL', pageWidth - margin - 3, y + 5.2, { align: 'right' });
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  invoice.items.forEach((item) => {
    const nameLines = pdf.splitTextToSize(item.itemName || item.productName || 'Invoice item', 72);
    const descriptionLines = item.itemDescription ? pdf.splitTextToSize(item.itemDescription, 72) : [];
    const rowHeight = Math.max(7, (nameLines.length + descriptionLines.length) * 4.2 + 3);
    ensureSpace(rowHeight + 2);
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.text(nameLines, margin + 3, y + 3.5);
    if (descriptionLines.length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.text(descriptionLines, margin + 3, y + 3.5 + nameLines.length * 4.2);
      pdf.setFontSize(9);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(17, 24, 39);
    pdf.text(String(item.quantity), pageWidth - margin - 66, y + 3.5, { align: 'right' });
    pdf.text(money(item.unitPrice), pageWidth - margin - 35, y + 3.5, { align: 'right' });
    pdf.text(money(lineTotal(item.quantity, item.unitPrice, item.lineTotal)), pageWidth - margin - 3, y + 3.5, { align: 'right' });
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight + 2;
  });

  ensureSpace(33);
  const total = invoice.grandTotal || invoice.items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unitPrice, item.lineTotal), 0);
  const summaryX = pageWidth - margin - 75;
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Subtotal', summaryX, y + 4);
  pdf.text(money(invoice.subtotal || total), pageWidth - margin, y + 4, { align: 'right' });
  if (invoice.discountTotal) {
    y += 6;
    pdf.text('Discount', summaryX, y + 4);
    pdf.text(`- ${money(invoice.discountTotal)}`, pageWidth - margin, y + 4, { align: 'right' });
  }
  if (invoice.taxTotal) {
    y += 6;
    pdf.text('Tax', summaryX, y + 4);
    pdf.text(money(invoice.taxTotal), pageWidth - margin, y + 4, { align: 'right' });
  }
  y += 9;
  pdf.setFillColor(15, 23, 42);
  pdf.roundedRect(summaryX - 4, y, 79, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('GRAND TOTAL', summaryX, y + 6.5);
  pdf.text(money(total), pageWidth - margin - 3, y + 6.5, { align: 'right' });
  y += 20;

  if (invoice.notes) {
    const notes = pdf.splitTextToSize(invoice.notes, contentWidth);
    ensureSpace(notes.length * 4.2 + 15);
    pdf.setTextColor(51, 65, 85);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Notes', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(notes, margin, y + 6);
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Thank you for your business.', margin, pageHeight - 8);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return new File([pdf.output('blob')], `Invoice-${safeFilename(invoice.invoiceNumber)}.pdf`, { type: 'application/pdf' });
}

export async function downloadInvoicePdf(data: InvoicePdfData) {
  downloadFile(await createInvoicePdf(data));
}

async function shareFile(file: File, title: string, text: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  const shareData = { title, text, files: [file] };
  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) return false;
  await navigator.share(shareData);
  return true;
}

export async function shareInvoicePdf(data: InvoicePdfData): Promise<InvoiceShareResult> {
  const file = await createInvoicePdf(data);
  const text = `Invoice ${data.invoice.invoiceNumber} — ${money(data.invoice.grandTotal)}.`;
  if (await shareFile(file, `Invoice ${data.invoice.invoiceNumber}`, text)) return 'shared';
  downloadFile(file);
  return 'downloaded';
}

function whatsappNumber(phone?: string | null) {
  return phone?.replace(/\D/g, '') || '';
}

export async function shareInvoiceByWhatsApp(data: InvoicePdfData): Promise<InvoiceShareResult> {
  const file = await createInvoicePdf(data);
  const text = `Hello, please find invoice ${data.invoice.invoiceNumber} for ${money(data.invoice.grandTotal)} attached.`;
  if (await shareFile(file, `Invoice ${data.invoice.invoiceNumber}`, text)) return 'shared';
  downloadFile(file);
  const phone = whatsappNumber(data.customer?.phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  return 'downloaded';
}

export async function shareInvoiceByEmail(data: InvoicePdfData): Promise<InvoiceShareResult> {
  const file = await createInvoicePdf(data);
  const subject = `Invoice ${data.invoice.invoiceNumber}`;
  const text = `Hello,\n\nPlease find invoice ${data.invoice.invoiceNumber} for ${money(data.invoice.grandTotal)} attached.\n\nThank you.`;
  if (await shareFile(file, subject, text)) return 'shared';
  downloadFile(file);
  const recipient = data.customer?.email?.trim() || '';
  window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\nThe PDF has been downloaded. Please attach it before sending.`)}`;
  return 'downloaded';
}
