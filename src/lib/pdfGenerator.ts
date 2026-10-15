import jsPDF from 'jspdf';
import { Member, ExpenseShare, Expense } from '@/types';

/**
 * Generates an isolated personal expense statement PDF strictly for the specified member.
 * Contains:
 * - Member details
 * - Summary (Total Share, Settled, Outstanding)
 * - Detailed table of every item split for this member:
 *   Item Title, Category, Original Total, Paid By, Split Count, Member's Share, Status, Date
 */
export function generateMemberExpensePDF(
  member: Member,
  memberShares: ExpenseShare[],
  allExpenses: Expense[],
  allMembers: Member[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const expenseMap = new Map(allExpenses.map((e) => [e.id, e]));

  // Totals
  const totalShareSum = memberShares.reduce((acc, s) => acc + s.amount, 0);
  const totalSettled = memberShares
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.amount, 0);
  const totalPending = memberShares
    .filter((s) => s.status === 'ARREAR' || s.status === 'CLAIMED_PAID')
    .reduce((acc, s) => acc + s.amount, 0);

  // Top Banner / Accent Bar
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 32, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FLATMATE EXPENSE REGISTER', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('Personal Member Statement & Split Breakdown', 14, 23);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${printDate}`, 145, 23);

  // Member Information Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, 38, 182, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(member.name, 20, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Phone: ${member.phone || 'N/A'}`, 20, 54);
  doc.text(`UPI ID: ${member.upiId || 'N/A'}`, 20, 60);

  // Summary Metrics inside box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL SHARE', 90, 46);
  doc.text('SETTLED', 125, 46);
  doc.text('PENDING ARREAR', 158, 46);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalShareSum.toFixed(2)}`, 90, 54);

  doc.setTextColor(22, 101, 52); // Green-800
  doc.text(`Rs. ${totalSettled.toFixed(2)}`, 125, 54);

  doc.setTextColor(185, 28, 28); // Red-700
  doc.text(`Rs. ${totalPending.toFixed(2)}`, 158, 54);

  // Table Section Header
  let y = 76;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Itemized Share Breakdown', 14, y);

  y += 6;
  // Table Header Row
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  doc.text('DATE', 17, y + 5.5);
  doc.text('EXPENSE & CATEGORY', 40, y + 5.5);
  doc.text('TOTAL BILL', 98, y + 5.5);
  doc.text('PAID BY', 122, y + 5.5);
  doc.text('SPLIT', 145, y + 5.5);
  doc.text('MY SHARE', 162, y + 5.5);
  doc.text('STATUS', 182, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');

  if (memberShares.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text('No expense records registered for this member yet.', 14, y + 5);
  } else {
    memberShares.forEach((share, index) => {
      // Check page break
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Reprint header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DATE', 17, y + 5.5);
        doc.text('EXPENSE & CATEGORY', 40, y + 5.5);
        doc.text('TOTAL BILL', 98, y + 5.5);
        doc.text('PAID BY', 122, y + 5.5);
        doc.text('SPLIT', 145, y + 5.5);
        doc.text('MY SHARE', 162, y + 5.5);
        doc.text('STATUS', 182, y + 5.5);
        y += 10;
        doc.setFont('helvetica', 'normal');
      }

      const parentExpense = expenseMap.get(share.expenseId);
      const creditor = memberMap.get(share.creditorId);
      const splitCount = parentExpense?.splitMemberIds?.length || 1;
      const formattedDate = new Date(share.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 2, 182, 8, 'F');
      }

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(formattedDate, 17, y + 3.5);

      // Title & category
      doc.setTextColor(15, 23, 42);
      const titleDisplay = share.expenseTitle.length > 28 ? share.expenseTitle.slice(0, 26) + '...' : share.expenseTitle;
      doc.text(titleDisplay, 40, y + 3.5);

      // Bill total
      doc.setTextColor(71, 85, 105);
      const billTotal = parentExpense ? `Rs. ${parentExpense.totalAmount}` : '-';
      doc.text(billTotal, 98, y + 3.5);

      // Paid by
      const paidByName = creditor?.name || 'Holder';
      doc.text(paidByName.length > 10 ? paidByName.slice(0, 9) + '..' : paidByName, 122, y + 3.5);

      // Split count
      doc.text(`${splitCount} mates`, 145, y + 3.5);

      // My Share
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Rs. ${share.amount.toFixed(2)}`, 162, y + 3.5);

      // Status
      if (share.status === 'COMPLETED') {
        doc.setTextColor(22, 101, 52);
        doc.text('SETTLED', 182, y + 3.5);
      } else {
        doc.setTextColor(185, 28, 28);
        doc.text('ARREAR', 182, y + 3.5);
      }

      doc.setFont('helvetica', 'normal');
      y += 8;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `FlatMate Expense Register - Confidential personal report for ${member.name} | Page ${i} of ${pageCount}`,
      14,
      288
    );
  }

  // Trigger download
  const cleanName = member.name.replace(/\s+/g, '_');
  doc.save(`${cleanName}_Expense_Statement.pdf`);
}

/**
 * Generates Master Audit Statement for Holder (Prajwal).
 */
export function generateHolderMasterAuditPDF(
  expenses: Expense[],
  shares: ExpenseShare[],
  members: Member[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const totalHouseSpend = expenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const totalArrears = shares
    .filter((s) => s.status === 'ARREAR')
    .reduce((sum, s) => sum + s.amount, 0);
  const totalSettled = shares
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.amount, 0);

  // Top Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FLATMATE REGISTER - MASTER AUDIT', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Official Group Expense & Arrears Ledger - Holder Statement', 14, 23);

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Audit Date: ${printDate}`, 155, 23);

  // Summary Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 24, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL HOUSE SPEND', 22, 47);
  doc.text('TOTAL SETTLED', 82, 47);
  doc.text('UNSETTLED ARREARS', 142, 47);

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${totalHouseSpend.toFixed(2)}`, 22, 54);

  doc.setTextColor(22, 101, 52);
  doc.text(`Rs. ${totalSettled.toFixed(2)}`, 82, 54);

  doc.setTextColor(185, 28, 28);
  doc.text(`Rs. ${totalArrears.toFixed(2)}`, 142, 54);

  // Table
  let y = 72;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Recorded House Expenses', 14, y);

  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('DATE', 17, y + 5.5);
  doc.text('TITLE / PURPOSE', 40, y + 5.5);
  doc.text('CATEGORY', 95, y + 5.5);
  doc.text('PAID BY', 130, y + 5.5);
  doc.text('SPLIT AMONG', 155, y + 5.5);
  doc.text('TOTAL', 180, y + 5.5);

  y += 10;
  doc.setFont('helvetica', 'normal');

  expenses.forEach((exp, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 2, 182, 8, 'F');
    }

    const payer = memberMap.get(exp.paidById)?.name || 'Holder';
    const dt = new Date(exp.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(dt, 17, y + 3.5);

    doc.setTextColor(15, 23, 42);
    doc.text(exp.title.slice(0, 24), 40, y + 3.5);

    doc.setTextColor(71, 85, 105);
    doc.text(exp.category, 95, y + 3.5);
    doc.text(payer, 130, y + 3.5);
    doc.text(`${exp.splitMemberIds?.length || 1} members`, 155, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Rs. ${exp.totalAmount}`, 180, y + 3.5);
    doc.setFont('helvetica', 'normal');

    y += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`FlatMate Master Audit Statement - Page ${i} of ${pageCount}`, 14, 288);
  }

  doc.save('FlatMate_Master_Audit_Report.pdf');
}
