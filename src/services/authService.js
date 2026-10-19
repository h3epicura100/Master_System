import { supabase } from './supabase'

export const authService = {
  /**
   * Authenticate a user with username and password against master_users table
   */
  async login(username, password) {
    try {
      if (!username?.trim() || !password) {
        return { success: false, error: 'Username and password are required' }
      }

      const cleanUsername = username.trim()
      const { data: user, error } = await supabase
        .from('master_users')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle()

      if (error) {
        console.error('Login database error:', error)
        return { success: false, error: 'Database connection failed: ' + error.message }
      }

      if (!user) {
        return { success: false, error: 'User not found. Please check your username.' }
      }

      if (user.is_active === false) {
        return { success: false, error: 'Your account has been deactivated. Please contact the administrator.' }
      }

      if (user.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' }
      }

      // Ensure page_access object is parsed properly
      let pageAccess = user.page_access
      if (typeof pageAccess === 'string') {
        try {
          pageAccess = JSON.parse(pageAccess)
        } catch {
          pageAccess = {}
        }
      }

      const safeUser = {
        ...user,
        page_access: pageAccess || {},
      }

      return { success: true, user: safeUser }
    } catch (err) {
      console.error('Login exception:', err)
      return { success: false, error: err.message || 'An unexpected error occurred during login.' }
    }
  },

  /**
   * Fetch all users from master_users table
   */
  async fetchAllUsers() {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const parsedUsers = (data || []).map(u => ({
        ...u,
        page_access: typeof u.page_access === 'string' ? JSON.parse(u.page_access) : (u.page_access || {})
      }))

      return { success: true, users: parsedUsers }
    } catch (err) {
      console.error('Fetch users error:', err)
      return { success: false, error: err.message, users: [] }
    }
  },

  /**
   * Fetch single user by ID
   */
  async getUserById(id) {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return {
        success: true,
        user: {
          ...data,
          page_access: typeof data.page_access === 'string' ? JSON.parse(data.page_access) : (data.page_access || {})
        }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Create a new user in master_users
   */
  async createUser(payload) {
    try {
      const { username, full_name, password, role, mobile_number, page_access, is_active } = payload

      if (!username?.trim() || !full_name?.trim() || !password?.trim()) {
        return { success: false, error: 'Username, Full Name, and Password are required.' }
      }

      // Check if username already exists
      const { data: existing } = await supabase
        .from('master_users')
        .select('id')
        .ilike('username', username.trim())
        .maybeSingle()

      if (existing) {
        return { success: false, error: `Username "${username.trim()}" is already taken.` }
      }

      const insertData = {
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        password: password.trim(),
        role: role || 'user',
        mobile_number: mobile_number?.trim() || '',
        page_access: page_access || {},
        is_active: is_active !== false,
        join_date: payload.join_date || null,
        base_salary: payload.base_salary !== undefined && payload.base_salary !== null && !isNaN(Number(payload.base_salary)) ? Number(payload.base_salary) : 0,
        department: payload.department || 'WORKER',
        designation: payload.designation || 'Staff Worker',
        custom_designation: payload.custom_designation || '',
        emergency_contact_name: payload.emergency_contact_name?.trim() || '',
        emergency_contact_phone: payload.emergency_contact_phone?.trim() || '',
        aadhar_number: payload.aadhar_number?.trim() || '',
        aadhar_attachment: payload.aadhar_attachment || '',
        aadhar_attachment_name: payload.aadhar_attachment_name || '',
        aadhar_address: payload.aadhar_address?.trim() || '',
        current_address: payload.current_address?.trim() || '',
      }

      const { data, error } = await supabase
        .from('master_users')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return { success: true, user: data }
    } catch (err) {
      console.error('Create user error:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * Update an existing user in master_users
   */
  async updateUser(id, payload) {
    try {
      const { full_name, password, role, mobile_number, page_access, is_active } = payload

      const updateData = {
        updated_at: new Date().toISOString(),
      }

      if (full_name !== undefined) updateData.full_name = full_name.trim()
      if (password && password.trim() !== '') updateData.password = password.trim()
      if (role !== undefined) updateData.role = role
      if (mobile_number !== undefined) updateData.mobile_number = mobile_number.trim()
      if (page_access !== undefined) updateData.page_access = page_access
      if (is_active !== undefined) updateData.is_active = is_active

      // Dedicated profile columns
      if (payload.join_date !== undefined) updateData.join_date = payload.join_date || null
      if (payload.base_salary !== undefined) {
        updateData.base_salary = payload.base_salary !== null && !isNaN(Number(payload.base_salary)) ? Number(payload.base_salary) : 0
      }
      if (payload.department !== undefined) updateData.department = payload.department
      if (payload.designation !== undefined) updateData.designation = payload.designation
      if (payload.custom_designation !== undefined) updateData.custom_designation = payload.custom_designation
      if (payload.emergency_contact_name !== undefined) updateData.emergency_contact_name = payload.emergency_contact_name
      if (payload.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = payload.emergency_contact_phone
      if (payload.aadhar_number !== undefined) updateData.aadhar_number = payload.aadhar_number
      if (payload.aadhar_attachment !== undefined) updateData.aadhar_attachment = payload.aadhar_attachment
      if (payload.aadhar_attachment_name !== undefined) updateData.aadhar_attachment_name = payload.aadhar_attachment_name
      if (payload.aadhar_address !== undefined) updateData.aadhar_address = payload.aadhar_address
      if (payload.current_address !== undefined) updateData.current_address = payload.current_address

      const { data, error } = await supabase
        .from('master_users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, user: data }
    } catch (err) {
      console.error('Update user error:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * Delete a user by ID
   */
  async deleteUser(id) {
    try {
      const { error } = await supabase
        .from('master_users')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('Delete user error:', err)
      return { success: false, error: err.message }
    }
  },

  /**
   * Toggle user active status
   */
  async toggleUserStatus(id, newStatus) {
    try {
      const { data, error } = await supabase
        .from('master_users')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, user: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  /**
   * Upload an Aadhar attachment to the 'aadhar-attachments' Supabase Storage bucket
   * Returns public URL of the uploaded document
   */
  async uploadAadharAttachment(file, username = 'staff') {
    try {
      if (!file) return { success: false, error: 'No file provided' }
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${Date.now()}_${username || 'staff'}_${cleanName}`
      const filePath = `aadhar/${fileName}`

      const { data, error } = await supabase.storage
        .from('aadhar-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('aadhar-attachments')
        .getPublicUrl(filePath)

      return {
        success: true,
        publicUrl: publicUrlData?.publicUrl || '',
        fileName: file.name
      }
    } catch (err) {
      console.error('Error uploading aadhar attachment to Supabase Storage:', err)
      return { success: false, error: err.message }
    }
  }
}
