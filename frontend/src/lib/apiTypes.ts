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

export type RegisterRequest = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
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
  address?: string | null;
  creditLimit: number;
  status: string;
  branchCount: number;
  branches: BranchDto[];
};

export type ParentGroupSummaryDto = ParentGroupListItemDto;
export type ProductSummaryDto = ProductDto;

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
  productId: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
  productName: string;
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
  customerName?: string;
  branch?: string;
  address?: string | null;
  total?: string;
};

export type InvoiceItem = InvoiceItemDto;
export type InvoiceDetailsDto = InvoiceDto & { items: InvoiceItem[] };

export type CreateCreditNoteRequest = {
  creditNoteNumber: string;
  creditNoteDate: string;
  customerId: string;
  invoiceId?: string | null;
  subject: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; reason?: string }>;
};

export type CreditNoteListItemDto = {
  id: string;
  creditNoteNumber: string;
  customerName: string;
  invoiceNumber: string | null;
  creditNoteDate: string;
  total: number;
  status: string;
};

export type CreditNoteDetailsDto = {
  id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  customerId: string;
  invoiceId: string | null;
  subject: string;
  items: Array<{ id: string; productId: string; productName: string; quantity: number; unitPrice: number; reason: string | null }>;
  total: number;
};

export type CreateDeliveryNoteRequest = {
  deliveryNoteNumber: string;
  deliveryDate: string;
  customerId: string;
  branchId?: string | null;
  notes?: string | null;
  items: Array<{ productId: string; quantity: number }>;
};

export type DeliveryNoteListItemDto = {
  id: string;
  deliveryNoteNumber: string;
  customerName: string;
  deliveryDate: string;
  productCount: number;
  totalQuantity: number;
  status: string;
};

export type DeliveryNoteDetailsDto = {
  id: string;
  deliveryNoteNumber: string;
  customerId: string;
  branchId: string | null;
  deliveryDate: string;
  notes: string | null;
  status: string;
  items: Array<{ id: string; productId: string | null; productName: string; quantity: number }>;
};

export type InvoiceSummaryDto = InvoiceDto;

export type StatementTransactionDto = {
  date: string;
  document: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type StatementDto = {
  customerName: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  transactions: StatementTransactionDto[];
};

export type AccountsReceivableAgingItemDto = {
  customerId: string;
  customerName: string;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days91Plus: number;
  total: number;
};

export type AccountsReceivableAgingDto = { items: AccountsReceivableAgingItemDto[] };
export type ReportColumnDto = { key: string; label: string; type: 'text' | 'number' | 'currency' };
export type ReportTableDto = { key: string; title: string; description: string; columns: ReportColumnDto[]; rows: Array<Record<string, string | number | null>> };

export type CollectionInvoiceDto = { invoiceId: string; invoiceNumber: string; branch: string | null; invoiceDate: string; dueDate: string | null; total: number; paid: number; outstanding: number; daysOverdue: number };
export type CollectionCustomerDto = { customerId: string; customerName: string; contactPerson: string | null; email: string | null; phone: string | null; creditLimit: number; outstandingBalance: number; currentBalance: number; overdueBalance: number; oldestDaysOverdue: number; riskStatus: string; followUpStatus: string; nextFollowUpDate: string | null; lastContactedAt: string | null; lastContactMethod: string | null; notes: string | null; invoices: CollectionInvoiceDto[] };
export type CollectionsOverviewDto = { asOfDate: string; totalOutstanding: number; totalOverdue: number; dueToday: number; dueNext7Days: number; customersWithBalance: number; customersOverdue: number; customers: CollectionCustomerDto[] };
export type UpdateCollectionFollowUpRequest = { status: string; nextFollowUpDate: string | null; contactMethod: string | null; notes: string | null };

export type PaymentDto = { id: string; parentGroupId: string; customerName: string; paymentDate: string; amount: number; method: string; reference: string | null; allocatedAmount: number };
export type CreatePaymentRequest = { customerId: string; branchId?: string | null; paymentDate: string; amount: number; method: string; reference?: string | null; notes?: string | null; invoiceId?: string | null };
export type InvoiceNumberSettingsDto = { prefix: string; startingNumber: number; padding: number; resetPolicy: string; manualEditingAllowed: boolean };
export type UpdateInvoiceNumberSettingsRequest = InvoiceNumberSettingsDto;
export type SystemSettingDto = { key: string; value: string; description: string | null };
export type UserRoleDto = { id: string; email: string; displayName: string; roles: string[] };
export type MonthEndReminderDto = { id: string; periodKey: string; title: string; message: string; createdAt: string };

export type DashboardSummaryDto = {
  totalSales: number;
  todaySales: number;
  monthlySales: number;
  annualSales: number;
  totalCustomers: number;
  totalParentGroups: number;
  totalBranches: number;
  totalProducts: number;
  currentStockUnits: number;
  lowStockAlerts: number;
  totalInvoices: number;
  totalStatements: number;
  totalCreditNotes: number;
  outstandingCustomerBalance: number;
};

export type SalesTrendPointDto = { label: string; sales: number };
export type ProductPerformanceDto = { productName: string; quantitySold: number; revenue: number };
export type CustomerRevenueDto = { customerName: string; revenue: number };
export type RecentActivityItemDto = { type: string; description: string; occurredAt: string; reference: string | null };
export type DashboardPeriodDto = {
  startDate: string;
  endDate: string;
  sales: number;
  previousSales: number;
  salesChangePercentage: number | null;
  invoiceCount: number;
  previousInvoiceCount: number;
  outstandingBalance: number;
  trend: SalesTrendPointDto[];
  topCustomers: CustomerRevenueDto[];
};

export type CompanyProfileDto = {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  currencyCode: string;
  logoUrl: string | null;
};

export type UpdateCompanyProfileRequest = Omit<CompanyProfileDto, 'id' | 'logoUrl'>;

export type StockDashboardDto = {
  stats: Array<[string, string]>;
  movements: string[];
};
