# NGHIỆP VỤ TIỆM THUÊ ĐỒ MIUMIU

*Phiên bản hoàn thiện – hướng đến trang quản lý đơn giản, dễ sử dụng. Khớp với database `miumiu_db` (MySQL, không thay đổi schema).*

## 0. Ghi chú cho lập trình (Claude Code)

- Database: MySQL, file khởi tạo `miumiu_db`. **Không sửa schema.** Mọi nghiệp vụ dưới đây phải làm được với các bảng hiện có.
- Bảng: `san_pham`, `nguoi_dung`, `khach_hang`, `thue_do` (phiếu thuê), `chi_tiet_thue_do`, `cai_dat`.
- Giá trị số của các cột trạng thái (lưu `TINYINT`):

| Cột | Giá trị |
|---|---|
| `san_pham.trang_thai` | 1 = Trống lịch, 2 = Đã cho thuê, 3 = Đang bảo dưỡng |
| `thue_do.trang_thai` | 1 = Chờ xác nhận, 2 = Đang thuê, 3 = Đã trả, 4 = Quá hạn, 5 = Đã hủy |
| `thue_do.loai_coc` | 1 = Tiền mặt, 2 = Chuyển khoản, 3 = Căn cước công dân (CCCD) |
| `cai_dat.kieu_du_lieu` | 1 = Chuỗi, 2 = Số, 3 = Boolean, 4 = JSON |

- Khóa ngoại dùng `ON DELETE RESTRICT` (trừ `chi_tiet_thue_do.thue_do_id` là `CASCADE`): sản phẩm, khách hàng, người dùng đã có phiếu thì không xóa được.
- Không có cột "số lần thuê" hay "ẩn": số lần thuê được **đếm** từ `thue_do` có `trang_thai = 3`.
- `cai_dat` lưu dạng khóa/giá trị: `pham_tram_gia_coc` = 85 (số), `so_dien_thoai_lien_he` = 0365193713 (chuỗi). Bảng này có thể còn khóa khác chưa thấy trong file SQL (file bị cắt ở cuối).
- Ưu tiên giao diện mobile-first, dùng được trên desktop.

## I. Thông tin dự án

1. **Tên dự án:** Tiệm thuê đồ MiuMiu.
2. **Mô tả:** Web quản lý cho thuê đồ (áo dài và phụ kiện đi kèm) dành cho chủ tiệm và nhân viên. Dùng được trên điện thoại và máy tính, ưu tiên điện thoại vì thao tác ngay tại quầy.
3. **Người dùng:** Chủ tiệm và nhân viên, đăng nhập bằng email và mật khẩu. Mọi tài khoản có quyền như nhau; mỗi phiếu thuê ghi lại người lập phiếu.
4. **Nguyên tắc thiết kế:**
    - Tạo một phiếu thuê trong khoảng 1 phút.
    - Hệ thống tự tính tiền, tự gợi ý tiền cọc và tự đổi trạng thái; người dùng chỉ nhập những gì bắt buộc.
    - Nút lớn, ít bước, thông báo lỗi nói rõ cách xử lý.
    - Việc quan trọng (đơn quá hạn, đồ cần trả hôm nay) hiện ngay màn hình đầu.

## II. Các nghiệp vụ chính

1. Quản lý sản phẩm
2. Quản lý đơn thuê (phiếu thuê, gồm đặt trước, giao đồ, trả đồ)
3. Quản lý khách hàng
4. Báo cáo và xuất file
5. Cài đặt và tài khoản

Màn hình **Tổng quan** gom các việc cần làm trong ngày (xem phần IV).

## III. Chi tiết nghiệp vụ

### 1. Quản lý sản phẩm

**Giới thiệu:** gồm thêm, xem, sửa, xóa, tìm kiếm và lọc sản phẩm. Mỗi sản phẩm là duy nhất nên số lượng luôn là một; có hai bộ giống nhau thì tạo hai sản phẩm với mã khác nhau.

#### a. Thông tin sản phẩm

