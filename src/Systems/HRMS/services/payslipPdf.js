// Payslip PDF (A4, standard salary-slip layout) built with jsPDF + autotable
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { numberToWordsINR } from './hrmsCalculations'

export const COMPANY = {
  name: 'H3 EPICURA',
  tagline: 'Production, Catering & Operations Management',
  address: 'Raipur Operations Center, Chhattisgarh',
  email: 'hcubecafe@gmail.com',
  logo: '/H3-logo.svg'
}

// jsPDF's built-in fonts have no ₹ glyph, so the PDF uses "Rs."
const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const num = (n) => {
  const v = Number(n) || 0
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export const formatSlipDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date)) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

/** Line items shared by the PDF and the on-screen preview */
export const getPayslipLines = (calc) => {
  const baseEarned = calc.baseEarned ?? calc.grossPay - calc.otPay - (calc.incentives || 0)
  return {
    earnings: [
      { label: 'Basic Wage', amount: baseEarned },
      { label: `Overtime (${num(calc.approvedOtHours)} hrs @ 1.5x)`, amount: calc.otPay },
      { label: 'Incentive', amount: calc.incentives || 0 }
    ],
    deductions: [
      { label: `Loss of Pay (${num(calc.cutDays)} days)`, amount: calc.cutAmount },
      { label: 'Salary Advance Recovery', amount: calc.advanceEmi },
      { label: 'PF / ESI / TDS', amount: 0 }
    ]
  }
}

// SVG logo -> PNG data URL (jsPDF cannot embed SVG directly)
let logoCache
async function loadLogo() {
  if (logoCache !== undefined) return logoCache
  try {
    const img = new Image()
    img.src = COMPANY.logo
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    canvas.getContext('2d').drawImage(img, 0, 0, 300, 300)
    logoCache = canvas.toDataURL('image/png')
  } catch (e) {
    console.warn('Payslip logo could not be loaded:', e)
    logoCache = null
  }
  return logoCache
}

/**
 * @param {{ employee, calc, month: string, slipNo: string, status?: string, paidAt?: string }} slip
 */
