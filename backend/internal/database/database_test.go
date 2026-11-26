package database

import (
	"testing"

	"miumiu-rent-stuff/internal/model"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.CaiDat{}, &model.NguoiDung{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestEnsureDefaultData_DevSeedsSettingsAndAccountsIdempotently(t *testing.T) {
	db := setupTestDB(t)

	if err := EnsureDefaultData(db, true); err != nil {
		t.Fatalf("EnsureDefaultData(true) failed: %v", err)
	}

	// Kiểm tra cài đặt mặc định
	var settingsCount int64
	db.Model(&model.CaiDat{}).Count(&settingsCount)
	if settingsCount != 2 {
		t.Fatalf("expected 2 default settings, got %d", settingsCount)
	}

	// Kiểm tra tất cả tài khoản mặc định đã được tạo và khớp mật khẩu bcrypt
	expectedAccounts := DefaultDevAccounts()
	var userCount int64
	db.Model(&model.NguoiDung{}).Count(&userCount)
	if int(userCount) != len(expectedAccounts) {
		t.Fatalf("expected %d default accounts, got %d", len(expectedAccounts), userCount)
	}

	for _, acc := range expectedAccounts {
		var u model.NguoiDung
		if err := db.Where("email = ?", acc.Email).First(&u).Error; err != nil {
			t.Fatalf("expected account %s to exist: %v", acc.Email, err)
		}
		if u.Ten != acc.Ten {
			t.Fatalf("account %s expected ten=%q, got %q", acc.Email, acc.Ten, u.Ten)
		}
		if err := bcrypt.CompareHashAndPassword([]byte(u.MatKhau), []byte(acc.MatKhau)); err != nil {
			t.Fatalf("account %s password hash mismatch: %v", acc.Email, err)
		}
	}

	// Gọi lại lần 2 không gây trùng lặp
	if err := EnsureDefaultData(db, true); err != nil {
		t.Fatalf("second EnsureDefaultData(true) failed: %v", err)
	}
	db.Model(&model.NguoiDung{}).Count(&userCount)
	if int(userCount) != len(expectedAccounts) {
		t.Fatalf("expected %d accounts after second call, got %d", len(expectedAccounts), userCount)
	}
}

func TestEnsureDefaultData_ReleaseSkipsDevAccounts(t *testing.T) {
	db := setupTestDB(t)

	if err := EnsureDefaultData(db, false); err != nil {
		t.Fatalf("EnsureDefaultData(false) failed: %v", err)
	}

	var settingsCount int64
	db.Model(&model.CaiDat{}).Count(&settingsCount)
	if settingsCount != 2 {
		t.Fatalf("expected 2 default settings, got %d", settingsCount)
	}

	var userCount int64
	db.Model(&model.NguoiDung{}).Count(&userCount)
	if userCount != 0 {
		t.Fatalf("expected 0 users when seedDevAdmin=false, got %d", userCount)
	}
}

func TestSeedUser_NormalizationIdempotencyAndValidation(t *testing.T) {
	db := setupTestDB(t)

	created, user, err := SeedUser(db, DefaultAccount{
		Ten:     "  Thu Hà  ",
		Email:   "  ThuHa@MiuMiu.VN ",
		MatKhau: "matkhau123",
	})
	if err != nil {
		t.Fatalf("SeedUser failed: %v", err)
	}
	if !created {
		t.Fatal("expected created=true")
	}
	if user.Email != "thuha@miumiu.vn" || user.Ten != "Thu Hà" {
		t.Fatalf("unexpected normalized user: %+v", user)
	}

	// Trùng email khác chữ hoa/thường → không tạo mới và không ghi đè mật khẩu cũ
	created2, user2, err := SeedUser(db, DefaultAccount{
		Ten:     "Tên Khác",
		Email:   "THUHA@MIUMIU.VN",
		MatKhau: "matkhaukhac",
	})
	if err != nil {
		t.Fatalf("second SeedUser failed: %v", err)
	}
	if created2 {
		t.Fatal("expected created=false for duplicate email")
	}
	if user2.ID != user.ID {
		t.Fatalf("expected existing user ID %d, got %d", user.ID, user2.ID)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user2.MatKhau), []byte("matkhau123")); err != nil {
		t.Fatalf("existing password should remain unchanged: %v", err)
	}

	// Các trường hợp dữ liệu không hợp lệ
	invalidCases := []DefaultAccount{
		{Ten: "   ", Email: "a@miumiu.vn", MatKhau: "123456"},
		{Ten: "Valid", Email: "not-an-email", MatKhau: "123456"},
		{Ten: "Valid", Email: "short@miumiu.vn", MatKhau: "12345"},
	}
	for _, tc := range invalidCases {
		if _, _, err := SeedUser(db, tc); err == nil {
			t.Fatalf("expected validation error for %+v", tc)
		}
	}
}