| Trường | Cột DB | Bắt buộc | Mô tả |
|---|---|---|---|
| Mã sản phẩm (SKU) | `ma_san_pham` | Tự động | Hệ thống tự sinh với tiền tố `MIU-`, không trùng, tối đa 30 ký tự. Ví dụ: MIU-001. |
| Tên sản phẩm | `ten_san_pham` | Có | Tên hiển thị, dùng để tìm kiếm. |
| Đường dẫn (slug) | `slug` | Tự động | Sinh từ tên, không trùng; người dùng không cần nhập. |
| Hình ảnh | `hinh_anh` (TEXT) | Không | Một hoặc nhiều ảnh, ảnh đầu tiên là ảnh đại diện. Lưu đường dẫn (nhiều ảnh dùng danh sách JSON). |
| Giá gốc | `gia_goc_san_pham` | Có | Giá mua ban đầu (VND), dùng tính tiền cọc và theo dõi thu hồi vốn. |
| Giá thuê một ngày | `gia_thue_ngay` | Có | VND/ngày. |
| Trạng thái | `trang_thai` | Tự động | Xem mục b. Mặc định khi tạo: Trống lịch. |
| Số lần đã cho thuê | (tính toán) | Tự động | Đếm các phiếu Đã trả có sản phẩm này. |
| Ngày tạo, ngày cập nhật | `ngay_tao`, `ngay_cap_nhat` | Tự động | Hệ thống ghi. |

#### b. Trạng thái sản phẩm

| Trạng thái | Ý nghĩa | Ai đổi |
|---|---|---|
| Trống lịch | Sẵn sàng cho thuê. | Tự động khi trả đồ hoặc hủy phiếu; admin bấm "Hoàn tất bảo dưỡng". |
| Đã cho thuê | Đang nằm trong phiếu Đang thuê hoặc Quá hạn. | Tự động khi giao đồ. |
| Đang bảo dưỡng | Đang giặt, sửa, hoặc tạm ngừng cho thuê. | Admin đổi thủ công. |

Quy tắc:
- Sản phẩm Đã cho thuê không đổi sang Đang bảo dưỡng được cho đến khi khách trả đồ.
- Sản phẩm Đang bảo dưỡng không được chọn khi tạo phiếu.
- Trống lịch chỉ cho biết hiện tại đồ đang ở tiệm. Khi đặt trước, hệ thống còn kiểm tra sản phẩm có bị trùng ngày với phiếu khác không (xem phần 2).

#### c. Chức năng

- **Thêm, sửa:** sửa được mọi trường nhập tay; không sửa SKU sau khi sản phẩm đã có phiếu thuê.
- **Xóa:** chỉ xóa được sản phẩm chưa từng nằm trong phiếu nào. Sản phẩm đã có phiếu thì không xóa; muốn ngừng cho thuê thì chuyển sang Đang bảo dưỡng.
- **Tìm kiếm và lọc:** tìm theo mã hoặc tên; lọc theo trạng thái; sắp xếp theo giá thuê.
- **Xem chi tiết:** thông tin sản phẩm, lịch sử các lần thuê, tổng doanh thu mang lại so với giá gốc (để biết đã thu hồi vốn chưa).

### 2. Quản lý đơn thuê

**Giới thiệu:** một đơn thuê là một phiếu thuê (`thue_do`), có thể gồm **nhiều sản phẩm** (`chi_tiet_thue_do`, ví dụ áo dài kèm phụ kiện). Chức năng: tạo phiếu (kể cả đặt trước), giao đồ, trả đồ, sửa, hủy, tìm kiếm và lọc.

#### a. Thông tin phiếu thuê

| Trường | Cột DB | Mô tả |
|---|---|---|
| Mã phiếu thuê | `ma_phieu_thue` | Tự sinh, không trùng. Ví dụ: DT-0001. |
| Khách hàng | `khach_hang_id` | Chọn theo số điện thoại hoặc thêm nhanh khách mới ngay trong phiếu. |
| Người lập phiếu | `nguoi_dung_id` | Tự lấy từ tài khoản đang đăng nhập. |
| Sản phẩm thuê | `chi_tiet_thue_do` | Một hoặc nhiều sản phẩm. Mỗi dòng lưu lại giá thuê/ngày (`gia_thue_ngay`) và tiền cọc (`tien_coc`) tại thời điểm lập phiếu, nên đổi giá sau này không ảnh hưởng phiếu cũ. Một sản phẩm chỉ xuất hiện một lần trong một phiếu. |
| Ngày bắt đầu thuê | `ngay_bat_dau` | Ngày giờ nhận đồ. Mặc định là bây giờ; chọn ngày tương lai nếu đặt trước. |
| Số ngày thuê | `so_ngay_thue` | Admin nhập. |
| Ngày hẹn trả | `ngay_hen_tra` | Tự tính = ngày bắt đầu + số ngày thuê (admin chỉnh được). Không được trước ngày bắt đầu (ràng buộc DB). |
| Ngày trả thực tế | `ngay_tra_thuc_te` | Ghi lại khi khách trả đồ. |
| Tổng tiền thuê | `tong_tien_thue` | Tự tính (công thức bên dưới). |
| Loại cọc | `loai_coc` | Tiền mặt, Chuyển khoản hoặc CCCD. |
| Tiền cọc | `tien_coc` | Số tiền thực thu. Chỉ nhập khi loại cọc là Tiền mặt hoặc Chuyển khoản; nếu là CCCD thì bằng 0. |
| Tiền phạt | `tien_phat` | Một khoản phí do admin nhập khi khách trả đồ (trả trễ hoặc hư hỏng). Mặc định 0. |
| Trạng thái | `trang_thai` | Xem bảng bên dưới. |
| Ghi chú | `ghi_chu` | Không bắt buộc. |
| Ngày tạo, ngày cập nhật | `ngay_tao`, `ngay_cap_nhat` | Tự động. |

