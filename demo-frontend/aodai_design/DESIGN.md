---
name: Aodai Atelier Rental
colors:
  surface: '#fff8f8'
  surface-dim: '#e1d8d9'
  surface-bright: '#fff8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf1f2'
  surface-container: '#f5eced'
  surface-container-high: '#efe6e7'
  surface-container-highest: '#e9e0e1'
  on-surface: '#1e1b1c'
  on-surface-variant: '#534247'
  inverse-surface: '#342f30'
  inverse-on-surface: '#f8efef'
  outline: '#867277'
  outline-variant: '#d8c1c6'
  surface-tint: '#954361'
  primary: '#4f0929'
  on-primary: '#ffffff'
  primary-container: '#6b213f'
  on-primary-container: '#eb89aa'
  inverse-primary: '#ffb0c8'
  secondary: '#7d571e'
  on-secondary: '#ffffff'
  secondary-container: '#fdc985'
  on-secondary-container: '#78521a'
  tertiary: '#002c24'
  on-tertiary: '#ffffff'
  tertiary-container: '#18433a'
  on-tertiary-container: '#84afa3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9e2'
  primary-fixed-dim: '#ffb0c8'
  on-primary-fixed: '#3e001e'
  on-primary-fixed-variant: '#782b49'
  secondary-fixed: '#ffddb5'
  secondary-fixed-dim: '#f0be7b'
  on-secondary-fixed: '#2a1800'
  on-secondary-fixed-variant: '#624007'
  tertiary-fixed: '#bfecde'
  tertiary-fixed-dim: '#a3d0c3'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#244e44'
  background: '#fff8f8'
  on-background: '#1e1b1c'
  surface-variant: '#e9e0e1'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  currency-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is tailored for premium costume and traditional Áo Dài rental studios. The target audience comprises boutique fashion rental owners, showroom coordinators, and bespoke attire managers who require rapid operations on mobile devices.

