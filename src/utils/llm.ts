import { AgentPosition, Claim, ClaimLifecycle, Message } from "../types";

export interface LLMRequestParams {
  provider: 'local' | 'gemini';
  url: string;
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ComplexityGuideline {
  wordLimitPrompt: string;
  maxTokens?: number;
}

export function getComplexityGuideline(complexity: number = 3): ComplexityGuideline {
  switch (complexity) {
    case 1:
      return {
        wordLimitPrompt: "Keep your response extremely brief, fast, and lightweight (under 60 words). Minimize vocabulary and conceptual density.",
        maxTokens: 120
      };
    case 2:
      return {
        wordLimitPrompt: "Keep your response concise and direct (80-120 words). Limit your reply to under 150 words.",
        maxTokens: 250
      };
    case 3:
      return {
        wordLimitPrompt: "Provide a balanced, high-density response. Keep it concise (100-180 words), and you MUST limit your reply to under 500 words.",
        maxTokens: 600
      };
    case 4:
      return {
        wordLimitPrompt: "Provide a highly detailed, comprehensive, and multi-layered response (180-300 words). You MUST limit your reply to under 600 words.",
        maxTokens: 1000
      };
    case 5:
      return {
        wordLimitPrompt: "Provide an exhaustively detailed, highly analytical, and deeply academic response (300-500 words) with maximum logical elaboration. Limit your reply to under 1000 words.",
        maxTokens: 1500
      };
    default:
      return {
        wordLimitPrompt: "Provide a balanced, high-density response. Keep it concise (100-180 words), and you MUST limit your reply to under 500 words.",
        maxTokens: 600
      };
  }
}

export interface PhaseInstructions {
  phaseName: string;
  socratesGuideline: string;
  respondentGuideline: string;
}

export function getDebatePhaseInstructions(currentRound: number, totalRoundsSetting: number): PhaseInstructions {
  const totalRounds = totalRoundsSetting > 0 ? totalRoundsSetting : 5;
  
  if (currentRound <= Math.floor(totalRounds * 0.4) || currentRound <= 1) {
    return {
      phaseName: "Exploration & Expansion",
      socratesGuideline: "Your goal is to HELP THE DEBATE EXPAND. Ask an open, expansive Socratic question that explores new philosophical and moral dimensions of the topic, uncovers hidden premises, and encourages diverse interpretations. Focus on high-level conceptual frameworks, not technical operational details.",
      respondentGuideline: "We are in the EXPLORATION phase. Focus on expanding the conversation, introducing creative alternative interpretations, and outlining simple, intuitive ways of exploring this topic from your unique character perspective."
    };
  } else if (currentRound <= Math.floor(totalRounds * 0.6) || currentRound === Math.ceil(totalRounds / 2)) {
    return {
      phaseName: "Stabilization & Critical Audit",
      socratesGuideline: "Your goal is to STABILIZE the debate. Do not open unnecessary new tangents. Instead, critically examine the concepts and constructs already introduced in earlier rounds. Challenge their logical coherence, conceptual boundaries, and internal contradictions.",
      respondentGuideline: "We are in the STABILIZATION phase. Focus on auditing and evaluating the constructs already introduced. Show how your character's view stabilizes these existing concepts, where they overlap, and where boundaries must be drawn."
    };
  } else {
    return {
      phaseName: "Convergence & Agreement-Seeking",
      socratesGuideline: "Your goal is to SHRINK the debate and force CONVERGENCE. Urge the participants to find common ground or to clearly formulate their ultimate, irreducible disagreement. Force them to reconcile their differences using ONLY the concepts and constructs already established. Ask them to arrive at a definitive conclusion or a clear consensus statement.",
      respondentGuideline: "We are in the CONVERGENCE phase. You MUST focus fully on agreement, seeking consensus, or clearly defining what you agree to disagree on. Reconcile your differences with other agents. Ground your response strictly on the concepts and elements already discussed, avoiding any new rabbit holes, tangents, or details."
    };
  }
}

export function isAbruptlyClippedOrEmpty(text: string): { clipped: boolean; reason: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { clipped: true, reason: "Response is completely empty." };
  }
  if (trimmed.length < 15) {
    return { clipped: true, reason: `Response is too short (${trimmed.length} characters).` };
  }
  
