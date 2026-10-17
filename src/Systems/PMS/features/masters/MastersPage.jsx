import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterService } from './masterService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, Calendar, Clock } from 'lucide-react';

export function MastersPage() {
  const [activeTab, setActiveTab] = useState('functionTypes'); // 'functionTypes' | 'eventTimes'
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null for add, object for edit
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryClient = useQueryClient();

  // Queries
  const { data: functionTypes = [] } = useQuery({
    queryKey: ['master_function_types'],
    queryFn: masterService.getFunctionTypes,
  });

  const { data: eventTimes = [] } = useQuery({
    queryKey: ['master_event_times'],
    queryFn: masterService.getEventTimes,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async ({ tab, name }) => {
      if (tab === 'functionTypes') return masterService.addFunctionType(name);
      if (tab === 'eventTimes') return masterService.addEventTime(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`master_${activeTab.toLowerCase().replace(/([A-Z])/g, '_$1')}`] });
      queryClient.invalidateQueries({ queryKey: ['master_function_types'] });
      queryClient.invalidateQueries({ queryKey: ['master_event_times'] });
      toast.success('Master item added successfully!');
      closeModal();
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to add master item.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ tab, id, name }) => {
      if (tab === 'functionTypes') return masterService.updateFunctionType(id, name);
      if (tab === 'eventTimes') return masterService.updateEventTime(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_function_types'] });
      queryClient.invalidateQueries({ queryKey: ['master_event_times'] });
      toast.success('Master item updated successfully!');
      closeModal();
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to update master item.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tab, id }) => {
      if (tab === 'functionTypes') return masterService.deleteFunctionType(id);
      if (tab === 'eventTimes') return masterService.deleteEventTime(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master_function_types'] });
      queryClient.invalidateQueries({ queryKey: ['master_event_times'] });
      toast.success('Master item deleted!');
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete master item.');
      setDeleteTarget(null);
    }
  });

  const openAddModal = () => {
    setEditingItem(null);
    setNameInput('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setNameInput(item.name || '');
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setNameInput('');
    setFormError('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setFormError('');
    if (!nameInput.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        tab: activeTab,
        id: editingItem.id,
        name: nameInput.trim(),
      });
    } else {
      addMutation.mutate({
        tab: activeTab,
        name: nameInput.trim(),
      });
    }
  };

  const currentItems = Array.isArray(activeTab === 'functionTypes' ? functionTypes : eventTimes)
    ? (activeTab === 'functionTypes' ? functionTypes : eventTimes)
    : [];

  const filteredItems = currentItems.filter((item) => {
    if (!item) return false;
    const nameStr = String(item.name || (typeof item === 'string' ? item : '')).trim();
    if (!nameStr) return false;
    const term = String(search || '').trim().toLowerCase();
    if (!term) return true;
    return nameStr.toLowerCase().includes(term);
  });

  const tabs = [
    { key: 'functionTypes', label: 'Function Types', icon: Calendar, count: Array.isArray(functionTypes) ? functionTypes.length : 0 },
    { key: 'eventTimes', label: 'Event Times', icon: Clock, count: Array.isArray(eventTimes) ? eventTimes.length : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pms-border pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Master Data Management</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, update, and manage dynamic dropdown options used in booking forms.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal}>
          <Plus className="w-4 h-4" />
          <span>Add New Option</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar max-w-full pb-0.5">
        {tabs.map((t) => {
          const IconComp = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setSearch('');
              }}
              className={`flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'border-pms-accent text-pms-primary bg-blue-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{t.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                isActive ? 'bg-pms-primary text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Action Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Input
            placeholder={`Search ${tabs.find(t => t.key === activeTab)?.label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {/* Master Data Mobile Cards & Desktop Table */}
      {!filteredItems.length ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No options found. Click "+ Add New Option" to add one.
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (Visible on screens < md) */}
          <div className="space-y-3 md:hidden">
            {filteredItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-sm truncate">{item.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(item)}
                    title="Edit Option"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-pms-accent" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteTarget(item)}
                    title="Delete Option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (Visible on screens >= md) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 w-16">#</th>
                    <th className="py-3.5 px-4">Name / Title</th>
                    <th className="py-3.5 px-4 text-right w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(item)}
                            title="Edit Option"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-pms-accent" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete Option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingItem ? `Edit ${tabs.find(t => t.key === activeTab)?.label} Option` : `Add New ${tabs.find(t => t.key === activeTab)?.label} Option`}
        subtitle="Manage dynamic dropdown choices."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Option Name"
            required
            placeholder={activeTab === 'functionTypes' ? 'e.g. Wedding' : 'e.g. Dinner'}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />

          {formError && (
            <div className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              {formError}
            </div>
          )}

          <div className="pt-4 sm:pt-5 border-t border-slate-200 flex items-center justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {addMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Option'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ tab: activeTab, id: deleteTarget.id });
          }
        }}
        title={`Delete "${deleteTarget?.name}"?`}
        message="Are you sure you want to remove this dropdown option from the master list?"
        confirmLabel="Delete Option"
        isDanger
      />
    </div>
  );
}
