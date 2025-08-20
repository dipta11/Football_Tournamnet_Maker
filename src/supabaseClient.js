import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://lauwsfgxfrjpgnsmfqub.supabase.co"
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdXdzZmd4ZnJqcGduc21mcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjU2NTQsImV4cCI6MjA3MTEwMTY1NH0.1pvFdwlqEH5w4bK047AI41Ik-9YB-BPKckC1E0FX-YA"
export const supabase = createClient(supabaseUrl,supabaseAnonKey);
