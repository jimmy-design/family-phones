import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('amount_paid, balance_due');

    if (error) {
      console.error('Supabase error fetching invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    const totalAmountPaid = (invoices || []).reduce((sum: number, inv: any) => sum + (Number(inv.amount_paid) || 0), 0);
    const totalBalanceDue = (invoices || []).reduce((sum: number, inv: any) => sum + (Number(inv.balance_due) || 0), 0);

    // Additional stats placeholders (can be extended)
    const totalInvoices = (invoices || []).length;

    return NextResponse.json({
      totalAmountPaid,
      totalBalanceDue,
      totalInvoices,
    });
  } catch (err) {
    console.error('Unexpected error in /api/statistics:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
}
