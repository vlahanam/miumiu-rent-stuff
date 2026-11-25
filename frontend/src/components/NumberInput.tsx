'use client'

import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  findCaretPositionFromRight,
  formatNumberInput,
  parseDisplayToRawNumber,
  parseFormattedNumber,
} from '@/lib/format'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step'
  > {
  /** Giá trị số thô (ví dụ: "100000", 100000, hoặc "" khi trống) */
  value: string | number
  /** Callback nhận chuỗi số thô (không chứa dấu chấm hàng nghìn) và giá trị số tương ứng */
  onValueChange: (rawValue: string, numericValue: number) => void
  /** Cho phép nhập số thập phân bằng dấu phẩy `,` (mặc định false - chỉ số nguyên) */
  allowDecimal?: boolean
  /** Giá trị nhỏ nhất (áp dụng khi dùng phím mũi tên / clamp) */
  min?: number
  /** Giá trị lớn nhất (tự giới hạn khi nhập vượt quá) */
  max?: number
  /** Bước nhảy khi bấm phím ArrowUp / ArrowDown */
  step?: number
  /** Giới hạn tối đa số chữ số phần nguyên (mặc định 15 để an toàn với JS Number) */
  maxDigits?: number
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onValueChange,
    allowDecimal = false,
    min = 0,
    max,
    step = 1,
    maxDigits = 15,
    onKeyDown,
    onBlur,
    inputMode,
    autoComplete = 'off',
    spellCheck = false,
    ...rest
  },
  forwardedRef
) {
  const innerRef = useRef<HTMLInputElement | null>(null)
  const pendingCaretRef = useRef<number | null>(null)
  const [caretTick, setCaretTick] = useState(0)

  const setRefs = (el: HTMLInputElement | null) => {
    innerRef.current = el
    if (typeof forwardedRef === 'function') {
      forwardedRef(el)
    } else if (forwardedRef) {
      forwardedRef.current = el
    }
  }

  const displayValue = formatNumberInput(value, allowDecimal)

  useIsomorphicLayoutEffect(() => {
    if (pendingCaretRef.current === null) return
    const el = innerRef.current
    const pos = pendingCaretRef.current
    pendingCaretRef.current = null
    if (el && document.activeElement === el) {
      const clamped = Math.max(0, Math.min(pos, el.value.length))
      el.setSelectionRange(clamped, clamped)
    }
  }, [displayValue, caretTick])

  const commitEditedDisplay = (nextDomValue: string, cursorPos: number) => {
    const afterCursor = nextDomValue.slice(cursorPos)
    const sigRegex = allowDecimal ? /[\d,]/g : /\d/g
    const sigCharsAfterCursor = (afterCursor.match(sigRegex) || []).length

    let nextRaw = parseDisplayToRawNumber(nextDomValue, allowDecimal)

    // Giới hạn số chữ số phần nguyên để tránh tràn số
    if (nextRaw !== '') {
      const [intPart, decPart] = nextRaw.split('.')
      if (intPart.length > maxDigits) {
        const prevIntPart = parseDisplayToRawNumber(displayValue, allowDecimal).split('.')[0]
        if (prevIntPart.length >= maxDigits && intPart.length === maxDigits + 1) {
          // Từ chối ký tự thừa thay vì âm thầm cắt chữ số cuối
          nextRaw = parseDisplayToRawNumber(displayValue, allowDecimal)
        } else {
          const trimmedInt = intPart.slice(0, maxDigits)
          nextRaw = decPart !== undefined ? `${trimmedInt}.${decPart}` : trimmedInt
        }
      }
    }

    let numericValue = parseFormattedNumber(nextRaw, allowDecimal)
    let clampedToMax = false

    // Giới hạn max nếu được cấu hình
    if (max !== undefined && nextRaw !== '' && numericValue > max) {
      numericValue = max
      nextRaw = String(max)
      clampedToMax = true
    }

    const nextFormatted = formatNumberInput(nextRaw, allowDecimal)
    const nextCaret = clampedToMax
      ? nextFormatted.length
      : findCaretPositionFromRight(nextFormatted, sigCharsAfterCursor, allowDecimal)

    pendingCaretRef.current = nextCaret
    if (nextFormatted === displayValue && nextDomValue !== nextFormatted) {
      setCaretTick((t) => t + 1)
    }

    onValueChange(nextRaw, numericValue)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const domVal = e.target.value
    const cursor = e.target.selectionStart ?? domVal.length
    commitEditedDisplay(domVal, cursor)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return

    const el = e.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd

    // Xóa mượt khi con trỏ nằm ngay sau dấu chấm phân cách '.'
    if (e.key === 'Backspace' && start !== null && end !== null && start === end && start > 0) {
      if (displayValue[start - 1] === '.' && start >= 2) {
        e.preventDefault()
        const edited = displayValue.slice(0, start - 2) + displayValue.slice(start - 1)
        commitEditedDisplay(edited, start - 2)
        return
      }
    }

    // Xóa mượt khi con trỏ nằm ngay trước dấu chấm phân cách '.'
    if (e.key === 'Delete' && start !== null && end !== null && start === end && start < displayValue.length) {
      if (displayValue[start] === '.' && start + 1 < displayValue.length) {
        e.preventDefault()
        const edited = displayValue.slice(0, start + 1) + displayValue.slice(start + 2)
        commitEditedDisplay(edited, start + 1)
        return
      }
    }

    // Hỗ trợ phím mũi tên tăng/giảm theo step như input number chuẩn
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const current = parseFormattedNumber(value, allowDecimal)
      const delta = e.key === 'ArrowUp' ? step : -step
      let next = current + delta
      if (min !== undefined) next = Math.max(min, next)
      if (max !== undefined) next = Math.min(max, next)
      if (!allowDecimal) next = Math.round(next)
      else next = Number(next.toFixed(6))
      const nextRaw = String(next)
      const nextFormatted = formatNumberInput(nextRaw, allowDecimal)
      pendingCaretRef.current = nextFormatted.length
      if (nextFormatted === displayValue) {
        setCaretTick((t) => t + 1)
      }
      onValueChange(nextRaw, next)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Dọn dấu thập phân thừa ở cuối (vd: "85," -> "85")
    if (allowDecimal && typeof value === 'string' && value.endsWith('.')) {
      const cleaned = value.slice(0, -1)
      onValueChange(cleaned, parseFormattedNumber(cleaned, true))
    }
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      ref={setRefs}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    />
  )
})

NumberInput.displayName = 'NumberInput'

export default NumberInput
