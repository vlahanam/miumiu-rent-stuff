'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import NumberInput from '@/components/NumberInput'
import { SanPhamStatusBadge, ThueDoStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, caiDatApi, sanPhamApi } from '@/lib/api'
import {
  formatCurrency,
  formatDate,
  parseFormattedNumber,
  parseImages,
  parseMoney,
  serializeImages,
} from '@/lib/format'
import type { SanPhamDetail } from '@/types'

export default function SanPhamDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const productId = params?.id

  const [product, setProduct] = useState<SanPhamDetail | null>(null)
  const [depositPercent, setDepositPercent] = useState(85)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editMa, setEditMa] = useState('')
  const [editTen, setEditTen] = useState('')
  const [editGiaGoc, setEditGiaGoc] = useState('')
  const [editGiaThue, setEditGiaThue] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [newImgUrl, setNewImgUrl] = useState('')

  // Delete confirm modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const loadProduct = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError('')
    try {
      const [detail, settings] = await Promise.all([
        sanPhamApi.getById(productId),
        caiDatApi.getAll().catch(() => []),
      ])
      setProduct(detail)
      const coc = settings.find((c) => c.khoa === 'pham_tram_gia_coc')
      if (coc?.gia_tri) {
        const n = parseFloat(coc.gia_tri)
        if (!Number.isNaN(n) && n >= 0) setDepositPercent(n)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải chi tiết sản phẩm')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  useWSEvents(() => {
    loadProduct()
  })

  const openEditModal = () => {
    if (!product) return
    setEditMa(product.ma_san_pham)
    setEditTen(product.ten_san_pham)
    setEditGiaGoc(String(Math.round(parseMoney(product.gia_goc_san_pham))))
    setEditGiaThue(String(Math.round(parseMoney(product.gia_thue_ngay))))
    setEditImages(parseImages(product.hinh_anh))
    setNewImgUrl('')
    setShowEditModal(true)
  }

  const handleToggleMaintenance = async () => {
    if (!product) return
    const nextStatus = product.trang_thai === 3 ? 1 : 3
    setBusy(true)
    try {
      await sanPhamApi.patchTrangThai(product.id, nextStatus)
      toast.success(
        nextStatus === 1
          ? 'Đã hoàn tất bảo dưỡng → Trống lịch'
          : 'Đã chuyển sản phẩm sang Đang bảo dưỡng'
      )
      await loadProduct()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể đổi trạng thái')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    const hasHistory = (product.lich_su_thue?.length || 0) > 0
    const trimmedMa = editMa.trim()
    const trimmedTen = editTen.trim()
    if (!trimmedTen) {
      toast.error('Tên sản phẩm không được để trống')
      return
    }
    if (!hasHistory && !trimmedMa) {
      toast.error('Mã sản phẩm không được để trống')
      return
    }
    setBusy(true)
    try {
      const imgs = newImgUrl.trim() ? [...editImages, newImgUrl.trim()] : editImages
      await sanPhamApi.update(product.id, {
        ...(hasHistory ? {} : { ma_san_pham: trimmedMa }),
        ten_san_pham: trimmedTen,
        gia_goc_san_pham: Math.max(0, parseFormattedNumber(editGiaGoc)),
        gia_thue_ngay: Math.max(0, parseFormattedNumber(editGiaThue)),
        hinh_anh: serializeImages(imgs),
      })
      setShowEditModal(false)
      toast.success('Đã cập nhật thông tin sản phẩm')
      await loadProduct()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể cập nhật sản phẩm')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return
    setBusy(true)
    try {
      await sanPhamApi.delete(product.id)
      toast.success('Đã xóa sản phẩm')
      router.replace('/san-pham')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xóa sản phẩm')
      setShowDeleteModal(false)
    } finally {
      setBusy(false)
    }
  }

  const images = parseImages(product?.hinh_anh)
  const giaGoc = parseMoney(product?.gia_goc_san_pham)
  const tongDoanhThu = parseMoney(product?.tong_doanh_thu)
  const roiPct =
    giaGoc > 0
      ? Math.min(100, Math.round((tongDoanhThu / giaGoc) * 100))
      : product?.da_thu_hoi_von
      ? 100
      : 0
  const hasHistory = (product?.lich_su_thue?.length || 0) > 0
  const suggestedDeposit = Math.round((giaGoc * depositPercent) / 100)

  return (
    <AppShell
      title={product?.ma_san_pham || 'Chi tiết sản phẩm'}
      subtitle={product?.ten_san_pham}
      backHref="/san-pham"
      backLabel="Sản phẩm"
    >
      <div className="flex flex-col gap-4 lg:gap-6">
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 h-80 lg:h-[28.75rem] rounded-2xl bg-surface-container-low animate-pulse" />
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="h-56 rounded-2xl bg-surface-container-low animate-pulse" />
              <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2">
            <span className="material-symbols-outlined text-[2rem]">error</span>
            <span>{error}</span>
            <Link href="/san-pham" className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md whitespace-nowrap">
              Quay lại kho sản phẩm
            </Link>
          </div>
        )}

        {!loading && product && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Left Column: Image Gallery */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              <section className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/5] bg-primary-fixed/20 flex items-center justify-center">
                  {images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[Math.min(activeImageIdx, images.length - 1)]}
                      alt={product.ten_san_pham}
                      className="w-full h-full object-contain bg-surface-container"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[4.5rem] text-primary-container/60">
                      checkroom
                    </span>
                  )}
                  <div className="absolute top-3 left-3">
                    <SanPhamStatusBadge status={product.trang_thai} />
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-surface-container-low border-t border-outline-variant/15">
                    {images.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          idx === activeImageIdx
                            ? 'border-primary-container shadow-sm'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Info, Pricing, ROI & Rental History */}
            <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-5">
              {/* Info & Actions Card */}
              <section className="p-4 lg:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-md text-primary-container font-bold">
                      {product.ma_san_pham}
                    </span>
                    <div className="hidden lg:block">
                      <SanPhamStatusBadge status={product.trang_thai} />
                    </div>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mt-0.5 leading-snug">
                    {product.ten_san_pham}
                  </h1>
                </div>

                <div className="rounded-xl bg-surface-container-low px-3.5 lg:px-4 divide-y divide-outline-variant/20">
                  <div className="py-2.5 lg:py-3 flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Giá thuê/ngày
                    </span>
                    <span className="font-currency-lg text-[clamp(0.9375rem,0.88rem+0.22vw,1.125rem)] text-primary-container font-bold tabular-nums">
                      {formatCurrency(product.gia_thue_ngay)}
                    </span>
                  </div>
                  <div className="py-2.5 lg:py-3 flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Giá gốc
                    </span>
                    <span className="font-currency-lg text-[clamp(0.9375rem,0.88rem+0.22vw,1.125rem)] text-on-surface font-bold tabular-nums">
                      {formatCurrency(product.gia_goc_san_pham)}
                    </span>
                  </div>
                  <div className="py-2.5 lg:py-3 flex items-center justify-between gap-3">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Cọc ({depositPercent}%)
                    </span>
                    <span className="font-currency-lg text-[clamp(0.9375rem,0.88rem+0.22vw,1.125rem)] text-secondary font-bold tabular-nums">
                      {formatCurrency(suggestedDeposit)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {product.trang_thai !== 3 && (
                    <Link
                      href={`/don-thue/tao-moi?san_pham_id=${product.id}`}
                      className={`${
                        product.trang_thai === 2 ? 'col-span-2 ' : ''
                      }h-11 px-2.5 sm:px-3 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all`}
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">add_shopping_cart</span>
                      <span>Tạo đơn thuê</span>
                    </Link>
                  )}

                  {product.trang_thai === 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleToggleMaintenance}
                      className="h-11 px-2.5 sm:px-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">dry_cleaning</span>
                      <span>Bảo dưỡng</span>
                    </button>
                  )}

                  {product.trang_thai === 3 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleToggleMaintenance}
                      className="col-span-2 h-11 px-3 rounded-xl bg-[#236B48] hover:opacity-90 text-white font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">check_circle</span>
                      <span>Hoàn tất bảo dưỡng</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openEditModal}
                    className="h-11 px-2.5 sm:px-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">edit</span>
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-11 px-2.5 sm:px-3 rounded-xl bg-error-container/70 text-on-error-container font-label-md text-label-md flex items-center justify-center gap-1.5 hover:bg-error-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">delete</span>
                    <span>Xóa</span>
                  </button>
                </div>

                {product.trang_thai === 2 && (
                  <p className="font-label-sm text-secondary flex items-center gap-1.5 bg-[#FEF4E6]/70 p-2.5 rounded-xl">
                    <span className="material-symbols-outlined text-[1rem] shrink-0">info</span>
                    Sản phẩm đang được cho thuê — không thể chuyển bảo dưỡng cho đến khi khách trả đồ.
                  </p>
                )}
              </section>

              {/* Hiệu quả & Thu hồi vốn */}
              <section className="p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[1.125rem] text-primary-container">
                      monitoring
                    </span>
                    Hiệu quả &amp; Thu hồi vốn
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-label-sm font-semibold whitespace-nowrap ${
                      product.da_thu_hoi_von
                        ? 'bg-[#EAF5EE] text-[#236B48]'
                        : 'bg-[#FFF8E7] text-[#946E18]'
                    }`}
                  >
                    {product.da_thu_hoi_von ? 'Đã thu hồi vốn' : `Thu hồi ${roiPct}%`}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      product.da_thu_hoi_von ? 'bg-[#236B48]' : 'bg-primary-container'
                    }`}
                    style={{ width: `${roiPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">Số lần đã thuê</div>
                    <div className="font-headline-md text-headline-md lg:text-[1.375rem] text-on-surface font-bold mt-0.5 tabular-nums">
                      {product.so_lan_thue} lần
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">Tổng doanh thu</div>
                    <div className="font-headline-md text-headline-md lg:text-[1.375rem] text-primary-container font-bold mt-0.5 tabular-nums">
                      {formatCurrency(tongDoanhThu)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Lịch sử thuê */}
              <section className="p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3">
                <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[1.125rem] text-primary-container">
                    history
                  </span>
                  Lịch sử thuê ({product.lich_su_thue?.length || 0})
                </h2>

                {!product.lich_su_thue || product.lich_su_thue.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-6 text-center bg-surface-container-low/50 rounded-xl">
                    Sản phẩm này chưa có lịch sử thuê nào.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {product.lich_su_thue.map((ls) => (
                      <Link
                        key={`${ls.thue_do_id}-${ls.ma_phieu_thue}`}
                        href={`/don-thue/${ls.thue_do_id}`}
                        className="p-3 lg:px-4 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-title-sm text-body-md text-primary-container font-bold shrink-0">
                              {ls.ma_phieu_thue}
                            </span>
                            <span className="text-outline">•</span>
                            <span className="font-body-md font-medium text-on-surface truncate">
                              {ls.ten_khach_hang}
                            </span>
                          </div>
                          <div className="font-label-sm text-on-surface-variant shrink-0 tabular-nums">
                            {formatDate(ls.ngay_bat_dau)} → {formatDate(ls.ngay_hen_tra)}
                          </div>
                        </div>
                        <ThueDoStatusBadge status={ls.trang_thai} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && product && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !busy && setShowEditModal(false)}
          />

          <form
            onSubmit={handleSaveEdit}
            className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10"
          >
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h3
                id="edit-product-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Chỉnh sửa sản phẩm
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Mã sản phẩm (SKU)</label>
                  <input
                    type="text"
                    required={!hasHistory}
                    maxLength={30}
                    disabled={hasHistory}
                    value={editMa}
                    onChange={(e) => setEditMa(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors disabled:opacity-60"
                  />
                  {hasHistory && (
                    <span className="font-label-sm text-outline">
                      Không thể đổi SKU vì sản phẩm đã có phiếu thuê.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Tên sản phẩm *</label>
                  <input
                    type="text"
                    required
                    value={editTen}
                    onChange={(e) => setEditTen(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Giá gốc (VND)</label>
                  <NumberInput
                    min={0}
                    step={10000}
                    value={editGiaGoc}
                    onValueChange={setEditGiaGoc}
                    placeholder="2.000.000"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md tabular-nums focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Giá thuê/ngày (VND)</label>
                  <NumberInput
                    min={0}
                    step={10000}
                    value={editGiaThue}
                    onValueChange={setEditGiaThue}
                    placeholder="300.000"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md tabular-nums focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-on-surface-variant">Hình ảnh (URL)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newImgUrl.trim()) {
                        setEditImages((prev) => [...prev, newImgUrl.trim()])
                        setNewImgUrl('')
                      }
                    }}
                    className="px-4 h-11 rounded-xl bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-container hover:text-on-primary font-label-md font-semibold shrink-0 transition-colors"
                  >
                    Thêm
                  </button>
                </div>
                {editImages.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto md:flex-wrap py-1">
                    {editImages.map((u, idx) => (
                      <div
                        key={`${u}-${idx}`}
                        className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 border border-outline-variant/30 bg-surface-container"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-[0.8125rem]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="shrink-0 min-w-[5.5rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              >
                {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && product && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5">
            <h3 className="font-headline-md text-error">Xóa sản phẩm?</h3>
            <p className="font-body-sm text-on-surface-variant">
              Bạn chắc chắn muốn xóa vĩnh viễn <strong>{product.ten_san_pham}</strong> (
              {product.ma_san_pham})? Sản phẩm đã có phiếu thuê sẽ không thể xóa.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="shrink-0 min-w-[6rem] h-11 px-4 rounded-xl bg-surface-container font-label-md"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex-1 h-11 px-4 rounded-xl bg-error text-on-error font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
