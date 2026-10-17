import { supabase } from '../../services/supabase';

const DEFAULT_FUNCTION_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Engagement', 'Anniversary', 'Other'];
const DEFAULT_EVENT_TIMES = ['Lunch', 'Dinner', 'Breakfast', 'Brunch', 'High Tea', 'Evening Snacks', 'Late Night', 'All Day', 'Custom'];

export const masterService = {
  // --- FUNCTION TYPES ---
  async getFunctionTypes() {
    try {
      const { data, error } = await supabase
        .from('pms_function_types')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(d => ({ id: d.id, name: d.name }));
      }
    } catch (e) {}
    return DEFAULT_FUNCTION_TYPES.map((name, i) => ({ id: i + 1, name }));
  },

  async addFunctionType(name) {
    const { data, error } = await supabase
      .from('pms_function_types')
      .insert([{ name }])
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  },

  async updateFunctionType(id, name) {
    const { data, error } = await supabase
      .from('pms_function_types')
      .update({ name })
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  },

  async deleteFunctionType(id) {
    const { error } = await supabase
      .from('pms_function_types')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // --- EVENT TIMES ---
  async getEventTimes() {
    try {
      const { data, error } = await supabase
        .from('pms_event_times')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map(d => ({ id: d.id, name: d.name }));
      }
    } catch (e) {}
    return DEFAULT_EVENT_TIMES.map((name, i) => ({ id: i + 1, name }));
  },

  async addEventTime(name) {
    const { data, error } = await supabase
      .from('pms_event_times')
      .insert([{ name }])
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  },

  async updateEventTime(id, name) {
    const { data, error } = await supabase
      .from('pms_event_times')
      .update({ name })
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data[0];
  },

  async deleteEventTime(id) {
    const { error } = await supabase
      .from('pms_event_times')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};
