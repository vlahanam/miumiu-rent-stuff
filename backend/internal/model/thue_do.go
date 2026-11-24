package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/shopspring/decimal"
)

// ThueDo maps to table `thue_do`
// trang_thai: 1=Chờ xác nhận, 2=Đang thuê, 3=Đã trả, 4=Quá hạn, 5=Đã hủy
// loai_coc:   1=Tiền mặt, 2=Chuyển khoản, 3=Căn cước công dân
type ThueDo struct {
	ID            uint            `json:"id"               gorm:"primaryKey;autoIncrement"`
	MaPhieuThue   string          `json:"ma_phieu_thue"    gorm:"column:ma_phieu_thue;type:varchar(30);uniqueIndex;not null"`
	KhachHangID   uint            `json:"khach_hang_id"    gorm:"column:khach_hang_id;not null"`
	NguoiDungID   uint            `json:"nguoi_dung_id"    gorm:"column:nguoi_dung_id;not null"`
	NgayBatDau    *time.Time      `json:"ngay_bat_dau"     gorm:"column:ngay_bat_dau"`
	NgayHenTra    *time.Time      `json:"ngay_hen_tra"     gorm:"column:ngay_hen_tra"`
	SoNgayThue    *uint16         `json:"so_ngay_thue"     gorm:"column:so_ngay_thue"`
	NgayTraThucTe *time.Time      `json:"ngay_tra_thuc_te" gorm:"column:ngay_tra_thuc_te"`
	TongTienThue  decimal.Decimal `json:"tong_tien_thue"   gorm:"column:tong_tien_thue;type:decimal(12,2);not null;default:0"`
	LoaiCoc       uint8           `json:"loai_coc"         gorm:"column:loai_coc;type:tinyint unsigned;not null;default:1"`
	TienCoc       decimal.Decimal `json:"tien_coc"         gorm:"column:tien_coc;type:decimal(12,2);not null;default:0"`
	TienPhat      decimal.Decimal `json:"tien_phat"        gorm:"column:tien_phat;type:decimal(12,2);not null;default:0"`
	TrangThai     uint8           `json:"trang_thai"       gorm:"column:trang_thai;type:tinyint unsigned;not null;default:1"`
	GhiChu        *string         `json:"ghi_chu"          gorm:"column:ghi_chu;type:text"`
	NgayTao       time.Time       `json:"ngay_tao"         gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat   time.Time       `json:"ngay_cap_nhat"    gorm:"column:ngay_cap_nhat;autoUpdateTime"`

	// Associations
	KhachHang *KhachHang      `json:"khach_hang,omitempty"  gorm:"foreignKey:KhachHangID"`
	ChiTiet   []ChiTietThueDo `json:"chi_tiet,omitempty"    gorm:"foreignKey:ThueDoID"`
}

func (ThueDo) TableName() string { return "thue_do" }

// ChiTietThueDo maps to table `chi_tiet_thue_do`
type ChiTietThueDo struct {
	ID          uint            `json:"id"           gorm:"primaryKey;autoIncrement"`
	ThueDoID    uint            `json:"thue_do_id"   gorm:"column:thue_do_id;not null"`
	SanPhamID   uint            `json:"san_pham_id"  gorm:"column:san_pham_id;not null"`
	GiaThueNgay decimal.Decimal `json:"gia_thue_ngay" gorm:"column:gia_thue_ngay;type:decimal(12,2);not null;default:0"`
	TienCoc     decimal.Decimal `json:"tien_coc"     gorm:"column:tien_coc;type:decimal(12,2);not null;default:0"`

	// Associations
	SanPham *SanPham `json:"san_pham,omitempty" gorm:"foreignKey:SanPhamID"`
}

func (ChiTietThueDo) TableName() string { return "chi_tiet_thue_do" }

// ChiTietThueDoInput - client chỉ gửi san_pham_id
type ChiTietThueDoInput struct {
	SanPhamID uint `json:"san_pham_id" binding:"required"`
}

// CreateThueDoInput dùng cho POST /thue-do
// Backend tự sinh: ma_phieu_thue, ngay_hen_tra, tong_tien_thue, trang_thai, nguoi_dung_id (từ JWT)
type CreateThueDoInput struct {
	KhachHangID uint                 `json:"khach_hang_id" binding:"required"`
	NgayBatDau  *time.Time           `json:"ngay_bat_dau"`
	SoNgayThue  *uint16              `json:"so_ngay_thue"  binding:"required"`
	LoaiCoc     uint8                `json:"loai_coc"`
	TienCoc     decimal.Decimal      `json:"tien_coc"`
	GhiChu      *string              `json:"ghi_chu"`
	ChiTiet     []ChiTietThueDoInput `json:"chi_tiet" binding:"required,min=1"`
}

func (i CreateThueDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.KhachHangID,
			validation.Required.Error("Khách hàng không được để trống"),
		),
		validation.Field(&i.SoNgayThue,
			validation.Required.Error("Số ngày thuê không được để trống"),
		),
		validation.Field(&i.LoaiCoc,
			validation.In(uint8(0), uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ (1=Tiền mặt, 2=Chuyển khoản, 3=CCCD)"),
		),
	)
}

// UpdateThueDoInput dùng cho PUT /thue-do/:id
// Chỉ cho sửa các trường theo quy tắc trạng thái
type UpdateThueDoInput struct {
	NgayBatDau *time.Time       `json:"ngay_bat_dau"`
	NgayHenTra *time.Time       `json:"ngay_hen_tra"`
	SoNgayThue *uint16          `json:"so_ngay_thue"`
	LoaiCoc    *uint8           `json:"loai_coc"`
	TienCoc    *decimal.Decimal `json:"tien_coc"`
	TienPhat   *decimal.Decimal `json:"tien_phat"`
	GhiChu     *string          `json:"ghi_chu"`
	// Phiếu Chờ: có thể gửi thêm chi_tiet để replace
	ChiTiet    []ChiTietThueDoInput `json:"chi_tiet"`
}

func (i UpdateThueDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.LoaiCoc,
			validation.In((*uint8)(nil), uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ"),
		),
	)
}

// GiaoDoInput - không cần body, dùng path param
type GiaoDoInput struct{}

// TraDoInput dùng cho POST /thue-do/:id/tra-do
type TraDoInput struct {
	TienPhat          decimal.Decimal       `json:"tien_phat"`
	GhiChu            *string               `json:"ghi_chu"`
	SanPhamTrangThai  []SanPhamTrangThaiItem `json:"san_pham_trang_thai" binding:"required"`
}

// SanPhamTrangThaiItem - trạng thái từng SP khi trả đồ
type SanPhamTrangThaiItem struct {
	SanPhamID uint  `json:"san_pham_id" binding:"required"`
	TrangThai uint8 `json:"trang_thai" binding:"required"` // 1=Trống lịch, 3=Đang bảo dưỡng
}

func (i TraDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.SanPhamTrangThai,
			validation.Required.Error("Danh sách trạng thái sản phẩm không được để trống"),
		),
	)
}

// HuyPhieuInput dùng cho POST /thue-do/:id/huy
type HuyPhieuInput struct {
	GhiChu string `json:"ghi_chu" binding:"required"`
}

func (i HuyPhieuInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.GhiChu,
			validation.Required.Error("Lý do hủy không được để trống"),
		),
	)
}

// XuLyCocResponse - thông tin xử lý cọc khi trả đồ
type XuLyCocResponse struct {
	LoaiCoc  uint8           `json:"loai_coc"`
	TienCoc  decimal.Decimal `json:"tien_coc"`
	TienPhat decimal.Decimal `json:"tien_phat"`
	HoanLai  decimal.Decimal `json:"hoan_lai"`
	GhiChu   string          `json:"ghi_chu,omitempty"`
}
