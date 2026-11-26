package service

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	ErrPhieuNotFound   = errors.New("không tìm thấy phiếu thuê")
	ErrPhieuDaKetThuc  = errors.New("phiếu đã kết thúc, không thể sửa")
	ErrKhachHangNotFound = errors.New("khách hàng không tồn tại")
)

// ThueDoService chứa logic nghiệp vụ phức tạp cho phiếu thuê
type ThueDoService struct {
	db *gorm.DB
}

func NewThueDoService(db *gorm.DB) *ThueDoService {
	return &ThueDoService{db: db}
}

// KiemTraTrungLich kiểm tra sản phẩm có bị trùng lịch không.
// Trả về error nếu trùng, kèm tên/mã sản phẩm và thông tin phiếu xung đột.
func (s *ThueDoService) KiemTraTrungLich(sanPhamID uint, newStart, newEnd time.Time, excludeThueDoID uint) error {
	now := time.Now()
	var conflict model.ThueDo
	q := s.db.
		Joins("JOIN chi_tiet_thue_do ct ON ct.thue_do_id = thue_do.id").
		Where("ct.san_pham_id = ? AND thue_do.trang_thai IN (1, 2, 4)", sanPhamID).
		Where("thue_do.ngay_bat_dau < ? AND (thue_do.ngay_hen_tra > ? OR (thue_do.trang_thai IN (2, 4) AND ? >= ?))",
			newEnd, newStart, now, newStart)

	if excludeThueDoID > 0 {
		q = q.Where("thue_do.id != ?", excludeThueDoID)
	}

	err := q.First(&conflict).Error
	if err == nil {
		var sp model.SanPham
		spLabel := fmt.Sprintf("Sản phẩm ID %d", sanPhamID)
		if s.db.Select("ten_san_pham, ma_san_pham").First(&sp, sanPhamID).Error == nil {
			spLabel = fmt.Sprintf("%s (%s)", sp.TenSanPham, sp.MaSanPham)
		}

		start := ""
		end := ""
		if conflict.NgayBatDau != nil {
			start = conflict.NgayBatDau.Format("02/01/2006")
		}
		if conflict.NgayHenTra != nil {
			end = conflict.NgayHenTra.Format("02/01/2006")
		}
		if conflict.TrangThai == 4 {
			return fmt.Errorf("%s đang quá hạn chưa trả từ %s đến %s (phiếu %s)",
				spLabel, start, end, conflict.MaPhieuThue)
		}
		return fmt.Errorf("%s đã có lịch thuê từ %s đến %s (phiếu %s)",
			spLabel, start, end, conflict.MaPhieuThue)
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
	return layPhamTramCoc(s.db)
}

func layPhamTramCoc(db *gorm.DB) decimal.Decimal {
	var cd model.CaiDat
	if err := db.Where("khoa = 'pham_tram_gia_coc'").First(&cd).Error; err != nil {
		return decimal.NewFromInt(85) // Mặc định 85%
	}
	if cd.GiaTri == nil {
		return decimal.NewFromInt(85)
	}
	val, err := strconv.ParseFloat(strings.TrimSpace(*cd.GiaTri), 64)
	if err != nil || val < 0 {
		return decimal.NewFromInt(85)
	}
	return decimal.NewFromFloat(val)
}

func setEncodedGhiChu(updates map[string]interface{}, ghiChu *string, tienShip decimal.Decimal) {
	encoded := model.EncodeThueDoGhiChu(ghiChu, tienShip)
	if encoded == nil {
		updates["ghi_chu"] = nil
	} else {
		updates["ghi_chu"] = *encoded
	}
}

// TaoPhieu tạo phiếu thuê với đầy đủ logic nghiệp vụ trong 1 transaction
func (s *ThueDoService) TaoPhieu(input model.CreateThueDoInput, nguoiDungID uint) (*model.ThueDo, error) {
	var thueDo model.ThueDo

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 0. Kiểm tra khách hàng tồn tại
		var kh model.KhachHang
		if err := tx.First(&kh, input.KhachHangID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrKhachHangNotFound
			}
			return err
		}

		// 1. Xác định ngày bắt đầu và ngày hẹn trả
		now := time.Now()
		ngayBatDau := now
		if input.NgayBatDau != nil {
			ngayBatDau = *input.NgayBatDau
		}

		soNgay := uint16(1)
		if input.SoNgayThue != nil && *input.SoNgayThue > 0 {
			soNgay = *input.SoNgayThue
		}

		ngayHenTra := ngayBatDau.Add(time.Duration(soNgay) * 24 * time.Hour)
		if input.NgayHenTra != nil {
			ngayHenTra = *input.NgayHenTra
		}
		if ngayHenTra.Before(ngayBatDau) {
			return errors.New("ngày hẹn trả không được trước ngày bắt đầu")
		}

		// Xác định trạng thái phiếu
		trangThai := uint8(1) // Chờ xác nhận (đặt trước)
		if !ngayBatDau.After(now) {
			// Ngày bắt đầu là hiện tại hoặc quá khứ → Đang thuê luôn
			trangThai = 2
		}

		// 2. Lấy thông tin từng sản phẩm, kiểm tra trùng lịch
		phamTramCoc := layPhamTramCoc(tx)
		svc := &ThueDoService{db: tx}
		var chiTietList []model.ChiTietThueDo
		seenSP := make(map[uint]bool, len(input.ChiTiet))

		for _, ct := range input.ChiTiet {
			if seenSP[ct.SanPhamID] {
				return errors.New("một sản phẩm chỉ xuất hiện một lần trong một phiếu thuê")
			}
			seenSP[ct.SanPhamID] = true

			var sp model.SanPham
			if err := tx.First(&sp, ct.SanPhamID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("sản phẩm ID %d không tồn tại", ct.SanPhamID)
				}
				return err
			}

			// Không cho chọn sản phẩm Đang bảo dưỡng
			if sp.TrangThai == 3 {
				return fmt.Errorf("sản phẩm '%s' (%s) đang bảo dưỡng, không thể thêm vào phiếu", sp.TenSanPham, sp.MaSanPham)
			}

			// Nếu nhận đồ ngay (trang_thai = 2), sản phẩm không được đang nằm ở tiệm khách khác
			if trangThai == 2 && sp.TrangThai == 2 {
				return fmt.Errorf("sản phẩm '%s' (%s) hiện đang được cho thuê ở phiếu khác, chưa trả lại tiệm", sp.TenSanPham, sp.MaSanPham)
			}

			// Kiểm tra trùng lịch
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

		// 5. Tiền cọc: nếu CCCD thì bằng 0
		tienCoc := input.TienCoc
		loaiCoc := input.LoaiCoc
		if loaiCoc == 0 {
			loaiCoc = 1
		}
		if loaiCoc == 3 {
			tienCoc = decimal.Zero
		}

		// 6. Tạo phiếu
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
			TienShip:     input.TienShip.Round(2),
			TrangThai:    trangThai,
			GhiChu:       input.GhiChu,
		}

		if err := tx.Create(&thueDo).Error; err != nil {
			return fmt.Errorf("không thể tạo phiếu thuê: %w", err)
		}

		// 7. Tạo chi tiết + đổi trạng thái SP nếu Đang thuê
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
	s.reloadThueDo(&thueDo, thueDo.ID)
	return &thueDo, nil
}

