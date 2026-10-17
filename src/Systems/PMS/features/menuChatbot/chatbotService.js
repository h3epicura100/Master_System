import { SYSTEM_PROMPT } from './chatbotPrompts';
import { convertPdfToImagesAndText } from './pdfHelper';

const STORAGE_KEY = 'h3_openai_api_key';
const LEGACY_STORAGE_KEY = 'h3_gemini_api_key';

export const chatbotService = {
  /**
   * Retrieves the active OpenAI API Key from localStorage (custom override) or Vite environment variable.
   */
  getApiKey() {
    const local = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (local && local.trim().length > 0) {
      return local.trim();
    }
    const envKey = (
      import.meta.env.VITE_OPENAI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();
    if (envKey) {
      return envKey;
    }
    return '';
  },

  /**
   * Identifies where the active API key is sourced from ('custom' | 'env' | 'none').
   */
  getKeySource() {
    const local = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (local && local.trim().length > 0) return 'custom';
    const envKey = (
      import.meta.env.VITE_OPENAI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();
    if (envKey) return 'env';
    return 'none';
  },

  /**
   * Resolves the OpenAI API endpoint.
   * In Vite development, routes through the local reverse proxy (/api/openai) to bypass browser CORS limitations.
   */
  getApiEndpoint() {
    if (import.meta.env.VITE_OPENAI_API_URL) {
      return import.meta.env.VITE_OPENAI_API_URL;
    }
    if (import.meta.env.DEV) {
      return '/api/openai/v1/chat/completions';
    }
    if (import.meta.env.VITE_OPENAI_BASE_URL) {
      return `${import.meta.env.VITE_OPENAI_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
    }
    return '/api/openai/v1/chat/completions';
  },

  /**
   * Sets or clears the user-specified OpenAI API Key in localStorage.
   */
  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  },

  /**
   * Checks if an API key is available.
   */
  hasApiKey() {
    return Boolean(this.getApiKey());
  },

  /**
   * Extracts JSON block from OpenAI markdown text response.
   */
  extractJsonFromText(text) {
    if (!text) return null;

    try {
      // 1. Try markdown ```json ... ``` block
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // 2. Try any ``` ... ``` block that looks like JSON
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        const trimmed = codeBlockMatch[1].trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          return JSON.parse(trimmed);
        }
      }

      // 3. Try finding first '{' and last '}'
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSubstring);
      }
    } catch (e) {
      console.warn('Could not parse JSON from model output:', e);
    }

    return null;
  },

  /**
   * Cleans text to display in chat (removes raw JSON code blocks for clean reading).
   */
  cleanMessageText(text) {
    if (!text) return '';
    return text.replace(/```json[\s\S]*?```/gi, '').trim();
  },

  /**
   * Decodes Base64 to UTF-8 text string safely.
   */
  decodeBase64Text(base64) {
    if (!base64) return '';
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      try {
        return atob(base64);
      } catch {
        return '';
      }
    }
  },

  /**
   * Sends conversation to OpenAI API and parses conversational text + menu JSON.
   * Supports text, images (JPEG/PNG/WebP), and PDFs (converted to high-res canvas images).
   * 
   * @param {Array<{ role: 'user' | 'model' | 'assistant', text: string }>} conversation
   * @param {Object} currentMenuData - Current active menu state
   * @param {Object|null} attachment - Optional attachment { name, mimeType, base64 }
   */
  async sendMessage(conversation, currentMenuData = null, attachment = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please configure your API key in your .env or settings.');
    }

    // System instruction passed as the first system message
    let systemText = `${SYSTEM_PROMPT}\n\nCURRENT MENU STATE:\n${
      currentMenuData ? JSON.stringify(currentMenuData, null, 2) : 'No menu created yet.'
    }`;

    if (attachment) {
      systemText += `\n\nATTACHMENT INSTRUCTION — CRITICAL:\nA file "${attachment.name}" (${attachment.mimeType}) has been provided by the user. You MUST:\n1. Extract EVERY dish, live counter, course, session, timing, pax count, and note — capture 100%, ZERO omissions.\n2. If this is a pre-existing H3 menu PDF, replicate the EXACT same sessions and menu items into the JSON schema — do not summarize or drop items.\n3. The JSON output MUST be complete. Do NOT truncate, skip pages, or replace items with placeholders like "and more".\n4. If the document has 8 sessions and 200 dishes, your JSON must have 8 sessions and 200 dishes.`;
    }

    const messages = [
      {
        role: 'system',
        content: systemText,
      },
    ];

    // Format conversation history
    const totalMsgs = conversation.length;

    for (let index = 0; index < totalMsgs; index++) {
      const msg = conversation[index];
      const isLastUserMsg = index === totalMsgs - 1 && msg.role === 'user';

      if (isLastUserMsg && attachment && attachment.base64) {
        const mime = (attachment.mimeType || '').toLowerCase();
        const fileName = (attachment.name || '').toLowerCase();

        const isTextFile =
          mime === 'text/plain' ||
          mime === 'text/csv' ||
          fileName.endsWith('.txt') ||
          fileName.endsWith('.csv');

        const isPdfFile = mime === 'application/pdf' || fileName.endsWith('.pdf');

        if (isTextFile) {
          const textContent = this.decodeBase64Text(attachment.base64);
          const combinedText = `[Uploaded File: ${attachment.name}]\n${textContent}\n\n${
            msg.text || 'Please structure this uploaded file into an H3 menu blueprint.'
          }`;
          messages.push({
            role: 'user',
            content: combinedText,
          });
        } else if (isPdfFile) {
          // Convert all PDF pages to images and extract text for OpenAI Vision
          const pdfResult = await convertPdfToImagesAndText(attachment.base64);

          const contentParts = [];
          let userPrompt =
            msg.text ||
            `Please analyze this attached menu document (${attachment.name}) and extract all menu details into the structured H3 Menu Blueprint.`;

          if (pdfResult?.text && pdfResult.text.trim()) {
            userPrompt += `\n\n[Extracted Document Text]:\n${pdfResult.text}`;
          }

          contentParts.push({
            type: 'text',
            text: userPrompt,
          });

          if (pdfResult?.images && pdfResult.images.length > 0) {
            pdfResult.images.forEach((imgDataUrl) => {
              contentParts.push({
                type: 'image_url',
                image_url: {
                  url: imgDataUrl,
                  detail: 'high',
                },
              });
            });
          }

          messages.push({
            role: 'user',
            content: contentParts,
          });
        } else {
          // Multimodal image (JPEG, PNG, WebP, GIF)
          const imageMime = attachment.mimeType || 'image/jpeg';
          messages.push({
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  msg.text ||
                  `Please analyze this attached menu image (${attachment.name}) and extract all menu details into the structured H3 Menu Blueprint.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMime};base64,${attachment.base64}`,
                  detail: 'high',
                },
              },
            ],
          });
        }
      } else {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text || '',
        });
      }
    }

    // Models ordered by priority: Paid tier flagship gpt-4o, then fast fallback gpt-4o-mini
    const modelsToTry = [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
    ];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const payload = {
          model,
          messages,
          temperature: 0.4,
          top_p: 0.95,
          max_tokens: 16000,
        };

        const endpoint = this.getApiEndpoint();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;

          lastError = new Error(`OpenAI ${model}: ${errMsg}`);
          console.warn(`Model ${model} returned ${response.status} (${errMsg})`);

          // If unauthorized (401), invalid API key - fail immediately with clear instructions
          if (response.status === 401) {
            throw new Error(`OpenAI Authentication Failed: ${errMsg}. Please update your OpenAI API key in the API Key settings modal or .env file.`);
          }

          // Short backoff before trying next model if server is busy or rate limited
          if (response.status === 503 || response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          continue;
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const rawText = choice?.message?.content || '';

        if (!rawText) {
          throw new Error(`No response text received from OpenAI (${model}).`);
        }

        const extractedMenu = this.extractJsonFromText(rawText);
        const cleanMessage = this.cleanMessageText(rawText) || rawText;

        return {
          rawText,
          message: cleanMessage,
          menuData: extractedMenu,
          modelUsed: model,
        };
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${model} failed:`, err.message);
      }
    }

    throw lastError || new Error('Failed to connect to OpenAI API. Please verify your API key.');
  },
};
