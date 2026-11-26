'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import NumberInput from '@/components/NumberInput'
import { useToast } from '@/components/ToastProvider'
import { ApiError, caiDatApi, sanPhamApi } from '@/lib/api'
import { formatCurrency, parseFormattedNumber, serializeImages } from '@/lib/format'

export default function ThemMoiSanPhamPage() {
  const router = useRouter()
  const toast = useToast()

  const [tenSanPham, setTenSanPham] = useState('')
  const [giaGoc, setGiaGoc] = useState('')
  const [giaThue, setGiaThue] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [depositPercent, setDepositPercent] = useState(85)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    caiDatApi
      .getAll()
      .then((list) => {
        const coc = list.find((c) => c.khoa === 'pham_tram_gia_coc')
        if (coc?.gia_tri) {
          const n = parseFloat(coc.gia_tri)
          if (!Number.isNaN(n) && n >= 0) setDepositPercent(n)
        }
      })
      .catch(() => {})
  }, [])

  const addImage = () => {
    const url = newImageUrl.trim()
    if (!url) return
    if (imageUrls.includes(url)) {
      toast.info('Đường dẫn ảnh này đã có trong danh sách')
      return
    }
    setImageUrls((prev) => [...prev, url])
    setNewImageUrl('')
  }

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const name = tenSanPham.trim()
    if (!name) {
      setErrorMsg('Vui lòng nhập tên sản phẩm.')
      return
    }

    const giaGocNum = Math.max(0, parseFormattedNumber(giaGoc))
    const giaThueNum = Math.max(0, parseFormattedNumber(giaThue))

    // Nếu người dùng gõ URL vào ô nhưng chưa bấm nút "+" thì gom luôn
    const finalImages = newImageUrl.trim()
      ? [...imageUrls, newImageUrl.trim()]
      : imageUrls

    setSubmitting(true)
    try {
      const created = await sanPhamApi.create({
        ten_san_pham: name,
        gia_goc_san_pham: giaGocNum,
        gia_thue_ngay: giaThueNum,
        hinh_anh: serializeImages(finalImages),
      })
      toast.success(`Đã thêm sản phẩm ${created.ma_san_pham}`)
      router.push(`/san-pham/${created.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tạo sản phẩm'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const suggestedDeposit = Math.round((parseFormattedNumber(giaGoc) * depositPercent) / 100)

  return (
    <AppShell
      title="Thêm Sản Phẩm"
      subtitle="Mã SKU sẽ được tự sinh với tiền tố MIU- và trạng thái Trống lịch"
      backHref="/san-pham"
      backLabel="Sản phẩm"
      maxWidth="narrow"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:gap-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-[1.125rem] shrink-0 mt-0.5">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left Column: Thông tin cơ bản */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-5">
            <section className="p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[1.125rem]">checkroom</span>
                </div>
                <h2 className="font-title-sm text-title-sm text-on-surface">Thông tin cơ bản</h2>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-on-surface">Tên sản phẩm *</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={tenSanPham}
                  onChange={(e) => setTenSanPham(e.target.value)}
                  placeholder="Ví dụ: Áo dài gấm đỏ đô thêu phụng (Size M)"
                  className="h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface">Giá gốc mua vào (VND) *</label>
                  <NumberInput
                    required
                    min={0}
                    step={10000}
                    value={giaGoc}
                    onValueChange={setGiaGoc}
                    placeholder="2.000.000"
                    className="h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                  <span className="font-label-sm text-secondary">
                    Cọc gợi ý ({depositPercent}%): <strong>{formatCurrency(suggestedDeposit)}</strong>
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface">Giá thuê 1 ngày (VND) *</label>
                  <NumberInput
                    required
                    min={0}
                    step={10000}
                    value={giaThue}
                    onValueChange={setGiaThue}
                    placeholder="300.000"
                    className="h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md tabular-nums focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low/80 border border-outline-variant/20 flex items-start gap-2.5 text-on-surface-variant font-body-sm">
                <span className="material-symbols-outlined text-[1.125rem] text-primary-container shrink-0 mt-0.5">
                  info
                </span>
                <span>
                  Mỗi sản phẩm trong kho là duy nhất (SL = 1). Nếu có 2 bộ giống nhau, hãy tạo thành 2 sản phẩm riêng để theo dõi lịch thuê chính xác.
                </span>
              </div>
            </section>

            {/* Desktop Action Bar */}
            <div className="hidden lg:flex items-center justify-end gap-3">
              <Link
                href="/san-pham"
                className="h-11 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md whitespace-nowrap flex items-center transition-colors"
              >
                Hủy bỏ
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 rounded-xl bg-primary-container text-on-primary font-title-sm text-[0.875rem] font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[1.1875rem]">save</span>
                <span>{submitting ? 'Đang lưu sản phẩm...' : 'Lưu sản phẩm'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hình ảnh & Live Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 flex flex-col gap-4">
            <section className="p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3.5">
              <div>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Hình ảnh sản phẩm (không bắt buộc)
                </h2>
                <p className="font-body-sm text-on-surface-variant mt-0.5">
                  Nhập đường dẫn ảnh (URL). Ảnh đầu tiên sẽ là ảnh đại diện.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/ao-dai.jpg"
                  className="flex-1 h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container min-w-0"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="h-11 px-4 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-md font-semibold shrink-0 hover:bg-primary-container hover:text-on-primary transition-colors"
                >
                  Thêm ảnh
                </button>
              </div>

              {/* Desktop Cover Preview */}
              {imageUrls.length === 0 ? (
                <div className="hidden lg:flex flex-col items-center justify-center aspect-[4/3] rounded-xl bg-surface-container-low border border-dashed border-outline-variant/40 text-outline gap-2">
                  <span className="material-symbols-outlined text-[2.625rem]">add_photo_alternate</span>
                  <span className="font-body-sm text-on-surface-variant">Xem trước ảnh đại diện</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {imageUrls.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className={`relative rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 ${
                        idx === 0 ? 'col-span-3 aspect-[16/10] lg:aspect-[4/3]' : 'aspect-[4/5]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-primary-container/90 text-on-primary text-[0.6875rem] font-semibold">
                          Ảnh đại diện
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[1rem]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Mobile Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="lg:hidden w-full h-12 px-4 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary disabled:opacity-60 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[1.25rem]">save</span>
              <span>{submitting ? 'Đang lưu sản phẩm...' : 'Lưu sản phẩm'}</span>
            </button>
          </div>
        </div>
      </form>
    </AppShell>
  )
}
