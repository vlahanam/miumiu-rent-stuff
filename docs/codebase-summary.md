# Codebase Summary — MiuMiu Rent Stuff

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026

Tài liệu này mô tả chi tiết từng file trong dự án, giúp developer mới nhanh chóng nắm bắt codebase.

---

## 1. Cấu trúc thư mục toàn bộ

```
miumiu-rent-stuff/
├── .env.example                    ← Mẫu biến môi trường
├── .gitignore
├── README.md                       ← Hướng dẫn nhanh
├── docker-compose.yml              ← Định nghĩa 4 services
│
├── backend/                        ← Go backend service
│   ├── Dockerfile                  ← Multi-stage: dev / builder / production
│   ├── go.mod                      ← Go module dependencies
│   ├── go.sum
│   ├── cmd/
│   │   └── server/
│   │       └── main.go             ← Entrypoint
│   └── internal/
│       ├── common/
│       │   └── pagination.go       ← Pagination utility
│       ├── database/
│       │   └── database.go         ← MySQL connection (GORM)
│       ├── handler/
│       │   ├── san_pham_handler.go ← CRUD /api/v1/san-pham
│       │   ├── khach_hang_handler.go ← CRUD /api/v1/khach-hang
│       │   └── thue_do_handler.go  ← CRUD /api/v1/thue-do
│       ├── model/
│       │   ├── san_pham.go         ← SanPham model + Input structs
│       │   ├── khach_hang.go       ← KhachHang model + Input structs
│       │   └── thue_do.go          ← ThueDo + ChiTietThueDo models
│       └── router/
│           └── router.go           ← Route registration + CORS
│
├── frontend/                       ← Next.js frontend service
│   ├── Dockerfile                  ← Multi-stage: deps / builder / runner
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json             ← Shadcn UI config
│   ├── next-env.d.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          ← Root HTML layout
│       │   ├── page.tsx            ← Trang chủ (/)
│       │   ├── globals.css         ← CSS global + Tailwind
│       │   └── items/
│       │       └── page.tsx        ← Danh sách sản phẩm (/items)
│       ├── components/
│       │   └── ui/
│       │       ├── badge.tsx       ← Shadcn Badge
│       │       ├── button.tsx      ← Shadcn Button
│       │       └── card.tsx        ← Shadcn Card
│       ├── lib/
│       │   ├── api.ts              ← API fetch functions
│       │   └── utils.ts            ← cn() helper
│       └── types/
│           └── index.ts            ← TypeScript interfaces
│
├── nginx/
│   ├── nginx.conf                  ← Nginx global config
│   └── conf.d/
│       └── default.conf            ← Virtual host + proxy rules
│
├── database/
│   └── init.sql                    ← DDL + seed data
│
└── docs/                           ← 📁 Tài liệu dự án
    ├── project-overview-pdr.md
    ├── system-architecture.md
    ├── codebase-summary.md         ← (file này)
    ├── deployment-guide.md
    ├── design-guidelines.md
    └── project-roadmap.md
```

---

## 2. Backend — Chi tiết từng file

### `backend/cmd/server/main.go`

Entrypoint của backend.

**Luồng:**
1. Gọi `database.Connect()` → nhận `*gorm.DB`
2. Gọi `router.Setup(db)` → nhận `*gin.Engine`
3. Đọc `APP_PORT` từ env (mặc định `8080`)
4. Chạy `r.Run(":8080")`

```go
func main() {
    db, err := database.Connect()
    r := router.Setup(db)
    r.Run(fmt.Sprintf(":%s", port))
}
```

---

### `backend/internal/database/database.go`

Khởi tạo kết nối MySQL thông qua GORM.

**Cấu hình connection pool:**
- `MaxIdleConns`: 10
- `MaxOpenConns`: 100
- `ConnMaxLifetime`: 1 giờ

**DSN format:**
```
user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
```

