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
 * Calculates a specific member's total share and detailed line-item breakdown for a bill,
 * including base bill and all attached (+) sub-items (furniture, chairs, tables, deposit).
 */
export function calculateMemberBillShare(
  bill: RecurringBill,
  memberId: string
): { total: number; breakdown: { title: string; amount: number }[] } {
  const breakdown: { title: string; amount: number }[] = [];

  // 1. Base bill share
  const baseMembers = bill.splitMemberIds || [];
  if (baseMembers.includes(memberId) && baseMembers.length > 0) {
    const baseShare = Math.round((bill.amount / baseMembers.length) * 100) / 100;
    breakdown.push({
      title: bill.title,
      amount: baseShare,
    });
  }

  // 2. Sub-items (furniture, chairs, tables, extra deposit, maintenance)
  if (bill.subItems && bill.subItems.length > 0) {
    bill.subItems.forEach((sub) => {
      const subMems = sub.memberIds || [];
      if (subMems.includes(memberId) && subMems.length > 0) {
        const subShare = Math.round((sub.amount / subMems.length) * 100) / 100;
        breakdown.push({
          title: sub.title,
          amount: subShare,
        });
      }
    });
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  return { total, breakdown };
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
  breakdown?: { title: string; amount: number }[];
  billId?: string;
  memberId?: string;
}): string {
  const {
    memberName,
    holderName,
    holderUpiId,
    billTitle,
    formattedDueDate,
    daysRemaining,
    perPersonShare,
    breakdown,
    billId,
    memberId,
  } = params;
  const formattedAmt = `₹${perPersonShare.toFixed(2)}`;

  const urgency =
    daysRemaining === 0
      ? 'DUE TODAY'
      : `due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

  let msg = `🔔 *Flat Rent & Bills Reminder - ${urgency}*\n\n`;
  msg += `Hi ${memberName}! 👋\n`;
  msg += `This is an automated reminder for *${billTitle}* scheduled for *${formattedDueDate}*.\n\n`;

  if (breakdown && breakdown.length > 0) {
    msg += `📋 *Itemized Formula & Breakdown:*\n`;
    const formulaStr = breakdown.map((i) => `₹${Math.round(i.amount)}`).join(' + ');
    msg += `(${formulaStr}) = *${formattedAmt}*\n`;
    breakdown.forEach((item) => {
      msg += `  • ${item.title}: ₹${item.amount.toFixed(2)}\n`;
    });
    msg += `👉 *Total to Pay:* *${formattedAmt}*\n\n`;
  } else {
    msg += `🏷️ Your share: *${formattedAmt}*\n\n`;
  }

  msg += `👤 Send to Holder: *${holderName}*\n`;
  if (holderUpiId) {
    msg += `💳 Holder UPI ID: *${holderUpiId}*\n`;
  }
  msg += `📱 View Holder QR Code on Flat-Mate App\n\n`;

  if (billId && memberId) {
    msg += `⚡ *1-Click In-App Direct Payment:* \n`;
    msg += `https://flat-mate-ashy.vercel.app/?action=pay&billId=${billId}&memberId=${memberId}&amount=${Math.round(perPersonShare)}\n\n`;
  }

  msg += `Please complete the payment on or before the due date. Once paid, mark it in the app. Thank you! 🙏`;
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

export interface DirectDebtSummary {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  itemCount: number;
}

/**
 * Summarizes exact peer debts into crystal clear, human-understandable records:
 * "Roommate A has to give ₹X to Roommate B"
 */
export function getDirectDebtSummaries(members: Member[], shares: ExpenseShare[]): DirectDebtSummary[] {
  const arrears = shares.filter((s) => s.status === 'ARREAR' || s.status === 'CLAIMED_PAID');
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const pairMap = new Map<string, { amount: number; count: number }>();

  arrears.forEach((s) => {
    if (s.debtorId === s.creditorId) return;
    const pairKey = `${s.debtorId}__TO__${s.creditorId}`;
    const current = pairMap.get(pairKey) || { amount: 0, count: 0 };
    pairMap.set(pairKey, {
      amount: current.amount + (s.amount - (s.partialPaidAmount || 0)),
      count: current.count + 1,
    });
  });

  const results: DirectDebtSummary[] = [];
  pairMap.forEach((data, key) => {
    const [debtorId, creditorId] = key.split('__TO__');
    const fromMember = memberMap.get(debtorId);
    const toMember = memberMap.get(creditorId);
    if (fromMember && toMember && data.amount > 0) {
      results.push({
        fromMemberId: debtorId,
        fromMemberName: fromMember.name,
        toMemberId: creditorId,
        toMemberName: toMember.name,
        amount: Math.round(data.amount * 100) / 100,
        itemCount: data.count,
      });
    }
  });

  return results.sort((a, b) => b.amount - a.amount);
}

export interface AutomatedRentReminder {
  billId: string;
  billTitle: string;
  dueDay: number;
  formattedDueDate: string;
  daysRemaining: number;
  debtor: Member;
  amount: number;
  whatsappUrl: string;
}

export function getAutomatedRentReminders(
  recurringBills: RecurringBill[],
  members: Member[],
  shares: ExpenseShare[],
  holder: Member
): AutomatedRentReminder[] {
  const reminders: AutomatedRentReminder[] = [];
  const memberMap = new Map(members.map((m) => [m.id, m]));

  recurringBills.forEach((bill) => {
    const status = getRecurringBillStatus(bill);
    if (status.isWithinReminderWindow) {
      // Gather all members included in base split or in subItems
      const allTargetIds = new Set<string>();
      (bill.splitMemberIds && bill.splitMemberIds.length > 0
        ? bill.splitMemberIds
        : members.map((m) => m.id)
      ).forEach((id) => allTargetIds.add(id));
      (bill.subItems || []).forEach((sub) =>
        (sub.memberIds || []).forEach((id) => allTargetIds.add(id))
      );

      allTargetIds.forEach((targetId) => {
        if (targetId === bill.payerId) return;
        const targetMember = memberMap.get(targetId);
        if (!targetMember) return;

        const { total, breakdown } = calculateMemberBillShare(bill, targetId);
        if (total <= 0) return;

        const msg = buildRentReminderText({
          memberName: targetMember.name,
          holderName: holder.name,
          holderUpiId: holder.upiId || 'via portal',
          billTitle: bill.title,
          dueDay: bill.dueDay,
          formattedDueDate: status.formattedDueDate,
          daysRemaining: status.daysRemaining,
          perPersonShare: total,
          breakdown: breakdown,
          billId: bill.id,
          memberId: targetMember.id,
        });

        reminders.push({
          billId: bill.id,
          billTitle: bill.title,
          dueDay: bill.dueDay,
          formattedDueDate: status.formattedDueDate,
          daysRemaining: status.daysRemaining,
          debtor: targetMember,
          amount: Math.round(total * 100) / 100,
          whatsappUrl: generateWhatsAppLink(targetMember.phone, msg),
        });
      });
    }
  });

  return reminders;
}

