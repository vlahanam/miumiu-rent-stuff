'use client'

import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import { useState } from 'react'

function FakeMapImage() {
  return (
    <div className="w-full h-24 rounded-lg bg-tertiary-fixed/30 flex items-center justify-center relative overflow-hidden shadow-inner">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-0.5 opacity-20">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="w-6 h-5 bg-on-surface rounded-sm" />
          ))}
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1">
        <span className="material-symbols-outlined text-primary-container text-[32px]">pin_drop</span>
        <span className="font-label-sm text-label-sm text-on-surface bg-surface/80 px-2 py-0.5 rounded-full">
          124 Phố Huế, Hai Bà Trưng
        </span>
      </div>
    </div>
  )
}

export default function CaiDatPage() {
  const [depositRate, setDepositRate] = useState(85)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }

  const simulateExport = (fileName: string) => {
    setTimeout(() => {
      showToast(`Đã xuất tệp ${fileName} thành công`)
    }, 900)
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Cài Đặt" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-16 inset-x-4 z-50 flex justify-center pointer-events-none">
          <div className="bg-primary-container text-on-primary px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-all">
            <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">check_circle</span>
            <span className="font-label-md text-label-md">{toast}</span>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full pb-8 space-y-5 pt-4">

          {/* Shop Profile */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0 w-14 h-14 rounded-full overflow-hidden shadow-sm bg-primary-fixed/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container text-[32px]">storefront</span>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-tertiary-container ring-2 ring-surface-container-lowest rounded-full"></span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface truncate">Thuê Đồ MiuMiu</h2>
                  <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>verified</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Tiệm thuê áo dài & phụ kiện</span>
              </div>
            </div>
          </div>

          {/* Reports Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-primary-container">
                <span className="material-symbols-outlined text-[19px]">query_stats</span>
                <h3 className="font-title-sm text-title-sm text-on-surface tracking-tight">Báo cáo & Xuất dữ liệu</h3>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-1 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05),0_1px_3px_0_rgba(0,0,0,0.02)] space-y-1">
              {[
                { icon: 'payments', iconBg: 'bg-surface-container', label: 'Doanh thu theo tháng', sub: 'Tháng 11 • 8.500.000đ', file: 'DoanhThu_Thang11.xlsx' },
                { icon: 'auto_awesome', iconBg: 'bg-secondary-fixed/40', label: 'Hiệu quả sản phẩm', sub: 'Top áo dài đắt khách nhất năm', file: 'Top_SanPham_Hot.xlsx' },
                { icon: 'assignment', iconBg: 'bg-tertiary-fixed/40', label: 'Danh sách phiếu thuê', sub: 'Lịch sử giao dịch & cọc giữ đồ', file: 'PhieuThue_TongHop.xlsx' },
                { icon: 'group', iconBg: 'bg-primary-fixed/40', label: 'Danh sách khách hàng', sub: 'Tên, SĐT, lịch sử thuê', file: 'KhachHang_DS.xlsx' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center text-primary-container shrink-0`}>
                      <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title-sm text-title-sm text-on-surface truncate">{item.label}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{item.sub}</span>
                    </div>
                  </div>
                  <button
                    className="h-8 px-3 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary text-primary font-label-md text-label-md flex items-center gap-1 transition-all active:scale-95 shrink-0"
                    onClick={() => simulateExport(item.file)}
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    <span>Xuất file</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Store Config Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-primary-container">
                <span className="material-symbols-outlined text-[19px]">tune</span>
                <h3 className="font-title-sm text-title-sm text-on-surface tracking-tight">Cài đặt vận hành cửa hàng</h3>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05),0_1px_3px_0_rgba(0,0,0,0.02)] space-y-4">
              {/* Deposit Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface">Tỷ lệ tiền cọc tối thiểu (%)</label>
                  <span className="font-label-sm text-label-sm text-primary font-bold">{depositRate}% giá trị trang phục</span>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">percent</span>
                  </div>
                  <input
                    className="w-full h-11 pl-10 pr-20 bg-surface-container-low rounded-xl text-on-surface font-title-sm text-title-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                    max={100}
                    min={0}
                    type="number"
                    value={depositRate}
                    onChange={(e) => setDepositRate(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
                      onClick={() => setDepositRate(Math.max(0, depositRate - 5))}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
                      onClick={() => setDepositRate(Math.min(100, depositRate + 5))}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1">
                  <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5 text-secondary">info</span>
                  Khách thanh toán cọc khi giữ lịch thử áo và ký nhận hợp đồng thuê.
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface">Số điện thoại liên hệ Studio</label>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </div>
                  <input
                    className="w-full h-11 pl-10 pr-28 bg-surface-container-low rounded-xl text-on-surface font-title-sm text-title-sm tracking-wide focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
                    type="tel"
                    defaultValue="0365193713"
                  />
                  <button className="absolute right-2 px-3 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container hover:text-primary text-on-surface font-label-md text-label-md flex items-center gap-1 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span>Chỉnh sửa</span>
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="p-3 bg-surface-container-low rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">pin_drop</span>
                    <span className="font-title-sm text-title-sm text-on-surface">Địa chỉ showroom</span>
                  </div>
                  <button className="font-label-sm text-label-sm text-primary hover:underline">Sửa vị trí</button>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant pl-7">
                  124 Phố Huế, Phường Ngô Thì Nhậm, Quận Hai Bà Trưng, Hà Nội
                </p>
                <FakeMapImage />
              </div>
            </div>
          </div>

          {/* Account & Security */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-primary-container">
                <span className="material-symbols-outlined text-[19px]">security</span>
                <h3 className="font-title-sm text-title-sm text-on-surface tracking-tight">Tài khoản & Bảo mật</h3>
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-1 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05),0_1px_3px_0_rgba(0,0,0,0.02)] space-y-0.5">
              <div className="p-3 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-title-sm text-title-sm text-on-surface">Đổi mật khẩu</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Cập nhật lần cuối 28 ngày trước</span>
                  </div>
                </div>
                <button
                  className="h-8 px-4 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all active:scale-95 shrink-0"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Chỉnh sửa
                </button>
              </div>
              <div className="p-3 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary-container shrink-0">
                    <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-title-sm text-title-sm text-on-surface">Thông tin tài khoản</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">admin@miumiu.vn</span>
                  </div>
                </div>
                <button className="h-8 px-4 rounded-full bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-md text-label-md transition-all active:scale-95 shrink-0">
                  Sửa
                </button>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="pt-2">
            <button
              className="w-full h-12 rounded-xl bg-error-container/60 hover:bg-error-container text-on-error-container flex items-center justify-center gap-2 font-title-sm text-title-sm active:scale-[0.98] transition-all"
              onClick={() => { if (confirm('Bạn có chắc muốn đăng xuất khỏi MiuMiu?')) showToast('Đang đăng xuất an toàn...') }}
            >
              <span className="material-symbols-outlined text-[20px] text-error">logout</span>
              <span className="font-semibold text-error">Đăng xuất tài khoản</span>
            </button>
          </div>

        </div>
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center px-margin pb-6">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-container">
                <span className="material-symbols-outlined text-[22px]">password</span>
                <h4 className="font-title-sm text-title-sm text-on-surface">Cập nhật mật khẩu</h4>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                onClick={() => setShowPasswordModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Mật khẩu hiện tại</label>
                <input className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="••••••••" type="password" />
              </div>
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Mật khẩu mới</label>
                <input className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Tối thiểu 8 ký tự" type="password" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 h-10 rounded-xl bg-surface-container font-label-md text-label-md text-on-surface"
                onClick={() => setShowPasswordModal(false)}
              >
                Huỷ
              </button>
              <button
                className="flex-1 h-10 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-md active:scale-95 transition-transform"
                onClick={() => { setShowPasswordModal(false); showToast('Đã đổi mật khẩu thành công!') }}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      <AddButton />
      <BottomNav />
    </div>
  )
}