  const lastChar = trimmed.slice(-1);
  const isPunctuation = /[.?!'"’”)\]`*:]$/.test(lastChar);
  if (!isPunctuation) {
    return { clipped: true, reason: `Response does not end with standard sentence-ending punctuation or formatting (ends with "${lastChar}").` };
  }

  const openCodeBlocks = (trimmed.match(/```/g) || []).length;
  if (openCodeBlocks % 2 !== 0) {
    return { clipped: true, reason: "Response contains an unclosed markdown code block." };
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 0) {
    const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    const trunctors = ['and', 'but', 'or', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'this', 'that', 'your', 'their', 'our', 'my', 'is', 'are', 'be', 'have', 'has'];
    if (trunctors.includes(lastWord)) {
      return { clipped: true, reason: `Response ends with a hanging word/conjunction ("${lastWord}").` };
    }
  }

  return { clipped: false, reason: "" };
}

// Function to test local LLM connection
export async function testLocalLlmConnection(url: string, model: string): Promise<{ success: boolean; message: string }> {
  const endpoint = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "llama3",
        messages: [{ role: "user", content: "Hello, reply with only the word 'OK'." }],
        max_tokens: 5,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      return {
        success: true,
        message: `Successfully connected! Model responded: "${reply || 'OK'}"`
      };
    } else {
      let serverErrorMsg = "";
      try {
        serverErrorMsg = await response.text();
      } catch {
        serverErrorMsg = response.statusText || "";
      }
      return {
        success: false,
        message: `Connected, but received HTTP error ${response.status}: ${serverErrorMsg || 'Unknown error'}`
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: "Connection timed out. Check if Ollama / LM Studio is running and CORS is enabled."
      };
    }
    return {
      success: false,
      message: `Failed to connect: ${err.message || "Unknown network error"}. Ensure your local server allows requests from this origin.`
    };
  }
}

// Fetch model list from local LLM (Ollama or LM Studio)
export async function fetchLocalModels(url: string): Promise<string[]> {
  const baseUrl = url.replace(/\/v1\/?$/, ''); // strip /v1 if present for model API
  const endpoints = [
    `${baseUrl}/api/tags`,          // Ollama tags
    `${url}/models`,                 // OpenAI standard v1/models
    `${baseUrl}/v1/models`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        // Parse Ollama response format
        if (data.models && Array.isArray(data.models)) {
          return data.models.map((m: any) => m.name || m.model);
        }
        // Parse OpenAI v1/models format
        if (data.data && Array.isArray(data.data)) {
          return data.data.map((m: any) => m.id);
        }
      }
    } catch {
      // Squelch and try next endpoint
    }
  }

  // Fallback defaults
  return ['llama3', 'llama3.2', 'mistral', 'gemma2', 'phi3', 'custom'];
}

// Generate completion with selected provider (internal helper)
async function generateLLMResponseSingle(params: LLMRequestParams): Promise<string> {
  const { provider, url, model, prompt, systemInstruction, temperature = 0.7, maxTokens } = params;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        prompt,
        systemInstruction,
        temperature,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } else {
    // Local AI Model via direct browser fetch
    const endpoint = url.endsWith('/') ? `${url}chat/completions` : `${url}/chat/completions`;
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    let requestBody: any = {
      model,
      messages,
      temperature,
    };

    if (maxTokens !== undefined) {
      requestBody.max_tokens = maxTokens;
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err: any) {
      throw new Error(`Failed to reach Local LLM at ${endpoint}: ${err.message || err}`);
    }

    // Fallback Retry 1: If 400 is returned, try without max_tokens (some legacy or strict local runners reject this)
    if (response.status === 400 && maxTokens !== undefined) {
      const retryBody = { ...requestBody };
      delete retryBody.max_tokens;
      try {
        const retryResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryBody),
        });
        if (retryResponse.ok) {
          response = retryResponse;
        }
      } catch {
        // ignore and let original/current response state stand
      }
    }

    // Fallback Retry 2: If still 400, try wrapping system instruction into user prompt
    // (some local models / API setups fail on 'system' role messages)
    if (response.status === 400 && messages.some(m => m.role === 'system')) {
      const fallbackMessages = [
        {
          role: 'user',
          content: systemInstruction 
            ? `[System Instruction: ${systemInstruction}]\n\n${prompt}`
            : prompt
        }
      ];
      const retryBody: any = {
        model,
        messages: fallbackMessages,
        temperature,
      };
      if (maxTokens !== undefined) {
        retryBody.max_tokens = maxTokens;
      }
      try {
        const retryResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryBody),
        });
        if (retryResponse.ok) {
          response = retryResponse;
        }
      } catch {
        // ignore
      }
    }

    if (!response.ok) {
      let serverErrorMsg = "";
      try {
        serverErrorMsg = await response.text();
      } catch {
        serverErrorMsg = response.statusText || "";
      }
      throw new Error(`Local LLM returned status ${response.status}: ${serverErrorMsg || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content === undefined) {
      throw new Error("Local LLM response format unexpected. No choices.message.content found.");
    }
    return content;
  }
}

// Generate completion with selected provider, including a rerun sanity check for empty/clipped outputs
export async function generateLLMResponse(params: LLMRequestParams): Promise<string> {
  let attempt = 0;
  const maxAttempts = 3;
  let currentParams = { ...params };

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const content = await generateLLMResponseSingle(currentParams);
      
      // Perform the sanity check to prevent empty or abruptly clipped responses
      const check = isAbruptlyClippedOrEmpty(content);
      if (!check.clipped) {
        return content;
      }

      console.warn(`Attempt ${attempt} response is clipped or empty: ${check.reason}. Rerunning query.`);
      
      // If it's the last attempt, don't fail, just return what we got to prevent infinite loops
      if (attempt >= maxAttempts) {
        return content;
      }

      // Modify params slightly to nudge a complete and better generation on retry
      currentParams.temperature = Math.min(0.95, (currentParams.temperature || 0.7) + 0.1);
      currentParams.prompt = `${currentParams.prompt}\n\n[COMPLIANCE NOTE: Your previous response was empty or ended abruptly in an incomplete sentence. Please provide a complete, well-reasoned, fully finished answer. Ensure the last sentence ends with correct sentence-ending punctuation (e.g. a period) and does not end mid-word or mid-sentence!]`;
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err;
      }
      console.warn(`Attempt ${attempt} threw an error, retrying:`, err);
    }
  }

  throw new Error("Failed to generate a valid non-empty response after multiple attempts.");
}

// Helper to update agent's position and salient points based on dialogue
export async function analyzeAgentStanceAndPoints(
  agentName: string,
  perspective: string,
  currentStance: AgentPosition,
  agentResponse: string,
  topic: string,
  provider: 'local' | 'gemini',
  localUrl: string,
  localModel: string
): Promise<{ position: AgentPosition; explanation: string; salientPoint: string }> {
  const prompt = `
Agent Name: "${agentName}"
Agent Perspective: "${perspective}"
Topic: "${topic}"
Current Position Stance: "${currentStance}"

The agent recently said:
"""
${agentResponse}
"""

Analyze this response. Determine:
1. Has their position on the topic shifted? They must be classified as 'agree', 'disagree', or 'neutral' relative to the topic statement.
2. Write a brief 1-sentence explanation of their current position and any shift.
3. Extract exactly one salient, key intellectual point/takeaway from their statement (at most 15 words).

Format your output strictly as a JSON object like this:
{
  "position": "agree" | "disagree" | "neutral",
  "explanation": "Brief explanation of current position...",
  "salientPoint": "One key point..."
}
Return ONLY valid JSON. No conversational fluff or markdown markers outside the json block.`;

  try {
    let jsonText = "";
    if (provider === 'gemini') {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          prompt,
          systemInstruction: "You are an objective meta-analysis AI. Analyze the dialogue of debate participants and return structured insights in JSON.",
          temperature: 0.2,
        })
      });
      if (response.ok) {
        const data = await response.json();
        jsonText = data.text || "";
      }
    } else {
      // Local LLM implementation - completely offline / no Gemini calls
      jsonText = await generateLLMResponse({
        provider: 'local',
        url: localUrl,
        model: localModel,
        prompt,
        systemInstruction: "You are an objective meta-analysis AI. Analyze the dialogue of debate participants and return structured insights in JSON.",
        temperature: 0.1
      });
    }

    if (jsonText) {
      const cleanText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
        return {
          position: parsed.position || currentStance,
          explanation: parsed.explanation || "Maintains position through current statements.",
          salientPoint: parsed.salientPoint || "Offered perspective on the topic."
        };
      }
    }
  } catch (err) {
    console.warn("Failed to perform meta-analysis on stance", err);
  }

  // Fallback
  return {
    position: currentStance,
    explanation: "Maintained stance in latest response.",
    salientPoint: "Expressed perspective regarding the topic."
  };
}

