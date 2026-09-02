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
const defaultInvoiceNote = 'Thank you for doing business with us.';

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
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const letterhead = await loadLetterhead();
  const contentStart = letterhead ? 61 : 36;
  let y = contentStart;

  const drawPageBackground = () => {
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

  drawPageBackground();
  const ensurePage = (height: number) => {
    if (y + height <= pageHeight - 20) return;
    pdf.addPage();
    drawPageBackground();
    y = contentStart;
  };

  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.text('INVOICE', margin, y + 5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(invoice.invoiceNumber, margin, y + 14);
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`LPO No: ${invoice.lpoNumber || 'Not provided'}`, margin, y + 22);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text('DATE', pageWidth - margin, y + 5, { align: 'right' });
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(invoice.invoiceDate, pageWidth - margin, y + 13, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text('DUE', pageWidth - margin, y + 22, { align: 'right' });
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(invoice.dueDate || 'Not specified', pageWidth - margin, y + 30, { align: 'right' });
  y += 39;

  const drawDetailsCard = (x: number, title: string, values: string[]) => {
    const cardWidth = (contentWidth - 8) / 2;
    const lines = values.flatMap((value) => pdf.splitTextToSize(value, cardWidth - 12));
    const cardHeight = Math.max(48, 24 + lines.length * 5.5 + 8);
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'S');
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(title, x + 5, y + 13);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(lines, x + 5, y + 23);
    return cardHeight;
  };

  const customerValues = [customer?.companyName, customer?.contactPerson, customer?.email, customer?.phone, customer?.address]
    .filter((value): value is string => Boolean(value?.trim()));
  const branchValues = [branch?.branchName, branch?.address, branch?.contactPerson, invoice.salesperson]
    .filter((value): value is string => Boolean(value?.trim()));
  const cardHeight = Math.max(
    drawDetailsCard(margin, 'Bill To', customerValues.length ? customerValues : ['Customer details unavailable']),
    drawDetailsCard(margin + (contentWidth + 8) / 2, 'Branch', branchValues.length ? branchValues : ['Unknown branch'])
  );
  y += cardHeight + 8;

  const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const productX = margin + 5;
  const qtyX = pageWidth - margin - 68;
  const unitX = pageWidth - margin - 35;
  const totalX = pageWidth - margin - 3;
  const headerHeight = 9;
  ensurePage(headerHeight + 20);
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(229, 231, 235);
  pdf.rect(margin, y, contentWidth, headerHeight, 'FD');
  pdf.setTextColor(55, 65, 81);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('Product', productX, y + 6);
  pdf.text('Qty', qtyX, y + 6, { align: 'right' });
  pdf.text('Unit Price', unitX, y + 6, { align: 'right' });
  pdf.text('Total', totalX, y + 6, { align: 'right' });
  y += headerHeight;

  invoice.items.forEach((item) => {
    const nameLines = pdf.splitTextToSize(item.itemName || item.productName || 'Invoice item', 76);
    const rowHeight = Math.max(9, nameLines.length * 5.2 + 4);
    ensurePage(rowHeight + 4);
    pdf.setDrawColor(229, 231, 235);
    pdf.rect(margin, y, contentWidth, rowHeight, 'S');
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(nameLines, productX, y + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(item.quantity), qtyX, y + 6, { align: 'right' });
    pdf.text(money(item.unitPrice), unitX, y + 6, { align: 'right' });
    pdf.text(money(item.quantity * item.unitPrice), totalX, y + 6, { align: 'right' });
    y += rowHeight;
  });

  ensurePage(52);
  const summaryX = pageWidth - margin - 76;
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Total', summaryX, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(money(total), pageWidth - margin, y + 10, { align: 'right' });
  y += 18;

  const notes = pdf.splitTextToSize(invoice.notes?.trim() || defaultInvoiceNote, contentWidth - 12);
  const notesHeight = Math.max(30, 17 + notes.length * 5.2);
  ensurePage(notesHeight + 6);
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(margin, y, contentWidth, notesHeight, 4, 4, 'FD');
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Notes', margin + 5, y + 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(notes, margin + 5, y + 21);

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
