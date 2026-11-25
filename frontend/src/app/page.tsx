import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import Link from 'next/link'

// Fake data placeholder image (SVG inline)
function FakeImage({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`bg-primary-fixed/20 flex items-center justify-center ${className || ''}`}>
      <span className="material-symbols-outlined text-primary-container text-[24px]">checkroom</span>
    </div>
  )
}

export default function TongQuanPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar title="Tổng Quan" />
      <main className="flex-1 flex flex-col relative w-full px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-lg pt-4">

          {/* Date Header */}
          <section className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary-container" style={{ fontVariationSettings: '"FILL" 1' }}>
                  calendar_today
                </span>
                <span className="font-title-sm text-title-sm text-on-surface">Hôm nay, 25 Tháng 11</span>
              </div>
            </div>
          </section>

          {/* 3 KPI Cards */}
          <section className="grid grid-cols-3 gap-space-sm">
            {/* Trống lịch */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-tertiary-fixed/30 text-center shadow-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-tertiary-fixed text-tertiary mb-1">
                <span className="material-symbols-outlined text-[16px]">checkroom</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-tertiary tracking-tight leading-none mb-1">3</span>
              <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant truncate w-full">Trống lịch</span>
            </div>
            {/* Đã cho thuê */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-secondary-fixed/35 text-center shadow-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-secondary-fixed text-secondary mb-1">
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-secondary-fixed-dim tracking-tight leading-none mb-1">2</span>
              <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant truncate w-full">Đã cho thuê</span>
            </div>
            {/* Bảo dưỡng */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-high text-center shadow-sm">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-variant text-on-surface-variant mb-1">
                <span className="material-symbols-outlined text-[16px]">dry_cleaning</span>
              </div>
              <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-1">1</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate w-full">Bảo dưỡng</span>
            </div>
          </section>

          {/* Doanh thu tháng */}
          <section className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Doanh thu tháng này
                </span>
                <div className="flex items-baseline gap-space-xs mt-0.5">
                  <span className="font-headline-xl text-headline-xl text-primary font-bold">
                    8.500.000<span className="text-title-sm font-semibold">đ</span>
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-tertiary-fixed text-tertiary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +12.5%
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">So với tuần trước: +1.2tr</span>
              </div>
            </div>
          </section>

          {/* Alerts Section */}
          <section className="flex flex-col gap-space-md">
            {/* Quá hạn */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  <span className="font-title-sm text-title-sm text-error">Quá hạn trả áo</span>
                </div>
                <span className="font-label-sm text-label-sm text-error font-bold">1 đơn</span>
              </div>
              {/* Card MIU-0001 */}
              <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error"></div>
                <div className="flex items-start justify-between gap-space-sm pl-1">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span className="font-title-sm text-title-sm text-primary font-bold">MIU-0001</span>
                    <span className="text-outline-variant font-bold">•</span>
                    <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">Nguyễn Thu Hà</span>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold tracking-wide">
                    Quá hạn
                  </span>
                </div>
                <div className="flex items-center gap-space-xs pl-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <FakeImage label="Áo dài gấm đỏ" className="w-10 h-10" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-body-md text-body-md text-on-surface font-medium truncate">Áo dài gấm đỏ đô thêu phụng</span>
                    <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                      <span className="material-symbols-outlined text-[15px] text-error">schedule</span>
                      <span className="text-error font-medium">19-11 → 22-11 (Trễ 3 ngày)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-xs pl-1 mt-0.5">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tổng thuê</span>
                    <span className="font-currency-lg text-currency-lg text-on-surface">960.000đ</span>
                  </div>
                  <a href="tel:0912345678" className="px-3.5 h-9 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">call</span>
                    Gọi khách
                  </a>
                </div>
              </div>
            </div>

            {/* Cần trả hôm nay */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-title-sm text-title-sm text-on-surface">Cần trả hôm nay</span>
                </div>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">1 đơn</span>
              </div>
              {/* Card MIU-0002 */}
              <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary-container"></div>
                <div className="flex items-start justify-between gap-space-sm pl-1">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span className="font-title-sm text-title-sm text-primary font-bold">MIU-0002</span>
                    <span className="text-outline-variant font-bold">•</span>
                    <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">Trần Minh Anh</span>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold tracking-wide">
                    Đang thuê
                  </span>
                </div>
                <div className="flex items-center gap-space-xs pl-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <FakeImage label="Áo dài trắng" className="w-10 h-10" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-body-md text-body-md text-on-surface font-medium truncate">Áo dài trắng thêu hoa sen</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">+ Khăn đóng vàng & quạt lụa</span>
                    <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                      <span className="material-symbols-outlined text-[15px] text-secondary">event_available</span>
                      <span>22-11 → 25-11 (Hạn trả: 18:00)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-xs pl-1 mt-0.5">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Tổng cọc + phí</span>
                    <span className="font-currency-lg text-currency-lg text-on-surface">680.000đ</span>
                  </div>
                  <Link href="/don-thue/MIU-0002" className="px-3.5 h-9 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                    Nhận trả đồ
                  </Link>
                </div>
              </div>
            </div>

            {/* Đặt trước sắp đến nhận */}
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  <span className="font-title-sm text-title-sm text-on-surface">Đặt trước sắp đến nhận</span>
                </div>
                <span className="font-label-sm text-label-sm text-tertiary font-semibold">1 lịch hẹn</span>
              </div>
              {/* Card MIU-0003 */}
              <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-surface-container-highest"></div>
                <div className="flex items-start justify-between gap-space-sm pl-1">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span className="font-title-sm text-title-sm text-primary font-bold">MIU-0003</span>
                    <span className="text-outline-variant font-bold">•</span>
                    <span className="font-title-sm text-title-sm text-on-surface truncate font-semibold">Lê Phương Linh</span>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold tracking-wide">
                    Chờ xác nhận
                  </span>
                </div>
                <div className="flex items-center gap-space-xs pl-1">
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    <FakeImage label="Áo dài vàng" className="w-10 h-10" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-body-md text-body-md text-on-surface font-medium truncate">Áo dài tơ vàng hoàng yến (Size M)</span>
                    <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                      <span className="material-symbols-outlined text-[15px] text-tertiary">today</span>
                      <span>26-11 → 28-11 (Ngày mai lấy)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-space-xs pl-1 mt-0.5">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Dự kiến thu</span>
                    <span className="font-currency-lg text-currency-lg text-on-surface">600.000đ</span>
                  </div>
                  <Link href="/don-thue/MIU-0003" className="px-3.5 h-9 rounded-full bg-tertiary-container text-on-tertiary font-label-sm text-label-sm flex items-center gap-1 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Chuẩn bị đồ
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
      <AddButton />
      <BottomNav />
    </div>
  )
}
