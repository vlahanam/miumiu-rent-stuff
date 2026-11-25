'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import NumberInput from '@/components/NumberInput'
import ProductImage from '@/components/ProductImage'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useAuth, useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, caiDatApi, sanPhamApi, thueDoApi } from '@/lib/api'
import {
  daysOverdue,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPhone,
  fromDateTimeLocalValue,
  parseFormattedNumber,
  parseMoney,
  toDateTimeLocalValue,
} from '@/lib/format'
import { LOAI_COC_LABELS, type LoaiCoc, type SanPham, type ThueDo, type XuLyCocResponse } from '@/types'

function DonThueDetailContent() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { refreshBadge } = useAuth()

  const orderId = params?.id
  const [order, setOrder] = useState<ThueDo | null>(null)
  const [shopPhone, setShopPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'giao-do' | 'tra-do' | 'huy' | 'sua'>('none')
  const [xuLyCocResult, setXuLyCocResult] = useState<XuLyCocResponse | null>(null)
  const [busy, setBusy] = useState(false)

  // Giao đồ form
  const [giaoLoaiCoc, setGiaoLoaiCoc] = useState<LoaiCoc>(1)
  const [giaoTienCoc, setGiaoTienCoc] = useState('0')
  const [giaoCCCD, setGiaoCCCD] = useState(false)
  const [giaoGhiChu, setGiaoGhiChu] = useState('')

  // Trả đồ form
  const [traTienPhat, setTraTienPhat] = useState('0')
  const [traGhiChu, setTraGhiChu] = useState('')
  const [traItemStatus, setTraItemStatus] = useState<Record<number, 1 | 3>>({})

  // Hủy phiếu form
  const [huyLyDo, setHuyLyDo] = useState('')

  // Sửa phiếu form
  const [editSoNgayInput, setEditSoNgayInput] = useState('1')
  const [editNgayBD, setEditNgayBD] = useState('')
  const [editNgayHT, setEditNgayHT] = useState('')
  const [editLoaiCoc, setEditLoaiCoc] = useState<LoaiCoc>(1)
  const [editTienCoc, setEditTienCoc] = useState('0')
  const [editTienPhat, setEditTienPhat] = useState('0')
  const [editGhiChu, setEditGhiChu] = useState('')
  const [editProductIds, setEditProductIds] = useState<number[]>([])
  const [allProducts, setAllProducts] = useState<SanPham[]>([])

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      const [td, settings] = await Promise.all([
        thueDoApi.getById(orderId),
        caiDatApi.getAll().catch(() => []),
      ])
      setOrder(td)
      const phoneSetting = settings.find((c) => c.khoa === 'so_dien_thoai_lien_he')
      if (phoneSetting?.gia_tri) setShopPhone(phoneSetting.gia_tri)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải thông tin phiếu thuê')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  useWSEvents(() => {
    loadOrder()
  })

  const openGiaoDoModal = useCallback((td: ThueDo) => {
    setGiaoLoaiCoc(td.loai_coc)
    setGiaoTienCoc(String(Math.round(parseMoney(td.tien_coc))))
    setGiaoCCCD(td.loai_coc === 3)
    setGiaoGhiChu('')
    setActiveModal('giao-do')
  }, [])

  const openTraDoModal = useCallback((td: ThueDo) => {
    setTraTienPhat(String(Math.round(parseMoney(td.tien_phat))))
    setTraGhiChu('')
    const map: Record<number, 1 | 3> = {}
    ;(td.chi_tiet || []).forEach((ct) => {
      map[ct.san_pham_id] = 1
    })
    setTraItemStatus(map)
    setActiveModal('tra-do')
  }, [])

  const openHuyModal = useCallback(() => {
    setHuyLyDo('')
    setActiveModal('huy')
  }, [])

  const openSuaModal = useCallback(async (td: ThueDo) => {
    setEditSoNgayInput(String(td.so_ngay_thue || 1))
    setEditNgayBD(td.ngay_bat_dau ? toDateTimeLocalValue(new Date(td.ngay_bat_dau)) : '')
    setEditNgayHT(td.ngay_hen_tra ? toDateTimeLocalValue(new Date(td.ngay_hen_tra)) : '')
    setEditLoaiCoc(td.loai_coc)
    setEditTienCoc(String(Math.round(parseMoney(td.tien_coc))))
    setEditTienPhat(String(Math.round(parseMoney(td.tien_phat))))
    setEditGhiChu(td.ghi_chu || '')
    setEditProductIds((td.chi_tiet || []).map((c) => c.san_pham_id))
    setActiveModal('sua')

    if (td.trang_thai === 1 && allProducts.length === 0) {
      try {
        const res = await sanPhamApi.getAll({ limit: 100 })
        setAllProducts((res.data || []).filter((p) => p.trang_thai !== 3))
      } catch {
        // Bỏ qua
      }
    }
  }, [allProducts.length])

  // Mở modal tự động theo ?action=
  useEffect(() => {
    if (!order) return
    const action = searchParams.get('action')
    if (action === 'giao-do' && order.trang_thai === 1) {
      openGiaoDoModal(order)
    } else if (action === 'tra-do' && (order.trang_thai === 2 || order.trang_thai === 4)) {
      openTraDoModal(order)
    } else if (action === 'huy' && (order.trang_thai === 1 || order.trang_thai === 2)) {
      openHuyModal()
    }
  }, [order, searchParams, openGiaoDoModal, openTraDoModal, openHuyModal])

  const handleGiaoDo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    if (giaoLoaiCoc === 3 && !giaoCCCD) {
      toast.error('Vui lòng tick xác nhận đã giữ CCCD của khách')
      return
    }
    setBusy(true)
    try {
      const updated = await thueDoApi.giaoDo(order.id, {
        loai_coc: giaoLoaiCoc,
        tien_coc: giaoLoaiCoc === 3 ? 0 : Math.max(0, parseFormattedNumber(giaoTienCoc)),
        ghi_chu: giaoGhiChu.trim() || undefined,
      })
      setOrder(updated)
      setActiveModal('none')
      refreshBadge()
      toast.success('Đã xác nhận giao đồ thành công!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể giao đồ')
    } finally {
      setBusy(false)
    }
  }

  const handleTraDo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    setBusy(true)
    try {
      const res = await thueDoApi.traDo(order.id, {
        tien_phat: Math.max(0, parseFormattedNumber(traTienPhat)),
        ghi_chu: traGhiChu.trim() || null,
        san_pham_trang_thai: (order.chi_tiet || []).map((ct) => ({
          san_pham_id: ct.san_pham_id,
          trang_thai: traItemStatus[ct.san_pham_id] || 1,
        })),
      })
      setOrder(res.data)
      setXuLyCocResult(res.xu_ly_coc)
      setActiveModal('none')
      refreshBadge()
      toast.success('Đã hoàn tất nhận trả đồ!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xử lý trả đồ')
    } finally {
      setBusy(false)
    }
  }

  const handleHuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    if (!huyLyDo.trim()) {
      toast.error('Vui lòng nhập lý do hủy phiếu')
      return
    }
    setBusy(true)
    try {
      const updated = await thueDoApi.huy(order.id, huyLyDo.trim())
      setOrder(updated)
      setActiveModal('none')
      refreshBadge()
      toast.success('Đã hủy phiếu thuê')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể hủy phiếu')
    } finally {
      setBusy(false)
    }
  }

  const handleSua = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    const editSoNgayNum = Math.max(1, parseFormattedNumber(editSoNgayInput) || 1)
    setBusy(true)
    try {
      if (order.trang_thai === 1) {
        if (editProductIds.length === 0) {
          toast.error('Phiếu phải có ít nhất 1 sản phẩm')
          setBusy(false)
          return
        }
        const updated = await thueDoApi.update(order.id, {
          ngay_bat_dau: editNgayBD ? fromDateTimeLocalValue(editNgayBD) : undefined,
          ngay_hen_tra: editNgayHT ? fromDateTimeLocalValue(editNgayHT) : undefined,
          so_ngay_thue: editSoNgayNum,
          loai_coc: editLoaiCoc,
          tien_coc: editLoaiCoc === 3 ? 0 : Math.max(0, parseFormattedNumber(editTienCoc)),
          ghi_chu: editGhiChu,
          chi_tiet: editProductIds.map((san_pham_id) => ({ san_pham_id })),
        })
        setOrder(updated)
      } else {
        const updated = await thueDoApi.update(order.id, {
          so_ngay_thue: editSoNgayNum,
          tien_phat: Math.max(0, parseFormattedNumber(editTienPhat)),
          ghi_chu: editGhiChu,
        })
        setOrder(updated)
      }
      setActiveModal('none')
      refreshBadge()
      toast.success('Đã cập nhật phiếu thuê')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể cập nhật phiếu')
    } finally {
      setBusy(false)
    }
  }

  const tienCoc = parseMoney(order?.tien_coc)
  const tienPhat = parseMoney(order?.tien_phat)
  const tongThue = parseMoney(order?.tong_tien_thue)
  const previewFine = Math.max(0, parseFormattedNumber(traTienPhat))
  const previewRefund = tienCoc - previewFine

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar
        title={order?.ma_phieu_thue || 'Chi tiết đơn thuê'}
        subtitle={order ? `Lập lúc ${formatDateTime(order.ngay_tao)}` : undefined}
        backHref="/don-thue"
        rightSlot={
          order && (
            <button
              type="button"
              onClick={() => window.print()}
              title="In phiếu thuê"
              className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center print:hidden"
            >
              <span className="material-symbols-outlined text-[19px]">print</span>
            </button>
          )
        }
      />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-4 pt-4">
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <span className="font-body-md text-body-md">{error}</span>
              <Link
                href="/don-thue"
                className="mt-1 px-4 py-2 rounded-xl bg-error text-on-error font-label-md text-label-md"
              >
                Quay lại danh sách
              </Link>
            </div>
          )}

          {!loading && order && (
            <>
              {/* Kết quả xử lý cọc sau khi vừa trả đồ */}
              {xuLyCocResult && (
                <div className="p-4 rounded-xl bg-[#EAF5EE] border border-[#236B48]/25 text-[#236B48] flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-title-sm text-title-sm">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>Xử lý tiền cọc khi trả đồ</span>
                  </div>
                  <p className="font-body-md text-body-md font-semibold">{xuLyCocResult.ghi_chu}</p>
                  <span className="font-label-sm text-label-sm opacity-80">
                    Cọc đã thu: {formatCurrency(xuLyCocResult.tien_coc)} • Tiền phạt:{' '}
                    {formatCurrency(xuLyCocResult.tien_phat)}
                  </span>
                </div>
              )}

              {/* Header Card */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-headline-lg text-headline-lg text-primary font-bold">
                      {order.ma_phieu_thue}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Người lập: <span className="font-semibold text-on-surface">{order.nguoi_dung?.ten || `#${order.nguoi_dung_id}`}</span>
                    </div>
                  </div>
                  <ThueDoStatusBadge status={order.trang_thai} />
                </div>

                {order.trang_thai === 4 && (
                  <div className="p-2.5 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    <span>Phiếu đã quá hạn trả {daysOverdue(order.ngay_hen_tra)} ngày!</span>
                  </div>
                )}

                {(order.trang_thai === 3 || order.trang_thai === 5) && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span>Phiếu đã hoàn tất — chỉ xem, không thể chỉnh sửa để bảo toàn số liệu.</span>
                  </div>
                )}

                {/* Action buttons by status */}
                <div className="flex flex-wrap gap-2 pt-1 print:hidden">
                  {order.trang_thai === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => openGiaoDoModal(order)}
                        className="flex-1 min-w-[130px] h-11 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                        Giao đồ cho khách
                      </button>
                      <button
                        type="button"
                        onClick={() => openSuaModal(order)}
                        className="h-11 px-4 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={openHuyModal}
                        className="h-11 px-4 rounded-xl bg-error-container/70 text-on-error-container font-label-md text-label-md flex items-center gap-1 hover:bg-error-container"
                      >
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Hủy
                      </button>
                    </>
                  )}

                  {(order.trang_thai === 2 || order.trang_thai === 4) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openTraDoModal(order)}
                        className="flex-1 min-w-[150px] h-11 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                        Khách đã trả đồ
                      </button>
                      <button
                        type="button"
                        onClick={() => openSuaModal(order)}
                        className="h-11 px-4 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[18px]">update</span>
                        Gia hạn / Sửa
                      </button>
                      {order.trang_thai === 2 && (
                        <button
                          type="button"
                          onClick={openHuyModal}
                          className="h-11 px-3.5 rounded-xl bg-error-container/70 text-on-error-container font-label-md text-label-md flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                          Hủy
                        </button>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* Khách hàng */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">person</span>
                    Khách thuê
                  </h2>
                  {order.khach_hang && (
                    <Link
                      href={`/khach-hang/${order.khach_hang.id}`}
                      className="font-label-sm text-label-sm text-primary-container hover:underline print:hidden"
                    >
                      Hồ sơ khách →
                    </Link>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface-container-low p-3 rounded-xl">
                  <div className="min-w-0">
                    <div className="font-title-sm text-title-sm text-on-surface">
                      {order.khach_hang?.ten || '—'}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {formatPhone(order.khach_hang?.so_dien_thoai)}
                    </div>
                    {order.khach_hang?.dia_chi && (
                      <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        {order.khach_hang.dia_chi}
                      </div>
                    )}
                  </div>
                  {order.khach_hang?.so_dien_thoai && (
                    <a
                      href={`tel:${order.khach_hang.so_dien_thoai}`}
                      className="h-9 px-3.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md flex items-center gap-1 shrink-0 print:hidden"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      Gọi
                    </a>
                  )}
                </div>
              </section>

              {/* Sản phẩm trong phiếu */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2.5">
                <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">checkroom</span>
                  Sản phẩm thuê ({order.chi_tiet?.length || 0})
                </h2>
                <div className="flex flex-col gap-2">
                  {(order.chi_tiet || []).map((ct) => (
                    <Link
                      key={ct.id}
                      href={`/san-pham/${ct.san_pham_id}`}
                      className="p-2.5 rounded-xl bg-surface-container-low flex items-center gap-3 hover:bg-surface-container transition-colors"
                    >
                      <div className="w-12 h-14 rounded-lg overflow-hidden shrink-0">
                        <ProductImage
                          hinhAnh={ct.san_pham?.hinh_anh}
                          alt={ct.san_pham?.ten_san_pham}
                          className="w-full h-full"
                          iconSize={20}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-body-md text-body-md font-semibold text-on-surface truncate">
                          {ct.san_pham?.ten_san_pham || `Sản phẩm #${ct.san_pham_id}`}
                        </div>
                        <div className="font-label-sm text-label-sm text-primary-container">
                          {ct.san_pham?.ma_san_pham || `ID ${ct.san_pham_id}`}
                        </div>
                        <div className="font-label-sm text-[11px] text-on-surface-variant mt-0.5 tabular-nums">
                          Giá thuê: {formatCurrency(ct.gia_thue_ngay)}/ngày • Cọc gợi ý:{' '}
                          {formatCurrency(ct.tien_coc)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Lịch trình & Tài chính */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
                <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">receipt_long</span>
                  Lịch trình &amp; Thanh toán
                </h2>

                <div className="grid grid-cols-2 gap-2 text-body-sm">
                  <div className="p-2.5 rounded-lg bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">Ngày bắt đầu</div>
                    <div className="font-semibold text-on-surface mt-0.5">
                      {formatDateTime(order.ngay_bat_dau)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">
                      Ngày hẹn trả ({formatNumber(order.so_ngay_thue || 1)} ngày)
                    </div>
                    <div className="font-semibold text-on-surface mt-0.5">
                      {formatDateTime(order.ngay_hen_tra)}
                    </div>
                  </div>
                  {order.ngay_tra_thuc_te && (
                    <div className="col-span-2 p-2.5 rounded-lg bg-[#EAF5EE] text-[#236B48]">
                      <div className="font-label-sm opacity-80">Ngày trả thực tế</div>
                      <div className="font-semibold mt-0.5">
                        {formatDateTime(order.ngay_tra_thuc_te)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-outline-variant/30 pt-3 flex flex-col gap-2 font-body-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tổng tiền thuê:</span>
                    <span className="font-semibold text-on-surface tabular-nums">
                      {formatCurrency(tongThue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">
                      Đặt cọc ({LOAI_COC_LABELS[order.loai_coc]}):
                    </span>
                    <span className="font-semibold text-on-surface tabular-nums">
                      {order.loai_coc === 3 ? '0đ (Giữ CCCD)' : formatCurrency(tienCoc)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tiền phạt:</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        tienPhat > 0 ? 'text-error' : 'text-on-surface'
                      }`}
                    >
                      {formatCurrency(tienPhat)}
                    </span>
                  </div>
                  {order.trang_thai === 3 && order.loai_coc !== 3 && (
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">
                        {tienCoc - tienPhat >= 0 ? 'Tiền cọc hoàn khách:' : 'Khách trả thêm:'}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          tienCoc - tienPhat >= 0 ? 'text-[#236B48]' : 'text-error'
                        }`}
                      >
                        {formatCurrency(Math.abs(tienCoc - tienPhat))}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-outline-variant/30 pt-2 flex justify-between items-center">
                    <span className="font-title-sm text-on-surface">Tổng doanh thu phiếu</span>
                    <span className="font-headline-md text-primary-container font-bold tabular-nums">
                      {formatCurrency(tongThue + tienPhat)}
                    </span>
                  </div>
                </div>

                {order.ghi_chu && (
                  <div className="p-3 rounded-lg bg-surface-container-low font-body-sm text-on-surface-variant">
                    <span className="font-semibold text-on-surface">Ghi chú: </span>
                    {order.ghi_chu}
                  </div>
                )}

                {shopPhone && (
                  <div className="text-center font-label-sm text-outline pt-1">
                    Hotline tiệm MiuMiu: {formatPhone(shopPhone)}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Modal Giao đồ */}
      {activeModal === 'giao-do' && order && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleGiaoDo}
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Xác nhận giao đồ — {order.ma_phieu_thue}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Phiếu sẽ chuyển sang <strong>Đang thuê</strong> và các sản phẩm sẽ chuyển sang{' '}
              <strong>Đã cho thuê</strong>. Xác nhận hình thức cọc đã nhận:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 1 as LoaiCoc, label: 'Tiền mặt' },
                { value: 2 as LoaiCoc, label: 'Chuyển khoản' },
                { value: 3 as LoaiCoc, label: 'Giữ CCCD' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGiaoLoaiCoc(opt.value)}
                  className={`h-10 rounded-xl font-label-sm font-semibold ${
                    giaoLoaiCoc === opt.value
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {giaoLoaiCoc === 3 ? (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFF8E7] text-[#946E18]">
                <input
                  type="checkbox"
                  checked={giaoCCCD}
                  onChange={(e) => setGiaoCCCD(e.target.checked)}
                  className="w-5 h-5 accent-primary-container"
                />
                <span className="font-body-sm font-medium">Đã giữ CCCD của khách</span>
              </label>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Tiền cọc đã thu (VND)</label>
                <NumberInput
                  min={0}
                  step={10000}
                  value={giaoTienCoc}
                  onValueChange={setGiaoTienCoc}
                  placeholder="0"
                  className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm tabular-nums"
                />
              </div>
            )}

            <input
              type="text"
              value={giaoGhiChu}
              onChange={(e) => setGiaoGhiChu(e.target.value)}
              placeholder="Ghi chú khi giao đồ (không bắt buộc)"
              className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md text-on-surface"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-primary-container text-on-primary font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang xử lý...' : 'Xác nhận giao đồ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Trả đồ */}
      {activeModal === 'tra-do' && order && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleTraDo}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Khách trả đồ — {order.ma_phieu_thue}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Trạng thái từng sản phẩm sau khi trả */}
            <div className="flex flex-col gap-2">
              <span className="font-label-md text-on-surface">Tình trạng từng sản phẩm sau trả:</span>
              {(order.chi_tiet || []).map((ct) => {
                const chosen = traItemStatus[ct.san_pham_id] || 1
                return (
                  <div
                    key={ct.id}
                    className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-body-sm font-semibold text-on-surface truncate">
                        {ct.san_pham?.ten_san_pham || `SP #${ct.san_pham_id}`}
                      </div>
                      <div className="font-label-sm text-primary-container">
                        {ct.san_pham?.ma_san_pham}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setTraItemStatus((prev) => ({ ...prev, [ct.san_pham_id]: 1 }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-label-sm text-[11px] font-semibold ${
                          chosen === 1
                            ? 'bg-[#236B48] text-white'
                            : 'bg-surface-container-lowest text-on-surface-variant'
                        }`}
                      >
                        Trống lịch
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTraItemStatus((prev) => ({ ...prev, [ct.san_pham_id]: 3 }))
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-label-sm text-[11px] font-semibold ${
                          chosen === 3
                            ? 'bg-on-surface text-surface'
                            : 'bg-surface-container-lowest text-on-surface-variant'
                        }`}
                      >
                        Bảo dưỡng
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tiền phạt & Ghi chú */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">
                Tiền phạt (trễ hạn / hư hỏng — để 0 nếu không phạt)
              </label>
              <NumberInput
                min={0}
                step={10000}
                value={traTienPhat}
                onValueChange={setTraTienPhat}
                placeholder="0"
                className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm tabular-nums"
              />
            </div>

            <textarea
              rows={2}
              value={traGhiChu}
              onChange={(e) => setTraGhiChu(e.target.value)}
              placeholder="Ghi chú lý do phạt hoặc tình trạng đồ..."
              className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm resize-none"
            />

            {/* Tính hoàn cọc trực tiếp */}
            <div
              className={`p-3.5 rounded-xl flex flex-col gap-1 ${
                order.loai_coc === 3
                  ? 'bg-[#FFF8E7] text-[#946E18]'
                  : previewRefund < 0
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-[#EAF5EE] text-[#236B48]'
              }`}
            >
              {order.loai_coc === 3 ? (
                <>
                  <span className="font-label-md font-bold">Trả lại CCCD cho khách</span>
                  {previewFine > 0 && (
                    <span className="font-body-sm">
                      Khách cần thanh toán tiền phạt: <strong>{formatCurrency(previewFine)}</strong>
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between font-body-sm">
                    <span>Cọc đã thu:</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(tienCoc)}</span>
                  </div>
                  <div className="flex justify-between font-body-sm">
                    <span>Tiền phạt:</span>
                    <span className="font-semibold tabular-nums">-{formatCurrency(previewFine)}</span>
                  </div>
                  <div className="flex justify-between font-title-sm font-bold pt-1 border-t border-current/20">
                    <span>{previewRefund >= 0 ? 'Hoàn lại khách:' : 'Khách cần trả thêm:'}</span>
                    <span className="tabular-nums">{formatCurrency(Math.abs(previewRefund))}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md text-on-surface"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-primary-container text-on-primary font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang xử lý...' : 'Xác nhận đã trả'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Hủy phiếu */}
      {activeModal === 'huy' && order && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleHuy}
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-error">
                Hủy phiếu {order.ma_phieu_thue}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Thao tác này không thể hoàn tác.{' '}
              {order.trang_thai === 2 &&
                'Các sản phẩm đang giao trong phiếu sẽ tự động trở về trạng thái Trống lịch.'}
            </p>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface">Lý do hủy phiếu *</label>
              <textarea
                rows={3}
                required
                value={huyLyDo}
                onChange={(e) => setHuyLyDo(e.target.value)}
                placeholder="Nhập lý do hủy (ví dụ: Khách đổi lịch sự kiện...)"
                className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md text-on-surface"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-error text-on-error font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang hủy...' : 'Xác nhận hủy phiếu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Sửa phiếu */}
      {activeModal === 'sua' && order && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleSua}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                {order.trang_thai === 1 ? 'Sửa phiếu đặt trước' : 'Gia hạn & cập nhật phiếu'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Số ngày thuê</label>
              <NumberInput
                min={1}
                max={65535}
                step={1}
                value={editSoNgayInput}
                onValueChange={setEditSoNgayInput}
                onBlur={() => {
                  if (!editSoNgayInput || parseFormattedNumber(editSoNgayInput) < 1) {
                    setEditSoNgayInput('1')
                  }
                }}
                className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm tabular-nums"
              />
            </div>

            {order.trang_thai === 1 ? (
              <>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-on-surface-variant">Ngày bắt đầu</label>
                    <input
                      type="datetime-local"
                      value={editNgayBD}
                      onChange={(e) => setEditNgayBD(e.target.value)}
                      className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-on-surface-variant">Ngày hẹn trả</label>
                    <input
                      type="datetime-local"
                      value={editNgayHT}
                      onChange={(e) => setEditNgayHT(e.target.value)}
                      className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Loại cọc</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { v: 1 as LoaiCoc, l: 'Tiền mặt' },
                      { v: 2 as LoaiCoc, l: 'Chuyển khoản' },
                      { v: 3 as LoaiCoc, l: 'CCCD' },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setEditLoaiCoc(o.v)}
                        className={`h-9 rounded-lg font-label-sm font-semibold ${
                          editLoaiCoc === o.v
                            ? 'bg-primary-container text-on-primary'
                            : 'bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>

                {editLoaiCoc !== 3 && (
                  <div className="flex flex-col gap-1">
                    <label className="font-label-sm text-on-surface-variant">Tiền cọc (VND)</label>
                    <NumberInput
                      min={0}
                      step={10000}
                      value={editTienCoc}
                      onValueChange={setEditTienCoc}
                      placeholder="0"
                      className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums"
                    />
                  </div>
                )}

                {allProducts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-sm text-on-surface-variant">
                      Sản phẩm trong phiếu ({editProductIds.length})
                    </label>
                    <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 p-2 rounded-xl bg-surface-container-low">
                      {allProducts.map((sp) => {
                        const checked = editProductIds.includes(sp.id)
                        return (
                          <label
                            key={sp.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-surface-container cursor-pointer text-body-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setEditProductIds((prev) =>
                                    prev.includes(sp.id)
                                      ? prev.filter((x) => x !== sp.id)
                                      : [...prev, sp.id]
                                  )
                                }
                                className="accent-primary-container"
                              />
                              <span className="truncate">
                                {sp.ma_san_pham} — {sp.ten_san_pham}
                              </span>
                            </div>
                            <span className="font-label-sm text-primary-container shrink-0">
                              {formatCurrency(sp.gia_thue_ngay)}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Tiền phạt (VND)</label>
                <NumberInput
                  min={0}
                  step={10000}
                  value={editTienPhat}
                  onValueChange={setEditTienPhat}
                  placeholder="0"
                  className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Ghi chú</label>
              <textarea
                rows={2}
                value={editGhiChu}
                onChange={(e) => setEditGhiChu(e.target.value)}
                className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md text-on-surface"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-11 rounded-xl bg-primary-container text-on-primary font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function DonThueDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant">
          Đang tải...
        </div>
      }
    >
      <DonThueDetailContent />
    </Suspense>
  )
}
