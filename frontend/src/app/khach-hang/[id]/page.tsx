'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/ToastProvider'
import { ApiError, khachHangApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateShort, formatPhone, getInitials } from '@/lib/format'
import type { KhachHangDetail, ThueDo } from '@/types'

function OrderRow({ order }: { order: ThueDo }) {
  const firstItem = order.chi_tiet?.[0]?.san_pham?.ten_san_pham || `${order.chi_tiet?.length || 0} sản phẩm`
  const extra = Math.max(0, (order.chi_tiet?.length || 0) - 1)
  return (
    <Link
      href={`/don-thue/${order.id}`}
      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between gap-2 transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-title-sm text-body-md text-primary-container font-bold">
            {order.ma_phieu_thue}
          </span>
          <span className="text-outline">•</span>
          <span className="font-currency-lg text-body-md text-on-surface font-bold tabular-nums">
            {formatCurrency(order.tong_tien_thue)}
          </span>
        </div>
        <div className="font-body-sm text-on-surface truncate">
          {firstItem}
          {extra > 0 ? ` (+${extra} món)` : ''}
        </div>
        <div className="font-label-sm text-on-surface-variant mt-0.5">
          {formatDateShort(order.ngay_bat_dau)} → {formatDateShort(order.ngay_hen_tra)}
        </div>
      </div>
      <ThueDoStatusBadge status={order.trang_thai} />
    </Link>
  )
}

export default function KhachHangDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const customerId = params?.id

  const [detail, setDetail] = useState<KhachHangDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Edit modal
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setError('')
    try {
      const data = await khachHangApi.getById(customerId)
      setDetail(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải thông tin khách hàng')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const openEdit = () => {
    if (!detail) return
    setEditName(detail.khach_hang.ten)
    setEditPhone(detail.khach_hang.so_dien_thoai)
    setEditAddress(detail.khach_hang.dia_chi || '')
    setShowEdit(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail) return
    setBusy(true)
    try {
      await khachHangApi.update(detail.khach_hang.id, {
        ten: editName.trim(),
        so_dien_thoai: editPhone.replace(/\s+/g, '').trim(),
        dia_chi: editAddress.trim() || null,
      })
      setShowEdit(false)
      toast.success('Đã cập nhật thông tin khách hàng')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể cập nhật')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!detail) return
    setBusy(true)
    try {
      await khachHangApi.delete(detail.khach_hang.id)
      toast.success('Đã xóa khách hàng')
      router.replace('/khach-hang')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xóa khách hàng')
      setShowDelete(false)
    } finally {
      setBusy(false)
    }
  }

  const kh = detail?.khach_hang

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title={kh?.ten || 'Chi tiết khách hàng'} backHref="/khach-hang" />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col gap-4 pt-4">
          {loading && (
            <div className="flex flex-col gap-3">
              <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
              <div className="h-32 rounded-2xl bg-surface-container-low animate-pulse" />
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <span>{error}</span>
              <Link href="/khach-hang" className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md">
                Quay lại danh sách
              </Link>
            </div>
          )}

          {!loading && detail && kh && (
            <>
              {/* Profile Card */}
              <section className="p-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-headline-lg shrink-0">
                    {getInitials(kh.ten)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-headline-md text-on-surface truncate">{kh.ten}</h1>
                    <a
                      href={`tel:${kh.so_dien_thoai}`}
                      className="font-body-md text-primary-container font-semibold flex items-center gap-1 mt-0.5 w-fit"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      {formatPhone(kh.so_dien_thoai)}
                    </a>
                    <span className="font-label-sm text-outline">
                      Khách từ {formatDate(kh.ngay_tao)} • {detail.so_lan_thue} lần thuê hoàn tất
                    </span>
                  </div>
                </div>

                {kh.dia_chi && (
                  <div className="p-2.5 rounded-xl bg-surface-container-low font-body-sm text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    <span>{kh.dia_chi}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/don-thue/tao-moi?khach_hang_id=${kh.id}`}
                    className="flex-1 min-w-[130px] h-11 px-4 rounded-xl bg-primary-container text-on-primary font-label-md font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    Tạo đơn mới
                  </Link>
                  <button
                    type="button"
                    onClick={openEdit}
                    className="h-11 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-md flex items-center gap-1 hover:bg-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="h-11 px-3.5 rounded-xl bg-error-container/70 text-on-error-container font-label-md flex items-center gap-1 hover:bg-error-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Xóa
                  </button>
                </div>
              </section>

              {/* Đang thuê / Quá hạn / Chờ xác nhận */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2.5">
                <h2 className="font-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-secondary">pending_actions</span>
                  Phiếu đang hoạt động ({detail.dang_thue.length})
                </h2>
                {detail.dang_thue.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-2">
                    Khách hiện không có phiếu đang thuê hoặc đặt trước.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.dang_thue.map((td) => (
                      <OrderRow key={td.id} order={td} />
                    ))}
                  </div>
                )}
              </section>

              {/* Lịch sử đã trả / đã hủy */}
              <section className="p-4 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-2.5">
                <h2 className="font-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">history</span>
                  Lịch sử thuê ({detail.lich_su.length})
                </h2>
                {detail.lich_su.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-2">
                    Chưa có lịch sử phiếu đã hoàn tất.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.lich_su.map((td) => (
                      <OrderRow key={td.id} order={td} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEdit && kh && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-on-surface">Sửa thông tin khách hàng</h3>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Tên khách hàng *</label>
              <input
                type="text"
                required
                maxLength={100}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Số điện thoại *</label>
              <input
                type="tel"
                required
                maxLength={20}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-on-surface-variant">Địa chỉ</label>
              <input
                type="text"
                maxLength={255}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-body-md"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
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

      {/* Delete Modal */}
      {showDelete && kh && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5">
            <h3 className="font-headline-md text-error">Xóa khách hàng?</h3>
            <p className="font-body-sm text-on-surface-variant">
              Bạn chắc chắn muốn xóa hồ sơ <strong>{kh.ten}</strong>? Khách hàng đã có phiếu thuê
              không thể xóa để giữ lịch sử giao dịch.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
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
                {busy ? 'Đang xóa...' : 'Xóa khách'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
