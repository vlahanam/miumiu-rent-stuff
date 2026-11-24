import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchItems } from "@/lib/api"
import type { Item } from "@/types"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export default async function ItemsPage() {
  let items: Item[] = []
  let error = ''

  try {
    const res = await fetchItems()
    items = res.data || []
  } catch {
    error = 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="text-2xl font-bold text-pink-600">MiuMiu</a>
            <Badge variant="secondary">Rent Stuff</Badge>
          </div>
          <Button variant="default" className="bg-pink-600 hover:bg-pink-700">
            Đăng nhập
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Danh sách sản phẩm</h1>
          <p className="text-gray-500">Khám phá bộ sưu tập trang phục cao cấp của chúng tôi</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {items.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Chưa có sản phẩm nào.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                  <Badge variant={item.is_available ? "default" : "secondary"} className="shrink-0 text-xs">
                    {item.is_available ? "Còn hàng" : "Hết hàng"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {item.category && (
                  <Badge variant="outline" className="mb-2 text-xs">{item.category}</Badge>
                )}
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-0">
                <span className="font-semibold text-pink-600">
                  {formatCurrency(item.price_per_day)}<span className="text-xs text-gray-400 font-normal">/ngày</span>
                </span>
                <Button size="sm" variant="outline" disabled={!item.is_available}>
                  {item.is_available ? "Thuê ngay" : "Hết hàng"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
