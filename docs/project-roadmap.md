# Project Roadmap — MiuMiu Rent Stuff

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026  
> **Trạng thái hiện tại:** MVP Phase 1 (đang phát triển)

---

## Tổng quan tiến độ

```
Phase 1 (MVP)       ████████████░░░░  75%  ← Đang ở đây
Phase 2 (Core)      ░░░░░░░░░░░░░░░░   0%
Phase 3 (Growth)    ░░░░░░░░░░░░░░░░   0%
Phase 4 (Scale)     ░░░░░░░░░░░░░░░░   0%
```

---

## Phase 1 — MVP (Hiện tại)

**Mục tiêu:** Hệ thống quản lý nội bộ cơ bản cho nhân viên cửa hàng.

### ✅ Đã hoàn thành

- [x] Kiến trúc Docker Compose 4-service (Nginx, Backend Go, Frontend Next.js, MySQL)
- [x] Database schema: `san_pham`, `nguoi_dung`, `khach_hang`, `thue_do`, `chi_tiet_thue_do`, `cai_dat`
- [x] REST API CRUD: Sản phẩm (`/api/v1/san-pham`)
- [x] REST API CRUD: Khách hàng (`/api/v1/khach-hang`)
- [x] REST API CRUD: Phiếu thuê (`/api/v1/thue-do`) với transaction
- [x] Pagination chuẩn hóa (page, limit, total)
- [x] Validation input (ozzo-validation)
- [x] Trang chủ frontend (landing page)
- [x] Trang danh sách sản phẩm (`/items`)
- [x] Shadcn UI component system (Badge, Button, Card)
- [x] CORS middleware
- [x] Health check endpoint
- [x] Tài liệu dự án (`/docs`)

### 🔧 Cần hoàn thiện trong Phase 1

- [ ] **Đồng bộ Frontend ↔ Backend**: Cập nhật `src/types/index.ts` và `src/lib/api.ts` sang tên tiếng Việt khớp với API backend (`SanPham` thay vì `Item`, endpoint `/san-pham` thay vì `/items`)
- [ ] **Seed data demo**: Thêm dữ liệu mẫu vào `database/init.sql` cho sản phẩm và khách hàng
- [ ] **Trang chi tiết sản phẩm**: Route `/items/:id`
- [ ] **Hot reload backend**: Tích hợp `air` hoặc `watchexec` cho Go hot-reload trong dev mode

---

## Phase 2 — Core Features

**Mục tiêu:** Hệ thống đầy đủ tính năng cho vận hành hàng ngày.

**Ước tính:** 4-6 tuần sau Phase 1.

### 2.1 Xác thực & Phân quyền

- [ ] Đăng nhập nhân viên (email + password)
- [ ] JWT access token + refresh token
- [ ] Middleware bảo vệ API (tất cả write endpoints yêu cầu auth)
- [ ] Phân quyền: Admin / Nhân viên
- [ ] Trang đăng nhập frontend
- [ ] Lưu token trong cookie (httpOnly)

### 2.2 Quản lý sản phẩm nâng cao

- [ ] Upload ảnh sản phẩm (local storage hoặc Cloudinary)
- [ ] Tìm kiếm full-text sản phẩm theo tên
- [ ] Lọc sản phẩm theo giá (từ-đến)
- [ ] Trang chi tiết sản phẩm `/san-pham/:slug`
- [ ] Lịch sử thuê của từng sản phẩm

### 2.3 Quản lý phiếu thuê nâng cao

- [ ] Giao diện lập phiếu thuê (form đa bước)
- [ ] Chọn sản phẩm trong phiếu (chỉ hiện sản phẩm trống lịch)
- [ ] Tự động tính tổng tiền thuê (`số ngày × giá thuê/ngày`)
- [ ] Tự động tính tiền cọc (`giá gốc × % cọc từ cai_dat`)
- [ ] Cập nhật `trang_thai` sản phẩm khi lập/đóng phiếu thuê
- [ ] In phiếu thuê (PDF / print CSS)
- [ ] Lịch trả hàng (calendar view)

### 2.4 Quản lý khách hàng nâng cao

- [ ] Lịch sử thuê của từng khách hàng
- [ ] Thống kê tổng chi tiêu của khách
- [ ] Tìm kiếm khách hàng nhanh (autocomplete trong form phiếu thuê)

### 2.5 Thông báo nhắc nhở

- [ ] API endpoint kiểm tra phiếu quá hạn (`trang_thai = 4`)
- [ ] Nhắc nhở trả hàng qua SMS (Twilio / ESMS) hoặc Email
- [ ] Cron job tự động cập nhật trạng thái phiếu quá hạn

---

## Phase 3 — Growth

**Mục tiêu:** Mở rộng kênh bán và tối ưu vận hành.

**Ước tính:** 2-3 tháng sau Phase 2.

### 3.1 Dashboard thống kê

- [ ] Tổng doanh thu theo ngày / tuần / tháng
- [ ] Sản phẩm được thuê nhiều nhất
- [ ] Khách hàng VIP (tổng chi tiêu cao nhất)
- [ ] Tỉ lệ sản phẩm theo trạng thái (biểu đồ tròn)
- [ ] Phiếu sắp đến hạn trả
- [ ] Export báo cáo Excel / CSV

### 3.2 Đặt thuê online (Customer Portal)

