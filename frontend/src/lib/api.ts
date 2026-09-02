import type {
  AuthResponse,
  AccountsReceivableAgingDto,
  ReportTableDto,
  CreateCreditNoteRequest,
  CreateDeliveryNoteRequest,
  CreateInvoiceRequest,
  CreateParentGroupRequest,
  CreateProductRequest,
  DashboardSummaryDto,
  GoogleSignInRequest,
  InvoiceDto,
  CreditNoteDetailsDto,
  CreditNoteListItemDto,
  DeliveryNoteDetailsDto,
  DeliveryNoteListItemDto,
  LoginRequest,
  RegisterRequest,
  ParentGroupDetailsDto,
  ParentGroupListItemDto,
  PagedResult,
  ProductDto,
  UpdateParentGroupRequest,
  UpdateProductRequest
} from './apiTypes';
import type { CompanyProfileDto, StockDashboardDto, UpdateCompanyProfileRequest } from './apiTypes';
import type { CustomerRevenueDto, ProductPerformanceDto, RecentActivityItemDto, SalesTrendPointDto } from './apiTypes';
import { clearAuthTokens, loadAuthTokens, saveAuthTokens, type AuthTokens } from './session';
import { isJwtExpired } from './jwt';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const localFrontendHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && ['5173', '4173'].includes(window.location.port);
const configuredLocalFrontendUrl = localFrontendHost && configuredApiBaseUrl
  ? (() => {
      try {
        const configuredUrl = new URL(configuredApiBaseUrl);
        return ['localhost', '127.0.0.1'].includes(configuredUrl.hostname) && ['5173', '4173'].includes(configuredUrl.port);
      } catch {
        return false;
      }
    })()
  : false;
