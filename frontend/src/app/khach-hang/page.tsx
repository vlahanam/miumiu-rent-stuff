import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'

const customers = [
  {
    id: 1,
    name: 'Nguyễn Thu Hà',
    phone: '0912 345 678',
    address: 'Cầu Giấy, Hà Nội',
    rentCount: 1,
    avatar: 'H',
    avatarBg: 'bg-secondary-fixed text-on-secondary-fixed',
    isActive: true,
  },
  {
    id: 2,
    name: 'Trần Minh Anh',
    phone: '0987 654 321',
    address: 'Hoàn Kiếm, Hà Nội',
    rentCount: 0,
    avatar: 'A',
    avatarBg: 'bg-tertiary-fixed text-on-tertiary-fixed',
    isActive: true,
  },
  {
    id: 3,
    name: 'Lê Phương Linh',
    phone: '0933 111 222',
    address: 'Đống Đa, Hà Nội',
    rentCount: 0,
    avatar: 'L',
    avatarBg: 'bg-primary-fixed-dim text-primary',
    isActive: false,
  },
  {
    id: 4,
    name: 'Phạm Quỳnh Trang',
    phone: '0945 678 901',
    address: 'Ba Đình, Hà Nội',
    rentCount: 3,
    avatar: 'T',
    avatarBg: 'bg-primary-container text-on-primary',
    isActive: false,
  },
  {
    id: 5,
    name: 'Hoàng Thị Mai',
    phone: '0901 234 567',
    address: 'Hai Bà Trưng, Hà Nội',
    rentCount: 2,
    avatar: 'M',
    avatarBg: 'bg-secondary-container text-on-secondary-container',
    isActive: false,
  },
]

export default function KhachHangPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Khách Hàng" />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-md pt-4">

          {/* Stats + Add button */}
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between bg-surface-container-low px-space-md py-space-sm rounded-xl shadow-sm">
              <div className="flex items-center gap-space-xs">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">loyalty</span>
                </div>
                <div>
                  <span className="font-headline-md text-headline-md text-on-surface">142</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant ml-1">hồ sơ khách hàng</span>
                </div>
              </div>
              <button className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                <span>Thêm mới</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">search</span>
              <input
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none shadow-sm transition-all focus:shadow-[0_0_0_2px_rgba(107,33,63,0.18)]"
                placeholder="Tìm theo số điện thoại hoặc tên..."
                type="text"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
              <button className="flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md shadow-sm shrink-0 active:scale-95 transition-all whitespace-nowrap">
                <span className="leading-none">Tất cả</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold leading-none">142</span>
              </button>
              <button className="flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md shadow-sm shrink-0 active:scale-95 hover:bg-surface-container transition-all whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-secondary-container inline-block shrink-0"></span>
                <span className="leading-none">Đang thuê</span>
                <span className="text-[11px] text-on-surface-variant/70 font-semibold leading-none">(5)</span>
              </button>
              <button className="flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md shadow-sm shrink-0 active:scale-95 hover:bg-surface-container transition-all whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed inline-block shrink-0"></span>
                <span className="leading-none">Khách mới</span>
                <span className="text-[11px] text-on-surface-variant/70 font-semibold leading-none">(24)</span>
              </button>
            </div>
          </div>

          {/* Customer Cards */}
          <div className="flex flex-col gap-space-md">
            {customers.map((customer) => (
              <div key={customer.id} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm transition-all">
                <div className="flex items-start justify-between gap-space-xs">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-headline-md text-headline-md ${customer.avatarBg}`}>
                      {customer.avatar}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-title-sm text-title-sm text-on-surface truncate">{customer.name}</span>
                        {customer.isActive && (
                          <span className="px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-[10px] font-semibold shrink-0">
                            Đang thuê
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{customer.phone}</span>
                    </div>
                  </div>
                  {customer.rentCount > 0 && (
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm shrink-0 ${
                      customer.rentCount >= 3
                        ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                        : 'bg-surface-container-high text-primary-container'
                    }`}>
                      {customer.rentCount} lần thuê
                    </span>
                  )}
                </div>
                <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">location_on</span>
                      {customer.address}
                    </span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-space-xs">
                    <a
                      href={`tel:${customer.phone.replace(/\s/g, '')}`}
                      className="h-8 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-transform hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[15px]">call</span>
                      Gọi
                    </a>
                    <button className="h-8 px-3 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-transform hover:bg-surface-container-high">
                      <span className="material-symbols-outlined text-[15px]">history</span>
                      Lịch sử
                    </button>
                  </div>
                  <button className="h-8 px-3 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-transform shadow-sm">
                    <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                    Tạo đơn
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
      <AddButton />
      <BottomNav />
    </div>
  )
}
