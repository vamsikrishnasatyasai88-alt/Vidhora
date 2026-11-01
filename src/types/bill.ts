import type { TimeRangeMode, CustomDateRange } from './electricity';

export interface SavingsSimulation {
  reductionPercentage: number;
  reducedConsumption: number;
  newEstimatedBill: number;
  estimatedSavings: number;
  projectedMonthlySavings: number;
  projectedYearlySavings: number;
}

export interface BillEstimateRequest {
  tariffPerKwh: number;
  fixedMonthlyCharge?: number;
  additionalCharges?: number;
  isAdditionalChargeMonthly?: boolean;
  reductionPercentages?: number[];
  customReductionPercent?: number;
  timeRangeMode?: TimeRangeMode | string;
  startDate?: string;
  endDate?: string;
  customRange?: CustomDateRange;
  daysInBillingMonth?: number;
}

export interface BillEstimateResponse {
  totalConsumption: number;
  observedDays: number;
  validReadingsCount: number;
  tariffPerKwh: number;
  energyCharges: number;
  fixedCharges: number;
  additionalCharges: number;
  isAdditionalChargeMonthly: boolean;
  billingCycles: number;
  periodFixedCharges: number;
  periodAdditionalCharges: number;
  estimatedBill: number;
  averageDailyConsumption: number;
  averageDailyCost: number;
  projectedMonthlyConsumption: number;
  projectedMonthlyBill: number;
  projectedYearlyConsumption: number;
  projectedYearlyBill: number;
  daysInBillingMonth: number;
  isReliableMonthlyEstimate: boolean;
  reliabilityReason: string;
  billingPeriodLabel: string;
  startDate: string;
  endDate: string;
  savingsSimulations: SavingsSimulation[];
  calculationAssumptions: string[];
}
