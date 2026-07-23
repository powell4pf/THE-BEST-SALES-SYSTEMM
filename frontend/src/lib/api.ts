import type {
  AuthResponse,
  AccountsReceivableAgingDto,
  CreateCreditNoteRequest,
  CreateInvoiceRequest,
  CreateParentGroupRequest,
  CreateProductRequest,
  DashboardSummaryDto,
  GoogleSignInRequest,
  InvoiceDto,
  CreditNoteDetailsDto,
  CreditNoteListItemDto,
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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5276';

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const tokens = loadAuthTokens();
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers
  });

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
    throw await toError(response);
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
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
  async generateStatement(params: { customerId: string; startDate: string; endDate: string }): Promise<import('./apiTypes').StatementDto> {
    return request<import('./apiTypes').StatementDto>(`/api/v1/statements/generate?customerId=${params.customerId}&startDate=${params.startDate}&endDate=${params.endDate}`);
  },
  async getAccountsReceivableAging(): Promise<AccountsReceivableAgingDto> {
    return request<AccountsReceivableAgingDto>('/api/v1/reports/accounts-receivable-aging');
  },
  async getInvoice(id: string): Promise<InvoiceDto> {
    return request<InvoiceDto>(`/api/v1/invoices/${id}`);
  },
  async createInvoice(requestBody: CreateInvoiceRequest): Promise<string> {
    return request<string>('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
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
    throw new Error('Editing an existing invoice is not enabled by the current API. Create a new draft instead.');
  },
  async deleteInvoice(id: string): Promise<void> {
    throw new Error('Deleting invoices is not enabled by the current API.');
  },
  async finalizeInvoice(id: string): Promise<void> {
    await request<void>(`/api/v1/invoices/${id}/finalize`, {
      method: 'POST'
    });
  },
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    return request<DashboardSummaryDto>('/api/v1/dashboard/summary');
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
    const dashboard = await request<{ stats: Array<{ label: string; value: string }>; movements: string[] }>('/api/v1/stock/dashboard');
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