- [ ] Trang catalog công khai cho khách xem sản phẩm
- [ ] Form đặt thuê online (khách tự đặt)
- [ ] Khách nhận email xác nhận đặt thuê
- [ ] Nhân viên duyệt đơn từ dashboard
- [ ] Trạng thái đơn hàng cho khách theo dõi

### 3.3 Quản lý cài đặt (UI)

- [ ] Giao diện quản lý `cai_dat` (thay vì sửa DB trực tiếp)
- [ ] Cài đặt: phần trăm cọc, SĐT liên hệ, tên cửa hàng, phí phạt trễ hạn/ngày

### 3.4 Quản lý nhân viên

- [ ] CRUD nhân viên (`nguoi_dung`) với giao diện
- [ ] Lịch sử hoạt động của nhân viên
- [ ] Phân quyền chi tiết theo module

---

## Phase 4 — Scale

**Mục tiêu:** Hỗ trợ nhiều chi nhánh, hiệu suất cao.

**Ước tính:** Dài hạn (6+ tháng sau Phase 3).

### 4.1 Multi-branch

- [ ] Hỗ trợ nhiều chi nhánh cửa hàng
- [ ] Chuyển sản phẩm giữa chi nhánh
- [ ] Báo cáo tổng hợp theo chi nhánh

### 4.2 Hiệu suất & Độ tin cậy

- [ ] Thêm Redis cache cho API list (giảm tải MySQL)
- [ ] Migrate sang kiến trúc production: Backend `release` mode, Frontend `standalone` build
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring (Prometheus + Grafana hoặc Datadog)
- [ ] Log aggregation (ELK Stack hoặc Loki)
- [ ] Database backup tự động (cron + S3)

### 4.3 Mobile App

- [ ] React Native hoặc Flutter app cho nhân viên
- [ ] Quét QR code để tra cứu sản phẩm
- [ ] Nhận notification khi có phiếu mới / quá hạn

---

## Bugs và Technical Debt cần giải quyết

| ID | Vấn đề | Mức độ | Phase |
|----|--------|-------|-------|
| TD-01 | Frontend `types/index.ts` dùng interface `Item` (en) nhưng backend trả `SanPham` (vi) | 🔴 Cao | Phase 1 |
| TD-02 | `lib/api.ts` gọi `/v1/items` nhưng backend expose `/v1/san-pham` | 🔴 Cao | Phase 1 |
| TD-03 | Backend chạy `go run` trong dev, không có hot-reload | 🟡 Trung bình | Phase 1 |
| TD-04 | CORS cho phép `*` (tất cả origins) | 🟡 Trung bình | Phase 2 |
| TD-05 | Không có unit tests / integration tests | 🟡 Trung bình | Phase 2 |
| TD-06 | Frontend chạy `npm run dev` trong Docker (chậm, không tối ưu) | 🟡 Trung bình | Phase 2 |
| TD-07 | Bảng `nguoi_dung` tồn tại nhưng chưa có API CRUD | 🟢 Thấp | Phase 2 |
| TD-08 | Không có API endpoint lọc sản phẩm theo giá | 🟢 Thấp | Phase 2 |
| TD-09 | `trang_thai` sản phẩm không tự động cập nhật khi tạo/đóng phiếu thuê | 🟡 Trung bình | Phase 2 |

---

## Phụ thuộc kỹ thuật cần theo dõi

| Thư viện | Phiên bản hiện tại | Phiên bản mới nhất | Ghi chú |
|---------|-------------------|-------------------|---------|
| Go | 1.23 | 1.23.x | Ổn định |
| Gin | 1.10.0 | — | Ổn định |
| GORM | 1.25.12 | — | Ổn định |
| Next.js | 15.0.3 | — | App Router, ổn định |
| React | 18.3.1 | — | Ổn định |
| Tailwind CSS | 3.4.15 | — | v4 đang beta |
| MySQL | 8.0 | 8.4 (LTS) | Xem xét upgrade |
| Nginx | alpine (latest) | — | Dùng tag cố định hơn |

---

## Quyết định kiến trúc đã thực hiện (ADR)

### ADR-001: Dùng tiếng Việt cho tên bảng & API

**Quyết định:** Đặt tên bảng, cột và API endpoint bằng tiếng Việt không dấu (ví dụ: `san_pham`, `/api/v1/khach-hang`).

**Lý do:** Nghiệp vụ hoàn toàn tiếng Việt, giúp đội ngũ (chủ yếu nói tiếng Việt) dễ đọc và bảo trì hơn.

**Hệ quả:** Frontend cần mapping từ JSON tiếng Việt sang UI.

### ADR-002: Giá snapshot trong chi tiết phiếu thuê

**Quyết định:** Lưu `gia_thue_ngay` và `tien_coc` vào `chi_tiet_thue_do` tại thời điểm lập phiếu.

**Lý do:** Đảm bảo tính toàn vẹn tài chính — phiếu thuê cũ không bị ảnh hưởng khi giá sản phẩm thay đổi.

### ADR-003: Docker Compose thay vì Kubernetes

**Quyết định:** Dùng Docker Compose cho cả dev và production ban đầu.

**Lý do:** Quy mô nhỏ (1 cửa hàng), đơn giản hơn, dễ maintain. Có thể migrate lên K8s khi cần scale.

### ADR-004: Shadcn UI thay vì Material UI / Ant Design

**Quyết định:** Dùng Shadcn UI (Radix UI + Tailwind CSS).

**Lý do:** Không phụ thuộc npm package, code owned hoàn toàn, dễ customize theo brand màu hồng của MiuMiu, nhẹ hơn.
