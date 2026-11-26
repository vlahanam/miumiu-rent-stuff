'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ProductImage from '@/components/ProductImage'
import { getThueDoStyle, ThueDoStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi, dashboardApi, thueDoApi } from '@/lib/api'
import {
  daysOverdue,
  daysRemaining,
  formatCurrency,
  formatDate,
  formatPhone,
  parseMoney,
} from '@/lib/format'
import { LOAI_COC_LABELS, type ThueDo } from '@/types'

const filterChips = [
  { key: '', label: 'Tất cả', dot: '' },
  { key: '4', label: 'Quá hạn', dot: 'bg-[#C5283D]' },
  { key: '2', label: 'Đang thuê', dot: 'bg-[#B57300]' },
  { key: '1', label: 'Chờ xác nhận', dot: 'bg-[#C99A5B]' },
  { key: '3', label: 'Đã trả', dot: 'bg-[#236B48]' },
  { key: '5', label: 'Đã hủy', dot: 'bg-[#61556C]' },
]

export default function DonThuePage() {
  const toast = useToast()
  const [orders, setOrders] = useState<ThueDo[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState({ quaHan: 0, dangThue: 0, choXacNhan: 0 })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadStats = useCallback(async () => {
    try {
      const dash = await dashboardApi.get()
      setStats({
        quaHan: dash.thong_ke_phieu?.qua_han ?? dash.phieu_qua_han.length,
        dangThue: dash.thong_ke_phieu?.dang_thue ?? 0,
        choXacNhan: dash.thong_ke_phieu?.cho_xac_nhan ?? 0,
      })
    } catch {
      // Bỏ qua
    }
  }, [])

  const loadOrders = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const res = await thueDoApi.getAll({
          trang_thai: statusFilter || undefined,
          search: debouncedSearch || undefined,
          page: pageNum,
          limit: 20,
        })
        const rows = res.data || []
        setOrders((prev) => (append ? [...prev, ...rows] : rows))
        setTotal(res.total || 0)
        setPage(pageNum)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không thể tải danh sách đơn thuê')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [statusFilter, debouncedSearch, toast]
  )

  useEffect(() => {
    loadOrders(1, false)
  }, [loadOrders])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useWSEvents(() => {
    loadOrders(1, false)
    loadStats()
  })

  const handleExport = async (format: 'excel' | 'csv') => {
    setExporting(true)
    try {
      const params = {
        loai: 'phieu_thue' as const,
        trang_thai: statusFilter || undefined,
      }
      const name =
        format === 'excel'
          ? await baoCaoApi.downloadExcel(params)
          : await baoCaoApi.downloadCSV(params)
      toast.success(`Đã xuất tệp ${name}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xuất file')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell
      title="Đơn Thuê"
      subtitle={`${total} phiếu thuê phù hợp`}
      fab
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('csv')}
            title="Xuất danh sách CSV"
            className="hidden lg:inline-flex h-9 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/25 font-label-md items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[1.0625rem]">description</span>
            <span>CSV</span>
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('excel')}
            title="Xuất danh sách Excel"
            className="h-8 lg:h-9 px-2.5 lg:px-3.5 rounded-full lg:rounded-xl bg-surface-container text-primary-container hover:bg-primary-fixed font-label-sm lg:font-label-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[1rem] lg:text-[1.125rem]">file_download</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <Link
            href="/don-thue/tao-moi"
            className="hidden lg:inline-flex h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold whitespace-nowrap items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[1.125rem]">add</span>
            <span>Tạo đơn thuê</span>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col w-full gap-space-md lg:gap-5">
        {/* Desktop Top KPI Cards (also shown compactly on mobile below filters) */}
        <section className="hidden lg:grid lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '4' ? '' : '4'))}
            className={`p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
              statusFilter === '4'
                ? 'bg-[#FDE8EB]/60 border-error/40 shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low/60'
            }`}
          >
            <div>
              <div className="font-label-sm text-on-surface-variant">Quá hạn trả áo</div>
              <div className="font-headline-xl text-[1.625rem] font-bold text-error tabular-nums mt-0.5">
                {stats.quaHan}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#FDE8EB] text-[#C5283D] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[1.375rem]">warning</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '2' ? '' : '2'))}
            className={`p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
              statusFilter === '2'
                ? 'bg-[#FEF4E6]/70 border-secondary/40 shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low/60'
            }`}
          >
            <div>
              <div className="font-label-sm text-on-surface-variant">Đang cho thuê</div>
              <div className="font-headline-xl text-[1.625rem] font-bold text-primary-container tabular-nums mt-0.5">
                {stats.dangThue}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#FEF4E6] text-[#B57300] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[1.375rem]">shopping_bag</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '1' ? '' : '1'))}
            className={`p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all border ${
              statusFilter === '1'
                ? 'bg-[#FFF8E7] border-secondary-fixed-dim shadow-sm'
                : 'bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low/60'
            }`}
          >
            <div>
              <div className="font-label-sm text-on-surface-variant">Chờ xác nhận / Đặt trước</div>
              <div className="font-headline-xl text-[1.625rem] font-bold text-secondary tabular-nums mt-0.5">
                {stats.choXacNhan}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#FFF8E7] text-[#946E18] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[1.375rem]">event_upcoming</span>
            </div>
          </button>
        </section>

        {/* Search & Filter Toolbar */}
        <section className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm lg:gap-3 lg:p-3.5 lg:rounded-2xl lg:bg-surface-container-lowest lg:border lg:border-outline-variant/20 lg:shadow-sm">
          {/* Search Bar */}
          <div className="flex items-center gap-space-xs bg-surface-container-lowest lg:bg-surface-container-low rounded-xl px-2 shadow-sm lg:shadow-none border border-outline-variant/25 xl:w-80 2xl:w-96 shrink-0">
            <div className="w-9 h-10 flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[1.3125rem]">search</span>
            </div>
            <input
              className="flex-1 bg-transparent border-0 outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline py-2.5 min-w-0"
              placeholder="Tìm mã phiếu (DT-...), tên khách, SĐT..."
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface shrink-0"
              >
                <span className="material-symbols-outlined text-[1.125rem]">close</span>
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap no-scrollbar py-1 lg:py-0 -mx-margin px-margin lg:mx-0 lg:px-0">
            {filterChips.map((chip) => {
              const active = statusFilter === chip.key
              return (
                <button
                  key={chip.key || 'all'}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  className={`px-3.5 py-1.5 font-label-md text-label-md shrink-0 flex items-center gap-1.5 active:scale-95 rounded-full transition-all ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest lg:bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  {chip.dot && <span className={`w-2 h-2 rounded-full ${chip.dot} inline-block`} />}
                  <span>{chip.label}</span>
                  {active && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 font-label-sm text-[0.625rem] leading-tight font-bold">
                      {total}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Mobile Summary KPI */}
        <section className="grid lg:hidden grid-cols-3 gap-2 bg-surface-container-low rounded-xl p-2 shadow-[0_2px_12px_rgba(107,33,63,0.03)]">
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '4' ? '' : '4'))}
            className={`min-w-0 flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-center ${
              statusFilter === '4' ? 'bg-surface-container-lowest shadow-sm' : 'hover:bg-surface-container-lowest'
            }`}
          >
            <span className="font-headline-md text-headline-md font-bold text-error tabular-nums">
              {stats.quaHan}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate max-w-full">
              Quá hạn
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '2' ? '' : '2'))}
            className={`min-w-0 flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-center ${
              statusFilter === '2' ? 'bg-surface-container-lowest shadow-sm' : 'hover:bg-surface-container-lowest'
            }`}
          >
            <span className="font-headline-md text-headline-md font-bold text-primary-container tabular-nums">
              {stats.dangThue}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-0.5 truncate max-w-full">
              Đang thuê
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === '1' ? '' : '1'))}
            className={`min-w-0 flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-center ${
              statusFilter === '1' ? 'bg-surface-container-lowest shadow-sm' : 'hover:bg-surface-container-lowest'
            }`}
          >
            <span className="font-headline-md text-headline-md font-bold text-secondary tabular-nums">
              {stats.choXacNhan}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 truncate max-w-full">
              Chờ xác nhận
            </span>
          </button>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-32 lg:h-20 rounded-xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="py-12 lg:py-16 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-2.5">
            <span className="material-symbols-outlined text-[2.625rem] text-outline">receipt_long</span>
            <h3 className="font-title-sm text-title-sm text-on-surface">Chưa có đơn thuê nào</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {debouncedSearch || statusFilter
                ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Nhấn nút "Thêm đơn thuê" để lập phiếu mới.'}
            </p>
            {!debouncedSearch && !statusFilter && (
              <Link
                href="/don-thue/tao-moi"
                className="mt-1 px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md whitespace-nowrap hover:bg-primary transition-colors"
              >
                + Tạo đơn thuê mới
              </Link>
            )}
          </div>
        )}

        {/* Mobile Order Cards */}
        {!loading && orders.length > 0 && (
          <section className="flex lg:hidden flex-col gap-space-md">
            {orders.map((order) => {
              const style = getThueDoStyle(order.trang_thai)
              const firstSP = order.chi_tiet?.[0]?.san_pham
              const extraCount = Math.max(0, (order.chi_tiet?.length || 0) - 1)
              const lateDays = order.trang_thai === 4 ? daysOverdue(order.ngay_hen_tra) : 0
              const leftDays = order.trang_thai === 2 ? daysRemaining(order.ngay_hen_tra) : 0
              const tienShip = parseMoney(order.tien_ship)
              const totalRevenue = parseMoney(order.tong_tien_thue) + parseMoney(order.tien_phat)

              return (
                <article
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05),0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col gap-space-sm relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.border}`} />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/don-thue/${order.id}`}
                        className="flex items-center gap-1.5 flex-wrap"
                      >
                        <span className="font-title-sm text-title-sm text-primary-container font-bold tracking-tight">
                          {order.ma_phieu_thue}
                        </span>
                        <span className="text-outline text-[0.75rem]">•</span>
                        <span className="font-title-sm text-title-sm text-on-surface font-bold truncate">
                          {order.khach_hang?.ten || 'Khách hàng'}
                        </span>
                      </Link>
                      {order.khach_hang?.so_dien_thoai && (
                        <a
                          href={`tel:${order.khach_hang.so_dien_thoai}`}
                          className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 hover:text-primary w-fit"
                        >
                          <span className="material-symbols-outlined text-[0.875rem]">call</span>
                          <span>{formatPhone(order.khach_hang.so_dien_thoai)}</span>
                        </a>
                      )}
                    </div>
                    <ThueDoStatusBadge status={order.trang_thai} />
                  </div>

                  {/* Body */}
                  <Link
                    href={`/don-thue/${order.id}`}
                    className="flex gap-space-sm items-center bg-surface-container-low p-2.5 rounded-lg ml-1 hover:bg-surface-container transition-colors"
                  >
                    <div className="w-12 h-14 rounded-md overflow-hidden bg-surface-container shrink-0">
                      <ProductImage
                        hinhAnh={firstSP?.hinh_anh}
                        alt={firstSP?.ten_san_pham || 'Trang phục'}
                        className="w-12 h-14"
                        iconSize={20}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">
                        {firstSP?.ten_san_pham || `${order.chi_tiet?.length || 0} sản phẩm`}
                      </span>
                      {extraCount > 0 && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                          + {extraCount} sản phẩm khác
                        </span>
                      )}
                      <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        <span className="material-symbols-outlined text-[0.875rem] shrink-0">calendar_today</span>
                        <span>
                          {formatDate(order.ngay_bat_dau)} → {formatDate(order.ngay_hen_tra)} (
                          {order.so_ngay_thue || 1} ngày)
                        </span>
                      </div>
                      {order.trang_thai === 4 && (
                        <span className="font-label-sm text-label-sm font-semibold text-error flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[0.8125rem]">warning</span>
                          Trễ {lateDays} ngày
                        </span>
                      )}
                      {order.trang_thai === 2 && (
                        <span className="font-label-sm text-label-sm font-medium text-secondary mt-0.5">
                          {leftDays > 0 ? `Còn ${leftDays} ngày` : 'Đến hạn hôm nay'} •{' '}
                          {LOAI_COC_LABELS[order.loai_coc]}
                          {order.loai_coc !== 3 ? `: ${formatCurrency(order.tien_coc)}` : ''}
                        </span>
                      )}
                      {order.trang_thai === 1 && (
                        <span className="font-label-sm text-label-sm font-medium text-on-surface-variant mt-0.5">
                          Cọc: {LOAI_COC_LABELS[order.loai_coc]}
                          {order.loai_coc !== 3 ? ` (${formatCurrency(order.tien_coc)})` : ''}
                        </span>
                      )}
                      {order.trang_thai === 3 && order.ngay_tra_thuc_te && (
                        <span className="font-label-sm text-label-sm font-medium text-[#236B48] mt-0.5">
                          Đã trả ngày {formatDate(order.ngay_tra_thuc_te)}
                          {parseMoney(order.tien_phat) > 0
                            ? ` • Phạt ${formatCurrency(order.tien_phat)}`
                            : ''}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pl-1">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-outline">
                        {order.trang_thai === 3 ? 'Tổng doanh thu' : 'Tiền thuê'}
                      </span>
                      <span className="font-currency-lg text-currency-lg text-on-surface font-bold tabular-nums">
                        {formatCurrency(order.trang_thai === 3 ? totalRevenue : order.tong_tien_thue)}
                      </span>
                      {tienShip > 0 && (
                        <span className="font-label-sm text-label-sm text-secondary font-medium tabular-nums">
                          + Ship {formatCurrency(tienShip)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.trang_thai === 1 && (
                        <>
                          <Link
                            href={`/don-thue/${order.id}?action=huy`}
                            className="h-9 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md whitespace-nowrap flex items-center hover:bg-surface-container-high"
                          >
                            Hủy
                          </Link>
                          <Link
                            href={`/don-thue/${order.id}?action=giao-do`}
                            className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md whitespace-nowrap flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[1rem]">local_shipping</span>
                            <span>Giao đồ</span>
                          </Link>
                        </>
                      )}

                      {(order.trang_thai === 2 || order.trang_thai === 4) && (
                        <>
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md whitespace-nowrap flex items-center hover:bg-surface-container-high"
                          >
                            Chi tiết
                          </Link>
                          <Link
                            href={`/don-thue/${order.id}?action=tra-do`}
                            className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md whitespace-nowrap flex items-center gap-1 shadow-sm active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[1rem]">assignment_turned_in</span>
                            <span>Trả đồ</span>
                          </Link>
                        </>
                      )}

                      {(order.trang_thai === 3 || order.trang_thai === 5) && (
                        <Link
                          href={`/don-thue/${order.id}`}
                          className="h-9 px-3.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md whitespace-nowrap flex items-center gap-1 hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[1rem]">receipt</span>
                          <span>Xem phiếu</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}

            {orders.length < total && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadOrders(page + 1, true)}
                className="h-11 px-4 rounded-xl bg-surface-container text-primary-container font-label-md text-label-md hover:bg-surface-container-high transition-colors"
              >
                {loadingMore ? 'Đang tải thêm...' : `Tải thêm (${orders.length}/${total})`}
              </button>
            )}
          </section>
        )}

        {/* Desktop Data Table */}
        {!loading && orders.length > 0 && (
          <section className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[0.6875rem] uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3.5 pl-5 pr-3">Mã phiếu &amp; Trạng thái</th>
                    <th className="py-3.5 px-3">Khách hàng</th>
                    <th className="py-3.5 px-3">Trang phục thuê</th>
                    <th className="py-3.5 px-3">Thời gian</th>
                    <th className="py-3.5 px-3 text-right">Tài chính &amp; Cọc</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {orders.map((order) => {
                    const style = getThueDoStyle(order.trang_thai)
                    const firstSP = order.chi_tiet?.[0]?.san_pham
                    const extraCount = Math.max(0, (order.chi_tiet?.length || 0) - 1)
                    const lateDays = order.trang_thai === 4 ? daysOverdue(order.ngay_hen_tra) : 0
                    const leftDays = order.trang_thai === 2 ? daysRemaining(order.ngay_hen_tra) : 0
                    const tienShip = parseMoney(order.tien_ship)
                    const totalRevenue = parseMoney(order.tong_tien_thue) + parseMoney(order.tien_phat)

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-surface-container-low/60 transition-colors group"
                      >
                        {/* Mã phiếu & Trạng thái */}
                        <td className="py-3.5 pl-5 pr-3 align-middle relative">
                          <span className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${style.border}`} />
                          <div className="flex flex-col gap-1.5">
                            <Link
                              href={`/don-thue/${order.id}`}
                              className="font-title-sm text-[0.875rem] text-primary-container hover:text-primary font-bold transition-colors w-fit"
                            >
                              {order.ma_phieu_thue}
                            </Link>
                            <div className="flex items-center gap-2 flex-wrap">
                              <ThueDoStatusBadge status={order.trang_thai} />
                              {order.trang_thai === 4 && (
                                <span className="font-label-sm text-[0.6875rem] font-bold text-error whitespace-nowrap">
                                  Trễ {lateDays} ngày
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Khách hàng */}
                        <td className="py-3.5 px-3 align-middle">
                          <div className="flex flex-col min-w-[8.75rem]">
                            {order.khach_hang ? (
                              <Link
                                href={`/khach-hang/${order.khach_hang.id}`}
                                className="font-body-md font-semibold text-on-surface hover:text-primary-container transition-colors truncate max-w-[11.875rem]"
                              >
                                {order.khach_hang.ten}
                              </Link>
                            ) : (
                              <span className="font-body-md font-semibold text-on-surface">Khách hàng</span>
                            )}
                            {order.khach_hang?.so_dien_thoai && (
                              <a
                                href={`tel:${order.khach_hang.so_dien_thoai}`}
                                className="font-label-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mt-0.5 w-fit"
                              >
                                <span className="material-symbols-outlined text-[0.8125rem]">call</span>
                                <span>{formatPhone(order.khach_hang.so_dien_thoai)}</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Trang phục */}
                        <td className="py-3.5 px-3 align-middle">
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="flex items-center gap-2.5 max-w-[16.25rem]"
                          >
                            <div className="w-10 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0">
                              <ProductImage
                                hinhAnh={firstSP?.hinh_anh}
                                alt={firstSP?.ten_san_pham || 'Trang phục'}
                                className="w-10 h-12"
                                iconSize={18}
                              />
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <span className="font-body-sm font-semibold text-on-surface truncate group-hover:text-primary-container transition-colors">
                                {firstSP?.ten_san_pham || `${order.chi_tiet?.length || 0} sản phẩm`}
                              </span>
                              <span className="font-label-sm text-on-surface-variant truncate">
                                {firstSP?.ma_san_pham ? firstSP.ma_san_pham : ''}
                                {extraCount > 0 ? `${firstSP?.ma_san_pham ? ' • ' : ''}+${extraCount} món khác` : ''}
                              </span>
                            </div>
                          </Link>
                        </td>

                        {/* Thời gian */}
                        <td className="py-3.5 px-3 align-middle whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-body-sm font-medium text-on-surface tabular-nums">
                              {formatDate(order.ngay_bat_dau)} → {formatDate(order.ngay_hen_tra)}
                            </span>
                            <span className="font-label-sm text-on-surface-variant mt-0.5">
                              {order.so_ngay_thue || 1} ngày
                              {order.trang_thai === 2 && (
                                <span className="text-secondary font-medium">
                                  {' '}• {leftDays > 0 ? `Còn ${leftDays} ngày` : 'Hạn hôm nay'}
                                </span>
                              )}
                              {order.trang_thai === 3 && order.ngay_tra_thuc_te && (
                                <span className="text-[#236B48] font-medium">
                                  {' '}• Trả {formatDate(order.ngay_tra_thuc_te)}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Tài chính & Cọc */}
                        <td className="py-3.5 px-3 align-middle text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className="font-currency-lg text-[0.9375rem] text-on-surface font-bold tabular-nums">
                              {formatCurrency(order.trang_thai === 3 ? totalRevenue : order.tong_tien_thue)}
                            </span>
                            <span className="font-label-sm text-on-surface-variant mt-0.5 tabular-nums">
                              {LOAI_COC_LABELS[order.loai_coc]}
                              {order.loai_coc !== 3 ? `: ${formatCurrency(order.tien_coc)}` : ''}
                            </span>
                            {tienShip > 0 && (
                              <span className="font-label-sm text-secondary font-medium tabular-nums">
                                Ship: {formatCurrency(tienShip)}
                              </span>
                            )}
                            {parseMoney(order.tien_phat) > 0 && (
                              <span className="font-label-sm text-error font-semibold tabular-nums">
                                Phạt: {formatCurrency(order.tien_phat)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 pl-3 pr-5 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {order.trang_thai === 1 && (
                              <>
                                <Link
                                  href={`/don-thue/${order.id}?action=huy`}
                                  className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-sm whitespace-nowrap flex items-center transition-colors"
                                >
                                  Hủy
                                </Link>
                                <Link
                                  href={`/don-thue/${order.id}?action=giao-do`}
                                  className="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm whitespace-nowrap flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[0.9375rem]">local_shipping</span>
                                  <span>Giao đồ</span>
                                </Link>
                              </>
                            )}

                            {(order.trang_thai === 2 || order.trang_thai === 4) && (
                              <>
                                <Link
                                  href={`/don-thue/${order.id}`}
                                  className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm whitespace-nowrap flex items-center transition-colors"
                                >
                                  Chi tiết
                                </Link>
                                <Link
                                  href={`/don-thue/${order.id}?action=tra-do`}
                                  className="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm whitespace-nowrap flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[0.9375rem]">assignment_turned_in</span>
                                  <span>Trả đồ</span>
                                </Link>
                              </>
                            )}

                            {(order.trang_thai === 3 || order.trang_thai === 5) && (
                              <Link
                                href={`/don-thue/${order.id}`}
                                className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[0.9375rem]">receipt</span>
                                <span>Xem phiếu</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/40 flex items-center justify-between gap-4">
              <span className="font-label-sm text-on-surface-variant">
                Đang hiển thị <strong className="text-on-surface">{orders.length}</strong> /{' '}
                <strong className="text-on-surface">{total}</strong> đơn thuê
              </span>
              {orders.length < total && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadOrders(page + 1, true)}
                  className="h-9 px-4 rounded-xl bg-surface-container hover:bg-primary-fixed text-primary-container font-label-md transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Đang tải thêm...' : `Tải thêm đơn thuê`}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