// Generate perspectives (either via Gemini or Local LLM)
export async function generatePerspectives(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
}): Promise<any[]> {
  const { provider, localUrl, localModel, topic } = params;

  const prompt = `The user wants to explore the following topic: "${topic}" via a Socratic discussion.
Analyze this topic and determine 2 distinct, contrasting, or complementary perspectives/viewpoints that would create a rich Socratic dialogue.
For each perspective, generate:
1. A descriptive Agent Name (e.g., "Dr. Vance", "Alethea"). Keep it professional.
2. A Perspective Name (e.g., "Scientific Realism", "Ethical Humanism").
3. An initial stance on the topic ('agree', 'disagree', or 'neutral').
4. A character prompt.
5. A personality type (e.g., "Analytical", "Pragmatic", "Idealist", "Skeptical").
6. A bias (e.g., "Prioritizes technological efficiency over traditional processes").

Format your response strictly as a JSON array of these agent objects. No extra markdown.
Example structure:
[
  {
    "name": "Dr. Vance",
    "perspectiveName": "Pragmatic Realism",
    "initialPosition": "disagree",
    "characterPrompt": "Argue with pragmatic caution. Question unproven claims, hidden expenses, and real-world limits.",
    "avatarColor": "bg-rose-500",
    "personalityType": "Skeptical",
    "bias": "Favors conservative, empirical physical data"
  },
  {
    "name": "Alethea",
    "perspectiveName": "Ethical Humanist",
    "initialPosition": "agree",
    "characterPrompt": "Argue for creative potential, moral responsibility, and uplifting systems.",
    "avatarColor": "bg-indigo-500",
    "personalityType": "Idealist",
    "bias": "Prioritizes social welfare and optimistic scenarios"
  }
]`;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/assign-perspectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    if (response.ok) {
      const data = await response.json();
      return data.agents || [];
    }
    throw new Error(`Gemini assign-perspectives error: ${response.status}`);
  } else {
    // Local AI perspective generation (no Gemini calls)
    const resultText = await generateLLMResponse({
      provider: 'local',
      url: localUrl,
      model: localModel,
      prompt,
      systemInstruction: "You are a logical JSON generator that specifies diverse agent perspectives in JSON format.",
      temperature: 0.6
    });

    const cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('[');
    const lastBrace = cleanText.lastIndexOf(']');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
    }
    throw new Error("Could not parse local JSON response for perspectives.");
  }
}

// Dialogue Summarizer AI (recursive summary)
export async function generateSummary(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  messages: any[];
  previousSummary?: string;
  topic: string;
}): Promise<string> {
  const { provider, localUrl, localModel, messages, previousSummary, topic } = params;

  const messagesText = messages
    .map((m: any) => `${m.senderName} (${m.senderId}): ${m.content}`)
    .join("\n\n");

  const prompt = `
Topic being discussed: "${topic}"

${previousSummary ? `Previous running summary of earlier dialogue:\n"""\n${previousSummary}\n"""\n` : ""}

New dialogue lines to integrate:
"""
${messagesText}
"""

As the Summarizer AI, your task is to recursively summarize this entire dialogue history. 
Condense the conversation so far, retaining critical context, positions, and core insights, while discarding redundant conversational pleasantries.
Ensure you track:
1. What the key points of disagreement or agreement are.
2. The current stance/insight of each active participant.
3. The Socratic questions that have driven the conversation so far.

Write a clear, cohesive, high-density bulleted summary (around 200-350 words, and MUST be strictly under 1500 words). Do not invent details.
  `;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        prompt,
        systemInstruction: "You are an objective, highly logical Summarizer AI specialized in capturing multi-agent dialogues and conceptual evolution without bias.",
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini summary generator error: ${response.status}`);
    }
    const data = await response.json();
    return data.text || '';
  } else {
    // Local AI (completely offline)
    return await generateLLMResponse({
      provider: 'local',
      url: localUrl,
      model: localModel,
      prompt,
      systemInstruction: "You are an objective, highly logical Summarizer AI specialized in capturing multi-agent dialogues and conceptual evolution without bias.",
      temperature: 0.2
    });
  }
}

// Literary Agent AI Scribe (Generate Blog Post)
export async function generateBlogPost(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
  summaryOfEarlierDialogue: string;
  messages: any[];
}): Promise<string> {
  const { provider, localUrl, localModel, topic, summaryOfEarlierDialogue, messages } = params;

  const messagesText = messages
    .map((m: any) => `${m.senderName}: ${m.content}`)
    .join("\n\n");

  const prompt = `
Topic Statement: "${topic}"

${summaryOfEarlierDialogue ? `Distilled Socratic Dialogue Summary:\n${summaryOfEarlierDialogue}\n` : ""}

Detailed Discussion Transcript:
"""
${messagesText}
"""

You are a brilliant Literary Agent and Scribe. Your role is to capture the initial topic, the complex considerations raised during the Socratic questioning, and the ultimate outcome or refined understanding.
Compose an engaging, highly insightful, and polished Blog Post. 
Use markdown formatting, compelling headers, a catchy title, a thoughtful introduction, a deep section exploring the conflicting perspectives and Socratic queries, and a conclusion summarizing the conceptual evolution of the participants.
Make it readable, captivating, and profound. No extra surrounding text outside the article markdown itself.
`;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        prompt,
        systemInstruction: "You are an elite literary scribe and essayist capable of summarizing intense intellectual debates into deeply engaging, readable blog articles.",
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini generate blog post failed: ${response.status}`);
    }
    const data = await response.json();
    return data.text || '';
  } else {
    return await generateLLMResponse({
      provider: 'local',
      url: localUrl,
      model: localModel,
      prompt,
      systemInstruction: "You are an elite literary scribe and essayist capable of summarizing intense intellectual debates into deeply engaging, readable blog articles.",
      temperature: 0.7
    });
  }
}

// ==========================================
// NEW ADVERSARIAL EPISTEMIC SYSTEM COMPONENT FUNCTIONS
// ==========================================

