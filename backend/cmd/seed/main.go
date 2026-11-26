package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"miumiu-rent-stuff/internal/database"
)

func main() {
	ten := flag.String("ten", "", "Tên hiển thị của tài khoản cần tạo thêm")
	email := flag.String("email", "", "Email đăng nhập của tài khoản cần tạo thêm")
	matKhau := flag.String("mat-khau", "", "Mật khẩu đăng nhập (tối thiểu 6 ký tự)")
	flag.Parse()

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Không thể kết nối database: %v", err)
	}

	// Luôn đảm bảo các bản ghi cài đặt mặc định tồn tại
	if err := database.EnsureDefaultData(db, false); err != nil {
		log.Fatalf("Không thể khởi tạo dữ liệu cài đặt mặc định: %v", err)
	}

	hasCustomFlag := *ten != "" || *email != "" || *matKhau != ""
	if hasCustomFlag {
		if *ten == "" || *email == "" || *matKhau == "" {
			fmt.Fprintln(os.Stderr, "Vui lòng truyền đầy đủ 3 cờ: -ten, -email, -mat-khau")
			flag.Usage()
			os.Exit(1)
		}
		created, user, err := database.SeedUser(db, database.DefaultAccount{
			Ten:     *ten,
			Email:   *email,
			MatKhau: *matKhau,
		})
		if err != nil {
			log.Fatalf("Không thể seed tài khoản: %v", err)
		}
		if created {
			log.Printf("✅ Đã tạo tài khoản mới: id=%d | ten=%s | email=%s", user.ID, user.Ten, user.Email)
		} else {
			log.Printf("ℹ️ Tài khoản đã tồn tại (giữ nguyên): id=%d | ten=%s | email=%s", user.ID, user.Ten, user.Email)
		}
		return
	}

	accounts := database.DefaultDevAccounts()
	createdCount, err := database.SeedUsers(db, accounts)
	if err != nil {
		log.Fatalf("Không thể seed tài khoản mặc định: %v", err)
	}

	log.Printf("✅ Hoàn tất seed tài khoản mặc định (tạo mới: %d / tổng kiểm tra: %d)", createdCount, len(accounts))
}
