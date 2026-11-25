'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
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

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar
        title="Tổng Quan"
        rightSlot={
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            aria-label="Làm mới"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        }
      />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-lg pt-4">
          {/* Date Header */}
          <section className="flex items-center justify-between">
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

          {/* 3 KPI Cards - Sản phẩm theo trạng thái */}
          <section className="grid grid-cols-3 gap-space-sm">
            <Link
              href="/san-pham?trang_thai=1"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#EAF5EE] text-center shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-tertiary-fixed text-tertiary mb-1">
                <span className="material-symbols-outlined text-[16px]">checkroom</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-[#236B48] tracking-tight leading-none mb-1 tabular-nums">
                {loading ? '—' : data?.so_san_pham.trong_lich ?? 0}
              </span>
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant truncate w-full">
                Trống lịch
              </span>
            </Link>

            <Link
              href="/san-pham?trang_thai=2"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#FEF4E6] text-center shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-fixed text-secondary mb-1">
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-[#B57300] tracking-tight leading-none mb-1 tabular-nums">
                {loading ? '—' : data?.so_san_pham.da_cho_thue ?? 0}
              </span>
              <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant truncate w-full">
                Đã cho thuê
              </span>
            </Link>

            <Link
              href="/san-pham?trang_thai=3"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-high text-center shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-variant text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-[16px]">dry_cleaning</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-1 tabular-nums">
                {loading ? '—' : data?.so_san_pham.dang_bao_duong ?? 0}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">
                Bảo dưỡng
              </span>
            </Link>
          </section>

          {/* Doanh thu tháng này */}
          <Link
            href="/bao-cao"
            className="p-4 rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col gap-2 hover:bg-surface-container-low/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Doanh thu tháng này
                </span>
                <span className="font-headline-xl text-headline-xl text-primary font-bold mt-0.5 tabular-nums">
                  {loading ? '...' : formatCurrency(revenueNow)}
                </span>
              </div>
              {!loading && revPercent !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${
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
            <div className="flex items-center justify-between pt-1 text-on-surface-variant font-body-sm text-body-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span>{data?.so_phieu_thang_nay ?? 0} phiếu đã hoàn tất</span>
              </div>
              {!loading && revenuePrev > 0 && (
                <span>
                  Tháng trước: {formatCurrency(revenuePrev)} ({revDiff >= 0 ? '+' : ''}
                  {formatCurrency(revDiff)})
                </span>
              )}
            </div>
          </Link>

          {/* Loading Skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-32 rounded-xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          )}

          {/* Priority Alerts */}
          {!loading && (
            <section className="flex flex-col gap-space-md">
              {totalUrgent === 0 && (
                <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#EAF5EE] text-[#236B48] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">task_alt</span>
                  </div>
                  <h3 className="font-title-sm text-title-sm text-on-surface">
                    Chưa có đơn cần xử lý gấp hôm nay
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Không có phiếu quá hạn, cần trả hôm nay hoặc đặt trước trong 2 ngày tới.
                  </p>
                  <Link
                    href="/don-thue"
                    className="mt-1 px-4 py-2 rounded-full bg-surface-container text-primary-container font-label-md text-label-md hover:bg-primary-fixed transition-colors"
                  >
                    Xem tất cả đơn thuê
                  </Link>
                </div>
              )}

              {/* 1. Quá hạn trả áo */}
              {overdueList.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-error" />
                      <span className="font-title-sm text-title-sm text-error">Quá hạn trả áo</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-error font-bold">
                      {overdueList.length} đơn
                    </span>
                  </div>

                  {overdueList.map((order) => {
                    const item = getOrderPrimaryItem(order)
                    const lateDays = daysOverdue(order.ngay_hen_tra)
                    const phone = order.khach_hang?.so_dien_thoai || ''
                    return (
                      <div
                        key={order.id}
                        className="p-space-md rounded-xl bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(186,26,26,0.08)] flex flex-col gap-space-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error" />
                        <div className="flex items-start justify-between gap-2 pl-1">
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="flex items-center gap-1.5 min-w-0 flex-1"
                          >
                            <span className="font-title-sm text-title-sm text-primary font-bold shrink-0">
                              {order.ma_phieu_thue}
                            </span>
                            <span className="text-outline-variant font-bold">•</span>
                            <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                              {order.khach_hang?.ten || 'Khách hàng'}
                            </span>
                          </Link>
                          <ThueDoStatusBadge status={order.trang_thai} />
                        </div>

                        <Link href={`/don-thue/${order.id}`} className="flex items-center gap-2.5 pl-1">
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                            <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-11 h-11" />
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

                        <div className="flex items-center justify-between pt-1 pl-1">
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
                                className="px-3 h-9 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                              >
                                <span className="material-symbols-outlined text-[16px]">call</span>
                                Gọi khách
                              </a>
                            )}
                            <Link
                              href={`/don-thue/${order.id}?action=tra-do`}
                              className="px-3 h-9 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
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
              )}

              {/* 2. Cần trả hôm nay */}
              {dueTodayList.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="font-title-sm text-title-sm text-on-surface">Cần trả hôm nay</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold">
                      {dueTodayList.length} đơn
                    </span>
                  </div>

                  {dueTodayList.map((order) => {
                    const item = getOrderPrimaryItem(order)
                    return (
                      <div
                        key={order.id}
                        className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container" />
                        <div className="flex items-start justify-between gap-2 pl-1">
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="flex items-center gap-1.5 min-w-0 flex-1"
                          >
                            <span className="font-title-sm text-title-sm text-primary font-bold shrink-0">
                              {order.ma_phieu_thue}
                            </span>
                            <span className="text-outline-variant font-bold">•</span>
                            <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                              {order.khach_hang?.ten || 'Khách hàng'}
                            </span>
                          </Link>
                          <ThueDoStatusBadge status={order.trang_thai} />
                        </div>

                        <Link href={`/don-thue/${order.id}`} className="flex items-center gap-2.5 pl-1">
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                            <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-11 h-11" />
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
                                {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)} (Hạn trả:{' '}
                                {formatTime(order.ngay_hen_tra) || 'Hôm nay'})
                              </span>
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center justify-between pt-1 pl-1">
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
                            className="px-3.5 h-9 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                            Nhận trả đồ
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 3. Đặt trước sắp đến nhận */}
              {upcomingList.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-tertiary" />
                      <span className="font-title-sm text-title-sm text-on-surface">
                        Đặt trước sắp đến nhận
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-tertiary font-semibold">
                      {upcomingList.length} lịch hẹn
                    </span>
                  </div>

                  {upcomingList.map((order) => {
                    const item = getOrderPrimaryItem(order)
                    const isToday = isSameDay(order.ngay_bat_dau)
                    return (
                      <div
                        key={order.id}
                        className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F0BE7B]" />
                        <div className="flex items-start justify-between gap-2 pl-1">
                          <Link
                            href={`/don-thue/${order.id}`}
                            className="flex items-center gap-1.5 min-w-0 flex-1"
                          >
                            <span className="font-title-sm text-title-sm text-primary font-bold shrink-0">
                              {order.ma_phieu_thue}
                            </span>
                            <span className="text-outline-variant font-bold">•</span>
                            <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">
                              {order.khach_hang?.ten || 'Khách hàng'}
                            </span>
                          </Link>
                          <ThueDoStatusBadge status={order.trang_thai} />
                        </div>

                        <Link href={`/don-thue/${order.id}`} className="flex items-center gap-2.5 pl-1">
                          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                            <ProductImage hinhAnh={item.hinhAnh} alt={item.name} className="w-11 h-11" />
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

                        <div className="flex items-center justify-between pt-1 pl-1">
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
                            className="px-3.5 h-9 rounded-full bg-tertiary-container text-on-tertiary font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Giao đồ
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