// Question Novelty Constraint (QNC) Validator
export async function validateSocraticQuestionQNC(params: {
  question: string;
  history: string[];
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  phase?: 'exploration' | 'stabilization' | 'convergence';
}): Promise<{ valid: boolean; reason?: string }> {
  const { question, history, provider, localUrl, localModel, phase = 'exploration' } = params;
  
  if (history.length === 0) {
    return { valid: true, reason: "Initial question of Socratic cycle." };
  }

  let phaseInstruction = "";
  if (phase === 'exploration') {
    phaseInstruction = `A valid Socratic question MUST introduce at least ONE brand-new:
1. variable
2. failure mode
3. observer disagreement
4. operational constraint

It must not merely restate, rephrase, or repeat existing questions in different words.`;
  } else if (phase === 'stabilization') {
    phaseInstruction = `A valid Socratic question MUST critically examine, audit, or challenge the variables, concepts, or constructs already introduced in earlier rounds. It should NOT introduce completely unrelated new topics. It must check for consistency, logical gaps, or boundary conditions of existing constructs. It must not merely restate or rephrase previous questions in different words.`;
  } else {
    phaseInstruction = `A valid Socratic question MUST push the participants towards convergence, synthesis, consensus, or a clear definition of what they ultimately agree to disagree on. It must strictly utilize the existing constructs and claims already discussed. It must NOT introduce any brand-new variables or unrelated concepts. It must not merely restate or rephrase previous questions in different words.`;
  }

  const prompt = `
We are enforcing a strict Socratic validation constraint (current phase: "${phase}") on our Socrates agent.
Rules for this phase:
${phaseInstruction}

History of previous Socratic questions:
${history.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Proposed Socratic question:
"${question}"

Determine if the proposed question satisfies the phase constraint.
Format your output strictly as a JSON object:
{
  "valid": true | false,
  "reason": "Clear explanation of how the constraint was satisfied or why the question was rejected."
}
Return ONLY valid JSON.`;

  try {
    let jsonText = "";
    if (provider === 'gemini') {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          prompt,
          systemInstruction: "You are a rigid runtime epistemic validator. Check Socratic questions for conceptual loops and QNC compliance.",
          temperature: 0.1,
        })
      });
      if (response.ok) {
        const data = await response.json();
        jsonText = data.text || "";
      }
    } else {
      jsonText = await generateLLMResponse({
        provider: 'local',
        url: localUrl,
        model: localModel,
        prompt,
        systemInstruction: "You are a rigid runtime epistemic validator. Check Socratic questions for conceptual loops and QNC compliance.",
        temperature: 0.1
      });
    }

    if (jsonText) {
      const cleanText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
        return {
          valid: typeof parsed.valid === 'boolean' ? parsed.valid : true,
          reason: parsed.reason || "Checked QNC."
        };
      }
    }
  } catch (err) {
    console.warn("QNC Validation failed, skipping programmatically", err);
  }
  return { valid: true, reason: "Bypassed QNC validation on network error." };
}


// Sanitize dependencies and derivedFrom to prevent circular dependencies (ensure DAG property)
export function sanitizeClaimDependencies(claims: Claim[]): Claim[] {
  const claimIds = new Set(claims.map(c => c.id));

  // Keep only existing, non-self dependencies and derivedFrom links
  const cleanClaims = claims.map(c => {
    const deps = (c.dependencies || []).filter(depId => depId && depId !== c.id && claimIds.has(depId));
    const derived = (c.derivedFrom || []).filter(dId => dId && dId !== c.id && claimIds.has(dId));

    return {
      ...c,
      dependencies: deps,
      derivedFrom: derived
    };
  });

  // Iterative cycle check for dependencies (Graph u -> v means u depends on v)
  const resolvedDeps = new Map<string, string[]>();

  function canReach(start: string, target: string, visited: Set<string>): boolean {
    if (start === target) return true;
    if (visited.has(start)) return false;
    visited.add(start);

    const neighbors = resolvedDeps.get(start) || [];
    for (const neighbor of neighbors) {
      if (canReach(neighbor, target, visited)) {
        return true;
      }
    }
    return false;
  }

  for (const claim of cleanClaims) {
    const allowed: string[] = [];
    resolvedDeps.set(claim.id, allowed);

    for (const depId of claim.dependencies || []) {
      const visited = new Set<string>();
      if (!canReach(depId, claim.id, visited)) {
        allowed.push(depId);
        resolvedDeps.set(claim.id, allowed);
      } else {
        console.warn(`Circular dependency detected and broken: ${claim.id} cannot depend on ${depId}`);
      }
    }
  }

  // Iterative cycle check for derivedFrom
  const resolvedDerived = new Map<string, string[]>();

  function canReachDerived(start: string, target: string, visited: Set<string>): boolean {
    if (start === target) return true;
    if (visited.has(start)) return false;
    visited.add(start);

    const neighbors = resolvedDerived.get(start) || [];
    for (const neighbor of neighbors) {
      if (canReachDerived(neighbor, target, visited)) {
        return true;
      }
    }
    return false;
  }

  for (const claim of cleanClaims) {
    const allowed: string[] = [];
    resolvedDerived.set(claim.id, allowed);

    for (const dId of claim.derivedFrom || []) {
      const visited = new Set<string>();
      if (!canReachDerived(dId, claim.id, visited)) {
        allowed.push(dId);
        resolvedDerived.set(claim.id, allowed);
      } else {
        console.warn(`Circular lineage detected and broken: ${claim.id} cannot be derived from ${dId}`);
      }
    }
  }

  return cleanClaims.map(c => ({
    ...c,
    dependencies: resolvedDeps.get(c.id) || [],
    derivedFrom: resolvedDerived.get(c.id) || []
  }));
}

// Heuristically filter existing claims to keep context size tiny (max 12 claims)
export function getTopRelevantClaims(dialogueSegment: string, claims: Claim[], limit = 12): Claim[] {
  if (claims.length <= limit) return claims;

  // Extract lowercase alphanumeric words of length >= 4
  const words = dialogueSegment.toLowerCase().match(/\b[a-z0-9]{4,}\b/g) || [];
  if (words.length === 0) {
    // Fallback: take the most recent claims from the end of the array
    return claims.slice(-limit);
  }

  const scored = claims.map(claim => {
    const claimText = ((claim.statement || "") + " " + (claim.operationalisation || "") + " " + (claim.disagreement || "")).toLowerCase();
    let score = 0;
    words.forEach(word => {
      if (claimText.includes(word)) {
        score += 1;
      }
    });
    return { claim, score };
  });

  // Filter and sort by score descending
  const matched = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.claim);

  if (matched.length >= limit) {
    return matched.slice(0, limit);
  }

  // Pad with most recent claims
  const remaining = claims.filter(c => !matched.some(m => m.id === c.id));
  const recent = remaining.slice(- (limit - matched.length));

  return [...matched, ...recent];
}

