'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import NumberInput from '@/components/NumberInput'
import { useAuth } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, authApi, baoCaoApi, caiDatApi } from '@/lib/api'
import { formatCurrency, parseFormattedNumber } from '@/lib/format'
import type { CaiDat, DoanhThuThang } from '@/types'

export default function CaiDatPage() {
  const { user, logout, refreshUser } = useAuth()
  const toast = useToast()

  const [settings, setSettings] = useState<CaiDat[]>([])
  const [depositRateInput, setDepositRateInput] = useState('85')
  const depositRate = Math.max(0, Math.min(100, parseFormattedNumber(depositRateInput, true)))
  const [shopPhone, setShopPhone] = useState('0365193713')
  const [extraDrafts, setExtraDrafts] = useState<Record<string, string>>({})
  const [monthlyRev, setMonthlyRev] = useState<DoanhThuThang | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState('')
  const [exportingType, setExportingType] = useState('')

  // Account modals
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [accountBusy, setAccountBusy] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [list, rev] = await Promise.all([
        caiDatApi.getAll(),
        baoCaoApi.getDoanhThu().catch(() => null),
      ])
      setSettings(list)
      setMonthlyRev(rev)

      const coc = list.find((c) => c.khoa === 'pham_tram_gia_coc')
      if (coc?.gia_tri) {
        const parsed = parseFloat(coc.gia_tri)
        if (!Number.isNaN(parsed)) setDepositRateInput(String(parsed))
      }
      const phone = list.find((c) => c.khoa === 'so_dien_thoai_lien_he')
      if (phone?.gia_tri) setShopPhone(phone.gia_tri)

      const extras: Record<string, string> = {}
      list
        .filter((c) => c.khoa !== 'pham_tram_gia_coc' && c.khoa !== 'so_dien_thoai_lien_he')
        .forEach((c) => {
          extras[c.khoa] = c.gia_tri || ''
        })
      setExtraDrafts(extras)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể tải cài đặt')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveSetting = async (khoa: string, value: string, label: string) => {
    setSavingKey(khoa)
    try {
      await caiDatApi.updateByKhoa(khoa, value)
      toast.success(`Đã lưu ${label}`)
      await loadData()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Không thể lưu ${label}`)
    } finally {
      setSavingKey('')
    }
  }

  const handleExport = async (
    loai: 'doanh_thu' | 'san_pham' | 'phieu_thue' | 'khach_hang',
    format: 'excel' | 'csv'
  ) => {
    setExportingType(`${loai}-${format}`)
    try {
      const name =
        format === 'excel'
          ? await baoCaoApi.downloadExcel({ loai })
          : await baoCaoApi.downloadCSV({ loai })
      toast.success(`Đã tải xuống ${name}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xuất file')
    } finally {
      setExportingType('')
    }
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileName.trim()) {
      toast.error('Tên không được để trống')
      return
    }
    setAccountBusy(true)
    try {
      await authApi.updateMe({ ten: profileName.trim() })
      await refreshUser()
      setShowProfileModal(false)
      toast.success('Đã cập nhật tên tài khoản')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể cập nhật tài khoản')
    } finally {
      setAccountBusy(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPass || !newPass) {
      toast.error('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới')
      return
    }
    if (newPass.length < 6) {
      toast.error('Mật khẩu mới tối thiểu 6 ký tự')
      return
    }
    if (newPass !== confirmPass) {
      toast.error('Xác nhận mật khẩu mới chưa khớp')
      return
    }
    setAccountBusy(true)
    try {
      await authApi.updateMe({ mat_khau_cu: oldPass, mat_khau_moi: newPass })
      setShowPasswordModal(false)
      setOldPass('')
      setNewPass('')
      setConfirmPass('')
      toast.success('Đã đổi mật khẩu thành công!')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể đổi mật khẩu')
    } finally {
      setAccountBusy(false)
    }
  }

  const extraSettings = settings.filter(
    (c) => c.khoa !== 'pham_tram_gia_coc' && c.khoa !== 'so_dien_thoai_lien_he'
  )

  return (
    <AppShell
      title="Cài Đặt & Báo Cáo"
      subtitle="Cấu hình cửa hàng, xuất báo cáo nhanh và bảo mật tài khoản"
      fab
      maxWidth="narrow"
    >
      <div className="flex flex-col w-full pb-6 gap-5 lg:gap-6">
        {/* Shop Profile Banner */}
        <div className="bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-primary-fixed/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary-container text-[1.875rem]">
                storefront
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#236B48] ring-2 ring-surface-container-lowest rounded-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline-md text-headline-md text-on-surface truncate">Thuê Đồ MiuMiu</h2>
                <span
                  className="material-symbols-outlined text-secondary text-[1.125rem] shrink-0"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  verified
                </span>
              </div>
              <span className="font-body-sm text-on-surface-variant truncate">
                {user ? `${user.ten} • ${user.email}` : 'Tiệm thuê áo dài & phụ kiện'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="hidden lg:inline-flex h-10 px-4 rounded-xl bg-error-container/70 hover:bg-error-container text-error font-label-md font-semibold items-center gap-1.5 shrink-0 transition-colors"
          >
            <span className="material-symbols-outlined text-[1.125rem]">logout</span>
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Left Column: Store Config + Quick Reports */}
          <div className="lg:col-span-7 flex flex-col gap-5 lg:gap-6">
            {/* Store Config Section */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-1 text-primary-container">
                <span className="material-symbols-outlined text-[1.1875rem]">tune</span>
                <h3 className="font-title-sm text-on-surface">Cài đặt cửa hàng</h3>
              </div>

              {loading ? (
                <div className="h-44 rounded-2xl bg-surface-container-low animate-pulse" />
              ) : (
                <div className="bg-surface-container-lowest rounded-xl lg:rounded-2xl p-4 lg:p-5 border border-outline-variant/20 shadow-sm space-y-4">
                  {/* Tỷ lệ tiền cọc */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-label-md text-on-surface">
                        Tỷ lệ tiền cọc gợi ý (%)
                      </label>
                      <span className="font-label-sm text-primary font-bold">
                        {depositRate}% giá gốc sản phẩm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[1.25rem]">
                          percent
                        </span>
                        <NumberInput
                          allowDecimal
                          className="w-full h-11 pl-10 pr-20 bg-surface-container-low rounded-xl text-on-surface font-title-sm border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container tabular-nums"
                          max={100}
                          min={0}
                          step={5}
                          value={depositRateInput}
                          onValueChange={(raw) => setDepositRateInput(raw)}
                          onBlur={() => {
                            if (depositRateInput === '') setDepositRateInput('0')
                          }}
                        />
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDepositRateInput(String(Math.max(0, depositRate - 5)))}
                            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[1rem]">remove</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDepositRateInput(String(Math.min(100, depositRate + 5)))}
                            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[1rem]">add</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={savingKey === 'pham_tram_gia_coc'}
                        onClick={() =>
                          handleSaveSetting('pham_tram_gia_coc', String(depositRate), 'tỷ lệ tiền cọc')
                        }
                        className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md font-semibold shrink-0 disabled:opacity-60 transition-colors"
                      >
                        {savingKey === 'pham_tram_gia_coc' ? 'Lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>

                  {/* Số điện thoại liên hệ */}
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">
                      Số điện thoại liên hệ của shop
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[1.25rem]">
                          call
                        </span>
                        <input
                          className="w-full h-11 pl-10 pr-3 bg-surface-container-low rounded-xl text-on-surface font-title-sm border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
                          type="tel"
                          value={shopPhone}
                          onChange={(e) => setShopPhone(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={savingKey === 'so_dien_thoai_lien_he'}
                        onClick={() =>
                          handleSaveSetting(
                            'so_dien_thoai_lien_he',
                            shopPhone.replace(/\s+/g, '').trim(),
                            'số điện thoại shop'
                          )
                        }
                        className="h-11 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md font-semibold shrink-0 disabled:opacity-60 transition-colors"
                      >
                        {savingKey === 'so_dien_thoai_lien_he' ? 'Lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </div>

                  {/* Các khóa cài đặt bổ sung (nếu có trong DB) */}
                  {extraSettings.map((item) => (
                    <div key={item.khoa} className="space-y-1.5 pt-2 border-t border-outline-variant/25">
                      <label className="font-label-md text-on-surface">
                        {item.mo_ta || item.khoa}
                      </label>
                      <div className="flex items-center gap-2">
                        {item.kieu_du_lieu === 2 ? (
                          <NumberInput
                            allowDecimal
                            value={extraDrafts[item.khoa] ?? ''}
                            onValueChange={(raw) =>
                              setExtraDrafts((prev) => ({ ...prev, [item.khoa]: raw }))
                            }
                            className="flex-1 h-10 px-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-body-md tabular-nums"
                          />
                        ) : (
                          <input
                            type="text"
                            value={extraDrafts[item.khoa] ?? ''}
                            onChange={(e) =>
                              setExtraDrafts((prev) => ({ ...prev, [item.khoa]: e.target.value }))
                            }
                            className="flex-1 h-10 px-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-body-md"
                          />
                        )}
                        <button
                          type="button"
                          disabled={savingKey === item.khoa}
                          onClick={() => {
                            const rawVal = extraDrafts[item.khoa] ?? ''
                            const cleanedVal =
                              item.kieu_du_lieu === 2 && rawVal.endsWith('.')
                                ? rawVal.slice(0, -1)
                                : rawVal
                            handleSaveSetting(item.khoa, cleanedVal, item.mo_ta || item.khoa)
                          }}
                          className="h-10 px-4 rounded-xl bg-surface-container-high hover:bg-primary-container hover:text-on-primary font-label-md shrink-0 transition-colors"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reports & Export Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1.5 text-primary-container">
                  <span className="material-symbols-outlined text-[1.1875rem]">query_stats</span>
                  <h3 className="font-title-sm text-on-surface">Báo cáo &amp; Xuất dữ liệu</h3>
                </div>
                <Link
                  href="/bao-cao"
                  className="font-label-sm text-primary-container hover:text-primary font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  Mở trang báo cáo →
                </Link>
              </div>

              <div className="bg-surface-container-lowest rounded-xl lg:rounded-2xl p-1.5 border border-outline-variant/20 shadow-sm space-y-1">
                {[
                  {
                    loai: 'doanh_thu' as const,
                    icon: 'payments',
                    iconBg: 'bg-surface-container',
                    label: 'Doanh thu theo tháng',
                    sub: monthlyRev
                      ? `Tháng ${monthlyRev.thang}/${monthlyRev.nam} • ${formatCurrency(monthlyRev.tong_tien)}`
                      : 'Tổng tiền thuê & phạt đã trả',
                  },
                  {
                    loai: 'san_pham' as const,
                    icon: 'auto_awesome',
                    iconBg: 'bg-secondary-fixed/40',
                    label: 'Hiệu quả sản phẩm',
                    sub: 'Số lần thuê, doanh thu & thu hồi vốn',
                  },
                  {
                    loai: 'phieu_thue' as const,
                    icon: 'assignment',
                    iconBg: 'bg-tertiary-fixed/40',
                    label: 'Danh sách phiếu thuê',
                    sub: 'Toàn bộ lịch sử đơn, cọc & trạng thái',
                  },
                  {
                    loai: 'khach_hang' as const,
                    icon: 'group',
                    iconBg: 'bg-primary-fixed/40',
                    label: 'Danh sách khách hàng',
                    sub: 'Tên, SĐT, địa chỉ & số lần thuê',
                  },
                ].map((item) => (
                  <div
                    key={item.loai}
                    className="p-3 rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-between gap-2"
                  >
                    <Link href="/bao-cao" className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center text-primary-container shrink-0`}
                      >
                        <span className="material-symbols-outlined text-[1.3125rem]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-sm text-body-md text-on-surface truncate">
                          {item.label}
                        </span>
                        <span className="font-body-sm text-on-surface-variant truncate">{item.sub}</span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={exportingType !== ''}
                        onClick={() => handleExport(item.loai, 'excel')}
                        className="h-8 px-2.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary text-primary font-label-sm flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[0.9375rem]">file_download</span>
                        <span>Excel</span>
                      </button>
                      <button
                        type="button"
                        disabled={exportingType !== ''}
                        onClick={() => handleExport(item.loai, 'csv')}
                        className="h-8 px-2.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-sm transition-all disabled:opacity-50"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Account & Security */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 flex flex-col gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-1 text-primary-container">
                <span className="material-symbols-outlined text-[1.1875rem]">security</span>
                <h3 className="font-title-sm text-on-surface">Tài khoản &amp; Bảo mật</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-xl lg:rounded-2xl p-2 border border-outline-variant/20 shadow-sm space-y-1">
                <div className="p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[1.25rem]">manage_accounts</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-sm text-body-md text-on-surface truncate">
                        {user?.ten || 'Tài khoản'}
                      </span>
                      <span className="font-body-sm text-on-surface-variant truncate">
                        {user?.email || '—'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileName(user?.ten || '')
                      setShowProfileModal(true)
                    }}
                    className="h-8 px-3.5 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md shrink-0 transition-colors"
                  >
                    Đổi tên
                  </button>
                </div>

                <div className="p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[1.25rem]">lock_reset</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-sm text-body-md text-on-surface">Đổi mật khẩu</span>
                      <span className="font-body-sm text-on-surface-variant">
                        Bảo mật tài khoản đăng nhập
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="h-8 px-3.5 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md shrink-0 transition-colors"
                  >
                    Thay đổi
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Logout Button */}
            <div className="pt-1 lg:hidden">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full h-12 px-4 rounded-xl bg-error-container/70 hover:bg-error-container text-on-error-container flex items-center justify-center gap-2 font-title-sm active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[1.25rem] text-error">logout</span>
                <span className="font-semibold text-error">Đăng xuất tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Name Modal */}
      {showProfileModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-name-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !accountBusy && setShowProfileModal(false)}
          />

          <form
            onSubmit={handleUpdateName}
            className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10"
          >
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h4
                id="edit-profile-name-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Đổi tên hiển thị
              </h4>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Tên hiển thị *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Nhập tên mới"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                />
              </div>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="shrink-0 min-w-[5.5rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={accountBusy}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              >
                {accountBusy ? 'Đang lưu...' : 'Lưu tên'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => !accountBusy && setShowPasswordModal(false)}
          />

          <form
            onSubmit={handleChangePassword}
            className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10"
          >
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <div className="flex items-center gap-2 text-primary-container">
                <span className="material-symbols-outlined text-[1.375rem]">password</span>
                <h4
                  id="change-password-modal-title"
                  className="font-headline-md text-headline-md font-bold text-on-surface"
                >
                  Đổi mật khẩu
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="shrink-0 min-w-[5.5rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={accountBusy}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all disabled:opacity-60"
              >
                {accountBusy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-logout-modal-title"
          className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center md:items-center md:p-6"
        >
          <div
            className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />

          <div className="relative w-full max-w-2xl md:max-w-4xl mx-auto max-h-[88vh] md:max-h-[84vh] bg-surface-container-lowest rounded-t-[1.75rem] md:rounded-2xl shadow-[0_-8px_32px_rgba(79,9,41,0.18)] md:shadow-2xl flex flex-col overflow-hidden pb-safe md:pb-0 z-10">
            <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
            </div>

            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-surface-container-high shrink-0">
              <h4
                id="settings-logout-modal-title"
                className="font-headline-md text-headline-md font-bold text-on-surface"
              >
                Đăng xuất khỏi MiuMiu?
              </h4>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[1.25rem]">close</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4">
              <p className="font-body-md text-body-md text-on-surface-variant">
                Bạn sẽ cần đăng nhập lại bằng email và mật khẩu để tiếp tục sử dụng.
              </p>
            </div>

            <div className="p-4 md:px-6 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-end gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="shrink-0 min-w-[5.5rem] md:min-w-[7.5rem] h-11 md:h-12 px-4 md:px-5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="flex-1 md:flex-none md:min-w-[12.5rem] h-11 md:h-12 px-5 md:px-6 rounded-xl bg-error hover:opacity-90 text-on-error font-title-sm text-title-sm font-bold shadow-md active:scale-95 transition-all"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
