# MiuMiu Rent Stuff — Hướng dẫn cho AI Agent

Web quản lý tiệm cho thuê áo dài và phụ kiện **MiuMiu** dành cho chủ tiệm và nhân viên (mọi tài khoản có quyền ngang nhau), thiết kế **mobile-first** để thao tác nhanh tại quầy và dùng được trên desktop.

---

## 1. Quy tắc bắt buộc

1. **Nghiệp vụ chuẩn:** Luôn đọc `docs/business-requirements.md` trước khi thiết kế hoặc viết code.
2. **Database bất biến:** Schema nằm tại `database/init.sql` (`miumiu_db`, MySQL 8.0). **KHÔNG được sửa schema** hay thêm/bớt bảng, cột, ràng buộc. Mọi tính năng phải chạy trên 6 bảng hiện có.
3. **Giữ kiến trúc hiện có:**
   - Backend Go (`backend/`): giữ cấu trúc phân lớp `handler / service / model / router / middleware / hub / common / config / database`.
   - Frontend Next.js (`frontend/`): dùng App Router (`src/app/`), TypeScript strict, Tailwind CSS theo hệ thiết kế **Aodai Atelier Rental** (`demo-frontend/aodai_design/DESIGN.md`).
4. **Đặt tên tiếng Việt không dấu:** Thống nhất tiếng Việt cho bảng, cột DB, JSON fields, Go struct/file, và API paths (`/api/v1/san-pham`, `/api/v1/khach-hang`, `/api/v1/thue-do`, `/api/v1/cai-dat`, `/api/v1/bao-cao`, `/api/v1/dashboard`).
5. **Nguồn sự thật (Source of Truth):** Các tài liệu `README.md`, `docs/codebase-summary.md`, `docs/system-architecture.md`, `docs/project-overview-pdr.md`, `docs/project-roadmap.md`, `docs/design-guidelines.md` đã cũ so với code hiện tại. Khi có mâu thuẫn, luôn ưu tiên **mã nguồn thực tế + `docs/business-requirements.md` + `demo-frontend/aodai_design/DESIGN.md`**.

---

## 2. Kiến trúc hệ thống & Cấu trúc thư mục

Hệ thống chạy bằng Docker Compose gồm 4 container trên bridge network `miumiu_network`:

```text
Browser ──▶ Nginx (:80, nginx/conf.d/default.conf)
              ├── /api/* , /health ──▶ Backend Go/Gin (:8080, hỗ trợ WebSocket upgrade)
              └── /*               ──▶ Frontend Next.js (:3000)
Backend ──▶ MySQL 8.0 (:3306, database: miumiu_db)
```

*Lưu ý Nginx:* `nginx/conf.d/default.conf` dùng Docker DNS nội bộ (`resolver 127.0.0.11`) và biến `$backend_upstream` / `$frontend_upstream` để tránh lỗi khởi động khi upstream chưa sẵn sàng.

```text
miumiu-rent-stuff/
├── docker-compose.yml          # 4 services: mysql, backend (target: dev), frontend (target: runner), nginx
├── .env.example                # Mẫu biến môi trường (DB_*, APP_PORT, GIN_MODE, JWT_SECRET, NEXT_PUBLIC_API_URL)
├── database/init.sql           # DDL 6 bảng + seed cai_dat (KHÔNG SỬA SCHEMA)
├── nginx/                      # nginx.conf + conf.d/default.conf
├── docs/                        # Nghiệp vụ chuẩn: docs/business-requirements.md (các file khác đa phần đã cũ)
├── plans/implementation-plan.md # Kế hoạch triển khai backend 7 giai đoạn (đã implement gần như toàn bộ)
├── demo-frontend/              # Bản thiết kế tham khảo: aodai_design/DESIGN.md + HTML/screenshot từng màn hình
├── backend/                    # Go 1.26, module `miumiu-rent-stuff`
│   ├── Dockerfile              # Multi-stage: dev / builder / production (golang:1.26-alpine)
│   ├── cmd/server/main.go      # Entrypoint: load config, connect DB, WS hub, cron quá hạn 1h, Gin server
│   └── internal/
│       ├── config/             # Đọc biến môi trường (APP_PORT, GIN_MODE, JWT_SECRET, JWT_EXPIRY_HOURS, DB_*)
│       ├── database/           # Kết nối MySQL qua GORM (utf8mb4, parseTime=True, loc=Local)
│       ├── common/             # pagination.go (ParseParams, Paginate) + response.go (OK, Created, BadRequest...)
│       ├── middleware/         # auth.go (Bearer JWT AuthRequired, GetUserID) + request_id.go (X-Request-ID)
│       ├── hub/                # WebSocket broadcast hub (JSON: {"loai": "...", "data": ...})
│       ├── model/              # GORM models + Input structs + ozzo-validation (san_pham, khach_hang, nguoi_dung, thue_do, cai_dat)
│       ├── service/            # slug_service, ma_phieu_service, thue_do_service, bao_cao_service
│       ├── handler/            # auth, san_pham, khach_hang, thue_do, cai_dat, dashboard, bao_cao, ws
│       └── router/             # router.go: đăng ký middleware toàn cục (RequestID, CORS) và toàn bộ routes
└── frontend/                   # Next.js 15.0.3 (App Router, standalone output), React 18, TS 5, Tailwind 3.4
    ├── Dockerfile              # Multi-stage: deps / builder / runner (node:20-alpine, dev server)
    └── src/
        ├── app/                # /, /don-thue, /don-thue/tao-moi, /san-pham, /khach-hang, /cai-dat, /items (legacy)
        ├── components/         # TopBar, BottomNav, AddButton + ui/{badge,button,card} (Shadcn UI)
        ├── lib/                # api.ts (legacy /v1/items), utils.ts (cn)
        └── types/              # index.ts (legacy Item interface)
```

