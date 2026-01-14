// Supabase client initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SUPABASE_URL');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// Common operations
export const api = {
  // Waitlist
  addToWaitlist: async (email) => {
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email }])
      .select();
    return { data, error };
  },

  // Early Access
  addEarlyAccess: async (name, email) => {
    const { data, error } = await supabase
      .from('early_access')
      .insert([{ name, email }])
      .select();
    return { data, error };
  },

  // Farm Applications
  submitFarmApplication: async (formData) => {
    const { data, error } = await supabase
      .from('farm_applications')
      .insert([formData])
      .select();
    return { data, error };
  },

  // Newsletter
  subscribeNewsletter: async (email) => {
    const { data, error } = await supabase
      .from('newsletter')
      .insert([{ email }])
      .select();
    return { data, error };
  },

  // Get all entries (admin use)
  getWaitlist: async () => {
    const { data, error } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Get farms
  getFarms: async () => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Add farm (admin use)
  addFarm: async (farmData) => {
    const { data, error } = await supabase
      .from('farms')
      .insert([farmData])
      .select();
    return { data, error };
  }
};
