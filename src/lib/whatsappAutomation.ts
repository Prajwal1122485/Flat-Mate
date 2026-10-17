/**
 * WhatsApp Automated Rent Reminder Engine
 * 
 * Automatically identifies when recurring rents are within 3 days of their due date:
 * - House Rent: Due on 11th of month -> Reminders trigger on 8th, 9th, 10th, 11th
 * - Washing Machine / Appliances: Due on 15th of month -> Reminders trigger on 12th, 13th, 14th, 15th
 */

import { Member, RecurringBill, ExpenseShare } from '@/types';

export interface AutomatedReminderItem {
  billId: string;
  billTitle: string;
  dueDay: number;
  daysRemaining: number;
  isTriggerWindow: boolean; // true if within 3 days before due date
  debtor: Member;
  amount: number;
  holder: Member;
  whatsappUrl: string;
  formattedMessage: string;
}

/**
 * Calculates days remaining until the given due day of the current month.
 */
export function getDaysUntilDue(dueDay: number): { daysRemaining: number; isWithin3Days: boolean; isOverdue: boolean } {
  const now = new Date();
  const currentDay = now.getDate();

  const daysRemaining = dueDay - currentDay;
  const isWithin3Days = daysRemaining >= 0 && daysRemaining <= 3;
  const isOverdue = daysRemaining < 0;

  return { daysRemaining, isWithin3Days, isOverdue };
}

/**
 * Builds a direct, personalized WhatsApp message URL.
 */
export function buildWhatsAppReminderUrl(
  phone: string,
  debtorName: string,
  billTitle: string,
  amount: number,
  dueDay: number,
  daysRemaining: number,
  holderName: string,
  holderUpi: string
): { url: string; message: string } {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const destinationPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  let timingText = '';
  if (daysRemaining === 0) {
    timingText = 'today (11th)';
  } else if (daysRemaining === 1) {
    timingText = 'tomorrow';
  } else if (daysRemaining > 1) {
    timingText = `in ${daysRemaining} days (due on ${dueDay}th)`;
  } else {
    timingText = `overdue since ${dueDay}th`;
  }

  const upiInfo = holderUpi ? ` via UPI: ${holderUpi}` : '';
  const message = `Hi ${debtorName}! Gentle automated reminder from Flat-Mate 🏠: Your share for "${billTitle}" is ₹${amount}, due ${timingText}. Please transfer to Holder ${holderName}${upiInfo}. If you need more time, you can request an extension in the flat portal. Thank you!\n\n🌐 Flat-Mate Portal: https://flat-mate-ashy.vercel.app/`;

  const url = `https://wa.me/${destinationPhone}?text=${encodeURIComponent(message)}`;
  return { url, message };
}

/**
 * Scans recurring bills and identifies all flatmates who need a reminder.
 */
export function getAutomatedRentReminders(
  recurringBills: RecurringBill[],
  members: Member[],
  shares: ExpenseShare[],
  holder: Member
): AutomatedReminderItem[] {
  const results: AutomatedReminderItem[] = [];

  for (const bill of recurringBills) {
    const { daysRemaining, isWithin3Days, isOverdue } = getDaysUntilDue(bill.dueDay);

    // Only active within 3 days before or if overdue
    if (!isWithin3Days && !isOverdue) continue;

    // Check which split members have pending shares
    const targetMembers = members.filter(
      (m) => bill.splitMemberIds.includes(m.id) && m.id !== holder.id
    );

    const perPersonShare = Math.round(bill.amount / (bill.splitMemberIds.length || 1));

    for (const member of targetMembers) {
      // Check if this member has an unsettled arrear for this bill in current month
      const matchingShares = shares.filter(
        (s) =>
          s.debtorId === member.id &&
          s.creditorId === holder.id &&
          s.expenseTitle.toLowerCase().includes(bill.title.toLowerCase())
      );

      const hasPaid = matchingShares.length > 0 && matchingShares.every((s) => s.status === 'COMPLETED');

      // If not paid, queue an automated reminder
      if (!hasPaid) {
        const { url, message } = buildWhatsAppReminderUrl(
          member.phone,
          member.name,
          bill.title,
          perPersonShare,
          bill.dueDay,
          daysRemaining,
          holder.name,
          holder.upiId || ''
        );

        results.push({
          billId: bill.id,
          billTitle: bill.title,
          dueDay: bill.dueDay,
          daysRemaining,
          isTriggerWindow: isWithin3Days || isOverdue,
          debtor: member,
          amount: perPersonShare,
          holder,
          whatsappUrl: url,
          formattedMessage: message,
        });
      }
    }
  }

  return results;
}
