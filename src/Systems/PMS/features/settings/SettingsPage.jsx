import React, { useState, useEffect } from 'react';
import { settingsService } from './settingsService';
import { UsersTable } from './UsersTable';
import { UserModal } from './UserModal';
import { NotificationLogs } from './NotificationLogs';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'notifications'
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { currentUser, setUsers: setGlobalUsers } = useAuth();

  const loadUsers = async () => {
    setIsLoading(true);
    const list = await settingsService.getUsers();
    setUsers(list);
    setGlobalUsers(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenNew = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSave = async (userData, isEditing) => {
    try {
      const updatedList = await settingsService.saveUser(userData, isEditing);
      setUsers(updatedList);
      setGlobalUsers(updatedList);
      toast.success(`User ${userData.id} saved successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to save user.');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      if (!window.confirm(`Delete user account "${id}"?`)) return;
      const updatedList = await settingsService.deleteUser(id, currentUser?.id);
      setUsers(updatedList);
      setGlobalUsers(updatedList);
      toast.info(`User ${id} deleted.`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete user.');
    }
  };

  if (isLoading && activeTab === 'users' && users.length === 0) {
    return <div className="p-8 text-center text-sm text-pms-muted">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-pms-border pb-4 gap-3">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-pms-primary text-white shadow-sm'
                : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">User Accounts</span>
            <span className={`px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full ${activeTab === 'users' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-pms-primary text-white shadow-sm'
                : 'text-pms-muted hover:bg-slate-100 hover:text-pms-text'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">Delay & Logs</span>
          </button>
        </div>

        {activeTab === 'users' && (
          <Button variant="primary" onClick={handleOpenNew} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4" />
            <span>New User</span>
          </Button>
        )}
      </div>

      {activeTab === 'users' ? (
        <>
          <UsersTable
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <UserModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            initialValues={selectedUser}
            onSave={handleSave}
          />
        </>
      ) : (
        <NotificationLogs />
      )}
    </div>
  );
}
