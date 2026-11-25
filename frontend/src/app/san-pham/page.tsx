'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import AddButton from '@/components/AddButton'
import ProductImage from '@/components/ProductImage'
import { SanPhamStatusBadge } from '@/components/StatusBadge'
import { useWSEvents } from '@/components/AuthProvider'
import { useToast } from '@/components/ToastProvider'
import { ApiError, baoCaoApi, dashboardApi, sanPhamApi } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { SanPham } from '@/types'

function SanPhamContent() {
  const searchParams = useSearchParams()
  const toast = useToast()

  const [products, setProducts] = useState<SanPham[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('trang_thai') || '')
  const [sortBy, setSortBy] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [counts, setCounts] = useState({ trongLich: 0, daChoThue: 0, baoDuong: 0 })

  useEffect(() => {
    const tt = searchParams.get('trang_thai')
    if (tt !== null) setStatusFilter(tt)
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadCounts = useCallback(async () => {
    try {
      const dash = await dashboardApi.get()
      setCounts({
        trongLich: dash.so_san_pham.trong_lich,
        daChoThue: dash.so_san_pham.da_cho_thue,
        baoDuong: dash.so_san_pham.dang_bao_duong,
      })
    } catch {
      // Bỏ qua
    }
  }, [])

  const loadProducts = useCallback(
    async (pageNum = 1, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        const res = await sanPhamApi.getAll({
          search: debouncedSearch || undefined,
          trang_thai: statusFilter || undefined,
          sort: sortBy || undefined,
          page: pageNum,
          limit: 20,
        })
        const rows = res.data || []
        setProducts((prev) => (append ? [...prev, ...rows] : rows))
        setTotal(res.total || 0)
        setPage(pageNum)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Không thể tải danh sách sản phẩm')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [debouncedSearch, statusFilter, sortBy, toast]
  )

  useEffect(() => {
    loadProducts(1, false)
  }, [loadProducts])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  useWSEvents(() => {
    loadProducts(1, false)
    loadCounts()
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      const name = await baoCaoApi.downloadExcel({ loai: 'san_pham' })
      toast.success(`Đã xuất tệp ${name}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không thể xuất file')
    } finally {
      setExporting(false)
    }
  }

  const totalAll = counts.trongLich + counts.daChoThue + counts.baoDuong

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <TopBar
        title="Sản Phẩm"
        rightSlot={
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            title="Xuất báo cáo sản phẩm"
            className="h-8 px-2.5 rounded-full bg-surface-container text-primary-container hover:bg-primary-fixed font-label-sm text-label-sm flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        }
      />

      <main className="flex-1 flex flex-col relative w-full max-w-2xl mx-auto px-margin pt-14 pb-32 bg-surface">
        <div className="flex flex-col w-full gap-space-md pt-4">
          {/* Search & Filters */}
          <div className="flex flex-col gap-space-sm">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">
                search
              </span>
              <input
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-outline-variant/25 shadow-sm focus:outline-none focus:border-primary-container"
                placeholder="Tìm theo mã (MIU-001) hoặc tên trang phục..."
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-margin px-margin no-scrollbar">
              {[
                { key: '', label: `Tất cả (${totalAll})`, dot: '' },
                { key: '1', label: `Trống lịch (${counts.trongLich})`, dot: 'bg-[#236B48]' },
                { key: '2', label: `Đã cho thuê (${counts.daChoThue})`, dot: 'bg-[#B57300]' },
                { key: '3', label: `Bảo dưỡng (${counts.baoDuong})`, dot: 'bg-[#61556C]' },
              ].map((chip) => {
                const active = statusFilter === chip.key
                return (
                  <button
                    key={chip.key || 'all'}
                    type="button"
                    onClick={() => setStatusFilter(chip.key)}
                    className={`shrink-0 h-8 px-3 rounded-full font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
                      active
                        ? 'text-on-primary bg-primary-container shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />}
                    <span>{chip.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary + Sort Bar */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low gap-2">
            <div className="flex items-center gap-1.5 text-on-surface min-w-0">
              <span className="material-symbols-outlined text-[18px] text-primary-container">styler</span>
              <span className="font-label-md text-label-md truncate">
                Hiển thị {products.length}/{total} sản phẩm
              </span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sắp xếp sản phẩm"
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-2.5 py-1 font-label-sm text-label-sm text-primary font-semibold focus:outline-none"
            >
              <option value="">Mới nhất</option>
              <option value="gia_asc">Giá tăng dần</option>
              <option value="gia_desc">Giá giảm dần</option>
            </select>
          </div>

          {/* Loading */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className="py-12 px-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-[42px] text-outline">checkroom</span>
              <h3 className="font-title-sm text-title-sm text-on-surface">Chưa có sản phẩm nào</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {debouncedSearch || statusFilter
                  ? 'Không tìm thấy sản phẩm khớp bộ lọc hiện tại.'
                  : 'Thêm áo dài hoặc phụ kiện đầu tiên vào kho của tiệm.'}
              </p>
              <Link
                href="/san-pham/them-moi"
                className="mt-1 px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md"
              >
                + Thêm sản phẩm mới
              </Link>
            </div>
          )}

          {/* Product Grid */}
          {!loading && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm w-full">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/san-pham/${product.id}`}
                    className="flex flex-col bg-surface-container-lowest rounded-2xl p-2.5 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.02)] hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-container mb-2">
                      <ProductImage
                        hinhAnh={product.hinh_anh}
                        alt={product.ten_san_pham}
                        className="w-full h-full"
                        iconSize={34}
                      />
                      <div className="absolute top-2 left-2">
                        <SanPhamStatusBadge status={product.trang_thai} />
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 min-w-0 justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-[11px] text-primary-container font-semibold tracking-wider truncate">
                          {product.ma_san_pham}
                        </span>
                        <h2 className="font-title-sm text-[13px] leading-snug text-on-surface line-clamp-2 mt-0.5">
                          {product.ten_san_pham}
                        </h2>
                      </div>

                      <div className="pt-2 mt-1 flex flex-col gap-1">
                        <div className="flex items-baseline justify-between min-w-0">
                          <span className="font-currency-lg text-[14px] leading-none text-on-surface font-bold tabular-nums">
                            {formatCurrency(product.gia_thue_ngay)}
                          </span>
                          <span className="font-label-sm text-[10px] text-on-surface-variant">/ngày</span>
                        </div>
                        <span className="font-label-sm text-[10px] text-outline tabular-nums">
                          Giá gốc: {formatCurrency(product.gia_goc_san_pham)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {products.length < total && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadProducts(page + 1, true)}
                  className="h-11 rounded-xl bg-surface-container text-primary-container font-label-md text-label-md hover:bg-surface-container-high"
                >
                  {loadingMore ? 'Đang tải thêm...' : `Tải thêm (${products.length}/${total})`}
                </button>
              )}
            </>
          )}

          {/* Add Product Button */}
          <div className="pt-1">
            <Link
              href="/san-pham/them-moi"
              className="w-full h-11 rounded-xl border-2 border-dashed border-outline-variant text-primary-container font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Thêm sản phẩm mới
            </Link>
          </div>
        </div>
      </main>

      <AddButton label="Thêm sản phẩm" href="/san-pham/them-moi" />
      <BottomNav />
    </div>
  )
}

export default function SanPhamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant">
          Đang tải...
        </div>
      }
    >
      <SanPhamContent />
    </Suspense>
  )
}
