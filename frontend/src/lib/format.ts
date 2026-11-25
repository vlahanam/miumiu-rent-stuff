export function parseMoney(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

export function formatCurrency(val: string | number | null | undefined): string {
  const num = Math.round(parseMoney(val))
  return `${num.toLocaleString('vi-VN')}đ`
}

export function formatNumber(val: string | number | null | undefined): string {
  return Math.round(parseMoney(val)).toLocaleString('vi-VN')
}

/**
 * Lọc lấy chuỗi chữ số nguyên thuần và loại bỏ số 0 thừa ở đầu.
 * Ví dụ: "" -> "", "0" -> "0", "00" -> "0", "01.000" -> "1000", "100.000" -> "100000"
 */
export function sanitizeIntegerDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/^0+(?=\d)/, '')
}

function addThousandDots(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Định dạng giá trị số thô (raw state) sang chuỗi hiển thị có dấu chấm phân cách hàng nghìn.
 * - allowDecimal = false: "1000" -> "1.000", "10000" -> "10.000", "100000" -> "100.000", "" -> ""
 * - allowDecimal = true:  "1000.5" -> "1.000,5", "85." -> "85,"
 */
export function formatNumberInput(
  val: string | number | null | undefined,
  allowDecimal = false
): string {
  if (val === null || val === undefined || val === '') return ''

  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return ''
    if (!allowDecimal) {
      const rounded = Math.round(val)
      const sign = rounded < 0 ? '-' : ''
      return `${sign}${addThousandDots(String(Math.abs(rounded)))}`
    }
    const sign = val < 0 ? '-' : ''
    const [intRaw, decRaw] = String(Math.abs(val)).split('.')
    const intDigits = intRaw.replace(/^0+(?=\d)/, '') || '0'
    return decRaw !== undefined
      ? `${sign}${addThousandDots(intDigits)},${decRaw}`
      : `${sign}${addThousandDots(intDigits)}`
  }

  const trimmed = val.trim()
  if (!trimmed) return ''

  if (!allowDecimal) {
    const digits = sanitizeIntegerDigits(trimmed)
    return digits ? addThousandDots(digits) : ''
  }

  // Ở chế độ thập phân, raw state dùng dấu '.' làm dấu thập phân (tối đa 1 dấu '.')
  const dotIdx = trimmed.indexOf('.')
  const hasSingleDot = dotIdx !== -1 && trimmed.indexOf('.', dotIdx + 1) === -1
  if (hasSingleDot && !trimmed.includes(',')) {
    const rawInt = trimmed.slice(0, dotIdx).replace(/\D/g, '')
    const rawDec = trimmed.slice(dotIdx + 1).replace(/\D/g, '')
    const intDigits = rawInt ? rawInt.replace(/^0+(?=\d)/, '') : '0'
    return `${addThousandDots(intDigits)},${rawDec}`
  }

  // Fallback nếu đầu vào dùng dấu ',' thập phân
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx !== -1) {
    const rawInt = trimmed.slice(0, commaIdx).replace(/\D/g, '')
    const rawDec = trimmed.slice(commaIdx + 1).replace(/\D/g, '')
    const intDigits = rawInt ? rawInt.replace(/^0+(?=\d)/, '') : '0'
    return `${addThousandDots(intDigits)},${rawDec}`
  }

  const digits = sanitizeIntegerDigits(trimmed)
  return digits ? addThousandDots(digits) : ''
}

/**
 * Chuyển chuỗi người dùng đang gõ trên input (có dấu '.' phân cách hàng nghìn)
 * sang chuỗi số thô chuẩn để lưu state và gửi API.
 * - allowDecimal = false: "100.000" -> "100000", "1.00" -> "100", "" -> ""
 * - allowDecimal = true:  "1.000,5" -> "1000.5", "85," -> "85."
 */
