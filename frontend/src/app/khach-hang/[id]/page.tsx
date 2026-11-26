'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { ThueDoStatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/components/ToastProvider'
import { ApiError, khachHangApi } from '@/lib/api'
import { formatCurrency, formatDate, formatPhone, getInitials } from '@/lib/format'
import type { KhachHangDetail, ThueDo } from '@/types'

function OrderRow({ order }: { order: ThueDo }) {
  const firstItem = order.chi_tiet?.[0]?.san_pham?.ten_san_pham || `${order.chi_tiet?.length || 0} sản phẩm`
  const extra = Math.max(0, (order.chi_tiet?.length || 0) - 1)
  return (
    <Link
      href={`/don-thue/${order.id}`}
      className="p-3 lg:px-4 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between gap-3 transition-colors"
    >
      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
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
          <div className="font-body-sm text-on-surface truncate mt-0.5">
            {firstItem}
            {extra > 0 ? ` (+${extra} món)` : ''}
          </div>
        </div>
        <div className="font-label-sm text-on-surface-variant shrink-0 tabular-nums">
          {formatDate(order.ngay_bat_dau)} → {formatDate(order.ngay_hen_tra)}
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
    <AppShell
      title={kh?.ten || 'Chi tiết khách hàng'}
      subtitle={kh ? formatPhone(kh.so_dien_thoai) : undefined}
      backHref="/khach-hang"
      backLabel="Khách hàng"
    >
      <div className="flex flex-col gap-4 lg:gap-6">
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 h-64 rounded-2xl bg-surface-container-low animate-pulse" />
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
              <div className="h-56 rounded-2xl bg-surface-container-low animate-pulse" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl bg-error-container text-on-error-container flex flex-col items-center text-center gap-2">
            <span className="material-symbols-outlined text-[2rem]">error</span>
            <span>{error}</span>
            <Link href="/khach-hang" className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md whitespace-nowrap">
              Quay lại danh sách
            </Link>
          </div>
        )}

        {!loading && detail && kh && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
            {/* Left Sticky Profile Card */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
              <section className="p-4 lg:p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-4">
                <div className="flex items-center lg:flex-col lg:text-center gap-3.5">
                  <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-headline-lg text-headline-lg lg:text-[1.75rem] shrink-0">
                    {getInitials(kh.ten)}
                  </div>
                  <div className="min-w-0 flex-1 lg:w-full">
                    <h1 className="font-headline-md text-headline-md text-on-surface truncate">{kh.ten}</h1>
                    <a
                      href={`tel:${kh.so_dien_thoai}`}
                      className="font-body-md text-primary-container hover:text-primary font-semibold flex items-center lg:justify-center gap-1 mt-0.5 w-fit lg:mx-auto transition-colors"
                    >
                      <span className="material-symbols-outlined text-[1rem]">call</span>
                      {formatPhone(kh.so_dien_thoai)}
                    </a>
                    <span className="font-label-sm text-outline block mt-1">
                      Khách từ {formatDate(kh.ngay_tao)}
                    </span>
                  </div>
                </div>

                {/* Mini Stats */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface-container-low text-center">
                    <div className="font-headline-md text-primary-container font-bold tabular-nums">
                      {detail.so_lan_thue}
                    </div>
                    <div className="font-label-sm text-on-surface-variant">Lần thuê xong</div>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low text-center">
                    <div className="font-headline-md text-secondary font-bold tabular-nums">
                      {detail.dang_thue.length}
                    </div>
                    <div className="font-label-sm text-on-surface-variant">Đơn đang mở</div>
                  </div>
                </div>

                {kh.dia_chi && (
                  <div className="p-3 rounded-xl bg-surface-container-low font-body-sm text-on-surface-variant flex items-start gap-2">
                    <span className="material-symbols-outlined text-[1rem] shrink-0 mt-0.5 text-primary-container">
                      location_on
                    </span>
                    <span>{kh.dia_chi}</span>
                  </div>
                )}

                <div className="flex flex-wrap lg:flex-col gap-2">
                  <Link
                    href={`/don-thue/tao-moi?khach_hang_id=${kh.id}`}
                    className="flex-1 lg:w-full min-w-fit h-11 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">receipt_long</span>
                    <span>Tạo đơn mới</span>
                  </Link>
                  <div className="flex gap-2 lg:w-full">
                    <button
                      type="button"
                      onClick={openEdit}
                      className="flex-1 h-11 px-3.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-1 hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">edit</span>
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDelete(true)}
                      className="flex-1 h-11 px-3.5 rounded-xl bg-error-container/70 text-on-error-container font-label-md text-label-md flex items-center justify-center gap-1 hover:bg-error-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-[1.125rem]">delete</span>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Orders History Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 lg:gap-5">
              {/* Đang thuê / Quá hạn / Chờ xác nhận */}
              <section className="p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3">
                <h2 className="font-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[1.125rem] text-secondary">pending_actions</span>
                  Phiếu đang hoạt động ({detail.dang_thue.length})
                </h2>
                {detail.dang_thue.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-4 text-center bg-surface-container-low/50 rounded-xl">
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
              <section className="p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3">
                <h2 className="font-title-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[1.125rem] text-primary-container">history</span>
                  Lịch sử thuê ({detail.lich_su.length})
                </h2>
                {detail.lich_su.length === 0 ? (
                  <p className="font-body-sm text-on-surface-variant py-4 text-center bg-surface-container-low/50 rounded-xl">
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
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && kh && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-customer-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !busy && setShowEdit(false)}
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
                id="edit-customer-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Sửa thông tin khách hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
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
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Địa chỉ</label>
                <input
                  type="text"
                  maxLength={255}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                />
              </div>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
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

      {/* Delete Modal */}
      {showDelete && kh && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-customer-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !busy && setShowDelete(false)}
          />

          <div className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10">
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h3
                id="delete-customer-modal-title"
                className="font-headline-md text-headline-md font-bold text-error"
              >
                Xóa khách hàng?
              </h3>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Bạn chắc chắn muốn xóa hồ sơ <strong className="text-on-surface">{kh.ten}</strong>? Khách hàng đã có phiếu thuê
                không thể xóa để giữ lịch sử giao dịch.
              </p>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="shrink-0 min-w-[6rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-error hover:opacity-90 text-on-error font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              >
                {busy ? 'Đang xóa...' : 'Xóa khách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