The design identity marries contemporary mobile minimalism with traditional Vietnamese elegance:
- **Atmosphere:** Refined, tranquil, and boutique-grade. It departs from dense enterprise spreadsheets in favor of an airy, tactile, modern editorial experience.
- **Visual Stance:** Crisp, luminous warm-tinted light canvas, combined with rich plum burgundy accents (#6B213F / #802B48) inspired by royal silk velvet and lacquerware.
- **Feel:** Tactile cards with micro-diffused ambient shadows, seamless gesture interactions, and a clean, unambiguous mobile navigation flow with optimized thumb zones.

## Colors

The palette balances nobility, warm hospitality, and operational clarity:

- **Primary (`#6B213F` / Mận chín Burgundy):** Anchors primary actions, navigation active states, high-priority indicators, and FAB triggers. Evokes luxury silk, bridal velvet, and heritage elegance.
- **Secondary (`#C99A5B` / Imperial Champagne Gold):** Serves as a graceful accent for pending status badges ("Chờ xác nhận"), active highlights, and vip tiers.
- **Tertiary (`#285248` / Jade Emerald):** Used for completed states, returns ("Đã trả"), and inventory availability tags ("Trống lịch").
- **Neutral Canvas & Surfaces:**
  - Base Background: `#FBF9F8` (Warm Alabaster Silk) – prevents harsh eye fatigue common with pure `#FFFFFF`.
  - Surface Card: `#FFFFFF` (Pure White with subtle warm undertones).
  - Surface Muted: `#F3EFEF` (Subtle divider and field backings).
  - Text Primary: `#231F20` (Deep Charred Mulberry).
  - Text Muted: `#756A6E` (Soft Heather Taupe).

### State Badge Color Pairs (Background / Text):
- **Quá hạn (Overdue):** `#FDE8EB` / `#C5283D` (Crimson rose)
- **Đang thuê (Rented / Out):** `#FEF4E6` / `#B57300` (Warm amber)
- **Chờ xác nhận (Pending):** `#FFF8E7` / `#946E18` (Antique champagne)
- **Đã trả (Returned):** `#EAF5EE` / `#236B48` (Mint sage)
- **Trống lịch (Available):** `#E7F4FA` / `#166C94` or `#EAF5EE` / `#236B48`
- **Bảo dưỡng (Maintenance):** `#F1EFF4` / `#61556C` (Muted lilac graphite)

## Typography

**Plus Jakarta Sans** is selected as the primary system typeface. It features open letterforms, contemporary geometric balance, and full, native diacritical support for Vietnamese (dấu hỏi, ngã, nặng, sắc, huyền maintain optical balance without colliding with ascenders).

- **Headlines:** Set in weights `600` and `700` to establish confident section hierarchy on 375px–430px smartphone viewports.
- **Numbers & Currency:** Always set in `FontWeight 700` with tabular formatting so figures like `680.000đ` align cleanly across lists.
- **Metadata (Dates & Codes):** Use `body-sm` or `label-sm` in `FontWeight 400` or `500` with `#756A6E` to keep order IDs (`DT-0001`) prominent without overwhelming customer names.

## Layout & Spacing

The mobile layout operates on a standard 4-column fluid mobile grid with 16px (`1rem`) horizontal screen margins and 12px or 16px gutters:

- **Vertical Rhythm:** A base unit of 4px is applied strictly. Cards utilize 12px vertical stacking gaps; grouped lists within a card utilize 8px micro-gaps.
- **Mobile Screen Structure:**
  - **Top App Bar:** 56px fixed height with integrated search or page title.
  - **Sticky Filter Carousel:** Horizontal sliding chip group with 8px gaps and edge-bleed padding.
  - **Content Body:** Card-based modular feeds with 16px bottom margin per card block.
  - **Bottom Navigation Bar:** 64px standard height (plus device safe-area inset) housing 4 primary destinations (Tổng quan, Đơn thuê, Sản phẩm, Khách hàng).
  - **Floating Action Button (FAB):** Placed 16px above the navigation bar on the bottom-right corner for effortless one-handed creation of new rental orders.

## Elevation & Depth

To replace flat borders and harsh dropshadows with a luxurious tactile finish:

- **Level 0 (Flat / Canvas):** `#FBF9F8`, no shadow.
- **Level 1 (Card & Content Blocks):** 
  - `box-shadow: 0 4px 16px -2px rgba(107, 33, 63, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.03)`
  - A subtle warm-plum tint within the shadow creates an ambient glow while staying airy and featherlight.
  - Optional 1px border: `rgba(107, 33, 63, 0.06)` for crisp edge definition on OLED panels.
- **Level 2 (Active Cards, Sheets & Popups):**
  - `box-shadow: 0 12px 28px -4px rgba(107, 33, 63, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)`
- **Level 3 (FAB & Navigation Bottom Bar):**
  - FAB: `box-shadow: 0 8px 20px -2px rgba(107, 33, 63, 0.35)`
  - Bottom Bar: `box-shadow: 0 -4px 20px rgba(35, 31, 32, 0.04)` with backdrop-filter blur (16px) over `#FFFFFFEE`.

## Shapes

The design uses `roundedness: 2` (base 8px / 0.5rem), providing a modern, smooth aesthetic suited to fashion and fabric:

- **Order & Product Cards:** 14px–16px border-radius (`rounded-lg` to `rounded-xl`) with soft curves that mirror folded textile edges.
- **Form Inputs & Search Bars:** 12px radius, delivering a clean, friendly enclosure.
- **Status Badges & Pill Chips:** Full pill radius (`9999px`) to immediately differentiate interactive tags and status indicators from content cards.
- **Floating Action Button (FAB):** 16px rounded-square or fully circular pill (52px height) for comfortable thumb reach.

## Components

### 1. Status Badges (Hệ thống Badge)
- **Geometry:** Height 24px, pill-shaped (`border-radius: 9999px`), horizontal padding `8px 10px`.
- **Text:** `label-sm` (11px, weight `600`), uppercase or title case.
- **Styling Matrix:**
  - *Quá hạn:* Background `#FDE8EB`, Text `#C5283D`.
  - *Đang thuê:* Background `#FEF4E6`, Text `#B57300`.
  - *Chờ xác nhận:* Background `#FFF8E7`, Text `#946E18`.
  - *Đã trả:* Background `#EAF5EE`, Text `#236B48`.
  - *Trống lịch:* Background `#E8F4FA`, Text `#1A6A8C`.

### 2. Rental Order Card (Card Đơn thuê)
- **Container:** Background `#FFFFFF`, rounded 14px, padded 14px.
- **Header Row:** Order Code (`DT-0001` in plum `#6B213F`, bold 13px) + Customer Name (`title-sm`), paired with the Status Badge on the right.
- **Body Row:** Item name (e.g., "Áo dài gấm đỏ đô"), font size 13px `#756A6E`. Date duration range (`19-11 → 22-11`) with calendar micro-icon.
- **Footer Row:** Bold localized price (`960.000đ` in `#231F20`, 16px bold). Quick action trigger (call customer or view detail indicator).

### 3. Metric KPI Cards (Thẻ Tổng quan)
- **Layout:** 3-column horizontal grid on mobile with equal distribution.
- **Style:** Compact card, rounded 12px, padded 10px 8px, text-center.
- **Elements:** Large numeric value (20px bold) tinted by context (e.g. Primary Plum or Forest Jade), followed by a tiny label underneath (`Trống lịch`, `Đã cho thuê`, `Bảo dưỡng`).

### 4. Interactive Filter Chips
- **Inactive:** Background `#FFFFFF`, border `1px solid #EBE5E7`, text `#756A6E`.
- **Active:** Background `#6B213F`, text `#FFFFFF`, subtle plum drop shadow.

### 5. Input & Search Bar
- **Style:** Background `#FFFFFF`, border `1.5px solid #E8DFE2`, 12px rounded corner, 44px minimum touch target height.
- **Focus State:** Border transitions to `#6B213F` with an outer soft plum ring (`box-shadow: 0 0 0 3px rgba(107, 33, 63, 0.12)`).

### 6. Primary Action Button & FAB
- **FAB ("+ Thêm đơn"):** Stretches or docks at bottom-right. `#6B213F` filled background, white icon & typography, 16px rounded pill, height 48px, padded `0 20px`.