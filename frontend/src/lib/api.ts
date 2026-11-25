import type {
  ApiResponse,
  CaiDat,
  DashboardData,
  DoanhThuThang,
  HieuQuaSanPham,
  KhachHang,
  KhachHangBaoCao,
  KhachHangDetail,
  KhachHangListItem,
  LoaiCoc,
  LoginResponse,
  NguoiDung,
  PaginatedResponse,
  SanPham,
  SanPhamDetail,
  SanPhamTrangThai,
  ThueDo,
  XuLyCocResponse,
} from '@/types'

const TOKEN_KEY = 'miumiu_token'
const USER_KEY = 'miumiu_user'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const port = window.location.port
    // Khi chạy qua Nginx (:80 / :443), luôn dùng cùng origin để hỗ trợ truy cập từ điện thoại/LAN
    if (port === '' || port === '80' || port === '443') {
      return `${window.location.origin}/api`
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
}

export function getWsUrl(token: string): string {
  const apiBase = getApiBaseUrl()
  const wsBase = apiBase.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://')
  return `${wsBase}/v1/ws?token=${encodeURIComponent(token)}`
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setStoredAuth(token: string, user: NguoiDung): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function setStoredUser(user: NguoiDung): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUser(): NguoiDung | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as NguoiDung
  } catch {
    return null
  }
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export class ApiError extends Error {
  status: number
  details?: Record<string, string>

  constructor(message: string, status: number, details?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

function extractErrorMessage(payload: unknown, fallback: string): { message: string; details?: Record<string, string> } {
  if (!payload || typeof payload !== 'object') {
    return { message: fallback }
  }
  const obj = payload as Record<string, unknown>
  if (typeof obj.error === 'string' && obj.error.trim()) {
    return { message: obj.error }
  }
  if (obj.error && typeof obj.error === 'object') {
    const map = obj.error as Record<string, string>
    const msgs = Object.values(map).filter((v) => typeof v === 'string' && v.trim())
    if (msgs.length > 0) {
      return { message: msgs.join('. '), details: map }
    }
  }
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return { message: obj.message }
  }
  return { message: fallback }
}

let onUnauthorizedCallback: (() => void) | null = null
export function setUnauthorizedHandler(cb: (() => void) | null) {
  onUnauthorizedCallback = cb
}

async function request<T>(path: string, init: RequestInit = {}, requireAuth = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (requireAuth) {
    const token = getStoredToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (res.status === 401 && requireAuth) {
    clearStoredAuth()
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback()
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  let payload: unknown = null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    payload = await res.json().catch(() => null)
  } else {
    const text = await res.text().catch(() => '')
    payload = text ? { error: text } : null
  }

  if (!res.ok) {
    const { message, details } = extractErrorMessage(payload, `Yêu cầu thất bại (mã ${res.status})`)
    throw new ApiError(message, res.status, details)
  }

  return payload as T
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') {
      qs.set(k, String(v))
    }
  })
  const str = qs.toString()
  return str ? `?${str}` : ''
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  async login(email: string, mat_khau: string): Promise<LoginResponse> {
    const res = await request<ApiResponse<LoginResponse>>(
      '/v1/auth/login',
      { method: 'POST', body: JSON.stringify({ email, mat_khau }) },
      false
    )
    return res.data
  },

  async getMe(): Promise<NguoiDung> {
    const res = await request<ApiResponse<NguoiDung>>('/v1/auth/me')
    return res.data
  },

  async updateMe(data: { ten?: string; mat_khau_cu?: string; mat_khau_moi?: string }): Promise<NguoiDung> {
    const res = await request<ApiResponse<NguoiDung>>('/v1/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.data
  },
}

// ─── Dashboard API ───────────────────────────────────────────────────────────

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const res = await request<ApiResponse<DashboardData>>('/v1/dashboard')
    return res.data
  },
}

// ─── Sản phẩm API ────────────────────────────────────────────────────────────

export interface SanPhamCreatePayload {
  ten_san_pham: string
  hinh_anh?: string | null
  gia_goc_san_pham: number
  gia_thue_ngay: number
}

export interface SanPhamUpdatePayload {
  ma_san_pham?: string
  ten_san_pham?: string
  hinh_anh?: string | null
  gia_goc_san_pham?: number
  gia_thue_ngay?: number
}