export function parseDisplayToRawNumber(display: string, allowDecimal = false): string {
  if (!allowDecimal) {
    return sanitizeIntegerDigits(display)
  }

  const trimmed = display.trim()
  if (!trimmed) return ''

  const commaIdx = trimmed.indexOf(',')
  if (commaIdx !== -1) {
    const rawInt = trimmed.slice(0, commaIdx).replace(/\D/g, '')
    const rawDec = trimmed.slice(commaIdx + 1).replace(/\D/g, '')
    const intDigits = rawInt ? rawInt.replace(/^0+(?=\d)/, '') : '0'
    return `${intDigits}.${rawDec}`
  }

  return sanitizeIntegerDigits(trimmed)
}

/**
 * Chuyển chuỗi số (raw hoặc đã có dấu chấm hàng nghìn) sang kiểu number.
 * Ví dụ: "100.000" -> 100000, "100000" -> 100000, "" -> 0
 */
export function parseFormattedNumber(
  val: string | number | null | undefined,
  allowDecimal = false
): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0

  const trimmed = val.trim()
  if (!trimmed) return 0

  if (allowDecimal) {
    if (trimmed.includes(',')) {
      const normalized = trimmed.replace(/\./g, '').replace(',', '.')
      const n = Number(normalized)
      return Number.isFinite(n) ? n : 0
    }
    const dotIdx = trimmed.indexOf('.')
    const hasMultipleDots = dotIdx !== -1 && trimmed.indexOf('.', dotIdx + 1) !== -1
    const normalized = hasMultipleDots ? trimmed.replace(/\./g, '') : trimmed
    const n = Number(normalized)
    return Number.isFinite(n) ? n : 0
  }

  const digits = sanitizeIntegerDigits(trimmed)
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

/**
 * Tính vị trí con trỏ mới trên chuỗi đã định dạng dựa trên số ký tự có nghĩa nằm bên phải con trỏ.
 */
export function findCaretPositionFromRight(
  formatted: string,
  sigCharsFromRight: number,
  allowDecimal = false
): number {
  if (sigCharsFromRight <= 0) return formatted.length

  const isSig = (ch: string) => (allowDecimal ? (ch >= '0' && ch <= '9') || ch === ',' : ch >= '0' && ch <= '9')

  let count = 0
  for (let i = formatted.length - 1; i >= 0; i--) {
    if (isSig(formatted[i])) {
      count++
      if (count === sigCharsFromRight) {
        // Nếu ký tự ngay trước vị trí tìm thấy là dấu phân cách '.', lùi sang trái dấu '.'
        // để con trỏ đứng sát ngay sau chữ số vừa gõ/xóa
        return i > 0 && formatted[i - 1] === '.' ? i - 1 : i
      }
    }
  }

  return 0
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

export function formatTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mi}`
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(iso)} ${formatTime(iso)}`
}

export function formatVietnameseToday(now = new Date()): string {
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return `Hôm nay, ${days[now.getDay()]}, ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
}

export function toDateTimeLocalValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export function fromDateTimeLocalValue(val: string): string {
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export function daysOverdue(ngayHenTra?: string | null): number {
  if (!ngayHenTra) return 0
  const due = new Date(ngayHenTra).getTime()
  const diffMs = Date.now() - due
  if (diffMs <= 0) return 0
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function daysRemaining(ngayHenTra?: string | null): number {
  if (!ngayHenTra) return 0
  const due = new Date(ngayHenTra).getTime()
  const diffMs = due - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function isSameDay(iso?: string | null, ref = new Date()): boolean {
  if (!iso) return false
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

export function parseImages(hinhAnh?: string | null): string[] {
  if (!hinhAnh) return []
  const trimmed = hinhAnh.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      }
    } catch {
      // Fallback sang chuỗi đơn
    }
  }
  return [trimmed]
}

export function serializeImages(urls: string[]): string | null {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean)
  if (cleaned.length === 0) return null
  if (cleaned.length === 1) return cleaned[0]
  return JSON.stringify(cleaned)
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return phone
}

export function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts[parts.length - 1].charAt(0).toUpperCase()
}
