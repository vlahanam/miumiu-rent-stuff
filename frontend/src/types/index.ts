// Các kiểu dữ liệu khớp 100% với JSON tiếng Việt từ Backend Go

export type SanPhamTrangThai = 1 | 2 | 3
export type ThueDoTrangThai = 1 | 2 | 3 | 4 | 5
export type LoaiCoc = 1 | 2 | 3
export type CaiDatKieuDuLieu = 1 | 2 | 3 | 4

export interface NguoiDung {
  id: number
  ten: string
  email: string
  ngay_tao: string
  ngay_cap_nhat: string
}

export interface LoginResponse {
  token: string
  nguoi_dung: NguoiDung
}

export interface SanPham {
  id: number
  ma_san_pham: string
  ten_san_pham: string
  slug: string
  hinh_anh: string | null
  gia_goc_san_pham: string | number
  gia_thue_ngay: string | number
  trang_thai: SanPhamTrangThai
  ngay_tao: string
  ngay_cap_nhat: string
}

export interface LichSuThueSanPham {
  thue_do_id: number
  ma_phieu_thue: string
  ten_khach_hang: string
  ngay_bat_dau: string | null
  ngay_hen_tra: string | null
  ngay_tra_thuc_te: string | null
  trang_thai: ThueDoTrangThai
}

export interface SanPhamDetail extends SanPham {
  so_lan_thue: number
  tong_doanh_thu: string | number
  da_thu_hoi_von: boolean
  lich_su_thue: LichSuThueSanPham[]
}

export interface KhachHang {
  id: number
  ten: string
  so_dien_thoai: string
  dia_chi: string | null
  ngay_tao: string
  ngay_cap_nhat: string
}

export interface KhachHangListItem extends KhachHang {
  so_lan_thue: number
  so_phieu_dang_thue: number
}

export interface KhachHangDetail {
  khach_hang: KhachHang
  so_lan_thue: number
  dang_thue: ThueDo[]
  lich_su: ThueDo[]
}

export interface ChiTietThueDo {
  id: number
  thue_do_id: number
  san_pham_id: number
  gia_thue_ngay: string | number
  tien_coc: string | number
  san_pham?: SanPham
}

export interface ThueDo {
  id: number
  ma_phieu_thue: string
  khach_hang_id: number
  nguoi_dung_id: number
  ngay_bat_dau: string | null
  ngay_hen_tra: string | null
  so_ngay_thue: number | null
  ngay_tra_thuc_te: string | null
  tong_tien_thue: string | number
  loai_coc: LoaiCoc
  tien_coc: string | number
  tien_phat: string | number
  tien_ship: string | number
  trang_thai: ThueDoTrangThai
  ghi_chu: string | null
  ngay_tao: string
  ngay_cap_nhat: string
  khach_hang?: KhachHang
  nguoi_dung?: NguoiDung
  chi_tiet?: ChiTietThueDo[]
}

export interface XuLyCocResponse {
  loai_coc: LoaiCoc
  tien_coc: string | number
  tien_phat: string | number
  hoan_lai: string | number
  ghi_chu?: string
}

export interface CaiDat {
  id: number
  khoa: string
  gia_tri: string | null
  kieu_du_lieu: CaiDatKieuDuLieu
  mo_ta: string | null
  ngay_tao: string
  ngay_cap_nhat: string
}

export interface DashboardData {
  phieu_qua_han: ThueDo[]
  phieu_can_tra_hom_nay: ThueDo[]
  phieu_dat_truoc_sap_den: ThueDo[]
  so_san_pham: {
    trong_lich: number
    da_cho_thue: number
    dang_bao_duong: number
  }
  thong_ke_phieu?: {
    qua_han: number
    dang_thue: number
    cho_xac_nhan: number
  }
  doanh_thu_thang_nay: string | number
  doanh_thu_thang_truoc?: string | number
  so_phieu_thang_nay?: number
}

export interface DoanhThuThang {
  thang: number
  nam: number
  tong_tien: string | number
  so_phieu: number
  so_san_pham: number
}

export interface HieuQuaSanPham {
  id: number
  ma_san_pham: string
  ten_san_pham: string
  gia_goc_san_pham: string | number
  so_lan_thue: number
  tong_doanh_thu: string | number
  da_thu_hoi_von: boolean
}

export interface KhachHangBaoCao {
  id: number
  ten: string
  so_dien_thoai: string
  dia_chi: string
  so_lan_thue: number
}

export interface ApiResponse<T> {
  data: T
  error?: string | Record<string, string>
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface WSEvent {
  loai: 'phieu_moi' | 'phieu_cap_nhat' | 'phieu_qua_han' | 'san_pham_doi_trang_thai' | string
  data: unknown
}

export const SAN_PHAM_TRANG_THAI_LABELS: Record<SanPhamTrangThai, string> = {
  1: 'Trống lịch',
  2: 'Đã cho thuê',
  3: 'Đang bảo dưỡng',
}

export const THUE_DO_TRANG_THAI_LABELS: Record<ThueDoTrangThai, string> = {
  1: 'Chờ xác nhận',
  2: 'Đang thuê',
  3: 'Đã trả',
  4: 'Quá hạn',
  5: 'Đã hủy',
}

export const LOAI_COC_LABELS: Record<LoaiCoc, string> = {
  1: 'Tiền mặt',
  2: 'Chuyển khoản',
  3: 'Giữ CCCD',
}