// Extract & Process Claims Topology Map State Machine
export async function extractAndProcessClaims(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
  dialogueSegment: string;
  existingClaims: Claim[];
  sourceAgentId: string;
  sourceAgentName: string;
  roundCount?: number;
}): Promise<Claim[]> {
  const { provider, localUrl, localModel, topic, dialogueSegment, existingClaims, sourceAgentId, sourceAgentName, roundCount = 1 } = params;

  // Heuristically select up to 12 candidate claims relevant to this segment to prevent massive prompt token-bloat
  const candidateClaims = getTopRelevantClaims(dialogueSegment, existingClaims, 12);

  // 1. STAGE 1: Sieve-Pass Quick Filter
  const lightweightIndex = candidateClaims.map(c => ({
    id: c.id,
    statement: c.statement,
    status: c.status,
    introducedBy: c.introducedBy
  }));

  const sievePrompt = `
Topic: "${topic}"

We have a set of existing claims in our Epistemic Sieve.
Here is the lightweight index of existing claims:
${JSON.stringify(lightweightIndex, null, 2)}

We have a new statement by agent "${sourceAgentName}" (role: "${sourceAgentId}") in Round ${roundCount}:
"""
${dialogueSegment}
"""

Please evaluate if this statement:
1. Introduces any brand-new conceptual claims or variables (true/false).
2. Modifies, operationalises, contests, refines, or audits any of the existing claims listed in the lightweight index above by their ID.

Return ONLY a valid JSON object matching this structure:
{
  "introducesNewClaim": true, // or false
  "affectedClaimIds": ["claim_xxx"] // list of existing claim IDs directly referenced/updated
}
`;

  let sieveResult = { introducesNewClaim: true, affectedClaimIds: [] as string[] };
  try {
    let sieveJson = "";
    if (provider === 'gemini') {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          prompt: sievePrompt,
          systemInstruction: "You are a highly analytical Sieve Pass filter. Your task is to detect if a statement adds a new claim or modifies specific existing claims. Return ONLY JSON.",
          temperature: 0.1
        })
      });
      if (response.ok) {
        const data = await response.json();
        sieveJson = data.text || "";
      }
    } else {
      sieveJson = await generateLLMResponse({
        provider: 'local',
        url: localUrl,
        model: localModel,
        prompt: sievePrompt,
        systemInstruction: "You are a highly analytical Sieve Pass filter. Your task is to detect if a statement adds a new claim or modifies specific existing claims. Return ONLY JSON.",
        temperature: 0.1
      });
    }

    if (sieveJson) {
      const cleanSieve = sieveJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanSieve.indexOf('{');
      const lastBrace = cleanSieve.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsedSieve = JSON.parse(cleanSieve.substring(firstBrace, lastBrace + 1));
        sieveResult.introducesNewClaim = !!parsedSieve.introducesNewClaim;
        if (Array.isArray(parsedSieve.affectedClaimIds)) {
          sieveResult.affectedClaimIds = parsedSieve.affectedClaimIds.map((id: any) => String(id));
        }
      }
    }
  } catch (err) {
    console.warn("Sieve-Pass quick evaluation failed, proceeding with fallback parsing", err);
    sieveResult.introducesNewClaim = true;
    sieveResult.affectedClaimIds = candidateClaims.map(c => c.id);
  }

  // OPTIMIZATION ESCAPE HATCH: If no new claims and no affected claims, bypass Stage 2 entirely!
  if (!sieveResult.introducesNewClaim && sieveResult.affectedClaimIds.length === 0) {
    console.log("Sieve-Pass optimization: No changes detected. Bypassing claims compilation.");
    return existingClaims;
  }

  // 2. STAGE 2: Targeted Compilation
  const fullAffectedClaims = candidateClaims.filter(c => sieveResult.affectedClaimIds.includes(c.id));
  const lightInactiveClaims = candidateClaims
    .filter(c => !sieveResult.affectedClaimIds.includes(c.id))
    .map(c => ({
      id: c.id,
      statement: c.statement,
      status: c.status,
      introducedBy: c.introducedBy
    }));

  const prompt = `
Topic: "${topic}"

We are maintaining an Adversarial Epistemic Claims Topology (Socratic Sieve v3).
Every claim is treated as a concept with its own lineage and provenance.

We categorize observations into 4 distinct structural groups:
- Direct Observation: Directly independently verifiable data (e.g. photos count, retention duration in months).
- Composite Observable: Calculated from multiple observations.
- Latent Construct: Theoretical model inferred from observations (e.g. Future Autonomy Loss, Narrative Construction).
- Pure Theoretical Construct: Non-measurable high-level explanatory framework (e.g. Dignity, Authenticity).

Every concept has a lifecycle: Introduced -> Tentative -> Operational Candidate -> Operationalised -> Established Construct -> Split / Merged / Collapsed / Deprecated.
- Promotion to "Established Construct" requires that multiple agents independently converge on its usefulness, it survives Socratic attacks, and observers accept its definition despite disagreements on implications.
- "Collapsed" happens if no operational definition survives, it's redundant, or purely rhetorical.

Every claim must specify:
1. Concept Provenance:
   - origin: 'user' | 'emergent' | 'operational_proxy' | 'normative_abstraction'
   - introducedBy: Name of agent who introduced it
   - generationRound: Current round number (${roundCount})
   - derivedFrom: array of other claim IDs this was derived or split/merged from.
2. Dependencies:
   - dependencies: List of existing Claim IDs that must already hold true before this claim becomes meaningful. This creates a Directed Acyclic Graph (DAG)!
3. Epistemic Inspector v2:
   - observable: 'Yes' | 'No'
   - requiresTheory: 'Yes' | 'No'
   - observerAgreement: 'High' | 'Medium' | 'Low'
   - alternativeInterpretations: Array of objects with { observerName: string, interpretation: string } (e.g. Reduced agency vs Ordinary reputation management vs Changing norms).
4. Disagreement Taxonomy:
   - disagreementType: 'definition' | 'measurement' | 'causal' | 'value' | 'ontological' | 'meta-epistemic'
5. Stability Dimensions (score 0.0 to 1.0):
   - definitionCompleteness, operationalCompleteness, observerConsensus, dependencyRobustness, epistemicMaturity

We have a new statement by agent "${sourceAgentName}" (role: "${sourceAgentId}"):
"""
${dialogueSegment}
"""

Here are the FULL structures of the ACTIVE/AFFECTED claims that need updating:
${JSON.stringify(fullAffectedClaims, null, 2)}

Here are the other INACTIVE claims in the system (use these ONLY for drawing DAG dependencies or lineage links in "dependencies" or "derivedFrom" fields):
${JSON.stringify(lightInactiveClaims, null, 2)}

Based on the agent's statement, please construct:
1. Any brand-new claim objects introduced by the statement (if any).
2. The updated claim objects for the ACTIVE/AFFECTED claims (if any are modified, operationalised, or contested).

Output ONLY a valid JSON object matching this structure:
{
  "newClaims": [
    // array of new Claim objects
  ],
  "updatedClaims": [
    // array of updated Claim objects matching the IDs of active claims
  ]
}

Each claim object inside "newClaims" or "updatedClaims" must match this typescript interface:
interface Claim {
  id: string; // For new claims, generate a unique string e.g. claim_123. For updated claims, KEEP the existing ID.
  statement: string;
  operationalisation: string;
  disagreement: string;
  observerA: string;
  observerB: string;
  status: "RAW" | "INTERPRETED" | "OPERATIONALISED" | "CONTESTED" | "STABLE" | "UNSTABLE";
  stabilityScore: number;
  normativeLoad: string;
  disagreementDensity: number;
  operationalComplete: boolean;
  sourceAgentId: string;
  sourceAgentName: string;
  timestamp: string;

  origin: "user" | "emergent" | "operational_proxy" | "normative_abstraction";
  introducedBy: string;
  generationRound: number;
  derivedFrom: string[];
  lifecycle: "Introduced" | "Tentative" | "Operational Candidate" | "Operationalised" | "Established Construct" | "Split" | "Merged" | "Collapsed" | "Deprecated";
  category: "Direct Observation" | "Composite Observable" | "Latent Construct" | "Pure Theoretical Construct";
  dependencies: string[];
  observable: "Yes" | "No";
  requiresTheory: "Yes" | "No";
  observerAgreement: "High" | "Medium" | "Low";
  alternativeInterpretations: { observerName: string; interpretation: string }[];
  disagreementType: "definition" | "measurement" | "causal" | "value" | "ontological" | "meta-epistemic";
  definitionCompleteness: number; // 0.0 to 1.0
  operationalCompleteness: number; // 0.0 to 1.0
  observerConsensus: number; // 0.0 to 1.0
  dependencyRobustness: number; // 0.0 to 1.0
  epistemicMaturity: number; // 0.0 to 1.0
}
`;

  try {
    let jsonText = "";
    if (provider === 'gemini') {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          prompt,
          systemInstruction: "You are an expert epistemic compiler. You parse philosophical arguments into targeted new or updated claim data structures. Output only valid JSON.",
          temperature: 0.1,
        })
      });
      if (response.ok) {
        const data = await response.json();
        jsonText = data.text || "";
      }
    } else {
      jsonText = await generateLLMResponse({
        provider: 'local',
        url: localUrl,
        model: localModel,
        prompt,
        systemInstruction: "You are an expert epistemic compiler. You parse philosophical arguments into targeted new or updated claim data structures. Output only valid JSON.",
        temperature: 0.1
      });
    }

    if (jsonText) {
      const cleanText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1));
        
        const newClaimsRaw = Array.isArray(parsed.newClaims) ? parsed.newClaims : [];
        const updatedClaimsRaw = Array.isArray(parsed.updatedClaims) ? parsed.updatedClaims : [];
        
        const normalizeClaim = (c: any, isNew: boolean) => {
          const hasLayers = !!(c.statement && c.operationalisation && c.disagreement);
          const hasDuality = !!(c.observerA && c.observerB);
          
          let resolvedStatus = c.status;
          if (!hasLayers) {
            resolvedStatus = 'UNSTABLE';
          } else if (c.status === 'CONTESTED' && !c.operationalisation) {
            resolvedStatus = 'UNSTABLE';
          }
          
          const claimId = c.id || (isNew ? `claim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` : c.id);
          
          // Build robust fallback alternativeInterpretations
          let altInterps = c.alternativeInterpretations;
          if (!altInterps || !Array.isArray(altInterps) || altInterps.length === 0) {
            altInterps = [];
            if (c.observerA) {
              altInterps.push({ observerName: 'Observer A (Optimistic)', interpretation: c.observerA });
            }
            if (c.observerB) {
              altInterps.push({ observerName: 'Observer B (Skeptical)', interpretation: c.observerB });
            }
            if (altInterps.length === 0) {
              altInterps.push({ observerName: 'Default Observer', interpretation: 'Awaiting interpretations' });
            }
          }

          return {
            id: claimId,
            statement: c.statement || "",
            operationalisation: c.operationalisation || "",
            disagreement: c.disagreement || "",
            observerA: c.observerA || (altInterps[0]?.interpretation || ""),
            observerB: c.observerB || (altInterps[1]?.interpretation || ""),
            status: resolvedStatus,
            stabilityScore: hasLayers ? (c.stabilityScore ?? 0.3) : Math.max(c.stabilityScore ?? 0.8, 0.7),
            normativeLoad: c.normativeLoad || "",
            disagreementDensity: c.disagreementDensity ?? 0.5,
            operationalComplete: hasLayers && hasDuality,
            sourceAgentId: c.sourceAgentId || sourceAgentId,
            sourceAgentName: c.sourceAgentName || sourceAgentName,
            timestamp: c.timestamp || new Date().toISOString(),

            // v3 additions
            origin: c.origin || (isNew ? (sourceAgentId === 'socratic' ? 'user' : 'emergent') : c.origin),
            introducedBy: c.introducedBy || (isNew ? sourceAgentName : c.introducedBy),
            generationRound: c.generationRound ?? (isNew ? roundCount : c.generationRound),
            derivedFrom: Array.isArray(c.derivedFrom) ? c.derivedFrom : [],
            lifecycle: c.lifecycle || (resolvedStatus === 'STABLE' ? 'Established Construct' : hasLayers ? 'Operationalised' : 'Introduced'),
            category: c.category || (hasLayers ? 'Composite Observable' : 'Latent Construct'),
            dependencies: Array.isArray(c.dependencies) ? c.dependencies : [],
            observable: c.observable || (hasLayers ? 'Yes' : 'No'),
            requiresTheory: c.requiresTheory || 'Yes',
            observerAgreement: c.observerAgreement || (resolvedStatus === 'STABLE' ? 'High' : 'Medium'),
            alternativeInterpretations: altInterps,
            disagreementType: c.disagreementType || 'measurement',
            
            // Stability redesign dimensions
            definitionCompleteness: c.definitionCompleteness ?? (c.statement ? 0.8 : 0.2),
            operationalCompleteness: c.operationalCompleteness ?? (c.operationalisation ? 0.9 : 0.1),
            observerConsensus: c.observerConsensus ?? (resolvedStatus === 'STABLE' ? 0.85 : 0.4),
            dependencyRobustness: c.dependencyRobustness ?? 0.7,
            epistemicMaturity: c.epistemicMaturity ?? (resolvedStatus === 'STABLE' ? 0.9 : 0.4)
          };
        };

        const normalizedNewClaims = newClaimsRaw.map((rc: any) => normalizeClaim(rc, true));
        const normalizedUpdatedClaims = updatedClaimsRaw.map((rc: any) => normalizeClaim(rc, false));

        // Merge normalized claims back into existingClaims list
        let finalClaims = [...existingClaims];

        // 1. Replace existing claims with their updated counterparts
        normalizedUpdatedClaims.forEach((uc: Claim) => {
          const idx = finalClaims.findIndex(c => c.id === uc.id);
          if (idx !== -1) {
            finalClaims[idx] = uc;
          } else {
            finalClaims.push(uc);
          }
        });

        // 2. Append brand-new claims
        normalizedNewClaims.forEach((nc: Claim) => {
          if (!finalClaims.some(c => c.id === nc.id)) {
            finalClaims.push(nc);
          }
        });

        return sanitizeClaimDependencies(finalClaims);
      }
    }
  } catch (err) {
    console.error("Failed to parse or extract claims, using existing fallback", err);
  }
  return sanitizeClaimDependencies(existingClaims);
}

