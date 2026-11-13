import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeMenuText } from './tagAiParser';
import { chatbotService } from '../menuChatbot/chatbotService';

/**
 * Paste a whole menu once; AI works out each dish name and description and
 * hands them to the parent as editable rows.
 */
export function SmartPasteBox({ onDishesDetected }) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hasKey = chatbotService.hasApiKey();
  const canAnalyze = hasKey && text.trim().length > 0 && !isAnalyzing;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const dishes = await analyzeMenuText(text);
      onDishesDetected(dishes);
      setText('');
      toast.success(`Added ${dishes.length} dish${dishes.length === 1 ? '' : 'es'}. Review them in the list below.`);
    } catch (err) {
      console.error('Menu analysis failed:', err);
      toast.error(err.message || 'Could not analyze the menu text.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#0a4a87]" />
        <label className="text-sm font-medium text-slate-700">Smart Paste</label>
      </div>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">
        Paste your whole menu in one go (from WhatsApp, Excel or Word). AI separates each dish name from its
        description and builds the list below for you to review.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isAnalyzing}
        placeholder={'Paste menu text here, e.g.\n\nPani Puri - in bombay style with silbatta pani, ragda\nWelcome drink: Thai basil twist chilly guava masala cold drink'}
        rows={7}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87] resize-y disabled:bg-slate-50 disabled:text-slate-400"
      />

      {!hasKey && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            OpenAI API key not found. Add <code>VITE_OPENAI_API_KEY</code> to your .env file, or set a key in Menu AI
            Chatbot (it is shared). You can still add dishes manually below.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-[#0a4a87] hover:bg-[#083d70] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing menu...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Analyze with AI
          </>
        )}
      </button>
    </div>
  );
}
