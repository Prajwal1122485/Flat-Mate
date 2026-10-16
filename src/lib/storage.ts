import {
  Member,
  RecurringBill,
  Expense,
  ExpenseShare,
  PurchaseRequest,
  DirectPaymentClaim,
  HolderNotification,
  PersonalExpense,
  PantryItem,
  FlatChore,
  FlatContact,
  FlatNotice,
} from '@/types';

export interface AppState {
  members: Member[];
  recurringBills: RecurringBill[];
  expenses: Expense[];
  shares: ExpenseShare[];
  purchaseRequests: PurchaseRequest[];
  paymentClaims: DirectPaymentClaim[];
  notifications: HolderNotification[];
  personalExpenses: PersonalExpense[];
  pantryItems: PantryItem[];
  chores: FlatChore[];
  contacts: FlatContact[];
  notices: FlatNotice[];
  holderPasscode?: string; // Changeable master passcode (default: '1234')
  lastUpdated: string;
}

const STORAGE_KEY = 'FLATMATE_REGISTER_DATA_V5_CLEAN';

// Flat Members Directory (User can edit names/passwords/details freely)
export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'mem_prajwal',
    name: 'Prajwal',
    phone: '9876543210',
    upiId: 'prajwal@upi',
    isHolder: true,
    avatarBg: 'bg-indigo-600',
    passcode: '1234',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_rohan',
    name: 'Rohan',
    phone: '9845012345',
    upiId: 'rohan.kumar@okhdfcbank',
    isHolder: false,
    avatarBg: 'bg-emerald-600',
    passcode: '0000',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_amit',
    name: 'Amit',
    phone: '9988776655',
    upiId: 'amit.verma@paytm',
    isHolder: false,
    avatarBg: 'bg-amber-600',
    passcode: '0000',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_suresh',
    name: 'Suresh',
    phone: '9123456780',
    upiId: 'suresh@upi',
    isHolder: false,
    avatarBg: 'bg-sky-600',
    passcode: '0000',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_kiran',
    name: 'Kiran',
    phone: '9443322110',
    upiId: 'kiran@upi',
    isHolder: false,
    avatarBg: 'bg-purple-600',
    passcode: '0000',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_vikram',
    name: 'Vikram',
    phone: '9556677889',
    upiId: 'vikram@upi',
    isHolder: false,
    avatarBg: 'bg-rose-600',
    passcode: '0000',
    monthlyBudget: undefined,
  },
];

export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [
  {
    id: 'rec_rent',
    title: 'House Rent &bull; Flat 304',
    amount: 12000, // Due on 11th
    dueDay: 11,
    category: 'Rent',
    reminderDaysBefore: 3,
    firstMonthAmount: 12000, // Month 1 given ₹12,000 towards deposit/rent
    depositAmount: 18000, // Remaining ₹18,000 deposit to be paid next month
    regularMonthlyAmount: 12000, // Regular monthly rent
    splitMemberIds: [
      'mem_prajwal',
      'mem_rohan',
      'mem_amit',
      'mem_suresh',
      'mem_kiran',
      'mem_vikram',
    ],
    payerId: 'mem_prajwal',
    notes: 'Total deposit ₹30,000 (Given ₹12,000 now, remaining ₹18,000 deposit + ₹12,000 rent due next month on 11th)',
  },
  {
    id: 'rec_appliances',
    title: 'Washing Machine Rent',
    amount: 500, // Due on 15th
    dueDay: 15,
    category: 'Appliance Rental',
    reminderDaysBefore: 3,
    firstMonthAmount: 1500, // 1st month ₹1500 (deposit included)
    regularMonthlyAmount: 500, // Regular monthly rent
    splitMemberIds: [
      'mem_prajwal',
      'mem_rohan',
      'mem_amit',
      'mem_suresh',
      'mem_kiran',
      'mem_vikram',
    ],
    payerId: 'mem_prajwal',
    notes: 'First month ₹1500 (Deposit included). From next month onwards ₹500/month.',
  },
];

// Clean 100% empty initial records ready for user choice
export const DEFAULT_EXPENSES: Expense[] = [];
export const DEFAULT_SHARES: ExpenseShare[] = [];
export const DEFAULT_PURCHASE_REQUESTS: PurchaseRequest[] = [];
export const DEFAULT_NOTIFICATIONS: HolderNotification[] = [];
export const DEFAULT_PERSONAL_EXPENSES: PersonalExpense[] = [];
export const DEFAULT_PANTRY_ITEMS: PantryItem[] = [];
export const DEFAULT_CHORES: FlatChore[] = [];

