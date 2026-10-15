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

const STORAGE_KEY = 'FLATMATE_REGISTER_DATA_V3';

// Initial realistic seed data
export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'mem_prajwal',
    name: 'Prajwal',
    phone: '9876543210',
    upiId: 'prajwal@upi',
    isHolder: true,
    avatarBg: 'bg-indigo-600',
    monthlyBudget: undefined, // Optional: can be Nil, 1k, 2k, etc.
  },
  {
    id: 'mem_rohan',
    name: 'Rohan',
    phone: '9845012345',
    upiId: 'rohan.kumar@okhdfcbank',
    isHolder: false,
    avatarBg: 'bg-emerald-600',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_amit',
    name: 'Amit',
    phone: '9988776655',
    upiId: 'amit.verma@paytm',
    isHolder: false,
    avatarBg: 'bg-amber-600',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_vikram',
    name: 'Vikram',
    phone: '9123456780',
    upiId: 'vikram.singh@ybl',
    isHolder: false,
    avatarBg: 'bg-sky-600',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_karthik',
    name: 'Karthik',
    phone: '9443322110',
    upiId: 'karthik.r@icici',
    isHolder: false,
    avatarBg: 'bg-purple-600',
    monthlyBudget: undefined,
  },
  {
    id: 'mem_sneha',
    name: 'Sneha',
    phone: '9556677889',
    upiId: 'sneha.patil@axisbank',
    isHolder: false,
    avatarBg: 'bg-rose-600',
    monthlyBudget: undefined,
  },
];

export const DEFAULT_RECURRING_BILLS: RecurringBill[] = [
  {
    id: 'rec_rent',
    title: 'Flat House Rent & Deposit',
    amount: 12000, // Due on 11th
    dueDay: 11,
    category: 'Rent',
    reminderDaysBefore: 3,
    firstMonthAmount: 12000, // Month 1 given ₹12,000 towards deposit/rent
    depositAmount: 18000, // Remaining ₹18,000 deposit to be paid next month
    regularMonthlyAmount: 12000, // Rent from next month is ₹12,000 (total due next month: 12k rent + 18k deposit)
    splitMemberIds: [
      'mem_prajwal',
      'mem_rohan',
      'mem_amit',
      'mem_vikram',
      'mem_karthik',
      'mem_sneha',
    ],
    payerId: 'mem_prajwal',
    notes: 'Total deposit ₹30,000 (Given ₹12,000 now, remaining ₹18,000 deposit + ₹12,000 rent due next month on 11th)',
  },
  {
    id: 'rec_appliances',
    title: 'Washing Machine Rent',
    amount: 1500, // Due on 15th (1st month is ₹1500 with deposit; from next month ₹500)
    dueDay: 15,
    category: 'Appliance Rental',
    reminderDaysBefore: 3,
    firstMonthAmount: 1500, // 1st month ₹1500 (deposit included)
    regularMonthlyAmount: 500, // From next month ₹500 regular rent
    splitMemberIds: ['mem_prajwal', 'mem_rohan', 'mem_amit', 'mem_vikram', 'mem_karthik', 'mem_sneha'],
    payerId: 'mem_prajwal',
    notes: 'First month ₹1500 (Deposit included). From next month onwards ₹500/month.',
  },
];

export const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp_1',
    title: 'Weekend Groceries & Vegetables',
    totalAmount: 2400,
    category: 'Groceries',
    paidById: 'mem_prajwal',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    mode: 'split',
    splitMemberIds: [
      'mem_prajwal',
      'mem_rohan',
      'mem_amit',
      'mem_vikram',
      'mem_karthik',
      'mem_sneha',
    ],
    notes: 'Blinkit monthly essentials',
  },
  {
    id: 'exp_2',
    title: 'Bisleri 20L Water Cans (x4)',
    totalAmount: 360,
    category: 'Utilities',
    paidById: 'mem_prajwal',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    mode: 'split',
    splitMemberIds: ['mem_rohan', 'mem_amit', 'mem_vikram', 'mem_karthik'],
    notes: 'Weekly water supply delivery',
  },
  {
    id: 'exp_3',
    title: 'Apartment Maintenance & Waste Disposal',
    totalAmount: 1500,
    category: 'Maintenance',
    paidById: 'mem_prajwal',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    mode: 'split',
    splitMemberIds: [
      'mem_prajwal',
      'mem_rohan',
      'mem_amit',
      'mem_vikram',
      'mem_karthik',
      'mem_sneha',
    ],
  },
];

