// Supabase client initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('SUPABASE_URL');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Validate UUID format
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Get current user ID for ownership tracking
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// Common operations with UUIDs and ownership
export const api = {
  // Waitlist - with UUID
  addToWaitlist: async (email) => {
    const id = generateUUID();
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ id, email }])
      .select();
    return { data, error };
  },

  // Early Access - with UUID
  addEarlyAccess: async (name, email) => {
    const id = generateUUID();
    const { data, error } = await supabase
      .from('early_access')
      .insert([{ id, name, email }])
      .select();
    return { data, error };
  },

  // Farm Applications - with UUID and ownership
  submitFarmApplication: async (formData) => {
    const id = generateUUID();
    const owner_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('farm_applications')
      .insert([{ id, ...formData, owner_id }])
      .select();
    return { data, error };
  },

  // Newsletter - with UUID
  subscribeNewsletter: async (email) => {
    const id = generateUUID();
    const { data, error } = await supabase
      .from('newsletter')
      .insert([{ id, email }])
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

  // Add farm (admin use) - with UUID and ownership
  addFarm: async (farmData) => {
    const id = generateUUID();
    const owner_id = await getCurrentUserId();
    const { data, error } = await supabase
      .from('farms')
      .insert([{ id, ...farmData, owner_id }])
      .select();
    return { data, error };
  },

  // Update farm with ownership check
  updateFarm: async (farmId, farmData) => {
    if (!isValidUUID(farmId)) {
      return { data: null, error: { message: 'Invalid UUID format' } };
    }
    
    const owner_id = await getCurrentUserId();
    
    // First check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (fetchError) {
      return { data: null, error: fetchError };
    }
    
    if (existing.owner_id && existing.owner_id !== owner_id) {
      return { data: null, error: { message: 'Access denied. You do not own this resource.' } };
    }
    
    const { data, error } = await supabase
      .from('farms')
      .update({ ...farmData, updated_at: new Date().toISOString() })
      .eq('id', farmId)
      .select();
    return { data, error };
  },

  // Delete farm with ownership check
  deleteFarm: async (farmId) => {
    if (!isValidUUID(farmId)) {
      return { data: null, error: { message: 'Invalid UUID format' } };
    }
    
    const owner_id = await getCurrentUserId();
    
    // First check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('farms')
      .select('owner_id')
      .eq('id', farmId)
      .single();
    
    if (fetchError) {
      return { data: null, error: fetchError };
    }
    
    if (existing.owner_id && existing.owner_id !== owner_id) {
      return { data: null, error: { message: 'Access denied. You do not own this resource.' } };
    }
    
    const { data, error } = await supabase
      .from('farms')
      .delete()
      .eq('id', farmId);
    return { data, error };
  },

  // Get farm by ID with UUID validation
  getFarmById: async (farmId) => {
    if (!isValidUUID(farmId)) {
      return { data: null, error: { message: 'Invalid UUID format' } };
    }
    
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();
    return { data, error };
  },

  // Check if current user owns a resource
  checkOwnership: async (table, resourceId) => {
    if (!isValidUUID(resourceId)) {
      return { owns: false, error: 'Invalid UUID format' };
    }
    
    const owner_id = await getCurrentUserId();
    if (!owner_id) {
      return { owns: false, error: 'Not authenticated' };
    }
    
    const { data, error } = await supabase
      .from(table)
      .select('owner_id')
      .eq('id', resourceId)
      .single();
    
    if (error) {
      return { owns: false, error: error.message };
    }
    
    return { owns: data.owner_id === owner_id, error: null };
  }
};

// Export utilities
export { generateUUID, isValidUUID, getCurrentUserId };
