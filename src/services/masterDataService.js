import { supabase } from './supabase'

export const masterDataService = {
  // ==================== PETE MASTERS (public.pete_master) ====================
  
  async getPeteMasters(category = null) {
    try {
      let query = supabase.from('pete_master').select('*').order('value', { ascending: true })
      if (category) {
        query = query.eq('category', category)
      }
      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      console.error('getPeteMasters error:', err)
      return { success: false, error: err.message, data: [] }
    }
  },

  async addPeteMaster(category, value) {
    try {
      if (!value?.trim()) return { success: false, error: 'Value is required' }
      const { data, error } = await supabase
        .from('pete_master')
        .insert({ category, value: value.trim() })
        .select()
        .single()
      if (error) throw error
      return { success: true, item: data }
    } catch (err) {
      console.error('addPeteMaster error:', err)
      return { success: false, error: err.message }
    }
  },

  async deletePeteMaster(id) {
    try {
      const { error } = await supabase
        .from('pete_master')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('deletePeteMaster error:', err)
      return { success: false, error: err.message }
    }
  },

  // ==================== CROCKERY MASTERS (public.dropdown_options) ====================
  
  async getCrockeryDropdowns(category = null) {
    try {
      let query = supabase.from('dropdown_options').select('*').order('value', { ascending: true })
      if (category) {
        query = query.eq('category', category)
      }
      const { data, error } = await query
      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      console.error('getCrockeryDropdowns error:', err)
      return { success: false, error: err.message, data: [] }
    }
  },

  async addCrockeryDropdown(category, value) {
    try {
      if (!value?.trim()) return { success: false, error: 'Value is required' }
      const { data, error } = await supabase
        .from('dropdown_options')
        .insert({ category, value: value.trim() })
        .select()
        .single()
      if (error) throw error
      return { success: true, item: data }
    } catch (err) {
      console.error('addCrockeryDropdown error:', err)
      return { success: false, error: err.message }
    }
  },

  async deleteCrockeryDropdown(id) {
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('deleteCrockeryDropdown error:', err)
      return { success: false, error: err.message }
    }
  }
}
