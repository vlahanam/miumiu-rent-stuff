'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import ProductImage from '@/components/ProductImage'
import { getThueDoStyle, ThueDoStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi, dashboardApi, thueDoApi } from '@/lib/api'
import {
  daysOverdue,
  daysRemaining,
  formatCurrency,
  formatDateShort,
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
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar
        title="Đơn Thuê"
        rightSlot={
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('excel')}
            title="Xuất danh sách Excel"
            className="h-8 px-2.5 rounded-full bg-surface-container text-primary-container hover:bg-primary-fixed font-label-sm text-label-sm flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        }
      />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-md pt-4">
          {/* Search Bar */}
          <section className="flex items-center gap-space-xs bg-surface-container-lowest rounded-xl px-2 shadow-sm border border-outline-variant/25">
            <div className="w-9 h-10 flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[21px]">search</span>
            </div>
            <input
              className="flex-1 bg-transparent border-0 outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline py-2.5"
              placeholder="Tìm theo mã phiếu (DT-...), tên khách, SĐT..."
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </section>

          {/* Filter Chips */}
          <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-margin px-margin">
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
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  {chip.dot && <span className={`w-2 h-2 rounded-full ${chip.dot} inline-block`} />}
                  <span>{chip.label}</span>
                  {active && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 font-label-sm text-[10px] leading-tight font-bold">
                      {total}
                    </span>
                  )}
                </button>
              )
            })}
          </section>

          {/* Summary KPI */}
          <section className="grid grid-cols-3 gap-2 bg-surface-container-low rounded-xl p-2 shadow-[0_2px_12px_rgba(107,33,63,0.03)]">
            <button
              type="button"
              onClick={() => setStatusFilter('4')}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-surface-container-lowest transition-colors text-center"
            >
              <span className="font-headline-md text-headline-md font-bold text-error tabular-nums">
                {stats.quaHan}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Quá hạn
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('2')}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container-lowest shadow-sm text-center"
            >
              <span className="font-headline-md text-headline-md font-bold text-primary-container tabular-nums">
                {stats.dangThue}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-0.5">
                Đang thuê
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('1')}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-surface-container-lowest transition-colors text-center"
            >
              <span className="font-headline-md text-headline-md font-bold text-secondary tabular-nums">
                {stats.choXacNhan}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                Chờ xác nhận
              </span>
            </button>
          </section>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 rounded-xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && orders.length === 0 && (
            <div className="py-12 px-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-[42px] text-outline">receipt_long</span>
              <h3 className="font-title-sm text-title-sm text-on-surface">Chưa có đơn thuê nào</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {debouncedSearch || statusFilter
                  ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Nhấn nút "Thêm đơn thuê" để lập phiếu mới.'}
              </p>
            </div>
          )}

          {/* Order Cards */}
          {!loading && orders.length > 0 && (
            <section className="flex flex-col gap-space-md">
              {orders.map((order) => {
                const style = getThueDoStyle(order.trang_thai)
                const firstSP = order.chi_tiet?.[0]?.san_pham
                const extraCount = Math.max(0, (order.chi_tiet?.length || 0) - 1)
                const lateDays = order.trang_thai === 4 ? daysOverdue(order.ngay_hen_tra) : 0
                const leftDays = order.trang_thai === 2 ? daysRemaining(order.ngay_hen_tra) : 0
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
                          <span className="text-outline text-[12px]">•</span>
                          <span className="font-title-sm text-title-sm text-on-surface font-bold truncate">
                            {order.khach_hang?.ten || 'Khách hàng'}
                          </span>
                        </Link>
                        {order.khach_hang?.so_dien_thoai && (
                          <a
                            href={`tel:${order.khach_hang.so_dien_thoai}`}
                            className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 hover:text-primary w-fit"
                          >
                            <span className="material-symbols-outlined text-[14px]">call</span>
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
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          <span>
                            {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)} (
                            {order.so_ngay_thue || 1} ngày)
                          </span>
                        </div>
                        {order.trang_thai === 4 && (
                          <span className="font-label-sm text-label-sm font-semibold text-error flex items-center gap-0.5 mt-0.5">
                            <span className="material-symbols-outlined text-[13px]">warning</span>
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
                            Đã trả ngày {formatDateShort(order.ngay_tra_thuc_te)}
                            {parseMoney(order.tien_phat) > 0
                              ? ` • Phạt ${formatCurrency(order.tien_phat)}`
                              : ''}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 pl-1">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-outline">
                          {order.trang_thai === 3 ? 'Tổng doanh thu' : 'Tiền thuê'}
                        </span>
                        <span className="font-currency-lg text-currency-lg text-on-surface font-bold tabular-nums">
                          {formatCurrency(order.trang_thai === 3 ? totalRevenue : order.tong_tien_thue)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.trang_thai === 1 && (
                          <>
                            <Link
                              href={`/don-thue/${order.id}?action=huy`}
                              className="h-9 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center hover:bg-surface-container-high"
                            >
                              Hủy
                            </Link>
                            <Link
                              href={`/don-thue/${order.id}?action=giao-do`}
                              className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                              <span>Giao đồ</span>
                            </Link>
                          </>
                        )}

                        {(order.trang_thai === 2 || order.trang_thai === 4) && (
                          <>
                            <Link
                              href={`/don-thue/${order.id}`}
                              className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center hover:bg-surface-container-high"
                            >
                              Chi tiết
                            </Link>
                            <Link
                              href={`/don-thue/${order.id}?action=tra-do`}
                              className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-sm active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                              <span>Trả đồ</span>
                            </Link>
                          </>
                        )}

                        {(order.trang_thai === 3 || order.trang_thai === 5) && (
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="h-9 px-3.5 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1 hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[16px]">receipt</span>
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
                  className="h-11 rounded-xl bg-surface-container text-primary-container font-label-md text-label-md hover:bg-surface-container-high transition-colors"
                >
                  {loadingMore ? 'Đang tải thêm...' : `Tải thêm (${orders.length}/${total})`}
                </button>
              )}
            </section>
          )}
        </div>
      </main>

      <AddButton />
      <BottomNav />
    </div>
  )
}
