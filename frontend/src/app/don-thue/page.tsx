import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import Link from 'next/link'

function FakeImage({ className }: { className?: string }) {
  return (
    <div className={`bg-primary-fixed/20 flex items-center justify-center ${className || ''}`}>
      <span className="material-symbols-outlined text-primary-container text-[20px]">checkroom</span>
    </div>
  )
}

const orders = [
  {
    id: 'MIU-0001',
    customer: 'Nguyễn Thu Hà',
    phone: '0912 345 678',
    item: 'Áo dài gấm đỏ đô',
    extra: '',
    dateRange: '19-11 → 22-11',
    note: 'Trễ 3 ngày',
    total: '960.000đ',
    status: 'qua-han',
    statusLabel: 'Quá hạn',
  },
  {
    id: 'MIU-0002',
    customer: 'Trần Minh Anh',
    phone: '0987 654 321',
    item: 'Áo dài trắng thêu hoa',
    extra: '+ Khăn đóng & quạt cầm tay',
    dateRange: '22-11 → 25-11',
    note: 'Còn 1 ngày',
    total: '680.000đ',
    status: 'dang-thue',
    statusLabel: 'Đang thuê',
  },
  {
    id: 'MIU-0003',
    customer: 'Lê Phương Linh',
    phone: '0933 111 222',
    item: 'Áo dài tơ vàng quý phái',
    extra: '',
    dateRange: '26-11 → 28-11',
    note: 'Cọc dự kiến: 300.000đ',
    total: '600.000đ',
    status: 'cho-xac-nhan',
    statusLabel: 'Chờ xác nhận',
  },
  {
    id: 'MIU-0000',
    customer: 'Nguyễn Thu Hà',
    phone: '0912 345 678',
    item: 'Áo dài lụa hồng phấn',
    extra: '',
    dateRange: '04-11 → 06-11',
    note: 'Đã hoàn cọc',
    total: '500.000đ',
    status: 'da-tra',
    statusLabel: 'Đã trả',
  },
]

const statusConfig: Record<string, { badge: string; border: string; labelClass: string }> = {
  'qua-han': {
    badge: 'bg-error-container text-error',
    border: 'bg-error',
    labelClass: '',
  },
  'dang-thue': {
    badge: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    border: 'bg-secondary-container',
    labelClass: '',
  },
  'cho-xac-nhan': {
    badge: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    border: 'bg-tertiary-fixed-dim',
    labelClass: '',
  },
  'da-tra': {
    badge: 'bg-surface-container-high text-tertiary',
    border: 'bg-tertiary-container',
    labelClass: '',
  },
}