**GORM Logger**: Log tất cả queries, highlight queries chậm (> 1 giây).

---

### `backend/internal/router/router.go`

Đăng ký tất cả HTTP routes và middleware.

**Middleware:**
- `gin.Default()` — tích hợp sẵn Logger + Recovery
- CORS middleware tùy chỉnh: `Allow-Origin: *`, cho phép GET, POST, PUT, PATCH, DELETE, OPTIONS

**Route groups:**
```
GET  /health                    → Health check

/api/v1/san-pham
  GET    /               → GetAll (filter: trang_thai, page, limit)
  GET    /:id            → GetByID
  POST   /               → Create
  PUT    /:id            → Update
  DELETE /:id            → Delete

/api/v1/khach-hang
  GET    /               → GetAll (filter: search, page, limit)
  GET    /:id            → GetByID
  POST   /               → Create
  PUT    /:id            → Update
  DELETE /:id            → Delete

/api/v1/thue-do
  GET    /               → GetAll (filter: trang_thai, khach_hang_id, page, limit)
  GET    /:id            → GetByID (preload: KhachHang, ChiTiet, ChiTiet.SanPham)
  POST   /               → Create (transaction: ThueDo + ChiTietThueDo)
  PUT    /:id            → Update
  DELETE /:id            → Delete (cascade ChiTietThueDo)
```

---

### `backend/internal/model/san_pham.go`

**Struct `SanPham`** — GORM model, map sang bảng `san_pham`.

**Struct `CreateSanPhamInput`** — Input validation cho POST:
- `ma_san_pham`: required, max 30 ký tự
- `ten_san_pham`: required, max 255 ký tự
- `slug`: required, max 255 ký tự
- `gia_goc_san_pham`: ≥ 0
- `gia_thue_ngay`: ≥ 0
- `trang_thai`: phải là 1, 2 hoặc 3 (mặc định 1 nếu = 0)

**Struct `UpdateSanPhamInput`** — Input validation cho PUT (tất cả field là pointer, chỉ update field được gửi).

---

### `backend/internal/model/khach_hang.go`

**Struct `KhachHang`** — GORM model, map sang bảng `khach_hang`.

**Struct `CreateKhachHangInput`**:
- `ten`: required, max 100 ký tự
- `so_dien_thoai`: required, max 20 ký tự, chỉ chữ số (`is.Digit`)
- `dia_chi`: optional, max 255 ký tự

**Struct `UpdateKhachHangInput`** — tất cả pointer, partial update.

---

### `backend/internal/model/thue_do.go`

**Struct `ThueDo`** — GORM model với 2 associations:
- `KhachHang *KhachHang` — belongsTo
- `ChiTiet []ChiTietThueDo` — hasMany

**Struct `ChiTietThueDo`** — GORM model với 1 association:
- `SanPham *SanPham` — belongsTo

**Struct `CreateThueDoInput`**:
- `ma_phieu_thue`: required, max 30 ký tự
- `khach_hang_id`: required
- `nguoi_dung_id`: required
- `loai_coc`: 1, 2 hoặc 3
- `trang_thai`: 1-5 (mặc định 1)
- `tong_tien_thue`, `tien_coc`, `tien_phat`: ≥ 0
- `chi_tiet`: mảng `ChiTietThueDoInput`

**Transaction khi tạo**: Insert `ThueDo` trước, sau đó insert từng `ChiTietThueDo`. Nếu bất kỳ bước nào lỗi, rollback toàn bộ.

---

### `backend/internal/handler/san_pham_handler.go`

**`GetAll`**: Query `san_pham`, filter theo `trang_thai` nếu có, phân trang.

**`GetByID`**: Tìm theo ID, trả 404 nếu không tìm thấy.

**`Create`**: Bind JSON → Validate → Insert. Mặc định `trang_thai = 1` nếu client gửi 0.

**`Update`**: Tìm record → Bind JSON → Validate → build `updates` map → `db.Model.Updates(map)`.

