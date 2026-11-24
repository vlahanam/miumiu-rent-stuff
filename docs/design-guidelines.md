# Design Guidelines — MiuMiu Rent Stuff

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026

Tài liệu này mô tả các quy ước thiết kế UI/UX, coding standards và best practices cho dự án.

---

## 1. Thiết kế thương hiệu

### 1.1 Bảng màu chính

| Token | Màu | Hex | Dùng cho |
|-------|-----|-----|---------|
| `pink-600` | Hồng chính | `#db2777` | CTA buttons, logo, accent |
| `pink-700` | Hồng đậm | `#be185d` | Hover state của pink-600 |
| `pink-50` | Hồng nhạt | `#fdf2f8` | Background gradient |
| `purple-50` | Tím nhạt | `#faf5ff` | Background gradient |
| `gray-900` | Đen xám | `#111827` | Heading chính, footer bg |
| `gray-600` | Xám vừa | `#4b5563` | Body text |
| `gray-500` | Xám nhạt | `#6b7280` | Mô tả, placeholder |
| `gray-50` | Xám rất nhạt | `#f9fafb` | Background trang |

### 1.2 Gradient nền trang chủ

```css
background: linear-gradient(to bottom right, #fdf2f8, #faf5ff);
/* Tailwind: bg-gradient-to-br from-pink-50 to-purple-50 */
```

### 1.3 Typography

| Element | Class Tailwind |
|---------|---------------|
| Logo | `text-2xl font-bold text-pink-600` |
| H1 (Hero) | `text-4xl md:text-6xl font-bold text-gray-900` |
| H2 (Section) | `text-3xl font-bold text-center text-gray-900` |
| H3 (Card title) | `text-base leading-tight font-semibold` |
| Body | `text-gray-600` |
| Caption / Meta | `text-sm text-gray-500` |
| Price | `font-semibold text-pink-600` |

---

## 2. Component Design System

Dự án sử dụng **Shadcn UI** — một collection của Radix UI primitives được styled bằng Tailwind CSS.

> Shadcn UI không phải npm package mà là code bạn own trực tiếp trong `src/components/ui/`.

### 2.1 Button

```tsx
// Primary (CTA chính)
<Button className="bg-pink-600 hover:bg-pink-700">
  Xem sản phẩm
</Button>

// Outline (CTA phụ)
<Button variant="outline">
  Tìm hiểu thêm
</Button>

// Large size
<Button size="lg" className="bg-pink-600 hover:bg-pink-700">
  Xem sản phẩm
</Button>

// Small size (trong card)
<Button size="sm" variant="outline">
  Thuê ngay
</Button>

// Disabled
<Button disabled>Hết hàng</Button>
```

**Quy tắc:**
- Luôn override màu về `pink-600 / pink-700` cho primary CTA thay vì dùng mặc định của Shadcn.
- Không dùng `variant="destructive"` mà không có confirmation dialog.

### 2.2 Badge

```tsx
// Trạng thái còn hàng
<Badge variant="default">Còn hàng</Badge>

// Trạng thái hết hàng / secondary info
<Badge variant="secondary">Hết hàng</Badge>

// Category tag
<Badge variant="outline">Váy dạ hội</Badge>

// Hero badge
<Badge className="bg-pink-100 text-pink-600 hover:bg-pink-100">
  ✨ Phong cách, Sang trọng, Tiết kiệm
</Badge>
```

**Quy tắc trạng thái sản phẩm:**

| `trang_thai` | Badge variant | Label |
|-------------|--------------|-------|
| 1 (Trống lịch) | `default` | Còn hàng |
| 2 (Đã cho thuê) | `secondary` | Đang cho thuê |
| 3 (Bảo dưỡng) | `outline` | Bảo dưỡng |

### 2.3 Card

```tsx
// Card sản phẩm chuẩn
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader className="pb-2">
    <CardTitle className="text-base leading-tight">{item.ten_san_pham}</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-500 line-clamp-2">{item.mo_ta}</p>
  </CardContent>
  <CardFooter className="flex items-center justify-between pt-0">
    <span className="font-semibold text-pink-600">
      {formatCurrency(item.gia_thue_ngay)}<span className="text-xs text-gray-400 font-normal">/ngày</span>
    </span>
    <Button size="sm" variant="outline">Thuê ngay</Button>
  </CardFooter>
</Card>

// Feature card (không có border)
<Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
  ...
</Card>
```

### 2.4 Thêm Shadcn component mới

```bash
# Chạy trong container frontend
docker compose exec frontend npx shadcn@latest add <component>

# Các component thường dùng tiếp theo
docker compose exec frontend npx shadcn@latest add dialog      # Modal/Dialog
docker compose exec frontend npx shadcn@latest add input       # Text input
docker compose exec frontend npx shadcn@latest add form        # React Hook Form wrapper
docker compose exec frontend npx shadcn@latest add table       # Data table
docker compose exec frontend npx shadcn@latest add select      # Dropdown select
docker compose exec frontend npx shadcn@latest add toast       # Notifications
docker compose exec frontend npx shadcn@latest add sheet       # Side panel
docker compose exec frontend npx shadcn@latest add pagination  # Phân trang
```