#### b. Trạng thái phiếu thuê

| Trạng thái | Ý nghĩa | Sản phẩm |
|---|---|---|
| Chờ xác nhận | Phiếu đặt trước, khách chưa đến nhận đồ. | Giữ lịch theo ngày, chưa đổi trạng thái. |
| Đang thuê | Khách đã nhận đồ. | Chuyển sang Đã cho thuê. |
| Quá hạn | Quá ngày hẹn trả mà chưa trả; hệ thống tự chuyển và tô đỏ. | Vẫn Đã cho thuê. |
| Đã trả | Khách đã trả đồ, phiếu hoàn tất. | Về Trống lịch hoặc Đang bảo dưỡng. |
| Đã hủy | Phiếu bị hủy. | Về Trống lịch nếu đã giao. |

#### c. Công thức và tiền cọc

- **Tổng tiền thuê = (tổng giá thuê/ngày của các sản phẩm trong phiếu) × số ngày thuê.**
- **Tiền cọc gợi ý của mỗi sản phẩm = giá gốc × tỷ lệ cọc** (mặc định 85%, lấy từ `cai_dat.pham_tram_gia_coc`). Hệ thống cộng tổng và điền sẵn vào ô Tiền cọc, admin sửa được nếu thỏa thuận khác.
- Khi khách chọn cọc bằng **CCCD**, ô Tiền cọc ẩn đi và nhận giá trị 0; admin chỉ tick xác nhận đã giữ CCCD.
- Khi khách chọn **Tiền mặt** hoặc **Chuyển khoản**, ô Tiền cọc hiện ra để điền số tiền đã nhận.
- Doanh thu của phiếu = tổng tiền thuê + tiền phạt. Tiền cọc không tính vào doanh thu vì sẽ hoàn lại.

#### d. Luồng tạo phiếu (thuê ngay hoặc đặt trước)

1. Bấm **"Thêm đơn thuê"**.
2. Nhập số điện thoại khách. Khách cũ thì chọn luôn; khách mới thì nhập tên (và địa chỉ nếu muốn) ngay tại đó.
3. Chọn **sản phẩm** (một hoặc nhiều). Hệ thống chỉ cho chọn sản phẩm không ở trạng thái Đang bảo dưỡng.
4. Chọn **ngày bắt đầu** và nhập **số ngày thuê**. Hệ thống kiểm tra từng sản phẩm có bị trùng lịch không: sản phẩm nằm trong phiếu Chờ xác nhận, Đang thuê hoặc Quá hạn mà khoảng ngày giao nhau thì báo rõ "đã có lịch từ ... đến ..." và không cho lưu.
5. Hệ thống tự điền ngày hẹn trả, tổng tiền thuê và tiền cọc gợi ý. Chọn **loại cọc** và xác nhận số tiền cọc.
6. Bấm **Lưu**:
    - Ngày bắt đầu là hôm nay và khách nhận đồ luôn: phiếu vào **Đang thuê**, sản phẩm chuyển **Đã cho thuê**.
    - Ngày bắt đầu ở tương lai: phiếu vào **Chờ xác nhận**.

#### e. Luồng giao đồ và trả đồ

**Giao đồ (với phiếu đặt trước):** khi khách đến nhận, admin mở phiếu bấm **"Giao đồ"**. Phiếu chuyển sang Đang thuê, sản phẩm chuyển Đã cho thuê. Admin xác nhận đã nhận cọc hoặc đã giữ CCCD.