> **Pattern quan trọng**: Dùng `map[string]interface{}` thay vì struct khi update để tránh GORM bỏ qua zero values.

**`Delete`**: Tìm record → Soft delete (GORM default hard delete vì SanPham không có `DeletedAt`).

---

### `backend/internal/handler/khach_hang_handler.go`

Tương tự `san_pham_handler`. Thêm tính năng:
- **`GetAll`**: Tìm kiếm full-text theo `ten` hoặc `so_dien_thoai` với `LIKE '%search%'`.

---

### `backend/internal/handler/thue_do_handler.go`

**`GetAll`**: Filter `trang_thai` và `khach_hang_id`. Preload `KhachHang`, `ChiTiet`, `ChiTiet.SanPham`.

**`GetByID`**: Preload đầy đủ các associations.

**`Create`**: Transaction bao gồm tạo `ThueDo` + tất cả `ChiTietThueDo`. Sau khi tạo xong, reload lại với Preload trước khi trả về response.

**`Update`**: Chỉ update các field được gửi (partial update qua map).

**`Delete`**: `chi_tiet_thue_do` bị xóa cascade tự động qua FK constraint.

---

### `backend/internal/common/pagination.go`

Package `pagination` cung cấp:

**`ParseParams(c *gin.Context) Params`**:
- Đọc `?page=` (mặc định 1) và `?limit=` (mặc định 20, tối đa 100)
- Tính `Offset = (page-1) * limit`

**`Paginate(c, q, dest, orderBy) (Result, error)`**:
1. Đếm tổng: `q.Count(&total)`
2. Fetch: `q.Offset(p.Offset).Limit(p.Limit).Order(orderBy).Find(dest)`
3. Trả về `Result{Data, Total, Page, Limit}`

---

## 3. Frontend — Chi tiết từng file

### `frontend/src/app/layout.tsx`

Root layout của Next.js App Router. Bao gồm font loading và `<html>/<body>` wrapper.

### `frontend/src/app/page.tsx`

Trang chủ `/`. Server component.

**Nội dung:**
- Header với logo MiuMiu + navigation
- Hero section với tagline và CTA buttons
- Features section: 3 card giới thiệu lợi ích
- Footer

### `frontend/src/app/items/page.tsx`

Trang danh sách sản phẩm `/items`. **Async Server Component**.

**Luồng:**
1. Gọi `fetchItems()` từ `lib/api.ts`
2. Render lưới card sản phẩm (1-4 cột responsive)
3. Hiển thị badge trạng thái (Còn hàng / Hết hàng)
4. Format giá tiền VND với `Intl.NumberFormat`

> **Lưu ý**: Hiện đang dùng interface `Item` (có `name`, `is_available`, `category`) nhưng backend trả về `SanPham` (có `ten_san_pham`, `trang_thai`). Cần cập nhật types để khớp với backend.

### `frontend/src/lib/api.ts`

Wrapper functions gọi Backend API.

| Function | Method | Endpoint |
|----------|--------|---------|
| `fetchItems()` | GET | `/api/v1/items` |
| `fetchItem(id)` | GET | `/api/v1/items/:id` |
| `createItem(data)` | POST | `/api/v1/items` |
| `updateItem(id, data)` | PUT | `/api/v1/items/:id` |
| `deleteItem(id)` | DELETE | `/api/v1/items/:id` |

> **Lưu ý**: URL endpoints chưa được cập nhật theo API backend mới (`/san-pham` thay vì `/items`).

### `frontend/src/lib/utils.ts`

```typescript
// Merge Tailwind classes an toàn (clsx + tailwind-merge)
function cn(...inputs: ClassValue[]): string
```

### `frontend/src/types/index.ts`

