export interface Member {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  qrCodeUrl?: string; // base64 data url or image url
  isHolder: boolean;
  avatarBg?: string;
  monthlyBudget?: number;
  passcode?: string; // optional private PIN/passcode
}

export type ExpenseCategory =
  | 'Rent'
  | 'Appliance Rental'
  | 'Groceries'
  | 'Utilities'
  | 'Maintenance'
  | 'Food & Dining'
  | 'Personal'
  | 'Other';

export interface BillSubItem {
  id: string;
  title: string;
  amount: number;
  memberIds: string[];
  notes?: string;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDay: number; // e.g., 11 for house rent, 15 for washing machine
  category: ExpenseCategory;
  reminderDaysBefore: number; // default: 3
  splitMemberIds: string[]; // members who share this base bill
  payerId: string; // usually Holder
  notes?: string;
  depositAmount?: number; // e.g., ₹18,000 remaining deposit to give
  firstMonthAmount?: number; // e.g., ₹1,500 washing machine (includes deposit) or ₹12,000 rent
  regularMonthlyAmount?: number; // e.g., ₹500 next month washing machine, ₹12,000 rent
  lastReminderSentAt?: string;
  subItems?: BillSubItem[]; // sub-items: furniture, table, chair, deposit share, maintenance
}

export interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  category: ExpenseCategory;
  paidById: string; // Member ID who paid
  createdAt: string; // ISO date string
  mode: 'split' | 'solo';
  splitMemberIds: string[];
  customSplits?: Record<string, number>; // optional custom exact amount per member
  notes?: string;
  isRecurringGenerated?: boolean;
  isPreCollectedSettled?: boolean; // True when holder collected everyone's share in advance before purchasing
}

export type ShareStatus = 'ARREAR' | 'CLAIMED_PAID' | 'COMPLETED';

export interface ExpenseShare {
  id: string;
  expenseId: string;
  expenseTitle: string;
  category: ExpenseCategory;
  debtorId: string; // Paying member (who has to give money)
  creditorId: string; // Receiving member (who should receive money)
  amount: number; // Share in INR
  partialPaidAmount?: number; // If they paid half, amount already paid
  status: ShareStatus;
  createdAt: string;
  claimedAt?: string;
  settledAt?: string;
  paymentNote?: string;
  revertedAt?: string;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  estimatedCost: number;
  requestedById: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'PURCHASED' | 'REJECTED';
  createdAt: string;
}

export interface DirectPaymentClaim {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  shareIds?: string[]; // which specific shares are being paid
  note?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  confirmedAt?: string;
}

export interface HolderNotification {
  id: string;
  title: string;
  message: string;
  type: 'PAYMENT_CLAIM' | 'PAYMENT_CONFIRMED' | 'PURCHASE_REQUEST' | 'RENT_ALERT' | 'INFO';
  timestamp: string;
  read: boolean;
  targetMemberId?: string; // which member this relates to
  claimId?: string;
  shareId?: string;
}

export interface NetBalanceDetail {
  memberId: string;
  memberName: string;
  totalOwedToThem: number; // positive incoming
  totalTheyOwe: number; // negative outgoing
  netBalance: number; // positive = should receive, negative = owes
}

export type PersonalExpenseCategory =
  | 'Food & Snacks'
  | 'Commute & Travel'
  | 'Shopping & Personal'
  | 'Subscriptions & Bills'
  | 'Health & Fitness'
  | 'Groceries (Personal)'
  | 'Other';

export interface PersonalExpense {
  id: string;
  memberId: string;
  title: string;
  amount: number;
  category: PersonalExpenseCategory;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export type PantryStatus = 'IN_STOCK' | 'RUNNING_LOW' | 'OUT_OF_STOCK';

export interface PantryItem {
  id: string;
  name: string;
  category: 'Groceries' | 'Cleaning' | 'Water & Gas' | 'Toiletries' | 'Other';
  status: PantryStatus;
  quantity?: string;
  updatedAt: string;
  updatedByMemberId?: string;
}

export interface FlatChore {
  id: string;
  title: string;
  assignedMemberId: string;
  frequency: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
  dueDay: string; // e.g., "Saturday", "Sunday", "Daily"
  status: 'PENDING' | 'DONE';
  lastCompletedAt?: string;
}

export interface FlatContact {
  id: string;
  role: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface FlatNotice {
  id: string;
  title: string;
  content: string;
  isImportant?: boolean;
  createdAt: string;
}