---

## 3. Database & Quy tắc nghiệp vụ cốt lõi

### 3.1 Các bảng & Giá trị trạng thái (`TINYINT`)

| Bảng | Mục đích & Ràng buộc quan trọng |
|---|---|
| `san_pham` | Sản phẩm cho thuê (mỗi SP là duy nhất, SL = 1). Unique: `ma_san_pham` (≤30), `slug` (≤255). Fulltext: `ten_san_pham`. |
| `nguoi_dung` | Tài khoản chủ tiệm/nhân viên. Unique: `email`. Mật khẩu lưu dạng bcrypt hash. Không có API đăng ký (tạo trực tiếp trong DB). |
| `khach_hang` | Khách thuê. Unique: `so_dien_thoai` (≤20, chỉ chữ số). |
| `thue_do` | Phiếu thuê. Unique: `ma_phieu_thue` (tự sinh dạng `DT-0001`). FK `RESTRICT` tới `khach_hang`, `nguoi_dung`. Check `ngay_hen_tra >= ngay_bat_dau`. |
| `chi_tiet_thue_do` | Chi tiết nhiều SP trong 1 phiếu. Unique `(thue_do_id, san_pham_id)`. FK `CASCADE` tới `thue_do`, `RESTRICT` tới `san_pham`. Lưu snapshot `gia_thue_ngay` và `tien_coc`. |
| `cai_dat` | Key-value cấu hình. Unique: `khoa`. Seed mặc định: `pham_tram_gia_coc` = `85` (số), `so_dien_thoai_lien_he` = `0365193713` (chuỗi). |

| Cột | Giá trị |
|---|---|
| `san_pham.trang_thai` | `1` = Trống lịch · `2` = Đã cho thuê · `3` = Đang bảo dưỡng |
| `thue_do.trang_thai` | `1` = Chờ xác nhận · `2` = Đang thuê · `3` = Đã trả · `4` = Quá hạn · `5` = Đã hủy |
| `thue_do.loai_coc` | `1` = Tiền mặt · `2` = Chuyển khoản · `3` = CCCD (`tien_coc = 0`) |
| `cai_dat.kieu_du_lieu` | `1` = Chuỗi · `2` = Số · `3` = Boolean · `4` = JSON |

### 3.2 Invariants nghiệp vụ bắt buộc phải giữ

