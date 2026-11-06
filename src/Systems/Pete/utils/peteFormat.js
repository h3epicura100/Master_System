/**
 * Formats a numeric string or number into Indian comma format (e.g. 1,23,42,345.00)
 */
export function formatAmountWithCommas(value) {
  if (value === '' || value === null || value === undefined) return ''
  const str = String(value).replace(/,/g, '')
  if (str === '') return ''

  const parts = str.split('.')
  const integerPart = parts[0]
  const decimalPart = parts.length > 1 ? '.' + parts[1] : ''

  if (!integerPart && decimalPart) return '0' + decimalPart
  if (!integerPart) return ''

  // Indian number formatting: last 3 digits grouped, preceding digits grouped in pairs of 2
  let lastThree = integerPart.substring(integerPart.length - 3)
  const otherNumbers = integerPart.substring(0, integerPart.length - 3)
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree
  return formattedInt + decimalPart
}

/**
 * Parses a comma-separated formatted amount string into a clean float number
 */
export function parseFormattedAmount(value) {
  if (!value) return 0
  const cleaned = String(value).replace(/,/g, '')
  return parseFloat(cleaned) || 0
}

export const formatExactIndian = (value) => (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export const formatAbbreviatedIndian = (value) => {
  const abs = Math.abs(value || 0)
  if (abs >= 10000000) return (value / 10000000).toFixed(2) + ' Cr'
  if (abs >= 100000) return (value / 100000).toFixed(2) + ' L'
  if (abs >= 1000) return (value / 1000).toFixed(1) + ' K'
  return (value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export const isPdfFile = (url) => {
  if (!url) return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  return cleanUrl.endsWith('.pdf')
}
