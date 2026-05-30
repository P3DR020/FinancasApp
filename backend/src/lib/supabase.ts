import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios no .env');
  process.exit(1);
}

// Client com service_role key — bypassa RLS
// Todas as queries precisam filtrar por user_id manualmente
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
