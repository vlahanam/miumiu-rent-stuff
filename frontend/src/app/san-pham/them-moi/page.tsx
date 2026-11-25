'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
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
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Thêm Sản Phẩm" backHref="/san-pham" />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3.5">
            <h2 className="font-title-sm text-title-sm text-on-surface">Thông tin cơ bản</h2>

            <div className="flex flex-col gap-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
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

              <div className="flex flex-col gap-1">
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
          </section>

          {/* Hình ảnh */}
          <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-3">
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
                className="flex-1 h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-sm focus:outline-none focus:border-primary-container"
              />
              <button
                type="button"
                onClick={addImage}
                className="h-11 px-4 rounded-xl bg-primary-fixed text-on-primary-fixed-variant font-label-md font-semibold shrink-0 hover:bg-primary-container hover:text-on-primary transition-colors"
              >
                Thêm ảnh
              </button>
            </div>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {imageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-primary-container/90 text-on-primary text-[10px] font-semibold">
                        Đại diện
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>{submitting ? 'Đang lưu sản phẩm...' : 'Lưu sản phẩm'}</span>
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  )
}