export const sanPhamApi = {
  async getAll(params?: {
    search?: string
    trang_thai?: number | string
    exclude_bao_duong?: boolean
    sort?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<SanPham>> {
    return request<PaginatedResponse<SanPham>>(`/v1/san-pham${buildQuery(params)}`)
  },

  async getById(id: number | string): Promise<SanPhamDetail> {
    const res = await request<ApiResponse<SanPhamDetail>>(`/v1/san-pham/${id}`)
    return res.data
  },

  async create(data: SanPhamCreatePayload): Promise<SanPham> {
    const res = await request<ApiResponse<SanPham>>('/v1/san-pham', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async update(id: number | string, data: SanPhamUpdatePayload): Promise<SanPham> {
    const res = await request<ApiResponse<SanPham>>(`/v1/san-pham/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async delete(id: number | string): Promise<void> {
    await request(`/v1/san-pham/${id}`, { method: 'DELETE' })
  },

  async patchTrangThai(id: number | string, trang_thai: SanPhamTrangThai): Promise<SanPham> {
    const res = await request<ApiResponse<SanPham>>(`/v1/san-pham/${id}/trang-thai`, {
      method: 'PATCH',
      body: JSON.stringify({ trang_thai }),
    })
    return res.data
  },
}

// ─── Khách hàng API ──────────────────────────────────────────────────────────

export const khachHangApi = {
  async getAll(params?: {
    search?: string
    filter?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<KhachHangListItem>> {
    return request<PaginatedResponse<KhachHangListItem>>(`/v1/khach-hang${buildQuery(params)}`)
  },

  async getById(id: number | string): Promise<KhachHangDetail> {
    const res = await request<ApiResponse<KhachHangDetail>>(`/v1/khach-hang/${id}`)
    return res.data
  },

  async create(data: { ten: string; so_dien_thoai: string; dia_chi?: string | null }): Promise<KhachHang> {
    const res = await request<ApiResponse<KhachHang>>('/v1/khach-hang', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async timTheoSDT(data: {
    so_dien_thoai: string
    ten?: string
    dia_chi?: string | null
  }): Promise<{ data: KhachHang; is_new: boolean }> {
    return request<{ data: KhachHang; is_new: boolean }>('/v1/khach-hang/tim-theo-sdt', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(
    id: number | string,
    data: { ten?: string; so_dien_thoai?: string; dia_chi?: string | null }
  ): Promise<KhachHang> {
    const res = await request<ApiResponse<KhachHang>>(`/v1/khach-hang/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async delete(id: number | string): Promise<void> {
    await request(`/v1/khach-hang/${id}`, { method: 'DELETE' })
  },
}

// ─── Phiếu thuê API ──────────────────────────────────────────────────────────

export interface CreateThueDoPayload {
  khach_hang_id: number
  ngay_bat_dau?: string
  ngay_hen_tra?: string
  so_ngay_thue: number
  loai_coc: LoaiCoc
  tien_coc: number
  ghi_chu?: string | null
  chi_tiet: { san_pham_id: number }[]
}

export interface UpdateThueDoPayload {
  ngay_bat_dau?: string
  ngay_hen_tra?: string
  so_ngay_thue?: number
  loai_coc?: LoaiCoc
  tien_coc?: number
  tien_phat?: number
  ghi_chu?: string | null
  chi_tiet?: { san_pham_id: number }[]
}

export const thueDoApi = {
  async getAll(params?: {
    trang_thai?: number | string
    khach_hang_id?: number | string
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<ThueDo>> {
    return request<PaginatedResponse<ThueDo>>(`/v1/thue-do${buildQuery(params)}`)
  },

  async getById(id: number | string): Promise<ThueDo> {
    const res = await request<ApiResponse<ThueDo>>(`/v1/thue-do/${id}`)
    return res.data
  },

  async create(data: CreateThueDoPayload): Promise<ThueDo> {
    const res = await request<ApiResponse<ThueDo>>('/v1/thue-do', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async update(id: number | string, data: UpdateThueDoPayload): Promise<ThueDo> {
    const res = await request<ApiResponse<ThueDo>>(`/v1/thue-do/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return res.data
  },

  async giaoDo(
    id: number | string,
    data?: { loai_coc?: LoaiCoc; tien_coc?: number; ghi_chu?: string }
  ): Promise<ThueDo> {
    const res = await request<ApiResponse<ThueDo>>(`/v1/thue-do/${id}/giao-do`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
    return res.data
  },

  async traDo(
    id: number | string,
    data: {
      tien_phat: number
      ghi_chu?: string | null
      san_pham_trang_thai: { san_pham_id: number; trang_thai: 1 | 3 }[]
    }
  ): Promise<{ data: ThueDo; xu_ly_coc: XuLyCocResponse }> {
    return request<{ data: ThueDo; xu_ly_coc: XuLyCocResponse }>(`/v1/thue-do/${id}/tra-do`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async huy(id: number | string, ghi_chu: string): Promise<ThueDo> {
    const res = await request<ApiResponse<ThueDo>>(`/v1/thue-do/${id}/huy`, {
      method: 'POST',
      body: JSON.stringify({ ghi_chu }),
    })
    return res.data
  },
}

// ─── Cài đặt API ─────────────────────────────────────────────────────────────

export const caiDatApi = {
  async getAll(): Promise<CaiDat[]> {
    const res = await request<ApiResponse<CaiDat[]>>('/v1/cai-dat')
    return res.data || []
  },

  async updateByKhoa(khoa: string, gia_tri: string): Promise<CaiDat> {
    const res = await request<ApiResponse<CaiDat>>(`/v1/cai-dat/${encodeURIComponent(khoa)}`, {
      method: 'PUT',
      body: JSON.stringify({ gia_tri }),
    })
    return res.data
  },
}

// ─── Báo cáo & Xuất file API ─────────────────────────────────────────────────

async function downloadFile(path: string, fallbackName: string): Promise<string> {
  const token = getStoredToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, { headers })
  if (res.status === 401) {
    clearStoredAuth()
    if (onUnauthorizedCallback) onUnauthorizedCallback()
    throw new ApiError('Phiên đăng nhập đã hết hạn', 401)
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const { message } = extractErrorMessage(payload, 'Không thể tải tệp báo cáo')
    throw new ApiError(message, res.status)
  }

  const disp = res.headers.get('content-disposition') || ''
  const match = disp.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || fallbackName

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
  return filename
}

export const baoCaoApi = {
  async getDoanhThu(thang?: number, nam?: number): Promise<DoanhThuThang> {
    const res = await request<ApiResponse<DoanhThuThang>>(
      `/v1/bao-cao/doanh-thu${buildQuery({ thang, nam })}`
    )
    return res.data
  },

  async getPhieuThue(params?: {
    trang_thai?: number | string
    tu_ngay?: string
    den_ngay?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<ThueDo>> {
    return request<PaginatedResponse<ThueDo>>(`/v1/bao-cao/phieu-thue${buildQuery(params)}`)
  },

  async getHieuQuaSanPham(): Promise<HieuQuaSanPham[]> {
    const res = await request<ApiResponse<HieuQuaSanPham[]>>('/v1/bao-cao/hieu-qua-san-pham')
    return res.data || []
  },

  async getKhachHang(): Promise<KhachHangBaoCao[]> {
    const res = await request<ApiResponse<KhachHangBaoCao[]>>('/v1/bao-cao/khach-hang')
    return res.data || []
  },

  async downloadExcel(params: {
    loai: 'doanh_thu' | 'san_pham' | 'khach_hang' | 'phieu_thue'
    thang?: number
    nam?: number
    trang_thai?: number | string
    tu_ngay?: string
    den_ngay?: string
  }): Promise<string> {
    return downloadFile(`/v1/bao-cao/xuat-excel${buildQuery(params)}`, `${params.loai}.xlsx`)
  },

  async downloadCSV(params: {
    loai: 'doanh_thu' | 'san_pham' | 'khach_hang' | 'phieu_thue'
    thang?: number
    nam?: number
    trang_thai?: number | string
    tu_ngay?: string
    den_ngay?: string
  }): Promise<string> {
    return downloadFile(`/v1/bao-cao/xuat-csv${buildQuery(params)}`, `${params.loai}.csv`)
  },
}
