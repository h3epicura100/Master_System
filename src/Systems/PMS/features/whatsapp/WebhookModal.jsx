import React, { useState, useEffect } from 'react';
import {
  X,
  Webhook,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Code
} from 'lucide-react';
import { whatsappService } from '../../services/whatsappService';
import { toast } from 'sonner';

export function WebhookModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  const defaultWebhookUrl = `${
    import.meta.env.VITE_SUPABASE_URL || 'https://hfvbyktusslocxsblenu.supabase.co'
  }/functions/v1/whatsapp-webhook`;

  const fetchConfig = async () => {
    setChecking(true);
    try {
      const config = await whatsappService.getWebhookConfig();
      setCurrentConfig(config);
    } catch (e) {
      console.warn('Could not fetch webhook config:', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(defaultWebhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await whatsappService.registerWebhook(defaultWebhookUrl);
      toast.success('Webhook successfully registered with Maytapi!');
      await fetchConfig();
    } catch (err) {
      console.error('Failed to register webhook:', err);
      toast.error(err.message || 'Failed to register webhook with Maytapi.');
    } finally {
      setRegistering(false);
    }
  };

  const isMatched = currentConfig?.webhook === defaultWebhookUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Maytapi Webhook Settings</h3>
              <p className="text-xs text-slate-400">Bidirectional WhatsApp message receiving</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Banner */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
            isMatched
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : currentConfig?.webhook
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            {isMatched ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold">
                {isMatched
                  ? 'Webhook is Active & Configured'
                  : currentConfig?.webhook
                    ? 'Different Webhook Configured'
                    : 'Webhook Not Yet Registered'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5 truncate">
                {currentConfig?.webhook
                  ? `Active: ${currentConfig.webhook}`
                  : 'Maytapi is currently not sending incoming WhatsApp replies to your Supabase function.'}
              </p>
            </div>
            <button
              onClick={fetchConfig}
              disabled={checking}
              className="p-1 text-slate-500 hover:text-slate-800 rounded shrink-0"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 block">Supabase Webhook URL</label>
            <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 break-all">
              <span className="flex-1">{defaultWebhookUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 shrink-0 transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* One-Click Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRegister}
              disabled={registering || isMatched}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {registering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isMatched ? (
                <Check className="w-4 h-4" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isMatched ? 'Webhook Synced' : 'Sync / Register Webhook with Maytapi'}</span>
            </button>
          </div>

          {/* Instructions Accordion */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-600 text-[11px] leading-relaxed">
            <p className="font-bold text-slate-800">How Bidirectional WhatsApp works:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>When contacts reply on WhatsApp, Maytapi sends an HTTP POST to this endpoint.</li>
              <li>The Supabase Edge Function saves the incoming message in <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">pms_wa_messages</code>.</li>
              <li>Supabase Realtime automatically pushes the reply live to this chat interface.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
