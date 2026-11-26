'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import ProductImage from '@/components/ProductImage'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { dashboardApi, ApiError } from '@/lib/api'
import {
  daysOverdue,
  formatCurrency,
  formatDateShort,
  formatTime,
  formatVietnameseToday,
  isSameDay,
  parseMoney,
} from '@/lib/format'
import type { DashboardData, ThueDo } from '@/types'

function getOrderPrimaryItem(order: ThueDo) {
  const first = order.chi_tiet?.[0]?.san_pham
  const extraCount = Math.max(0, (order.chi_tiet?.length || 0) - 1)
  return {
    name: first?.ten_san_pham || `Đơn gồm ${order.chi_tiet?.length || 0} sản phẩm`,
    hinhAnh: first?.hinh_anh || null,
    extraText: extraCount > 0 ? `+ ${extraCount} món đi kèm` : '',
  }
}

export default function TongQuanPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await dashboardApi.get()
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải dữ liệu tổng quan')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useWSEvents(() => {
    loadData(true)
  })

  const revenueNow = parseMoney(data?.doanh_thu_thang_nay)
  const revenuePrev = parseMoney(data?.doanh_thu_thang_truoc)
  const revDiff = revenueNow - revenuePrev
  const revPercent =
    revenuePrev > 0 ? Math.round(((revenueNow - revenuePrev) / revenuePrev) * 100) : null

  const overdueList = data?.phieu_qua_han || []
  const dueTodayList = data?.phieu_can_tra_hom_nay || []
  const upcomingList = data?.phieu_dat_truoc_sap_den || []
  const totalUrgent = overdueList.length + dueTodayList.length + upcomingList.length
  const bothSecondaryHaveItems = dueTodayList.length > 0 && upcomingList.length > 0

  return (
    <AppShell
      title="Tổng Quan"
      subtitle={formatVietnameseToday()}
      fab
      rightSlot={
        <div className="flex items-center gap-2">
          <Link
            href="/bao-cao"
            className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/25 font-label-md transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary-container">query_stats</span>
            <span>Báo cáo</span>
          </Link>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Làm mới"
            title="Làm mới dữ liệu"
            className="w-9 h-9 lg:w-auto lg:px-3.5 rounded-full lg:rounded-xl flex items-center justify-center gap-1.5 text-on-surface-variant lg:bg-surface-container-low lg:border lg:border-outline-variant/25 hover:bg-surface-container transition-colors"
          >
            <span className={`material-symbols-outlined text-[20px] lg:text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden lg:inline font-label-md text-on-surface">Làm mới</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col w-full gap-space-lg lg:gap-6">
        {/* Mobile Date Header */}
        <section className="flex lg:hidden items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="material-symbols-outlined text-[18px] text-primary-container"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              calendar_today
            </span>
            <span className="font-title-sm text-title-sm text-on-surface">
              {formatVietnameseToday()}
            </span>
          </div>
          <Link
            href="/bao-cao"
            className="font-label-sm text-label-sm text-primary-container font-semibold flex items-center gap-0.5 hover:underline"
          >
            <span>Báo cáo</span>
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          </Link>
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-3">
            <span className="font-body-sm text-body-sm">{error}</span>
            <button
              type="button"
              onClick={() => loadData()}
              className="px-3 py-1.5 rounded-lg bg-error text-on-error font-label-sm text-label-sm shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* KPI Bento Row: Mobile/lg (stacked spacious) | xl+ (Revenue + 3 Product KPIs side-by-side) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:gap-5 items-stretch">
          {/* 3 Product Status KPIs */}
          <div className="order-1 lg:order-2 lg:col-span-12 xl:col-span-7 grid grid-cols-3 gap-space-sm lg:gap-4">
            <Link
              href="/san-pham?trang_thai=1"
              className="group flex flex-col items-center lg:items-start justify-center lg:justify-between p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-[#EAF5EE] text-center lg:text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-[#236B48]/10"
            >
              <div className="flex items-center justify-center lg:justify-between w-full mb-1 lg:mb-3">
                <div className="flex items-center justify-center w-7 h-7 lg:w-10 lg:h-10 rounded-full lg:rounded-xl bg-tertiary-fixed text-tertiary">
                  <span className="material-symbols-outlined text-[16px] lg:text-[21px]">checkroom</span>
                </div>
                <span className="hidden lg:inline-flex material-symbols-outlined text-[18px] text-[#236B48]/60 group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start w-full">
                <span className="font-headline-lg text-headline-lg lg:text-[30px] lg:leading-none text-[#236B48] tracking-tight leading-none mb-1 tabular-nums font-bold">
                  {loading ? '—' : data?.so_san_pham.trong_lich ?? 0}
                </span>
                <span className="font-label-sm text-label-sm lg:text-[13px] text-on-tertiary-fixed-variant truncate w-full">
                  Trống lịch
                </span>
              </div>
            </Link>

            <Link
              href="/san-pham?trang_thai=2"
              className="group flex flex-col items-center lg:items-start justify-center lg:justify-between p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-[#FEF4E6] text-center lg:text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-[#B57300]/10"
            >
              <div className="flex items-center justify-center lg:justify-between w-full mb-1 lg:mb-3">
                <div className="flex items-center justify-center w-7 h-7 lg:w-10 lg:h-10 rounded-full lg:rounded-xl bg-secondary-fixed text-secondary">
                  <span className="material-symbols-outlined text-[16px] lg:text-[21px]">shopping_bag</span>
                </div>
                <span className="hidden lg:inline-flex material-symbols-outlined text-[18px] text-[#B57300]/60 group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start w-full">
                <span className="font-headline-lg text-headline-lg lg:text-[30px] lg:leading-none text-[#B57300] tracking-tight leading-none mb-1 tabular-nums font-bold">
                  {loading ? '—' : data?.so_san_pham.da_cho_thue ?? 0}
                </span>
                <span className="font-label-sm text-label-sm lg:text-[13px] text-on-secondary-fixed-variant truncate w-full">
                  Đã cho thuê
                </span>
              </div>
            </Link>

            <Link
              href="/san-pham?trang_thai=3"
              className="group flex flex-col items-center lg:items-start justify-center lg:justify-between p-3 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-high text-center lg:text-left shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-outline-variant/25"
            >
              <div className="flex items-center justify-center lg:justify-between w-full mb-1 lg:mb-3">
                <div className="flex items-center justify-center w-7 h-7 lg:w-10 lg:h-10 rounded-full lg:rounded-xl bg-surface-variant text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] lg:text-[21px]">dry_cleaning</span>
                </div>
                <span className="hidden lg:inline-flex material-symbols-outlined text-[18px] text-on-surface-variant/60 group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
              <div className="flex flex-col items-center lg:items-start w-full">
                <span className="font-headline-lg text-headline-lg lg:text-[30px] lg:leading-none text-on-surface tracking-tight leading-none mb-1 tabular-nums font-bold">
                  {loading ? '—' : data?.so_san_pham.dang_bao_duong ?? 0}
                </span>
                <span className="font-label-sm text-label-sm lg:text-[13px] text-on-surface-variant truncate w-full">
                  Bảo dưỡng
                </span>
              </div>
            </Link>
          </div>

          {/* Doanh thu tháng này */}
          <Link
            href="/bao-cao"
            className="order-2 lg:order-1 lg:col-span-12 xl:col-span-5 p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col justify-between gap-2 lg:gap-3 hover:bg-surface-container-low/50 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Doanh thu tháng này
                </span>
                <span className="font-headline-xl text-headline-xl lg:text-[28px] xl:text-[32px] lg:leading-tight text-primary font-bold mt-0.5 tabular-nums truncate">
                  {loading ? '...' : formatCurrency(revenueNow)}
                </span>
              </div>
              {!loading && revPercent !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm shrink-0 ${
                    revPercent >= 0
                      ? 'bg-[#EAF5EE] text-[#236B48]'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {revPercent >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  {revPercent >= 0 ? `+${revPercent}%` : `${revPercent}%`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-on-surface-variant font-body-sm text-body-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span>{data?.so_phieu_thang_nay ?? 0} phiếu đã hoàn tất</span>
              </div>
              {!loading && revenuePrev > 0 && (
                <span className="tabular-nums text-[12px]">
                  Tháng trước: {formatCurrency(revenuePrev)} ({revDiff >= 0 ? '+' : ''}
                  {formatCurrency(revDiff)})
                </span>
              )}
            </div>
          </Link>
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-36 rounded-2xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        )}

        {/* Priority Alerts */}
        {!loading && (
          <section className="flex flex-col gap-space-md lg:gap-6">
            {totalUrgent === 0 && (
              <div className="p-6 lg:p-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-2.5">
                <div className="w-14 h-14 rounded-full bg-[#EAF5EE] text-[#236B48] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">task_alt</span>
                </div>
                <h3 className="font-title-sm text-title-sm lg:text-[18px] text-on-surface">
                  Chưa có đơn cần xử lý gấp hôm nay
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Không có phiếu quá hạn, cần trả hôm nay hoặc đặt trước trong 2 ngày tới.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                  <Link
                    href="/don-thue"
                    className="px-4 py-2 rounded-full bg-surface-container text-primary-container font-label-md text-label-md hover:bg-primary-fixed transition-colors"
                  >
                    Xem tất cả đơn thuê
                  </Link>
                  <Link
                    href="/don-thue/tao-moi"
                    className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md hover:bg-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px]">add</span>
                    Tạo đơn thuê mới
                  </Link>
                </div>
              </div>
            )}

            {/* 1. Quá hạn trả áo — Always full-width priority band, 2-col grid on PC */}
            {overdueList.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-error" />
                    <h2 className="font-title-sm text-title-sm lg:text-[17px] text-error">Quá hạn trả áo</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm font-bold">
                    {overdueList.length} đơn cần xử lý gấp
                  </span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
                  {overdueList.map((order) => {
                    const item = getOrderPrimaryItem(order)
                    const lateDays = daysOverdue(order.ngay_hen_tra)
                    const phone = order.khach_hang?.so_dien_thoai || ''
                    return (
                      <div
                        key={order.id}
                        className="p-space-md lg:p-4 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-error/15 shadow-[0_4px_16px_-2px_rgba(186,26,26,0.08)] hover:shadow-md transition-shadow flex flex-col justify-between gap-space-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error" />
                        <div className="flex flex-col gap-space-sm">
                          <div className="flex items-start justify-between gap-2 pl-1">
                            <Link
                              href={`/don-thue/${order.id}`}
                              className="flex items-center gap-1.5 min-w-0 flex-1 group"
                            >
                              <span className="font-title-sm text-title-sm text-primary font-bold shrink-0 group-hover:underline">
                                {order.ma_phieu_thue}
                              </span>
                              <span className="text-outline-variant font-bold">•</span>
                              <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                                {order.khach_hang?.ten || 'Khách hàng'}
                              </span>
                            </Link>
                            <ThueDoStatusBadge status={order.trang_thai} />
                          </div>

                          <Link href={`/don-thue/${order.id}`} className="flex items-center gap-3 pl-1">
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                              <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-12 h-12" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                                {item.name}
                              </span>
                              {item.extraText && (
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  {item.extraText}
                                </span>
                              )}
                              <div className="flex items-center gap-1 font-body-sm text-body-sm text-error font-medium mt-0.5">
                                <span className="material-symbols-outlined text-[15px]">schedule</span>
                                <span>
                                  {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)} (Trễ{' '}
                                  {lateDays} ngày)
                                </span>
                              </div>
                            </div>
                          </Link>
                        </div>

                        <div className="flex items-center justify-between pt-2 pl-1 border-t border-outline-variant/15">
                          <div className="flex flex-col">
                            <span className="font-label-sm text-label-sm text-on-surface-variant">Tiền thuê</span>
                            <span className="font-currency-lg text-currency-lg text-on-surface tabular-nums">
                              {formatCurrency(order.tong_tien_thue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                className="px-3 h-9 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center gap-1 shadow-sm hover:opacity-90 active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">call</span>
                                Gọi khách
                              </a>
                            )}
                            <Link
                              href={`/don-thue/${order.id}?action=tra-do`}
                              className="px-3.5 h-9 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                            >
                              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                              Trả đồ
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2 & 3: Cần trả hôm nay + Đặt trước sắp đến nhận */}
            {(dueTodayList.length > 0 || upcomingList.length > 0) && (
              <div
                className={
                  bothSecondaryHaveItems
                    ? 'grid grid-cols-1 xl:grid-cols-2 gap-space-md lg:gap-6 items-start'
                    : 'flex flex-col gap-space-md'
                }
              >
                {/* 2. Cần trả hôm nay */}
                {dueTodayList.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                        <h2 className="font-title-sm text-title-sm lg:text-[17px] text-on-surface">
                          Cần trả hôm nay
                        </h2>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FEF4E6] text-[#B57300] font-label-sm font-semibold">
                        {dueTodayList.length} đơn
                      </span>
                    </div>

                    <div
                      className={
                        bothSecondaryHaveItems
                          ? 'flex flex-col gap-3'
                          : 'grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4'
                      }
                    >
                      {dueTodayList.map((order) => {
                        const item = getOrderPrimaryItem(order)
                        return (
                          <div
                            key={order.id}
                            className="p-space-md lg:p-4 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-space-sm relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container" />
                            <div className="flex flex-col gap-space-sm">
                              <div className="flex items-start justify-between gap-2 pl-1">
                                <Link
                                  href={`/don-thue/${order.id}`}
                                  className="flex items-center gap-1.5 min-w-0 flex-1 group"
                                >
                                  <span className="font-title-sm text-title-sm text-primary font-bold shrink-0 group-hover:underline">
                                    {order.ma_phieu_thue}
                                  </span>
                                  <span className="text-outline-variant font-bold">•</span>
                                  <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                                    {order.khach_hang?.ten || 'Khách hàng'}
                                  </span>
                                </Link>
                                <ThueDoStatusBadge status={order.trang_thai} />
                              </div>

                              <Link href={`/don-thue/${order.id}`} className="flex items-center gap-3 pl-1">
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                  <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-12 h-12" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                                    {item.name}
                                  </span>
                                  {item.extraText && (
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                      {item.extraText}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                                    <span className="material-symbols-outlined text-[15px] text-secondary">
                                      event_available
                                    </span>
                                    <span>
                                      {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)}{' '}
                                      (Hạn trả: {formatTime(order.ngay_hen_tra) || 'Hôm nay'})
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </div>

                            <div className="flex items-center justify-between pt-2 pl-1 border-t border-outline-variant/15">
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  Tiền thuê / Cọc
                                </span>
                                <span className="font-currency-lg text-currency-lg text-on-surface tabular-nums">
                                  {formatCurrency(order.tong_tien_thue)}
                                </span>
                              </div>
                              <Link
                                href={`/don-thue/${order.id}?action=tra-do`}
                                className="px-3.5 h-9 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                                Nhận trả đồ
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Đặt trước sắp đến nhận */}
                {upcomingList.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                        <h2 className="font-title-sm text-title-sm lg:text-[17px] text-on-surface">
                          Đặt trước sắp đến nhận
                        </h2>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#236B48] font-label-sm font-semibold">
                        {upcomingList.length} lịch hẹn
                      </span>
                    </div>

                    <div
                      className={
                        bothSecondaryHaveItems
                          ? 'flex flex-col gap-3'
                          : 'grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4'
                      }
                    >
                      {upcomingList.map((order) => {
                        const item = getOrderPrimaryItem(order)
                        const isToday = isSameDay(order.ngay_bat_dau)
                        return (
                          <div
                            key={order.id}
                            className="p-space-md lg:p-4 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-space-sm relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F0BE7B]" />
                            <div className="flex flex-col gap-space-sm">
                              <div className="flex items-start justify-between gap-2 pl-1">
                                <Link
                                  href={`/don-thue/${order.id}`}
                                  className="flex items-center gap-1.5 min-w-0 flex-1 group"
                                >
                                  <span className="font-title-sm text-title-sm text-primary font-bold shrink-0 group-hover:underline">
                                    {order.ma_phieu_thue}
                                  </span>
                                  <span className="text-outline-variant font-bold">•</span>
                                  <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                                    {order.khach_hang?.ten || 'Khách hàng'}
                                  </span>
                                </Link>
                                <ThueDoStatusBadge status={order.trang_thai} />
                              </div>

                              <Link href={`/don-thue/${order.id}`} className="flex items-center gap-3 pl-1">
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                  <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-12 h-12" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                                    {item.name}
                                  </span>
                                  {item.extraText && (
                                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                                      {item.extraText}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                                    <span className="material-symbols-outlined text-[15px] text-tertiary">today</span>
                                    <span>
                                      {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)} (
                                      {isToday ? `Hôm nay ${formatTime(order.ngay_bat_dau)}` : 'Ngày mai lấy'})
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </div>

                            <div className="flex items-center justify-between pt-2 pl-1 border-t border-outline-variant/15">
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  Dự kiến thu
                                </span>
                                <span className="font-currency-lg text-currency-lg text-on-surface tabular-nums">
                                  {formatCurrency(order.tong_tien_thue)}
                                </span>
                              </div>
                              <Link
                                href={`/don-thue/${order.id}?action=giao-do`}
                                className="px-3.5 h-9 rounded-full bg-tertiary-container hover:bg-tertiary text-on-tertiary font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                Giao đồ
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