// CapNhatPhieu cập nhật phiếu thuê theo quy tắc trạng thái trong 1 transaction
func (s *ThueDoService) CapNhatPhieu(id uint, input model.UpdateThueDoInput) (*model.ThueDo, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPhieuNotFound
		}
		return nil, err
	}

	if td.TrangThai == 3 || td.TrangThai == 5 {
		return nil, ErrPhieuDaKetThuc
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		svc := &ThueDoService{db: tx}
		updates := map[string]interface{}{}

		if td.TrangThai == 1 {
			// Phiếu Chờ xác nhận: sửa tự do
			ngayBD := time.Now()
			if td.NgayBatDau != nil {
				ngayBD = *td.NgayBatDau
			}
			if input.NgayBatDau != nil {
				ngayBD = *input.NgayBatDau
				updates["ngay_bat_dau"] = ngayBD
			}

			soNgay := uint16(1)
			if td.SoNgayThue != nil && *td.SoNgayThue > 0 {
				soNgay = *td.SoNgayThue
			}
			if input.SoNgayThue != nil {
				soNgay = *input.SoNgayThue
				updates["so_ngay_thue"] = soNgay
			}

			ngayHT := ngayBD.Add(time.Duration(soNgay) * 24 * time.Hour)
			if input.NgayHenTra != nil {
				ngayHT = *input.NgayHenTra
				updates["ngay_hen_tra"] = ngayHT
			} else if input.NgayBatDau != nil || input.SoNgayThue != nil {
				updates["ngay_hen_tra"] = ngayHT
			} else if td.NgayHenTra != nil {
				ngayHT = *td.NgayHenTra
			}

			if ngayHT.Before(ngayBD) {
				return errors.New("ngày hẹn trả không được trước ngày bắt đầu")
			}

			effectiveLoaiCoc := td.LoaiCoc
			if input.LoaiCoc != nil {
				effectiveLoaiCoc = *input.LoaiCoc
				updates["loai_coc"] = effectiveLoaiCoc
			}
			if effectiveLoaiCoc == 3 {
				updates["tien_coc"] = decimal.Zero
			} else if input.TienCoc != nil {
				updates["tien_coc"] = *input.TienCoc
			}

			if len(input.ChiTiet) > 0 {
				// Replace toàn bộ chi tiết trong transaction
				if err := tx.Where("thue_do_id = ?", td.ID).Delete(&model.ChiTietThueDo{}).Error; err != nil {
					return err
				}

				phamTramCoc := layPhamTramCoc(tx)
				seenSP := make(map[uint]bool, len(input.ChiTiet))
				var newChiTiet []model.ChiTietThueDo

				for _, ct := range input.ChiTiet {
					if seenSP[ct.SanPhamID] {
						return errors.New("một sản phẩm chỉ xuất hiện một lần trong một phiếu thuê")
					}
					seenSP[ct.SanPhamID] = true

					var sp model.SanPham
					if err := tx.First(&sp, ct.SanPhamID).Error; err != nil {
						if errors.Is(err, gorm.ErrRecordNotFound) {
							return fmt.Errorf("sản phẩm ID %d không tồn tại", ct.SanPhamID)
						}
						return err
					}
					if sp.TrangThai == 3 {
						return fmt.Errorf("sản phẩm '%s' (%s) đang bảo dưỡng, không thể thêm vào phiếu", sp.TenSanPham, sp.MaSanPham)
					}
					if err := svc.KiemTraTrungLich(sp.ID, ngayBD, ngayHT, td.ID); err != nil {
						return err
					}

					tienCocSP := sp.GiaGocSanPham.Mul(phamTramCoc).Div(decimal.NewFromInt(100))
					newChiTiet = append(newChiTiet, model.ChiTietThueDo{
						ThueDoID:    td.ID,
						SanPhamID:   sp.ID,
						GiaThueNgay: sp.GiaThueNgay,
						TienCoc:     tienCocSP,
					})
				}

				for i := range newChiTiet {
					if err := tx.Create(&newChiTiet[i]).Error; err != nil {
						return err
					}
				}

				updates["tong_tien_thue"] = TinhTongTienThue(newChiTiet, soNgay)
			} else {
				// Không thay đổi danh sách SP, nhưng nếu đổi ngày thì kiểm tra trùng lịch
				if input.NgayBatDau != nil || input.SoNgayThue != nil || input.NgayHenTra != nil {
					for _, ct := range td.ChiTiet {
						if err := svc.KiemTraTrungLich(ct.SanPhamID, ngayBD, ngayHT, td.ID); err != nil {
							return err
						}
					}
				}
				if input.SoNgayThue != nil {
					updates["tong_tien_thue"] = TinhTongTienThue(td.ChiTiet, soNgay)
				}
			}
		} else if td.TrangThai == 2 || td.TrangThai == 4 {
			// Đang thuê / Quá hạn: chỉ sửa so_ngay_thue, tien_phat, ghi_chu (và ngay_hen_tra tương ứng)
			if input.SoNgayThue != nil || input.NgayHenTra != nil {
				ngayBD := time.Now()
				if td.NgayBatDau != nil {
					ngayBD = *td.NgayBatDau
				}

				soNgay := uint16(1)
				if td.SoNgayThue != nil && *td.SoNgayThue > 0 {
					soNgay = *td.SoNgayThue
				}
				if input.SoNgayThue != nil {
					soNgay = *input.SoNgayThue
					updates["so_ngay_thue"] = soNgay
					updates["tong_tien_thue"] = TinhTongTienThue(td.ChiTiet, soNgay)
				}

				ngayHT := ngayBD.Add(time.Duration(soNgay) * 24 * time.Hour)
				if input.NgayHenTra != nil {
					ngayHT = *input.NgayHenTra
				}
				if ngayHT.Before(ngayBD) {
					return errors.New("ngày hẹn trả không được trước ngày bắt đầu")
				}

				// Kiểm tra trùng lịch khi gia hạn với các phiếu khác
				for _, ct := range td.ChiTiet {
					if err := svc.KiemTraTrungLich(ct.SanPhamID, ngayBD, ngayHT, td.ID); err != nil {
						return err
					}
				}

				updates["ngay_hen_tra"] = ngayHT

				// Nếu phiếu đang Quá hạn (4) được gia hạn sang tương lai → trở lại Đang thuê (2)
				if td.TrangThai == 4 && ngayHT.After(time.Now()) {
					updates["trang_thai"] = uint8(2)
				}
			}
			if input.TienPhat != nil {
				updates["tien_phat"] = *input.TienPhat
			}
		}

		effectiveTienShip := td.TienShip
		shipChanged := false
		if input.TienShip != nil {
			effectiveTienShip = input.TienShip.Round(2)
			shipChanged = true
		}

		effectiveGhiChu := td.GhiChu
		noteChanged := false
		if input.GhiChu != nil {
			effectiveGhiChu = input.GhiChu
			noteChanged = true
		}

		if shipChanged || noteChanged {
			setEncodedGhiChu(updates, effectiveGhiChu, effectiveTienShip)
		}

		if len(updates) > 0 {
			return tx.Model(&td).Updates(updates).Error
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.reloadThueDo(&td, id)
	return &td, nil
}

// GiaoDo xử lý giao đồ: Chờ → Đang thuê; SP → Đã cho thuê
func (s *ThueDoService) GiaoDo(id uint, input *model.GiaoDoInput) (*model.ThueDo, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPhieuNotFound
		}
		return nil, err
	}

	if td.TrangThai != 1 {
		return nil, errors.New("chỉ có thể giao đồ cho phiếu Chờ xác nhận")
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Kiểm tra từng sản phẩm sẵn sàng ở tiệm trước khi giao
		for _, ct := range td.ChiTiet {
			var sp model.SanPham
			if err := tx.First(&sp, ct.SanPhamID).Error; err != nil {
				return fmt.Errorf("không tìm thấy sản phẩm ID %d", ct.SanPhamID)
			}
			if sp.TrangThai == 3 {
				return fmt.Errorf("sản phẩm '%s' (%s) đang bảo dưỡng, chưa thể giao cho khách", sp.TenSanPham, sp.MaSanPham)
			}
			if sp.TrangThai == 2 {
				return fmt.Errorf("sản phẩm '%s' (%s) hiện đang được cho thuê ở phiếu khác, chưa trả lại tiệm", sp.TenSanPham, sp.MaSanPham)
			}
		}

		updates := map[string]interface{}{
			"trang_thai": uint8(2),
		}
		if input != nil {
			effectiveLoaiCoc := td.LoaiCoc
			if input.LoaiCoc != nil {
				effectiveLoaiCoc = *input.LoaiCoc
				updates["loai_coc"] = effectiveLoaiCoc
			}
			if effectiveLoaiCoc == 3 {
				updates["tien_coc"] = decimal.Zero
			} else if input.TienCoc != nil {
				updates["tien_coc"] = *input.TienCoc
			}

			effectiveTienShip := td.TienShip
			effectiveGhiChu := td.GhiChu
			needUpdateGhiChu := false

			if input.TienShip != nil {
				effectiveTienShip = input.TienShip.Round(2)
				needUpdateGhiChu = true
			}
			if input.GhiChu != nil && strings.TrimSpace(*input.GhiChu) != "" {
				note := strings.TrimSpace(*input.GhiChu)
				if effectiveGhiChu != nil && strings.TrimSpace(*effectiveGhiChu) != "" {
					note = strings.TrimSpace(*effectiveGhiChu) + " | Giao đồ: " + note
				}
				effectiveGhiChu = &note
				needUpdateGhiChu = true
			}
			if needUpdateGhiChu {
				setEncodedGhiChu(updates, effectiveGhiChu, effectiveTienShip)
			}
		}

		// Đổi trạng thái phiếu → Đang thuê
		if err := tx.Model(&td).Updates(updates).Error; err != nil {
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

	s.reloadThueDo(&td, id)
	return &td, nil
}

// TraDo xử lý trả đồ: Đang thuê/Quá hạn → Đã trả
func (s *ThueDoService) TraDo(id uint, input model.TraDoInput) (*model.ThueDo, *model.XuLyCocResponse, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrPhieuNotFound
		}
		return nil, nil, err
	}

	if td.TrangThai != 2 && td.TrangThai != 4 {
		return nil, nil, errors.New("chỉ có thể trả đồ cho phiếu Đang thuê hoặc Quá hạn")
	}

	if input.TienPhat.IsNegative() {
		return nil, nil, errors.New("tiền phạt không được âm")
	}

	// Validate trạng thái mới cho từng sản phẩm
	spTrangThai := make(map[uint]uint8)
	for _, item := range input.SanPhamTrangThai {
		if item.TrangThai != 1 && item.TrangThai != 3 {
			return nil, nil, errors.New("trạng thái sản phẩm sau khi trả chỉ có thể là Trống lịch (1) hoặc Đang bảo dưỡng (3)")
		}
		spTrangThai[item.SanPhamID] = item.TrangThai
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Cập nhật phiếu → Đã trả
		updates := map[string]interface{}{
			"trang_thai":       uint8(3),
			"tien_phat":        input.TienPhat,
			"ngay_tra_thuc_te": now,
		}
		if input.GhiChu != nil && strings.TrimSpace(*input.GhiChu) != "" {
			note := strings.TrimSpace(*input.GhiChu)
			if td.GhiChu != nil && strings.TrimSpace(*td.GhiChu) != "" {
				note = strings.TrimSpace(*td.GhiChu) + " | Trả đồ: " + note
			}
			setEncodedGhiChu(updates, &note, td.TienShip)
		}
		if err := tx.Model(&td).Updates(updates).Error; err != nil {
			return err
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

	if td.LoaiCoc == 3 {
		if input.TienPhat.IsPositive() {
			xuLyCoc.GhiChu = fmt.Sprintf("Trả lại CCCD và thu tiền phạt %s đ", input.TienPhat.StringFixed(0))
		} else {
			xuLyCoc.GhiChu = "Trả lại CCCD cho khách"
		}
	} else if hoanLai.IsNegative() {
		xuLyCoc.GhiChu = fmt.Sprintf("Khách cần trả thêm %s đ", hoanLai.Abs().StringFixed(0))
	} else if hoanLai.IsPositive() {
		xuLyCoc.GhiChu = fmt.Sprintf("Hoàn lại cọc %s đ cho khách", hoanLai.StringFixed(0))
	} else {
		xuLyCoc.GhiChu = "Không cần hoàn cọc (tiền phạt bằng tiền cọc)"
	}

	s.reloadThueDo(&td, id)
	return &td, xuLyCoc, nil
}

// HuyPhieu hủy phiếu: Chờ/Đang thuê → Đã hủy; SP về Trống nếu đã giao
func (s *ThueDoService) HuyPhieu(id uint, input model.HuyPhieuInput) (*model.ThueDo, error) {
	var td model.ThueDo
	if err := s.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPhieuNotFound
		}
		return nil, err
	}

	if td.TrangThai != 1 && td.TrangThai != 2 {
		return nil, errors.New("chỉ có thể hủy phiếu Chờ xác nhận hoặc Đang thuê")
	}

	lyDo := strings.TrimSpace(input.GhiChu)
	if lyDo == "" {
		return nil, errors.New("lý do hủy không được để trống")
	}

	daGiao := td.TrangThai == 2 // Nếu đang thuê thì đã giao đồ

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// Cập nhật phiếu → Đã hủy
		ghiChu := lyDo
		if td.GhiChu != nil && strings.TrimSpace(*td.GhiChu) != "" {
			ghiChu = strings.TrimSpace(*td.GhiChu) + " | Hủy: " + lyDo
		}
		updates := map[string]interface{}{
			"trang_thai": uint8(5),
		}
		setEncodedGhiChu(updates, &ghiChu, td.TienShip)
		if err := tx.Model(&td).Updates(updates).Error; err != nil {
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

	s.reloadThueDo(&td, id)
	return &td, nil
}

func (s *ThueDoService) reloadThueDo(td *model.ThueDo, id uint) {
	s.db.Preload("KhachHang").Preload("NguoiDung").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(td, id)
}

// UpdateQuaHan cập nhật hàng loạt phiếu Đang thuê (2) quá hạn → Quá hạn (4)
func UpdateQuaHan(db *gorm.DB) (int64, error) {
	now := time.Now()
	result := db.Model(&model.ThueDo{}).
		Where("trang_thai = 2 AND ngay_hen_tra < ?", now).
		Update("trang_thai", 4)
	return result.RowsAffected, result.Error
}
