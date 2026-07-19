import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export type StatCardData = {
  label: string;
  value: string;
  delta: string;
  accent: string;
};

export type ActivityItem = {
  title: string;
  detail: string;
  time: string;
};

export type TableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: Row) => ReactNode;
};

export type CustomerRow = {
  id: string;
  name: string;
  contact: string;
  branches: number;
  balance: string;
  status: string;
};

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: string;
  price: string;
  status: string;
};

export type BranchRow = {
  id: string;
  branchName: string;
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
};

export type CustomerAccount = {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  kraPin: string;
  creditLimit: number;
  status: 'Active' | 'Credit Hold' | 'Inactive';
  branches: BranchRow[];
};

export type ProductCatalogItem = {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  category: string;
  description: string;
  buyingPrice: number;
  sellingPrice: number;
  unit: string;
  currentStock: number;
  minimumStock: number;
  status: 'Active' | 'Inactive' | 'Low Stock';
  imageUrl: string;
};

export type InvoiceItemRow = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
};

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  lpoNumber: string;
  invoiceDate: string;
  parentGroupId: string;
  branchId: string;
  salesperson: string;
  paymentTerms: string;
  dueDate: string;
  notes: string;
  status: 'Draft' | 'Finalized' | 'Paid';
  items: InvoiceItemRow[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};
