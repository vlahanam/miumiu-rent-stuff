package router

import (
	"miumiu-rent-stuff/internal/config"
	"miumiu-rent-stuff/internal/handler"
	"miumiu-rent-stuff/internal/hub"
	"miumiu-rent-stuff/internal/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(db *gorm.DB, wsHub *hub.Hub) *gin.Engine {
	return SetupWithConfig(db, wsHub, config.Load())
}

func SetupWithConfig(db *gorm.DB, wsHub *hub.Hub, cfg *config.Config) *gin.Engine {
	if cfg == nil {
		cfg = config.Load()
	}

	r := gin.Default()

	// Middleware toàn cục
	r.Use(middleware.RequestID())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Request-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Disposition, X-Request-ID")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check (không cần auth)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Khởi tạo handlers
	authHandler := handler.NewAuthHandlerWithConfig(db, cfg.JWTSecret, cfg.JWTExpiryHours)
	sanPhamHandler := handler.NewSanPhamHandlerWithHub(db, wsHub)
	khachHangHandler := handler.NewKhachHangHandler(db)
	thueDoHandler := handler.NewThueDoHandler(db, wsHub)
	caiDatHandler := handler.NewCaiDatHandler(db)
	dashboardHandler := handler.NewDashboardHandler(db)
	baoCaoHandler := handler.NewBaoCaoHandler(db)
	wsHandler := handler.NewWSHandler(wsHub)

	v1 := r.Group("/api/v1")
	{
		// --- Auth (không cần auth để login) ---
		auth := v1.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
		}

		// --- WebSocket (hỗ trợ cả Authorization header và ?token= cho trình duyệt) ---
		v1.GET("/ws", middleware.AuthRequiredWithSecret(cfg.JWTSecret, true), wsHandler.ServeWS)

		// --- Routes cần đăng nhập (Bearer header) ---
		protected := v1.Group("")
		protected.Use(middleware.AuthRequiredWithSecret(cfg.JWTSecret, false))
		{
			// Auth profile
			protectedAuth := protected.Group("/auth")
			{
				protectedAuth.GET("/me", authHandler.GetProfile)
				protectedAuth.PUT("/me", authHandler.UpdateProfile)
			}

			// Sản phẩm
			sanPham := protected.Group("/san-pham")
			{
				sanPham.GET("", sanPhamHandler.GetAll)
				sanPham.GET("/:id", sanPhamHandler.GetByID)
				sanPham.POST("", sanPhamHandler.Create)
				sanPham.PUT("/:id", sanPhamHandler.Update)
				sanPham.DELETE("/:id", sanPhamHandler.Delete)
				sanPham.PATCH("/:id/trang-thai", sanPhamHandler.PatchTrangThai)
			}

			// Khách hàng
			khachHang := protected.Group("/khach-hang")
			{
				khachHang.GET("", khachHangHandler.GetAll)
				khachHang.GET("/:id", khachHangHandler.GetByID)
				khachHang.POST("", khachHangHandler.Create)
				khachHang.POST("/tim-theo-sdt", khachHangHandler.TimTheoSDT)
				khachHang.PUT("/:id", khachHangHandler.Update)
				khachHang.DELETE("/:id", khachHangHandler.Delete)
			}

			// Phiếu thuê (không có DELETE)
			thueDo := protected.Group("/thue-do")
			{
				thueDo.GET("", thueDoHandler.GetAll)
				thueDo.GET("/:id", thueDoHandler.GetByID)
				thueDo.POST("", thueDoHandler.Create)
				thueDo.PUT("/:id", thueDoHandler.Update)
				thueDo.POST("/:id/giao-do", thueDoHandler.GiaoDo)
				thueDo.POST("/:id/tra-do", thueDoHandler.TraDo)
				thueDo.POST("/:id/huy", thueDoHandler.HuyPhieu)
			}

			// Cài đặt
			caiDat := protected.Group("/cai-dat")
			{
				caiDat.GET("", caiDatHandler.GetAll)
				caiDat.PUT("/:khoa", caiDatHandler.UpdateByKhoa)
			}

			// Dashboard
			protected.GET("/dashboard", dashboardHandler.GetDashboard)

			// Báo cáo
			baoCao := protected.Group("/bao-cao")
			{
				baoCao.GET("/doanh-thu", baoCaoHandler.GetDoanhThu)
				baoCao.GET("/phieu-thue", baoCaoHandler.GetPhieuThue)
				baoCao.GET("/hieu-qua-san-pham", baoCaoHandler.GetHieuQuaSanPham)
				baoCao.GET("/khach-hang", baoCaoHandler.GetKhachHang)
				baoCao.GET("/xuat-excel", baoCaoHandler.XuatExcel)
				baoCao.GET("/xuat-csv", baoCaoHandler.XuatCSV)
			}
		}
	}

	return r
}