function condenseClaimsForReporting(claims: Claim[]): any[] {
  return claims.map(c => ({
    id: c.id,
    statement: c.statement,
    status: c.status,
    operationalisation: c.operationalisation || undefined,
    disagreement: c.disagreement || undefined,
    normativeLoad: c.normativeLoad || undefined,
    stabilityScore: c.stabilityScore ?? undefined,
    dependencies: c.dependencies && c.dependencies.length > 0 ? c.dependencies : undefined
  }));
}

// Generate Epistemic State Report (ESR)
export async function generateEpistemicStateReport(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
  claims: Claim[];
  messages: any[];
}): Promise<string> {
  const { provider, localUrl, localModel, topic, claims, messages } = params;
  
  const stableCount = claims.filter(c => c.status === 'STABLE').length;
  const totalCount = claims.length;
  const ratio = totalCount > 0 ? (stableCount / totalCount) : 0;
  
  if (ratio < 0.6 && totalCount > 0) {
    return `🧾 **Epistemic State Report (ESR)**

⚠️ **Non-convergent epistemic system state**

Only ${(ratio * 100).toFixed(1)}% of claims (${stableCount}/${totalCount}) are currently classified as **STABLE** (fully operationalised, non-disputed, with dual observer interpretations). Epistemic entropy remains high. Complete more turns to stabilize claims.

### Remaining Irreducible Disagreement Structure
The system is strictly forbidden from compiling an "ultimate consensus". Active intellectual divergences exist regarding measurement proxies and observer duality contradictions. Select nodes in the **Epistemic Topology Map** above to trace unresolved variables.`;
  }
  
  // Condense and limit the claims passed to the LLM to keep context compact and fast
  const activeDisputes = claims.filter(c => c.status !== 'STABLE');
  const stableClaims = claims.filter(c => c.status === 'STABLE');
  const limitedClaims = [
    ...stableClaims.slice(-15),
    ...activeDisputes.slice(-15)
  ];
  const condensed = condenseClaimsForReporting(limitedClaims);

  const prompt = `
Topic: "${topic}"

Generate a formal 🧾 Epistemic State Report (ESR) based on the claims topology:
Claims Data:
${JSON.stringify(condensed, null, 2)}

Format of the report:
# Epistemic State Report (ESR)

## 1. Stable Claims
List only operationally grounded, non-disputed claims (status = STABLE). Include their operational variables.

## 2. Active Disputes
Format each active dispute as:
- **Claim**: [Concept]
- **Competing Interpretations**: [Observer A vs Observer B]
- **Unresolved Variable**: [What remains unmeasured]

## 3. Hidden Normative Load
Explicit list of value judgments and prescriptive assumptions (shoulds) extracted from the arguments.

## 4. Measurement Fragility Index
Explicit list of each claim with its stability score/fragility index (0.0 = fully operationalised, 1.0 = purely interpretive). Highlight that no claim above 0.6 can be treated as a valid conclusion.

## 5. Remaining Irreducible Disagreement Structure
Synthesize the core persistent divergences. Remember: DO NOT produce an ultimate conclusion, a final position, or what survives Socratic pressure. Detail the persistent, irreducible intellectual architecture instead.

Your entire report MUST be strictly under 1500 words.
`;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        prompt,
        systemInstruction: "You are a Synthesis Agent operating under strict non-collapsibility rules. Present the structural disagreements and fragility indexes without choosing a consensus.",
        temperature: 0.2
      })
    });
    if (response.ok) {
      const data = await response.json();
      return data.text || '';
    }
  } else {
    return await generateLLMResponse({
      provider: 'local',
      url: localUrl,
      model: localModel,
      prompt,
      systemInstruction: "You are a Synthesis Agent operating under strict non-collapsibility rules. Present the structural disagreements and fragility indexes without choosing a consensus.",
      temperature: 0.2
    });
  }
  return "Unable to compile Epistemic State Report.";
}

