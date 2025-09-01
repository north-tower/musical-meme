import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tjeougsaxfuznmquezon.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZW91Z3NheGZ1em5tcXVlem9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAxOTAyOTcsImV4cCI6MjAzNTc2NjI5N30.vZ2mKg4WIZSUUPt36qu9vOr4Lfm_rLkBwqMNbWvINVw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);




