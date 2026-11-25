package database

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"miumiu-rent-stuff/internal/model"

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

// EnsureDefaultData đảm bảo các bản ghi cài đặt mặc định tồn tại (không sửa schema)
// và tạo tài khoản admin mặc định trong môi trường dev nếu bảng nguoi_dung đang trống.
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
			if createErr := db.Create(&record).Error; createErr != nil {
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
			hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("không thể mã hóa mật khẩu mặc định: %w", err)
			}
			admin := model.NguoiDung{
				Ten:     "Chủ tiệm MiuMiu",
				Email:   "admin@miumiu.vn",
				MatKhau: string(hash),
			}
			if err := db.Create(&admin).Error; err != nil {
				return fmt.Errorf("không thể khởi tạo tài khoản mặc định: %w", err)
			}
			log.Println("Đã khởi tạo tài khoản dev mặc định: admin@miumiu.vn / admin123")
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
