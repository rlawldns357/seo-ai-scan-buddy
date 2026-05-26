/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as leadConfirmation } from './lead-confirmation.tsx'
import { template as reportDelivery } from './report-delivery.tsx'
import { template as soapDay1 } from './soap-day-1.tsx'
import { template as soapDay2 } from './soap-day-2.tsx'
import { template as soapDay3 } from './soap-day-3.tsx'
import { template as soapDay4 } from './soap-day-4.tsx'
import { template as soapDay5 } from './soap-day-5.tsx'
import { template as blogAlert } from './blog-alert.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'lead-confirmation': leadConfirmation,
  'report-delivery': reportDelivery,
  'soap-day-1': soapDay1,
  'soap-day-2': soapDay2,
  'soap-day-3': soapDay3,
  'soap-day-4': soapDay4,
  'soap-day-5': soapDay5,
  'blog-alert': blogAlert,
}
