import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findCaretPositionFromRight,
  formatDate,
  formatDateInputDisplay,
  formatDateShort,
  formatDateTime,
  formatDateTimeInputDisplay,
  formatNumberInput,
  formatVietnameseToday,
  parseDateInputDisplay,
  parseDateTimeInputDisplay,
  parseDisplayToRawNumber,
  parseFormattedNumber,
  parseMoney,
  sanitizeIntegerDigits,
  toDateValue,
} from './format'

test('formatNumberInput formats integers with dot thousand separators across all magnitudes', () => {
  assert.equal(formatNumberInput(''), '')
  assert.equal(formatNumberInput(null), '')
  assert.equal(formatNumberInput(undefined), '')
  assert.equal(formatNumberInput('0'), '0')
  assert.equal(formatNumberInput(0), '0')
  assert.equal(formatNumberInput('5'), '5')
  assert.equal(formatNumberInput('99'), '99')
  assert.equal(formatNumberInput('999'), '999')

  // Hàng nghìn, chục nghìn, trăm nghìn
  assert.equal(formatNumberInput('1000'), '1.000')
  assert.equal(formatNumberInput(1000), '1.000')
  assert.equal(formatNumberInput('10000'), '10.000')
  assert.equal(formatNumberInput(10000), '10.000')
  assert.equal(formatNumberInput('100000'), '100.000')
  assert.equal(formatNumberInput(100000), '100.000')

  // Hàng triệu, chục triệu, trăm triệu, tỷ, chục tỷ
  assert.equal(formatNumberInput('1000000'), '1.000.000')
  assert.equal(formatNumberInput('10000000'), '10.000.000')
  assert.equal(formatNumberInput('100000000'), '100.000.000')
  assert.equal(formatNumberInput('1000000000'), '1.000.000.000')
  assert.equal(formatNumberInput('10000000000'), '10.000.000.000')
  assert.equal(formatNumberInput('123456789012345'), '123.456.789.012.345')
})

test('formatNumberInput normalizes leading zeros and strips non-digits in integer mode', () => {
  assert.equal(formatNumberInput('00'), '0')
  assert.equal(formatNumberInput('000'), '0')
  assert.equal(formatNumberInput('05'), '5')
  assert.equal(formatNumberInput('01000'), '1.000')
  assert.equal(formatNumberInput('1.500.000 đ'), '1.500.000')
  assert.equal(formatNumberInput('1,500,000 VND'), '1.500.000')
  assert.equal(formatNumberInput('abc'), '')
})

test('sanitizeIntegerDigits and parseDisplayToRawNumber handle typing and deleting smoothly', () => {
  assert.equal(sanitizeIntegerDigits(''), '')
  assert.equal(sanitizeIntegerDigits('0'), '0')
  assert.equal(sanitizeIntegerDigits('000'), '0')
  assert.equal(sanitizeIntegerDigits('01.000'), '1000')

  // Typing progressively: 1 -> 10 -> 100 -> 1.000 -> 10.000 -> 100.000 -> 1.000.000
  const sequence = ['1', '10', '100', '1000', '1.0000', '10.0000', '100.0000']
  const expectedDisplay = ['1', '10', '100', '1.000', '10.000', '100.000', '1.000.000']
  sequence.forEach((domInput, idx) => {
    const raw = parseDisplayToRawNumber(domInput)
    assert.equal(formatNumberInput(raw), expectedDisplay[idx])
  })

  // Backspace from end of "1.000" -> DOM becomes "1.00" -> raw "100" -> display "100"
  assert.equal(parseDisplayToRawNumber('1.00'), '100')
  assert.equal(formatNumberInput(parseDisplayToRawNumber('1.00')), '100')

  // Backspace from end of "10.000" -> DOM becomes "10.00" -> raw "1000" -> display "1.000"
  assert.equal(parseDisplayToRawNumber('10.00'), '1000')
  assert.equal(formatNumberInput(parseDisplayToRawNumber('10.00')), '1.000')

  // Backspace from end of "1.000.000" -> DOM becomes "1.000.00" -> raw "100000" -> display "100.000"
  assert.equal(parseDisplayToRawNumber('1.000.00'), '100000')
  assert.equal(formatNumberInput(parseDisplayToRawNumber('1.000.00')), '100.000')
})

test('decimal mode uses dot for thousands and comma for decimal separator', () => {
  assert.equal(formatNumberInput('85', true), '85')
  assert.equal(formatNumberInput('85.5', true), '85,5')
  assert.equal(formatNumberInput('85.', true), '85,')
  assert.equal(formatNumberInput('1000.25', true), '1.000,25')
  assert.equal(formatNumberInput('1000000.05', true), '1.000.000,05')
  assert.equal(formatNumberInput(12345.5, true), '12.345,5')

  assert.equal(parseDisplayToRawNumber('85,5', true), '85.5')
  assert.equal(parseDisplayToRawNumber('85,', true), '85.')
  assert.equal(parseDisplayToRawNumber('1.000,25', true), '1000.25')
  assert.equal(parseDisplayToRawNumber('1.000', true), '1000')
  assert.equal(parseDisplayToRawNumber(',5', true), '0.5')

  assert.equal(parseFormattedNumber('85,5', true), 85.5)
  assert.equal(parseFormattedNumber('1.000,25', true), 1000.25)
  assert.equal(parseFormattedNumber('1000.25', true), 1000.25)
  assert.equal(parseFormattedNumber('1.000.000', true), 1000000)
})

