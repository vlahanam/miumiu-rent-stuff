'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
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
    async (pageNum = 1, append = false, silent = false) => {
      if (append) setLoadingMore(true)
      else if (!silent) setLoading(true)
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
        if (append) setLoadingMore(false)
        else if (!silent) setLoading(false)
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
    loadProducts(1, false, true)
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
    <AppShell
      title="Sản Phẩm"
      subtitle={`${totalAll} trang phục & phụ kiện trong kho`}
      fab={{ label: 'Thêm sản phẩm', href: '/san-pham/them-moi' }}
      rightSlot={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            title="Xuất báo cáo sản phẩm"
            className="h-8 lg:h-9 px-2.5 lg:px-3.5 rounded-full lg:rounded-xl bg-surface-container text-primary-container hover:bg-primary-fixed font-label-sm lg:font-label-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[1rem] lg:text-[1.125rem]">file_download</span>
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
          <Link
            href="/san-pham/them-moi"
            className="hidden lg:inline-flex h-9 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-bold whitespace-nowrap items-center gap-1.5 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[1.125rem]">add</span>
            <span>Thêm sản phẩm</span>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col w-full gap-space-md lg:gap-5">
        {/* Search & Filters Toolbar */}
        <section className="flex flex-col gap-space-sm lg:gap-3 lg:p-4 lg:rounded-2xl lg:bg-surface-container-lowest lg:border lg:border-outline-variant/20 lg:shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-sm lg:gap-3">
            {/* Search Input */}
            <div className="relative flex items-center xl:w-80 2xl:w-96 shrink-0">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[1.25rem] pointer-events-none">
                search
              </span>
              <input
                className="w-full h-11 lg:h-10 pl-10 pr-9 rounded-xl bg-surface-container-lowest lg:bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-outline-variant/25 shadow-sm lg:shadow-none focus:outline-none focus:bg-surface-container-lowest focus:border-primary-container"
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
                  <span className="material-symbols-outlined text-[1.125rem]">close</span>
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap pb-0.5 lg:pb-0 -mx-margin px-margin lg:mx-0 lg:px-0 no-scrollbar">
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
                    className={`shrink-0 h-8 lg:h-9 px-3 lg:px-3.5 rounded-full font-label-sm lg:font-label-md transition-all flex items-center gap-1.5 ${
                      active
                        ? 'text-on-primary bg-primary-container shadow-sm'
                        : 'bg-surface-container-lowest lg:bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container'
                    }`}
                  >
                    {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />}
                    <span>{chip.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Summary + Sort + View Toggle Bar */}
          <div className="flex items-center justify-between px-3 py-2 lg:px-0 lg:py-0 lg:pt-3 lg:border-t lg:border-outline-variant/15 rounded-xl lg:rounded-none bg-surface-container-low lg:bg-transparent gap-2">
            <div className="flex items-center gap-1.5 text-on-surface min-w-0">
              <span className="material-symbols-outlined text-[1.125rem] text-primary-container">styler</span>
              <span className="font-label-md text-label-md truncate">
                Hiển thị {products.length}/{total} sản phẩm
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sắp xếp sản phẩm"
                className="bg-surface-container-lowest lg:bg-surface-container-low border border-outline-variant/30 rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm text-primary font-semibold focus:outline-none focus:border-primary-container"
              >
                <option value="">Mới nhất</option>
                <option value="gia_asc">Giá tăng dần</option>
                <option value="gia_desc">Giá giảm dần</option>
              </select>

              {/* Desktop View Mode Toggle */}
              <div className="hidden lg:inline-flex items-center p-0.5 rounded-lg bg-surface-container-low border border-outline-variant/25">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Chế độ lưới"
                  aria-label="Chế độ lưới"
                  className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1.125rem]">grid_view</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Chế độ bảng"
                  aria-label="Chế độ bảng"
                  className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${
                    viewMode === 'table'
                      ? 'bg-surface-container-lowest text-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[1.125rem]">view_list</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-space-sm lg:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-surface-container-low animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="py-12 lg:py-16 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-2.5">
            <span className="material-symbols-outlined text-[2.625rem] text-outline">checkroom</span>
            <h3 className="font-title-sm text-title-sm text-on-surface">Chưa có sản phẩm nào</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {debouncedSearch || statusFilter
                ? 'Không tìm thấy sản phẩm khớp bộ lọc hiện tại.'
                : 'Thêm áo dài hoặc phụ kiện đầu tiên vào kho của tiệm.'}
            </p>
            <Link
              href="/san-pham/them-moi"
              className="mt-1 px-4 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md whitespace-nowrap transition-colors"
            >
              + Thêm sản phẩm mới
            </Link>
          </div>
        )}

        {/* Product Grid (always on mobile/tablet; on desktop when viewMode === 'grid') */}
        {!loading && products.length > 0 && (
          <>
            <div
              className={`${
                viewMode === 'table' ? 'grid lg:hidden' : 'grid'
              } grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-space-sm lg:gap-4 w-full`}
            >
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/san-pham/${product.id}`}
                  className="group flex flex-col bg-surface-container-lowest rounded-2xl p-2.5 lg:p-3 border border-outline-variant/15 shadow-[0_4px_16px_-2px_rgba(107,33,63,0.06),0_1px_3px_0_rgba(0,0,0,0.02)] hover:shadow-md hover:border-primary-container/25 transition-all active:scale-[0.99]"
                >
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-container mb-2.5">
                    <ProductImage
                      hinhAnh={product.hinh_anh}
                      alt={product.ten_san_pham}
                      className="w-full h-full group-hover:scale-[1.03] transition-transform duration-300"
                      iconSize={34}
                    />
                    <div className="absolute top-2 left-2">
                      <SanPhamStatusBadge status={product.trang_thai} />
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-[0.6875rem] text-primary-container font-semibold tracking-wider truncate">
                        {product.ma_san_pham}
                      </span>
                      <h2 className="font-title-sm text-[0.8125rem] lg:text-[0.875rem] leading-snug text-on-surface line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                        {product.ten_san_pham}
                      </h2>
                    </div>

                    <div className="pt-2.5 mt-1.5 border-t border-outline-variant/15 flex items-baseline justify-between min-w-0">
                      <span className="font-currency-lg text-[0.875rem] lg:text-[0.9375rem] leading-none text-on-surface font-bold tabular-nums">
                        {formatCurrency(product.gia_thue_ngay)}
                      </span>
                      <span className="font-label-sm text-[0.625rem] lg:text-[0.6875rem] text-on-surface-variant">/ngày</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table View */}
            {viewMode === 'table' && (
              <div className="hidden lg:block bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/80 border-b border-outline-variant/20 font-label-sm text-[0.6875rem] uppercase tracking-wider text-on-surface-variant">
                        <th className="py-3.5 pl-5 pr-3">Sản phẩm</th>
                        <th className="py-3.5 px-3">Mã SKU</th>
                        <th className="py-3.5 px-3">Trạng thái</th>
                        <th className="py-3.5 px-3 text-right">Giá thuê / ngày</th>
                        <th className="py-3.5 px-3 text-right">Giá gốc</th>
                        <th className="py-3.5 pl-3 pr-5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-surface-container-low/60 transition-colors">
                          <td className="py-3 pl-5 pr-3">
                            <Link href={`/san-pham/${product.id}`} className="flex items-center gap-3 group">
                              <div className="w-11 h-14 rounded-lg overflow-hidden bg-surface-container shrink-0">
                                <ProductImage
                                  hinhAnh={product.hinh_anh}
                                  alt={product.ten_san_pham}
                                  className="w-full h-full"
                                  iconSize={18}
                                />
                              </div>
                              <span className="font-title-sm text-[0.875rem] text-on-surface group-hover:text-primary-container transition-colors line-clamp-2">
                                {product.ten_san_pham}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-label-md text-primary-container font-bold">
                              {product.ma_san_pham}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <SanPhamStatusBadge status={product.trang_thai} />
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap font-currency-lg text-[0.875rem] text-on-surface font-bold tabular-nums">
                            {formatCurrency(product.gia_thue_ngay)}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap font-body-sm text-on-surface-variant tabular-nums">
                            {formatCurrency(product.gia_goc_san_pham)}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/san-pham/${product.id}`}
                                className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm whitespace-nowrap flex items-center transition-colors"
                              >
                                Chi tiết
                              </Link>
                              {product.trang_thai !== 3 && (
                                <Link
                                  href={`/don-thue/tao-moi?san_pham_id=${product.id}`}
                                  className="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm whitespace-nowrap flex items-center gap-1 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[0.9375rem]">add_shopping_cart</span>
                                  <span>Thuê</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {products.length < total && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadProducts(page + 1, true)}
                  className="w-full lg:w-auto lg:min-w-[15rem] h-11 px-6 rounded-xl bg-surface-container text-primary-container font-label-md text-label-md hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Đang tải thêm...' : `Tải thêm (${products.length}/${total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
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
