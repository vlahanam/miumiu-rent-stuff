package config

import (
	"os"
	"strconv"
)

// Config chứa tất cả cấu hình môi trường
type Config struct {
	AppPort        string
	GinMode        string
	JWTSecret      string
	JWTExpiryHours int
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
}

// Load đọc biến môi trường và trả về Config
func Load() *Config {
	jwtExpiry := 24
	if v := os.Getenv("JWT_EXPIRY_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			jwtExpiry = n
		}
	}

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "miumiu-secret-key-change-in-production"
	}

	return &Config{
		AppPort:        port,
		GinMode:        ginMode,
		JWTSecret:      jwtSecret,
		JWTExpiryHours: jwtExpiry,
		DBHost:         getEnvOrDefault("DB_HOST", "localhost"),
		DBPort:         getEnvOrDefault("DB_PORT", "3306"),
		DBUser:         os.Getenv("DB_USER"),
		DBPassword:     os.Getenv("DB_PASSWORD"),
		DBName:         os.Getenv("DB_NAME"),
	}
}

func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
