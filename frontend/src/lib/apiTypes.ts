export type PagedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  displayName: string;
  roles: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type GoogleSignInRequest = {
  idToken: string;
  phoneNumber?: string;
};

export type BranchDto = {
  id: string;
  parentGroupId: string;
  branchName: string;
  address: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
};

export type ParentGroupListItemDto = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  creditLimit: number;
  status: string;
  branchCount: number;
};

export type ParentGroupDetailsDto = {
  id: string;
  companyName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  kraPin: string | null;
  creditLimit: number;
  status: string;
  branches: BranchDto[];
};

export type CreateBranchRequest = {
  id?: string;
  branchName: string;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type CreateParentGroupRequest = {
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  kraPin?: string | null;
  creditLimit: number;
  branches?: CreateBranchRequest[];
};

export type UpdateParentGroupRequest = CreateParentGroupRequest;

export type ProductDto = {
  id: string;
  sku: string;
  barcode: string | null;
  productName: string;
  category: string | null;
  description: string | null;
  buyingPrice: number;
  sellingPrice: number;
  unit: string;
  currentStock: number;
  minimumStock: number;
  status: string;
  imageUrl: string | null;
};

export type CreateProductRequest = {
  sku: string;
  barcode?: string | null;
  productName: string;
  category?: string | null;
  description?: string | null;
  buyingPrice: number;
  sellingPrice: number;
  unit: string;
  currentStock: number;
  minimumStock: number;
  imageUrl?: string | null;
};

export type UpdateProductRequest = CreateProductRequest;

export type InvoiceItemRequest = {
  productId?: string | null;
  itemName: string;
  itemDescription?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
};

export type CreateInvoiceRequest = {
  invoiceNumber?: string | null;
  lpoNumber?: string | null;
  invoiceDate: string;
  parentGroupId: string;
  branchId: string;
  salesperson?: string | null;
  paymentTerms?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  items: InvoiceItemRequest[];
};

export type InvoiceItemDto = {
  id: string;
  invoiceId: string;
  productId: string | null;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
};

export type InvoiceDto = {
  id: string;
  invoiceNumber: string;
  lpoNumber: string | null;
  invoiceDate: string;
  parentGroupId: string;
  branchId: string;
  salesperson: string | null;
  paymentTerms: string | null;
  dueDate: string | null;
  discountTotal: number;
  taxTotal: number;
  subtotal: number;
  grandTotal: number;
  notes: string | null;
  status: string;
  items: InvoiceItemDto[];
};

