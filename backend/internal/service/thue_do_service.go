package service

import (
	"errors"
	"fmt"
	"strconv"
	"time"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ThueDoService chứa logic nghiệp vụ phức tạp cho phiếu thuê
type ThueDoService struct {
	db *gorm.DB
}

func NewThueDoService(db *gorm.DB) *ThueDoService {
	return &ThueDoService{db: db}
}

// KiemTraTrungLich kiểm tra sản phẩm có bị trùng lịch không
// Trả về error nếu trùng, kèm thông tin phiếu xung đột
func (s *ThueDoService) KiemTraTrungLich(sanPhamID uint, newStart, newEnd time.Time, excludeThueDoID uint) error {
	var conflict model.ThueDo
	q := s.db.
		Joins("JOIN chi_tiet_thue_do ct ON ct.thue_do_id = thue_do.id").
		Where("ct.san_pham_id = ? AND thue_do.trang_thai IN (1, 2, 4)", sanPhamID).
		Where("thue_do.ngay_bat_dau < ? AND thue_do.ngay_hen_tra > ?", newEnd, newStart)

	if excludeThueDoID > 0 {
		q = q.Where("thue_do.id != ?", excludeThueDoID)
	}

	err := q.First(&conflict).Error
	if err == nil {
		// Tìm thấy xung đột
		start := ""
		end := ""
		if conflict.NgayBatDau != nil {
			start = conflict.NgayBatDau.Format("02/01/2006")
		}
		if conflict.NgayHenTra != nil {
			end = conflict.NgayHenTra.Format("02/01/2006")
		}
		return fmt.Errorf("sản phẩm ID %d đã có lịch thuê từ %s đến %s (phiếu %s)",
			sanPhamID, start, end, conflict.MaPhieuThue)
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	return err
}

// TinhTongTienThue tính tổng tiền thuê từ danh sách chi tiết và số ngày
func TinhTongTienThue(chiTiet []model.ChiTietThueDo, soNgayThue uint16) decimal.Decimal {
	tongGia := decimal.Zero
	for _, ct := range chiTiet {
		tongGia = tongGia.Add(ct.GiaThueNgay)
	}
	return tongGia.Mul(decimal.NewFromInt(int64(soNgayThue)))
}

// LayPhamTramCoc lấy phần trăm cọc từ bảng cai_dat
func (s *ThueDoService) LayPhamTramCoc() decimal.Decimal {
	var cd model.CaiDat
	if err := s.db.Where("khoa = 'pham_tram_gia_coc'").First(&cd).Error; err != nil {
		return decimal.NewFromInt(85) // Mặc định 85%
	}
	if cd.GiaTri == nil {
		return decimal.NewFromInt(85)
	}
	val, err := strconv.ParseFloat(*cd.GiaTri, 64)
	if err != nil {
		return decimal.NewFromInt(85)
	}
	return decimal.NewFromFloat(val)
}

// TaoPhuieu tạo phiếu thuê với đầy đủ logic nghiệp vụ trong 1 transaction
func (s *ThueDoService) TaoPhieu(input model.CreateThueDoInput, nguoiDungID uint) (*model.ThueDo, error) {
	var thueDo model.ThueDo

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Xác định ngày bắt đầu
		now := time.Now()
		ngayBatDau := now
		if input.NgayBatDau != nil {
			ngayBatDau = *input.NgayBatDau
		}

		soNgay := uint16(1)
		if input.SoNgayThue != nil {
			soNgay = *input.SoNgayThue
		}
		ngayHenTra := ngayBatDau.Add(time.Duration(soNgay) * 24 * time.Hour)

		// 2. Lấy thông tin từng sản phẩm, kiểm tra trùng lịch
		phamTramCoc := s.LayPhamTramCoc()
		var chiTietList []model.ChiTietThueDo

		for _, ct := range input.ChiTiet {
			var sp model.SanPham
			if err := tx.First(&sp, ct.SanPhamID).Error; err != nil {
				return fmt.Errorf("sản phẩm ID %d không tồn tại", ct.SanPhamID)
			}

			// Không cho chọn sản phẩm Đang bảo dưỡng
			if sp.TrangThai == 3 {
				return fmt.Errorf("sản phẩm '%s' đang bảo dưỡng, không thể thêm vào phiếu", sp.TenSanPham)
			}

			// Kiểm tra trùng lịch
			svc := &ThueDoService{db: tx}
			if err := svc.KiemTraTrungLich(sp.ID, ngayBatDau, ngayHenTra, 0); err != nil {
				return err
			}

			// Tính tiền cọc gợi ý cho sản phẩm
			tienCocSP := sp.GiaGocSanPham.Mul(phamTramCoc).Div(decimal.NewFromInt(100))

			chiTietList = append(chiTietList, model.ChiTietThueDo{
				SanPhamID:   sp.ID,
				GiaThueNgay: sp.GiaThueNgay, // Snapshot giá tại thời điểm tạo
				TienCoc:     tienCocSP,
			})
		}

		// 3. Tính tổng tiền thuê
		tongTienThue := TinhTongTienThue(chiTietList, soNgay)

		// 4. Sinh mã phiếu
		maPhieu := GenerateMaPhieu(tx)

		// 5. Xác định trạng thái phiếu
		trangThai := uint8(1) // Chờ xác nhận
		if !ngayBatDau.After(now) {
			// Ngày bắt đầu là hôm nay hoặc quá khứ → Đang thuê luôn
			trangThai = 2
		}

		// 6. Tiền cọc: nếu CCCD thì bằng 0
		tienCoc := input.TienCoc
		loaiCoc := input.LoaiCoc
		if loaiCoc == 0 {
			loaiCoc = 1
		}
		if loaiCoc == 3 {
			tienCoc = decimal.Zero
		}

		// 7. Tạo phiếu
		thueDo = model.ThueDo{
			MaPhieuThue:  maPhieu,
			KhachHangID:  input.KhachHangID,
			NguoiDungID:  nguoiDungID,
			NgayBatDau:   &ngayBatDau,
			NgayHenTra:   &ngayHenTra,
			SoNgayThue:   &soNgay,
			TongTienThue: tongTienThue,
			LoaiCoc:      loaiCoc,
			TienCoc:      tienCoc,
			TienPhat:     decimal.Zero,
			TrangThai:    trangThai,
			GhiChu:       input.GhiChu,
		}

		if err := tx.Create(&thueDo).Error; err != nil {
			return fmt.Errorf("không thể tạo phiếu thuê: %w", err)
		}

		// 8. Tạo chi tiết + đổi trạng thái SP nếu Đang thuê
		for i := range chiTietList {
			chiTietList[i].ThueDoID = thueDo.ID
			if err := tx.Create(&chiTietList[i]).Error; err != nil {
				return fmt.Errorf("không thể tạo chi tiết phiếu thuê: %w", err)
			}

			// Nếu phiếu Đang thuê → chuyển SP sang Đã cho thuê
			if trangThai == 2 {
				if err := tx.Model(&model.SanPham{}).Where("id = ?", chiTietList[i].SanPhamID).
					Update("trang_thai", 2).Error; err != nil {
					return fmt.Errorf("không thể cập nhật trạng thái sản phẩm: %w", err)
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload với associations
	s.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&thueDo, thueDo.ID)
	return &thueDo, nil
}

// GiaoDo xử lý giao đồ: Chờ → Đang thuê; SP → Đã cho thuê
func (s *ThueDoService) GiaoDo(id uint) (*model.ThueDo, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		return nil, errors.New("không tìm thấy phiếu thuê")
	}

	if td.TrangThai != 1 {
		return nil, errors.New("chỉ có thể giao đồ cho phiếu Chờ xác nhận")
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Đổi trạng thái phiếu → Đang thuê
		if err := tx.Model(&td).Update("trang_thai", 2).Error; err != nil {
			return err
		}

		// Đổi trạng thái từng SP → Đã cho thuê
		for _, ct := range td.ChiTiet {
			if err := tx.Model(&model.SanPham{}).Where("id = ?", ct.SanPhamID).
				Update("trang_thai", 2).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, id)
	return &td, nil
}

// TraDo xử lý trả đồ: Đang thuê/Quá hạn → Đã trả
func (s *ThueDoService) TraDo(id uint, input model.TraDoInput) (*model.ThueDo, *model.XuLyCocResponse, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		return nil, nil, errors.New("không tìm thấy phiếu thuê")
	}

	if td.TrangThai != 2 && td.TrangThai != 4 {
		return nil, nil, errors.New("chỉ có thể trả đồ cho phiếu Đang thuê hoặc Quá hạn")
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Cập nhật phiếu → Đã trả
		updates := map[string]interface{}{
			"trang_thai":     3,
			"tien_phat":      input.TienPhat,
			"ngay_tra_thuc_te": now,
		}
		if input.GhiChu != nil {
			updates["ghi_chu"] = *input.GhiChu
		}
		if err := tx.Model(&td).Updates(updates).Error; err != nil {
			return err
		}

		// Map sanPhamID → trạng thái mới
		spTrangThai := make(map[uint]uint8)
		for _, item := range input.SanPhamTrangThai {
			spTrangThai[item.SanPhamID] = item.TrangThai
		}

		// Đổi trạng thái từng SP
		for _, ct := range td.ChiTiet {
			newTT := uint8(1) // Mặc định: Trống lịch
			if tt, ok := spTrangThai[ct.SanPhamID]; ok {
				newTT = tt
			}
			if err := tx.Model(&model.SanPham{}).Where("id = ?", ct.SanPhamID).
				Update("trang_thai", newTT).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	// Tính xử lý cọc
	hoanLai := td.TienCoc.Sub(input.TienPhat)
	xuLyCoc := &model.XuLyCocResponse{
		LoaiCoc:  td.LoaiCoc,
		TienCoc:  td.TienCoc,
		TienPhat: input.TienPhat,
		HoanLai:  hoanLai,
	}
	if hoanLai.IsNegative() {
		xuLyCoc.GhiChu = fmt.Sprintf("Khách cần trả thêm %s đ", hoanLai.Abs().StringFixed(0))
	}

	s.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, id)
	return &td, xuLyCoc, nil
}

// HuyPhieu hủy phiếu: Chờ/Đang thuê → Đã hủy; SP về Trống nếu đã giao
func (s *ThueDoService) HuyPhieu(id uint, input model.HuyPhieuInput) (*model.ThueDo, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		return nil, errors.New("không tìm thấy phiếu thuê")
	}

	if td.TrangThai != 1 && td.TrangThai != 2 {
		return nil, errors.New("chỉ có thể hủy phiếu Chờ xác nhận hoặc Đang thuê")
	}

	daGiao := td.TrangThai == 2 // Nếu đang thuê thì đã giao đồ

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Cập nhật phiếu → Đã hủy
		ghiChu := input.GhiChu
		if td.GhiChu != nil && *td.GhiChu != "" {
			ghiChu = *td.GhiChu + " | Hủy: " + input.GhiChu
		}
		if err := tx.Model(&td).Updates(map[string]interface{}{
			"trang_thai": 5,
			"ghi_chu":    ghiChu,
		}).Error; err != nil {
			return err
		}

		// Nếu đã giao đồ → SP về Trống lịch
		if daGiao {
			for _, ct := range td.ChiTiet {
				if err := tx.Model(&model.SanPham{}).Where("id = ?", ct.SanPhamID).
					Update("trang_thai", 1).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, id)
	return &td, nil
}

// UpdateQuaHan cập nhật hàng loạt phiếu Đang thuê (2) quá hạn → Quá hạn (4)
func UpdateQuaHan(db *gorm.DB) (int64, error) {
	now := time.Now()
	result := db.Model(&model.ThueDo{}).
		Where("trang_thai = 2 AND ngay_hen_tra < ?", now).
		Update("trang_thai", 4)
	return result.RowsAffected, result.Error
}