test('parseFormattedNumber parses formatted and raw values cleanly without breaking parseMoney', () => {
  assert.equal(parseFormattedNumber(''), 0)
  assert.equal(parseFormattedNumber('0'), 0)
  assert.equal(parseFormattedNumber('1.000'), 1000)
  assert.equal(parseFormattedNumber('10.000'), 10000)
  assert.equal(parseFormattedNumber('100.000'), 100000)
  assert.equal(parseFormattedNumber('1.500.000'), 1500000)
  assert.equal(parseFormattedNumber('1500000'), 1500000)
  assert.equal(parseFormattedNumber(250000), 250000)

  // parseMoney still preserves decimal.Decimal strings from Go backend
  assert.equal(parseMoney('1500000.00'), 1500000)
  assert.equal(parseMoney('350000.50'), 350000.5)
})

test('findCaretPositionFromRight places cursor accurately after formatting', () => {
  // Typing at end (0 digits after cursor)
  assert.equal(findCaretPositionFromRight('1.000', 0), 5)
  assert.equal(findCaretPositionFromRight('1.000.000', 0), 9)

  // Inserting '5' in "10|.000" -> "105|.000" (3 digits after cursor, stays before '.')
  assert.equal(findCaretPositionFromRight('105.000', 3), 3)

  // Inserting '2' in "105|.000" -> "1.052|.000" (3 digits after cursor, stays before '.')
  assert.equal(findCaretPositionFromRight('1.052.000', 3), 5)

  // Deleting '2' from "1.052|.000" -> "105|.000"
  assert.equal(findCaretPositionFromRight('105.000', 3), 3)

  // Inserting '5' at start of "|1.000" -> "5|1.000" (4 digits after cursor)
  assert.equal(findCaretPositionFromRight('51.000', 4), 1)

  // Typing '0' at start of "|1.000" -> leading 0 stripped -> "|1.000" (4 digits after cursor)
  assert.equal(findCaretPositionFromRight('1.000', 4), 0)

  // Deleting digit after dot in "12|.000" -> "1.2|00" (2 digits after cursor)
  assert.equal(findCaretPositionFromRight('1.200', 2), 3)

  // Decimal caret tracking: "1.000,|5" (1 digit after cursor)
  assert.equal(findCaretPositionFromRight('1.000,5', 1, true), 6)
  // "1.000|,5" (2 sig chars after cursor: ',' and '5')
  assert.equal(findCaretPositionFromRight('1.000,5', 2, true), 5)
})

test('date display helpers always format as dd/mm/yyyy (and HH:mm when included)', () => {
  assert.equal(formatDate(null), '—')
  assert.equal(formatDate(''), '—')
  assert.equal(formatDate('invalid'), '—')
  assert.equal(formatDate('2026-03-05'), '05/03/2026')
  assert.equal(formatDate('2026-11-26'), '26/11/2026')
  assert.equal(formatDateShort('2026-03-05'), '05/03/2026')

  const localSample = new Date(2026, 2, 5, 9, 7) // 05/03/2026 09:07 local
  assert.equal(formatDate(localSample.toISOString()), '05/03/2026')
  assert.equal(formatDateTime(localSample.toISOString()), '05/03/2026 09:07')
  assert.equal(formatVietnameseToday(localSample), 'Hôm nay, Thứ Năm, 05/03/2026')
  assert.equal(toDateValue(localSample), '2026-03-05')
})

test('date input display/parse helpers convert cleanly between YYYY-MM-DD and dd/mm/yyyy', () => {
  assert.equal(formatDateInputDisplay(''), '')
  assert.equal(formatDateInputDisplay('2026-11-26'), '26/11/2026')
  assert.equal(formatDateInputDisplay('2026-03-05'), '05/03/2026')
  assert.equal(formatDateInputDisplay('2026-02-29'), '') // non-leap year

  assert.equal(parseDateInputDisplay(''), '')
  assert.equal(parseDateInputDisplay('26/11/2026'), '2026-11-26')
  assert.equal(parseDateInputDisplay('5/3/2026'), '2026-03-05')
  assert.equal(parseDateInputDisplay('05-03-2026'), '2026-03-05')
  assert.equal(parseDateInputDisplay('05.03.2026'), '2026-03-05')
  assert.equal(parseDateInputDisplay('26112026'), '2026-11-26')
  assert.equal(parseDateInputDisplay('29/02/2024'), '2024-02-29') // leap year
  assert.equal(parseDateInputDisplay('29/02/2026'), null) // non-leap year
  assert.equal(parseDateInputDisplay('31/04/2026'), null) // April has 30 days
  assert.equal(parseDateInputDisplay('2026-11-26'), null) // rejects yyyy-mm-dd order
})

test('datetime input display/parse helpers convert cleanly between YYYY-MM-DDTHH:mm and dd/mm/yyyy HH:mm', () => {
  assert.equal(formatDateTimeInputDisplay(''), '')
  assert.equal(formatDateTimeInputDisplay('2026-11-26T14:05'), '26/11/2026 14:05')
  assert.equal(formatDateTimeInputDisplay('2026-03-05T00:00'), '05/03/2026 00:00')
  assert.equal(formatDateTimeInputDisplay('2026-03-05T25:00'), '')

  assert.equal(parseDateTimeInputDisplay(''), '')
  assert.equal(parseDateTimeInputDisplay('26/11/2026 14:05'), '2026-11-26T14:05')
  assert.equal(parseDateTimeInputDisplay('5/3/2026 9:5'), '2026-03-05T09:05')
  assert.equal(
    parseDateTimeInputDisplay('26/11/2026', { hours: 9, minutes: 30 }),
    '2026-11-26T09:30'
  )
  assert.equal(parseDateTimeInputDisplay('26/11/2026 24:00'), null)
  assert.equal(parseDateTimeInputDisplay('26/11/2026 12:60'), null)
  assert.equal(parseDateTimeInputDisplay('31/02/2026 10:00'), null)
})
