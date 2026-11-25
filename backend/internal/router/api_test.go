package router_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"miumiu-rent-stuff/internal/config"
	"miumiu-rent-stuff/internal/database"
	"miumiu-rent-stuff/internal/hub"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/router"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(
		&model.SanPham{},
		&model.NguoiDung{},
		&model.KhachHang{},
		&model.ThueDo{},
		&model.ChiTietThueDo{},
		&model.CaiDat{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	if err := database.EnsureDefaultData(db, true); err != nil {
		t.Fatalf("EnsureDefaultData: %v", err)
	}

	wsHub := hub.NewHub()
	go wsHub.Run()

	cfg := &config.Config{
		JWTSecret:      "test-secret-key",
		JWTExpiryHours: 12,
	}
	return router.SetupWithConfig(db, wsHub, cfg), db
}

func doJSON(t *testing.T, r http.Handler, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestEndToEndAPIWorkflow(t *testing.T) {
	r, _ := setupTestRouter(t)

	// 1. Health check
	w := doJSON(t, r, "GET", "/health", "", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("health expected 200, got %d", w.Code)
	}

	// 2. Protected route without token → 401
	w = doJSON(t, r, "GET", "/api/v1/dashboard", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without token, got %d", w.Code)
	}

	// 3. Login wrong password → 401
	w = doJSON(t, r, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    "admin@miumiu.vn",
		"mat_khau": "wrongpass",
	})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 on wrong password, got %d", w.Code)
	}

	// 4. Login correct password → 200 + JWT
	w = doJSON(t, r, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    "admin@miumiu.vn",
		"mat_khau": "admin123",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", w.Code, w.Body.String())
	}
	var loginResp struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &loginResp)
	token := loginResp.Data.Token
	if token == "" {
		t.Fatal("empty JWT token")
	}

	// 5. Update profile name & password
	w = doJSON(t, r, "PUT", "/api/v1/auth/me", token, map[string]string{
		"ten": "Chủ tiệm Mới",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update profile failed: %d %s", w.Code, w.Body.String())
	}

	// 6. Cài đặt mặc định đã được seed & validate khi sửa
	w = doJSON(t, r, "GET", "/api/v1/cai-dat", token, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("get cai-dat failed: %d", w.Code)
	}
	w = doJSON(t, r, "PUT", "/api/v1/cai-dat/pham_tram_gia_coc", token, map[string]string{"gia_tri": "150"})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for deposit > 100%%, got %d", w.Code)
	}
	w = doJSON(t, r, "PUT", "/api/v1/cai-dat/pham_tram_gia_coc", token, map[string]string{"gia_tri": "80"})
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 updating deposit to 80, got %d %s", w.Code, w.Body.String())
	}

	// 7. Tạo sản phẩm → hệ thống tự sinh mã SKU với prefix "MIU-"
	w = doJSON(t, r, "POST", "/api/v1/san-pham", token, map[string]any{
		"ten_san_pham":     "Áo dài lụa hồng",
		"gia_goc_san_pham": 1000000,
		"gia_thue_ngay":    250000,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("create product failed: %d %s", w.Code, w.Body.String())
	}
	var spResp struct {
		Data struct {
			ID        uint   `json:"id"`
			MaSanPham string `json:"ma_san_pham"`
			Slug      string `json:"slug"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &spResp)
	spID := spResp.Data.ID
	if spResp.Data.MaSanPham != "MIU-001" {
		t.Fatalf("expected auto-generated SKU MIU-001, got %s", spResp.Data.MaSanPham)
	}
	if spResp.Data.Slug != "ao-dai-lua-hong" {
		t.Fatalf("expected slug ao-dai-lua-hong, got %s", spResp.Data.Slug)
	}

	// Tạo SP thứ 2 (kể cả client gửi ma_san_pham tùy ý → hệ thống vẫn tự sinh MIU-002)
	w = doJSON(t, r, "POST", "/api/v1/san-pham", token, map[string]any{
		"ma_san_pham":      "CUSTOM-999",
		"ten_san_pham":     "Áo dài lụa hồng",
		"gia_goc_san_pham": 1000000,
		"gia_thue_ngay":    250000,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("create second product failed: %d %s", w.Code, w.Body.String())
	}
	var sp2Resp struct {
		Data struct {
			ID        uint   `json:"id"`
			MaSanPham string `json:"ma_san_pham"`
			Slug      string `json:"slug"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &sp2Resp)
	if sp2Resp.Data.MaSanPham != "MIU-002" {
		t.Fatalf("expected auto-generated SKU MIU-002, got %s", sp2Resp.Data.MaSanPham)
	}
	if sp2Resp.Data.Slug != "ao-dai-lua-hong-1" {
		t.Fatalf("expected unique slug ao-dai-lua-hong-1, got %s", sp2Resp.Data.Slug)
	}

	// Trùng mã SKU khi sửa → 409; sửa thành chuỗi rỗng → 422
	w = doJSON(t, r, "PUT", fmt.Sprintf("/api/v1/san-pham/%d", sp2Resp.Data.ID), token, map[string]any{
		"ma_san_pham": "MIU-001",
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 on duplicate SKU update, got %d", w.Code)
	}
	w = doJSON(t, r, "PUT", fmt.Sprintf("/api/v1/san-pham/%d", sp2Resp.Data.ID), token, map[string]any{
		"ma_san_pham": "   ",
	})
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 on empty SKU update, got %d %s", w.Code, w.Body.String())
	}
	// Xóa SP thứ 2 (chưa có phiếu thuê) để giữ sạch dữ liệu cho các bước sau
	w = doJSON(t, r, "DELETE", fmt.Sprintf("/api/v1/san-pham/%d", sp2Resp.Data.ID), token, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("delete unused product failed: %d %s", w.Code, w.Body.String())
	}

	// Không cho gán thủ công trạng thái 2 (Đã cho thuê)
	w = doJSON(t, r, "PATCH", fmt.Sprintf("/api/v1/san-pham/%d/trang-thai", spID), token, map[string]any{"trang_thai": 2})
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 setting product manually to rented, got %d", w.Code)
	}

	// 8. Khách hàng: tìm/tạo theo SĐT (chuẩn hóa khoảng trắng)
	w = doJSON(t, r, "POST", "/api/v1/khach-hang/tim-theo-sdt", token, map[string]any{
		"so_dien_thoai": "0912 345 678",
		"ten":           "Trần Minh Anh",
		"dia_chi":       "Hoàn Kiếm, Hà Nội",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("tim-theo-sdt create failed: %d %s", w.Code, w.Body.String())
	}
	var khResp struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
		IsNew bool `json:"is_new"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &khResp)
	khID := khResp.Data.ID
	if !khResp.IsNew {
		t.Fatal("expected is_new=true")
	}

	// Gọi lại cùng SĐT → trả khách cũ is_new=false
	w = doJSON(t, r, "POST", "/api/v1/khach-hang/tim-theo-sdt", token, map[string]any{
		"so_dien_thoai": "0912345678",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("tim-theo-sdt existing failed: %d", w.Code)
	}

	// 9. Tạo phiếu thuê ngay → Đang thuê (2)
	now := time.Now().Add(-1 * time.Minute)
	w = doJSON(t, r, "POST", "/api/v1/thue-do", token, map[string]any{
		"khach_hang_id": khID,
		"ngay_bat_dau":  now.Format(time.RFC3339),
		"so_ngay_thue":  2,
		"loai_coc":      1,
		"tien_coc":      800000,
		"chi_tiet":      []map[string]uint{{"san_pham_id": spID}},
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("create thue-do failed: %d %s", w.Code, w.Body.String())
	}
	var tdResp struct {
		Data struct {
			ID          uint   `json:"id"`
			MaPhieuThue string `json:"ma_phieu_thue"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &tdResp)
	tdID := tdResp.Data.ID

	// 10. Tìm kiếm phiếu thuê theo tên khách & SĐT
	w = doJSON(t, r, "GET", "/api/v1/thue-do?search=Minh+Anh", token, nil)
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte(tdResp.Data.MaPhieuThue)) {
		t.Fatalf("search thue-do by customer name failed: %d %s", w.Code, w.Body.String())
	}

	// 11. Không được sửa SKU SP hoặc xóa SP/KH khi đã có phiếu → 409
	w = doJSON(t, r, "PUT", fmt.Sprintf("/api/v1/san-pham/%d", spID), token, map[string]any{"ma_san_pham": "NEW-SKU"})
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 changing SKU after rental, got %d", w.Code)
	}
	w = doJSON(t, r, "DELETE", fmt.Sprintf("/api/v1/san-pham/%d", spID), token, nil)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 deleting rented product, got %d", w.Code)
	}
	w = doJSON(t, r, "DELETE", fmt.Sprintf("/api/v1/khach-hang/%d", khID), token, nil)
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 deleting customer with order, got %d", w.Code)
	}

	// 12. Không được chuyển thủ công SP Đã cho thuê sang Trống lịch hoặc Bảo dưỡng → 409
	w = doJSON(t, r, "PATCH", fmt.Sprintf("/api/v1/san-pham/%d/trang-thai", spID), token, map[string]any{"trang_thai": 1})
	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 switching rented SP back to 1 manually, got %d", w.Code)
	}

	// 13. Trả đồ → Đã trả (3)
	w = doJSON(t, r, "POST", fmt.Sprintf("/api/v1/thue-do/%d/tra-do", tdID), token, map[string]any{
		"tien_phat": 50000,
		"san_pham_trang_thai": []map[string]any{
			{"san_pham_id": spID, "trang_thai": 1},
		},
	})
	if w.Code != http.StatusOK {
		t.Fatalf("tra-do failed: %d %s", w.Code, w.Body.String())
	}

	// 14. Dashboard & Báo cáo trả 200 với số liệu khớp
	for _, ep := range []string{
		"/api/v1/dashboard",
		"/api/v1/bao-cao/doanh-thu",
		"/api/v1/bao-cao/phieu-thue",
		"/api/v1/bao-cao/hieu-qua-san-pham",
		"/api/v1/bao-cao/khach-hang",
		"/api/v1/bao-cao/xuat-excel?loai=phieu_thue",
		"/api/v1/bao-cao/xuat-csv?loai=doanh_thu",
	} {
		w = doJSON(t, r, "GET", ep, token, nil)
		if w.Code != http.StatusOK {
			t.Fatalf("endpoint %s failed: %d %s", ep, w.Code, w.Body.String())
		}
	}

	// 15. Không có endpoint DELETE /api/v1/thue-do/:id
	w = doJSON(t, r, "DELETE", fmt.Sprintf("/api/v1/thue-do/%d", tdID), token, nil)
	if w.Code != http.StatusNotFound && w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected 404/405 for DELETE thue-do, got %d", w.Code)
	}

	// 16. Kiểm tra doanh thu chi tiết sản phẩm khớp với báo cáo hiệu quả sản phẩm (250k * 2 + 50k = 550k)
	w = doJSON(t, r, "GET", fmt.Sprintf("/api/v1/san-pham/%d", spID), token, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("get san-pham detail failed: %d", w.Code)
	}
	var spDetailResp struct {
		Data struct {
			SoLanThue    int64  `json:"so_lan_thue"`
			TongDoanhThu string `json:"tong_doanh_thu"`
			DaThuHoiVon  bool   `json:"da_thu_hoi_von"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &spDetailResp)
	if spDetailResp.Data.SoLanThue != 1 || spDetailResp.Data.TongDoanhThu != "550000" || spDetailResp.Data.DaThuHoiVon {
		t.Fatalf("unexpected san-pham detail stats: %+v", spDetailResp.Data)
	}

	// 17. Kiểm tra filter khách hàng (khach_moi vs dang_thue)
	w = doJSON(t, r, "GET", "/api/v1/khach-hang?filter=dang_thue", token, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("khach-hang filter=dang_thue failed: %d", w.Code)
	}
	w = doJSON(t, r, "GET", "/api/v1/khach-hang?filter=khach_moi", token, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("khach-hang filter=khach_moi failed: %d", w.Code)
	}

	// 18. WebSocket từ chối khi thiếu token, chấp nhận khi truyền ?token=
	w = doJSON(t, r, "GET", "/api/v1/ws", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 on ws without token, got %d", w.Code)
	}
	w = doJSON(t, r, "GET", "/api/v1/ws?token="+token, "", nil)
	// Không phải upgrade request nên gorilla/websocket trả 400 (chứng tỏ đã vượt qua auth 401!)
	if w.Code == http.StatusUnauthorized {
		t.Fatalf("expected ws query token to pass auth, got 401")
	}
}

func TestSanPhamAutoGeneratedSKUAndConcurrency(t *testing.T) {
	r, db := setupTestRouter(t)
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("get sql.DB: %v", err)
	}
	// SQLite in-memory cần 1 connection chung cho các goroutine
	sqlDB.SetMaxOpenConns(1)

	w := doJSON(t, r, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    "admin@miumiu.vn",
		"mat_khau": "admin123",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("login failed: %d", w.Code)
	}
	var loginResp struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &loginResp)
	token := loginResp.Data.Token

	// 1. Tạo tuần tự 3 sản phẩm → MIU-001, MIU-002, MIU-003
	var ids []uint
	for i := 1; i <= 3; i++ {
		w = doJSON(t, r, "POST", "/api/v1/san-pham", token, map[string]any{
			"ten_san_pham":     fmt.Sprintf("Áo dài mẫu %d", i),
			"gia_goc_san_pham": 1500000,
			"gia_thue_ngay":    300000,
		})
		if w.Code != http.StatusCreated {
			t.Fatalf("create #%d failed: %d %s", i, w.Code, w.Body.String())
		}
		var resp struct {
			Data struct {
				ID        uint   `json:"id"`
				MaSanPham string `json:"ma_san_pham"`
			} `json:"data"`
		}
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		wantSKU := fmt.Sprintf("MIU-%03d", i)
		if resp.Data.MaSanPham != wantSKU {
			t.Fatalf("expected %s, got %s", wantSKU, resp.Data.MaSanPham)
		}
		ids = append(ids, resp.Data.ID)
	}

	// 2. Sửa SKU của SP chưa có phiếu thuê lên MIU-010 → sản phẩm tiếp theo phải là MIU-011
	w = doJSON(t, r, "PUT", fmt.Sprintf("/api/v1/san-pham/%d", ids[2]), token, map[string]any{
		"ma_san_pham": "MIU-010",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update SKU failed: %d %s", w.Code, w.Body.String())
	}
	w = doJSON(t, r, "POST", "/api/v1/san-pham", token, map[string]any{
		"ten_san_pham":     "Áo dài sau khi nâng mã",
		"gia_goc_san_pham": 1800000,
		"gia_thue_ngay":    350000,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("create after manual SKU bump failed: %d %s", w.Code, w.Body.String())
	}
	var afterBump struct {
		Data struct {
			MaSanPham string `json:"ma_san_pham"`
		} `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &afterBump)
	if afterBump.Data.MaSanPham != "MIU-011" {
		t.Fatalf("expected MIU-011, got %s", afterBump.Data.MaSanPham)
	}

	// 3. Tạo đồng thời nhiều sản phẩm cùng tên → tất cả thành công với mã MIU- duy nhất
	const workers = 5
	var wg sync.WaitGroup
	skus := make(chan string, workers)
	errs := make(chan error, workers)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			respRec := doJSON(t, r, "POST", "/api/v1/san-pham", token, map[string]any{
				"ten_san_pham":     "Áo dài đồng thời",
				"gia_goc_san_pham": 1200000,
				"gia_thue_ngay":    250000,
			})
			if respRec.Code != http.StatusCreated {
				errs <- fmt.Errorf("concurrent create status %d: %s", respRec.Code, respRec.Body.String())
				return
			}
			var res struct {
				Data struct {
					MaSanPham string `json:"ma_san_pham"`
				} `json:"data"`
			}
			_ = json.Unmarshal(respRec.Body.Bytes(), &res)
			skus <- res.Data.MaSanPham
		}()
	}
	wg.Wait()
	close(skus)
	close(errs)

	for err := range errs {
		t.Fatal(err)
	}
	seen := make(map[string]bool)
	for sku := range skus {
		if !strings.HasPrefix(sku, "MIU-") {
			t.Fatalf("expected prefix MIU-, got %s", sku)
		}
		if seen[sku] {
			t.Fatalf("duplicate SKU generated concurrently: %s", sku)
		}
		seen[sku] = true
	}
	if len(seen) != workers {
		t.Fatalf("expected %d unique SKUs, got %d", workers, len(seen))
	}
}
