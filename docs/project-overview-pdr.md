# MiuMiu Rent Stuff — Project Overview & Product Definition Record (PDR)

> **Phiên bản:** 1.0  
> **Cập nhật lần cuối:** Tháng 11, 2026  
> **Trạng thái:** Đang phát triển (MVP)

---

## 1. Tổng quan dự án

**MiuMiu Rent Stuff** là ứng dụng quản lý cho thuê trang phục cao cấp, được thiết kế để vận hành một cửa hàng cho thuê váy dạ hội, áo dài, vest và nhiều trang phục cao cấp khác.

Hệ thống phục vụ hai nhóm đối tượng chính:
- **Nhân viên / Admin cửa hàng**: Quản lý kho hàng, lập phiếu thuê, theo dõi lịch trả và xử lý thanh toán.
- **Khách hàng (tương lai)**: Xem và đặt thuê trang phục trực tuyến.

---

## 2. Mục tiêu kinh doanh

| Mục tiêu | Mô tả |
|----------|-------|
| **Số hoá quy trình** | Thay thế sổ sách, giấy tờ bằng hệ thống quản lý số |
| **Theo dõi tình trạng** | Biết ngay trang phục nào đang được thuê, đang trống lịch, đang bảo dưỡng |
| **Quản lý tài chính** | Theo dõi tiền thuê, tiền cọc, tiền phạt trễ hạn / hư hỏng |
| **Mở rộng kênh bán** | Hỗ trợ khách đặt thuê online trong tương lai |

---

## 3. Phạm vi MVP (Minimal Viable Product)

### 3.1 Đã có trong MVP

| Module | Tính năng |
|--------|-----------|
| **Sản phẩm (san_pham)** | CRUD: thêm/sửa/xóa/xem trang phục; Lọc theo trạng thái; Phân trang |
| **Khách hàng (khach_hang)** | CRUD: thêm/sửa/xóa/xem; Tìm kiếm theo tên hoặc số điện thoại; Phân trang |
| **Phiếu thuê (thue_do)** | CRUD phiếu thuê; Lập chi tiết phiếu thuê gồm nhiều sản phẩm; Theo dõi trạng thái phiếu; Lọc theo khách hàng |
| **Cài đặt (cai_dat)** | Lưu cấu hình hệ thống (phần trăm cọc, SĐT liên hệ, ...) |
| **Phân trang** | Tất cả API list đều hỗ trợ `?page=&limit=` |
| **Giao diện web** | Trang chủ giới thiệu; Trang danh sách sản phẩm |

### 3.2 Ngoài phạm vi MVP (Roadmap tương lai)

- Xác thực người dùng (đăng nhập / JWT)
- Dashboard thống kê doanh thu
- Upload ảnh sản phẩm (S3 / Cloudinary)
- Thông báo nhắc trả hàng qua SMS / Email
- Đặt thuê online từ phía khách hàng

---

## 4. Các thực thể nghiệp vụ chính

### 4.1 Sản phẩm (SanPham)

Đại diện cho một bộ trang phục có thể cho thuê.

| Trường | Ý nghĩa |
|--------|---------|
| `ma_san_pham` | Mã nội bộ duy nhất (VD: `VAY-001`) |
| `ten_san_pham` | Tên sản phẩm |
| `slug` | URL-friendly slug |
| `hinh_anh` | URL hình ảnh |
| `gia_goc_san_pham` | Giá trị thực của sản phẩm (dùng để tính % cọc) |
| `gia_thue_ngay` | Giá thuê theo ngày |
| `trang_thai` | **1** = Trống lịch · **2** = Đã cho thuê · **3** = Đang bảo dưỡng |

### 4.2 Khách hàng (KhachHang)

| Trường | Ý nghĩa |
|--------|---------|
| `ten` | Tên đầy đủ |
| `so_dien_thoai` | Số điện thoại (unique, chỉ chữ số) |
| `dia_chi` | Địa chỉ (tuỳ chọn) |

### 4.3 Người dùng hệ thống (NguoiDung)

Nhân viên cửa hàng sử dụng hệ thống để lập phiếu thuê. *(Chưa có CRUD API – dữ liệu seed trực tiếp vào DB)*

### 4.4 Phiếu thuê (ThueDo)

Mỗi phiếu thuê ghi nhận một giao dịch cho thuê, có thể bao gồm nhiều sản phẩm.