```typescript
interface Item {
  id: number
  name: string
  description: string
  price_per_day: number
  is_available: boolean
  image_url: string
  category: string
  created_at: string
  updated_at: string
}

interface ApiResponse<T> {
  data: T
  total?: number
  error?: string | Record<string, string>
  message?: string
}
```

> **Cần cập nhật**: Interface này chưa phản ánh đúng model `SanPham` của backend.

### `frontend/src/components/ui/`

Shadcn UI components được generate:
- `badge.tsx` — Badge với các variants: `default`, `secondary`, `outline`, `destructive`
- `button.tsx` — Button với variants và sizes
- `card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

---

## 4. Database — `database/init.sql`

Script DDL tự động chạy khi MySQL container khởi động lần đầu.

**Bảng được tạo:**

| Bảng | Mô tả |
|------|-------|
| `san_pham` | Sản phẩm cho thuê; indexes: `ma_san_pham` (unique), `slug` (unique), `trang_thai+gia_thue_ngay` (composite), `ten_san_pham` (FULLTEXT) |
| `nguoi_dung` | Nhân viên/tài khoản hệ thống; `email` (unique) |
| `khach_hang` | Khách hàng; `so_dien_thoai` (unique) |
| `thue_do` | Phiếu thuê; indexes: `ma_phieu_thue` (unique), `trang_thai`, `ngay_hen_tra`, `khach_hang_id`, `nguoi_dung_id` |
| `chi_tiet_thue_do` | Chi tiết phiếu thuê; `(thue_do_id, san_pham_id)` (unique) |
| `cai_dat` | Key-value config; `khoa` (unique) |

**Seed data (cai_dat):**
```sql
('pham_tram_gia_coc',     '85',         2, '% giá trị cọc')
('so_dien_thoai_lien_he', '0365193713', 1, 'SĐT liên hệ shop')
```

---

## 5. Infrastructure — Chi tiết

### `docker-compose.yml`

Orchestrate 4 services. Điểm đáng chú ý:
- Backend dùng **target `dev`** (chạy `go run`, hot-reload thủ công)
- Frontend dùng **target `runner`** (chạy `npm run dev`)
- Backend mount `./backend:/app` và `go_pkg_cache` để tăng tốc rebuild

### `backend/Dockerfile` — Multi-stage

| Stage | Base | Mục đích |
|-------|------|---------|
| `dev` | `golang:1.23-alpine` | Development: `go run` |
| `builder` | `golang:1.23-alpine` | Build binary tối ưu |
| `production` | `alpine:latest` | Chạy binary nhỏ gọn |

docker-compose hiện dùng **target `dev`**.

### `frontend/Dockerfile` — Multi-stage

| Stage | Base | Mục đích |
|-------|------|---------|
| `deps` | `node:20-alpine` | Cài npm packages |
| `builder` | `node:20-alpine` | `npm run build` |
| `runner` | `node:20-alpine` | Dev server `npm run dev` |

### `nginx/conf.d/default.conf`

Hai upstream: `backend:8080` và `frontend:3000`.

Routing: `/api/` → backend, `/health` → backend, mọi thứ còn lại → frontend.

---

## 6. Các vấn đề đã biết (Known Issues)

| Vấn đề | Mô tả | Mức độ |
|--------|-------|-------|
| **Type mismatch** | `frontend/src/types/index.ts` dùng interface `Item` (en) nhưng backend trả về `SanPham` (vi) | Cao |
| **API URL sai** | `frontend/src/lib/api.ts` gọi `/api/v1/items` nhưng backend expose `/api/v1/san-pham` | Cao |
| **Không có auth** | Chưa có xác thực JWT, mọi API endpoint đều public | Trung bình |
| **CORS quá rộng** | Backend cho phép `Allow-Origin: *` | Trung bình |
| **Không có nguoi_dung API** | Bảng `nguoi_dung` tồn tại nhưng chưa có CRUD | Thấp |
| **Dev mode production** | Backend và Frontend đang chạy ở dev mode trong Docker | Thấp |