export const DEFAULT_SHARES: ExpenseShare[] = [
  // Exp 1: 2400 / 6 = 400 each
  {
    id: 'share_1_prajwal',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_prajwal',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    settledAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'share_1_rohan',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_rohan',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    settledAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'share_1_amit',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_amit',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'share_1_vikram',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_vikram',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'share_1_karthik',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_karthik',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'share_1_sneha',
    expenseId: 'exp_1',
    expenseTitle: 'Weekend Groceries & Vegetables',
    category: 'Groceries',
    debtorId: 'mem_sneha',
    creditorId: 'mem_prajwal',
    amount: 400,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    settledAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },

  // Exp 2: 360 / 4 = 90 each
  {
    id: 'share_2_rohan',
    expenseId: 'exp_2',
    expenseTitle: 'Bisleri 20L Water Cans (x4)',
    category: 'Utilities',
    debtorId: 'mem_rohan',
    creditorId: 'mem_prajwal',
    amount: 90,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'share_2_amit',
    expenseId: 'exp_2',
    expenseTitle: 'Bisleri 20L Water Cans (x4)',
    category: 'Utilities',
    debtorId: 'mem_amit',
    creditorId: 'mem_prajwal',
    amount: 90,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'share_2_vikram',
    expenseId: 'exp_2',
    expenseTitle: 'Bisleri 20L Water Cans (x4)',
    category: 'Utilities',
    debtorId: 'mem_vikram',
    creditorId: 'mem_prajwal',
    amount: 90,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'share_2_karthik',
    expenseId: 'exp_2',
    expenseTitle: 'Bisleri 20L Water Cans (x4)',
    category: 'Utilities',
    debtorId: 'mem_karthik',
    creditorId: 'mem_prajwal',
    amount: 90,
    status: 'ARREAR',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },

  // Exp 3: 1500 / 6 = 250 each
  {
    id: 'share_3_all_settled',
    expenseId: 'exp_3',
    expenseTitle: 'Apartment Maintenance & Waste Disposal',
    category: 'Maintenance',
    debtorId: 'mem_rohan',
    creditorId: 'mem_prajwal',
    amount: 250,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    settledAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'share_3_amit',
    expenseId: 'exp_3',
    expenseTitle: 'Apartment Maintenance & Waste Disposal',
    category: 'Maintenance',
    debtorId: 'mem_amit',
    creditorId: 'mem_prajwal',
    amount: 250,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    settledAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

export const DEFAULT_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'req_1',
    title: 'Kitchen Dishwashing Gel (2L) & Scotch-Brite Sponges',
    estimatedCost: 350,
    requestedById: 'mem_amit',
    notes: 'Running very low in the kitchen sink area',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'req_2',
    title: 'Living Room 4-Socket Power Extension Cord',
    estimatedCost: 499,
    requestedById: 'mem_vikram',
    notes: 'For charging laptops when working together',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export const DEFAULT_NOTIFICATIONS: HolderNotification[] = [
  {
    id: 'notif_1',
    title: 'Rent Reminder Alert',
    message: 'Flat House Rent (₹30,000) is scheduled for 11th. WhatsApp reminders ready to dispatch.',
    type: 'RENT_ALERT',
    timestamp: new Date().toISOString(),
    read: false,
  },
  {
    id: 'notif_2',
    title: 'New House Purchase Request',
    message: 'Amit requested Kitchen Dishwashing Gel (Est. ₹350)',
    type: 'PURCHASE_REQUEST',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
];

export const DEFAULT_PERSONAL_EXPENSES: PersonalExpense[] = [
  {
    id: 'pexp_1',
    memberId: 'mem_prajwal',
    title: 'Monthly Gym Protein Powder & Shaker',
    amount: 2400,
    category: 'Health & Fitness',
    date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    notes: 'Personal fitness goal',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'pexp_2',
    memberId: 'mem_prajwal',
    title: 'Personal Spotify & YouTube Premium',
    amount: 299,
    category: 'Subscriptions & Bills',
    date: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
    notes: 'Personal entertainment',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'pexp_3',
    memberId: 'mem_rohan',
    title: 'Namma Metro Smart Card Recharge',
    amount: 600,
    category: 'Commute & Travel',
    date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    notes: 'Work commute to tech park',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'pexp_4',
    memberId: 'mem_rohan',
    title: 'Evening snacks & chai with colleagues',
    amount: 180,
    category: 'Food & Snacks',
    date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'pexp_5',
    memberId: 'mem_amit',
    title: 'Bike Petrol Refuel',
    amount: 550,
    category: 'Commute & Travel',
    date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const DEFAULT_PANTRY_ITEMS: PantryItem[] = [
  {
    id: 'pantry_1',
    name: '20L Bisleri Mineral Water Cans',
    category: 'Water & Gas',
    status: 'IN_STOCK',
    quantity: '2 cans full, 1 on dispenser',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'pantry_2',
    name: 'Fortune Sunlite Sunflower Cooking Oil (5L)',
    category: 'Groceries',
    status: 'RUNNING_LOW',
    quantity: 'Approx 0.5 L remaining',
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'pantry_3',
    name: 'Madhur Refined Sugar (5 Kg)',
    category: 'Groceries',
    status: 'IN_STOCK',
    quantity: '3.5 kg in jar',
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'pantry_4',
    name: 'Tata Tea Gold & Bru Instant Coffee',
    category: 'Groceries',
    status: 'IN_STOCK',
    quantity: 'Full jar',
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'pantry_5',
    name: 'Vim Dishwash Gel (750ml) + Scotch Brite',
    category: 'Cleaning',
    status: 'RUNNING_LOW',
    quantity: 'Less than 100ml left',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'pantry_6',
    name: 'Surf Excel Matic Liquid Detergent',
    category: 'Cleaning',
    status: 'IN_STOCK',
    quantity: '2L bottle half full',
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'pantry_7',
    name: 'Black Garbage Trash Bags (Medium 30 Pcs)',
    category: 'Cleaning',
    status: 'OUT_OF_STOCK',
    quantity: 'Completely finished',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'pantry_8',
    name: 'Dettol Handwash Liquid Refill (1.5L)',
    category: 'Toiletries',
    status: 'IN_STOCK',
    quantity: '1 pouch available',
    updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

export const DEFAULT_CHORES: FlatChore[] = [
  {
    id: 'chore_1',
    title: 'Kitchen Counter & Cooking Stove Wipe-down',
    assignedMemberId: 'mem_amit',
    frequency: 'Weekly',
    dueDay: 'Every Wednesday',
    status: 'PENDING',
  },
  {
    id: 'chore_2',
    title: 'Daily Trash Bag Tying & Doorstep Placement',
    assignedMemberId: 'mem_rohan',
    frequency: 'Daily',
    dueDay: 'Daily by 8:30 AM',
    status: 'DONE',
    lastCompletedAt: new Date().toISOString(),
  },
  {
    id: 'chore_3',
    title: 'Water Dispenser Empty Can Replacement & Vendor Call',
    assignedMemberId: 'mem_vikram',
    frequency: 'Weekly',
    dueDay: 'Every Friday',
    status: 'PENDING',
  },
  {
    id: 'chore_4',
    title: 'Living Room & Dining Area Vacuum / Sweeping',
    assignedMemberId: 'mem_karthik',
    frequency: 'Weekly',
    dueDay: 'Every Sunday',
    status: 'PENDING',
  },
  {
    id: 'chore_5',
    title: 'Refrigerator De-clutter & Vegetable Tray Cleaning',
    assignedMemberId: 'mem_sneha',
    frequency: 'Bi-Weekly',
    dueDay: '2nd & 4th Saturday',
    status: 'DONE',
    lastCompletedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export const DEFAULT_CONTACTS: FlatContact[] = [
  {
    id: 'cont_1',
    role: 'Flat Owner / Landlord',
    name: 'Mr. Ramesh Sharma',
    phone: '9820011223',
    notes: 'For lease agreement, NEFT rent receipt on 11th',
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
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'notice_2',
    title: 'Quiet Hours & Late Night Courtesy',
    content: 'Please keep music, gaming, and television volume low after 10:30 PM on weekdays in respect of roommates.',
    isImportant: false,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
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
      personalExpenses: parsed.personalExpenses || initial.personalExpenses,
      pantryItems: parsed.pantryItems || initial.pantryItems,
      chores: parsed.chores || initial.chores,
      contacts: parsed.contacts || initial.contacts,
      notices: parsed.notices || initial.notices,
    };
  } catch (err) {
    console.error('Failed to parse FlatMate storage, resetting to default', err);
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
