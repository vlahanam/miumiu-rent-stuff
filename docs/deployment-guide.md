# Deployment Guide — MiuMiu Rent Stuff

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026

---

## 1. Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|------------|-------------------|
| Docker Engine | ≥ 24.0 |
| Docker Compose | ≥ 2.20 |
| RAM | ≥ 2 GB |
| Disk | ≥ 5 GB trống |
| OS | Linux (Ubuntu 22.04+ / Debian 12+ khuyến nghị) hoặc macOS |

> **Windows**: Dùng Docker Desktop ≥ 4.26 với WSL2 backend.

---

## 2. Khởi động nhanh (Development)

```bash
# 1. Clone repository
git clone <repo-url> miumiu-rent-stuff
cd miumiu-rent-stuff

# 2. Tạo file biến môi trường
cp .env.example .env

# 3. (Tuỳ chọn) Chỉnh sửa .env nếu cần
nano .env

# 4. Build và khởi động tất cả services
docker compose up --build -d

# 5. Kiểm tra trạng thái services
docker compose ps

# 6. Xem logs (theo dõi realtime)
docker compose logs -f

# 7. Kiểm tra health check backend
curl http://localhost/health
# → {"status":"ok"}
```

**Truy cập:**

| URL | Mô tả |
|-----|-------|
| `http://localhost` | Trang chủ Frontend |
| `http://localhost/items` | Danh sách sản phẩm |
| `http://localhost/api/v1/san-pham` | REST API Sản phẩm |
| `http://localhost/api/v1/khach-hang` | REST API Khách hàng |
| `http://localhost/api/v1/thue-do` | REST API Phiếu thuê |
| `http://localhost/health` | Health check Backend |

---

## 3. Dừng và dọn dẹp

```bash
# Dừng tất cả services (giữ lại volumes/data)
docker compose down

# Dừng và xóa toàn bộ volumes (MẤT DATA DATABASE)
docker compose down -v

# Dừng và xóa images đã build
docker compose down --rmi local

# Xóa toàn bộ (volumes + images + orphan containers)
docker compose down -v --rmi all --remove-orphans
```

---

## 4. Thao tác phổ biến khi phát triển

### 4.1 Xem logs từng service

```bash
# Tất cả services
docker compose logs -f

# Chỉ backend
docker compose logs -f backend

# Chỉ frontend
docker compose logs -f frontend

# Chỉ database
docker compose logs -f mysql

# 100 dòng cuối
docker compose logs --tail=100 backend
```

### 4.2 Truy cập shell trong container

```bash
# Backend (Go)
docker compose exec backend sh

# Frontend (Node.js)
docker compose exec frontend sh

# MySQL client
docker compose exec mysql mysql -u miumiu_user -pmiumiu_password miumiu_db
```

### 4.3 Thêm Go package mới

```bash
# Vào container backend
docker compose exec backend go get github.com/golang-jwt/jwt/v5

# Hoặc chạy trực tiếp từ host (cần Go được cài sẵn)
cd backend && go get github.com/golang-jwt/jwt/v5
```

### 4.4 Thêm Shadcn UI component mới

```bash
docker compose exec frontend npx shadcn@latest add <component-name>

# Ví dụ
docker compose exec frontend npx shadcn@latest add dialog
docker compose exec frontend npx shadcn@latest add input
docker compose exec frontend npx shadcn@latest add table
docker compose exec frontend npx shadcn@latest add form
```

### 4.5 Rebuild sau khi thay đổi Dockerfile hoặc go.mod/package.json

```bash
# Rebuild tất cả
docker compose up --build -d

# Rebuild chỉ backend
docker compose up --build -d backend

# Rebuild chỉ frontend
docker compose up --build -d frontend
```

### 4.6 Reset database (xóa toàn bộ data, chạy lại init.sql)

```bash
# Dừng và xóa volume mysql
docker compose down -v

# Khởi động lại (init.sql sẽ tự chạy lại)
docker compose up -d
```

---

## 5. API Reference

### 5.1 Sản phẩm — `/api/v1/san-pham`

#### `GET /api/v1/san-pham`

Lấy danh sách sản phẩm có phân trang.

**Query parameters:**

| Param | Type | Mô tả | Ví dụ |
|-------|------|-------|-------|
| `trang_thai` | integer | Lọc theo trạng thái (1/2/3) | `?trang_thai=1` |
| `page` | integer | Số trang (mặc định 1) | `?page=2` |
| `limit` | integer | Số bản ghi/trang (mặc định 20, tối đa 100) | `?limit=50` |

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "ma_san_pham": "VAY-001",
      "ten_san_pham": "Váy dạ hội đỏ",
      "slug": "vay-da-hoi-do",
      "hinh_anh": "https://example.com/image.jpg",
      "gia_goc_san_pham": 5000000,
      "gia_thue_ngay": 300000,
      "trang_thai": 1,
      "ngay_tao": "2026-11-24T09:00:00+07:00",
      "ngay_cap_nhat": "2026-11-24T09:00:00+07:00"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### `GET /api/v1/san-pham/:id`

```json
// Response 200
{ "data": { ...SanPham } }

// Response 404
{ "error": "Không tìm thấy sản phẩm" }
```

#### `POST /api/v1/san-pham`

**Request body:**
```json
{
  "ma_san_pham": "VAY-001",
  "ten_san_pham": "Váy dạ hội đỏ",
  "slug": "vay-da-hoi-do",
  "hinh_anh": "https://example.com/image.jpg",
  "gia_goc_san_pham": 5000000,
  "gia_thue_ngay": 300000,
  "trang_thai": 1
}
```

