package model

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	thueDoMetaPrefix = "[[miumiu_meta:"
	thueDoMetaSuffix = "]]"
)

type thueDoMeta struct {
	TienShip string `json:"tien_ship"`
}

// EncodeThueDoGhiChu mã hóa tiền ship vào cột ghi_chu để giữ nguyên schema DB.
// Khi tien_ship = 0 và ghi_chu không trùng tiền tố nội bộ, lưu nguyên văn ghi_chu.
func EncodeThueDoGhiChu(ghiChu *string, tienShip decimal.Decimal) *string {
	if tienShip.IsNegative() {
		tienShip = decimal.Zero
	}
	normalizedShip := tienShip.Round(2)

	var note string
	if ghiChu != nil {
		note = *ghiChu
	}

	if normalizedShip.IsZero() {
		if note == "" {
			return nil
		}
		if !strings.HasPrefix(note, thueDoMetaPrefix) {
			n := note
			return &n
		}
	}

	payload, err := json.Marshal(thueDoMeta{
		TienShip: normalizedShip.String(),
	})
	if err != nil {
		if note == "" {
			return nil
		}
		n := note
		return &n
	}

	header := thueDoMetaPrefix + string(payload) + thueDoMetaSuffix
	if note == "" {
		return &header
	}
	combined := header + "\n" + note
	return &combined
}

