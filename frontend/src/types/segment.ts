import type { Customer } from './customer'; 

export interface RuleCondition {
  field: 'total_spend' | 'visit_count' | 'last_visit'
  operator: '>' | '<' | '>=' | '<=' | '=' | '!='
  value: string | number
}

export interface SegmentRules {
  operator: 'AND' | 'OR'
  conditions: RuleCondition[]
}

export interface Segment {
  id: number
  name: string
  description?: string
  rules: SegmentRules
  createdBy: number
  audienceSize: number
  createdAt: string
  updatedAt: string
  creator?: {
    name: string
    email: string
  }
}

export interface CreateSegmentRequest {
  name: string
  description?: string
  rules?: SegmentRules
  nlpQuery?: string
}

export interface AudiencePreview {
  audienceSize: number
  sampleCustomers: Customer[]
  rules: SegmentRules
}

export interface SegmentStats {
  totalSegments: number
  avgAudienceSize: number
  totalAudienceReach: number
  segmentsLast7d: number
  topSegments: Array<{
    name: string
    audienceSize: number
    createdAt: string
  }>
}