const defaultApiBaseUrl = localFrontendHost || import.meta.env.DEV ? 'http://localhost:5276' : window.location.origin;
const apiBaseUrl = (configuredLocalFrontendUrl || (!configuredApiBaseUrl && localFrontendHost)
  ? 'http://localhost:5276'
  : configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const tokens = loadAuthTokens();
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers
    });
  } catch {
    throw new Error(`Cannot connect to the Sales API at ${apiBaseUrl}. Start the system with start-system.ps1, then refresh this page.`);
  }

  if (response.status === 401 && retry && tokens?.refreshToken) {
    const refreshed = await refreshTokens(tokens.refreshToken);
    if (refreshed) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set('Content-Type', 'application/json');
      retryHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`);
      const retryResponse = await fetch(`${apiBaseUrl}${path}`, {
        ...init,
        headers: retryHeaders
      });

      if (!retryResponse.ok) {
        throw await toError(retryResponse);
      }

      return parseResponse<T>(retryResponse);
    }
  }

  if (!response.ok) {
    if (response.status === 401 && tokens) {
      clearAuthTokens();
      window.location.assign('/login?session=expired');
      throw new Error('Your session expired. Please sign in again.');
    }
    throw await toError(response);
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`The Sales API returned an unexpected ${contentType || 'non-JSON'} response. Check that the API is running at ${apiBaseUrl}.`);
  }

  return (await response.json()) as T;
}

async function toError(response: Response): Promise<Error> {
  const body = await response.text();
  if (body) {
    try {
      const problem = JSON.parse(body) as { title?: string; detail?: string; errors?: Record<string, string[]> };
      const validation = problem.errors ? Object.values(problem.errors).flat().join(' ') : '';
      return new Error(problem.detail || problem.title || validation || body);
    } catch {
      return new Error(body);
    }
  }

  return new Error(`Request failed with status ${response.status}`);
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(refreshToken)
  });

  if (!response.ok) {
    clearAuthTokens();
    return null;
  }

  const auth = (await response.json()) as AuthResponse;
  const tokens = {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAtUtc: auth.expiresAtUtc
  };
  saveAuthTokens(tokens);
  return tokens;
}

export const api = {
  baseUrl: apiBaseUrl,
  async loginPassword(requestBody: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw await toError(response);
    return (await response.json()) as AuthResponse;
  },
  async register(requestBody: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw await toError(response);
    return (await response.json()) as AuthResponse;
  },
  async loginGoogle(requestBody: GoogleSignInRequest): Promise<AuthResponse> {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) throw await toError(response);
    return (await response.json()) as AuthResponse;
  },
  async logout(refreshToken: string): Promise<void> {
    await request<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify(refreshToken)
    }, false);
  },
  async listCustomers(pageSize = 1000): Promise<PagedResult<ParentGroupListItemDto>> {
    return request<PagedResult<ParentGroupListItemDto>>(`/api/v1/parent-groups?page=1&pageSize=${pageSize}`);
  },
  async getCustomer(id: string): Promise<ParentGroupDetailsDto> {
    return request<ParentGroupDetailsDto>(`/api/v1/parent-groups/${id}`);
  },
  async createCustomer(requestBody: CreateParentGroupRequest): Promise<string> {
    return request<string>('/api/v1/parent-groups', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
  async updateCustomer(id: string, requestBody: UpdateParentGroupRequest): Promise<void> {
    await request<void>(`/api/v1/parent-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });
  },
  async deleteCustomer(id: string): Promise<void> {
    await request<void>(`/api/v1/parent-groups/${id}`, {
      method: 'DELETE'
    });
  },
  async listProducts(pageSize = 1000): Promise<PagedResult<ProductDto>> {
    return request<PagedResult<ProductDto>>(`/api/v1/products?page=1&pageSize=${pageSize}`);
  },
  async getProduct(id: string): Promise<ProductDto> {
    return request<ProductDto>(`/api/v1/products/${id}`);
  },
  async createProduct(requestBody: CreateProductRequest): Promise<string> {
    return request<string>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
  async updateProduct(id: string, requestBody: UpdateProductRequest): Promise<void> {
    await request<void>(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });
  },
  async deleteProduct(id: string): Promise<void> {
    await request<void>(`/api/v1/products/${id}`, {
      method: 'DELETE'
    });
  },
  async listInvoices(pageSize = 1000): Promise<PagedResult<InvoiceDto>> {
    return request<PagedResult<InvoiceDto>>(`/api/v1/invoices?page=1&pageSize=${pageSize}`);
  },
  async listCreditNotes(pageSize = 1000): Promise<PagedResult<CreditNoteListItemDto>> {
    return request<PagedResult<CreditNoteListItemDto>>(`/api/v1/credit-notes?page=1&pageSize=${pageSize}`);
  },
  async getCreditNote(id: string): Promise<CreditNoteDetailsDto> {
    return request<CreditNoteDetailsDto>(`/api/v1/credit-notes/${id}`);
  },
  async getNextCreditNoteNumber(): Promise<{ nextNumber: string }> {
    return request<{ nextNumber: string }>('/api/v1/credit-notes/next-number');
  },
  async createCreditNote(requestBody: CreateCreditNoteRequest): Promise<string> {
    return request<string>('/api/v1/credit-notes', { method: 'POST', body: JSON.stringify(requestBody) });
  },
  async updateCreditNote(id: string, requestBody: CreateCreditNoteRequest): Promise<void> {
    await request<void>(`/api/v1/credit-notes/${id}`, { method: 'PUT', body: JSON.stringify(requestBody) });
  },
  async deleteCreditNote(id: string): Promise<void> {
    await request<void>(`/api/v1/credit-notes/${id}`, { method: 'DELETE' });
  },
  async listDeliveryNotes(pageSize = 1000): Promise<PagedResult<DeliveryNoteListItemDto>> {
    return request<PagedResult<DeliveryNoteListItemDto>>(`/api/v1/delivery-notes?page=1&pageSize=${pageSize}`);
  },
  async getDeliveryNote(id: string): Promise<DeliveryNoteDetailsDto> {
    return request<DeliveryNoteDetailsDto>(`/api/v1/delivery-notes/${id}`);
  },
  async getNextDeliveryNoteNumber(): Promise<{ nextNumber: string }> {
    return request<{ nextNumber: string }>('/api/v1/delivery-notes/next-number');
  },
  async createDeliveryNote(requestBody: CreateDeliveryNoteRequest): Promise<string> {
    const response = await request<string | { id: string }>('/api/v1/delivery-notes', { method: 'POST', body: JSON.stringify(requestBody) });
    return typeof response === 'string' ? response : response.id;
  },
  async updateDeliveryNote(id: string, requestBody: CreateDeliveryNoteRequest): Promise<void> {
    await request<void>(`/api/v1/delivery-notes/${id}`, { method: 'PUT', body: JSON.stringify(requestBody) });
  },
  async deleteDeliveryNote(id: string): Promise<void> {
    await request<void>(`/api/v1/delivery-notes/${id}`, { method: 'DELETE' });
  },
  async generateStatement(params: { customerId: string; startDate: string; endDate: string }): Promise<import('./apiTypes').StatementDto> {
    return request<import('./apiTypes').StatementDto>(`/api/v1/statements/generate?customerId=${params.customerId}&startDate=${params.startDate}&endDate=${params.endDate}`);
  },
  async getAccountsReceivableAging(): Promise<AccountsReceivableAgingDto> {
    return request<AccountsReceivableAgingDto>('/api/v1/reports/accounts-receivable-aging');
  },
  async getReport(reportKey: string): Promise<ReportTableDto> {
    return request<ReportTableDto>(`/api/v1/reports/${reportKey}`);
  },
  async getCollectionsOverview(): Promise<import('./apiTypes').CollectionsOverviewDto> {
    return request<import('./apiTypes').CollectionsOverviewDto>('/api/v1/collections/overview');
  },
  async updateCollectionFollowUp(customerId: string, requestBody: import('./apiTypes').UpdateCollectionFollowUpRequest): Promise<void> {
    await request<void>(`/api/v1/collections/${customerId}/follow-up`, { method: 'PUT', body: JSON.stringify(requestBody) });
  },
  async listPayments(pageSize = 1000): Promise<PagedResult<import('./apiTypes').PaymentDto>> {
    return request<PagedResult<import('./apiTypes').PaymentDto>>(`/api/v1/payments?page=1&pageSize=${pageSize}`);
  },
  async createPayment(requestBody: import('./apiTypes').CreatePaymentRequest): Promise<string> {
    return request<string>('/api/v1/payments', { method: 'POST', body: JSON.stringify(requestBody) });
  },
  async deletePayment(id: string): Promise<void> {
    await request<void>(`/api/v1/payments/${id}`, { method: 'DELETE' });
  },
  async getInvoiceNumberSettings(): Promise<import('./apiTypes').InvoiceNumberSettingsDto> { return request('/api/v1/settings/invoice-number'); },
  async updateInvoiceNumberSettings(requestBody: import('./apiTypes').UpdateInvoiceNumberSettingsRequest): Promise<import('./apiTypes').InvoiceNumberSettingsDto> { return request('/api/v1/settings/invoice-number', { method: 'PUT', body: JSON.stringify(requestBody) }); },
  async getSystemSettings(): Promise<import('./apiTypes').SystemSettingDto[]> { return request('/api/v1/settings/system'); },
  async listUsers(): Promise<import('./apiTypes').UserRoleDto[]> { return request('/api/v1/users'); },
  async getMonthEndReminders(): Promise<import('./apiTypes').MonthEndReminderDto[]> { return request('/api/v1/reminders/month-end'); },
  async markMonthEndReminderRead(id: string): Promise<void> { await request(`/api/v1/reminders/month-end/${id}/read`, { method: 'POST' }); },
  async listNotifications(): Promise<import('./apiTypes').NotificationDto[]> { return request('/api/v1/notifications'); },
  async markNotificationRead(id: string): Promise<void> { await request(`/api/v1/notifications/${id}/read`, { method: 'POST' }); },
  async markAllNotificationsRead(): Promise<void> { await request('/api/v1/notifications/read-all', { method: 'POST' }); },
  async getInvoice(id: string): Promise<InvoiceDto> {
    return request<InvoiceDto>(`/api/v1/invoices/${id}`);
  },
  async createInvoice(requestBody: CreateInvoiceRequest): Promise<string> {
    const response = await request<{ id: string } | string>('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    if (typeof response === 'string') return response;
    if (response?.id) return response.id;
    throw new Error('The Sales API created the invoice but did not return its ID for finalization.');
  },
  async getNextInvoiceNumber(): Promise<{ nextNumber: string }> {
    const invoices = await this.listInvoices(1000);
    const max = invoices.items.reduce((highest, invoice) => {
      const match = invoice.invoiceNumber.match(/(\d+)$/);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);
    return { nextNumber: `INV-${String(max + 1).padStart(6, '0')}` };
  },
  async updateInvoice(id: string, requestBody: CreateInvoiceRequest): Promise<void> {
    await request<void>(`/api/v1/invoices/${id}`, { method: 'PUT', body: JSON.stringify(requestBody) });
  },
  async deleteInvoice(id: string): Promise<void> {
    await request<void>(`/api/v1/invoices/${id}`, { method: 'DELETE' });
  },
  async finalizeInvoice(id: string): Promise<void> {
    await request<void>(`/api/v1/invoices/${id}/finalize`, {
      method: 'POST'
    });
  },
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    return request<DashboardSummaryDto>('/api/v1/dashboard/summary');
  },
  async getDashboardPeriod(startDate: string, endDate: string): Promise<import('./apiTypes').DashboardPeriodDto> {
    const params = new URLSearchParams({ startDate, endDate });
    return request<import('./apiTypes').DashboardPeriodDto>(`/api/v1/dashboard/period?${params.toString()}`);
  },
  async getSalesTrend(range = '6m'): Promise<SalesTrendPointDto[]> {
    return request<SalesTrendPointDto[]>(`/api/v1/dashboard/sales-trend?range=${range}`);
  },
  async getProductPerformance(): Promise<ProductPerformanceDto[]> {
    return request<ProductPerformanceDto[]>('/api/v1/dashboard/product-performance');
  },
  async getCustomerRevenue(): Promise<CustomerRevenueDto[]> {
    return request<CustomerRevenueDto[]>('/api/v1/dashboard/customer-revenue');
  },
  async getRecentActivity(): Promise<RecentActivityItemDto[]> {
    return request<RecentActivityItemDto[]>('/api/v1/dashboard/recent-activity');
  },
  async getCompanyProfile(): Promise<CompanyProfileDto> {
    return request<CompanyProfileDto>('/api/v1/settings/company-profile');
  },
  async updateCompanyProfile(requestBody: UpdateCompanyProfileRequest): Promise<CompanyProfileDto> {
    return request<CompanyProfileDto>('/api/v1/settings/company-profile', {
      method: 'PUT',
      body: JSON.stringify(requestBody)
    });
  },
  async getStockDashboard(): Promise<StockDashboardDto> {
    const dashboard = await request<{ stats: Array<{ label: string; value: string }>; movements: StockDashboardDto['movements'] }>('/api/v1/stock/dashboard');
    return {
      stats: dashboard.stats.map((stat) => [stat.label, stat.value]),
      movements: dashboard.movements
    };
  },
  isAuthenticated(): boolean {
    const tokens = loadAuthTokens();
    return Boolean(tokens?.accessToken && !isJwtExpired(tokens.accessToken));
  },
  getTokens(): AuthTokens | null {
    return loadAuthTokens();
  }
};
