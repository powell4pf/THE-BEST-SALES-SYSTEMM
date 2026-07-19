import { z } from 'zod';

const numericString = z
  .string()
  .trim()
  .min(1, 'This field is required')
  .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid number');

export const branchSchema = z.object({
  id: z.string().optional(),
  branchName: z.string().trim().min(2, 'Branch name is required'),
  address: z.string().trim().min(2, 'Branch address is required'),
  contactPerson: z.string().trim().min(2, 'Contact person is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number')
});

export const customerSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().trim().min(2, 'Company name is required'),
  contactPerson: z.string().trim().min(2, 'Contact person is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  address: z.string().trim().min(2, 'Address is required'),
  kraPin: z.string().trim().min(5, 'KRA PIN is required'),
  creditLimit: numericString,
  status: z.enum(['Active', 'Credit Hold', 'Inactive']),
  branches: z.array(branchSchema).min(1, 'Add at least one branch')
});

export const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2, 'SKU is required'),
  barcode: z.string().trim().min(2, 'Barcode is required'),
  productName: z.string().trim().min(2, 'Product name is required'),
  category: z.string().trim().min(2, 'Category is required'),
  description: z.string().trim().min(2, 'Description is required'),
  buyingPrice: numericString,
  sellingPrice: numericString,
  unit: z.string().trim().min(1, 'Unit is required'),
  currentStock: numericString,
  minimumStock: numericString,
  status: z.enum(['Active', 'Inactive', 'Low Stock']),
  imageUrl: z.string().trim().url('Enter a valid URL').or(z.literal(''))
});

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().trim().min(1, 'Select a product'),
  productName: z.string().trim().min(2, 'Product is required'),
  quantity: numericString,
  unitPrice: numericString,
  discount: numericString,
  tax: numericString
});

export const invoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().trim().min(2, 'Invoice number is required'),
  lpoNumber: z.string().trim(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  parentGroupId: z.string().min(1, 'Select a parent group'),
  branchId: z.string().min(1, 'Select a branch'),
  salesperson: z.string().trim().min(2, 'Salesperson is required'),
  paymentTerms: z.string().trim().min(2, 'Payment terms are required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().trim(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one line item')
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
export type ProductFormValues = z.infer<typeof productSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

