import config from 'config';
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = config.get<string>('app.supabase.url');
const supabaseKey = config.get<string>('app.supabase.apiKey');

export type Database = SupabaseClient<any, "public", any>;
export const Database = createClient(supabaseUrl, supabaseKey);
