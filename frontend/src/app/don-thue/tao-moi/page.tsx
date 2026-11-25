'use client'

import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { useState } from 'react'

function FakeImage({ className }: { className?: string }) {
  return (
    <div className={`bg-primary-fixed/20 flex items-center justify-center ${className || ''}`}>
      <span className="material-symbols-outlined text-primary-container text-[20px]">checkroom</span>
    </div>
  )
}

// Danh sách sản phẩm mẫu để chọn trong modal
const allGarments = [
  {
    id: 'MIU-001',
    name: 'Áo Dài Gấm Phụng Hoàng',
    size: 'Size M',
    price: 350000,
    priceLabel: '350.000đ',
    unit: '/ngày',
    status: 'Sẵn sàng',
    type: 'ao-dai-nu',
    sizeTag: 'bg-primary-container text-on-primary',
  },
  {
    id: 'MIU-003',
    name: 'Khăn Đóng Gấm + Quạt Trầm',
    size: 'Set',
    price: 80000,
    priceLabel: '80.000đ',
    unit: '/trọn gói',
    status: 'Sẵn sàng',
    type: 'phu-kien',
    sizeTag: 'bg-secondary text-on-secondary',
  },
  {
    id: 'MIU-002',
    name: 'Áo Dài Tơ Tằm Thêu Sen',
    size: 'Size L',
    price: 320000,
    priceLabel: '320.000đ',
    unit: '/ngày',
    status: 'Trống lịch',
    type: 'ao-dai-nu',
    sizeTag: 'bg-surface-container-highest text-on-surface',
  },
  {
    id: 'MIU-004',
    name: 'Áo Dài Cách Tân Ngọc Bích',
    size: 'Size S',
    price: 280000,
    priceLabel: '280.000đ',
    unit: '/ngày',
    status: 'Trống lịch',
    type: 'ao-dai-nu',
    sizeTag: 'bg-surface-container-highest text-on-surface',
  },
  {
    id: 'MIU-005',
    name: 'Bộ Quạt Lụa Cầm Tay Thêu',
    size: 'Phụ kiện',
    price: 50000,
    priceLabel: '50.000đ',
    unit: '/trọn gói',
    status: 'Trống lịch',
    type: 'phu-kien',
    sizeTag: 'bg-secondary text-on-secondary',
  },
]

