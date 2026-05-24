import * as XLSX from 'xlsx'
import { formatRechargeProvider } from '@/lib/recharge-provider'

// Base interfaces for type safety
export interface BaseTransactionData {
  id: string
  createdAt: Date | string
  amount: number
  status: string
  operator: string
  provider?: string
  targetPhone?: string
  apiReferenceId?: string
  apiMessage?: string
  retailerCommission?: number
  distributorCommission?: number
  adminCommission?: number
  user?: {
    name: string
    email: string
  }
}

export interface FundingData {
  id: string
  createdAt: Date | string
  amount: number
  type: string
  notes?: string
  user?: {
    name: string
    email: string
  }
}

export interface ExcelExportData<T = BaseTransactionData> {
  fileName: string
  sheetName: string
  data: T[]
  headers: string[]
}

export function exportToExcel<T>({ fileName, sheetName, data, headers }: ExcelExportData<T>) {
  // Create a new workbook
  const workbook = XLSX.utils.book_new()
  
  // Convert data to worksheet format with type safety
  const worksheetData = [headers, ...data.map(item => 
    headers.map(header => {
      // Type-safe data mapping
      const typedItem = item as any
      
      if (header === 'Date') {
        return typedItem.createdAt ? new Date(typedItem.createdAt).toLocaleDateString('en-IN') : ''
      }
      if (header === 'Time') {
        return typedItem.createdAt ? new Date(typedItem.createdAt).toLocaleTimeString('en-IN') : ''
      }
      if (header === 'Amount' || header === 'Recharge Amount') {
        return typedItem.amount ? `₹${typedItem.amount.toLocaleString('en-IN')}` : ''
      }
      if (header === 'Status') {
        return typedItem.status || ''
      }
      if (header === 'Retailer' || header === 'User') {
        return typedItem.user?.name || ''
      }
      if (header === 'Email') {
        return typedItem.user?.email || ''
      }
      if (header === 'Operator' || header === 'Carrier') {
        return typedItem.operator || ''
      }
      if (header === 'API') {
        return formatRechargeProvider(typedItem.provider)
      }
      if (header === 'Phone') {
        return typedItem.targetPhone || ''
      }
      if (header === 'Reference ID' || header === 'Ref ID') {
        return typedItem.apiReferenceId || typedItem.id || ''
      }
      if (header === 'Action') {
        return typedItem.operator || typedItem.type || ''
      }
      if (header === 'Notes') {
        return typedItem.apiMessage || typedItem.notes || ''
      }
      if (header === 'Platform Cut') {
        return typedItem.adminCommission ? `₹${typedItem.adminCommission.toLocaleString('en-IN')}` : ''
      }
      if (header === 'Your Cut') {
        if (typedItem.distributorCommission) {
          return `₹${typedItem.distributorCommission.toLocaleString('en-IN')}`
        }
        if (typedItem.retailerCommission) {
          return `₹${typedItem.retailerCommission.toLocaleString('en-IN')}`
        }
        return ''
      }
      if (header === 'Type') {
        return typedItem.type || ''
      }
      
      // Default: try to get the property directly with safe access
      const propertyKey = header.toLowerCase().replace(/\s+/g, '')
      return typedItem[propertyKey] || ''
    })
  )]
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // Auto-size columns
  const colWidths = headers.map(() => ({ wch: 15 }))
  worksheet['!cols'] = colWidths
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Generate Excel file and download
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

// Specific export functions for different data types with proper typing
export function exportTransactions(transactions: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `transactions-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Transactions',
    data: transactions,
    headers: ['Date', 'Time', 'Retailer', 'Email', 'Carrier', 'Phone', 'Amount', 'API', 'Status', 'Reference ID']
  })
}

export function exportFunding(fundingData: FundingData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `funding-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Funding History',
    data: fundingData,
    headers: ['Date', 'Time', 'User', 'Email', 'Action', 'Amount', 'Notes']
  })
}

export function exportCommissions(commissionsData: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `commissions-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Commissions',
    data: commissionsData,
    headers: ['Date', 'Time', 'Retailer', 'Email', 'Amount', 'Status', 'Reference ID']
  })
}

export function exportEarnings(earningsData: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `earnings-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Earnings',
    data: earningsData,
    headers: ['Date', 'Time', 'Type', 'Amount', 'Status', 'Reference ID']
  })
}

export function exportAdminEarnings(earningsData: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `admin-earnings-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Platform Earnings',
    data: earningsData,
    headers: ['Date', 'Time', 'Retailer', 'Operator', 'Recharge Amount', 'Platform Cut']
  })
}

export function exportDistributorEarnings(earningsData: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `distributor-earnings-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Distributor Earnings',
    data: earningsData,
    headers: ['Date', 'Time', 'Retailer', 'Operator', 'Recharge Amount', 'Your Cut']
  })
}

export function exportRetailerEarnings(earningsData: BaseTransactionData[], fileName?: string) {
  return exportToExcel({
    fileName: fileName || `retailer-earnings-${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Retailer Earnings',
    data: earningsData,
    headers: ['Date', 'Time', 'Phone', 'Operator', 'Recharge Amount', 'Your Cut']
  })
}

export type UserReportExportRow = {
  name: string
  email: string
  phone: string
  role: string
  balance: number
  earnings: number
  distributor: string
  retailers: number
  successCount: number
  successVolume: number
  pendingCount: number
  status: string
  joined: string
}

export function exportUserReport(
  rows: UserReportExportRow[],
  fileName?: string
) {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Role',
    'Balance',
    'Earnings',
    'Distributor',
    'Retailers',
    'Success Count',
    'Success Volume',
    'Pending',
    'Status',
    'Joined',
  ]

  const sheetRows = rows.map((row) => [
    row.name,
    row.email,
    row.phone,
    row.role,
    `₹${row.balance.toLocaleString('en-IN')}`,
    `₹${row.earnings.toLocaleString('en-IN')}`,
    row.distributor,
    row.retailers,
    row.successCount,
    `₹${row.successVolume.toLocaleString('en-IN')}`,
    row.pendingCount,
    row.status,
    new Date(row.joined).toLocaleString('en-IN'),
  ])

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sheetRows])
  worksheet['!cols'] = headers.map(() => ({ wch: 16 }))
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  XLSX.writeFile(
    workbook,
    `${fileName || `user-report-${new Date().toISOString().split('T')[0]}`}.xlsx`
  )
}