- **Không xóa dữ liệu đã phát sinh giao dịch:** Không có cột soft-delete; không được xóa sản phẩm/khách hàng/nhân viên đã có phiếu thuê (`409 Conflict`). Muốn ngừng cho thuê sản phẩm thì chuyển sang `Đang bảo dưỡng (3)`.
- **Không xóa phiếu thuê:** Không tạo endpoint `DELETE /api/v1/thue-do/:id`; chỉ hỗ trợ hủy (`POST /:id/huy`) cho phiếu `Chờ xác nhận (1)` hoặc `Đang thuê (2)`. Phiếu `Đã trả (3)` và `Đã hủy (5)` chỉ xem, không sửa.
- **Quy tắc sản phẩm:** Slug tự sinh không trùng từ `ten_san_pham` (không nhận từ client); không cho sửa `ma_san_pham` (SKU) nếu sản phẩm đã từng nằm trong phiếu; không cho chuyển từ `Đã cho thuê (2)` sang `Đang bảo dưỡng (3)`; không cho chọn sản phẩm `Đang bảo dưỡng (3)` khi lập phiếu.
- **Trùng lịch thuê:** Một sản phẩm không thể thuộc 2 phiếu có trạng thái `IN (1, 2, 4)` với khoảng `[ngay_bat_dau, ngay_hen_tra]` giao nhau (`newStart < existingEnd && newEnd > existingStart`).
- **Tính tiền & cọc:**
  - `tong_tien_thue = SUM(chi_tiet.gia_thue_ngay) * so_ngay_thue` (snapshot giá lúc tạo phiếu).
  - Tiền cọc gợi ý mỗi SP = `gia_goc_san_pham * pham_tram_gia_coc / 100`. Nếu `loai_coc = 3` (CCCD) → `tien_coc = 0`.
  - Hoàn cọc khi trả = `tien_coc - tien_phat` (nếu âm → khách cần trả thêm).
  - Doanh thu = `tong_tien_thue + tien_phat` của các phiếu `Đã trả (3)` tính theo `ngay_tra_thuc_te` (không tính tiền cọc).
  - `so_lan_thue` không có cột riêng — luôn đếm động từ phiếu `trang_thai = 3`.
- **Luồng trạng thái phiếu:**
  - Tạo mới: `ngay_bat_dau <= now` → `Đang thuê (2)` và SP sang `Đã cho thuê (2)`; ngày tương lai → `Chờ xác nhận (1)` (SP giữ nguyên).
  - Giao đồ (`1 → 2`): chuyển các SP sang `2`.
  - Trả đồ (`2 | 4 → 3`): ghi `ngay_tra_thuc_te`, `tien_phat`, chuyển từng SP về `1` hoặc `3` theo lựa chọn.
  - Hủy phiếu (`1 | 2 → 5`): bắt buộc có lý do (`ghi_chu`), nếu đã giao (`2`) thì trả SP về `1`.
  - Sửa phiếu: `Chờ xác nhận (1)` sửa tự do (replace toàn bộ `chi_tiet` trong 1 transaction); `Đang thuê (2)` / `Quá hạn (4)` chỉ sửa `so_ngay_thue`, `tien_phat`, `ghi_chu`.
  - Quá hạn (`2 → 4`): tự động cập nhật khi truy vấn (`GetAll`, `GetByID`, `GetDashboard`) và bởi goroutine nền mỗi 1 giờ trong `cmd/server/main.go`.

---

## 4. Backend (`backend/`) — API & Quy ước lập trình

### 4.1 Tech stack
Go `1.26`, Gin `v1.10`, GORM `v1.25` + MySQL driver, `ozzo-validation/v4`, `shopspring/decimal`, `golang-jwt/jwt/v5`, `gorilla/websocket`, `gosimple/slug`, `xuri/excelize/v2`, `golang.org/x/crypto/bcrypt`.

### 4.2 Danh sách API hiện có (`internal/router/router.go`)

- **Public:**
  - `GET /health`
  - `POST /api/v1/auth/login` → trả `{ "data": { "token", "nguoi_dung" } }`
