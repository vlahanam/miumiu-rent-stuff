package database

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"miumiu-rent-stuff/internal/model"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	mysqlDriver "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect() (*gorm.DB, error) {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "3306"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbName,
	)

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Database connected successfully")
	return db, nil
}

// DefaultAccount mô tả thông tin một tài khoản nhân viên/chủ tiệm cần seed.
type DefaultAccount struct {
	Ten     string
	Email   string
	MatKhau string
}

// DefaultDevAccounts trả về danh sách tài khoản đăng nhập mặc định cho môi trường phát triển.
func DefaultDevAccounts() []DefaultAccount {
	return []DefaultAccount{
		{
			Ten:     "Chủ tiệm MiuMiu",
			Email:   "admin@miumiu.vn",
			MatKhau: "admin123",
		},
		{
			Ten:     "Nhân viên MiuMiu",
			Email:   "nhanvien@miumiu.vn",
			MatKhau: "nhanvien123",
		},
		{
			Ten:     "Nhân viên quầy 2",
			Email:   "nhanvien2@miumiu.vn",
			MatKhau: "nhanvien123",
		},
	}
}

// SeedUser tạo một tài khoản trong bảng nguoi_dung nếu email chưa tồn tại (idempotent, không ghi đè tài khoản cũ).
// Trả về created=true nếu vừa tạo mới, created=false nếu email đã tồn tại.
func SeedUser(db *gorm.DB, account DefaultAccount) (bool, *model.NguoiDung, error) {
	ten := strings.TrimSpace(account.Ten)
	email := strings.TrimSpace(strings.ToLower(account.Email))
	matKhau := account.MatKhau

	if ten == "" {
		return false, nil, fmt.Errorf("tên người dùng không được để trống")
	}
	if utf8.RuneCountInString(ten) > 100 {
		return false, nil, fmt.Errorf("tên người dùng tối đa 100 ký tự")
	}
	if err := validation.Validate(email, validation.Required, validation.Length(1, 100), is.Email); err != nil {
		return false, nil, fmt.Errorf("email %q không hợp lệ", email)
	}
	if len(matKhau) < 6 {
		return false, nil, fmt.Errorf("mật khẩu tối thiểu 6 ký tự")
	}
	if len(matKhau) > 72 {
		return false, nil, fmt.Errorf("mật khẩu tối đa 72 byte")
	}

	var existing model.NguoiDung
	err := db.Where("LOWER(email) = ?", email).First(&existing).Error
	if err == nil {
		return false, &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, fmt.Errorf("lỗi kiểm tra tài khoản %s: %w", email, err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(matKhau), bcrypt.DefaultCost)
	if err != nil {
		return false, nil, fmt.Errorf("không thể mã hóa mật khẩu cho %s: %w", email, err)
	}

	user := model.NguoiDung{
		Ten:     ten,
		Email:   email,
		MatKhau: string(hash),
	}
	if err := db.Create(&user).Error; err != nil {
		if IsDuplicateKeyError(err) {
			if reloadErr := db.Where("LOWER(email) = ?", email).First(&existing).Error; reloadErr == nil {
				return false, &existing, nil
			}
		}
		return false, nil, fmt.Errorf("không thể khởi tạo tài khoản %s: %w", email, err)
	}

	return true, &user, nil
}

// SeedUsers seed danh sách tài khoản một cách idempotent (bỏ qua các email đã tồn tại).
func SeedUsers(db *gorm.DB, accounts []DefaultAccount) (int, error) {
	createdCount := 0
	for _, acc := range accounts {
		created, _, err := SeedUser(db, acc)
		if err != nil {
			return createdCount, err
		}
		if created {
			createdCount++
			log.Printf("Đã khởi tạo tài khoản: %s (%s)", acc.Email, acc.Ten)
		}
	}
	return createdCount, nil
}

// EnsureDefaultData đảm bảo các bản ghi cài đặt mặc định tồn tại (không sửa schema)
// và tạo bộ tài khoản mặc định trong môi trường dev nếu bảng nguoi_dung đang trống.
func EnsureDefaultData(db *gorm.DB, seedDevAdmin bool) error {
	defaultSettings := []struct {
		Khoa       string
		GiaTri     string
		KieuDuLieu uint8
		MoTa       string
	}{
		{
			Khoa:       "pham_tram_gia_coc",
			GiaTri:     "85",
			KieuDuLieu: 2,
			MoTa:       "Số phần trăm giá trị cọc",
		},
		{
			Khoa:       "so_dien_thoai_lien_he",
			GiaTri:     "0365193713",
			KieuDuLieu: 1,
			MoTa:       "Số điện thoại liên hệ của shop",
		},
	}

	for _, s := range defaultSettings {
		giaTri := s.GiaTri
		moTa := s.MoTa
		var existing model.CaiDat
		err := db.Where("khoa = ?", s.Khoa).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			record := model.CaiDat{
				Khoa:       s.Khoa,
				GiaTri:     &giaTri,
				KieuDuLieu: s.KieuDuLieu,
				MoTa:       &moTa,
			}
			if createErr := db.Create(&record).Error; createErr != nil && !IsDuplicateKeyError(createErr) {
				return fmt.Errorf("không thể khởi tạo cài đặt %s: %w", s.Khoa, createErr)
			}
		} else if err != nil {
			return fmt.Errorf("lỗi kiểm tra cài đặt %s: %w", s.Khoa, err)
		}
	}

	if seedDevAdmin {
		var userCount int64
		if err := db.Model(&model.NguoiDung{}).Count(&userCount).Error; err != nil {
			return fmt.Errorf("lỗi kiểm tra tài khoản người dùng: %w", err)
		}
		if userCount == 0 {
			if _, err := SeedUsers(db, DefaultDevAccounts()); err != nil {
				return err
			}
		}
	}

	return nil
}

// IsDuplicateKeyError kiểm tra lỗi trùng khóa duy nhất (MySQL 1062 hoặc SQLite UNIQUE)
func IsDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	var mysqlErr *mysqlDriver.MySQLError
	if errors.As(err, &mysqlErr) && mysqlErr.Number == 1062 {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "UNIQUE constraint failed")
}
