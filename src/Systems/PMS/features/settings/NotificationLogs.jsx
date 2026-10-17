import React, { useState, useEffect, useMemo } from 'react';
import { notificationService } from '../../services/notificationService';
import { Button } from '../../components/common/Button';
import { 
  RefreshCw, 
  Bell, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  MessageSquare, 
  Calendar,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

const DEPT_INFO = {
  inform_to_chef: { label: 'Kitchen Preparation', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  chef: { label: 'Kitchen Preparation', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  decor: { label: 'Decor & Floral', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  dress: { label: 'Dress & Uniform', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  crockery: { label: 'Crockery & Cutlery', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  kitchenRawMaterial: { label: 'Menu Kitchen Requirement', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  vegetables: { label: 'Vegetables & Raw Material', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cheeseDairy: { label: 'Cheese & Dairy', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  cheese_dairy: { label: 'Cheese & Dairy', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  vendorOrders: { label: 'Vendor Coordination', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  bakery: { label: 'Bakery', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  iceWaterRequirement: { label: 'Ice & Water Requirement', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  loadingBoysAunties: { label: 'Loading Boys & Aunties', color: 'bg-zinc-50 text-zinc-700 border-zinc-200' },
  vehicleRequirement: { label: 'Vehicle Requirement', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  gasCylinder: { label: 'Gas Cylinder', color: 'bg-red-50 text-red-700 border-red-200' },
  freshFlowers: { label: 'Fresh Flowers', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  waiters: { label: 'Waiters', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  outsourcingTeam: { label: 'Outsourcing Team Requirement', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  purchase: { label: 'Purchase & General', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  menu: { label: 'Menu Finalize', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export function NotificationLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotificationLogs(150);
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading notification logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleManualCheck = async (force = false) => {
    setIsTriggering(true);
    try {
      const result = await notificationService.checkAndSendDelayAlerts({ force });
      if (result.sentCount > 0) {
        toast.success(`Check complete: ${result.sentCount} alert(s) dispatched via WhatsApp.`);
      } else if (result.delayedCount > 0) {
        toast.info(`Found ${result.delayedCount} delayed task(s). Notifications were already sent or outside slot window.`);
      } else {
        toast.info('All pending department tasks are within the 48hr window.');
      }
      await loadLogs();
    } catch (e) {
      toast.error('Failed to trigger delay check: ' + (e.message || 'Unknown error'));
    } finally {
      setIsTriggering(false);
    }
  };

  const formatISTDateTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch (_) {
      return isoStr;
    }
  };

  const getDeptDisplay = (key) => {
    return DEPT_INFO[key] || { 
      label: key ? (key.charAt(0).toUpperCase() + key.slice(1)) : 'Department', 
      color: 'bg-slate-50 text-slate-700 border-slate-200' 
    };
  };

  const formatTypeBadge = (type) => {
    switch (type) {
      case 'initial_delay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200 shrink-0">
            <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
            <span>Initial Delay (48h)</span>
          </span>
        );
      case 'reminder_11am':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Reminder 11:00 AM</span>
          </span>
        );
      case 'reminder_3pm':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200 shrink-0">
            <Clock className="w-3 h-3 text-orange-600 shrink-0" />
            <span>Reminder 3:00 PM</span>
          </span>
        );
      case 'reminder_6pm':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Reminder 6:00 PM</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 shrink-0">
            {type || 'Notification'}
          </span>
        );
    }
  };

  const formatStatusBadge = (status) => {
    if (status === 'Sent') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Sent</span>
        </span>
      );
    }
    if (status === 'Partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span>Partial</span>
        </span>
      );
    }
    if (status === 'Failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          <span>Failed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
        <span>{status || 'Skipped'}</span>
      </span>
    );
  };

  // Filtered logs list
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesDept = selectedDept === 'ALL' || log.department_key === selectedDept;
      const matchesType = selectedType === 'ALL' || log.type === selectedType;
      
      const q = searchTerm.trim().toLowerCase();
      if (!q) return matchesDept && matchesType;

      const bookingMatch = (log.booking_id || '').toLowerCase().includes(q);
      const deptMatch = (log.department_key || '').toLowerCase().includes(q);
      const typeMatch = (log.type || '').toLowerCase().includes(q);
      const recipients = Array.isArray(log.recipients) ? log.recipients.join(' ') : '';
      const recipientMatch = recipients.includes(q);

      return matchesDept && matchesType && (bookingMatch || deptMatch || typeMatch || recipientMatch);
    });
  }, [logs, searchTerm, selectedDept, selectedType]);

  return (
    <div className="space-y-5">
      {/* Overview Monitor Banner */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-blue-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30">
                <Bell className="w-4 h-4 text-blue-300" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Smart Delay & WhatsApp Notification Monitor</h3>
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed max-w-2xl">
              Tasks are delayed starting 48 hours after menu finalizing message is sent (with +24h extension when closer events are added). 
              Initial alert is sent immediately upon delay, followed by daily reminder slots at <strong>11:00 AM, 3:00 PM, and 6:00 PM IST</strong> to assigned department staff.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 justify-center text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleManualCheck(false)}
              disabled={isTriggering}
              className="bg-blue-500 hover:bg-blue-600 text-white shadow justify-center text-xs col-span-1 sm:col-auto"
            >
              <Send className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
              <span>{isTriggering ? 'Checking...' : 'Check & Send Alerts'}</span>
            </Button>
          </div>
        </div>

        {/* Schedule Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] uppercase text-blue-300 font-semibold block tracking-wider mb-0.5">Grace Period</span>
            <span className="font-bold text-xs sm:text-sm text-white">48 Hours</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] uppercase text-blue-300 font-semibold block tracking-wider mb-0.5">Priority Extension</span>
            <span className="font-bold text-xs sm:text-sm text-white">+24 Hours / Closer</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] uppercase text-blue-300 font-semibold block tracking-wider mb-0.5">Daily Reminders</span>
            <span className="font-bold text-xs sm:text-sm text-white">11 AM • 3 PM • 6 PM</span>
          </div>
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] uppercase text-blue-300 font-semibold block tracking-wider mb-0.5">Recipient Target</span>
            <span className="font-bold text-xs sm:text-sm text-emerald-300">Dept Staff Only</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-pms-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header with Search & Filter Controls */}
        <div className="p-4 border-b border-pms-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-pms-text">Dispatched Notification History</h4>
              <p className="text-xs text-pms-muted">Log of all initial delay and reminder alerts sent via WhatsApp.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pms-muted bg-slate-100 px-2.5 py-1 rounded-lg font-medium shrink-0">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'Log' : 'Logs'} {filteredLogs.length !== logs.length ? `(of ${logs.length})` : ''}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="relative sm:col-span-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search booking ID or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-pms-accent focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-pms-accent focus:bg-white text-slate-700 transition-colors"
              >
                <option value="ALL">All Departments</option>
                <option value="chef">Kitchen Preparation</option>
                <option value="inform_to_chef">Kitchen Preparation (Legacy)</option>
                <option value="decor">Decor & Floral</option>
                <option value="dress">Dress & Uniform</option>
                <option value="crockery">Crockery & Cutlery</option>
                <option value="kitchenRawMaterial">Menu Kitchen Requirement</option>
                <option value="vegetables">Vegetables & Raw Material</option>
                <option value="cheeseDairy">Cheese & Dairy</option>
                <option value="vendorOrders">Vendor Coordination</option>
                <option value="bakery">Bakery</option>
                <option value="iceWaterRequirement">Ice & Water Requirement</option>
                <option value="loadingBoysAunties">Loading Boys & Aunties</option>
                <option value="vehicleRequirement">Vehicle Requirement</option>
                <option value="gasCylinder">Gas Cylinder</option>
                <option value="freshFlowers">Fresh Flowers</option>
                <option value="waiters">Waiters</option>
                <option value="outsourcingTeam">Outsourcing Team Requirement</option>
                <option value="purchase">Purchase & General</option>
                <option value="menu">Menu Finalization</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-pms-accent focus:bg-white text-slate-700 transition-colors"
              >
                <option value="ALL">All Types</option>
                <option value="initial_delay">Initial Delay (48h)</option>
                <option value="reminder_11am">Reminder 11:00 AM</option>
                <option value="reminder_3pm">Reminder 3:00 PM</option>
                <option value="reminder_6pm">Reminder 6:00 PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-8 text-center text-sm text-pms-muted flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-pms-accent" />
            <span>Loading notification logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-pms-text">No matching WhatsApp notifications found.</p>
            <p className="text-xs text-pms-muted max-w-sm mx-auto">
              {logs.length === 0 
                ? 'When department tasks exceed their deadline, automated delay alerts sent to staff will appear here.'
                : 'Try adjusting your search query or department filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards Feed (Visible on screens < md) */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredLogs.map((log) => {
                const dept = getDeptDisplay(log.department_key);
                const recipientsList = Array.isArray(log.recipients) ? log.recipients : [];

                return (
                  <div key={log.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                    {/* Top Row: Department & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${dept.color}`}>
                        <Layers className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[170px]">{dept.label}</span>
                      </span>
                      {formatStatusBadge(log.status)}
                    </div>

                    {/* Middle Row: Type & Booking ID */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-mono text-xs font-bold text-pms-primary">
                        {log.booking_id}
                      </div>
                      <div>
                        {formatTypeBadge(log.type)}
                      </div>
                    </div>

                    {/* Timestamp Row */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatISTDateTime(log.sent_at)}</span>
                    </div>

                    {/* Recipients Row */}
                    <div className="bg-slate-50/90 border border-slate-200/80 rounded-lg p-2 flex items-start gap-2 text-xs">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <span>{recipientsList.length} staff {recipientsList.length === 1 ? 'recipient' : 'recipients'}:</span>
                        </div>
                        {recipientsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {recipientsList.map((num, i) => (
                              <span key={i} className="font-mono text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                {num}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No phone numbers assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Visible on screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Sent At (IST)</th>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pms-border">
                  {filteredLogs.map((log) => {
                    const dept = getDeptDisplay(log.department_key);
                    const recipientsList = Array.isArray(log.recipients) ? log.recipients : [];

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium font-mono text-[11px]">
                          {formatISTDateTime(log.sent_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-pms-primary">
                          {log.booking_id}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${dept.color}`}>
                            {dept.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatTypeBadge(log.type)}
                        </td>
                        <td className="py-3 px-4 text-pms-text">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-semibold text-slate-800">
                              {recipientsList.length} staff
                            </span>
                            {recipientsList.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {recipientsList.map((num, idx) => (
                                  <span key={idx} className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    {num}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {formatStatusBadge(log.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
