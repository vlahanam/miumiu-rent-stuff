package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

// ThueDo maps to table `thue_do`
// trang_thai: 1=Chờ xác nhận, 2=Đang thuê, 3=Đã trả, 4=Quá hạn, 5=Đã hủy
// loai_coc:   1=Tiền mặt, 2=Chuyển khoản, 3=Căn cước công dân
type ThueDo struct {
	ID             uint        `json:"id"               gorm:"primaryKey;autoIncrement"`
	MaPhieuThue    string      `json:"ma_phieu_thue"    gorm:"column:ma_phieu_thue;type:varchar(30);uniqueIndex;not null"`
	KhachHangID    uint        `json:"khach_hang_id"    gorm:"column:khach_hang_id;not null"`
	NguoiDungID    uint        `json:"nguoi_dung_id"    gorm:"column:nguoi_dung_id;not null"`
	NgayBatDau     *time.Time  `json:"ngay_bat_dau"     gorm:"column:ngay_bat_dau"`
	NgayHenTra     *time.Time  `json:"ngay_hen_tra"     gorm:"column:ngay_hen_tra"`
	SoNgayThue     *uint16     `json:"so_ngay_thue"     gorm:"column:so_ngay_thue"`
	NgayTraThucTe  *time.Time  `json:"ngay_tra_thuc_te" gorm:"column:ngay_tra_thuc_te"`
	TongTienThue   float64     `json:"tong_tien_thue"   gorm:"column:tong_tien_thue;type:decimal(12,2);not null;default:0"`
	LoaiCoc        uint8       `json:"loai_coc"         gorm:"column:loai_coc;type:tinyint unsigned;not null;default:1"`
	TienCoc        float64     `json:"tien_coc"         gorm:"column:tien_coc;type:decimal(12,2);not null;default:0"`
	TienPhat       float64     `json:"tien_phat"        gorm:"column:tien_phat;type:decimal(12,2);not null;default:0"`
	TrangThai      uint8       `json:"trang_thai"       gorm:"column:trang_thai;type:tinyint unsigned;not null;default:1"`
	GhiChu         *string     `json:"ghi_chu"          gorm:"column:ghi_chu;type:text"`
	NgayTao        time.Time   `json:"ngay_tao"         gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat    time.Time   `json:"ngay_cap_nhat"    gorm:"column:ngay_cap_nhat;autoUpdateTime"`

	// Associations
	KhachHang  *KhachHang   `json:"khach_hang,omitempty"  gorm:"foreignKey:KhachHangID"`
	ChiTiet    []ChiTietThueDo `json:"chi_tiet,omitempty" gorm:"foreignKey:ThueDoID"`
}

func (ThueDo) TableName() string { return "thue_do" }

// ChiTietThueDo maps to table `chi_tiet_thue_do`
type ChiTietThueDo struct {
	ID          uint    `json:"id"           gorm:"primaryKey;autoIncrement"`
	ThueDoID    uint    `json:"thue_do_id"   gorm:"column:thue_do_id;not null"`
	SanPhamID   uint    `json:"san_pham_id"  gorm:"column:san_pham_id;not null"`
	GiaThuNgay  float64 `json:"gia_thue_ngay" gorm:"column:gia_thue_ngay;type:decimal(12,2);not null;default:0"`
	TienCoc     float64 `json:"tien_coc"     gorm:"column:tien_coc;type:decimal(12,2);not null;default:0"`

	// Associations
	SanPham *SanPham `json:"san_pham,omitempty" gorm:"foreignKey:SanPhamID"`
}

func (ChiTietThueDo) TableName() string { return "chi_tiet_thue_do" }

// CreateThueDoInput dùng cho POST /thue-do
type CreateThueDoInput struct {
	MaPhieuThue  string              `json:"ma_phieu_thue"  binding:"required"`
	KhachHangID  uint                `json:"khach_hang_id"  binding:"required"`
	NguoiDungID  uint                `json:"nguoi_dung_id"  binding:"required"`
	NgayBatDau   *time.Time          `json:"ngay_bat_dau"`
	NgayHenTra   *time.Time          `json:"ngay_hen_tra"`
	SoNgayThue   *uint16             `json:"so_ngay_thue"`
	TongTienThue float64             `json:"tong_tien_thue"`
	LoaiCoc      uint8               `json:"loai_coc"`
	TienCoc      float64             `json:"tien_coc"`
	TienPhat     float64             `json:"tien_phat"`
	TrangThai    uint8               `json:"trang_thai"`
	GhiChu       *string             `json:"ghi_chu"`
	ChiTiet      []ChiTietThueDoInput `json:"chi_tiet"`
}

type ChiTietThueDoInput struct {
	SanPhamID  uint    `json:"san_pham_id"  binding:"required"`
	GiaThuNgay float64 `json:"gia_thue_ngay"`
	TienCoc    float64 `json:"tien_coc"`
}

func (i CreateThueDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.MaPhieuThue,
			validation.Required.Error("Mã phiếu thuê không được để trống"),
			validation.Length(1, 30).Error("Mã phiếu thuê tối đa 30 ký tự"),
		),
		validation.Field(&i.KhachHangID,
			validation.Required.Error("Khách hàng không được để trống"),
		),
		validation.Field(&i.NguoiDungID,
			validation.Required.Error("Nhân viên lập phiếu không được để trống"),
		),
		validation.Field(&i.LoaiCoc,
			validation.In(uint8(0), uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ (1=Tiền mặt, 2=Chuyển khoản, 3=CCCD)"),
		),
		validation.Field(&i.TrangThai,
			validation.In(uint8(0), uint8(1), uint8(2), uint8(3), uint8(4), uint8(5)).Error("Trạng thái không hợp lệ (1-5)"),
		),
		validation.Field(&i.TongTienThue,
			validation.Min(0.0).Error("Tổng tiền thuê phải >= 0"),
		),
		validation.Field(&i.TienCoc,
			validation.Min(0.0).Error("Tiền cọc phải >= 0"),
		),
		validation.Field(&i.TienPhat,
			validation.Min(0.0).Error("Tiền phạt phải >= 0"),
		),
	)
}

// UpdateThueDoInput dùng cho PUT /thue-do/:id
type UpdateThueDoInput struct {
	NgayBatDau    *time.Time `json:"ngay_bat_dau"`
	NgayHenTra    *time.Time `json:"ngay_hen_tra"`
	SoNgayThue    *uint16    `json:"so_ngay_thue"`
	NgayTraThucTe *time.Time `json:"ngay_tra_thuc_te"`
	TongTienThue  *float64   `json:"tong_tien_thue"`
	LoaiCoc       *uint8     `json:"loai_coc"`
	TienCoc       *float64   `json:"tien_coc"`
	TienPhat      *float64   `json:"tien_phat"`
	TrangThai     *uint8     `json:"trang_thai"`
	GhiChu        *string    `json:"ghi_chu"`
}

func (i UpdateThueDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.TrangThai,
			validation.In((*uint8)(nil), uint8(1), uint8(2), uint8(3), uint8(4), uint8(5)).Error("Trạng thái không hợp lệ (1-5)"),
		),
		validation.Field(&i.LoaiCoc,
			validation.In((*uint8)(nil), uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ"),
		),
	)
}
