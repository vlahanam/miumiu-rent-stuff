'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import NumberInput from '@/components/NumberInput'
import { SanPhamStatusBadge, ThueDoStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, caiDatApi, sanPhamApi } from '@/lib/api'
import {
  formatCurrency,
  formatDateShort,
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
  const roiPct = giaGoc > 0 ? Math.min(100, Math.round((tongDoanhThu / giaGoc) * 100)) : product?.da_thu_hoi_von ? 100 : 0
  const hasHistory = (product?.lich_su_thue?.length || 0) > 0
  const suggestedDeposit = Math.round((giaGoc * depositPercent) / 100)

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar
        title={product?.ma_san_pham || 'Chi tiết sản phẩm'}
        subtitle={product?.ten_san_pham}
        backHref="/san-pham"
      />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col gap-4 pt-4">
          {loading && (
            <div className="flex flex-col gap-3">
              <div className="h-64 rounded-2xl bg-surface-container-low animate-pulse" />
              <div className="h-36 rounded-2xl bg-surface-container-low animate-pulse" />
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <span>{error}</span>
              <Link href="/san-pham" className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md">
                Quay lại kho sản phẩm
              </Link>
            </div>
          )}

          {!loading && product && (
            <>
              {/* Gallery + Header */}
              <section className="rounded-2xl bg-surface-container-lowest shadow-sm overflow-hidden">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-primary-fixed/20 flex items-center justify-center">
                  {images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[Math.min(activeImageIdx, images.length - 1)]}
                      alt={product.ten_san_pham}
                      className="w-full h-full object-contain bg-surface-container"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[64px] text-primary-container/60">
                      checkroom
                    </span>
                  )}
                  <div className="absolute top-3 left-3">
                    <SanPhamStatusBadge status={product.trang_thai} />
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-surface-container-low">
                    {images.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 ${
                          idx === activeImageIdx ? 'border-primary-container' : 'border-transparent opacity-70'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <div className="font-label-md text-primary-container font-bold">
                      {product.ma_san_pham}
                    </div>
                    <h1 className="font-headline-lg text-headline-lg text-on-surface mt-0.5">
                      {product.ten_san_pham}
                    </h1>
                    <div className="font-label-sm text-outline mt-0.5">Slug: {product.slug}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-surface-container-low">
                      <div className="font-label-sm text-on-surface-variant">Giá thuê/ngày</div>
                      <div className="font-currency-lg text-primary-container font-bold mt-0.5 tabular-nums">
                        {formatCurrency(product.gia_thue_ngay)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low">
                      <div className="font-label-sm text-on-surface-variant">Giá gốc</div>
                      <div className="font-currency-lg text-on-surface font-bold mt-0.5 tabular-nums">
                        {formatCurrency(product.gia_goc_san_pham)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low">
                      <div className="font-label-sm text-on-surface-variant">
                        Cọc ({depositPercent}%)
                      </div>
                      <div className="font-currency-lg text-secondary font-bold mt-0.5 tabular-nums">
                        {formatCurrency(suggestedDeposit)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {product.trang_thai !== 3 && (
                      <Link
                        href={`/don-thue/tao-moi?san_pham_id=${product.id}`}
                        className="flex-1 min-w-[140px] h-11 px-4 rounded-xl bg-primary-container text-on-primary font-label-md font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                        Tạo đơn thuê
                      </Link>
                    )}

                    {product.trang_thai === 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleToggleMaintenance}
                        className="h-11 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-md flex items-center gap-1 hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[18px]">dry_cleaning</span>
                        Bảo dưỡng
                      </button>
                    )}

                    {product.trang_thai === 3 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleToggleMaintenance}
                        className="flex-1 h-11 px-4 rounded-xl bg-[#236B48] text-white font-label-md font-bold flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Hoàn tất bảo dưỡng
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={openEditModal}
                      className="h-11 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-md flex items-center gap-1 hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(true)}
                      className="h-11 px-3.5 rounded-xl bg-error-container/70 text-on-error-container font-label-md flex items-center gap-1 hover:bg-error-container"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Xóa
                    </button>
                  </div>

                  {product.trang_thai === 2 && (
                    <p className="font-label-sm text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">info</span>
                      Sản phẩm đang được cho thuê — không thể chuyển bảo dưỡng cho đến khi khách trả đồ.
                    </p>
                  )}
                </div>
              </section>

              {/* Hiệu quả & Thu hồi vốn */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary-container">
                      monitoring
                    </span>
                    Hiệu quả &amp; Thu hồi vốn
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-label-sm font-semibold ${
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
                  <div className="p-3 rounded-xl bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">Số lần đã thuê</div>
                    <div className="font-headline-md text-on-surface font-bold mt-0.5 tabular-nums">
                      {product.so_lan_thue} lần
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low">
                    <div className="font-label-sm text-on-surface-variant">Tổng doanh thu</div>
                    <div className="font-headline-md text-primary-container font-bold mt-0.5 tabular-nums">
                      {formatCurrency(tongDoanhThu)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Lịch sử thuê */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
                <h2 className="font-title-sm text-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">
                    history
                  </span>
                  Lịch sử thuê ({product.lich_su_thue?.length || 0})
                </h2>

                {!product.lich_su_thue || product.lich_su_thue.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-4 text-center">
                    Sản phẩm này chưa có lịch sử thuê nào.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {product.lich_su_thue.map((ls) => (
                      <Link
                        key={`${ls.thue_do_id}-${ls.ma_phieu_thue}`}
                        href={`/don-thue/${ls.thue_do_id}`}
                        className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-title-sm text-body-md text-primary-container font-bold">
                              {ls.ma_phieu_thue}
                            </span>
                            <span className="text-outline">•</span>
                            <span className="font-body-md font-medium text-on-surface truncate">
                              {ls.ten_khach_hang}
                            </span>
                          </div>
                          <div className="font-label-sm text-on-surface-variant mt-0.5">
                            {formatDateShort(ls.ngay_bat_dau)} → {formatDateShort(ls.ngay_hen_tra)}
                          </div>
                        </div>
                        <ThueDoStatusBadge status={ls.trang_thai} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && product && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-on-surface">Chỉnh sửa sản phẩm</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Mã sản phẩm (SKU)</label>
              <input
                type="text"
                required={!hasHistory}
                maxLength={30}
                disabled={hasHistory}
                value={editMa}
                onChange={(e) => setEditMa(e.target.value)}
                className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md disabled:opacity-60"
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
                className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Giá gốc (VND)</label>
                <NumberInput
                  min={0}
                  step={10000}
                  value={editGiaGoc}
                  onValueChange={setEditGiaGoc}
                  placeholder="2.000.000"
                  className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums"
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
                  className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-label-sm text-on-surface-variant">Hình ảnh (URL)</label>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={newImgUrl}
                  onChange={(e) => setNewImgUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newImgUrl.trim()) {
                      setEditImages((prev) => [...prev, newImgUrl.trim()])
                      setNewImgUrl('')
                    }
                  }}
                  className="px-3 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-sm font-semibold"
                >
                  Thêm
                </button>
              </div>
              {editImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {editImages.map((u, idx) => (
                    <div key={`${u}-${idx}`} className="relative w-14 h-16 rounded-lg overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md"
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
                className="flex-1 h-11 rounded-xl bg-surface-container font-label-md"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex-1 h-11 rounded-xl bg-error text-on-error font-label-md font-bold disabled:opacity-60"
              >
                {busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
