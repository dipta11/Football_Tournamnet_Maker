import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "your_supabase_url"
const supabaseAnonKey ="your_supabase_anon_key"
export const supabase = createClient(supabaseUrl,supabaseAnonKey);
