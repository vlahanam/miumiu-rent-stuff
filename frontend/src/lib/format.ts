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
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatDateShort(iso?: string | null): string {
  return formatDate(iso)
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
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `Hôm nay, ${days[now.getDay()]}, ${dd}/${mm}/${now.getFullYear()}`
}

export function toDateValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

/**
 * Chuyển chuỗi ngày chuẩn 'YYYY-MM-DD' sang hiển thị 'dd/mm/yyyy'.
 */
export function formatDateInputDisplay(value?: string | null): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return ''
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!isValidCalendarDate(year, month, day)) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

/**
 * Phân tích chuỗi người dùng nhập theo thứ tự ngày/tháng/năm ('dd/mm/yyyy', 'd/m/yyyy', 'dd-mm-yyyy', 'ddmmyyyy')
 * sang chuỗi chuẩn 'YYYY-MM-DD'. Trả về '' nếu rỗng, null nếu không hợp lệ.
 */
export function parseDateInputDisplay(display: string): string | null {
  const trimmed = display.trim()
  if (!trimmed) return ''

  let day: number
  let month: number
  let year: number

  const separated = /^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})$/.exec(trimmed)
  if (separated) {
    day = Number(separated[1])
    month = Number(separated[2])
    year = Number(separated[3])
  } else {
    const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed)
    if (!compact) return null
    day = Number(compact[1])
    month = Number(compact[2])
    year = Number(compact[3])
  }

  if (!isValidCalendarDate(year, month, day)) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Chuyển chuỗi ngày giờ chuẩn 'YYYY-MM-DDTHH:mm' sang hiển thị 'dd/mm/yyyy HH:mm'.
 */
export function formatDateTimeInputDisplay(value?: string | null): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim())
  if (!m) return ''
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hours = Number(m[4])
  const minutes = Number(m[5])
  if (!isValidCalendarDate(year, month, day) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return ''
  }
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
}

/**
 * Phân tích chuỗi ngày giờ người dùng nhập ('dd/mm/yyyy HH:mm' hoặc chỉ 'dd/mm/yyyy')
 * sang chuỗi chuẩn 'YYYY-MM-DDTHH:mm'. Trả về '' nếu rỗng, null nếu không hợp lệ.
 */
export function parseDateTimeInputDisplay(
  display: string,
  fallbackTime: { hours: number; minutes: number } = { hours: 0, minutes: 0 }
): string | null {
  const trimmed = display.trim()
  if (!trimmed) return ''

  const withTime =
    /^(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})[\s,T]+(\d{1,2})\s*:\s*(\d{1,2})$/.exec(
      trimmed
    )
  if (withTime) {
    const day = Number(withTime[1])
    const month = Number(withTime[2])
    const year = Number(withTime[3])
    const hours = Number(withTime[4])
    const minutes = Number(withTime[5])
    if (!isValidCalendarDate(year, month, day) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(
      hours
    ).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const dateOnly = parseDateInputDisplay(trimmed)
  if (!dateOnly) return null
  const hh = String(Math.min(23, Math.max(0, fallbackTime.hours))).padStart(2, '0')
  const mi = String(Math.min(59, Math.max(0, fallbackTime.minutes))).padStart(2, '0')
  return `${dateOnly}T${hh}:${mi}`
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
