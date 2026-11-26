'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  formatDateInputDisplay,
  formatDateTimeInputDisplay,
  parseDateInputDisplay,
  parseDateTimeInputDisplay,
  toDateTimeLocalValue,
  toDateValue,
} from '@/lib/format'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export interface DateInputProps {
  /** Giá trị chuẩn: 'YYYY-MM-DD' (mode='date') hoặc 'YYYY-MM-DDTHH:mm' (mode='datetime') hoặc '' */
  value: string
  /** Callback nhận chuỗi chuẩn cùng định dạng (hoặc '' khi xóa) */
  onChange: (value: string) => void
  /** 'date' hiển thị dd/mm/yyyy; 'datetime' hiển thị dd/mm/yyyy HH:mm */
  mode?: 'date' | 'datetime'
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  required?: boolean
  className?: string
  'aria-label'?: string
}

interface ParsedParts {
  year: number
  month: number // 1..12
  day: number
  hours: number
  minutes: number
}

function extractParts(value: string, mode: 'date' | 'datetime'): ParsedParts | null {
  if (!value) return null
  if (mode === 'datetime') {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim())
    if (!m) return null
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hours: Number(m[4]),
      minutes: Number(m[5]),
    }
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hours: 0,
    minutes: 0,
  }
}

function buildCanonical(parts: ParsedParts, mode: 'date' | 'datetime'): string {
  const yyyy = String(parts.year)
  const mm = String(parts.month).padStart(2, '0')
  const dd = String(parts.day).padStart(2, '0')
  if (mode === 'date') return `${yyyy}-${mm}-${dd}`
  const hh = String(parts.hours).padStart(2, '0')
  const mi = String(parts.minutes).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function buildCalendarCells(viewYear: number, viewMonth: number) {
  // viewMonth: 1..12; tuần bắt đầu từ Thứ Hai (T2)
  const firstDay = new Date(viewYear, viewMonth - 1, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0 .. Sun=6
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate()

  const cells: Array<{ year: number; month: number; day: number; inCurrentMonth: boolean }> = []

  // Ngày cuối tháng trước
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      year: prevYear,
      month: prevMonth,
      day: prevMonthDays - i,
      inCurrentMonth: false,
    })
  }

  // Ngày tháng hiện tại
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year: viewYear, month: viewMonth, day: d, inCurrentMonth: true })
  }

  // Ngày đầu tháng sau (đủ 42 ô cho lưới 6 hàng ổn định)
  const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear
  const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({
      year: nextYear,
      month: nextMonth,
      day: nextDay++,
      inCurrentMonth: false,
    })
  }

  return cells
}