// Modal chọn trang phục
function SelectGarmentModal({
  selectedIds,
  onToggle,
  onConfirm,
  onClose,
}: {
  selectedIds: string[]
  onToggle: (id: string) => void
  onConfirm: () => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const categories = [
    { key: 'all', label: `Tất cả (${allGarments.length})` },
    { key: 'ao-dai-nu', label: 'Áo dài nữ' },
    { key: 'ao-dai-nam', label: 'Áo dài nam' },
    { key: 'phu-kien', label: 'Phụ kiện & Khăn' },
    { key: 'trong-lich', label: 'Trống lịch', special: true },
  ]

  const filtered = allGarments.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.id.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || filter === g.type || (filter === 'trong-lich' && g.status === 'Trống lịch')
    return matchSearch && matchFilter
  })

  const totalSelected = selectedIds.length
  const totalPrice = allGarments.filter((g) => selectedIds.includes(g.id)).reduce((sum, g) => sum + g.price, 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#1e1b1c]/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-h-[88vh] bg-surface-container-lowest rounded-t-[28px] shadow-[0_-8px_32px_rgba(79,9,41,0.18)] flex flex-col overflow-hidden pb-safe z-10">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-surface-container-high shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Chọn trang phục & Phụ kiện</h2>
            {totalSelected > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-[11px] font-bold">
                Đã chọn {totalSelected}
              </span>
            )}
          </div>
          <button
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors active:scale-95"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="p-4 flex flex-col gap-3 shrink-0 bg-surface-container-low/40">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[19px]">search</span>
            </div>
            <input
              className="w-full h-11 pl-10 pr-9 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/30 transition-all shadow-inner"
              placeholder="Tìm theo tên áo, mã MIU-..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setFilter(cat.key)}
                className={`px-3 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all flex items-center gap-1 ${
                  filter === cat.key
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                } ${cat.special ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant font-semibold' : ''}`}
              >
                {cat.special && <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />}
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-[300px]">
          {filtered.map((garment) => {
            const isSelected = selectedIds.includes(garment.id)
            return (
              <div
                key={garment.id}
                className={`p-3 rounded-xl flex gap-3 items-center relative transition-all ${
                  isSelected
                    ? 'bg-primary-fixed/20 border-2 border-primary-container'
                    : 'bg-surface-container-lowest border border-outline-variant/40 hover:border-primary-container/40 shadow-sm'
                }`}
              >
                <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container-high relative">
                  <FakeImage className="w-full h-full" />
                  <span className={`absolute bottom-1 left-1 font-label-sm text-[9px] px-1 rounded ${garment.sizeTag}`}>
                    {garment.size}
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-title-sm text-body-md font-bold text-on-surface truncate">{garment.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-label-sm text-label-sm text-primary-container font-semibold">{garment.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-medium">
                        {garment.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-currency-lg text-currency-lg text-primary-container font-bold">
                      {garment.priceLabel}
                      <span className="text-[11px] font-normal text-on-surface-variant">{garment.unit}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(garment.id)}
                      className={`h-7 px-2.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors active:scale-95 ${
                        isSelected
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : 'bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-container hover:text-on-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{isSelected ? 'check' : 'add'}</span>
                      <span>{isSelected ? 'Đã chọn' : 'Chọn'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-[40px] text-outline mb-2">search_off</span>
              <span className="font-body-md text-body-md text-on-surface-variant">Không tìm thấy trang phục phù hợp</span>
            </div>
          )}
        </div>

        {/* Confirm Footer */}
        <div className="p-4 bg-surface-container-lowest border-t border-surface-container-high flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(35,31,32,0.06)] shrink-0">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Đã chọn {totalSelected} món</span>
            <span className="font-headline-md text-headline-md font-bold text-primary-container leading-none">
              {totalPrice.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] hover:bg-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Xác nhận thêm vào đơn ({totalSelected})</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TaoMoiDonThuePage() {
  const [soNgay, setSoNgay] = useState(1)
  const [loaiCoc, setLoaiCoc] = useState('chuyen-khoan')
  const [showModal, setShowModal] = useState(false)
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>(['MIU-001', 'MIU-003'])

  const toggleGarment = (id: string) => {
    setSelectedGarmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectedGarments = allGarments.filter((g) => selectedGarmentIds.includes(g.id))
  const tongTienThue = selectedGarments.reduce((sum, g) => sum + g.price, 0) * soNgay
  const tienCoc = 500000

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN') + 'đ'

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Đơn Thuê" />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-y-4 pb-12 pt-4">

          {/* Order ID Banner */}
          <div className="w-full bg-surface-container-low rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse shrink-0" />
              <span className="font-headline-lg text-headline-lg text-primary-container font-bold tracking-tight">MIU-0005</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                Đang tạo nháp
              </span>
            </div>
          </div>

          {/* Section 1: Customer */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[17px]">person</span>
                </div>
                <h2 className="font-title-sm text-title-sm text-on-surface">Thông tin khách thuê</h2>
              </div>
              <button className="font-label-sm text-label-sm text-primary-container font-semibold hover:underline" type="button">
                Sửa thông tin
              </button>
            </div>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[19px]">search</span>
              </div>
              <input
                className="w-full h-11 pl-10 pr-9 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-colors shadow-inner"
                placeholder="Tìm khách theo số điện thoại..."
                type="text"
                defaultValue="Nguyễn Thảo Trang - 0912 345 678"
              />
            </div>
            <div className="grid grid-cols-1 gap-2.5 pt-0.5">
              <div className="flex items-center gap-2.5 bg-surface-container-low px-3 py-2.5 rounded-lg">
                <span className="material-symbols-outlined text-outline text-[18px]">phone_iphone</span>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">SĐT liên hệ:</span>
                  <span className="font-body-md text-body-md font-semibold text-on-surface">0912 345 678</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-surface-container-low px-3 py-2.5 rounded-lg">
                <span className="material-symbols-outlined text-outline text-[18px]">location_on</span>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Địa chỉ trả/nhận:</span>
                  <span className="font-body-md text-body-md font-semibold text-on-surface truncate ml-2">Cầu Giấy, Hà Nội</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Items */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[17px]">checkroom</span>
                </div>
                <h2 className="font-title-sm text-title-sm text-on-surface">Trang phục & Phụ kiện ({selectedGarments.length})</h2>
              </div>
              <button
                className="h-8 px-3 rounded-full bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-container hover:text-on-primary flex items-center gap-1 font-label-md text-label-md transition-all active:scale-95 shadow-sm"
                type="button"
                onClick={() => setShowModal(true)}
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Thêm đồ</span>
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {selectedGarments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="material-symbols-outlined text-[40px] text-outline mb-2">checkroom</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Chưa chọn trang phục nào</span>
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="mt-3 px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md"
                  >
                    Chọn trang phục
                  </button>
                </div>
              )}
              {selectedGarments.map((garment) => (
                <div key={garment.id} className="relative bg-surface-container-low rounded-lg p-3 flex gap-3 items-center group">
                  <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container-high relative">
                    <FakeImage className="w-full h-full" />
                    <span className={`absolute bottom-1 left-1 font-label-sm text-[9px] px-1 rounded ${garment.sizeTag}`}>
                      {garment.size}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-title-sm text-body-md font-semibold text-on-surface truncate">{garment.name}</span>
                        <button
                          className="text-outline hover:text-error transition-colors p-0.5"
                          title="Xóa món"
                          onClick={() => toggleGarment(garment.id)}
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                      <span className="font-label-sm text-label-sm text-primary-container font-semibold">Mã: {garment.id}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-currency-lg text-currency-lg text-primary-container font-bold">
                        {garment.priceLabel}
                        <span className="text-[11px] font-normal text-on-surface-variant">{garment.unit}</span>
                      </span>
                      {/* Stepper số lượng */}
                      <div className="flex items-center gap-1.5 bg-surface-container-lowest rounded-full px-2 py-0.5 shadow-sm">
                        <button type="button" className="w-5 h-5 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container leading-none text-[14px] font-bold active:scale-95 transition-all">-</button>
                        <span className="font-label-md text-label-md font-semibold text-on-surface px-1 min-w-[16px] text-center flex items-center justify-center leading-none">1</span>
                        <button type="button" className="w-5 h-5 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container leading-none text-[14px] font-bold active:scale-95 transition-all">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Schedule */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                </div>
                <h2 className="font-title-sm text-title-sm text-on-surface">Lịch trình & Thời gian thuê</h2>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-bold">{soNgay} ngày</span>
            </div>

            {/* Number of days */}
            <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary-container">timelapse</span>
                  Số ngày thuê
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-container-lowest rounded-full px-2.5 py-1 shadow-sm">
                    <button
                      type="button"
                      className="text-on-surface-variant hover:text-primary text-sm font-bold leading-none w-5 h-5 flex items-center justify-center active:scale-95"
                      onClick={() => setSoNgay(Math.max(1, soNgay - 1))}
                    >
                      -
                    </button>
                    <span className="font-title-sm text-title-sm font-bold text-primary-container px-2">{soNgay}</span>
                    <button
                      type="button"
                      className="text-on-surface-variant hover:text-primary text-sm font-bold leading-none w-5 h-5 flex items-center justify-center active:scale-95"
                      onClick={() => setSoNgay(soNgay + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">ngày</span>
                </div>
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 p-2.5 bg-surface-container-low rounded-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">flight_land</span>
                  Ngày nhận đồ
                </span>
                <span className="font-title-sm text-title-sm text-on-surface font-semibold">25/11/2026</span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-body-sm text-body-sm text-primary-container font-semibold">09:30</span>
                  <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 p-2.5 bg-surface-container-low rounded-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-error">assignment_return</span>
                  Ngày trả đồ dự kiến
                </span>
                <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                  {soNgay === 1 ? '26/11/2026' : `${25 + soNgay}/11/2026`}
                </span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-body-sm text-body-sm text-primary-container font-semibold">18:00</span>
                  <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Fees */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[17px]">receipt</span>
              </div>
              <h2 className="font-title-sm text-title-sm text-on-surface">Chi phí & Đặt cọc</h2>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                <span>Tạm tính tiền thuê ({soNgay} ngày):</span>
                <span className="font-semibold text-on-surface">{formatCurrency(tongTienThue)}</span>
              </div>
              <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1">Ưu đãi áp dụng:</span>
                <span className="font-semibold text-tertiary-container">0đ</span>
              </div>
              <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1">Loại cọc:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-on-secondary-container bg-secondary-fixed px-1.5 py-0.5 rounded font-semibold">
                    {loaiCoc === 'chuyen-khoan' ? 'Chuyển khoản QR' : loaiCoc === 'tien-mat' ? 'Tiền mặt' : 'Giữ CCCD'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                <span>Tiền cọc đảm bảo:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-on-surface">{formatCurrency(tienCoc)}</span>
                  <span className="text-[11px] text-on-secondary-container bg-secondary-fixed px-1.5 py-0.5 rounded font-semibold">Giữ CCCD</span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-2 p-3 bg-surface-container rounded-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Tổng cần thanh toán trước</span>
                  <span className="font-label-sm text-[10px] text-on-surface-variant">(Bao gồm tiền cọc hoàn lại)</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-headline-lg text-headline-lg text-primary-container font-bold leading-tight">{formatCurrency(tongTienThue + tienCoc)}</span>
                  <span className="font-label-sm text-[11px] text-tertiary font-semibold">Cọc: {formatCurrency(tienCoc)}</span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Hình thức cọc:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'chuyen-khoan', label: 'Chuyển khoản QR', icon: 'qr_code_2' },
                  { key: 'tien-mat', label: 'Tiền mặt Studio', icon: 'payments' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLoaiCoc(opt.key)}
                    className={`h-10 px-3 rounded-lg font-label-md text-label-md font-semibold flex items-center justify-center gap-2 transition-all ${
                      loaiCoc === opt.key
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
          </div>

          {/* Section 5: Notes */}
          <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05)] flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[17px]">edit_note</span>
              </div>
              <h2 className="font-title-sm text-title-sm text-on-surface">Ghi chú & Bàn giao</h2>
            </div>
            <textarea
              className="w-full p-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg focus:outline-none focus:bg-surface-container-lowest resize-none"
              placeholder="Ghi chú đơn hàng (ví dụ: Khách thuê dự đám cưới, yêu cầu kèm túi bảo quản)..."
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <div className="w-full flex items-center gap-3 pt-2">
            <button
              type="button"
              className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-title-sm text-title-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_-2px_rgba(107,33,63,0.35)] hover:bg-primary transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
              <span>Tạo Đơn Thuê (MIU-0005)</span>
            </button>
          </div>

        </div>
      </main>

      {/* Modal chọn trang phục */}
      {showModal && (
        <SelectGarmentModal
          selectedIds={selectedGarmentIds}
          onToggle={toggleGarment}
          onConfirm={() => setShowModal(false)}
          onClose={() => setShowModal(false)}
        />
      )}

      <BottomNav />
    </div>
  )
}
