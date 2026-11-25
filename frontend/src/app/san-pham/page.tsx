import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import Link from 'next/link'

// Fake placeholder for product image
function ProductPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`bg-primary-fixed/20 flex items-center justify-center ${className || ''}`}>
      <span className="material-symbols-outlined text-primary-container text-[32px]">checkroom</span>
    </div>
  )
}

const products = [
  {
    id: 'MIU-001',
    name: 'Áo dài lụa hồng phấn',
    size: 'Size S, M',
    price: '250.000đ',
    status: 'trong-lich',
    statusLabel: 'Trống lịch',
  },
  {
    id: 'MIU-002',
    name: 'Áo dài gấm đỏ đô',
    size: 'Size M, L',
    price: '320.000đ',
    status: 'da-cho-thue',
    statusLabel: 'Đã cho thuê',
    returnNote: 'Trả 25/11',
  },
  {
    id: 'MIU-003',
    name: 'Áo dài trắng thêu hoa',
    size: 'Size S',
    price: '350.000đ',
    status: 'bao-duong',
    statusLabel: 'Bảo dưỡng',
  },
  {
    id: 'MIU-004',
    name: 'Áo dài tơ tằm vàng',
    size: 'Size M',
    price: '280.000đ',
    status: 'trong-lich',
    statusLabel: 'Trống lịch',
  },
  {
    id: 'MIU-005',
    name: 'Khăn đóng gấm + Quạt',
    size: 'Set phụ kiện',
    price: '80.000đ',
    status: 'trong-lich',
    statusLabel: 'Trống lịch',
  },
  {
    id: 'MIU-006',
    name: 'Áo dài xanh ngọc bích',
    size: 'Size M, L',
    price: '300.000đ',
    status: 'trong-lich',
    statusLabel: 'Trống lịch',
  },
]

const statusChipConfig: Record<string, string> = {
  'trong-lich': 'bg-[#E8F4FA]/95 text-[#1A6A8C]',
  'da-cho-thue': 'bg-[#FEF4E6]/95 text-[#B57300]',
  'bao-duong': 'bg-surface-container-highest/95 text-on-surface-variant',
}

const statusDotConfig: Record<string, string> = {
  'trong-lich': 'bg-[#1A6A8C]',
  'da-cho-thue': 'bg-[#B57300]',
  'bao-duong': 'bg-on-surface-variant',
}

export default function SanPhamPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Sản Phẩm" />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-md pt-4">

          {/* Search & Filters */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <div className="relative flex-1 flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">search</span>
                <input
                  className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm shadow-[0_2px_8px_rgba(107,33,63,0.04)] focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                  placeholder="Tìm theo mã (MIU-001) hoặc tên trang phục..."
                  type="text"
                />
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-margin px-margin no-scrollbar">
              {[
                { key: 'all', label: 'Tất cả (42)', active: true },
                { key: 'trong-lich', label: 'Trống lịch (28)', dot: 'bg-[#1A6A8C]' },
                { key: 'da-cho-thue', label: 'Đã cho thuê (11)', dot: 'bg-[#B57300]' },
                { key: 'bao-duong', label: 'Bảo dưỡng (3)', dot: 'bg-on-surface-variant' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  className={`shrink-0 h-7 px-2.5 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1 ${
                    chip.active
                      ? 'text-surface-bright bg-primary-container'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`}></span>}
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex items-center justify-between px-space-md py-2 rounded-xl bg-surface-container-low">
            <div className="flex items-center gap-1.5 text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary-container">styler</span>
              <span className="font-label-md text-label-md">Kho trang phục sẵn có</span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Sắp xếp: <span className="font-semibold text-primary">Mới nhất</span>
            </span>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-space-sm w-full">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col bg-surface-container-lowest rounded-2xl p-2.5 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.02)] transition-transform active:scale-[0.99]"
              >
                {/* Image */}
                <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-container mb-2">
                  <ProductPlaceholder className="w-full h-full" />
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm font-label-sm text-[10px] leading-tight font-semibold flex items-center gap-1 shadow-sm ${statusChipConfig[product.status]}`}>
                      {product.status === 'bao-duong' ? (
                        <span className="material-symbols-outlined text-[11px]">dry_cleaning</span>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotConfig[product.status]}`}></span>
                      )}
                      {product.statusLabel}
                    </span>
                  </div>
                  {/* Return note for rented */}
                  {product.returnNote && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-surface/90 backdrop-blur-sm text-on-surface font-label-sm text-[10px] shadow-sm flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px] text-primary">schedule</span>
                      <span>{product.returnNote}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex flex-col flex-1 min-w-0 justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-[11px] text-primary-container font-semibold tracking-wider">{product.id}</span>
                    <h2 className="font-title-sm text-[13px] leading-snug text-on-surface line-clamp-1 mt-0.5">{product.name}</h2>
                    <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-[11px] mt-0.5">
                      <span className="material-symbols-outlined text-[13px]">straighten</span>
                      <span>{product.size}</span>
                    </div>
                  </div>
                  <div className="pt-2 mt-1 flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between min-w-0">
                      <span className="font-currency-lg text-[14px] leading-none text-on-surface font-bold">{product.price}</span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant">/ngày</span>
                    </div>
                    <Link
                      href={`/san-pham/${product.id}`}
                      className="w-full h-7 rounded-lg bg-surface-container text-primary-container hover:bg-primary-container hover:text-on-primary transition-all font-label-sm text-[11px] flex items-center justify-center gap-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>Lịch thuê</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Product Button */}
          <div className="pt-2">
            <Link
              href="/san-pham/them-moi"
              className="w-full h-11 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm sản phẩm mới
            </Link>
          </div>

        </div>
      </main>
      <AddButton />
      <BottomNav />
    </div>
  )
}
