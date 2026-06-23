import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://apwrqyyxufwngtzbfbnj.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_diCIvcsQ5H-mSMrwn3XiNw_lF3K_r_W";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
