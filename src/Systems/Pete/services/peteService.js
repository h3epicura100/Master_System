import { supabase } from '../utils/supabaseClient'

/**
 * Combines a date string (e.g. "2026-08-24") with the current time of day
 * to produce a full ISO TIMESTAMPTZ string for PostgreSQL.
 */
function formatToTimestamptz(dateInput) {
  if (!dateInput) return new Date().toISOString()
  if (dateInput.includes('T')) return new Date(dateInput).toISOString()

  const now = new Date()
  const parts = dateInput.split('-').map(Number)
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts
    const combined = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    )
    return combined.toISOString()
  }

  const parsed = new Date(dateInput)
  return !isNaN(parsed.getTime()) ? parsed.toISOString() : now.toISOString()
}

/**
 * Uploads a File object to a Supabase Storage bucket and returns its public URL.
 */
export async function uploadFile(file, bucketName) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error(`Error uploading file to ${bucketName}:`, error)
    throw new Error(`File upload failed: ${error.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)
  return publicUrlData.publicUrl
}

// ==================== DROPDOWN OPTIONS (public.pete_master, grouped by category) ====================

export async function fetchDropdownOptions() {
  const { data, error } = await supabase
    .from('pete_master')
    .select('category, value')
    .order('value', { ascending: true })

  if (error) {
    console.error('Error fetching master dropdown options:', error)
    throw new Error(`Failed to fetch dropdown options: ${error.message}`)
  }

  const items = data || []
  return {
    personName: items.filter((i) => i.category === 'person').map((i) => i.value),
    mode: items.filter((i) => i.category === 'mode').map((i) => i.value),
    groupHead: items.filter((i) => i.category === 'group_head').map((i) => i.value),
    reason: items.filter((i) => i.category === 'reason').map((i) => i.value),
    vendorNames: items.filter((i) => i.category === 'vendor').map((i) => i.value),
  }
}

// ==================== TRANSACTIONS (public.pete_transactions) ====================

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('pete_transactions')
    .select('*')
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return (data || []).map((row) => {
    const dateObj = row.entry_date ? new Date(row.entry_date) : null
    const isValidDate = dateObj && !isNaN(dateObj.getTime())
    const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : row.entry_date || ''
    const formattedDate = isValidDate ? dateObj.toLocaleDateString('en-GB') : ''
    const createdTimestamp = isValidDate
      ? dateObj.toLocaleString('en-GB')
      : row.created_at
      ? new Date(row.created_at).toLocaleString('en-GB')
      : ''

    return {
      id: row.id,
      timestamp: createdTimestamp,
      date: dateStr,
      formattedDate,
      personName: row.person_name || '',
      userId: row.person_name || '',
      incoming: Number(row.incoming) || 0,
      outgoing: Number(row.outgoing) || 0,
      mode: row.mode || '',
      groupHead: row.group_head || '',
      vendorName: row.vendor_name || '',
      remarks: row.remarks || row.reason || '',
      photoLink: row.photo_url || '',
      monthName: row.month_name || '',
    }
  })
}

async function resolveTransactionForeignKeys(payload) {
  const [personRes, modeRes, groupRes, vendorRes] = await Promise.all([
    payload.personName?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'person').ilike('value', payload.personName.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.mode?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'mode').ilike('value', payload.mode.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.groupHead?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'group_head').ilike('value', payload.groupHead.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.vendorName?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'vendor').ilike('value', payload.vendorName.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return { personRes, modeRes, groupRes, vendorRes }
}

export async function insertTransaction(payload, photoFile) {
  let photoUrl = ''
  if (photoFile) {
    photoUrl = await uploadFile(photoFile, 'transaction-proofs')
  }

  const { personRes, modeRes, groupRes, vendorRes } = await resolveTransactionForeignKeys(payload)
  const entryDateTimestamptz = formatToTimestamptz(payload.date)

  const { error } = await supabase.from('pete_transactions').insert({
    entry_date: entryDateTimestamptz,
    person_name: payload.personName,
    person_id: personRes.data?.id || null,
    incoming: payload.incoming,
    outgoing: payload.outgoing,
    mode: payload.mode,
    mode_id: modeRes.data?.id || null,
    group_head: payload.groupHead,
    group_head_id: groupRes.data?.id || null,
    vendor_name: payload.vendorName || null,
    vendor_id: vendorRes.data?.id || null,
    remarks: payload.remarks || '',
    photo_url: photoUrl,
  })

  if (error) {
    console.error('Error inserting transaction:', error)
    throw new Error(`Failed to insert transaction: ${error.message}`)
  }

  return true
}

export async function updateTransaction(id, payload, photoFile, existingPhotoUrl) {
  let photoUrl = existingPhotoUrl || ''
  if (photoFile) {
    photoUrl = await uploadFile(photoFile, 'transaction-proofs')
  }

  const { personRes, modeRes, groupRes, vendorRes } = await resolveTransactionForeignKeys(payload)
  const entryDateTimestamptz = formatToTimestamptz(payload.date)

  const { error } = await supabase
    .from('pete_transactions')
    .update({
      entry_date: entryDateTimestamptz,
      person_name: payload.personName,
      person_id: personRes.data?.id || null,
      incoming: payload.incoming,
      outgoing: payload.outgoing,
      mode: payload.mode,
      mode_id: modeRes.data?.id || null,
      group_head: payload.groupHead,
      group_head_id: groupRes.data?.id || null,
      vendor_name: payload.vendorName || null,
      vendor_id: vendorRes.data?.id || null,
      remarks: payload.remarks || '',
      photo_url: photoUrl,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating transaction:', error)
    throw new Error(`Failed to update transaction: ${error.message}`)
  }

  return true
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('pete_transactions').delete().eq('id', id)

  if (error) {
    console.error('Error deleting transaction:', error)
    throw new Error(`Failed to delete transaction: ${error.message}`)
  }

  return true
}

// ==================== RECEIVING ENTRIES (public.pete_receiving_entries) ====================

export async function fetchReceivingRecords() {
  const { data, error } = await supabase
    .from('pete_receiving_entries')
    .select('*')
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('Error fetching receiving entries:', error)
    throw new Error(`Failed to fetch receiving records: ${error.message}`)
  }

  return (data || []).map((row) => {
    const dateObj = row.entry_date ? new Date(row.entry_date) : null
    const isValidDate = dateObj && !isNaN(dateObj.getTime())
    const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : row.entry_date || ''
    const createdTimestamp = isValidDate
      ? dateObj.toLocaleString('en-GB')
      : row.created_at
      ? new Date(row.created_at).toLocaleString('en-GB')
      : ''

    return {
      id: row.id,
      timestamp: createdTimestamp,
      date: dateStr,
      vendorName: row.vendor_name || '',
      invoiceAmt: Number(row.invoice_amount) || 0,
      invoiceNumber: row.invoice_number || '',
      mode: row.mode || '',
      remarks: row.remarks || '',
      imageLink: row.image_url || undefined,
    }
  })
}

async function resolveReceivingForeignKeys(payload) {
  const [vendorRes, modeRes] = await Promise.all([
    payload.vendorName?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'vendor').ilike('value', payload.vendorName.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.mode?.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'mode').ilike('value', payload.mode.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return { vendorRes, modeRes }
}

export async function insertReceivingEntry(payload, imageFile) {
  let imageUrl = ''
  if (imageFile) {
    imageUrl = await uploadFile(imageFile, 'receiving-proofs')
  }

  const { vendorRes, modeRes } = await resolveReceivingForeignKeys(payload)
  const entryDateTimestamptz = formatToTimestamptz(payload.date)

  const { error } = await supabase.from('pete_receiving_entries').insert({
    entry_date: entryDateTimestamptz,
    vendor_name: payload.vendorName,
    vendor_id: vendorRes.data?.id || null,
    invoice_amount: payload.invoiceAmt,
    invoice_number: payload.invoiceNumber,
    mode: payload.mode,
    mode_id: modeRes.data?.id || null,
    remarks: payload.remarks,
    image_url: imageUrl,
  })

  if (error) {
    console.error('Error inserting receiving entry:', error)
    throw new Error(`Failed to insert receiving entry: ${error.message}`)
  }

  return true
}

export async function updateReceivingEntry(id, payload, imageFile, existingImageUrl) {
  let imageUrl = existingImageUrl || ''
  if (imageFile) {
    imageUrl = await uploadFile(imageFile, 'receiving-proofs')
  }

  const { vendorRes, modeRes } = await resolveReceivingForeignKeys(payload)
  const entryDateTimestamptz = formatToTimestamptz(payload.date)

  const { error } = await supabase
    .from('pete_receiving_entries')
    .update({
      entry_date: entryDateTimestamptz,
      vendor_name: payload.vendorName,
      vendor_id: vendorRes.data?.id || null,
      invoice_amount: payload.invoiceAmt,
      invoice_number: payload.invoiceNumber,
      mode: payload.mode,
      mode_id: modeRes.data?.id || null,
      remarks: payload.remarks || '',
      image_url: imageUrl,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating receiving entry:', error)
    throw new Error(`Failed to update receiving entry: ${error.message}`)
  }

  return true
}

export async function deleteReceivingEntry(id) {
  const { error } = await supabase.from('pete_receiving_entries').delete().eq('id', id)

  if (error) {
    console.error('Error deleting receiving entry:', error)
    throw new Error(`Failed to delete receiving entry: ${error.message}`)
  }

  return true
}

export const peteService = {
  uploadFile,
  fetchDropdownOptions,
  fetchTransactions,
  insertTransaction,
  updateTransaction,
  deleteTransaction,
  fetchReceivingRecords,
  insertReceivingEntry,
  updateReceivingEntry,
  deleteReceivingEntry,
}

export default peteService
