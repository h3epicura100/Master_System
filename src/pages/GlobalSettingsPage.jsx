import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Phone,
  RefreshCw,
  AlertTriangle,
  Check,
  X
} from 'lucide-react'
import { authService } from '../services/authService'
import { UserModal } from '../components/ui/UserModal'
import { useAuth } from '../context/AuthContext'

export function GlobalSettingsPage() {
  const { currentUser, refreshUser } = useAuth()

  // User Management State
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Fetch Users
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await authService.fetchAllUsers()
      if (res.success) {
        setUsers(res.users)
      } else {
        showNotification(res.error || 'Failed to fetch users.', 'error')
      }
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // User Save Handler
  const handleSaveUser = async (payload, id) => {
    if (id) {
      const res = await authService.updateUser(id, payload)
      if (res.success) {
        showNotification('User updated successfully!')
        loadUsers()
        if (currentUser?.id === id) refreshUser()
        return { success: true }
      }
      return { success: false, error: res.error }
    } else {
      const res = await authService.createUser(payload)
      if (res.success) {
        showNotification('New user created successfully!')
        loadUsers()
        return { success: true }
      }
      return { success: false, error: res.error }
    }
  }

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return
    setDeleteLoading(true)
    try {
      const res = await authService.deleteUser(deleteConfirmUser.id)
      if (res.success) {
        showNotification(`User @${deleteConfirmUser.username} deleted.`)
        setDeleteConfirmUser(null)
        loadUsers()
      } else {
        showNotification(res.error || 'Failed to delete user.', 'error')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  // Toggle Active Status Handler
  const handleToggleStatus = async (user) => {
    const newStatus = !user.is_active
    const res = await authService.toggleUserStatus(user.id, newStatus)
    if (res.success) {
      showNotification(`User @${user.username} is now ${newStatus ? 'Active' : 'Inactive'}.`)
      loadUsers()
      if (currentUser?.id === user.id) refreshUser()
    } else {
      showNotification(res.error || 'Failed to update user status.', 'error')
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.mobile_number?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    )
  }, [users, userSearch])

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Global Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Manage system users, access credentials, and module permissions
          </p>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-3 sm:p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span className="truncate">{notification.msg}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area: User Management */}
      <div className="space-y-3.5 sm:space-y-4 w-full min-w-0 max-w-full">
        {/* Action Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              placeholder="Search name, username, mobile..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={loadUsers}
              title="Refresh user list"
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingUser(null)
                setModalOpen(true)
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-200 transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET VIEW: Responsive Cards (hidden on >= md) */}
        <div className="block md:hidden space-y-3 w-full min-w-0">
          {loadingUsers ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600 text-xs">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const pa = user.page_access || {}
              const hasPms = pa.pms?.access === true
              const hasIms = pa.ims?.access === true

              return (
                <div key={user.id} className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-xs space-y-3 w-full min-w-0">
                  {/* User Header */}
                  <div className="flex items-start justify-between gap-2 w-full min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {getInitials(user.full_name || user.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm leading-tight truncate">{user.full_name}</p>
                        <p className="text-slate-400 text-xs truncate">@{user.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmUser(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Row: Contact & Role */}
                  <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs w-full min-w-0">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact</span>
                      {user.mobile_number ? (
                        <span className="flex items-center gap-1 text-slate-700 font-medium mt-0.5 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{user.mobile_number}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role & Status</span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-violet-100 text-violet-700 shrink-0">
                          {user.role}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase shrink-0 ${
                            user.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Module Access Badges */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs w-full min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Access:</span>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasPms ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-300 line-through'
                        }`}
                      >
                        PMS
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          hasIms ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-300 line-through'
                        }`}
                      >
                        Crockery
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* DESKTOP VIEW: Full Table (hidden on < md) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden w-full min-w-0 max-w-full">
          <div className="overflow-x-auto w-full max-w-full block">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Master Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Module Access</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="font-semibold">Loading users from master table...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isAdmin = user.role === 'admin'
                    const pa = user.page_access || {}
                    const hasH3ms = isAdmin || pa.pms?.access === true
                    const hasIms = isAdmin || pa.ims?.access === true
                    const hasHrms = isAdmin || pa.hrms?.access === true

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {getInitials(user.full_name || user.username)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-snug">{user.full_name}</p>
                              <p className="text-slate-400 text-[11px]">@{user.username}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-600">
                          {user.mobile_number ? (
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {user.mobile_number}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {user.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            title="Click to toggle status"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-transform active:scale-95 ${
                              user.is_active !== false
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            {user.is_active !== false ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasH3ms
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-300 line-through'
                              }`}
                            >
                              H3MS
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasIms
                                  ? 'bg-violet-100 text-violet-800'
                                  : 'bg-slate-100 text-slate-300 line-through'
                              }`}
                            >
                              Crockery
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasHrms
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-300 line-through'
                              }`}
                            >
                              HRMS
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUser(user)
                                setModalOpen(true)
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmUser(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      <UserModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingUser(null)
        }}
        editingUser={editingUser}
        onSave={handleSaveUser}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Master User</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              Are you sure you want to permanently delete user{' '}
              <strong>"{deleteConfirmUser.full_name}"</strong> (<code>@{deleteConfirmUser.username}</code>)? All system
              module permissions will be revoked.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalSettingsPage
