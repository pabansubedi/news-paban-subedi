import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  url: 'https://sjuhibdipqznpedphptu.supabase.co',
  key: 'sb_publishable_NlZ7AdufiBB7fauxDe6uJw_jnrfpO7h'
};

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
