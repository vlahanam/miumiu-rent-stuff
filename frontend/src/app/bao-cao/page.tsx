'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import DateInput from '@/components/DateInput'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi } from '@/lib/api'
import { formatCurrency, formatDate, formatPhone, parseMoney } from '@/lib/format'
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

  const spRecoveredCount = sanPhamList.filter((s) => s.da_thu_hoi_von).length
  const spTotalRevenue = sanPhamList.reduce((acc, s) => acc + parseMoney(s.tong_doanh_thu), 0)

  return (
    <AppShell
      title="Báo Cáo & Xuất File"
      subtitle="Thống kê doanh thu, hiệu quả sản phẩm và xuất Excel/CSV"
      backHref="/cai-dat"
      hideBackOnDesktop
      rightSlot={
        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('csv')}
            className="h-9 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/25 text-on-surface font-label-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">description</span>
            Xuất CSV
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('excel')}
            className="h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[17px]">table_view</span>
            Xuất Excel
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 lg:gap-5">
        {/* Tabs + Mobile Export */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap no-scrollbar -mx-margin px-margin lg:mx-0 lg:px-0">
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
                className={`px-3.5 lg:px-4 py-2 rounded-full lg:rounded-xl font-label-md text-label-md shrink-0 flex items-center gap-1.5 transition-all ${
                  tab === item.key
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile Export Buttons */}
          <div className="grid grid-cols-2 lg:hidden gap-2 w-full">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('csv')}
              className="w-full h-9 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-high disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Xuất CSV
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExport('excel')}
              className="w-full h-9 px-3.5 rounded-xl bg-primary-container text-on-primary font-label-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">table_view</span>
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Tab 1: Doanh thu theo tháng */}
        {tab === 'doanh_thu' && (
          <section className="flex flex-col gap-4">
            <div className="p-4 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm grid grid-cols-2 lg:flex lg:items-end gap-3 lg:gap-4">
              <div className="flex flex-col gap-1 lg:w-44">
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
              <div className="flex flex-col gap-1 lg:w-36">
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
              <div className="hidden lg:block flex-1 text-right font-body-sm text-on-surface-variant pb-2">
                Tính theo ngày trả thực tế của phiếu đã hoàn tất (tiền thuê + tiền phạt, không gồm cọc).
              </div>
            </div>

            {loading ? (
              <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 p-5 lg:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Doanh thu Tháng {doanhThu?.thang}/{doanhThu?.nam}
                    </span>
                    <div className="font-headline-xl lg:text-[36px] lg:leading-tight text-primary font-bold mt-1.5 tabular-nums">
                      {formatCurrency(doanhThu?.tong_tien)}
                    </div>
                  </div>
                  <p className="font-label-sm text-outline">
                    Tổng tiền thuê + tiền phạt của các phiếu Đã trả (không tính tiền cọc).
                  </p>
                </div>

                <div className="lg:col-span-6 grid grid-cols-2 gap-3 lg:gap-4">
                  <div className="p-4 lg:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[21px]">assignment_turned_in</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-on-surface-variant">Số phiếu đã trả</span>
                      <div className="font-headline-lg lg:text-[32px] text-on-surface font-bold mt-1 tabular-nums">
                        {doanhThu?.so_phieu ?? 0}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 lg:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                    <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[21px]">checkroom</span>
                    </div>
                    <div>
                      <span className="font-label-sm text-on-surface-variant">Lượt sản phẩm thuê</span>
                      <div className="font-headline-lg lg:text-[32px] text-on-surface font-bold mt-1 tabular-nums">
                        {doanhThu?.so_san_pham ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Hiệu quả sản phẩm */}
        {tab === 'san_pham' && (
          <section className="flex flex-col gap-4">
            {!loading && sanPhamList.length > 0 && (
              <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                  <span className="font-label-sm text-on-surface-variant">Tổng sản phẩm theo dõi</span>
                  <div className="font-headline-lg text-[24px] font-bold text-on-surface mt-1 tabular-nums">
                    {sanPhamList.length} sản phẩm
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#236B48]/15 shadow-sm">
                  <span className="font-label-sm text-on-tertiary-fixed-variant">Đã thu hồi vốn</span>
                  <div className="font-headline-lg text-[24px] font-bold text-[#236B48] mt-1 tabular-nums">
                    {spRecoveredCount} / {sanPhamList.length}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
                  <span className="font-label-sm text-on-surface-variant">Tổng doanh thu ghi nhận</span>
                  <div className="font-headline-lg text-[24px] font-bold text-primary-container mt-1 tabular-nums">
                    {formatCurrency(spTotalRevenue)}
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
            ) : sanPhamList.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center text-on-surface-variant">
                Chưa có dữ liệu sản phẩm.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="flex lg:hidden flex-col gap-2.5">
                  {sanPhamList.map((sp) => {
                    const dt = parseMoney(sp.tong_doanh_thu)
                    const gg = parseMoney(sp.gia_goc_san_pham)
                    const pct =
                      gg > 0 ? Math.min(100, Math.round((dt / gg) * 100)) : sp.da_thu_hoi_von ? 100 : 0
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
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="py-3.5 pl-5 pr-3">Mã SP</th>
                          <th className="py-3.5 px-3">Tên sản phẩm</th>
                          <th className="py-3.5 px-3 text-center">Số lần thuê</th>
                          <th className="py-3.5 px-3 text-right">Giá gốc</th>
                          <th className="py-3.5 px-3 text-right">Tổng doanh thu</th>
                          <th className="py-3.5 pl-3 pr-5">Thu hồi vốn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15">
                        {sanPhamList.map((sp) => {
                          const dt = parseMoney(sp.tong_doanh_thu)
                          const gg = parseMoney(sp.gia_goc_san_pham)
                          const pct =
                            gg > 0 ? Math.min(100, Math.round((dt / gg) * 100)) : sp.da_thu_hoi_von ? 100 : 0
                          return (
                            <tr key={sp.id} className="hover:bg-surface-container-low/60 transition-colors">
                              <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                                <Link
                                  href={`/san-pham/${sp.id}`}
                                  className="font-label-md text-primary-container hover:text-primary font-bold transition-colors"
                                >
                                  {sp.ma_san_pham}
                                </Link>
                              </td>
                              <td className="py-3.5 px-3">
                                <Link
                                  href={`/san-pham/${sp.id}`}
                                  className="font-body-md font-medium text-on-surface hover:text-primary-container transition-colors"
                                >
                                  {sp.ten_san_pham}
                                </Link>
                              </td>
                              <td className="py-3.5 px-3 text-center font-body-sm font-semibold tabular-nums">
                                {sp.so_lan_thue} lần
                              </td>
                              <td className="py-3.5 px-3 text-right font-body-sm text-on-surface-variant tabular-nums whitespace-nowrap">
                                {formatCurrency(gg)}
                              </td>
                              <td className="py-3.5 px-3 text-right font-currency-lg text-[14px] text-primary-container font-bold tabular-nums whitespace-nowrap">
                                {formatCurrency(dt)}
                              </td>
                              <td className="py-3.5 pl-3 pr-5 min-w-[200px]">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        sp.da_thu_hoi_von ? 'bg-[#236B48]' : 'bg-primary-container'
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-label-sm shrink-0 ${
                                      sp.da_thu_hoi_von
                                        ? 'bg-[#EAF5EE] text-[#236B48]'
                                        : 'bg-[#FFF8E7] text-[#946E18]'
                                    }`}
                                  >
                                    {sp.da_thu_hoi_von ? 'Đã thu hồi' : `${pct}%`}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Tab 3: Danh sách phiếu thuê */}
        {tab === 'phieu_thue' && (
          <section className="flex flex-col gap-3.5">
            <div className="p-4 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Trạng thái</label>
                <select
                  value={trangThai}
                  onChange={(e) => setTrangThai(e.target.value)}
                  className="h-10 px-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm"
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
                <DateInput
                  mode="date"
                  clearable
                  aria-label="Từ ngày tạo"
                  value={tuNgay}
                  onChange={setTuNgay}
                  className="h-10 pl-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Đến ngày tạo</label>
                <DateInput
                  mode="date"
                  clearable
                  aria-label="Đến ngày tạo"
                  value={denNgay}
                  onChange={setDenNgay}
                  className="h-10 pl-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                />
              </div>
              <div className="font-label-md text-on-surface-variant lg:text-right pb-2">
                Tìm thấy <strong className="text-primary-container">{phieuTotal}</strong> phiếu thuê
              </div>
            </div>

            {loading ? (
              <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
            ) : phieuList.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center text-on-surface-variant">
                Không có phiếu thuê trong khoảng lọc này.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="flex lg:hidden flex-col gap-2">
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
                          {formatDate(td.ngay_bat_dau)} → {formatDate(td.ngay_hen_tra)} • Thuê:{' '}
                          <strong className="text-on-surface">{formatCurrency(td.tong_tien_thue)}</strong>
                          {parseMoney(td.tien_phat) > 0 && ` • Phạt: ${formatCurrency(td.tien_phat)}`}
                        </div>
                      </div>
                      <ThueDoStatusBadge status={td.trang_thai} />
                    </Link>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="py-3.5 pl-5 pr-3">Mã phiếu</th>
                          <th className="py-3.5 px-3">Khách hàng</th>
                          <th className="py-3.5 px-3">Thời gian thuê</th>
                          <th className="py-3.5 px-3 text-right">Tiền thuê</th>
                          <th className="py-3.5 px-3 text-right">Tiền phạt</th>
                          <th className="py-3.5 pl-3 pr-5 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15">
                        {phieuList.map((td) => (
                          <tr key={td.id} className="hover:bg-surface-container-low/60 transition-colors">
                            <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                              <Link
                                href={`/don-thue/${td.id}`}
                                className="font-title-sm text-[14px] text-primary-container hover:text-primary font-bold transition-colors"
                              >
                                {td.ma_phieu_thue}
                              </Link>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className="font-body-md font-medium text-on-surface">
                                {td.khach_hang?.ten || 'Khách hàng'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-body-sm text-on-surface-variant whitespace-nowrap tabular-nums">
                              {formatDate(td.ngay_bat_dau)} → {formatDate(td.ngay_hen_tra)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-currency-lg text-[14px] text-on-surface font-bold tabular-nums whitespace-nowrap">
                              {formatCurrency(td.tong_tien_thue)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-body-sm tabular-nums whitespace-nowrap">
                              <span className={parseMoney(td.tien_phat) > 0 ? 'text-error font-semibold' : 'text-outline'}>
                                {formatCurrency(td.tien_phat)}
                              </span>
                            </td>
                            <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                              <ThueDoStatusBadge status={td.trang_thai} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Tab 4: Danh sách khách hàng */}
        {tab === 'khach_hang' && (
          <section className="flex flex-col gap-2.5">
            {loading ? (
              <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" />
            ) : khachList.length === 0 ? (
              <div className="p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center text-on-surface-variant">
                Chưa có dữ liệu khách hàng.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="flex lg:hidden flex-col gap-2">
                  {khachList.map((kh) => (
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
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                          <th className="py-3.5 pl-5 pr-3">Tên khách hàng</th>
                          <th className="py-3.5 px-3">Số điện thoại</th>
                          <th className="py-3.5 px-3">Địa chỉ</th>
                          <th className="py-3.5 pl-3 pr-5 text-right">Số lần thuê hoàn tất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15">
                        {khachList.map((kh) => (
                          <tr key={kh.id} className="hover:bg-surface-container-low/60 transition-colors">
                            <td className="py-3.5 pl-5 pr-3">
                              <Link
                                href={`/khach-hang/${kh.id}`}
                                className="font-title-sm text-[14px] text-on-surface hover:text-primary-container transition-colors"
                              >
                                {kh.ten}
                              </Link>
                            </td>
                            <td className="py-3.5 px-3 font-body-sm text-on-surface tabular-nums whitespace-nowrap">
                              {formatPhone(kh.so_dien_thoai)}
                            </td>
                            <td className="py-3.5 px-3 font-body-sm text-on-surface-variant">
                              {kh.dia_chi || '—'}
                            </td>
                            <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm font-semibold tabular-nums">
                                {kh.so_lan_thue} lần thuê
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