export async function buildPayslipPdf({ employee, calc, month, slipNo, status = 'Hold', paidAt = null }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 15
  const dark = [17, 24, 39]
  const muted = [100, 116, 139]
  const border = [203, 213, 225]
  const labelFill = [241, 245, 249]

  // ---------- Header: logo + company, payslip meta ----------
  const logo = await loadLogo()
  if (logo) doc.addImage(logo, 'PNG', M, 12, 24, 24)
  const tx = logo ? M + 29 : M

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...dark)
  doc.text(COMPANY.name, tx, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(COMPANY.tagline.toUpperCase(), tx, 25.5)
  doc.text(`${COMPANY.address}  |  ${COMPANY.email}`, tx, 30.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...dark)
  doc.text('PAYSLIP', W - M, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(month, W - M, 25.5, { align: 'right' })
  doc.setFontSize(8)
  doc.text(slipNo, W - M, 30.5, { align: 'right' })

  doc.setDrawColor(...dark)
  doc.setLineWidth(0.6)
  doc.line(M, 39, W - M, 39)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...dark)
  doc.text(`Salary Slip for the month of ${month}`, W / 2, 46, { align: 'center' })

  const tableBase = {
    theme: 'grid',
    margin: { left: M, right: M },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59], lineColor: border, lineWidth: 0.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8.5 }
  }

  // ---------- Employee details ----------
  const paymentStatus = status === 'Paid'
    ? `Paid${paidAt ? ` on ${formatSlipDate(paidAt)}` : ''}`
    : status
  autoTable(doc, {
    ...tableBase,
    startY: 51,
    head: [[{ content: 'EMPLOYEE DETAILS', colSpan: 4 }]],
    body: [
      ['Employee Name', employee.name, 'Employee Code', employee.username || '—'],
      ['Designation', employee.designation || '—', 'Department', employee.department || '—'],
      ['Date of Joining', formatSlipDate(employee.join_date), 'Mobile', employee.mobile || '—'],
      ['Monthly Salary', money(calc.baseSalary), 'Payment Status', paymentStatus]
    ],
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: labelFill, cellWidth: 36 },
      2: { fontStyle: 'bold', fillColor: labelFill, cellWidth: 36 }
    }
  })

  // ---------- Attendance summary ----------
  autoTable(doc, {
    ...tableBase,
    startY: doc.lastAutoTable.finalY + 5,
    head: [['Days in Month', 'Days Payable Period', 'Present Days', 'Leaves Taken', 'Paid Leaves Allowed', 'Loss of Pay Days']],
    body: [[
      num(calc.daysInMonth),
      num(calc.daysCounted ?? calc.daysInMonth),
      num(calc.effectivePresentDays),
      num(calc.usedLeaves),
      num(calc.allowedLeaves),
      num(calc.cutDays)
    ]],
    headStyles: { ...tableBase.headStyles, halign: 'center', fontSize: 7.5 },
    bodyStyles: { halign: 'center', fontSize: 9, fontStyle: 'bold' }
  })

  // ---------- Earnings | Deductions ----------
  const { earnings, deductions } = getPayslipLines(calc)
  const rows = Array.from({ length: Math.max(earnings.length, deductions.length) }, (_, i) => [
    earnings[i]?.label || '',
    earnings[i] ? money(earnings[i].amount) : '',
    deductions[i]?.label || '',
    deductions[i] ? money(deductions[i].amount) : ''
  ])
  autoTable(doc, {
    ...tableBase,
    startY: doc.lastAutoTable.finalY + 5,
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body: rows,
    foot: [['Gross Earnings', money(calc.grossPay), 'Total Deductions', money(calc.totalDeductions)]],
    footStyles: { fillColor: labelFill, textColor: dark, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 34 },
      3: { halign: 'right', cellWidth: 34 }
    },
    didParseCell: (data) => {
      if ((data.section === 'head' || data.section === 'foot') && (data.column.index === 1 || data.column.index === 3)) {
        data.cell.styles.halign = 'right'
      }
    }
  })

  // ---------- Net pay ----------
  autoTable(doc, {
    ...tableBase,
    startY: doc.lastAutoTable.finalY + 5,
    body: [
      [
        { content: 'NET SALARY PAYABLE', styles: { fontStyle: 'bold', fontSize: 10 } },
        { content: money(calc.netPay), styles: { fontStyle: 'bold', fontSize: 11, halign: 'right' } }
      ],
      [{ content: `Amount in words: ${numberToWordsINR(calc.netPay)}`, colSpan: 2, styles: { fontStyle: 'italic', textColor: [71, 85, 105] } }]
    ],
    styles: { ...tableBase.styles, fillColor: [238, 242, 255] }
  })

  // ---------- Signatures & footer ----------
  const sigY = Math.min(doc.lastAutoTable.finalY + 32, H - 35)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.3)
  doc.line(M, sigY, M + 60, sigY)
  doc.line(W - M - 60, sigY, W - M, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...dark)
  doc.text('Employee Signature', M + 30, sigY + 5, { align: 'center' })
  doc.text('Authorised Signatory', W - M - 30, sigY + 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...muted)
  doc.text(`For ${COMPANY.name}`, W - M - 30, sigY + 9, { align: 'center' })

  doc.setDrawColor(...border)
  doc.line(M, H - 18, W - M, H - 18)
  doc.setFontSize(7.5)
  doc.text('This is a computer-generated payslip and does not require a physical signature.', W / 2, H - 13, { align: 'center' })
  doc.text(`Generated on ${formatSlipDate(new Date())}`, W / 2, H - 9, { align: 'center' })

  return doc
}

const fileName = ({ employee, month }) =>
  `Payslip_${(employee.name || 'Employee').replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.pdf`

export async function downloadPayslipPdf(slip) {
  const doc = await buildPayslipPdf(slip)
  doc.save(fileName(slip))
}

/** Opens the PDF in a new tab with the print dialog. Open the tab synchronously to avoid popup blockers. */
export async function printPayslipPdf(slip) {
  const win = window.open('', '_blank')
  const doc = await buildPayslipPdf(slip)
  doc.autoPrint()
  const url = doc.output('bloburl')
  if (win) win.location.href = url
  else window.open(url, '_blank')
}
