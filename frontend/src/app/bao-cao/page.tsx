'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi } from '@/lib/api'
import { formatCurrency, formatDateShort, formatPhone, parseMoney } from '@/lib/format'
import type { DoanhThuThang, HieuQuaSanPham, KhachHangBaoCao, ThueDo } from '@/types'

type ReportTab = 'doanh_thu' | 'san_pham' | 'phieu_thue' | 'khach_hang'

export default function BaoCaoPage() {
  const toast = useToast()
  const now = new Date()

  const [tab, setTab] = useState<ReportTab>('doanh_thu')
  const [thang, setThang] = useState(now.getMonth() + 1)
  const [nam, setNam] = useState(now.getFullYear())
  const [trangThai, setTrangThai] = useState('')
  const [tuNgay, setTuNgay] = useState('')
  const [denNgay, setDenNgay] = useState('')

  const [doanhThu, setDoanhThu] = useState<DoanhThuThang | null>(null)
  const [sanPhamList, setSanPhamList] = useState<HieuQuaSanPham[]>([])
  const [phieuList, setPhieuList] = useState<ThueDo[]>([])
  const [phieuTotal, setPhieuTotal] = useState(0)
  const [khachList, setKhachList] = useState<KhachHangBaoCao[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadTab = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'doanh_thu') {
        const res = await baoCaoApi.getDoanhThu(thang, nam)
        setDoanhThu(res)
      } else if (tab === 'san_pham') {
        const res = await baoCaoApi.getHieuQuaSanPham()
        setSanPhamList(res)
      } else if (tab === 'phieu_thue') {
        const res = await baoCaoApi.getPhieuThue({
          trang_thai: trangThai || undefined,
          tu_ngay: tuNgay || undefined,
          den_ngay: denNgay || undefined,
          limit: 50,
        })
        setPhieuList(res.data || [])
        setPhieuTotal(res.total || 0)
      } else {
        const res = await baoCaoApi.getKhachHang()
        setKhachList(res)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể tải dữ liệu báo cáo')
    } finally {
      setLoading(false)
    }
  }, [tab, thang, nam, trangThai, tuNgay, denNgay, toast])

  useEffect(() => {
    loadTab()
  }, [loadTab])

  const handleExport = async (format: 'excel' | 'csv') => {
    setExporting(true)
    try {
      const params = {
        loai: tab,
        thang: tab === 'doanh_thu' ? thang : undefined,
        nam: tab === 'doanh_thu' ? nam : undefined,
        trang_thai: tab === 'phieu_thue' && trangThai ? trangThai : undefined,
        tu_ngay: tab === 'phieu_thue' && tuNgay ? tuNgay : undefined,
        den_ngay: tab === 'phieu_thue' && denNgay ? denNgay : undefined,
      }
      const filename =
        format === 'excel'
          ? await baoCaoApi.downloadExcel(params)
          : await baoCaoApi.downloadCSV(params)
      toast.success(`Đã tải xuống ${filename}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xuất báo cáo')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Báo Cáo & Xuất File" backHref="/cai-dat" />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col gap-4 pt-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-margin px-margin">
            {[
              { key: 'doanh_thu' as ReportTab, label: 'Doanh thu', icon: 'payments' },
              { key: 'san_pham' as ReportTab, label: 'Hiệu quả SP', icon: 'auto_awesome' },
              { key: 'phieu_thue' as ReportTab, label: 'Phiếu thuê', icon: 'assignment' },
              { key: 'khach_hang' as ReportTab, label: 'Khách hàng', icon: 'group' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`px-3.5 py-2 rounded-full font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-all ${
                  tab === item.key
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('csv')}
              className="h-9 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-sm font-semibold flex items-center gap-1 hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Xuất CSV
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('excel')}
              className="h-9 px-3.5 rounded-xl bg-primary-container text-on-primary font-label-sm font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">table_view</span>
              Xuất Excel
            </button>
          </div>

          {/* Tab 1: Doanh thu theo tháng */}
          {tab === 'doanh_thu' && (
            <section className="flex flex-col gap-3">
              <div className="p-4 rounded-xl bg-surface-container-lowest shadow-sm grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Tháng</label>
                  <select
                    value={thang}
                    onChange={(e) => setThang(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Năm</label>
                  <input
                    type="number"
                    min={2020}
                    max={2100}
                    value={nam}
                    onChange={(e) => setNam(Number(e.target.value) || now.getFullYear())}
                    className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm"
                  />
                </div>
              </div>

              {loading ? (
                <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
              ) : (
                <div className="p-5 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-4">
                  <div>
                    <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Doanh thu Tháng {doanhThu?.thang}/{doanhThu?.nam}
                    </span>
                    <div className="font-headline-xl text-primary font-bold mt-1 tabular-nums">
                      {formatCurrency(doanhThu?.tong_tien)}
                    </div>
                    <p className="font-label-sm text-outline mt-1">
                      Tính tổng tiền thuê + tiền phạt của các phiếu Đã trả theo ngày trả thực tế (không tính tiền cọc).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-on-surface-variant">Số phiếu đã trả</span>
                      <div className="font-headline-lg text-on-surface font-bold mt-0.5 tabular-nums">
                        {doanhThu?.so_phieu ?? 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low">
                      <span className="font-label-sm text-on-surface-variant">Lượt sản phẩm thuê</span>
                      <div className="font-headline-lg text-on-surface font-bold mt-0.5 tabular-nums">
                        {doanhThu?.so_san_pham ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Hiệu quả sản phẩm */}
          {tab === 'san_pham' && (
            <section className="flex flex-col gap-2.5">
              {loading ? (
                <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
              ) : sanPhamList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface-container-lowest text-center text-on-surface-variant">
                  Chưa có dữ liệu sản phẩm.
                </div>
              ) : (
                sanPhamList.map((sp) => {
                  const dt = parseMoney(sp.tong_doanh_thu)
                  const gg = parseMoney(sp.gia_goc_san_pham)
                  const pct = gg > 0 ? Math.min(100, Math.round((dt / gg) * 100)) : sp.da_thu_hoi_von ? 100 : 0
                  return (
                    <Link
                      key={sp.id}
                      href={`/san-pham/${sp.id}`}
                      className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2 hover:bg-surface-container-low/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-label-sm text-primary-container font-bold">
                            {sp.ma_san_pham}
                          </span>
                          <div className="font-title-sm text-on-surface truncate">
                            {sp.ten_san_pham}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label-sm shrink-0 ${
                            sp.da_thu_hoi_von
                              ? 'bg-[#EAF5EE] text-[#236B48]'
                              : 'bg-[#FFF8E7] text-[#946E18]'
                          }`}
                        >
                          {sp.da_thu_hoi_von ? 'Đã thu hồi vốn' : `${pct}% vốn`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sp.da_thu_hoi_von ? 'bg-[#236B48]' : 'bg-primary-container'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between font-label-sm text-on-surface-variant tabular-nums">
                        <span>{sp.so_lan_thue} lần thuê</span>
                        <span>
                          Doanh thu: <strong className="text-primary-container">{formatCurrency(dt)}</strong> / Gốc:{' '}
                          {formatCurrency(gg)}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </section>
          )}

          {/* Tab 3: Danh sách phiếu thuê */}
          {tab === 'phieu_thue' && (
            <section className="flex flex-col gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Trạng thái</label>
                  <select
                    value={trangThai}
                    onChange={(e) => setTrangThai(e.target.value)}
                    className="h-10 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-sm"
                  >
                    <option value="">Tất cả</option>
                    <option value="1">Chờ xác nhận</option>
                    <option value="2">Đang thuê</option>
                    <option value="3">Đã trả</option>
                    <option value="4">Quá hạn</option>
                    <option value="5">Đã hủy</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Từ ngày tạo</label>
                  <input
                    type="date"
                    value={tuNgay}
                    onChange={(e) => setTuNgay(e.target.value)}
                    className="h-10 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Đến ngày tạo</label>
                  <input
                    type="date"
                    value={denNgay}
                    onChange={(e) => setDenNgay(e.target.value)}
                    className="h-10 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-body-sm"
                  />
                </div>
              </div>

              <div className="font-label-sm text-on-surface-variant px-1">
                Tìm thấy <strong>{phieuTotal}</strong> phiếu thuê
              </div>

              {loading ? (
                <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
              ) : phieuList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface-container-lowest text-center text-on-surface-variant">
                  Không có phiếu thuê trong khoảng lọc này.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {phieuList.map((td) => (
                    <Link
                      key={td.id}
                      href={`/don-thue/${td.id}`}
                      className="p-3.5 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between gap-2 hover:bg-surface-container-low transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-title-sm text-body-md text-primary-container font-bold">
                            {td.ma_phieu_thue}
                          </span>
                          <span className="text-outline">•</span>
                          <span className="font-body-md font-semibold text-on-surface truncate">
                            {td.khach_hang?.ten || 'Khách hàng'}
                          </span>
                        </div>
                        <div className="font-label-sm text-on-surface-variant mt-0.5">
                          {formatDateShort(td.ngay_bat_dau)} → {formatDateShort(td.ngay_hen_tra)} • Thuê:{' '}
                          <strong className="text-on-surface">{formatCurrency(td.tong_tien_thue)}</strong>
                          {parseMoney(td.tien_phat) > 0 && ` • Phạt: ${formatCurrency(td.tien_phat)}`}
                        </div>
                      </div>
                      <ThueDoStatusBadge status={td.trang_thai} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab 4: Danh sách khách hàng */}
          {tab === 'khach_hang' && (
            <section className="flex flex-col gap-2">
              {loading ? (
                <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
              ) : khachList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface-container-lowest text-center text-on-surface-variant">
                  Chưa có dữ liệu khách hàng.
                </div>
              ) : (
                khachList.map((kh) => (
                  <Link
                    key={kh.id}
                    href={`/khach-hang/${kh.id}`}
                    className="p-3.5 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between gap-2 hover:bg-surface-container-low transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-title-sm text-body-md text-on-surface truncate">
                        {kh.ten}
                      </div>
                      <div className="font-label-sm text-on-surface-variant">
                        {formatPhone(kh.so_dien_thoai)}
                        {kh.dia_chi ? ` • ${kh.dia_chi}` : ''}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm font-semibold shrink-0">
                      {kh.so_lan_thue} lần thuê
                    </span>
                  </Link>
                ))
              )}
            </section>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
