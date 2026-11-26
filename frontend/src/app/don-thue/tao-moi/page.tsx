'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import NumberInput from '@/components/NumberInput'
import ProductImage from '@/components/ProductImage'
import { SanPhamStatusBadge } from '@/components/StatusBadge'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, caiDatApi, khachHangApi, sanPhamApi, thueDoApi } from '@/lib/api'
import {
  formatCurrency,
  formatNumber,
  formatPhone,
  fromDateTimeLocalValue,
  parseFormattedNumber,
  parseMoney,
  toDateTimeLocalValue,
} from '@/lib/format'
import type { KhachHang, LoaiCoc, SanPham } from '@/types'

function SelectGarmentModal({
  products,
  selectedIds,
  onToggle,
  onClose,
}: {
  products: SanPham[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState<'all' | '1' | '2'>('all')
  const [search, setSearch] = useState('')

  const selectableProducts = useMemo(() => products.filter((p) => p.trang_thai !== 3), [products])

  const filtered = useMemo(() => {
    return selectableProducts.filter((g) => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        g.ten_san_pham.toLowerCase().includes(q) ||
        g.ma_san_pham.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || String(g.trang_thai) === filter
      return matchSearch && matchFilter
    })
  }, [selectableProducts, search, filter])

  const totalPrice = useMemo(
    () =>
      products
        .filter((g) => selectedIds.includes(g.id))
        .reduce((sum, g) => sum + parseMoney(g.gia_thue_ngay), 0),
    [products, selectedIds]
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[28px] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10">
        <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
        </div>

        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              Chọn sản phẩm
            </h2>
            {selectedIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-[11px] font-bold">
                Đã chọn {selectedIds.length}
              </span>
            )}
          </div>
          <button
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 md:px-6 flex flex-col md:flex-row md:items-center gap-3 shrink-0 bg-surface-container-low/40 border-b border-outline-variant/15">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[19px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-xl focus:outline-none border border-outline-variant/40 focus:border-primary-container"
              placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              { key: 'all' as const, label: `Có thể chọn (${selectableProducts.length})` },
              {
                key: '1' as const,
                label: `Trống lịch (${selectableProducts.filter((p) => p.trang_thai === 1).length})`,
              },
              {
                key: '2' as const,
                label: `Đang thuê (${selectableProducts.filter((p) => p.trang_thai === 2).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm shrink-0 transition-all ${
                  filter === tab.key
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 min-h-[280px]">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
              {filtered.map((garment) => {
                const isSelected = selectedIds.includes(garment.id)
                return (
                  <div
                    key={garment.id}
                    onClick={() => onToggle(garment.id)}
                    className={`p-3 rounded-xl flex gap-3 items-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-fixed/25 border-2 border-primary-container'
                        : 'bg-surface-container-lowest border border-outline-variant/40 hover:border-primary-container/50 hover:bg-surface-container-low/50'
                    }`}
                  >
                    <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container-high">
                      <ProductImage
                        hinhAnh={garment.hinh_anh}
                        alt={garment.ten_san_pham}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[80px] py-0.5">
                      <div>
                        <span className="font-title-sm text-body-md font-bold text-on-surface line-clamp-1">
                          {garment.ten_san_pham}
                        </span>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-label-sm text-label-sm text-primary-container font-semibold">
                            {garment.ma_san_pham}
                          </span>
                          <SanPhamStatusBadge status={garment.trang_thai} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-currency-lg text-currency-lg text-primary-container font-bold tabular-nums">
                          {formatCurrency(garment.gia_thue_ngay)}
                          <span className="text-[11px] font-normal text-on-surface-variant">/ngày</span>
                        </span>
                        <span
                          className={`h-7 px-2.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 ${
                            isSelected
                              ? 'bg-primary-container text-on-primary'
                              : 'bg-primary-fixed text-on-primary-fixed-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {isSelected ? 'check' : 'add'}
                          </span>
                          <span>{isSelected ? 'Đã chọn' : 'Chọn'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="material-symbols-outlined text-[40px] text-outline mb-2">search_off</span>
              <span className="font-body-md text-body-md text-on-surface-variant">
                Không có sản phẩm phù hợp (sản phẩm đang bảo dưỡng được ẩn)
              </span>
            </div>
          )}
        </div>

        <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between gap-4 shrink-0">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Đã chọn {selectedIds.length} món
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary-container tabular-nums">
              {formatCurrency(totalPrice)}/ngày
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 md:flex-none md:min-w-[220px] h-12 px-6 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Xác nhận ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function TaoMoiDonThueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { refreshBadge } = useAuth()

  // Settings & Products
  const [depositPercent, setDepositPercent] = useState(85)
  const [allProducts, setAllProducts] = useState<SanPham[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  // Customer selection / quick add
  const [selectedCustomer, setSelectedCustomer] = useState<KhachHang | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<KhachHang[]>([])
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [newCusPhone, setNewCusPhone] = useState('')
  const [newCusName, setNewCusName] = useState('')
  const [newCusAddress, setNewCusAddress] = useState('')

  // Selected items
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)

  // Schedule
  const [ngayBatDauStr, setNgayBatDauStr] = useState(() => toDateTimeLocalValue(new Date()))
  const [soNgayInput, setSoNgayInput] = useState('1')
  const soNgay = Math.max(1, parseFormattedNumber(soNgayInput) || 1)
  const [ngayHenTraStr, setNgayHenTraStr] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toDateTimeLocalValue(d)
  })
  const [manualReturnDate, setManualReturnDate] = useState(false)

  // Deposit & notes
  const [loaiCoc, setLoaiCoc] = useState<LoaiCoc>(1)
  const [tienCocInput, setTienCocInput] = useState<string>('0')
  const [manualDeposit, setManualDeposit] = useState(false)
  const [cccdConfirmed, setCccdConfirmed] = useState(false)
  const [ghiChu, setGhiChu] = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Load products, settings, and URL prefill params
  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const [spRes, cdList] = await Promise.all([
          sanPhamApi.getAll({ limit: 100 }),
          caiDatApi.getAll().catch(() => []),
        ])
        if (!active) return
        const products = spRes.data || []
        setAllProducts(products)

        const cocSetting = cdList.find((c) => c.khoa === 'pham_tram_gia_coc')
        if (cocSetting?.gia_tri) {
          const parsed = parseFloat(cocSetting.gia_tri)
          if (!Number.isNaN(parsed) && parsed >= 0) setDepositPercent(parsed)
        }

        const preSpId = Number(searchParams.get('san_pham_id'))
        if (preSpId > 0) {
          const found = products.find((p) => p.id === preSpId && p.trang_thai !== 3)
          if (found) setSelectedProductIds([found.id])
        }

        const preKhId = Number(searchParams.get('khach_hang_id'))
        if (preKhId > 0) {
          try {
            const khDetail = await khachHangApi.getById(preKhId)
            if (active && khDetail?.khach_hang) {
              setSelectedCustomer(khDetail.khach_hang)
            }
          } catch {
            // Bỏ qua nếu ID không tồn tại
          }
        }
      } catch (err) {
        if (active) {
          toast.error(err instanceof ApiError ? err.message : 'Không thể tải danh sách sản phẩm')
        }
      } finally {
        if (active) setLoadingInit(false)
      }
    }
    init()
    return () => {
      active = false
    }
  }, [searchParams, toast])

  // Debounced customer search
  useEffect(() => {
    const q = customerQuery.trim()
    if (!q || selectedCustomer) {
      setCustomerResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingCustomer(true)
      try {
        const res = await khachHangApi.getAll({ search: q, limit: 8 })
        setCustomerResults(res.data || [])
      } catch {
        setCustomerResults([])
      } finally {
        setSearchingCustomer(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [customerQuery, selectedCustomer])

  // Auto-update ngayHenTra when ngayBatDau or soNgay changes
  useEffect(() => {
    if (manualReturnDate) return
    const start = new Date(ngayBatDauStr)
    if (Number.isNaN(start.getTime())) return
    const end = new Date(start.getTime() + soNgay * 24 * 60 * 60 * 1000)
    if (!Number.isNaN(end.getTime())) {
      setNgayHenTraStr(toDateTimeLocalValue(end))
    }
  }, [ngayBatDauStr, soNgay, manualReturnDate])

  const selectedProducts = useMemo(
    () => allProducts.filter((p) => selectedProductIds.includes(p.id)),
    [allProducts, selectedProductIds]
  )

  const tongTienThue = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + parseMoney(p.gia_thue_ngay), 0) * soNgay,
    [selectedProducts, soNgay]
  )

  const suggestedDeposit = useMemo(
    () =>
      Math.round(
        selectedProducts.reduce(
          (sum, p) => sum + (parseMoney(p.gia_goc_san_pham) * depositPercent) / 100,
          0
        )
      ),
    [selectedProducts, depositPercent]
  )

  useEffect(() => {
    if (!manualDeposit) {
      setTienCocInput(String(suggestedDeposit))
    }
  }, [suggestedDeposit, manualDeposit])

  const isFutureBooking = useMemo(() => {
    const start = new Date(ngayBatDauStr)
    return !Number.isNaN(start.getTime()) && start.getTime() > Date.now() + 60 * 1000
  }, [ngayBatDauStr])

  const toggleProduct = useCallback((id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const applyPresetNow = () => {
    setManualReturnDate(false)
    setNgayBatDauStr(toDateTimeLocalValue(new Date()))
  }

  const applyPresetTomorrow = () => {
    setManualReturnDate(false)
    const t = new Date()
    t.setDate(t.getDate() + 1)
    t.setHours(9, 0, 0, 0)
    setNgayBatDauStr(toDateTimeLocalValue(t))
  }

  const handleCreateQuickCustomer = async () => {
    const phone = newCusPhone.replace(/\s+/g, '').trim()
    const name = newCusName.trim()
    if (!phone || !/^\d+$/.test(phone)) {
      toast.error('Số điện thoại chỉ được chứa chữ số')
      return
    }
    if (!name) {
      toast.error('Vui lòng nhập tên khách hàng mới')
      return
    }
    try {
      const res = await khachHangApi.timTheoSDT({
        so_dien_thoai: phone,
        ten: name,
        dia_chi: newCusAddress.trim() || null,
      })
      setSelectedCustomer(res.data)
      setQuickAddMode(false)
      setCustomerQuery('')
      setCustomerResults([])
      toast.success(res.is_new ? 'Đã thêm khách hàng mới' : 'Đã chọn khách hàng hiện có theo SĐT')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể lưu khách hàng')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Nếu người dùng đang mở form thêm nhanh mà chưa bấm Lưu khách → tự tạo luôn
    let customer = selectedCustomer
    if (!customer && quickAddMode) {
      const phone = newCusPhone.replace(/\s+/g, '').trim()
      const name = newCusName.trim()
      if (!phone || !name) {
        setErrorMsg('Vui lòng nhập đầy đủ số điện thoại và tên khách hàng.')
        return
      }
      try {
        const res = await khachHangApi.timTheoSDT({
          so_dien_thoai: phone,
          ten: name,
          dia_chi: newCusAddress.trim() || null,
        })
        customer = res.data
        setSelectedCustomer(res.data)
        setQuickAddMode(false)
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : 'Không thể tạo khách hàng mới')
        return
      }
    }

    if (!customer) {
      setErrorMsg('Vui lòng chọn khách hàng hoặc thêm nhanh khách mới.')
      return
    }

    if (selectedProductIds.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 sản phẩm cho đơn thuê.')
      return
    }

    const startDate = new Date(ngayBatDauStr)
    const endDate = new Date(ngayHenTraStr)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setErrorMsg('Ngày nhận đồ hoặc ngày hẹn trả không hợp lệ.')
      return
    }
    if (endDate < startDate) {
      setErrorMsg('Ngày hẹn trả không được trước ngày bắt đầu.')
      return
    }

    if (loaiCoc === 3 && !cccdConfirmed) {
      setErrorMsg('Vui lòng tick xác nhận đã giữ CCCD của khách.')
      return
    }

    const tienCocNumber = loaiCoc === 3 ? 0 : Math.max(0, parseFormattedNumber(tienCocInput))

    setSubmitting(true)
    try {
      const created = await thueDoApi.create({
        khach_hang_id: customer.id,
        ngay_bat_dau: fromDateTimeLocalValue(ngayBatDauStr),
        ngay_hen_tra: fromDateTimeLocalValue(ngayHenTraStr),
        so_ngay_thue: soNgay,
        loai_coc: loaiCoc,
        tien_coc: tienCocNumber,
        ghi_chu: ghiChu.trim() || null,
        chi_tiet: selectedProductIds.map((san_pham_id) => ({ san_pham_id })),
      })
      toast.success(`Đã tạo phiếu thuê ${created.ma_phieu_thue}`)
      refreshBadge()
      router.push(`/don-thue/${created.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tạo đơn thuê'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const tienCocDisplay = loaiCoc === 3 ? 0 : Math.max(0, parseFormattedNumber(tienCocInput))

  return (
    <AppShell title="Tạo Đơn Thuê" subtitle="Lập phiếu thuê mới hoặc đặt trước" backHref="/don-thue" backLabel="Đơn thuê">
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-4 lg:gap-6 pb-6">
        {/* Status preview banner */}
        <div className="w-full bg-surface-container-low rounded-xl lg:rounded-2xl p-3.5 lg:px-5 flex items-center justify-between gap-2 border border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isFutureBooking ? 'bg-[#C99A5B]' : 'bg-primary-container animate-pulse'
              }`}
            />
            <span className="font-title-sm text-title-sm text-on-surface">
              {isFutureBooking ? 'Phiếu đặt trước' : 'Thuê nhận đồ ngay'}
            </span>
            <span className="hidden lg:inline font-body-sm text-on-surface-variant">
              — {isFutureBooking ? 'Giữ lịch theo ngày, sản phẩm chưa chuyển trạng thái' : 'Sản phẩm sẽ tự động chuyển sang Đã cho thuê'}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold shrink-0 ${
              isFutureBooking
                ? 'bg-[#FFF8E7] text-[#946E18]'
                : 'bg-[#FEF4E6] text-[#B57300]'
            }`}
          >
            {isFutureBooking ? 'Chờ xác nhận' : 'Đang thuê'}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Responsive 2-Column Layout on PC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left Form Steps Column */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 lg:gap-5">
            {/* Section 1: Khách hàng */}
            <section className="w-full bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[17px]">person</span>
                  </div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">1. Khách hàng</h2>
                </div>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setQuickAddMode(false)
                    }}
                    className="font-label-sm text-label-sm text-primary-container font-semibold hover:underline"
                  >
                    Đổi khách
                  </button>
                )}
              </div>

              {selectedCustomer ? (
                <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-1.5 border border-primary-container/15">
                  <div className="flex items-center justify-between">
                    <span className="font-title-sm text-title-sm text-on-surface">
                      {selectedCustomer.ten}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#236B48] font-label-sm text-[11px] font-semibold">
                      Đã chọn
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      {formatPhone(selectedCustomer.so_dien_thoai)}
                    </span>
                    {selectedCustomer.dia_chi && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">location_on</span>
                        {selectedCustomer.dia_chi}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[20px] pointer-events-none">
                      search
                    </span>
                    <input
                      className="w-full h-11 pl-10 pr-4 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/40 focus:border-primary-container"
                      placeholder="Nhập số điện thoại hoặc tên khách..."
                      type="text"
                      value={customerQuery}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value)
                        if (quickAddMode && /^\d[\d\s]*$/.test(e.target.value)) {
                          setNewCusPhone(e.target.value.replace(/\s+/g, ''))
                        }
                      }}
                    />
                  </div>

                  {/* Search Results */}
                  {customerQuery.trim().length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                      {searchingCustomer && (
                        <span className="font-body-sm text-body-sm text-outline px-2 py-1">
                          Đang tìm khách hàng...
                        </span>
                      )}
                      {!searchingCustomer &&
                        customerResults.map((kh) => (
                          <button
                            key={kh.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(kh)
                              setCustomerQuery('')
                              setCustomerResults([])
                              setQuickAddMode(false)
                            }}
                            className="w-full text-left p-2.5 rounded-lg bg-surface-container-low hover:bg-primary-fixed/30 flex items-center justify-between gap-2 transition-colors"
                          >
                            <div className="min-w-0">
                              <div className="font-body-md text-body-md font-semibold text-on-surface truncate">
                                {kh.ten}
                              </div>
                              <div className="font-label-sm text-label-sm text-on-surface-variant">
                                {formatPhone(kh.so_dien_thoai)}
                                {kh.dia_chi ? ` • ${kh.dia_chi}` : ''}
                              </div>
                            </div>
                            <span className="font-label-sm text-primary-container font-semibold shrink-0">
                              Chọn
                            </span>
                          </button>
                        ))}
                    </div>
                  )}

                  {!quickAddMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddMode(true)
                        const digits = customerQuery.replace(/\D/g, '')
                        if (digits) setNewCusPhone(digits)
                        else if (customerQuery.trim()) setNewCusName(customerQuery.trim())
                      }}
                      className="h-10 rounded-xl border border-dashed border-primary-container/50 text-primary-container font-label-md text-label-md flex items-center justify-center gap-1.5 hover:bg-primary-fixed/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                      <span>Thêm nhanh khách hàng mới</span>
                    </button>
                  ) : (
                    <div className="p-3.5 lg:p-4 rounded-xl bg-surface-container-low flex flex-col gap-2.5 border border-primary-container/20">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-primary-container">
                          Thêm nhanh khách mới
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickAddMode(false)}
                          className="font-label-sm text-on-surface-variant hover:text-error"
                        >
                          Đóng
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="tel"
                          value={newCusPhone}
                          onChange={(e) => setNewCusPhone(e.target.value)}
                          placeholder="Số điện thoại *"
                          className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-md focus:outline-none focus:border-primary-container"
                        />
                        <input
                          type="text"
                          value={newCusName}
                          onChange={(e) => setNewCusName(e.target.value)}
                          placeholder="Họ và tên khách hàng *"
                          className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-md focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <input
                        type="text"
                        value={newCusAddress}
                        onChange={(e) => setNewCusAddress(e.target.value)}
                        placeholder="Địa chỉ (không bắt buộc)"
                        className="h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-body-md focus:outline-none focus:border-primary-container"
                      />
                      <button
                        type="button"
                        onClick={handleCreateQuickCustomer}
                        className="h-10 sm:w-fit sm:px-5 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold transition-colors"
                      >
                        Xác nhận khách hàng
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Section 2: Sản phẩm */}
            <section className="w-full bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[17px]">checkroom</span>
                  </div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">
                    2. Trang phục &amp; Phụ kiện ({selectedProducts.length})
                  </h2>
                </div>
                <button
                  className="h-8 lg:h-9 px-3.5 rounded-full lg:rounded-xl bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-container hover:text-on-primary flex items-center gap-1 font-label-md text-label-md transition-all active:scale-95"
                  type="button"
                  onClick={() => setShowModal(true)}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Chọn đồ</span>
                </button>
              </div>

              {loadingInit ? (
                <div className="h-20 rounded-xl bg-surface-container-low animate-pulse" />
              ) : selectedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 lg:py-8 text-center bg-surface-container-low/60 rounded-xl border border-dashed border-outline-variant/40">
                  <span className="material-symbols-outlined text-[36px] text-outline mb-1">checkroom</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Chưa chọn trang phục nào
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="mt-2.5 px-4 py-1.5 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-colors"
                  >
                    Chọn trang phục
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {selectedProducts.map((sp) => {
                    const cocSP = Math.round((parseMoney(sp.gia_goc_san_pham) * depositPercent) / 100)
                    return (
                      <div
                        key={sp.id}
                        className="bg-surface-container-low rounded-xl p-2.5 flex gap-3 items-center border border-outline-variant/15"
                      >
                        <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0">
                          <ProductImage
                            hinhAnh={sp.hinh_anh}
                            alt={sp.ten_san_pham}
                            className="w-full h-full"
                            iconSize={22}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-title-sm text-body-md font-semibold text-on-surface truncate">
                              {sp.ten_san_pham}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleProduct(sp.id)}
                              className="text-outline hover:text-error p-0.5 shrink-0"
                              title="Bỏ chọn"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-label-sm text-label-sm text-primary-container font-semibold">
                              {sp.ma_san_pham}
                            </span>
                            <span className="font-label-sm text-[11px] text-on-surface-variant">
                              • Cọc gợi ý: {formatCurrency(cocSP)}
                            </span>
                          </div>
                          <div className="mt-1 font-currency-lg text-body-md font-bold text-primary-container tabular-nums">
                            {formatCurrency(sp.gia_thue_ngay)}
                            <span className="text-[11px] font-normal text-on-surface-variant">/ngày</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Lịch trình */}
            <section className="w-full bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                  </div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">3. Lịch trình thuê</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={applyPresetNow}
                    className={`px-3 py-1 rounded-full font-label-sm text-[11px] transition-colors ${
                      !isFutureBooking
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Lấy ngay
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetTomorrow}
                    className={`px-3 py-1 rounded-full font-label-sm text-[11px] transition-colors ${
                      isFutureBooking
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Đặt trước
                  </button>
                </div>
              </div>

              {/* Số ngày thuê */}
              <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">
                    timelapse
                  </span>
                  Số ngày thuê
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualReturnDate(false)
                      setSoNgayInput(String(Math.max(1, soNgay - 1)))
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container shadow-sm flex items-center justify-center font-bold text-on-surface active:scale-95 transition-all"
                  >
                    -
                  </button>
                  <NumberInput
                    min={1}
                    max={65535}
                    step={1}
                    value={soNgayInput}
                    onValueChange={(raw) => {
                      setManualReturnDate(false)
                      setSoNgayInput(raw)
                    }}
                    onBlur={() => {
                      if (!soNgayInput || parseFormattedNumber(soNgayInput) < 1) {
                        setSoNgayInput('1')
                      }
                    }}
                    aria-label="Số ngày thuê"
                    className="w-20 text-center font-title-sm text-title-sm font-bold text-primary-container bg-transparent focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setManualReturnDate(false)
                      setSoNgayInput(String(Math.min(65535, soNgay + 1)))
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-surface-container shadow-sm flex items-center justify-center font-bold text-on-surface active:scale-95 transition-all"
                  >
                    +
                  </button>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">ngày</span>
                </div>
              </div>

              {/* Ngày nhận & Ngày hẹn trả */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Ngày bắt đầu nhận đồ
                  </label>
                  <input
                    type="datetime-local"
                    value={ngayBatDauStr}
                    onChange={(e) => {
                      setManualReturnDate(false)
                      setNgayBatDauStr(e.target.value)
                    }}
                    className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm font-medium text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant">
                    Ngày hẹn trả (tự tính, chỉnh được)
                  </label>
                  <input
                    type="datetime-local"
                    value={ngayHenTraStr}
                    onChange={(e) => {
                      setManualReturnDate(true)
                      setNgayHenTraStr(e.target.value)
                    }}
                    className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm font-medium text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Ghi chú */}
            <section className="w-full bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-2">
              <label className="font-title-sm text-title-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary-container">
                  edit_note
                </span>
                4. Ghi chú (không bắt buộc)
              </label>
              <textarea
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                className="w-full p-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container resize-none"
                placeholder="Ví dụ: Khách thử vừa size M, dặn giữ kỹ khuy áo..."
                rows={3}
              />
            </section>
          </div>

          {/* Right Sticky Payment & Summary Column */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 flex flex-col gap-4">
            <section className="w-full bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-[0_6px_20px_-4px_rgba(107,33,63,0.08)] flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[17px]">payments</span>
                </div>
                <h2 className="font-title-sm text-title-sm text-on-surface">Chi phí &amp; Đặt cọc</h2>
              </div>

              {/* Loại cọc (3 lựa chọn chuẩn nghiệp vụ) */}
              <div className="flex flex-col gap-1.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Hình thức đặt cọc
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 1 as LoaiCoc, label: 'Tiền mặt', icon: 'payments' },
                    { value: 2 as LoaiCoc, label: 'Chuyển khoản', icon: 'qr_code_2' },
                    { value: 3 as LoaiCoc, label: 'Giữ CCCD', icon: 'badge' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLoaiCoc(opt.value)}
                      className={`py-2 px-1.5 min-h-[54px] rounded-xl font-label-sm text-label-sm font-semibold flex flex-col items-center justify-center gap-1 text-center leading-tight transition-all ${
                        loaiCoc === opt.value
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {loaiCoc === 3 ? (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFF8E7] text-[#946E18] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cccdConfirmed}
                    onChange={(e) => setCccdConfirmed(e.target.checked)}
                    className="w-5 h-5 accent-primary-container rounded shrink-0"
                  />
                  <span className="font-body-sm text-body-sm font-medium">
                    Xác nhận đã giữ CCCD của khách (tiền cọc = 0đ)
                  </span>
                </label>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant">
                      Tiền cọc ({depositPercent}% giá gốc: {formatCurrency(suggestedDeposit)})
                    </label>
                    {manualDeposit && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualDeposit(false)
                          setTienCocInput(String(suggestedDeposit))
                        }}
                        className="font-label-sm text-[11px] text-primary-container hover:underline shrink-0"
                      >
                        Dùng gợi ý
                      </button>
                    )}
                  </div>
                  <NumberInput
                    min={0}
                    step={10000}
                    value={tienCocInput}
                    onValueChange={(raw) => {
                      setManualDeposit(true)
                      setTienCocInput(raw)
                    }}
                    placeholder="0"
                    className="h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 font-title-sm text-title-sm text-on-surface tabular-nums focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>
              )}

              {/* Bảng tính tổng */}
              <div className="p-4 bg-surface-container rounded-xl flex flex-col gap-2.5">
                <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Số trang phục đã chọn:</span>
                  <span className="font-semibold text-on-surface tabular-nums">
                    {selectedProducts.length} món
                  </span>
                </div>
                <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Tổng tiền thuê ({formatNumber(soNgay)} ngày):</span>
                  <span className="font-semibold text-on-surface tabular-nums">
                    {formatCurrency(tongTienThue)}
                  </span>
                </div>
                <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                  <span>Tiền cọc (hoàn khi trả):</span>
                  <span className="font-semibold text-on-surface tabular-nums">
                    {loaiCoc === 3 ? '0đ (Giữ CCCD)' : formatCurrency(tienCocDisplay)}
                  </span>
                </div>
                <div className="border-t border-outline-variant/40 pt-2.5 flex justify-between items-center">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    Tổng khách cần đưa
                  </span>
                  <span className="font-headline-lg text-headline-lg text-primary-container font-bold tabular-nums">
                    {formatCurrency(tongTienThue + tienCocDisplay)}
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] hover:bg-primary disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    <span>Đang lưu phiếu thuê...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                    <span>Lưu phiếu thuê</span>
                  </>
                )}
              </button>
            </section>
          </div>
        </div>
      </form>

      {showModal && (
        <SelectGarmentModal
          products={allProducts}
          selectedIds={selectedProductIds}
          onToggle={toggleProduct}
          onClose={() => setShowModal(false)}
        />
      )}
    </AppShell>
  )
}

export default function TaoMoiDonThuePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant">
          Đang tải...
        </div>
      }
    >
      <TaoMoiDonThueContent />
    </Suspense>
  )
}
