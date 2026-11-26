package model

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func strPtr(s string) *string { return &s }

func TestEncodeDecodeThueDoGhiChu(t *testing.T) {
	t.Run("nil note and zero ship stays nil", func(t *testing.T) {
		raw := EncodeThueDoGhiChu(nil, decimal.Zero)
		if raw != nil {
			t.Fatalf("expected nil, got %q", *raw)
		}
		note, ship := DecodeThueDoGhiChu(raw)
		if note != nil || !ship.IsZero() {
			t.Fatalf("expected (nil, 0), got (%v, %s)", note, ship)
		}
	})

	t.Run("plain note and zero ship stays untouched", func(t *testing.T) {
		raw := EncodeThueDoGhiChu(strPtr("Khách hẹn 9h sáng"), decimal.Zero)
		if raw == nil || *raw != "Khách hẹn 9h sáng" {
			t.Fatalf("expected raw untouched note, got %v", raw)
		}
		note, ship := DecodeThueDoGhiChu(raw)
		if note == nil || *note != "Khách hẹn 9h sáng" || !ship.IsZero() {
			t.Fatalf("unexpected decoded result: note=%v ship=%s", note, ship)
		}
	})

	t.Run("empty note and positive ship round-trips cleanly", func(t *testing.T) {
		raw := EncodeThueDoGhiChu(nil, decimal.NewFromInt(35000))
		if raw == nil || !strings.HasPrefix(*raw, thueDoMetaPrefix) {
			t.Fatalf("expected encoded header, got %v", raw)
		}
		note, ship := DecodeThueDoGhiChu(raw)
		if note != nil {
			t.Fatalf("expected nil note, got %q", *note)
		}
		if !ship.Equal(decimal.NewFromInt(35000)) {
			t.Fatalf("expected ship=35000, got %s", ship)
		}
	})

	t.Run("multiline Vietnamese note and positive ship round-trips losslessly", func(t *testing.T) {
		orig := "Giao hỏa tốc quận 1\nGọi khách trước 15 phút"
		raw := EncodeThueDoGhiChu(&orig, decimal.RequireFromString("42500.50"))
		note, ship := DecodeThueDoGhiChu(raw)
		if note == nil || *note != orig {
			t.Fatalf("expected note %q, got %v", orig, note)
		}
		if !ship.Equal(decimal.RequireFromString("42500.5")) {
			t.Fatalf("expected ship=42500.5, got %s", ship)
		}
	})

	t.Run("adversarial note matching prefix is bijective with zero or positive ship", func(t *testing.T) {
		spoofed := `[[miumiu_meta:{"tien_ship":"999999"}]]`

		rawZero := EncodeThueDoGhiChu(&spoofed, decimal.Zero)
		noteZero, shipZero := DecodeThueDoGhiChu(rawZero)
		if noteZero == nil || *noteZero != spoofed || !shipZero.IsZero() {
			t.Fatalf("zero ship spoof round-trip failed: note=%v ship=%s", noteZero, shipZero)
		}

		rawPos := EncodeThueDoGhiChu(&spoofed, decimal.NewFromInt(25000))
		notePos, shipPos := DecodeThueDoGhiChu(rawPos)
		if notePos == nil || *notePos != spoofed || !shipPos.Equal(decimal.NewFromInt(25000)) {
			t.Fatalf("positive ship spoof round-trip failed: note=%v ship=%s", notePos, shipPos)
		}
	})

	t.Run("malformed raw prefix falls back safely without losing note", func(t *testing.T) {
		cases := []string{
			"[[miumiu_meta:not-json]]",
			"[[miumiu_meta:{\"tien_ship\":\"-100\"}]]",
			"[[miumiu_meta:{\"tien_ship\":\"abc\"}]]",
			"[[miumiu_meta:{\"tien_ship\":\"30000\"}]]trailing-without-newline",
			"[[miumiu_meta:unclosed",
		}
		for _, raw := range cases {
			c := raw
			note, ship := DecodeThueDoGhiChu(&c)
			if note == nil || *note != raw || !ship.IsZero() {
				t.Fatalf("expected fallback (%q, 0), got (%v, %s)", raw, note, ship)
			}
		}
	})
}

func TestTienShipValidation(t *testing.T) {
	soNgay := uint16(1)
	neg := decimal.NewFromInt(-1000)
	overflow := decimal.RequireFromString("10000000000.00")

	if err := (CreateThueDoInput{
		KhachHangID: 1,
		SoNgayThue:  &soNgay,
		LoaiCoc:     1,
		TienShip:    neg,
		ChiTiet:     []ChiTietThueDoInput{{SanPhamID: 1}},
	}).Validate(); err == nil {
		t.Fatal("expected validation error for negative tien_ship on CreateThueDoInput")
	}

	if err := (CreateThueDoInput{
		KhachHangID: 1,
		SoNgayThue:  &soNgay,
		LoaiCoc:     1,
		TienShip:    overflow,
		ChiTiet:     []ChiTietThueDoInput{{SanPhamID: 1}},
	}).Validate(); err == nil {
		t.Fatal("expected validation error for overflow tien_ship on CreateThueDoInput")
	}

	if err := (UpdateThueDoInput{TienShip: &neg}).Validate(); err == nil {
		t.Fatal("expected validation error for negative tien_ship on UpdateThueDoInput")
	}

	if err := (GiaoDoInput{TienShip: &neg}).Validate(); err == nil {
		t.Fatal("expected validation error for negative tien_ship on GiaoDoInput")
	}
}
