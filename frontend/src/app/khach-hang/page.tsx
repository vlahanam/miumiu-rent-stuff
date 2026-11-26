'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi, khachHangApi } from '@/lib/api'
import { formatPhone, getInitials } from '@/lib/format'
import type { KhachHangListItem } from '@/types'

const avatarPalettes = [
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-tertiary-fixed text-on-tertiary-fixed',
  'bg-primary-fixed text-primary',
  'bg-primary-container text-on-primary',
  'bg-secondary-container text-on-secondary-container',
]

export default function KhachHangPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState<KhachHangListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadCustomers = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const res = await khachHangApi.getAll({
          search: debouncedSearch || undefined,
          filter: filter || undefined,
          page: pageNum,
          limit: 20,
        })
        const rows = res.data || []
        setCustomers((prev) => (append ? [...prev, ...rows] : rows))
        setTotal(res.total || 0)
        setPage(pageNum)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không thể tải danh sách khách hàng')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [debouncedSearch, filter, toast]
  )

  useEffect(() => {
    loadCustomers(1, false)
  }, [loadCustomers])

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newPhone.trim()) {
      toast.error('Vui lòng nhập tên và số điện thoại')
      return
    }
    setSaving(true)
    try {
      await khachHangApi.create({
        ten: newName.trim(),
        so_dien_thoai: newPhone.replace(/\s+/g, '').trim(),
        dia_chi: newAddress.trim() || null,
      })
      toast.success('Đã thêm khách hàng mới')
      setShowAddModal(false)
      setNewName('')
      setNewPhone('')
      setNewAddress('')
      loadCustomers(1, false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể thêm khách hàng')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const name = await baoCaoApi.downloadExcel({ loai: 'khach_hang' })
      toast.success(`Đã xuất tệp ${name}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xuất file')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell
      title="Khách Hàng"
      subtitle={`${total} hồ sơ khách hàng`}
      fab
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            title="Xuất danh sách khách hàng"
            className="h-8 lg:h-9 px-2.5 lg:px-3.5 rounded-full lg:rounded-xl bg-surface-container text-primary-container hover:bg-primary-fixed font-label-sm lg:font-label-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] lg:text-[18px]">file_download</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="hidden lg:inline-flex h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md font-bold items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Thêm khách hàng</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col w-full gap-space-md lg:gap-5">
        {/* Mobile Summary + Quick Add */}
        <div className="flex lg:hidden items-center justify-between bg-surface-container-low px-space-md py-space-sm rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">loyalty</span>
            </div>
            <div>
              <span className="font-headline-md text-headline-md text-on-surface tabular-nums">
                {total}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant ml-1.5">
                hồ sơ khách hàng
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm active:scale-95 transition-transform shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            <span>Thêm mới</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <section className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm lg:gap-3 lg:p-3.5 lg:rounded-2xl lg:bg-surface-container-lowest lg:border lg:border-outline-variant/20 lg:shadow-sm">
          <div className="relative flex items-center w-full xl:w-80 2xl:w-96 shrink-0">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full h-11 lg:h-10 pl-10 pr-9 rounded-xl bg-surface-container-lowest lg:bg-surface-container-low text-on-surface font-body-md lg:font-body-sm placeholder:text-outline border border-outline-variant/25 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container shadow-sm lg:shadow-none"
              placeholder="Tìm theo số điện thoại hoặc tên..."
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap no-scrollbar py-0.5 lg:py-0">
            {[
              { key: '', label: 'Tất cả', dot: '' },
              { key: 'dang_thue', label: 'Đang thuê / Đặt trước', dot: 'bg-secondary-container' },
              { key: 'khach_moi', label: 'Khách mới', dot: 'bg-[#236B48]' },
            ].map((chip) => {
              const active = filter === chip.key
              return (
                <button
                  key={chip.key || 'all'}
                  type="button"
                  onClick={() => setFilter(chip.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-label-md text-label-md shrink-0 active:scale-95 transition-all ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest lg:bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  {chip.dot && <span className={`w-2 h-2 rounded-full ${chip.dot}`} />}
                  <span>{chip.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 lg:h-16 rounded-xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && customers.length === 0 && (
          <div className="py-12 lg:py-16 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-2.5">
            <span className="material-symbols-outlined text-[42px] text-outline">group</span>
            <h3 className="font-title-sm text-title-sm text-on-surface">Chưa có khách hàng nào</h3>
            <p className="font-body-sm text-on-surface-variant">
              {debouncedSearch || filter
                ? 'Không tìm thấy khách hàng khớp bộ lọc.'
                : 'Bấm "Thêm khách hàng" hoặc thêm nhanh khi tạo đơn thuê.'}
            </p>
            {!debouncedSearch && !filter && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-1 px-4 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md transition-colors"
              >
                + Thêm khách hàng mới
              </button>
            )}
          </div>
        )}

        {/* Mobile Customer Cards */}
        {!loading && customers.length > 0 && (
          <div className="flex lg:hidden flex-col gap-space-md">
            {customers.map((customer) => {
              const avatarCls = avatarPalettes[customer.id % avatarPalettes.length]
              return (
                <div
                  key={customer.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/khach-hang/${customer.id}`}
                      className="flex items-center gap-space-sm min-w-0 flex-1"
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-headline-md text-headline-md ${avatarCls}`}
                      >
                        {getInitials(customer.ten)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-title-sm text-title-sm text-on-surface truncate">
                            {customer.ten}
                          </span>
                          {customer.so_phieu_dang_thue > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[10px] font-semibold shrink-0">
                              {customer.so_phieu_dang_thue} đơn đang mở
                            </span>
                          )}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {formatPhone(customer.so_dien_thoai)}
                        </span>
                      </div>
                    </Link>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm shrink-0 ${
                        customer.so_lan_thue >= 3
                          ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                          : 'bg-surface-container-high text-primary-container'
                      }`}
                    >
                      {customer.so_lan_thue} lần thuê
                    </span>
                  </div>

                  {customer.dia_chi && (
                    <div className="bg-surface-container-low px-3 py-2 rounded-lg">
                      <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">location_on</span>
                        {customer.dia_chi}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${customer.so_dien_thoai}`}
                        className="h-8 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm flex items-center gap-1 hover:bg-surface-container-high active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px]">call</span>
                        Gọi
                      </a>
                      <Link
                        href={`/khach-hang/${customer.id}`}
                        className="h-8 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm flex items-center gap-1 hover:bg-surface-container-high active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px]">history</span>
                        Lịch sử
                      </Link>
                    </div>
                    <Link
                      href={`/don-thue/tao-moi?khach_hang_id=${customer.id}`}
                      className="h-8 px-3.5 rounded-full bg-primary-container text-on-primary font-label-sm flex items-center gap-1 active:scale-95 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                      Tạo đơn
                    </Link>
                  </div>
                </div>
              )
            })}

            {customers.length < total && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => loadCustomers(page + 1, true)}
                className="h-11 rounded-xl bg-surface-container text-primary-container font-label-md"
              >
                {loadingMore ? 'Đang tải thêm...' : `Tải thêm (${customers.length}/${total})`}
              </button>
            )}
          </div>
        )}

        {/* Desktop Customer Directory Table */}
        {!loading && customers.length > 0 && (
          <section className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3.5 pl-5 pr-3">Khách hàng</th>
                    <th className="py-3.5 px-3">Số điện thoại</th>
                    <th className="py-3.5 px-3">Địa chỉ</th>
                    <th className="py-3.5 px-3 text-center">Lượt thuê</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {customers.map((customer) => {
                    const avatarCls = avatarPalettes[customer.id % avatarPalettes.length]
                    return (
                      <tr key={customer.id} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="py-3.5 pl-5 pr-3">
                          <Link
                            href={`/khach-hang/${customer.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-title-sm font-bold ${avatarCls}`}
                            >
                              {getInitials(customer.ten)}
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="font-title-sm text-[14px] text-on-surface group-hover:text-primary-container transition-colors truncate">
                                {customer.ten}
                              </span>
                              {customer.so_phieu_dang_thue > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[10px] font-semibold shrink-0">
                                  {customer.so_phieu_dang_thue} đơn đang mở
                                </span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <a
                            href={`tel:${customer.so_dien_thoai}`}
                            className="font-body-sm font-medium text-on-surface hover:text-primary-container inline-flex items-center gap-1.5 tabular-nums"
                          >
                            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                              call
                            </span>
                            {formatPhone(customer.so_dien_thoai)}
                          </a>
                        </td>
                        <td className="py-3.5 px-3 max-w-[280px]">
                          <span className="font-body-sm text-on-surface-variant line-clamp-1">
                            {customer.dia_chi || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full font-label-sm text-label-sm tabular-nums ${
                              customer.so_lan_thue >= 3
                                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                                : 'bg-surface-container-high text-primary-container'
                            }`}
                          >
                            {customer.so_lan_thue} lần thuê
                          </span>
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/khach-hang/${customer.id}`}
                              className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">history</span>
                              Hồ sơ
                            </Link>
                            <Link
                              href={`/don-thue/tao-moi?khach_hang_id=${customer.id}`}
                              className="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                              Tạo đơn
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/40 flex items-center justify-between gap-4">
              <span className="font-label-sm text-on-surface-variant">
                Đang hiển thị <strong className="text-on-surface">{customers.length}</strong> /{' '}
                <strong className="text-on-surface">{total}</strong> khách hàng
              </span>
              {customers.length < total && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadCustomers(page + 1, true)}
                  className="h-9 px-4 rounded-xl bg-surface-container hover:bg-primary-fixed text-primary-container font-label-md transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Đang tải thêm...' : 'Tải thêm khách hàng'}
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Modal thêm khách hàng */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !saving && setShowAddModal(false)}
          />

          <form
            onSubmit={handleCreateCustomer}
            className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[28px] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10"
          >
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h3
                id="add-customer-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Thêm khách hàng mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
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
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nguyễn Thu Hà"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    maxLength={20}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Địa chỉ (không bắt buộc)</label>
                <input
                  type="text"
                  maxLength={255}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Cầu Giấy, Hà Nội"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                />
              </div>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 md:flex-none md:min-w-[120px] h-11 md:h-12 px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 md:flex-none md:min-w-[200px] h-11 md:h-12 px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu khách hàng'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  )
}