**Trả đồ:**
1. Admin mở phiếu Đang thuê hoặc Quá hạn, bấm **"Khách đã trả đồ"**.
2. Hệ thống ghi ngày trả thực tế là bây giờ.
3. Nếu trả trễ hoặc đồ hư hỏng, admin điền **một khoản tiền phạt** và ghi chú lý do. Không có tiền phạt thì để 0.
4. Với từng sản phẩm, chọn đồ về **Trống lịch** hoặc **Đang bảo dưỡng** (cần giặt, sửa).
5. Hệ thống tính số tiền xử lý cọc:
    - Cọc tiền mặt hoặc chuyển khoản: **hoàn lại = tiền cọc − tiền phạt**. Nếu âm thì khách phải trả thêm phần chênh.
    - Cọc CCCD: trả lại CCCD; nếu có tiền phạt thì khách thanh toán khoản phạt đó.
6. Phiếu chuyển sang **Đã trả**.

#### f. Các quy tắc khác

- Phiếu sang **Quá hạn** tự động khi qua ngày hẹn trả mà chưa trả; Tổng quan luôn hiển thị các phiếu này đầu tiên.
- Một sản phẩm không thể nằm trong hai phiếu có khoảng ngày giao nhau.
- Phiếu Đã trả hoặc Đã hủy chỉ xem, không sửa, để số liệu doanh thu không bị thay đổi.
- **Hủy phiếu** cần xác nhận và ghi lý do vào ghi chú; sản phẩm đã giao thì trở về Trống lịch. Chỉ hủy được phiếu Chờ xác nhận hoặc Đang thuê. Phiếu không xóa, chỉ hủy, để giữ lịch sử.
- Phiếu Chờ xác nhận được sửa tự do (đổi ngày, thêm hoặc bớt sản phẩm); phiếu Đang thuê chỉ sửa số ngày thuê, tiền phạt và ghi chú. Khi gia hạn thì tổng tiền thuê tự tính lại.

### 3. Quản lý khách hàng

**Giới thiệu:** gồm thêm, xem, sửa khách hàng, tìm theo số điện thoại hoặc tên và xem lịch sử thuê. Phần mã giới thiệu đã được bỏ.

#### a. Thông tin khách hàng

| Trường | Cột DB | Bắt buộc | Mô tả |
|---|---|---|---|
| Tên khách hàng | `ten` | Có | Tối đa 100 ký tự. |
| Số điện thoại | `so_dien_thoai` | Có | Không trùng; dùng để tìm khách và liên hệ khi quá hạn. |
| Địa chỉ | `dia_chi` | Không | Dùng khi cần liên hệ hoặc giao nhận. |
| Số lần thuê | (tính toán) | Tự động | Đếm các phiếu Đã trả của khách. |
| Ngày tạo, ngày cập nhật | `ngay_tao`, `ngay_cap_nhat` | Tự động | Hệ thống ghi. |

#### b. Chức năng

- **Thêm nhanh** ngay trong màn hình tạo phiếu: nhập số điện thoại, nếu chưa có thì hiện ô nhập tên.
- Nhập số điện thoại đã tồn tại thì hệ thống chọn luôn khách cũ, không tạo trùng.
- **Xem chi tiết:** thông tin khách, các phiếu đang thuê hoặc quá hạn, lịch sử các phiếu đã trả.
- **Xóa:** chỉ xóa được khách chưa có phiếu thuê. Khách đã có phiếu thì giữ lại để không mất lịch sử.

### 4. Báo cáo và xuất file

Mọi danh sách và báo cáo đều có nút **"Xuất file"** (Excel hoặc CSV) theo khoảng thời gian đang chọn.

| Báo cáo | Nội dung |
|---|---|
| Doanh thu theo tháng | Tổng tiền thuê + tiền phạt của các phiếu Đã trả, tính theo ngày trả thực tế. Kèm số phiếu và số sản phẩm đã cho thuê. |
| Danh sách phiếu thuê | Mã phiếu, khách, sản phẩm, ngày thuê, ngày hẹn trả, ngày trả thực tế, tiền thuê, cọc, phạt, trạng thái. Lọc được theo trạng thái. |
| Hiệu quả sản phẩm | Mỗi sản phẩm: số lần thuê, tổng doanh thu, giá gốc, đã thu hồi vốn chưa. |
| Danh sách khách hàng | Tên, số điện thoại, địa chỉ, số lần thuê. |

### 5. Cài đặt và tài khoản

**Cài đặt cửa hàng** (lưu theo dạng khóa và giá trị trong `cai_dat`, chỉnh trong một màn hình):