// Generate Epistemic Field Report (EFR)
export async function generateEpistemicFieldReport(params: {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
  claims: Claim[];
  messages: any[];
}): Promise<string> {
  const { provider, localUrl, localModel, topic, claims, messages } = params;

  const messagesText = messages
    .map((m: any) => `${m.senderName}: ${m.content}`)
    .join("\n\n");

  // Condense and limit the claims passed to the LLM to keep context compact and fast
  const activeDisputes = claims.filter(c => c.status !== 'STABLE');
  const stableClaims = claims.filter(c => c.status === 'STABLE');
  const limitedClaims = [
    ...stableClaims.slice(-15),
    ...activeDisputes.slice(-15)
  ];
  const condensed = condenseClaimsForReporting(limitedClaims);

  const prompt = `
Topic Statement: "${topic}"

Generate a rigorous 📄 Epistemic Field Report (EFR) representing the complete dialectical field of this inquiry.

Claims Data:
${JSON.stringify(condensed, null, 2)}

Detailed Discussion Transcript:
"""
${messagesText}
"""

Compose a comprehensive dialectical study.
You MUST include sections covering:
1. Unresolved Variables
2. Competing Observer Models (Observer Duality interpretations)
3. Hidden Value Assumptions (separating descriptive 'is' from prescriptive 'should')
4. Non-reducible Disagreements

You are STRGHTLY FORBIDDEN from providing "ultimate conclusions", "final positions", or "what survives Socratic pressure".
Under no circumstances is narrative closure or consensus allowed. The report must preserve the irreducible dialectical friction. Use Markdown.

Your entire report MUST be strictly under 1500 words.
`;

  if (provider === 'gemini') {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        prompt,
        systemInstruction: "You are an elite epistemic scribe. Document dialectical tensions without narrative resolution or false consensus.",
        temperature: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini generate field report failed: ${response.status}`);
    }
    const data = await response.json();
    return data.text || '';
  } else {
    return await generateLLMResponse({
      provider: 'local',
      url: localUrl,
      model: localModel,
      prompt,
      systemInstruction: "You are an elite epistemic scribe. Document dialectical tensions without narrative resolution or false consensus.",
      temperature: 0.5
    });
  }
}

export interface PhdProposalParams {
  provider: 'local' | 'gemini';
  localUrl: string;
  localModel: string;
  topic: string;
  claims: Claim[];
  messages: Message[];
}

export async function generatePhdProposal(params: PhdProposalParams): Promise<string> {
  const { provider, localUrl, localModel, topic, claims, messages } = params;

  const dialogueHistory = messages
    .filter(m => !m.isSummary && m.role !== 'system')
    .map(m => `${m.senderName} (${m.senderId}): ${m.content}`)
    .join('\n\n');

  const claimsSummary = claims.map(c => {
    return `- [${c.id}] Concept ID: ${c.id}
      Type: ${c.category || 'Claim'}
      Provenance: Introduced by ${c.introducedBy || c.sourceAgentName || 'unknown'} in Round ${c.generationRound || 1}
      Description/Statement: ${c.statement}
      Operational Definition/Observable: ${c.operationalisation || 'None'}
      Observer Disagreements: ${c.disagreement || 'None'}
      Value Assumptions: ${c.normativeLoad || 'None'}
      Stability Dimensions: Stability Score: ${c.stabilityScore ?? 0.5}, Disagreement Density: ${c.disagreementDensity ?? 0.5}, Operational Complete: ${c.operationalComplete ? 'Yes' : 'No'}
      Dependencies (DAG): ${(c.dependencies || []).join(', ') || 'None'}`;
  }).join('\n\n');

  const prompt = `
Inquiry Topic: "${topic}"

We have completed a highly advanced, adversarial Socratic dialogue where participants contested core definitions, proposed specific operational proxies, identified deep value judgments, and mapped disagreements in an active claim topology.

Dialogue History:
"""
${dialogueHistory}
"""

Claims and Concept Topology (Socratic Sieve v3 DAG):
"""
${claimsSummary}
"""

# ROLE

You are an experienced PhD supervisor whose task is NOT to summarize the debate.

Your task is to identify the smallest, deepest unresolved research problem that the debate accidentally exposed.

Assume participants may have argued about the wrong thing.

The debate itself is evidence.

Your goal is to discover what the debate was really investigating.

---

# PRINCIPLE

Debates frequently begin inside one discipline but uncover problems belonging to another.

Do not assume the opening proposition is the true research question.

Instead ask:

"What deeper problem caused intelligent participants to repeatedly leave the original topic?"

The thesis should be built around THAT problem.

---

# STEP 1 — IDENTIFY CONCEPTUAL MIGRATION

Determine:

• Original domain
• Final domain
• Intermediate conceptual shifts

Produce a migration map such as

Economics
↓
Decision Theory
↓
Measurement Theory
↓
Philosophy of Science

or

Artificial Intelligence
↓
Cognition
↓
Epistemology
↓
Ontology

Explain WHY the discussion migrated.

---

# STEP 2 — IDENTIFY THE RECURRING TENSION

Ignore terminology.

Look for the same disagreement appearing repeatedly under different language.

Examples:

observable vs latent

efficiency vs value

proxy vs construct

description vs prescription

measurement vs meaning

objective vs observer-dependent

Ask:

"If every example were removed, what abstract disagreement would remain?"

---

# STEP 3 — COMPRESS THE DEBATE

The debate may contain dozens of claims.

Reduce these into between 2 and 5 fundamental research problems.

Every claim should belong to one of these.

If not, explain why.

Avoid restating the debate.

Instead perform conceptual compression.

---

# STEP 4 — IDENTIFY THE HIDDEN ASSUMPTION

Determine the assumption every participant depended upon without explicitly defending.

Examples:

That cognition is measurable.

That value can be operationalised.

That performance implies alignment.

That proxies preserve meaning.

State whether this assumption is

• empirically testable
• philosophical
• ontological
• methodological

---

# STEP 5 — ASK THE SUPERVISOR QUESTION

Imagine supervising a doctoral student.

Ask:

"If this entire debate disappeared tomorrow, what unanswered question would still matter academically?"

This becomes the candidate research programme.

It should NOT mention the original debate unless unavoidable.

---

# STEP 6 — TEST FOR GENERALITY

Determine whether the research question applies only to the debate topic or represents a broader scientific problem.

Classify its scope:

Level 1
Specific application

Level 2
Field-wide problem

Level 3
Cross-disciplinary problem

Level 4
Foundational scientific or philosophical problem

Prefer the highest defensible level.

---

# STEP 7 — PRODUCE THE THESIS

Produce:

1.
Underlying insight discovered.

2.
Why this insight is more fundamental than the original proposition.

3.
Research discipline(s).

4.
Central research question.

5.
Three to five testable subquestions.

6.
Existing bodies of literature likely to intersect.

7.
Novel theoretical contribution.

8.
Candidate methodologies.

9.
Risks and limitations.

10.
Why this constitutes doctoral-level research rather than merely extending the original debate.

---

# IMPORTANT CONSTRAINTS

Never merely restate the debate.

Never build a thesis around whichever agent sounded most convincing.

Treat the debate as qualitative data rather than authoritative truth.

Your objective is to infer the hidden research programme that generated the discussion.

The best thesis is usually one abstraction level above the debate itself.

If multiple abstraction levels exist, explicitly compare them and justify which level offers the greatest academic contribution.

The proposal MUST be structured precisely according to the following template, written in rich, authoritative, academic prose (PhD level):

# PhD THESIS PROPOSAL: CANDIDATE FOR DOCTORAL EXAMINATION

## 1. PROPOSED THESIS TITLE
[A precise, high-density, academic title reflecting the core conflict, the operationalised proxy, and the theoretical contribution]

## 2. PROBLEM STATEMENT & CONTEXT
[Analyze the dialectical field from the debate. What is the fundamental theoretical problem or unresolved Socratic tension? Identify how previous work fails or fails to measure these elements, referencing specific conceptual dualities or competing views identified by the participants]

## 3. FORMAL RESEARCH QUESTIONS & HYPOTHESES
- **Primary Research Question (PRQ)**: [State the primary research question clearly]
- **Sub-Questions**: [2-3 specific theoretical or empirical sub-questions]
- **Testable Hypotheses**: [Formulate at least 2 clear, falsifiable hypotheses linked directly to the operationalised proxies from our claims DAG]

## 4. THEORETICAL CONSIDERATIONS & LITERATURE SYNTHESIS
[Discuss the theoretical landscape, including value judgments, normative loads, and the ontological categories of the concepts involved (e.g. Latent Constructs vs Composite Observables)]

## 5. METHODOLOGY & CANDIDATE APPROACHES TO TESTING
[Describe a robust, testable research design. How will the hypotheses be tested empirically? Detail specific avenues of examination, including:
- Data sources and measurement models for the operationalised proxies.
- Control variables and potential confounding factors.
- Best candidate approaches to testing, validation, and empirical elaboration.
- How observer disagreement and alternative interpretations will be mathematically or procedurally reconciled or handled in the study design]

## 6. EXPECTED BENEFITS & SCHOLARLY CONTRIBUTIONS
[What are the anticipated outcomes and benefits? How does this resolve the irreducible tensions or Socratic deadlocks highlighted in the debate? Detail the contribution to theory, policy, and practice]

---

Please output the proposal in beautifully formatted Markdown, using elegant typography styles. Do NOT output any conversational text or introduction. Start immediately with '# PhD THESIS PROPOSAL'.`;

  return await generateLLMResponse({
    provider,
    url: localUrl,
    model: localModel,
    prompt,
    systemInstruction: "You are an elite academic thesis advisor and scientific epistemologist.",
    temperature: 0.6
  });
}

