import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-pink-600">MiuMiu</span>
            <Badge variant="secondary">Rent Stuff</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Trang chủ
            </a>
            <a href="/items" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Sản phẩm
            </a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">
              Giới thiệu
            </a>
          </nav>
          <Button variant="default" className="bg-pink-600 hover:bg-pink-700">
            Đăng nhập
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4 bg-pink-100 text-pink-600 hover:bg-pink-100">
          ✨ Phong cách, Sang trọng, Tiết kiệm
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Thuê trang phục{' '}
          <span className="text-pink-600">cao cấp</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Khám phá bộ sưu tập váy dạ hội, áo dài, vest và nhiều trang phục cao cấp khác với giá thuê hợp lý
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
            Xem sản phẩm
          </Button>
          <Button size="lg" variant="outline">
            Tìm hiểu thêm
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Tại sao chọn MiuMiu?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="text-4xl mb-2">👗</div>
              <CardTitle>Đa dạng mẫu mã</CardTitle>
              <CardDescription>
                Hàng trăm mẫu trang phục cao cấp từ các thương hiệu nổi tiếng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Từ váy dạ hội, áo dài đến vest nam, chúng tôi có tất cả những gì bạn cần cho mọi dịp đặc biệt.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="text-4xl mb-2">💰</div>
              <CardTitle>Giá thuê hợp lý</CardTitle>
              <CardDescription>
                Tiết kiệm đến 90% so với mua mới
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Thưởng thức trang phục cao cấp với chi phí hợp lý. Thuê theo ngày, linh hoạt và tiết kiệm.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="text-4xl mb-2">🚀</div>
              <CardTitle>Giao hàng nhanh</CardTitle>
              <CardDescription>
                Nhận trang phục tận nơi, trả lại dễ dàng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Chúng tôi đảm bảo trang phục đến tay bạn đúng thời gian, sạch sẽ và hoàn hảo.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            © 2026 MiuMiu Rent Stuff. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </footer>
    </div>
  )
}
