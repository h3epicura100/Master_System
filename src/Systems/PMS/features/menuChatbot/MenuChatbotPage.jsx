import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  MessagesSquare,
  FileText,
  Loader2,
  Key,
  X,
  Check
} from 'lucide-react';
import { chatbotService } from './chatbotService';
import { ChatBubble } from './ChatBubble';
import { MenuChatbotInput } from './MenuChatbotInput';
import { MenuPreviewPanel } from './MenuPreviewPanel';
import { toast } from 'sonner';

const INITIAL_MESSAGE = {
  role: 'model',
  text: `👋 **Welcome to H3 Menu AI!**\n\nType your event requirements or paste your raw WhatsApp notes (sessions, guest counts, stall requirements). I'll automatically organize everything into structured session menus and ready-to-print catering PDF.`,
  timestamp: 'Just now',
};

export function MenuChatbotPage() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [menuData, setMenuData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'preview'
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const messagesEndRef = useRef(null);

  const currentKey = chatbotService.getApiKey();
  const keySource = chatbotService.getKeySource();

  const handleSaveApiKey = () => {
    if (!customKeyInput.trim()) {
      toast.error('Please enter a valid OpenAI API key');
      return;
    }
    chatbotService.setApiKey(customKeyInput.trim());
    setCustomKeyInput('');
    setIsKeyModalOpen(false);
    toast.success('OpenAI API Key saved successfully!');
  };

  const handleClearApiKey = () => {
    chatbotService.setApiKey('');
    setCustomKeyInput('');
    setIsKeyModalOpen(false);
    toast.info('Custom API Key cleared. Now using .env fallback.');
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (userText, attachment = null) => {
    if (!userText?.trim() && !attachment) return;

    const trimmedText = userText?.trim() || '';
    const newMsg = {
      role: 'user',
      text: trimmedText || (attachment ? `[Attached File: ${attachment.name}]` : ''),
      attachment: attachment ? {
        name: attachment.name,
        mimeType: attachment.mimeType,
        previewUrl: attachment.previewUrl,
        size: attachment.size,
      } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, newMsg];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const chatHistory = updatedHistory
        .filter((m) => m.role === 'user' || m.role === 'model')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
        }));

      const result = await chatbotService.sendMessage(chatHistory, menuData, attachment);

      const botMsg = {
        role: 'model',
        text: result.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (result.menuData) {
        setMenuData(result.menuData);
        toast.success('Live Menu Blueprint updated!');
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      const errMsg = {
        role: 'model',
        text: `⚠️ **Error:** ${err.message || 'Failed to process request.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
      toast.error(err.message || 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset the conversation and menu?')) {
      setMessages([INITIAL_MESSAGE]);
      setMenuData(null);
      toast.info('Menu assistant reset.');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-full">
      {/* Sleek Top Control Bar */}
      <div className="h-11 px-3 sm:px-4 bg-slate-900 text-white flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">H3 Menu AI</span>
        </div>

        {/* Mobile View Toggle Segmented Tabs */}
        <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setMobileTab('chat')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
              mobileTab === 'chat' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessagesSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
              mobileTab === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Menu ({menuData?.sessions?.length || 0})</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setCustomKeyInput('');
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Configure OpenAI API Key"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">API Key</span>
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Reset Chat & Menu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Split Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Panel: Chat Stream & Input */}
        <div
          className={`flex-1 flex-col h-full bg-slate-50/40 overflow-hidden min-h-0 ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {messages.map((msg, index) => (
              <ChatBubble key={index} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl w-fit shadow-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>H3 Menu AI is structuring the menu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <MenuChatbotInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={false}
          />
        </div>

        {/* Right Panel: Live Menu Preview */}
        <div
          className={`w-full lg:w-[48%] h-full overflow-hidden min-h-0 ${
            mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <MenuPreviewPanel
            menuData={menuData}
            onResetMenu={() => setMenuData(null)}
          />
        </div>
      </div>

      {/* API Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">OpenAI API Key</h3>
                  <p className="text-[11px] text-slate-400">Configure key for H3 Menu AI generation</p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-medium">Status:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    currentKey ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {currentKey ? (keySource === 'custom' ? 'Custom Key (Active)' : 'Configured via .env') : 'Missing Key'}
                  </span>
                </div>
                {currentKey ? (
                  <div className="font-mono text-[11px] text-slate-500 truncate">
                    {currentKey.slice(0, 8)}...{currentKey.slice(-6)}
                  </div>
                ) : (
                  <div className="text-[11px] text-rose-600">
                    No OpenAI API key found. Enter your key below.
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enter OpenAI API Key (sk-...)
                </label>
                <input
                  type="password"
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Keys are proxied via Vite to prevent CORS errors.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {keySource === 'custom' ? (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="text-rose-600 hover:text-rose-700 font-medium text-xs underline cursor-pointer"
                  >
                    Reset to .env Key
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Key
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
