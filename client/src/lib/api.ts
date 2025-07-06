export const API_BASE_URL = '';

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any,
  token?: string
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(errorData || `HTTP error! status: ${response.status}`);
  }

  return response;
}

export async function get(endpoint: string, token?: string) {
  const response = await apiRequest('GET', endpoint, undefined, token);
  return response.json();
}

export async function post(endpoint: string, data: any, token?: string) {
  const response = await apiRequest('POST', endpoint, data, token);
  return response.json();
}

export async function put(endpoint: string, data: any, token?: string) {
  const response = await apiRequest('PUT', endpoint, data, token);
  return response.json();
}

export async function del(endpoint: string, token?: string) {
  const response = await apiRequest('DELETE', endpoint, undefined, token);
  return response.json();
}

// Book search utilities
export async function searchBooks(query: string) {
  const response = await get(`/api/books/search?q=${encodeURIComponent(query)}`);
  return response;
}

export async function getTrendingBooks(period = 'weekly') {
  const response = await get(`/api/books/trending?period=${period}`);
  return response;
}

// Open Library API integration
export async function searchOpenLibrary(query: string) {
  const response = await get(`/api/openlibrary/search?q=${encodeURIComponent(query)}`);
  return response;
}

export async function getOpenLibraryBook(key: string) {
  const response = await get(`/api/openlibrary/books/${key}`);
  return response;
}

// User utilities
export async function getLeaderboard(limit = 10) {
  const response = await get(`/api/leaderboard?limit=${limit}`);
  return response;
}

export async function followUser(userId: number, token: string) {
  const response = await post(`/api/users/${userId}/follow`, {}, token);
  return response;
}

// Content reporting
export async function reportContent(postId: number, reason: string, description?: string, token?: string) {
  const response = await post('/api/reports', {
    postId,
    reason,
    description,
  }, token);
  return response;
}