// DecodeThueDoGhiChu tách tiền ship và ghi chú gốc của người dùng từ cột ghi_chu.
func DecodeThueDoGhiChu(raw *string) (*string, decimal.Decimal) {
	if raw == nil {
		return nil, decimal.Zero
	}
	s := *raw
	if !strings.HasPrefix(s, thueDoMetaPrefix) {
		n := s
		return &n, decimal.Zero
	}

	restAfterPrefix := s[len(thueDoMetaPrefix):]
	endIdx := strings.Index(restAfterPrefix, thueDoMetaSuffix)
	if endIdx < 0 {
		n := s
		return &n, decimal.Zero
	}

	var meta thueDoMeta
	if err := json.Unmarshal([]byte(restAfterPrefix[:endIdx]), &meta); err != nil {
		n := s
		return &n, decimal.Zero
	}

	ship, err := decimal.NewFromString(strings.TrimSpace(meta.TienShip))
	if err != nil || ship.IsNegative() {
		n := s
		return &n, decimal.Zero
	}

	remainder := restAfterPrefix[endIdx+len(thueDoMetaSuffix):]
	if remainder == "" {
		return nil, ship
	}
	if strings.HasPrefix(remainder, "\n") {
		remainder = remainder[1:]
		if remainder == "" {
			return nil, ship
		}
		return &remainder, ship
	}

	n := s
	return &n, decimal.Zero
}

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
	TienShip      decimal.Decimal `json:"tien_ship"        gorm:"-"`
	TrangThai     uint8           `json:"trang_thai"       gorm:"column:trang_thai;type:tinyint unsigned;not null;default:1"`
	GhiChu        *string         `json:"ghi_chu"          gorm:"column:ghi_chu;type:text"`
	NgayTao       time.Time       `json:"ngay_tao"         gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat   time.Time       `json:"ngay_cap_nhat"    gorm:"column:ngay_cap_nhat;autoUpdateTime"`

	// Associations
	KhachHang *KhachHang      `json:"khach_hang,omitempty"  gorm:"foreignKey:KhachHangID"`
	NguoiDung *NguoiDung      `json:"nguoi_dung,omitempty"  gorm:"foreignKey:NguoiDungID"`
	ChiTiet   []ChiTietThueDo `json:"chi_tiet,omitempty"    gorm:"foreignKey:ThueDoID"`
}

func (ThueDo) TableName() string { return "thue_do" }

func (t *ThueDo) BeforeCreate(_ *gorm.DB) error {
	if t.TienShip.IsNegative() {
		t.TienShip = decimal.Zero
	}
	t.TienShip = t.TienShip.Round(2)
	t.GhiChu = EncodeThueDoGhiChu(t.GhiChu, t.TienShip)
	return nil
}

func (t *ThueDo) AfterCreate(_ *gorm.DB) error {
	t.GhiChu, t.TienShip = DecodeThueDoGhiChu(t.GhiChu)
	return nil
}

func (t *ThueDo) AfterFind(_ *gorm.DB) error {
	t.GhiChu, t.TienShip = DecodeThueDoGhiChu(t.GhiChu)
	return nil
}

// ChiTietThueDo maps to table `chi_tiet_thue_do`
type ChiTietThueDo struct {
	ID          uint            `json:"id"            gorm:"primaryKey;autoIncrement"`
	ThueDoID    uint            `json:"thue_do_id"    gorm:"column:thue_do_id;not null"`
	SanPhamID   uint            `json:"san_pham_id"   gorm:"column:san_pham_id;not null"`
	GiaThueNgay decimal.Decimal `json:"gia_thue_ngay" gorm:"column:gia_thue_ngay;type:decimal(12,2);not null;default:0"`
	TienCoc     decimal.Decimal `json:"tien_coc"      gorm:"column:tien_coc;type:decimal(12,2);not null;default:0"`

	// Associations
	SanPham *SanPham `json:"san_pham,omitempty" gorm:"foreignKey:SanPhamID"`
}

func (ChiTietThueDo) TableName() string { return "chi_tiet_thue_do" }

// ChiTietThueDoInput - client chỉ gửi san_pham_id
type ChiTietThueDoInput struct {
	SanPhamID uint `json:"san_pham_id" binding:"required"`
}

func validateUniqueChiTiet(value interface{}) error {
	items, ok := value.([]ChiTietThueDoInput)
	if !ok {
		return nil
	}
	seen := make(map[uint]bool, len(items))
	for _, item := range items {
		if item.SanPhamID == 0 {
			return errors.New("mã sản phẩm không hợp lệ")
		}
		if seen[item.SanPhamID] {
			return errors.New("một sản phẩm chỉ xuất hiện một lần trong một phiếu thuê")
		}
		seen[item.SanPhamID] = true
	}
	return nil
}

// CreateThueDoInput dùng cho POST /thue-do
// Backend tự sinh: ma_phieu_thue, tong_tien_thue, trang_thai, nguoi_dung_id (từ JWT)
type CreateThueDoInput struct {
	KhachHangID uint                 `json:"khach_hang_id" binding:"required"`
	NgayBatDau  *time.Time           `json:"ngay_bat_dau"`
	NgayHenTra  *time.Time           `json:"ngay_hen_tra"`
	SoNgayThue  *uint16              `json:"so_ngay_thue"  binding:"required"`
	LoaiCoc     uint8                `json:"loai_coc"`
	TienCoc     decimal.Decimal      `json:"tien_coc"`
	TienShip    decimal.Decimal      `json:"tien_ship"`
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
			validation.Min(uint16(1)).Error("Số ngày thuê phải lớn hơn hoặc bằng 1"),
		),
		validation.Field(&i.LoaiCoc,
			validation.In(uint8(0), uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ (1=Tiền mặt, 2=Chuyển khoản, 3=CCCD)"),
		),
		validation.Field(&i.TienCoc, validateNonNegativeDecimal("Tiền cọc")),
		validation.Field(&i.TienShip, validateNonNegativeDecimal("Tiền ship")),
		validation.Field(&i.ChiTiet,
			validation.Required.Error("Phiếu thuê phải có ít nhất 1 sản phẩm"),
			validation.By(validateUniqueChiTiet),
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
	TienShip   *decimal.Decimal `json:"tien_ship"`
	GhiChu     *string          `json:"ghi_chu"`
	// Phiếu Chờ: có thể gửi thêm chi_tiet để replace
	ChiTiet []ChiTietThueDoInput `json:"chi_tiet"`
}

func (i UpdateThueDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.SoNgayThue,
			validation.Min(uint16(1)).Error("Số ngày thuê phải lớn hơn hoặc bằng 1"),
		),
		validation.Field(&i.LoaiCoc,
			validation.In(uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ (1=Tiền mặt, 2=Chuyển khoản, 3=CCCD)"),
		),
		validation.Field(&i.TienCoc, validateNonNegativeDecimal("Tiền cọc")),
		validation.Field(&i.TienPhat, validateNonNegativeDecimal("Tiền phạt")),
		validation.Field(&i.TienShip, validateNonNegativeDecimal("Tiền ship")),
		validation.Field(&i.ChiTiet, validation.By(validateUniqueChiTiet)),
	)
}

// GiaoDoInput cho POST /thue-do/:id/giao-do (tùy chọn xác nhận lại cọc và tiền ship khi giao đồ)
type GiaoDoInput struct {
	LoaiCoc  *uint8           `json:"loai_coc"`
	TienCoc  *decimal.Decimal `json:"tien_coc"`
	TienShip *decimal.Decimal `json:"tien_ship"`
	GhiChu   *string          `json:"ghi_chu"`
}

func (i GiaoDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.LoaiCoc,
			validation.In(uint8(1), uint8(2), uint8(3)).Error("Loại cọc không hợp lệ (1=Tiền mặt, 2=Chuyển khoản, 3=CCCD)"),
		),
		validation.Field(&i.TienCoc, validateNonNegativeDecimal("Tiền cọc")),
		validation.Field(&i.TienShip, validateNonNegativeDecimal("Tiền ship")),
	)
}

// TraDoInput dùng cho POST /thue-do/:id/tra-do
type TraDoInput struct {
	TienPhat         decimal.Decimal        `json:"tien_phat"`
	GhiChu           *string                `json:"ghi_chu"`
	SanPhamTrangThai []SanPhamTrangThaiItem `json:"san_pham_trang_thai" binding:"required"`
}

// SanPhamTrangThaiItem - trạng thái từng SP khi trả đồ
type SanPhamTrangThaiItem struct {
	SanPhamID uint  `json:"san_pham_id" binding:"required"`
	TrangThai uint8 `json:"trang_thai" binding:"required"` // 1=Trống lịch, 3=Đang bảo dưỡng
}

func (i SanPhamTrangThaiItem) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.SanPhamID, validation.Required.Error("Mã sản phẩm không được để trống")),
		validation.Field(&i.TrangThai,
			validation.Required.Error("Trạng thái sản phẩm không được để trống"),
			validation.In(uint8(1), uint8(3)).Error("Trạng thái sau trả đồ chỉ có thể là Trống lịch (1) hoặc Đang bảo dưỡng (3)"),
		),
	)
}

func (i TraDoInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.TienPhat, validateNonNegativeDecimal("Tiền phạt")),
		validation.Field(&i.SanPhamTrangThai,
			validation.Required.Error("Danh sách trạng thái sản phẩm không được để trống"),
			validation.Each(),
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
			validation.By(func(value interface{}) error {
				s, _ := value.(string)
				if strings.TrimSpace(s) == "" {
					return errors.New("Lý do hủy không được để trống")
				}
				return nil
			}),
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