- **Protected** (bắt buộc header `Authorization: Bearer <JWT>` qua `middleware.AuthRequired()`):
  - **Auth:** `GET /api/v1/auth/me`, `PUT /api/v1/auth/me`
  - **Sản phẩm:** `GET /api/v1/san-pham` (`search`, `trang_thai`, `sort=gia_asc|gia_desc`, `page`, `limit`), `GET /api/v1/san-pham/:id` (kèm `so_lan_thue`, `tong_doanh_thu`, `da_thu_hoi_von`, `lich_su_thue`), `POST /api/v1/san-pham`, `PUT /api/v1/san-pham/:id`, `DELETE /api/v1/san-pham/:id`, `PATCH /api/v1/san-pham/:id/trang-thai`
  - **Khách hàng:** `GET /api/v1/khach-hang` (`search`, `page`, `limit`), `GET /api/v1/khach-hang/:id` (kèm `so_lan_thue`, `dang_thue`, `lich_su`), `POST /api/v1/khach-hang`, `POST /api/v1/khach-hang/tim-theo-sdt` (tìm hoặc tạo mới theo SĐT), `PUT /api/v1/khach-hang/:id`, `DELETE /api/v1/khach-hang/:id`
  - **Phiếu thuê:** `GET /api/v1/thue-do` (`trang_thai`, `khach_hang_id`, `search`, `page`, `limit`; mặc định sort ưu tiên `4 → 2 → 1 → 3/5`), `GET /api/v1/thue-do/:id`, `POST /api/v1/thue-do`, `PUT /api/v1/thue-do/:id`, `POST /api/v1/thue-do/:id/giao-do`, `POST /api/v1/thue-do/:id/tra-do` (trả thêm `xu_ly_coc`), `POST /api/v1/thue-do/:id/huy`
  - **Cài đặt:** `GET /api/v1/cai-dat`, `PUT /api/v1/cai-dat/:khoa`
  - **Tổng quan:** `GET /api/v1/dashboard`
  - **Báo cáo:** `GET /api/v1/bao-cao/{doanh-thu,phieu-thue,hieu-qua-san-pham,khach-hang}`, `GET /api/v1/bao-cao/xuat-excel?loai=...` (`doanh_thu|san_pham|khach_hang|phieu_thue`), `GET /api/v1/bao-cao/xuat-csv?loai=...` (`san_pham|khach_hang|phieu_thue`, mặc định `phieu_thue`)
  - **WebSocket:** `GET /api/v1/ws` — broadcast event `phieu_moi`, `phieu_cap_nhat`, `phieu_qua_han`.

### 4.3 Quy ước code Backend

