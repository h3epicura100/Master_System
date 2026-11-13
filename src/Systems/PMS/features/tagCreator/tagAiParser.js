import { chatbotService } from '../menuChatbot/chatbotService';

const SYSTEM_PROMPT = `You convert raw catering menu text into dish tags for printing.

The input may be messy: a WhatsApp message, text pasted from Excel/Word/PDF, numbered or bulleted lists, section headings, guest counts, timings, or mixed formatting.

Each printed tag has two parts:
- "title": the dish or live-counter name, shown large at the top.
- "description": the supporting details shown below it (style, variants, or ingredients). Use an empty string when there are none.

RULES
1. Produce one tag per distinct dish or live counter. Never merge different dishes into one tag, and never split one dish into several tags.
2. If a counter/dish name is followed by several variants of the same preparation, make ONE tag: the counter name is the title and the variants are the description, one per line.
3. Keep the original wording and spelling exactly. Do not translate, correct, shorten, summarise or invent anything.
4. Remove list markers (bullets, numbers, dashes) and decorative characters.
5. Skip things that are not dishes: course or section headings with no dish detail of their own (for example "STARTERS" or "MAIN COURSE"), guest counts, timings, prices, event names and instructions.
6. Keep the input order.
7. Never output the same dish twice.

EXAMPLES
Input:
PANI PURI - in bombay style with silbatta pani, ragda
Output: {"dishes":[{"title":"PANI PURI","description":"IN BOMBAY STYLE WITH SILBATTA PANI\\nRAGDA"}]}

Input:
Welcome drink: Thai basil twist chilly guava masala cold drink
Output: {"dishes":[{"title":"WELCOME DRINK","description":"THAI BASIL TWIST CHILLY GUAVA MASALA COLD DRINK"}]}

Input:
Hand toasted wood fired pizzas
1. Basil pesto garden pizza with feta cheese
2. Burnt bell pepper-chipotle buratta pizza with sun-dried tomatoes, olives and artichokes
Output: {"dishes":[{"title":"HAND TOASTED WOOD FIRED PIZZAS","description":"BASIL PESTO GARDEN PIZZA WITH FETA CHEESE\\nBURNT BELL PEPPER-CHIPOTLE BURATTA PIZZA WITH SUN-DRIED TOMATOES, OLIVES AND ARTICHOKES"}]}

Return ONLY a JSON object of the form {"dishes":[{"title":"...","description":"..."}]}. No commentary, no markdown.`;

// Most accurate model first; the others are fallbacks if it is unavailable.
const MODELS_TO_TRY = ['gpt-4o', 'gpt-4o-mini'];
const MAX_INPUT_CHARS = 60000;

function normalizeDishes(parsed) {
  const list = Array.isArray(parsed) ? parsed : parsed?.dishes;
  if (!Array.isArray(list)) return [];

  return list
    .map((d) => ({
      title: typeof d?.title === 'string' ? d.title.trim() : '',
      description: typeof d?.description === 'string' ? d.description.trim() : '',
    }))
    .filter((d) => d.title.length > 0);
}

/**
 * Sends pasted menu text to OpenAI and returns [{ title, description }].
 * Reuses the API key and endpoint the Menu AI Chatbot already uses.
 */
export async function analyzeMenuText(rawText) {
  const text = (rawText || '').trim();
  if (!text) throw new Error('Paste some menu text first.');
  if (text.length > MAX_INPUT_CHARS) {
    throw new Error('That text is too long to analyze at once. Please paste it in smaller parts.');
  }

  const apiKey = chatbotService.getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Add VITE_OPENAI_API_KEY to your .env or set it in Menu AI Chatbot.');
  }

  const endpoint = chatbotService.getApiEndpoint();
  let lastError = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 8000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;

        if (response.status === 401) {
          throw Object.assign(
            new Error(`OpenAI authentication failed: ${errMsg}. Please check your API key.`),
            { fatal: true }
          );
        }

        lastError = new Error(`OpenAI ${model}: ${errMsg}`);
        if (response.status === 429 || response.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`No response received from OpenAI (${model}).`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        lastError = new Error(`OpenAI (${model}) returned an unreadable response.`);
        continue;
      }

      const dishes = normalizeDishes(parsed);
      if (dishes.length === 0) {
        throw Object.assign(
          new Error('No dishes were detected in that text. Check the paste, or add dishes manually.'),
          { fatal: true }
        );
      }
      return dishes;
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Could not reach OpenAI. Please try again.');
}