| Trường | Ý nghĩa |
|--------|---------|
| `ma_phieu_thue` | Mã phiếu thuê duy nhất |
| `khach_hang_id` | Khách hàng thuê |
| `nguoi_dung_id` | Nhân viên lập phiếu |
| `ngay_bat_dau` | Ngày bắt đầu thuê (dự kiến) |
| `ngay_hen_tra` | Ngày hẹn trả (dự kiến) |
| `so_ngay_thue` | Số ngày thuê |
| `ngay_tra_thuc_te` | Ngày trả thực tế |
| `tong_tien_thue` | Tổng tiền thuê |
| `loai_coc` | **1** = Tiền mặt · **2** = Chuyển khoản · **3** = Căn cước công dân |
| `tien_coc` | Số tiền cọc (dùng khi loại cọc là tiền mặt hoặc CK) |
| `tien_phat` | Phí phạt trễ hạn hoặc hư hỏng |
| `trang_thai` | **1** Chờ xác nhận · **2** Đang thuê · **3** Đã trả · **4** Quá hạn · **5** Đã hủy |

### 4.5 Chi tiết phiếu thuê (ChiTietThueDo)

Mỗi dòng trong phiếu thuê ghi nhận một sản phẩm được thuê.

| Trường | Ý nghĩa |
|--------|---------|
| `thue_do_id` | Phiếu thuê tương ứng |
| `san_pham_id` | Sản phẩm được thuê |
| `gia_thue_ngay` | Giá thuê/ngày tại thời điểm lập phiếu (snapshot) |
| `tien_coc` | Tiền cọc của sản phẩm tại thời điểm lập phiếu (snapshot) |

### 4.6 Cài đặt hệ thống (CaiDat)

Key-value store lưu cấu hình cửa hàng.

| Khóa | Giá trị mặc định | Ý nghĩa |
|------|------------------|---------|
| `pham_tram_gia_coc` | `85` | % giá trị sản phẩm dùng làm tiền cọc |
| `so_dien_thoai_lien_he` | `0365193713` | SĐT liên hệ shop |

---

## 5. Luồng nghiệp vụ điển hình

```
Khách hàng đến shop
        │
        ▼
Nhân viên tra cứu / tạo hồ sơ Khách hàng
        │
        ▼
Nhân viên chọn Sản phẩm còn trống lịch (trang_thai = 1)
        │
        ▼
Lập Phiếu thuê (ThueDo) + Chi tiết (ChiTietThueDo)
 - Ghi nhận giá thuê / tiền cọc tại thời điểm lập
 - Trạng thái phiếu: "Chờ xác nhận" (1) → "Đang thuê" (2)
 - Trạng thái sản phẩm: → "Đã cho thuê" (2)
        │
        ▼
Khách trả hàng
 - Ghi ngày_tra_thuc_te
 - Tính tiền phạt nếu quá hạn hoặc hư hỏng
 - Trạng thái phiếu: "Đã trả" (3)
 - Trạng thái sản phẩm: → "Trống lịch" (1) hoặc "Bảo dưỡng" (3)
```

---

## 6. Quy tắc nghiệp vụ

1. **Giá snapshot**: Giá thuê/ngày và tiền cọc được chốt tại thời điểm lập phiếu, lưu vào `chi_tiet_thue_do`. Nếu giá sản phẩm thay đổi sau đó, phiếu cũ không bị ảnh hưởng.
2. **Mã phiếu thuê**: Phải unique, không được thay đổi sau khi tạo.
3. **Xóa phiếu thuê**: Khi xóa `thue_do`, tất cả `chi_tiet_thue_do` liên quan bị xóa cascade (ON DELETE CASCADE).
4. **Xóa khách hàng / sản phẩm**: Bị chặn nếu còn phiếu thuê liên quan (ON DELETE RESTRICT).
5. **Số điện thoại**: Phải là chuỗi chỉ gồm chữ số, unique trong hệ thống.
6. **Tiền cọc dạng CCCD**: Khi `loai_coc = 3` (căn cước), trường `tien_coc` vẫn tồn tại nhưng thường bằng 0.

---

## 7. Các ràng buộc kỹ thuật

| Ràng buộc | Giá trị |
|-----------|---------|
| Giá thuê tối thiểu | ≥ 0 VND |
| Mã sản phẩm tối đa | 30 ký tự |
| Tên sản phẩm tối đa | 255 ký tự |
| Số điện thoại tối đa | 20 ký tự |
| Địa chỉ tối đa | 255 ký tự |
| Mã phiếu thuê tối đa | 30 ký tự |
| Phân trang mặc định | 20 bản ghi / trang |
| Phân trang tối đa | 100 bản ghi / trang |

---

## 8. Môi trường & cơ sở hạ tầng

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Go 1.23, Gin v1.10, GORM v1.25, ozzo-validation v4 |
| Database | MySQL 8.0 (InnoDB, utf8mb4) |
| Gateway | Nginx Alpine |
| Container | Docker Compose |

> Xem chi tiết kiến trúc tại [system-architecture.md](./system-architecture.md).