- **Response thống nhất:** Dùng `internal/common/response.go` (`OK`, `Created`, `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `ValidationError`, `InternalError`) và `common.Paginate` (default `page=1`, `limit=20`, max `100`).
- **Luồng Handler:** `ShouldBindJSON` (`400`) → `input.Validate()` bằng `ozzo-validation` (`422`) → gọi Service/DB → trả response.
- **Tiền tệ:** Luôn dùng `decimal.Decimal` (`shopspring/decimal`) trong GORM model và tính toán nghiệp vụ (lưu ý `decimal.Decimal` serialize ra JSON dạng **string** mặc định, còn một vài truy vấn tổng hợp raw SQL ở `DashboardHandler` / `SanPhamHandler.GetByID` hiện trả `float64`).
- **Partial update:** Luôn build `map[string]interface{}` khi gọi `db.Model(&entity).Updates(updates)` để tránh GORM bỏ qua zero values (`0`, `""`, `false`).
- **Transaction:** Mọi thao tác liên quan nhiều bảng (`thue_do`, `chi_tiet_thue_do`, `san_pham.trang_thai`) bắt buộc bọc trong `db.Transaction`.
- **Lỗi DB:** Phân biệt `errors.Is(err, gorm.ErrRecordNotFound)` (`404`) với lỗi khác (`500`).

---

## 5. Frontend (`frontend/`) — Giao diện & Hiện trạng tích hợp

### 5.1 Tech stack & Design System
- Next.js `15.0.3` (App Router, `output: 'standalone'`), React `18`, TypeScript `5` (`strict: true`, alias `@/*` → `./src/*`), Tailwind CSS `3.4`, Shadcn UI (`src/components/ui/`), `lucide-react`.
- **Hệ thiết kế hiện hành (`demo-frontend/aodai_design/DESIGN.md` & `frontend/tailwind.config.ts`):**
  - Mobile-first, Material 3 tông **mận chín burgundy** (`primary: #4f0929`, `primary-container: #6b213f`), nền ấm `surface: #fff8f8`, nhấn champagne (`secondary: #7d571e`), ngọc bích (`tertiary: #002c24` / `tertiary-container: #18433a`), cảnh báo đỏ (`error: #ba1a1a`).
  - Font **Plus Jakarta Sans** (`font-headline-*`, `font-title-sm`, `font-body-*`, `font-label-*`, `font-currency-lg`), icon **Material Symbols Outlined** (`material-symbols-outlined`).
  - Tiền hiển thị định dạng Việt Nam (ví dụ `1.200.000đ`), ngày giờ định dạng Việt Nam (`dd/mm/yyyy`).
  - Khung màn hình chung: `TopBar` (`h-14`), `BottomNav` (`h-16`, 5 tab: Tổng quan `/`, Đơn thuê `/don-thue`, Sản phẩm `/san-pham`, Khách hàng `/khach-hang`, Cài đặt `/cai-dat`), `AddButton` FAB → `/don-thue/tao-moi`.

### 5.2 Hiện trạng Frontend (rất quan trọng khi làm việc với `frontend/`)
- **Các màn hình đã dựng UI nhưng đang dùng dữ liệu giả tĩnh (mock data), CHƯA nối Backend API:**
  - `/`, `/don-thue`, `/don-thue/tao-moi`, `/san-pham`, `/khach-hang`, `/cai-dat`.
- **Chưa có:** trang đăng nhập (`/login`) và quản lý JWT token; các route chi tiết/thêm mới đang được link sẵn trong UI (`/don-thue/[id]`, `/san-pham/[id]`, `/san-pham/them-moi`).
- **Code legacy chưa cập nhật:** `src/app/items/page.tsx`, `src/lib/api.ts`, `src/types/index.ts` vẫn dùng interface tiếng Anh `Item` và gọi `/api/v1/items` (endpoint đã bị bỏ). Khi nối API thật, hãy cập nhật `src/types/index.ts` và `src/lib/api.ts` khớp 100% với JSON tiếng Việt của backend và gửi kèm `Authorization: Bearer <token>`.

---

## 6. Lưu ý kỹ thuật & Điểm cần cẩn trọng (Known Quirks)

- **Chưa có automated tests:** Cả `backend/` (`*_test.go`) và `frontend/` hiện chưa có unit/integration test. Khi thêm logic quan trọng (đặc biệt `service/thue_do_service.go`, `slug_service.go`, `ma_phieu_service.go`, auth), nên viết kèm unit test.
- **Cấu hình JWT chưa đồng bộ hoàn toàn:** `internal/config/config.go` có đọc `JWT_SECRET` và `JWT_EXPIRY_HOURS`, nhưng `middleware/auth.go` và `handler/auth_handler.go` đang tự gọi `os.Getenv("JWT_SECRET")` (fallback chuỗi dev mặc định) và `generateJWT` đang hardcode `expiryHours := 24`. Ngoài ra `docker-compose.yml` hiện chưa truyền biến `JWT_SECRET` vào container `backend`.
- **WebSocket & Auth:** `GET /api/v1/ws` nằm trong nhóm `protected` (`AuthRequired`), yêu cầu `Authorization` header. Trình duyệt `new WebSocket()` không hỗ trợ gửi custom header này — khi tích hợp WebSocket ở frontend cần xử lý xác thực qua query token hoặc cookie tương ứng ở backend.
- **Khác biệt công thức doanh thu theo sản phẩm:** `SanPhamHandler.GetByID` cộng toàn bộ `tong_tien_thue + tien_phat` của các phiếu chứa sản phẩm, còn `BaoCaoService.GetHieuQuaSanPham` chia đều doanh thu phiếu cho số sản phẩm trong phiếu. Cần lưu ý thống nhất nếu sửa phần báo cáo/chi tiết sản phẩm.
- **Định dạng mã phiếu trong UI mock vs Backend:** UI mock hiện hiển thị mã phiếu dạng `MIU-0001`, trong khi backend (`ma_phieu_service.go`) và nghiệp vụ chuẩn sinh mã phiếu dạng `DT-0001` (còn mã sản phẩm dạng `MiuMiu-001`).
- **`database/init.sql` dòng cuối:** Câu `INSERT INTO cai_dat` hiện kết thúc bằng dấu `,` ở dòng 132 — không tự ý sửa nếu không có yêu cầu.
- **`go.mod` & thư mục build tạm:** Một số direct dependencies trong `backend/go.mod` đang nằm ở block `// indirect` (chạy `go mod tidy` khi cập nhật dependency). Tránh commit thêm file build tạm vào `frontend/tmp/` hoặc `frontend/tsconfig.tsbuildinfo`.

---

## 7. Lệnh phát triển & Kiểm tra

```bash
# Chạy toàn bộ stack bằng Docker Compose
cp .env.example .env
docker compose up --build -d
docker compose logs -f
curl http://localhost/health

# Kiểm tra Backend (Go)
cd backend && go build ./... && go vet ./... && go test ./...

# Kiểm tra Frontend (Next.js)
cd frontend && npm run lint && npm run build

# Thêm Shadcn UI component / Go package
docker compose exec frontend npx shadcn@latest add <component-name>
cd backend && go get <package-name> && go mod tidy
```