---

## 3. Layout & Spacing

### 3.1 Container

```tsx
// Wrapper chuẩn cho mọi section
<div className="container mx-auto px-4">
  ...
</div>
```

### 3.2 Grid responsive cho danh sách sản phẩm

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
```

| Breakpoint | Số cột |
|-----------|-------|
| Mobile (< 640px) | 1 |
| Tablet (≥ 640px) | 2 |
| Desktop (≥ 768px) | 3 |
| Wide (≥ 1280px) | 4 |

### 3.3 Section spacing

```tsx
// Section lớn (hero, features)
<section className="container mx-auto px-4 py-16">
// hoặc py-20 cho hero

// Header page
<header className="bg-white shadow-sm border-b">
  <div className="container mx-auto px-4 py-4">

// Footer
<footer className="bg-gray-900 text-gray-400 py-8 mt-16">
```

---

## 4. Coding Conventions — Frontend (TypeScript / Next.js)

### 4.1 Naming

| Thành phần | Convention | Ví dụ |
|-----------|-----------|-------|
| Component files | PascalCase | `ProductCard.tsx`, `RentalForm.tsx` |
| Utility files | camelCase | `api.ts`, `utils.ts` |
| CSS/Tailwind | Tailwind utilities | — |
| Variables | camelCase | `fetchItems`, `formatCurrency` |
| Interfaces | PascalCase với prefix I nếu cần | `SanPham`, `KhachHang` |
| API functions | `fetchXxx`, `createXxx`, `updateXxx`, `deleteXxx` | `fetchSanPham` |

### 4.2 TypeScript interfaces

Mỗi entity từ backend phải có interface TypeScript tương ứng trong `src/types/index.ts`. Dùng **tiếng Việt** để khớp với JSON response:

```typescript
// Đúng (khớp với backend JSON)
export interface SanPham {
  id: number
  ma_san_pham: string
  ten_san_pham: string
  slug: string
  hinh_anh: string | null
  gia_goc_san_pham: number
  gia_thue_ngay: number
  trang_thai: 1 | 2 | 3
  ngay_tao: string
  ngay_cap_nhat: string
}

export interface KhachHang {
  id: number
  ten: string
  so_dien_thoai: string
  dia_chi: string | null
  ngay_tao: string
  ngay_cap_nhat: string
}

// Response wrapper
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface SingleResponse<T> {
  data: T
}
```

### 4.3 API functions

```typescript
// Pattern chuẩn
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

export async function fetchSanPham(params?: {
  trang_thai?: number
  page?: number
  limit?: number
}): Promise<PaginatedResponse<SanPham>> {
  const url = new URL(`${API_BASE}/v1/san-pham`)
  if (params?.trang_thai) url.searchParams.set('trang_thai', String(params.trang_thai))
  if (params?.page) url.searchParams.set('page', String(params.page))
  if (params?.limit) url.searchParams.set('limit', String(params.limit))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch san-pham')
  return res.json()
}
```

### 4.4 Formatting tiền tệ

```typescript
// Hàm chuẩn — luôn dùng vi-VN / VND
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

// Render: "300.000 ₫"
```

### 4.5 Error handling

```tsx
// Server Component — try/catch với fallback UI
async function SanPhamPage() {
  let items: SanPham[] = []
  let error = ''
  
  try {
    const res = await fetchSanPham()
    items = res.data
  } catch {
    error = 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.'
  }

  if (error) return <ErrorBanner message={error} />
  ...
}
```

---

## 5. Coding Conventions — Backend (Go)

### 5.1 Naming

| Thành phần | Convention | Ví dụ |
|-----------|-----------|-------|
| Package names | lowercase | `handler`, `model`, `database` |
| Exported types | PascalCase | `SanPham`, `KhachHang` |
| Struct fields | PascalCase | `MaSanPham`, `TenSanPham` |
| Constructor functions | `NewXxx` | `NewSanPhamHandler`, `NewKhachHangHandler` |
| Handler methods | Descriptive verb | `GetAll`, `GetByID`, `Create`, `Update`, `Delete` |
| Unexported fields | camelCase | `db` |

### 5.2 Handler pattern chuẩn

```go
// Pattern chuẩn cho mọi handler
func (h *XxxHandler) Create(c *gin.Context) {
    // 1. Bind input
    var input model.CreateXxxInput
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // 2. Validate
    if err := input.Validate(); err != nil {
        c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
        return
    }
    
    // 3. Business logic + DB
    entity := model.Xxx{...}
    if err := h.db.Create(&entity).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo ..."})
        return
    }
    
    // 4. Response
    c.JSON(http.StatusCreated, gin.H{"data": entity})
}
```

### 5.3 HTTP Status codes

| Tình huống | Status Code |
|-----------|-----------|
| Lấy danh sách / chi tiết | 200 OK |
| Tạo thành công | 201 Created |
| Xóa / Cập nhật thành công | 200 OK |
| Input sai format | 400 Bad Request |
| Validation lỗi | 422 Unprocessable Entity |
| Không tìm thấy | 404 Not Found |
| Lỗi server | 500 Internal Server Error |

### 5.4 Partial update với map

```go
// ĐÚNG: Dùng map để tránh GORM bỏ qua zero values
updates := map[string]interface{}{}
if input.TrangThai != nil {
    updates["trang_thai"] = *input.TrangThai
}
if err := h.db.Model(&entity).Updates(updates).Error; err != nil { ... }

