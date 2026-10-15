import { Member, ExpenseShare, RecurringBill, NetBalanceDetail } from '@/types';

/**
 * Splits an amount evenly among selected members with exact paise (cent) remainder balancing.
 * E.g., ₹1000 divided among 3 members: Member 1 gets 333.34, Members 2 & 3 get 333.33. Total is exactly 1000.00.
 */
export function calculateExactSplit(totalAmount: number, memberIds: string[]): Record<string, number> {
  if (memberIds.length === 0 || totalAmount <= 0) return {};

  const totalPaise = Math.round(totalAmount * 100);
  const basePaisePerPerson = Math.floor(totalPaise / memberIds.length);
  const remainderPaise = totalPaise % memberIds.length;

  const result: Record<string, number> = {};

  memberIds.forEach((id, index) => {
    // Distribute the remainder paise 1 by 1 to the first few members
    const paise = basePaisePerPerson + (index < remainderPaise ? 1 : 0);
    result[id] = paise / 100;
  });

  return result;
}

/**
 * Calculates net balance for every member based on active (ARREAR) shares.
 */
export function calculateNetBalances(members: Member[], shares: ExpenseShare[]): NetBalanceDetail[] {
  const arrears = shares.filter((s) => s.status === 'ARREAR');

  return members.map((member) => {
    // Total owed to this member by others
    const totalOwedToThem = arrears
      .filter((s) => s.creditorId === member.id && s.debtorId !== member.id)
      .reduce((sum, s) => sum + s.amount, 0);

    // Total this member owes to others
    const totalTheyOwe = arrears
      .filter((s) => s.debtorId === member.id && s.creditorId !== member.id)
      .reduce((sum, s) => sum + s.amount, 0);

    const net = totalOwedToThem - totalTheyOwe;

    return {
      memberId: member.id,
      memberName: member.name,
      totalOwedToThem: Math.round(totalOwedToThem * 100) / 100,
      totalTheyOwe: Math.round(totalTheyOwe * 100) / 100,
      netBalance: Math.round(net * 100) / 100,
    };
  });
}

/**
 * Checks the status of a recurring bill relative to the current date.
 * Returns due date string, days remaining, and whether it is within the 3-day reminder window.
 */
export function getRecurringBillStatus(bill: RecurringBill) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const currentDay = today.getDate();

  // Due date in the current month
  let dueDate = new Date(currentYear, currentMonth, bill.dueDay);

  // If already passed in current month, next due date is next month
  if (currentDay > bill.dueDay) {
    dueDate = new Date(currentYear, currentMonth + 1, bill.dueDay);
  }

  // Calculate difference in calendar days
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / msPerDay);

  // 3-day window: due in 0, 1, 2, or 3 days
  const isWithinReminderWindow = daysRemaining >= 0 && daysRemaining <= (bill.reminderDaysBefore || 3);
  const isOverdue = daysRemaining < 0;

  return {
    dueDate,
    formattedDueDate: dueDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    daysRemaining,
    isWithinReminderWindow,
    isOverdue,
  };
}

/**
 * Clean phone number for WhatsApp link
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return '91' + digits; // Add default Indian country code
  }
  return digits;
}

/**
 * Generates direct WhatsApp URL with prefilled text and payment details.
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Constructs the reminder message for an individual arrear.
 */
export function buildArrearReminderText(params: {
  debtorName: string;
  creditorName: string;
  creditorUpiId?: string;
  expenseTitle: string;
  amount: number;
  category?: string;
}): string {
  const { debtorName, creditorName, creditorUpiId, expenseTitle, amount, category } = params;
  const formattedAmt = `₹${amount.toFixed(2)}`;

  let msg = `Hi ${debtorName}! 👋\n\n`;
  msg += `This is a friendly reminder for your share in our Flat expenses:\n`;
  msg += `📌 Expense: *${expenseTitle}*${category ? ` (${category})` : ''}\n`;
  msg += `💰 Amount to pay: *${formattedAmt}*\n`;
  msg += `👤 Payable to: *${creditorName}*\n\n`;

  if (creditorUpiId) {
    msg += `💳 UPI ID: *${creditorUpiId}*\n`;
    msg += `👉 (You can also scan my QR code on our FlatMate Portal)\n\n`;
  }

  msg += `Once paid, please mark it on the portal. Thanks! 🙌`;
  return msg;
}

/**
 * Constructs the rent reminder message (sent 3 days prior to 11th / 15th).
 */
export function buildRentReminderText(params: {
  memberName: string;
  holderName: string;
  holderUpiId: string;
  billTitle: string;
  dueDay: number;
  formattedDueDate: string;
  daysRemaining: number;
  perPersonShare: number;
}): string {
  const { memberName, holderName, holderUpiId, billTitle, formattedDueDate, daysRemaining, perPersonShare } = params;
  const formattedAmt = `₹${perPersonShare.toFixed(2)}`;

  const urgency = daysRemaining === 0 ? 'DUE TODAY' : `due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

  let msg = `🔔 *Flat Rent Reminder - ${urgency}*\n\n`;
  msg += `Hi ${memberName},\n`;
  msg += `The *${billTitle}* is scheduled for *${formattedDueDate}*.\n\n`;
  msg += `🏷️ Your share: *${formattedAmt}*\n`;
  msg += `👤 Send to Holder: *${holderName}*\n`;
  msg += `💳 Holder UPI ID: *${holderUpiId}*\n\n`;
  msg += `Please complete the payment on or before the due date so the landlord/service can be settled on time. Thank you! 🙏`;
  return msg;
}

/**
 * Currency formatter (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
