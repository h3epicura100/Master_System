// HRMS Calculation Utilities

export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('en-IN').format(num)
}

/**
 * Calculate hourly rate for an employee
 * Standard: Base Salary / 30 days / 8 hours
 */
export const calculateHourlyRate = (baseSalary, daysInMonth = 30) => {
  if (!baseSalary || baseSalary <= 0) return 0
  return baseSalary / daysInMonth / 8
}

/**
 * Calculate overtime pay with 1.5x multiplier
 */
export const calculateOtPay = (otHours, baseSalary, daysInMonth = 30) => {
  if (!otHours || otHours <= 0) return 0
  const hourly = calculateHourlyRate(baseSalary, daysInMonth)
  return Math.round(otHours * hourly * 1.5)
}

/**
 * Calculate unpaid leave deduction
 */
export const calculateUnpaidLeaveCut = (usedLeaves, allowedLeaves = 4, baseSalary, daysInMonth = 30) => {
  if (usedLeaves <= allowedLeaves) return { cutDays: 0, cutAmount: 0 }
  const cutDays = usedLeaves - allowedLeaves
  const perDayRate = baseSalary / daysInMonth
  return {
    cutDays,
    cutAmount: Math.round(cutDays * perDayRate)
  }
}

/**
 * Calculate complete payroll line for a staff member
 */
export const calculateEmployeePayroll = ({
  employee,
  presentDays = 30,
  halfDays = 0,
  usedLeaves = 0,
  approvedOtHours = 0,
  incentives = 0,
  advanceEmi = 0,
  daysInMonth = 30
}) => {
  const baseSalary = Number(employee.base_salary) || 0
  const allowedLeaves = employee.allowed_leaves !== undefined ? Number(employee.allowed_leaves) : 4

  // Effective days
  const effectivePresentDays = Math.max(0, presentDays - (halfDays * 0.5))

  // Base earned wage
  const perDayWage = baseSalary / daysInMonth
  const baseEarned = Math.round(perDayWage * effectivePresentDays)

  // Leave cut
  const { cutDays, cutAmount } = calculateUnpaidLeaveCut(usedLeaves, allowedLeaves, baseSalary, daysInMonth)

  // OT Pay
  const otPay = calculateOtPay(approvedOtHours, baseSalary, daysInMonth)

  // Gross Pay before deductions
  const grossPay = baseEarned + otPay + Number(incentives || 0)

  // Total Deductions
  const totalDeductions = cutAmount + Number(advanceEmi || 0)

  // Net Payable
  const netPay = Math.max(0, grossPay - totalDeductions)

  return {
    baseSalary,
    daysInMonth,
    effectivePresentDays,
    halfDays,
    usedLeaves,
    allowedLeaves,
    cutDays,
    cutAmount,
    otPay,
    approvedOtHours,
    incentives: Number(incentives || 0),
    advanceEmi: Number(advanceEmi || 0),
    grossPay,
    totalDeductions,
    netPay
  }
}

/**
 * Convert number to words in Indian numbering system for Payslip
 */
export const numberToWordsINR = (num) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const inWords = (n) => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + (n % 10 !== 0 ? a[n % 10] + ' ' : '')
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100)
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000)
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000)
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000)
  }

  const rounded = Math.round(num)
  if (rounded === 0) return 'Zero Rupees Only'
  return inWords(rounded).trim() + ' Rupees Only'
}
