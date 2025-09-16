export const APP_NAME = 'Xeno CRM'
export const APP_DESCRIPTION = 'Customer Intelligence Platform'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const QUERY_KEYS = {
  CUSTOMERS: 'customers',
  CUSTOMER_STATS: 'customer-stats',
  SEGMENTS: 'segments',
  SEGMENT_STATS: 'segment-stats',
  CAMPAIGNS: 'campaigns',
  CAMPAIGN_STATS: 'campaign-stats',
  ORDERS: 'orders',
  ORDER_STATS: 'order-stats'
} as const

export const ROUTES = {
  DASHBOARD: '/dashboard',
  SEGMENTS: '/segments',
  CAMPAIGNS: '/campaigns',
  ANALYTICS: '/analytics',
  LOGIN: '/login'
} as const

export const COLORS = {
  PRIMARY: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1'
  }
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
} as const
