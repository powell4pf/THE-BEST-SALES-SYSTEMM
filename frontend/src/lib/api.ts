import type {
  AuthResponse,
  CreateInvoiceRequest,
  CreateParentGroupRequest,
  CreateProductRequest,
  GoogleSignInRequest,
  InvoiceDto,
  LoginRequest,
  ParentGroupDetailsDto,
  ParentGroupListItemDto,
  PagedResult,
  ProductDto,
  UpdateParentGroupRequest,
  UpdateProductRequest
} from './apiTypes';
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
  return new Error(body || `Request failed with status ${response.status}`);
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
  async getInvoice(id: string): Promise<InvoiceDto> {
    return request<InvoiceDto>(`/api/v1/invoices/${id}`);
  },
  async createInvoice(requestBody: CreateInvoiceRequest): Promise<string> {
    return request<string>('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
  async finalizeInvoice(id: string): Promise<void> {
    await request<void>(`/api/v1/invoices/${id}/finalize`, {
      method: 'POST'
    });
  },
  isAuthenticated(): boolean {
    const tokens = loadAuthTokens();
    return Boolean(tokens?.accessToken && !isJwtExpired(tokens.accessToken));
  },
  getTokens(): AuthTokens | null {
    return loadAuthTokens();
  }
};

