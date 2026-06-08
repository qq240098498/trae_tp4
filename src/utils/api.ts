const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('未授权，请重新登录')
  }
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.message || '请求失败')
  }
  return json
}

export const api = {
  get: <T = unknown>(url: string): Promise<T> =>
    fetch(`${BASE_URL}${url}`, { headers: buildHeaders() }).then((r) => handleResponse<T>(r)),

  post: <T = unknown>(url: string, data?: unknown): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    }).then((r) => handleResponse<T>(r)),

  put: <T = unknown>(url: string, data?: unknown): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    }).then((r) => handleResponse<T>(r)),

  delete: <T = unknown>(url: string): Promise<T> =>
    fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    }).then((r) => handleResponse<T>(r)),
}