| Mục | Khóa | Giá trị mặc định | Dùng để |
|---|---|---|---|
| Tỷ lệ tiền cọc | `pham_tram_gia_coc` | 85 (%) | Gợi ý tiền cọc của mỗi sản phẩm = giá gốc × tỷ lệ này. |
| Số điện thoại liên hệ của shop | `so_dien_thoai_lien_he` | 0365193713 | Hiển thị trên phiếu thuê và tin nhắn gửi khách. |

**Tài khoản** (`nguoi_dung`):
- Đăng nhập bằng email và mật khẩu; mật khẩu được mã hóa (hash), không lưu dạng chữ thường.
- Người dùng có thể đổi tên và mật khẩu của mình.
- Tài khoản đã lập phiếu thì không xóa, để phiếu vẫn biết ai lập.

## IV. Giao diện và trải nghiệm sử dụng

Trang quản lý chỉ có vài màn hình, mỗi màn hình làm đúng một việc.

**Menu:** Tổng quan · Đơn thuê · Sản phẩm · Khách hàng. Trên điện thoại là thanh cố định ở cuối màn hình; Báo cáo và Cài đặt nằm trong mục "Thêm".

**Màn hình Tổng quan** (việc cần làm hôm nay):
- Phiếu **quá hạn** (đỏ, có nút gọi khách).
- Phiếu **cần trả hôm nay**.
- Phiếu **đặt trước sắp đến nhận** hôm nay và ngày mai.
- Số sản phẩm theo trạng thái: Trống lịch, Đã cho thuê, Đang bảo dưỡng.
- Doanh thu tháng này.
- Nút lớn **"Thêm đơn thuê"** luôn ở vị trí dễ bấm.

**Nguyên tắc thao tác:**
- Màu trạng thái nhất quán: xanh (Trống lịch, Đã trả), vàng (Đang thuê, Chờ xác nhận), đỏ (Quá hạn), xám (Đang bảo dưỡng, Đã hủy).
- Mọi danh sách có ô tìm kiếm và bộ lọc theo trạng thái; danh sách phiếu mặc định hiện phiếu cần xử lý trước.
- Danh sách sản phẩm hiển thị dạng thẻ có ảnh, giá thuê và trạng thái để chọn nhanh.
- Tiền hiển thị dạng 1.200.000đ, ngày giờ theo định dạng Việt Nam.
- Việc không thể quay lại (hủy phiếu, xóa) luôn có bước xác nhận.
- Báo lỗi cụ thể, ví dụ "Áo MIU-003 đã có lịch thuê từ 12/12 đến 14/12".

## V. Các điểm đã chốt và lưu ý

**Đã chốt:**

| Nội dung | Quyết định |
|---|---|
| Số sản phẩm mỗi đơn | Nhiều sản phẩm trong một phiếu. |
| Phí trả trễ | Một khoản tiền phạt do admin nhập khi khách trả đồ, không tính theo ngày. |
| Đặt trước | Có; phiếu ở trạng thái Chờ xác nhận và hệ thống kiểm tra trùng ngày. |
| Mã giới thiệu | Bỏ, không có trong nghiệp vụ. |
| Xuất báo cáo | Có, xuất Excel hoặc CSV (phần III.4). |

**Lưu ý khớp với database (database giữ nguyên):**
- Không có cột "ẩn" cho sản phẩm hay khách hàng, nên chỉ xóa được dữ liệu chưa phát sinh phiếu thuê; còn lại thì giữ lại hoặc chuyển Đang bảo dưỡng.
- Số lần thuê của sản phẩm và khách hàng không lưu thành cột mà được đếm từ các phiếu Đã trả.
- Tiền cọc của phiếu chỉ có một con số tổng, còn mỗi sản phẩm có tiền cọc gợi ý lưu ở chi tiết phiếu.
- Hình ảnh lưu dạng văn bản, nên ảnh được lưu thành đường dẫn (nhiều ảnh theo một định dạng thống nhất, ví dụ danh sách JSON).

**Giả định cần xác nhận:**
1. "Số phần trăm giá trị cọc = 85" đang hiểu là **cọc mỗi sản phẩm = 85% giá gốc**. Nếu ý khác (ví dụ 85% giá trị thuê) thì sửa công thức ở mục III.2.c.
2. Cách xử lý cọc khi có tiền phạt (hoàn = cọc − phạt) là đề xuất; nếu tiệm thu phạt riêng, không trừ vào cọc thì bỏ công thức này.
3. Bảng cài đặt trong file SQL bị cắt ở dòng cuối, nên mới ghi hai cài đặt thấy được (tỷ lệ cọc, số điện thoại shop). Nếu còn cài đặt khác thì bổ sung.