export default function DateInput({
  value,
  onChange,
  mode = 'date',
  placeholder,
  clearable = false,
  disabled = false,
  required = false,
  className = '',
  'aria-label': ariaLabel,
}: DateInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const formattedFromProp = useMemo(
    () => (mode === 'datetime' ? formatDateTimeInputDisplay(value) : formatDateInputDisplay(value)),
    [value, mode]
  )

  const [draft, setDraft] = useState(formattedFromProp)
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const selectedParts = useMemo(() => extractParts(value, mode), [value, mode])

  const [viewYear, setViewYear] = useState(() => selectedParts?.year ?? new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => selectedParts?.month ?? new Date().getMonth() + 1)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Đồng bộ text hiển thị khi prop value thay đổi từ bên ngoài (chỉ khi không đang gõ)
  useEffect(() => {
    if (!focused) {
      setDraft(formattedFromProp)
    }
  }, [formattedFromProp, focused])

  // Khi mở lịch, nhảy về tháng đang chọn (hoặc tháng hiện tại)
  useEffect(() => {
    if (open) {
      const target = selectedParts ?? {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      }
      setViewYear(target.year)
      setViewMonth(target.month)
    }
  }, [open, selectedParts])

  const updatePopoverPosition = useCallback(() => {
    const trigger = wrapperRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(312, vw - 24)
    const estHeight = mode === 'datetime' ? 390 : 330

    const left = Math.min(Math.max(12, rect.left), vw - width - 12)
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top

    if (spaceBelow >= estHeight + 10 || spaceBelow >= spaceAbove) {
      const top = Math.min(rect.bottom + 6, Math.max(12, vh - estHeight - 12))
      setPopoverStyle({
        position: 'fixed',
        top,
        left,
        width,
        maxHeight: vh - 24,
      })
    } else {
      const bottom = Math.min(vh - rect.top + 6, Math.max(12, vh - estHeight - 12))
      setPopoverStyle({
        position: 'fixed',
        bottom,
        left,
        width,
        maxHeight: vh - 24,
      })
    }
  }, [mode])

  useIsomorphicLayoutEffect(() => {
    if (!open) return
    updatePopoverPosition()
    const handleRelayout = () => updatePopoverPosition()
    window.addEventListener('resize', handleRelayout)
    window.addEventListener('scroll', handleRelayout, true)
    return () => {
      window.removeEventListener('resize', handleRelayout)
      window.removeEventListener('scroll', handleRelayout, true)
    }
  }, [open, updatePopoverPosition])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = e.target.value
    const cursorAtEnd = (e.target.selectionStart ?? next.length) === next.length
    const isTypingForward = next.length > draft.length

    // Hỗ trợ tự chèn '/' (và ' ', ':' ở chế độ datetime) khi người dùng gõ nối tiếp ở cuối chuỗi
    if (isTypingForward && cursorAtEnd) {
      if (/^\d{2}$/.test(next)) {
        next = `${next}/`
      } else if (/^\d{2}\/\d{2}$/.test(next)) {
        next = `${next}/`
      } else if (mode === 'datetime' && /^\d{2}\/\d{2}\/\d{4}$/.test(next)) {
        next = `${next} `
      } else if (mode === 'datetime' && /^\d{2}\/\d{2}\/\d{4} \d{2}$/.test(next)) {
        next = `${next}:`
      }
    }

    setDraft(next)

    if (!next.trim()) {
      if (clearable) onChange('')
      return
    }

    if (mode === 'datetime') {
      // Chỉ commit live khi người dùng đã gõ đủ dd/mm/yyyy HH:mm (tránh nhảy giờ 1 chữ số khi đang gõ)
      if (/^\d{2}\s*[/\-.]\s*\d{2}\s*[/\-.]\s*\d{4}[\s,T]+\d{2}\s*:\s*\d{2}$/.test(next.trim())) {
        const parsed = parseDateTimeInputDisplay(next, {
          hours: selectedParts?.hours ?? 0,
          minutes: selectedParts?.minutes ?? 0,
        })
        if (parsed) onChange(parsed)
      }
    } else if (/^\d{2}\s*[/\-.]\s*\d{2}\s*[/\-.]\s*\d{4}$/.test(next.trim())) {
      const parsed = parseDateInputDisplay(next)
      if (parsed) onChange(parsed)
    }
  }

  const commitDraft = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      if (clearable) {
        onChange('')
        setDraft('')
      } else {
        setDraft(formattedFromProp)
      }
      return
    }

    const parsed =
      mode === 'datetime'
        ? parseDateTimeInputDisplay(trimmed, {
            hours: selectedParts?.hours ?? new Date().getHours(),
            minutes: selectedParts?.minutes ?? new Date().getMinutes(),
          })
        : parseDateInputDisplay(trimmed)

    if (parsed) {
      onChange(parsed)
      setDraft(mode === 'datetime' ? formatDateTimeInputDisplay(parsed) : formatDateInputDisplay(parsed))
    } else {
      setDraft(formattedFromProp)
    }
  }

  const handleSelectDay = (year: number, month: number, day: number) => {
    const now = new Date()
    const hours = selectedParts?.hours ?? now.getHours()
    const minutes = selectedParts?.minutes ?? now.getMinutes()
    const nextVal = buildCanonical({ year, month, day, hours, minutes }, mode)
    onChange(nextVal)
    setDraft(mode === 'datetime' ? formatDateTimeInputDisplay(nextVal) : formatDateInputDisplay(nextVal))
    if (mode === 'date') {
      setOpen(false)
    }
  }

  const handleTimeChange = (nextHours: number, nextMinutes: number) => {
    const now = new Date()
    const base = selectedParts ?? {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hours: now.getHours(),
      minutes: now.getMinutes(),
    }
    const nextVal = buildCanonical(
      { ...base, hours: nextHours, minutes: nextMinutes },
      'datetime'
    )
    onChange(nextVal)
    setDraft(formatDateTimeInputDisplay(nextVal))
  }

  const handlePickToday = () => {
    const now = new Date()
    const nextVal = mode === 'datetime' ? toDateTimeLocalValue(now) : toDateValue(now)
    onChange(nextVal)
    setDraft(mode === 'datetime' ? formatDateTimeInputDisplay(nextVal) : formatDateInputDisplay(nextVal))
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth() + 1)
    if (mode === 'date') setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setDraft('')
    setOpen(false)
  }

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => Math.max(1900, y - 1))
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => Math.min(2100, y + 1))
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth])
  const today = new Date()
  const todayY = today.getFullYear()
  const todayM = today.getMonth() + 1
  const todayD = today.getDate()

  const yearOptions = useMemo(() => {
    const minY = Math.min(2020, viewYear - 5)
    const maxY = Math.max(todayY + 5, viewYear + 5)
    const arr: number[] = []
    for (let y = minY; y <= maxY; y++) arr.push(y)
    return arr
  }, [viewYear, todayY])

  const defaultPlaceholder = mode === 'datetime' ? 'dd/mm/yyyy HH:mm' : 'dd/mm/yyyy'
  const showClearBtn = clearable && Boolean(value) && !disabled

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        placeholder={placeholder ?? defaultPlaceholder}
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          commitDraft()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitDraft()
            setOpen(false)
          } else if (e.key === 'ArrowDown' && !open && !disabled) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        onChange={handleTextChange}
        className={`w-full tabular-nums ${showClearBtn ? 'pr-16' : 'pr-10'} ${className}`}
      />

      <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
        {showClearBtn && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            title="Xóa ngày"
            aria-label="Xóa ngày"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          title="Chọn ngày trên lịch"
          aria-label="Mở lịch chọn ngày"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
        </button>
      </div>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="z-[80] bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl p-3.5 overflow-y-auto select-none"
          >
            {/* Header tháng / năm */}
            <div className="flex items-center justify-between gap-1.5 mb-3">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label="Tháng trước"
                className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[19px]">chevron_left</span>
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                <select
                  aria-label="Chọn tháng"
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-label-md text-on-surface focus:outline-none focus:border-primary-container"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Chọn năm"
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-label-md text-on-surface tabular-nums focus:outline-none focus:border-primary-container"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Tháng sau"
                className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[19px]">chevron_right</span>
              </button>
            </div>

            {/* Tiêu đề thứ trong tuần */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="h-7 flex items-center justify-center font-label-sm text-[11px] text-on-surface-variant"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Lưới ngày */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const isSelected =
                  selectedParts?.year === cell.year &&
                  selectedParts?.month === cell.month &&
                  selectedParts?.day === cell.day
                const isToday =
                  cell.year === todayY && cell.month === todayM && cell.day === todayD

                return (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}`}
                    type="button"
                    onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                    className={`h-8 rounded-lg font-body-sm text-[13px] tabular-nums flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                        : isToday
                        ? 'ring-1 ring-primary-container text-primary-container font-bold hover:bg-primary-fixed/40'
                        : cell.inCurrentMonth
                        ? 'text-on-surface hover:bg-surface-container'
                        : 'text-outline/60 hover:bg-surface-container-low'
                    }`}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>

            {/* Bộ chọn giờ/phút 24h cho chế độ datetime */}
            {mode === 'datetime' && (
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                <span className="font-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    schedule
                  </span>
                  Giờ (24h)
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Chọn giờ"
                    value={String(selectedParts?.hours ?? 0).padStart(2, '0')}
                    onChange={(e) =>
                      handleTimeChange(Number(e.target.value), selectedParts?.minutes ?? 0)
                    }
                    className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-label-md text-on-surface tabular-nums focus:outline-none focus:border-primary-container"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-on-surface-variant">:</span>
                  <select
                    aria-label="Chọn phút"
                    value={String(selectedParts?.minutes ?? 0).padStart(2, '0')}
                    onChange={(e) =>
                      handleTimeChange(selectedParts?.hours ?? 0, Number(e.target.value))
                    }
                    className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-label-md text-on-surface tabular-nums focus:outline-none focus:border-primary-container"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Thanh hành động nhanh */}
            <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePickToday}
                  className="px-2.5 h-8 rounded-lg bg-surface-container-low hover:bg-primary-fixed/50 text-primary-container font-label-sm font-semibold transition-colors"
                >
                  {mode === 'datetime' ? 'Hiện tại' : 'Hôm nay'}
                </button>
                {clearable && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 h-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 font-label-sm font-semibold transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
              {mode === 'datetime' && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3.5 h-8 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm font-bold transition-colors"
                >
                  Xong
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