**Validation errors (422):**
```json
{
  "error": {
    "ma_san_pham": "Mã sản phẩm không được để trống",
    "gia_thue_ngay": "Giá thuê/ngày phải >= 0"
  }
}
```

#### `PUT /api/v1/san-pham/:id`

Partial update — chỉ gửi các field muốn thay đổi:
```json
{
  "trang_thai": 3,
  "gia_thue_ngay": 350000
}
```

#### `DELETE /api/v1/san-pham/:id`

```json
// Response 200
{ "message": "Xóa sản phẩm thành công" }
```

---

### 5.2 Khách hàng — `/api/v1/khach-hang`

#### `GET /api/v1/khach-hang`

**Query parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `search` | string | Tìm theo tên hoặc số điện thoại |
| `page` | integer | Số trang |
| `limit` | integer | Số bản ghi/trang |

**Response:** Tương tự format paginated.

#### `POST /api/v1/khach-hang`

```json
{
  "ten": "Nguyễn Thị Mai",
  "so_dien_thoai": "0901234567",
  "dia_chi": "123 Lê Lợi, Q1, TP.HCM"
}
```

---

### 5.3 Phiếu thuê — `/api/v1/thue-do`

#### `GET /api/v1/thue-do`

**Query parameters:**

| Param | Type | Mô tả |
|-------|------|-------|
| `trang_thai` | integer | Lọc theo trạng thái (1-5) |
| `khach_hang_id` | integer | Lọc theo khách hàng |
| `page` | integer | Số trang |
| `limit` | integer | Số bản ghi/trang |

Response đã preload `khach_hang` và `chi_tiet` (bao gồm `san_pham`).

#### `POST /api/v1/thue-do`

```json
{
  "ma_phieu_thue": "PT-20261124-001",
  "khach_hang_id": 1,
  "nguoi_dung_id": 1,
  "ngay_bat_dau": "2026-11-24T08:00:00Z",
  "ngay_hen_tra": "2026-11-26T18:00:00Z",
  "so_ngay_thue": 2,
  "tong_tien_thue": 600000,
  "loai_coc": 1,
  "tien_coc": 300000,
  "tien_phat": 0,
  "trang_thai": 1,
  "ghi_chu": "Khách mang về nhà",
  "chi_tiet": [
    {
      "san_pham_id": 1,
      "gia_thue_ngay": 300000,
      "tien_coc": 300000
    }
  ]
}
```

#### `PUT /api/v1/thue-do/:id`

Partial update. Thường dùng để cập nhật trạng thái:
```json
{
  "trang_thai": 3,
  "ngay_tra_thuc_te": "2026-11-26T10:30:00Z"
}
```

---

## 6. Triển khai Production

> [!WARNING]
> Cấu hình hiện tại dành cho **development**. Cần thực hiện các bước sau trước khi lên production.

### 6.1 Thay đổi bắt buộc

**1. Đổi mật khẩu trong `.env`:**
```bash
MYSQL_ROOT_PASSWORD=<strong-random-password>
MYSQL_PASSWORD=<strong-random-password>
```

**2. Tắt Gin debug mode:**
```bash
GIN_MODE=release
```

**3. Cập nhật `docker-compose.yml` cho backend — dùng production stage:**
```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
    target: production   # Thay "dev" thành "production"
```

**4. Cập nhật `docker-compose.yml` cho frontend — dùng production build:**

Thay đổi `frontend/Dockerfile` runner stage:
```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**5. Giới hạn CORS trong backend:**
```go
// Thay * bằng domain thực tế
c.Header("Access-Control-Allow-Origin", "https://yourdomain.com")
```

**6. Không expose cổng MySQL và Backend ra ngoài** (xóa `ports` của `mysql` và `backend` trong docker-compose production).

### 6.2 Checklist Production

- [ ] Đổi tất cả mật khẩu mặc định
- [ ] Cài SSL/TLS cho Nginx (Let's Encrypt / Cloudflare)
- [ ] Cấu hình domain trong `nginx/conf.d/default.conf`
- [ ] Tắt debug mode (GIN_MODE=release)
- [ ] Dùng production Docker targets
- [ ] Giới hạn CORS origin
- [ ] Thiết lập backup tự động cho MySQL volume
- [ ] Cài đặt log rotation
- [ ] Cấu hình firewall (chỉ mở port 80 và 443)
- [ ] Thêm xác thực người dùng (JWT) trước khi công khai

---

## 7. Troubleshooting

### Backend không khởi động được do chờ MySQL

**Triệu chứng:** Log backend hiện `Failed to connect to database`

**Nguyên nhân:** MySQL chưa sẵn sàng dù container đã start.

**Giải pháp:** Đây là bình thường khi khởi động lần đầu. Docker Compose đã cấu hình `depends_on: condition: service_healthy`. Nếu vẫn lỗi:
```bash
docker compose logs mysql  # Kiểm tra MySQL đã healthy chưa
docker compose restart backend
```

### Frontend không load được sản phẩm

**Triệu chứng:** Trang `/items` hiện "Không thể tải danh sách sản phẩm"

**Nguyên nhân:** `NEXT_PUBLIC_API_URL` sai hoặc backend chưa chạy.

**Kiểm tra:**
```bash
curl http://localhost/health
curl http://localhost/api/v1/san-pham
```

### MySQL volume bị corrupt

```bash
docker compose down -v  # Xóa volume
docker compose up -d    # Khởi động lại (init.sql chạy lại)
```

### Port 80 bị chiếm

```bash
# Kiểm tra process đang dùng port 80
sudo lsof -i :80
# Dừng process đó hoặc đổi port nginx trong docker-compose.yml
ports:
  - "8888:80"  # Map port ngoài thành 8888
```
