# System Architecture — MiuMiu Rent Stuff

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026

---

## 1. Kiến trúc tổng quan

MiuMiu Rent Stuff sử dụng kiến trúc **monolithic layered** được đóng gói bằng Docker Compose. Toàn bộ hệ thống chạy trên một máy chủ duy nhất với 4 container liên lạc qua một private Docker network.

```
┌──────────────────────────────────────────────────────────────┐
│                        HOST MACHINE                           │
│                                                               │
│   Browser ──:80──▶  ┌────────────┐                          │
│                      │   Nginx    │ (nginx:alpine)            │
│                      │  :80       │                          │
│                      └─────┬──────┘                          │
│               /api/* │     │ /                               │
│                       ▼     ▼                                 │
│            ┌──────────┐  ┌──────────┐                        │
│            │ Backend  │  │ Frontend │                         │
│            │ Go :8080 │  │ Next :3000│                       │
│            └────┬─────┘  └──────────┘                        │
│                 │                                             │
│            ┌────▼─────┐                                       │
│            │  MySQL   │                                       │
│            │  :3306   │                                       │
│            └──────────┘                                       │
│                                                               │
│         Network: miumiu_network (bridge)                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Các thành phần (Services)

### 2.1 Nginx — API Gateway

| Thuộc tính | Giá trị |
|-----------|---------|
| Image | `nginx:alpine` |
| Port ngoài | `:80` |
| Vai trò | Reverse proxy, định tuyến request |

**Routing rules:**

| Pattern | Upstream |
|---------|---------|
| `/api/*` | `backend:8080` |
| `/health` | `backend:8080` |
| `/` (tất cả còn lại) | `frontend:3000` |

Nginx là **single entry point** duy nhất từ internet. Frontend và Backend không được expose trực tiếp ra ngoài trong production (chỉ port 8080 và 3000 được map cho development).

### 2.2 Backend — Go / Gin

| Thuộc tính | Giá trị |
|-----------|---------|
| Runtime | Go 1.23 (Alpine) |
| Framework | Gin v1.10 |
| ORM | GORM v1.25 |
| Validation | ozzo-validation v4 |
| Port | `:8080` |
| Container name | `miumiu_backend` |

**Cấu trúc thư mục backend:**

```
backend/
├── cmd/
│   └── server/
│       └── main.go          ← Entrypoint: kết nối DB, khởi động server
└── internal/
    ├── common/
    │   └── pagination.go    ← Utility phân trang dùng chung
    ├── database/
    │   └── database.go      ← Khởi tạo kết nối MySQL qua GORM
    ├── handler/
    │   ├── san_pham_handler.go     ← CRUD sản phẩm
    │   ├── khach_hang_handler.go   ← CRUD khách hàng
    │   └── thue_do_handler.go      ← CRUD phiếu thuê
    ├── model/
    │   ├── san_pham.go      ← Model + Input structs + Validation
    │   ├── khach_hang.go    ← Model + Input structs + Validation
    │   └── thue_do.go       ← Model + Input structs + Validation
    └── router/
        └── router.go        ← Đăng ký tất cả routes + CORS middleware
```

**Layered architecture:**

```
Request ──▶ Router (Gin) ──▶ Handler ──▶ GORM ──▶ MySQL
                                │
                          Model Validation
                        (ozzo-validation)
```

### 2.3 Frontend — Next.js

| Thuộc tính | Giá trị |
|-----------|---------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI Components | Shadcn UI (Radix UI + CVA) |
| Node.js | v20 (Alpine) |
| Port | `:3000` |
| Container name | `miumiu_frontend` |

**Cấu trúc thư mục frontend:**

```
frontend/src/
├── app/
│   ├── layout.tsx           ← Root layout
│   ├── page.tsx             ← Trang chủ (/)
│   ├── globals.css          ← CSS toàn cục + Tailwind directives
│   └── items/
│       └── page.tsx         ← Danh sách sản phẩm (/items)
├── components/
│   └── ui/                  ← Shadcn UI components (badge, button, card)
├── lib/
│   ├── api.ts               ← Fetch wrappers gọi Backend API
│   └── utils.ts             ← cn() helper (tailwind-merge + clsx)
└── types/
    └── index.ts             ← TypeScript interfaces (Item, ApiResponse)
```

> **Lưu ý**: Frontend hiện đang dùng `Item` interface (cũ) nhưng backend đã đổi sang tên tiếng Việt (`SanPham`). Cần đồng bộ.

### 2.4 MySQL — Database

| Thuộc tính | Giá trị |
|-----------|---------|
| Image | `mysql:8.0` |
| Port | `:3306` |
| Database | `miumiu_db` |
| Charset | `utf8mb4`, collation `utf8mb4_unicode_ci` |
| Storage engine | InnoDB |
| Container name | `miumiu_mysql` |
| Init script | `database/init.sql` (auto-run khi khởi tạo lần đầu) |
| Data volume | `mysql_data` (persistent) |

---

## 3. Network & Security

```
internet
    │
   :80 (nginx)
    │
    └── miumiu_network (Docker bridge)
            ├── nginx        (không expose thêm port nào)
            ├── frontend:3000
            ├── backend:8080
            └── mysql:3306
```

- Tất cả services giao tiếp **nội bộ** qua hostname Docker (không qua IP).
- MySQL và Backend không thể truy cập từ internet mà không qua Nginx.
- CORS được cấu hình ở Backend với `Allow-Origin: *` (phù hợp môi trường dev).

---

## 4. Database Schema

```
┌─────────────────┐         ┌──────────────────────┐
│   nguoi_dung    │         │      thue_do          │
│─────────────────│         │──────────────────────│
│ id (PK)         │◀────────│ nguoi_dung_id (FK)   │
│ ten             │         │ id (PK)               │
│ email (unique)  │         │ ma_phieu_thue (unique)│
│ mat_khau        │         │ khach_hang_id (FK)    │
│ ngay_tao        │         │ ngay_bat_dau          │
│ ngay_cap_nhat   │         │ ngay_hen_tra          │
└─────────────────┘         │ so_ngay_thue          │
                             │ ngay_tra_thuc_te      │
┌─────────────────┐         │ tong_tien_thue        │
│   khach_hang    │         │ loai_coc              │
│─────────────────│         │ tien_coc              │
│ id (PK)         │◀────────│ tien_phat             │
│ ten             │         │ trang_thai            │
│ so_dien_thoai   │         │ ghi_chu               │
│   (unique)      │         │ ngay_tao              │
│ dia_chi         │         │ ngay_cap_nhat         │
│ ngay_tao        │         └──────────┬────────────┘
│ ngay_cap_nhat   │                    │ 1
└─────────────────┘                    │
                                       │ N
                            ┌──────────▼────────────┐
┌─────────────────┐         │  chi_tiet_thue_do     │
│    san_pham     │         │───────────────────────│
│─────────────────│         │ id (PK)               │
│ id (PK)         │◀────────│ san_pham_id (FK)      │
│ ma_san_pham     │         │ thue_do_id (FK)       │
│   (unique)      │         │ gia_thue_ngay          │
│ ten_san_pham    │         │ tien_coc               │
│ slug (unique)   │         └───────────────────────┘
│ hinh_anh        │
│ gia_goc_san_pham│         ┌─────────────────┐
│ gia_thue_ngay   │         │    cai_dat      │
│ trang_thai      │         │─────────────────│
│ ngay_tao        │         │ id (PK)         │
│ ngay_cap_nhat   │         │ khoa (unique)   │
└─────────────────┘         │ gia_tri         │
                             │ kieu_du_lieu    │
                             │ mo_ta           │
                             └─────────────────┘
```

**Quan hệ:**
- `thue_do` → `khach_hang`: N:1 (RESTRICT delete)
- `thue_do` → `nguoi_dung`: N:1 (RESTRICT delete)
- `chi_tiet_thue_do` → `thue_do`: N:1 (CASCADE delete)
- `chi_tiet_thue_do` → `san_pham`: N:1 (RESTRICT delete)

---

## 5. API Architecture

### Request Flow

```
Client
  │
  ▼ HTTP Request
Nginx (port 80)
  │  proxy_pass /api/* → backend:8080
  ▼
Gin Router
  │  Route matching + CORS middleware
  ▼
Handler (SanPhamHandler / KhachHangHandler / ThueDoHandler)
  │  ShouldBindJSON → Validate()
  ▼
GORM Query
  │
  ▼
MySQL
  │
  ▼
JSON Response
```

### Response Format

**Danh sách (paginated):**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**Chi tiết / Tạo / Cập nhật:**
```json
{
  "data": { ... }
}
```

**Xóa thành công:**
```json
{
  "message": "Xóa ... thành công"
}
```

**Lỗi:**
```json
{
  "error": "Mô tả lỗi hoặc object validation errors"
}
```

---

## 6. Docker Compose Services Overview

| Service | Image / Build | Restart | Health check |
|---------|--------------|---------|-------------|
| `mysql` | `mysql:8.0` | `unless-stopped` | `mysqladmin ping` mỗi 10s |
| `backend` | Build từ `./backend` (target: `dev`) | `unless-stopped` | Phụ thuộc mysql healthy |
| `frontend` | Build từ `./frontend` (target: `runner`) | `unless-stopped` | — |
| `nginx` | `nginx:alpine` | `unless-stopped` | — |

**Volumes:**

| Volume | Dữ liệu |
|--------|---------|
| `mysql_data` | Data MySQL (persistent) |
| `go_pkg_cache` | Go module cache |
| `frontend_node_modules` | Node modules |
| `frontend_next_cache` | Next.js build cache |

---

## 7. Luồng khởi động (Startup Sequence)

```
docker compose up --build
        │
        ├─ 1. mysql starts
        │       └─ Chạy database/init.sql (tạo bảng + seed cai_dat)
        │       └─ Health check: mysqladmin ping
        │
        ├─ 2. backend starts (depends_on: mysql healthy)
        │       └─ GORM connects to MySQL (10 retries implicit)
        │       └─ Gin server lắng nghe :8080
        │
        ├─ 3. frontend starts
        │       └─ npm run dev → Next.js :3000
        │
        └─ 4. nginx starts (depends_on: backend, frontend)
                └─ Lắng nghe :80, proxy đến backend & frontend
```

---

## 8. Môi trường biến

| Biến | Service | Mô tả | Mặc định |
|------|---------|-------|---------|
| `MYSQL_ROOT_PASSWORD` | mysql | Root password | `rootpassword` |
| `MYSQL_DATABASE` | mysql | Tên database | `miumiu_db` |
| `MYSQL_USER` | mysql | App user | `miumiu_user` |
| `MYSQL_PASSWORD` | mysql | App password | `miumiu_password` |
| `DB_HOST` | backend | MySQL hostname | `mysql` |
| `DB_PORT` | backend | MySQL port | `3306` |
| `DB_USER` | backend | DB user | `miumiu_user` |
| `DB_PASSWORD` | backend | DB password | `miumiu_password` |
| `DB_NAME` | backend | DB name | `miumiu_db` |
| `APP_PORT` | backend | Backend listen port | `8080` |
| `GIN_MODE` | backend | `debug` hoặc `release` | `debug` |
| `NEXT_PUBLIC_API_URL` | frontend | URL API công khai | `http://localhost/api` |