// SAI: Dùng struct sẽ bỏ qua field có zero value (0, false, "")
h.db.Model(&entity).Updates(input)  // ❌
```

### 5.5 Validation với ozzo-validation

```go
func (i CreateXxxInput) Validate() error {
    return validation.ValidateStruct(&i,
        validation.Field(&i.FieldRequired,
            validation.Required.Error("Field không được để trống"),
            validation.Length(1, 100).Error("Field tối đa 100 ký tự"),
        ),
        validation.Field(&i.FieldNumeric,
            validation.Min(0.0).Error("Field phải >= 0"),
        ),
        validation.Field(&i.FieldEnum,
            validation.In(uint8(1), uint8(2), uint8(3)).Error("Giá trị không hợp lệ (1, 2, 3)"),
        ),
    )
}
```

### 5.6 Database best practices

```go
// Luôn dùng transaction khi tạo nhiều bảng liên quan
err := h.db.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&parent).Error; err != nil {
        return err  // Auto rollback
    }
    for _, child := range children {
        if err := tx.Create(&child).Error; err != nil {
            return err  // Auto rollback
        }
    }
    return nil  // Commit
})

// Phân biệt ErrRecordNotFound với các lỗi khác
if errors.Is(err, gorm.ErrRecordNotFound) {
    c.JSON(404, ...)
} else {
    c.JSON(500, ...)
}
```

---

## 6. Quy ước đặt tên tiếng Việt

Dự án dùng **tiếng Việt** cho tất cả tên bảng, cột và field API để gần với nghiệp vụ:

| Khái niệm | Tên trong code |
|-----------|---------------|
| Sản phẩm | `san_pham` / `SanPham` |
| Khách hàng | `khach_hang` / `KhachHang` |
| Người dùng (nhân viên) | `nguoi_dung` / `NguoiDung` |
| Phiếu thuê | `thue_do` / `ThueDo` |
| Chi tiết phiếu thuê | `chi_tiet_thue_do` / `ChiTietThueDo` |
| Cài đặt | `cai_dat` / `CaiDat` |
| Mã sản phẩm | `ma_san_pham` |
| Tên sản phẩm | `ten_san_pham` |
| Trạng thái | `trang_thai` |
| Ngày tạo | `ngay_tao` |
| Ngày cập nhật | `ngay_cap_nhat` |
| Giá gốc | `gia_goc_san_pham` |
| Giá thuê ngày | `gia_thue_ngay` |
| Mã phiếu thuê | `ma_phieu_thue` |
| Ngày bắt đầu | `ngay_bat_dau` |
| Ngày hẹn trả | `ngay_hen_tra` |
| Ngày trả thực tế | `ngay_tra_thuc_te` |
| Tiền cọc | `tien_coc` |
| Tiền phạt | `tien_phat` |
| Loại cọc | `loai_coc` |
| Ghi chú | `ghi_chu` |
| Số ngày thuê | `so_ngay_thue` |
| Hình ảnh | `hinh_anh` |
| Địa chỉ | `dia_chi` |
| Số điện thoại | `so_dien_thoai` |

---

## 7. Git Workflow

### 7.1 Branch naming

```
feature/<tên-tính-năng>    ví dụ: feature/them-trang-chi-tiet-san-pham
fix/<tên-bug>              ví dụ: fix/loi-gia-tien-coc-sai
docs/<tên-doc>             ví dụ: docs/cap-nhat-api-reference
chore/<tên-task>           ví dụ: chore/nang-cap-dependencies
```

### 7.2 Commit message

Dùng **Conventional Commits** (tiếng Anh hoặc tiếng Việt):

```
feat: thêm API tạo phiếu thuê với transaction
fix: sửa lỗi CORS không nhận request từ frontend
docs: cập nhật API reference trong deployment guide
refactor: tách pagination thành package riêng
chore: nâng cấp gin lên v1.10
style: format code backend theo gofmt
```