export const DEFAULT_CONTACTS: FlatContact[] = [
  {
    id: 'cont_1',
    role: 'Flat Owner / Landlord',
    name: 'Mr. Ramesh Sharma',
    phone: '9820011223',
    notes: 'For lease agreement, rent receipt on 11th',
  },
  {
    id: 'cont_2',
    role: 'Building Caretaker & Supervisor',
    name: 'Suresh Gowda',
    phone: '9845099881',
    notes: 'Water tanker supply, basement parking & common repairs',
  },
  {
    id: 'cont_3',
    role: 'Sanitary Plumber',
    name: 'Manjunath',
    phone: '9900223344',
    notes: 'Bathroom geyser, kitchen pipe clogging',
  },
  {
    id: 'cont_4',
    role: 'Licensed Electrician',
    name: 'Ravi Kumar',
    phone: '9731144556',
    notes: 'MCB switches, wiring, inverter backup issues',
  },
  {
    id: 'cont_5',
    role: 'Cook & Housekeeping',
    name: 'Sunita Didi',
    phone: '9611223377',
    notes: 'Morning: 7:30 AM | Evening: 7:00 PM',
  },
  {
    id: 'cont_6',
    role: 'Apartment Security Main Gate',
    name: 'Main Gate Intercom',
    phone: '080-41234567',
    notes: 'Guest entry authorization & courier parcels',
  },
];

export const DEFAULT_NOTICES: FlatNotice[] = [
  {
    id: 'notice_1',
    title: 'Doorstep Waste Collection Timing',
    content: 'BBMP collection staff arrives daily at 8:45 AM. Segregate wet and dry waste into separate bins outside door.',
    isImportant: false,
    createdAt: new Date().toISOString(),
  },
];

export function getInitialAppState(): AppState {
  return {
    members: DEFAULT_MEMBERS,
    recurringBills: DEFAULT_RECURRING_BILLS,
    expenses: DEFAULT_EXPENSES,
    shares: DEFAULT_SHARES,
    purchaseRequests: DEFAULT_PURCHASE_REQUESTS,
    paymentClaims: [],
    notifications: DEFAULT_NOTIFICATIONS,
    personalExpenses: DEFAULT_PERSONAL_EXPENSES,
    pantryItems: DEFAULT_PANTRY_ITEMS,
    chores: DEFAULT_CHORES,
    contacts: DEFAULT_CONTACTS,
    notices: DEFAULT_NOTICES,
    holderPasscode: '1234',
    lastUpdated: new Date().toISOString(),
  };
}

export function loadAppState(): AppState {
  if (typeof window === 'undefined') {
    return getInitialAppState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppState();
      saveAppState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    const initial = getInitialAppState();
    return {
      ...initial,
      ...parsed,
      holderPasscode: parsed.holderPasscode || '1234',
      personalExpenses: parsed.personalExpenses || [],
      pantryItems: parsed.pantryItems || [],
      chores: parsed.chores || [],
      contacts: parsed.contacts || initial.contacts,
      notices: parsed.notices || initial.notices,
    };
  } catch (err) {
    console.error('Failed to parse Flat-Mate storage, resetting to default', err);
    return getInitialAppState();
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    state.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Dispatch custom event for reactive tabs
    window.dispatchEvent(new Event('flatmate-storage-update'));
  } catch (err) {
    console.error('Failed to save to local storage', err);
  }
}

export function resetAppState(): AppState {
  const initial = getInitialAppState();
  saveAppState(initial);
  return initial;
}

/**
 * Resets all transaction records, shares, claims, and diary items to 0 while keeping members and passcodes intact.
 */
export function clearAllTransactionsToEmpty(currentState: AppState): AppState {
  const emptyState: AppState = {
    ...currentState,
    expenses: [],
    shares: [],
    purchaseRequests: [],
    paymentClaims: [],
    personalExpenses: [],
    notifications: [
      {
        id: `notif_${Date.now()}`,
        title: 'Empty Register Ready',
        message: 'All records cleared. Ready to add your real items and split settlements.',
        type: 'INFO',
        timestamp: new Date().toISOString(),
        read: false,
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
  saveAppState(emptyState);
  return emptyState;
}

export function exportBackupJSON(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FlatMate_Register_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackupJSON(file: File, onSuccess: (state: AppState) => void, onError: (err: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const parsed = JSON.parse(text) as AppState;
      if (!parsed.members || !Array.isArray(parsed.members)) {
        throw new Error('Invalid backup file: Missing member data');
      }
      saveAppState(parsed);
      onSuccess(parsed);
    } catch (err: any) {
      onError(err?.message || 'Failed to read backup file');
    }
  };
  reader.readAsText(file);
}