export default function DonThuePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Đơn Thuê" />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-md pt-4">

          {/* Search Bar */}
          <section className="flex items-center gap-space-xs bg-surface-container-lowest rounded-xl p-space-xs shadow-sm">
            <div className="w-10 h-10 flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[22px]">search</span>
            </div>
            <input
              className="flex-1 bg-transparent border-0 outline-none font-body-sm text-body-sm text-on-surface placeholder:text-outline py-2"
              placeholder="Tìm theo mã, tên khách, số điện thoại..."
              type="text"
            />
          </section>

          {/* Filter Chips */}
          <section className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1 -mx-margin px-margin">
            {[
              { label: 'Tất cả', count: '18', active: true, dot: '' },
              { label: 'Quá hạn', count: '', active: false, dot: 'bg-error' },
              { label: 'Đang thuê', count: '', active: false, dot: 'bg-secondary' },
              { label: 'Chờ xác nhận', count: '', active: false, dot: 'bg-tertiary-fixed-dim' },
              { label: 'Đã trả', count: '', active: false, dot: 'bg-tertiary-container' },
              { label: 'Đã hủy', count: '', active: false, dot: 'bg-outline' },
            ].map((chip) => (
              <button
                key={chip.label}
                className={`px-3.5 py-1.5 font-label-md text-label-md shadow-sm shrink-0 flex items-center gap-1.5 active:scale-95 rounded-lg transition-all ${
                  chip.active
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]'
                }`}
              >
                {chip.dot && <span className={`w-2 h-2 rounded-full ${chip.dot} inline-block`}></span>}
                <span>{chip.label}</span>
                {chip.count && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 font-label-sm text-[10px] leading-tight font-bold">
                    {chip.count}
                  </span>
                )}
              </button>
            ))}
          </section>

          {/* Summary */}
          <section className="grid grid-cols-3 gap-space-xs bg-surface-container-low rounded-xl p-space-sm shadow-[0_2px_12px_rgba(107,33,63,0.03)]">
            <div className="flex flex-col items-center justify-center p-space-xs text-center">
              <span className="font-headline-md text-headline-md font-bold text-error">01</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Cần thu hồi</span>
            </div>
            <div className="flex flex-col items-center justify-center p-space-xs text-center bg-surface-container-lowest rounded-lg shadow-sm">
              <span className="font-headline-md text-headline-md font-bold text-primary-container">06</span>
              <span className="font-label-sm text-label-sm text-on-surface font-semibold mt-0.5">Đang cho thuê</span>
            </div>
            <div className="flex flex-col items-center justify-center p-space-xs text-center">
              <span className="font-headline-md text-headline-md font-bold text-tertiary-container">12</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Sẵn sàng</span>
            </div>
          </section>

          {/* Order Cards */}
          <section className="flex flex-col gap-space-md">
            {orders.map((order) => {
              const cfg = statusConfig[order.status]
              return (
                <article
                  key={order.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_4px_16px_-2px_rgba(107,33,63,0.05),0_1px_3px_0_rgba(0,0,0,0.03)] flex flex-col gap-space-sm relative overflow-hidden transition-all"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.border}`}></div>
                  <div className="flex items-start justify-between gap-space-xs">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-title-sm text-title-sm text-primary-container font-bold tracking-tight">{order.id}</span>
                        <span className="text-outline text-[12px]">•</span>
                        <span className="font-title-sm text-title-sm text-on-surface font-bold truncate">{order.customer}</span>
                      </div>
                      {order.status === 'qua-han' ? (
                        <a href={`tel:${order.phone.replace(/\s/g,'')}`} className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>{order.phone}</span>
                        </a>
                      ) : (
                        <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          <span>{order.phone}</span>
                        </span>
                      )}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm uppercase tracking-wide shrink-0 ${cfg.badge}`}>
                      {order.statusLabel}
                    </span>
                  </div>

                  <div className="flex gap-space-sm items-center bg-surface-container-low p-2 rounded-lg">
                    <div className="w-12 h-14 rounded-md overflow-hidden bg-surface-container shrink-0">
                      <FakeImage className="w-12 h-14" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{order.item}</span>
                      {order.extra && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{order.extra}</span>
                      )}
                      <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">
                          {order.status === 'qua-han' ? 'event_repeat' : 'calendar_today'}
                        </span>
                        <span>{order.dateRange}</span>
                      </div>
                      {order.note && (
                        <span className={`font-label-sm text-label-sm font-medium mt-0.5 ${order.status === 'qua-han' ? 'text-error flex items-center gap-0.5' : 'text-secondary'}`}>
                          {order.status === 'qua-han' && <span className="material-symbols-outlined text-[13px]">warning</span>}
                          {order.note}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-outline">
                        {order.status === 'da-tra' ? 'Đã thanh toán' : 'Tổng đơn'}
                      </span>
                      <span className="font-currency-lg text-currency-lg text-on-surface font-bold">{order.total}</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      {order.status === 'qua-han' && (
                        <Link href={`/don-thue/${order.id}`} className="h-9 px-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1 hover:bg-primary-container transition-colors active:scale-95 shadow-sm">
                          <span>Chi tiết</span>
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </Link>
                      )}
                      {order.status === 'dang-thue' && (
                        <button className="h-9 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1 hover:bg-surface-container-high transition-colors active:scale-95">
                          <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                          <span>Nhận trả</span>
                        </button>
                      )}
                      {order.status === 'cho-xac-nhan' && (
                        <>
                          <button className="h-9 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-high transition-colors active:scale-95">
                            Hủy
                          </button>
                          <button className="h-9 px-3.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1 hover:bg-primary transition-colors active:scale-95 shadow-sm">
                            <span className="material-symbols-outlined text-[16px]">payments</span>
                            <span>Xác nhận cọc</span>
                          </button>
                        </>
                      )}
                      {order.status === 'da-tra' && (
                        <button className="h-9 px-3 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1 hover:bg-surface-container transition-colors active:scale-95">
                          <span className="material-symbols-outlined text-[16px]">receipt</span>
                          <span>Hóa đơn</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

        </div>
      </main>
      <AddButton />
      <BottomNav />
    </div>
  )
}
