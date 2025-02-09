
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rzfulwnscfwbhnhxsuxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6ZnVsd25zY2Z3YmhuaHhzdXhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxMjY0NzMsImV4cCI6MjA1NDcwMjQ3M30.OxSDbM47GEnAf5nIv7e-Vnea5tpewDMRJZepXfacEBQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
