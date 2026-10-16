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

const STORAGE_KEY = 'FLATMATE_REGISTER_DATA_V7_PURE_BLANK';

// Completely blank initial slate - only Prajwal (Holder). Roommates added by user.
export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'mem_prajwal',
    name: 'Prajwal',
    phone: '',
    upiId: '',
    isHolder: true,
    avatarBg: 'bg-indigo-600',
    passcode: '1234',
    monthlyBudget: undefined,
  },
];

export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [];

// Clean 100% empty initial records ready for user choice
export const DEFAULT_EXPENSES: Expense[] = [];
export const DEFAULT_SHARES: ExpenseShare[] = [];
export const DEFAULT_PURCHASE_REQUESTS: PurchaseRequest[] = [];
export const DEFAULT_NOTIFICATIONS: HolderNotification[] = [];
export const DEFAULT_PERSONAL_EXPENSES: PersonalExpense[] = [];
export const DEFAULT_PANTRY_ITEMS: PantryItem[] = [];
export const DEFAULT_CHORES: FlatChore[] = [];
export const DEFAULT_CONTACTS: FlatContact[] = [];
export const DEFAULT_NOTICES: FlatNotice[] = [];

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
 * Wipes everything back to a completely blank slate with only Prajwal (Holder).
 */
export function resetToCompletelyBlank(): AppState {
  const blankState = getInitialAppState();
  saveAppState(blankState);
  return blankState;
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
