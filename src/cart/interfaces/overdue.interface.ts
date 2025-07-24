export type OverdueBlockType = '' | 'SOFT' | 'HARD' | 'MT';
export enum OverdueBlockEnum {
  BLANK = '',
  SOFT = 'SOFT',
  HARD = 'HARD',
  TIMEOUT = 'MT',
}

export type BuyerOverdue = {
  dryBlock: OverdueBlockType;
  frozenBlock: OverdueBlockType;
  bmasBlock: OverdueBlockType;
  bmasOverdue: boolean;
};

export type OverdueItem = {
  INVOICE: string;
  CURRENCY: string;
  AMOUNT: number;
  DUE_DATE: string;
  TOLERANCE: number;
  OVERDUE: string;
  SPART: string;
  MSG: string;
  NOTES: string;
  INF_DIV: string;
  INF_MS: string;
};

export type GetOverdueResponseSMUProps = OverdueItem[];

export type GetOverdueResponseWSProps = {
  result: number;
  message: string;
  rows: OverdueItem[];
};

export type BmasOverdueConfig = {
  allowedOverdue: number;
  reminderOverdue: number;
};
