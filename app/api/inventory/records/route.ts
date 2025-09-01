import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: records, error } = await supabase
      .from('inventory_records')
      .select('*')
      .order('date', { ascending: false })
      .limit(100); // Increased limit for better product history analysis

    if (error) {
      console.error('Error fetching records:', error);
      return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
    }

    return NextResponse.json({ records: records || [] });
  } catch (error) {
    console.error('Error in records API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
