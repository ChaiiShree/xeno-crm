export interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  totalSpend: number
  visitCount: number
  lastVisit?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerStats {
  totalCustomers: number
  totalRevenue: number
  avgSpendPerCustomer: number
  avgVisitsPerCustomer: number
  activeCustomers30d: number
  activeCustomers7d: number
  payingCustomers: number
}

export interface CreateCustomerRequest {
  name: string
  email: string
  phone?: string
  totalSpend?: number
  visitCount?: number
}

export interface BulkCreateCustomerRequest {
  customers: CreateCustomerRequest[]
}

export interface CustomerPagination {
  customers: Customer[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
