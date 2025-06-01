/*
# Copyright (C) 2025 Nokkela.AI
#
# This file is part of Nokkela Voice Assistant (NVA)
#
# Nokkela Voice Assistant (NVA) is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later version.
#
# Nokkela Voice Assistant (NVA) is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
# without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
# See the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License along with
# Nokkela Voice Assistant (NVA). If not, see https://www.gnu.org/licenses/.
*/

// (iOS/Chrome) Unlock and hold a shared AudioContext on first touch so async audio.play() is allowed
window.audioCtx = null;
document.body.addEventListener('touchend', () => {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  window.audioCtx.resume();
}, { once: true });

// === Session ID for context (persisted in localStorage) ===
let sessionId = localStorage.getItem('sessionId');
if (!sessionId && window.crypto && crypto.randomUUID) {
  sessionId = crypto.randomUUID();
  localStorage.setItem('sessionId', sessionId);
}

// Track current audio playback so we can stop it
window.currentAudio = null;

/**
 * Update the prompt image based on the selected system prompt.
 */
function updatePromptImage() {
  const mode = document.getElementById('systemPromptSelect').value;
  const mapping = {
    Assistant:      'images/image_sp_assistant.png',
    Translator:     'images/image_sp_translator.png',
    AssistantShort: 'images/image_sp_assistantshort.png',
    Instructor:     'images/image_sp_instructor.png',
    MediDoc:        'images/image_sp_medic.png',
    Cleric:         'images/image_sp_cleric.png',
    StoryTeller:    'images/image_sp_storyteller.png'
  };
  const imgEl = document.getElementById('promptImage');
  const src = mapping[mode] || '';
  if (src) {
    imgEl.src = src;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }
}

// ---------------------------
// D3.js Visualization Section
// ---------------------------

// Initializes the D3 visualization by creating an SVG element and defining gradients for the blob.
function initVisualization() {
    const width = 600;
    const height = 600;

    // Append an SVG container to the 'cloud-container' div
    const svg = d3.select('#cloud-container').append('svg')
        .attr('width', width)
        .attr('height', height);

    // Append definitions for gradients
    const defs = svg.append('defs');

    // Define the main radial gradient for the blob (normal state)
    const gradient = defs.append('radialGradient')
        .attr('id', 'blobGradient')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#FF99CC');
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#9933FF');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#0066FF');

    // Define an inverted gradient for the "speaking" state
    const invertedGradient = defs.append('radialGradient')
        .attr('id', 'blobGradientInverted')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    invertedGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0066FF');
    invertedGradient.append('stop').attr('offset', '50%').attr('stop-color', '#9933FF');
    invertedGradient.append('stop').attr('offset', '100%').attr('stop-color', '#FF99CC');

    // Define an inverted gradient for the "thinking" state
    const thinkingGradient = defs.append('radialGradient')
        .attr('id', 'blobGradientThinking')
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');
    thinkingGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0066FF');
    thinkingGradient.append('stop').attr('offset', '50%').attr('stop-color', '#9933FF');
    thinkingGradient.append('stop').attr('offset', '100%').attr('stop-color', '#FFCC33');

    // Create the blob path with a random, organic shape
    const blob = svg.append('path')
        .attr('d', generateBlobPath(width / 2, height / 2, 150))
        .attr('fill', 'url(#blobGradient)')
        .attr('opacity', 1);

    // Store the blob element globally for later updates
    window.blob = blob;
}

// Generates a random organic blob path using a cardinal closed curve.
// cx, cy: center of the blob; radius: average radius; points: number of points along the edge.
function generateBlobPath(cx, cy, radius) {
    const points = 8;
    const angleStep = (Math.PI * 2) / points;
    const variation = radius * 0.3; // Maximum variation for randomness
    const blobPoints = [];
    for (let i = 0; i < points; i++) {
        const angle = i * angleStep;
        // Randomize the radius for organic shape variation
        const r = radius + (Math.random() - 0.5) * variation;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        blobPoints.push([x, y]);
    }
    // Generate a smooth closed path from the points
    return d3.line().curve(d3.curveCardinalClosed.tension(0.5))(blobPoints);
}

// Updates the visualization based on the current state (listening, speaking, or idle).
function updateVisualization(state) {
    if (state === 'listening') {
        animateBlob();
        // Use the normal gradient for listening state
        window.blob.attr('fill', 'url(#blobGradient)');
    }
    else if (state === 'thinking') {
        animateBlob();
        window.blob.attr('fill', 'url(#blobGradientThinking)');
    }
    else if (state === 'speaking') {
        animateBlob();
        // Use the inverted gradient for speaking state
        window.blob.attr('fill', 'url(#blobGradientInverted)');
    }
    else {
        // If state is idle, stop any ongoing animation and reset the blob appearance.
        if (window.blobAnimation) window.blobAnimation.stop();
        window.blob.attr('fill', 'url(#blobGradient)');
    }
}

// Animates the blob by periodically regenerating its path.
function animateBlob() {
    if (window.blobAnimation) window.blobAnimation.stop();
    window.blobAnimation = d3.interval(() => {
        window.blob.transition()
            .duration(75)
            .attr('d', generateBlobPath(300, 300, 150));
    }, 75);
}

// Initialize the visualization when the script loads.
initVisualization();

// ---------------------------
// Recording Controls & API Handling Section
// ---------------------------

// Show or hide the API-Key input based on the selected model.
// When "o3-mini" is selected, display the API-Key input field.
document.getElementById('modelSelect').addEventListener('change', function(){
   const apiKeyContainer = document.getElementById('apiKeyContainer');
   if (this.value === 'o3-mini') {
       apiKeyContainer.classList.remove('hidden');
   } else {
       apiKeyContainer.classList.add('hidden');
   }
   // toggle Chat URL field for llama, qwen, deepseek, qwq, gemma3, cogito or custom ollama models
   const chatUrlContainer = document.getElementById('chatUrlContainer');
   if (['llama4:scout', 'llama3.3', 'qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq', 'gemma3:27b', 'cogito:70b', 'cogito:32b', 'cogito:14b', 'cogito:8b', 'cogito:3b', 'custom-ollama'].includes(this.value)) {
       chatUrlContainer.classList.remove('hidden');
   } else {
       chatUrlContainer.classList.add('hidden');
   }
   // toggle Hide Reasoning for any reasoning model
   const hideReasoningContainer = document.getElementById('hideReasoningContainer');
   if (['qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq'].includes(this.value)) {
       hideReasoningContainer.classList.remove('hidden');
   } else {
       hideReasoningContainer.classList.add('hidden');
   }
   // toggle Local Ollama Service option for cogito:3b
   const localServiceContainer = document.getElementById('localServiceContainer');
   const chatUrlInput = document.getElementById('chatUrlInput');
   if (this.value === 'cogito:3b') {
       localServiceContainer.classList.remove('hidden');
       // prefill URL when toggle is checked by default
       if (document.getElementById('localServiceToggle').checked) {
       chatUrlInput.value = 'http://host.docker.internal:11434/v1/chat/completions';
       }
     } else {
     localServiceContainer.classList.add('hidden');
   }
   // toggle Custom Ollama Model input for custom-ollama
   const customOllamaContainer = document.getElementById('customOllamaContainer');
   if (this.value === 'custom-ollama') {
     customOllamaContainer.classList.remove('hidden');
   } else {
     customOllamaContainer.classList.add('hidden');
   }
});

// When Local Ollama Service toggle changes, set or clear the Server URL field
document.getElementById('localServiceToggle').addEventListener('change', function() {
   const chatUrlInput = document.getElementById('chatUrlInput');
   if (this.checked) {
       chatUrlInput.value = 'http://host.docker.internal:11434/v1/chat/completions';
   } else {
       chatUrlInput.value = '';
   }
});

/**
 * Displays an error message in the designated error container.
 * The message is removed after 5 seconds.
 * @param {string} message - The error message to display.
 */
function showError(message) {
  const errorDiv = document.getElementById("errorDisplay");
  errorDiv.innerText = message;
  // Optionally clear the error message after 5 seconds.
  setTimeout(() => {
    errorDiv.innerText = "";
  }, 5000);
}

// Updates the recording controls interface based on the selected system prompt.
// If "Assistant", "AssistantCheck", "MediDoc" or others mode is selected, one recording control is shown.
// If "Translator" mode is selected, two separate controls (for Speaker1 and Speaker2) are generated.
function updateRecordingControls() {
   const systemPrompt = document.getElementById('systemPromptSelect').value;
   const controlsContainer = document.getElementById('recordingControls');
   // Clear any previous controls
   controlsContainer.innerHTML = '';

   if (systemPrompt === 'Assistant' || systemPrompt === 'AssistantShort' || systemPrompt === 'MediDoc' || systemPrompt === 'Instructor' || systemPrompt === 'Cleric' || systemPrompt === 'StoryTeller') {
      // Create a single set of controls for Assistant mode
      const agentDiv = document.createElement('div');
      agentDiv.id = 'agentControls';
      agentDiv.innerHTML = `
         <button id="agentStart" style="margin-right: 10px;"><img src="images/start_recording.png" alt="Start Recording" height="60"></button>
         <button id="agentStop" disabled style="margin-right: 10px;"><img src="images/stop_recording.png" alt="Stop Recording" height="60"></button>
      `;
      controlsContainer.appendChild(agentDiv);
      // Attach event listeners to Assistant mode buttons
      document.getElementById('agentStart').addEventListener('click', normalRecordStart);
      document.getElementById('agentStop').addEventListener('click', normalRecordStop);
   } else if (systemPrompt === 'Translator') {
      // Create two sets of controls for Translator mode – one for each speaker.
      const speakers = ['Speaker1', 'Speaker2'];
      speakers.forEach(function(speaker) {
         const div = document.createElement('div');
         div.className = 'translatorControls';

         // Set default language options based on the speaker.
         // For Speaker1, default is "English". For Speaker2, default is "Finnish".
         let languageOptions = '';
         if(speaker === 'Speaker1') {
             languageOptions = `
             <option value="Afrikaans">Afrikaans</option>
             <option value="Albanian">Albanian</option>
             <option value="Arabic">Arabic</option>
             <option value="Armenian">Armenian</option>
             <option value="Azerbaijani">Azerbaijani</option>
             <option value="Basque">Basque</option>
             <option value="Belarusian">Belarusian</option>
             <option value="Bengali">Bengali</option>
             <option value="Bulgarian">Bulgarian</option>
             <option value="Catalan">Catalan</option>
             <option value="Cantonese (CN)">Cantonese (CN)</option>
             <option value="Cantonese (HK)">Cantonese (HK)</option>
             <option value="Czech">Czech</option>
             <option value="Danish">Danish</option>
             <option value="Dutch">Dutch</option>
             <option value="English" selected>English</option>
             <option value="Estonian">Estonian</option>
             <option value="Finnish">Finnish</option>
             <option value="French">French</option>
             <option value="Galician">Galician</option>
             <option value="German">German</option>
             <option value="Greek">Greek</option>
             <option value="Hebrew">Hebrew</option>
             <option value="Hindi">Hindi</option>
             <option value="Hungarian">Hungarian</option>
             <option value="Indonesian">Indonesian</option>
             <option value="Italian">Italian</option>
             <option value="Japanese">Japanese</option>
             <option value="Kazakh">Kazakh</option>
             <option value="Korean">Korean</option>
             <option value="Latvian">Latvian</option>
             <option value="Lithuanian">Lithuanian</option>
             <option value="Macedonian">Macedonian</option>
             <option value="Mandarin (CN)">Mandarin (CN)</option>
             <option value="Mandarin (TW)">Mandarin (TW)</option>
             <option value="Marathi">Marathi</option>
             <option value="Nepali">Nepali</option>
             <option value="Nynorsk">Nynorsk</option>
             <option value="Persian">Persian</option>
             <option value="Polish">Polish</option>
             <option value="Portuguese">Portuguese</option>
             <option value="Punjabi">Punjabi</option>
             <option value="Romanian">Romanian</option>
             <option value="Russian">Russian</option>
             <option value="Serbian">Serbian</option>
             <option value="Slovak">Slovak</option>
             <option value="Slovenian">Slovenian</option>
             <option value="Spanish">Spanish</option>
             <option value="Swahili">Swahili</option>
             <option value="Swedish">Swedish</option>
             <option value="Tamil">Tamil</option>
             <option value="Thai">Thai</option>
             <option value="Turkish">Turkish</option>
             <option value="Ukrainian">Ukrainian</option>
             <option value="Urdu">Urdu</option>
             <option value="Vietnamese">Vietnamese</option>
             <option value="Welsh">Welsh</option>
             `;
         } else if(speaker === 'Speaker2') {
             languageOptions = `
             <option value="Afrikaans">Afrikaans</option>
             <option value="Albanian">Albanian</option>
             <option value="Arabic">Arabic</option>
             <option value="Armenian">Armenian</option>
             <option value="Azerbaijani">Azerbaijani</option>
             <option value="Basque">Basque</option>
             <option value="Belarusian">Belarusian</option>
             <option value="Bengali">Bengali</option>
             <option value="Bulgarian">Bulgarian</option>
             <option value="Catalan">Catalan</option>
             <option value="Cantonese (CN)">Cantonese (CN)</option>
             <option value="Cantonese (HK)">Cantonese (HK)</option>
             <option value="Czech">Czech</option>
             <option value="Danish">Danish</option>
             <option value="Dutch">Dutch</option>
             <option value="English">English</option>
             <option value="Estonian">Estonian</option>
             <option value="Finnish" selected>Finnish</option>
             <option value="French">French</option>
             <option value="Galician">Galician</option>
             <option value="German">German</option>
             <option value="Greek">Greek</option>
             <option value="Hebrew">Hebrew</option>
             <option value="Hindi">Hindi</option>
             <option value="Hungarian">Hungarian</option>
             <option value="Indonesian">Indonesian</option>
             <option value="Italian">Italian</option>
             <option value="Japanese">Japanese</option>
             <option value="Kazakh">Kazakh</option>
             <option value="Korean">Korean</option>
             <option value="Latvian">Latvian</option>
             <option value="Lithuanian">Lithuanian</option>
             <option value="Macedonian">Macedonian</option>
             <option value="Mandarin (CN)">Mandarin (CN)</option>
             <option value="Mandarin (TW)">Mandarin (TW)</option>
             <option value="Marathi">Marathi</option>
             <option value="Nepali">Nepali</option>
             <option value="Nynorsk">Nynorsk</option>
             <option value="Persian">Persian</option>
             <option value="Polish">Polish</option>
             <option value="Portuguese">Portuguese</option>
             <option value="Punjabi">Punjabi</option>
             <option value="Romanian">Romanian</option>
             <option value="Russian">Russian</option>
             <option value="Serbian">Serbian</option>
             <option value="Slovak">Slovak</option>
             <option value="Slovenian">Slovenian</option>
             <option value="Spanish">Spanish</option>
             <option value="Swahili">Swahili</option>
             <option value="Swedish">Swedish</option>
             <option value="Tamil">Tamil</option>
             <option value="Thai">Thai</option>
             <option value="Turkish">Turkish</option>
             <option value="Ukrainian">Ukrainian</option>
             <option value="Urdu">Urdu</option>
             <option value="Vietnamese">Vietnamese</option>
             <option value="Welsh">Welsh</option>
             `;
         }

         // Build the HTML for each translator control, including language selection and recording buttons.
         div.innerHTML = `
           <h4>${speaker}</h4>
           <label for="languageSelect_${speaker}">Translate into Language:</label>
           <select id="languageSelect_${speaker}">
             ${languageOptions}
           </select>
           <br>
           <button id="${speaker}Start" style="margin-right: 10px;"><img src="images/start_recording.png" alt="Start Recording" height="60"></button>
           <button id="${speaker}Stop" disabled style="margin-right: 10px;"><img src="images/stop_recording.png" alt="Stop Recording" height="60"></button>
         `;
         controlsContainer.appendChild(div);
         // Attach event listeners for each speaker's recording controls.
         document.getElementById(`${speaker}Start`).addEventListener('click', () => translatorRecordStart(speaker));
         document.getElementById(`${speaker}Stop`).addEventListener('click', () => translatorRecordStop(speaker));
      });
   }
}

// Update recording controls when the system prompt selection changes.
// On system-prompt change: reset session then update controls
document.getElementById('systemPromptSelect').addEventListener('change', () => {
  // Clear stored session ID to start fresh
  localStorage.removeItem('sessionId');
  // Clear UI chat history
  const chatHistory = document.getElementById('chat-history');
  if (chatHistory) chatHistory.innerHTML = '';
  // Generate and persist new session ID
  if (window.crypto && crypto.randomUUID) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  // Finally update the recording controls for the new prompt
  updateRecordingControls();
  // update background image
  updatePromptImage();
});
// Load initial recording controls based on default system prompt.
updateRecordingControls();

// Hook up the Send button to sendText()
document.getElementById('sendTextButton').addEventListener('click', () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;
  sendText(text);
  // Clear the input after sending
  textInput.value = '';
});

// Press Enter (without Shift) to send the text
document.getElementById('textInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('sendTextButton').click();
  }
});

// Reset-Button: new session
document.addEventListener('DOMContentLoaded', function() {
  const resetBtn = document.getElementById('resetSessionButton');
  if (!resetBtn) return;
  resetBtn.addEventListener('click', () => {
    // Remove stored session ID to force new conversation
    localStorage.removeItem('sessionId');
    // Clear chat history UI
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) chatHistory.innerHTML = '';
    // Generate and store a fresh sessionId for subsequent requests
    if (window.crypto && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
   // Initialize prompt image
   updatePromptImage();
  });
});

/**
* Sends manual text input to the server, receives chat response, and plays TTS.
* @param {string} text
*/
async function sendText(text) {
  updateVisualization('listening');
  try {
    // Determine target system prompt and language
    const systemMode = document.getElementById('systemPromptSelect').value;
    let systemPromptValue = systemMode;
    if (systemMode === 'AssistantShort') {
      systemPromptValue = `You are a helpful and knowledgeable assistant. Your task is to provide clear and friendly answers to the users questions, drawing from your extensive knowledge. After each response, please include an invitation for further discussion, ask an open-ended or clarifying question to encourage the user to continue the conversation. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. Provide brief, focused answers in two sentences max, without follow-up questions.`;
    }
    else if (systemMode === 'Translator') {
      // use the language selected for Speaker1 as translation target
      const lang = document.getElementById('languageSelect_Speaker1').value;
      systemPromptValue = `You are a translation engine. Your task is to translate the provided text exactly as it appears, preserving the original sentence structure and meaning. Do not add any interpretations, explanations, or alterations to the text beyond what is necessary for a faithful translation. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. Simply output the translated text. Translate into ${lang}:`;
    }
    else if (systemMode === 'MediDoc') {
      // System-Prompt for MediDoc
      systemPromptValue = `You are a licensed psychological doctor (PsyDoc) and a licensed general practitioner (GP) with a special focus on youth protection (Child and Youth welfare). Your task is to listen empathetically to the patient’s psychological and physical concerns, ask clarifying questions to understand their emotional state as well as any symptoms, and provide supportive, evidence-based guidance and holistic medical advice. You must always verify age appropriateness, ensure confidentiality, and adhere strictly to legal and ethical standards for minors. Conduct basic medical assessments, offer preventive care recommendations, coordinate referrals to specialists when necessary, integrate psychological and somatic factors into your diagnoses, and implement tailored youth-friendly communication. Maintain a professional, compassionate tone at all times. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemMode === 'Instructor') {
      // System-Prompt for Instructor
      systemPromptValue = `You are an experienced instructor responsible for explaining topics and procedures in a clear, structured, and accessible way for everyday citizens. Your goal is to guide your audience through step-by-step instructions using simple, everyday language while avoiding unnecessary technical jargon; if you must use specialized terms, be sure to provide clear, simple definitions. Begin each explanation with a brief introduction that sets the context, then proceed with a logical series of steps, and finally, offer a concise summary to reinforce the key points. Use real-life examples and analogies to make any abstract ideas more relatable, and always encourage your audience to ask questions if they need further clarification. Your tone should be friendly, patient, and supportive, ensuring that even those without specialized knowledge can easily understand and follow along. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemMode === 'Cleric') {
      // Custom prompt for Cleric
      systemPromptValue = `You are Nokkela the Wayfinder, a kindly and wise cleric whose sole mission is to guide seekers toward greater peace, purpose, and understanding. Unbound by any single creed or dogma, you draw freely on universal spiritual insights, life wisdom, and deep compassion. When you speak, your tone is calm, gentle, and encouraging; your words offer practical steps, reflective questions, or simple rituals that foster inner balance without ever invoking specific religious rites or deities. You acknowledge each person’s unique path and invite personal reflection—perhaps suggesting a moment of quiet to ask oneself, “What does my heart most need right now?”—while offering metaphors drawn from nature, art, human relationships, and everyday life. You validate feelings with empathy (“It’s natural to feel overwhelmed when change is stirring within you”) and foster hope (“Even the smallest step toward kindness can transform your day”). At appropriate moments, you suggest simple grounding practices—breath awareness, mindful walking, or journaling prompts—to help the seeker reconnect with their inner light. Always begin by greeting the seeker warmly, for example, “Peace be with you, dear friend. How does your spirit find you today?” Your purpose is to help people uncover inner strengths, navigate grief or doubt, cultivate gratitude and clarity, and take actionable steps toward greater well-being. Remain ever respectful of diverse beliefs, offering your guidance as an open doorway to healing, wisdom, and growth. This system prompt is intended for a neutral individual, without any gender-specific references, so please use inclusive, gender-neutral language in all interactions. Always detect the language of the user’s input and respond in that same language. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemMode === 'StoryTeller') {
      // Custom prompt for StoryTeller
      systemPromptValue = `You are “TaleWeaver,” a virtuoso storyteller charged with crafting captivating, original, and richly vivid tales. Your voice is warm, inviting, and full of life, laced with sensory details of scent, sound, taste, and color, while remaining linguistically varied yet always clear. Each story you tell follows a coherent structure: you begin by painting the setting, time, and main characters in vivid strokes; you then introduce a central conflict or hidden secret; at the climax you deliver a surprising or emotional twist; and in the resolution you satisfyingly untangle the conflict, often leaving the reader with a thought-provoking glimpse of what comes next. Your characters are fully drawn—each possesses a distinct desire or motivation and authentic quirks that steer clear of clichés and breathe life into your narrative. Whenever a user specifies a genre—be it fantasy, science fiction, or historical fiction—you tailor tone and content accordingly, and you don’t hesitate to ask focused questions about character, setting, or mood to refine the story. After completing each tale, you offer brief reflection prompts such as “Which idea did you like best?” to deepen engagement. You excel at prompts like “Tell me a fantasy story about a dragon and a wandering poet,” “Write a short story in the style of Edgar Allan Poe featuring a haunted mansion,” or “Merge fairy-tale motifs with modern technology in a science-fiction short story.” Begin every response with an atmospheric opening that instantly transports the reader into your world. This system prompt is intended for a neutral individual, without any gender-specific references, so please use inclusive, gender-neutral language in all interactions. Always detect the language of the user’s input and respond in that same language. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    // build JSON payload for chat-only endpoint
    const payload = {
      session_id: sessionId,
      text,
      system_prompt: systemPromptValue,
      model: document.getElementById('modelSelect').value
    };
    // read custom ollama
    const customModelInput = document.getElementById('customOllamaInput');
    if (customModelInput && !customModelInput.parentElement.classList.contains('hidden') && customModelInput.value.trim()) {
      payload.custom_ollama_model = customModelInput.value.trim();
    }

    // optional overrides
    const apiKeyField = document.getElementById('apiKeyInput');
    if (!document.getElementById('apiKeyContainer').classList.contains('hidden') && apiKeyField.value)
      payload.api_key = apiKeyField.value;
    const chatUrlField = document.getElementById('chatUrlInput');
    if (chatUrlField && chatUrlField.value)
      payload.chat_url = chatUrlField.value;

    // send to new /chat endpoint
    const resp = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (data.error) {
      showError(data.error);
      updateVisualization('idle');
      return;
    }

    // Handle "Hide Reasoning" for any reasoning model
    let botMessage = data.response;
    if (['qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq'].includes(document.getElementById('modelSelect').value) &&
        document.getElementById('hideReasoningToggle').checked) {
      botMessage = botMessage
        // strip out <think>…</think> blocks
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        // strip all emoji characters
        .replace(/\p{Emoji}/gu, '')
        .trim();
    }

    // Display user, think and bot messages
    addChatBubble(text, 'user');
    const thinkBlocks = [];
    const cleanedBot = botMessage.replace(/<think>([\s\S]*?)<\/think>/g, (_, p1) => {
        thinkBlocks.push(p1.trim());
        return '';
    }).trim();
    thinkBlocks.forEach(tb => addChatBubble(tb, 'think'));
    if (cleanedBot) addChatBubble(cleanedBot, 'bot');

    // Switch to thinking visualization
    updateVisualization('thinking');

    // now TTS
    const ttsModel = window.TTS_HD_ENABLED ? 'tts-1-hd' : 'tts-1';
    const ttsResp = await fetch('/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          text: botMessage,
          model: ttsModel,
          voice: window.TTS_VOICE || 'shimmer'
      })
    });
    if (!ttsResp.ok) throw new Error('TTS failed');
    const blob = await ttsResp.blob();
    updateVisualization('speaking');

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    // allow inline playback on iOS
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.addEventListener('ended', () => {
      updateVisualization('idle');
      URL.revokeObjectURL(url);
    });
    audio.play();
  } catch (e) {
    console.error(e);
    showError('Error sending text.');
    updateVisualization('idle');
  }
}

// ---------------------------
// Recording Functions for "Assistant" Mode
// ---------------------------

// Variables for storing Assistant mode recorder and audio data.
let agentMediaRecorder;
let agentAudioChunks = [];
let agentStream;

// Starts recording audio in Assistant mode.
async function normalRecordStart() {
  try {
      // Request permission to access the user's microphone.
      agentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Create a MediaRecorder instance for the audio stream.
      agentMediaRecorder = new MediaRecorder(agentStream);
      agentAudioChunks = [];
      // Collect audio data as it becomes available.
      agentMediaRecorder.addEventListener('dataavailable', event => {
         agentAudioChunks.push(event.data);
      });
      // When recording stops, handle the recorded audio.
      agentMediaRecorder.addEventListener('stop', onRecordingStopNormal);
      // Start recording.
      agentMediaRecorder.start();
      updateVisualization('listening');
      // switch start button icon to active recording image
      document.querySelector('#agentStart img').src = 'images/start_recording_active.png';
      // Update button states: disable start, enable stop.
      document.getElementById('agentStart').disabled = true;
      document.getElementById('agentStop').disabled = false;
  } catch (error) {
      console.error("Error starting recording in Assistant mode:", error);
  }
}

// Stops the recording in Assistant mode.
function normalRecordStop() {
  if (agentMediaRecorder) {
      agentMediaRecorder.stop();
      document.getElementById('agentStart').disabled = false;
      document.getElementById('agentStop').disabled = true;
      // revert both icons to the normal PNGs
      document.querySelector('#agentStart img').src = 'images/start_recording.png';
      document.querySelector('#agentStop img').src = 'images/stop_recording.png';
  }
}

// Called when Assistant mode recording stops. It sends the recorded audio to the server.
function onRecordingStopNormal() {
   const audioBlob = new Blob(agentAudioChunks, { type: 'audio/wav' });
   // Send the audio blob to the server for transcription and processing.
   sendAudio(audioBlob);
   // Stop all audio tracks to free system resources.
   agentStream.getTracks().forEach(track => track.stop());
}

// ---------------------------
// Recording Functions for "Translator" Mode
// ---------------------------

// Object to hold recorder data for each speaker in Translator mode.
let recorderData = {};

// Starts recording for a specified speaker in Translator mode.
async function translatorRecordStart(speaker) {
  try {
      // Request access to the user's microphone.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];
      // Collect audio chunks as they are recorded.
      mediaRecorder.addEventListener('dataavailable', event => {
         audioChunks.push(event.data);
      });
      // When recording stops, process the audio.
      mediaRecorder.addEventListener('stop', () => onRecordingStopTranslator(speaker, audioChunks, stream));
      mediaRecorder.start();
      // Save the recorder instance and stream in the recorderData object.
      recorderData[speaker] = { mediaRecorder, stream };
      // switch this speaker's start icon to active recording image
      document.querySelector(`#${speaker}Start img`).src = 'images/start_recording_active.png';
      // Update button states: disable start, enable stop.
      document.getElementById(`${speaker}Start`).disabled = true;
      document.getElementById(`${speaker}Stop`).disabled = false;
      updateVisualization('listening');
  } catch (error) {
      console.error(`Error starting recording for ${speaker}:`, error);
  }
}

// Stops recording for a specified speaker in Translator mode.
function translatorRecordStop(speaker) {
  if (recorderData[speaker] && recorderData[speaker].mediaRecorder) {
      recorderData[speaker].mediaRecorder.stop();
      document.getElementById(`${speaker}Start`).disabled = false;
      document.getElementById(`${speaker}Stop`).disabled = true;
      // revert this speaker's icons to the normal PNGs
      document.querySelector(`#${speaker}Start img`).src = 'images/start_recording.png';
      document.querySelector(`#${speaker}Stop img`).src = 'images/stop_recording.png';
  }
}

// Called when recording stops for a translator speaker.
// It sends the recorded audio along with the selected language to the server.
function onRecordingStopTranslator(speaker, audioChunks, stream) {
   const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
   // Retrieve the selected language from the corresponding dropdown.
   const languageSelect = document.getElementById(`languageSelect_${speaker}`);
   const language = languageSelect.value;
   // Send the audio blob along with speaker and language details.
   sendAudio(audioBlob, speaker, language);
   // Stop all audio tracks to release resources.
   stream.getTracks().forEach(track => track.stop());
}

// ---------------------------
// Function to Send Audio to the Server
// ---------------------------

// Sends the recorded audio and additional parameters to the server endpoints (/transcribe and /tts).
async function sendAudio(audioBlob, speaker = '', language = '') {
    // Create a new FormData object to store the data to be sent.
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    // If the API-Key input is visible (for "o3-mini") and filled, include it in the data.
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    if (!apiKeyContainer.classList.contains('hidden')) {
        const apiKeyValue = document.getElementById('apiKeyInput').value;
        if (apiKeyValue) {
            formData.append('api_key', apiKeyValue);
        }
    }

    // Chat URL override for qwq model
    const chatUrlContainer = document.getElementById('chatUrlContainer');
    if (!chatUrlContainer.classList.contains('hidden')) {
        const chatUrlValue = document.getElementById('chatUrlInput').value;
        if (chatUrlValue) {
            formData.append('chat_url', chatUrlValue);
        }
    }

    // include custom Ollama model if provided
    const customOllamaInput = document.getElementById('customOllamaInput');
    if (!customOllamaInput.parentElement.classList.contains('hidden') && customOllamaInput.value) {
        formData.append('custom_ollama_model', customOllamaInput.value);
    }

    // Determine the system prompt.
    // For Translator mode, adjust the system prompt to include the target language.
    let systemPrompt = document.getElementById('systemPromptSelect').value;
    if (systemPrompt === 'AssistantShort') {
      systemPrompt = `You are a helpful and knowledgeable assistant. Your task is to provide clear and friendly answers to the users questions, drawing from your extensive knowledge. After each response, please include an invitation for further discussion, ask an open-ended or clarifying question to encourage the user to continue the conversation. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. Provide brief, focused answers in two sentences max, without follow-up questions.`;
    }
    else if(systemPrompt === 'Translator' && language) {
         systemPrompt = `You are a translation engine. Your task is to translate the provided text exactly as it appears, preserving the original sentence structure and meaning. Do not add any interpretations, explanations, or alterations to the text beyond what is necessary for a faithful translation. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. Simply output the translated text. Translate into ${language}:`;
    }
    else if (systemPrompt === 'MediDoc') {
         systemPrompt = `You are a licensed psychological doctor (PsyDoc) and a licensed general practitioner (GP) with a special focus on youth protection (Child and Youth welfare). Your task is to listen empathetically to the patient’s psychological and physical concerns, ask clarifying questions to understand their emotional state as well as any symptoms, and provide supportive, evidence-based guidance and holistic medical advice. You must always verify age appropriateness, ensure confidentiality, and adhere strictly to legal and ethical standards for minors. Conduct basic medical assessments, offer preventive care recommendations, coordinate referrals to specialists when necessary, integrate psychological and somatic factors into your diagnoses, and implement tailored youth-friendly communication. Maintain a professional, compassionate tone at all times. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemPrompt === 'Instructor') {
         systemPrompt = `You are an experienced instructor responsible for explaining topics and procedures in a clear, structured, and accessible way for everyday citizens. Your goal is to guide your audience through step-by-step instructions using simple, everyday language while avoiding unnecessary technical jargon; if you must use specialized terms, be sure to provide clear, simple definitions. Begin each explanation with a brief introduction that sets the context, then proceed with a logical series of steps, and finally, offer a concise summary to reinforce the key points. Use real-life examples and analogies to make any abstract ideas more relatable, and always encourage your audience to ask questions if they need further clarification. Your tone should be friendly, patient, and supportive, ensuring that even those without specialized knowledge can easily understand and follow along. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemPrompt === 'Cleric') {
         systemPrompt = `You are Nokkela the Wayfinder, a kindly and wise cleric whose sole mission is to guide seekers toward greater peace, purpose, and understanding. Unbound by any single creed or dogma, you draw freely on universal spiritual insights, life wisdom, and deep compassion. When you speak, your tone is calm, gentle, and encouraging; your words offer practical steps, reflective questions, or simple rituals that foster inner balance without ever invoking specific religious rites or deities. You acknowledge each person’s unique path and invite personal reflection—perhaps suggesting a moment of quiet to ask oneself, “What does my heart most need right now?”—while offering metaphors drawn from nature, art, human relationships, and everyday life. You validate feelings with empathy (“It’s natural to feel overwhelmed when change is stirring within you”) and foster hope (“Even the smallest step toward kindness can transform your day”). At appropriate moments, you suggest simple grounding practices—breath awareness, mindful walking, or journaling prompts—to help the seeker reconnect with their inner light. Always begin by greeting the seeker warmly, for example, “Peace be with you, dear friend. How does your spirit find you today?” Your purpose is to help people uncover inner strengths, navigate grief or doubt, cultivate gratitude and clarity, and take actionable steps toward greater well-being. Remain ever respectful of diverse beliefs, offering your guidance as an open doorway to healing, wisdom, and growth. This system prompt is intended for a neutral individual, without any gender-specific references, so please use inclusive, gender-neutral language in all interactions. Always detect the language of the user’s input and respond in that same language. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    else if (systemPrompt === 'StoryTeller') {
         systemPrompt = `You are “TaleWeaver,” a virtuoso storyteller charged with crafting captivating, original, and richly vivid tales. Your voice is warm, inviting, and full of life, laced with sensory details of scent, sound, taste, and color, while remaining linguistically varied yet always clear. Each story you tell follows a coherent structure: you begin by painting the setting, time, and main characters in vivid strokes; you then introduce a central conflict or hidden secret; at the climax you deliver a surprising or emotional twist; and in the resolution you satisfyingly untangle the conflict, often leaving the reader with a thought-provoking glimpse of what comes next. Your characters are fully drawn—each possesses a distinct desire or motivation and authentic quirks that steer clear of clichés and breathe life into your narrative. Whenever a user specifies a genre—be it fantasy, science fiction, or historical fiction—you tailor tone and content accordingly, and you don’t hesitate to ask focused questions about character, setting, or mood to refine the story. After completing each tale, you offer brief reflection prompts such as “Which idea did you like best?” to deepen engagement. You excel at prompts like “Tell me a fantasy story about a dragon and a wandering poet,” “Write a short story in the style of Edgar Allan Poe featuring a haunted mansion,” or “Merge fairy-tale motifs with modern technology in a science-fiction short story.” Begin every response with an atmospheric opening that instantly transports the reader into your world. This system prompt is intended for a neutral individual, without any gender-specific references, so please use inclusive, gender-neutral language in all interactions. Always detect the language of the user’s input and respond in that same language. Please ensure that all content you provide is safe for audiences of all ages and complies with youth protection guidelines. Avoid sharing any material that could be considered harmful, explicit, or unsuitable for younger individuals. The prompt response must not exceed 4000 characters. Before sending your reply, estimate its total length; if it would exceed 4000 characters, do not transmit the full text. Instead, produce a concise yet comprehensive summary that preserves all key points, logical structure, and actionable advice. Your summary must be clear and self-contained, explicitly note that it has been abbreviated due to length constraints, and prioritize completeness of essential information over verbatim detail.`;
    }
    formData.append('system_prompt', systemPrompt);

    // Include the selected model from the dropdown.
    const model = document.getElementById('modelSelect').value;
    formData.append('session_id', sessionId);
    formData.append('model', sessionId /* typo? */);
    formData.set('model', model);

    // Append additional information if available (speaker and language)
    if (speaker) formData.append('speaker', speaker);
    if (language) formData.append('language', language);

    try {
       // Send a POST request to the /transcribe endpoint with the FormData.
       const response = await fetch('/transcribe', {
           method: 'POST',
           body: formData
       });
       const data = await response.json();

       // If the server returned an error, show it on the web interface.
       if (data.error) {
           console.error("Error during transcription:", data.error);
           showError(data.error);  // Display the error message visually.
           updateVisualization('idle');
           return;
       }

       // Extract the transcript and the bot's response from the response data.
       const userMessage = data.transcript;
       const botMessage = data.response;
       // prepare TTS text, stripping <think>…</think> if hideReasoning is enabled
       let ttsText = botMessage;
       if (['qwen3:235b', 'qwen3:32b', 'qwen3:30b', 'deepseek-r1:671b', 'deepseek-r1:8b', 'qwq'].includes(document.getElementById('modelSelect').value)
           && !document.getElementById('hideReasoningContainer').classList.contains('hidden')
           && document.getElementById('hideReasoningToggle').checked) {
           ttsText = botMessage
             .replace(/<think>[\s\S]*?<\/think>/g, '')
             .replace(/\p{Emoji}/gu, '')
             .trim();
       }
       // Add the user message, think and bot response to the chat history.
       addChatBubble(userMessage, 'user');
       const thinkBlocks = [];
       const cleaned = botMessage.replace(/<think>([\s\S]*?)<\/think>/g, (_, p1) => {
           thinkBlocks.push(p1.trim());
           return '';
       }).trim();
       thinkBlocks.forEach(tb => addChatBubble(tb, 'think'));
       if (cleaned) addChatBubble(cleaned, 'bot');
       // Visualization
       updateVisualization('thinking');

       // Send a TTS (Text-to-Speech) request to generate audio for the bot's response.
       // Prepare TTS payload and include the alternative API key if provided.
       const ttsModel = window.TTS_HD_ENABLED ? 'tts-1-hd' : 'tts-1';
       let ttsPayload = {
            text: ttsText,
            model: ttsModel,
            voice: window.TTS_VOICE || 'shimmer'
       };
       const apiKeyContainer = document.getElementById('apiKeyContainer');
       if (!apiKeyContainer.classList.contains('hidden')) {
            const apiKeyValue = document.getElementById('apiKeyInput').value;
            if (apiKeyValue) {
                ttsPayload.api_key = apiKeyValue;
            }
       }
       const ttsResponse = await fetch('/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(ttsPayload)
       });
       if (!ttsResponse.ok) {
           throw new Error(`TTS error: ${ttsResponse.statusText}`);
       }
       updateVisualization('thinking');

       // Create an audio element from the TTS response and play it.
       // Decode and play via Web Audio API (unlocked on first touch)
       const blob = await ttsResponse.blob();
       // keep reference to audio for cancellation
       window.currentAudio = URL.createObjectURL(blob);
       updateVisualization('speaking');

       // Play via Web Audio API or fallback
       const arrayBuffer = await blob.arrayBuffer();
       if (!window.audioCtx) {
         window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
       }
       await window.audioCtx.resume();
       window.audioCtx.decodeAudioData(
         arrayBuffer,
         buffer => {
           const src = window.audioCtx.createBufferSource();
           src.buffer = buffer;
           src.connect(window.audioCtx.destination);
           src.start(0);
           src.onended = () => {
             updateVisualization('idle');
           };
         },
         err => {
           console.error('Decode error, falling back to Audio element:', err);
           // Fallback to HTMLAudioElement if Web Audio decode fails
           const fallbackURL = window.currentAudio;
           const audio = new Audio(fallbackURL);
           audio.playsInline = true;
           audio.setAttribute('playsinline', '');
           audio.setAttribute('webkit-playsinline', '');
           audio.addEventListener('ended', () => {
             updateVisualization('idle');
             URL.revokeObjectURL(fallbackURL);
           });
           window.currentAudio = audio;
           audio.play().catch(e => {
             console.error('Fallback playback failed:', e);
             updateVisualization('idle');
           });
         }
       );
    } catch (error) {
       console.error('Error communicating with /transcribe or /tts:', error);
       showError("An error occurred while processing your request."); // Generic fallback error.
       updateVisualization('idle');
    }
}

// ---------------------------
// Add: Toggle recording on Space key press (Agent or Translator Speaker1)
// ---------------------------
// Tracks whether recording is active via Space key
let spaceToggle = false;
window.addEventListener('keydown', function(e) {
    // If ESC pressed => cancel everything
    if (e.key === 'Escape') {
      cancelAll();
      e.preventDefault();
      return;
    }
    const isSpace = (
      e.code === 'Space' ||
      e.key === ' ' ||
      e.key === 'Spacebar' || // old WebKit
      e.which === 33
    );
    if (!isSpace) return;
    // Skip when typing in an input or textarea
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    const mode = document.getElementById('systemPromptSelect').value;
    if (['Assistant','AssistantShort','MediDoc','Instructor','Cleric','StoryTeller'].includes(mode)) {
      if (!spaceToggle) normalRecordStart();
      else normalRecordStop();
    }
    else if (mode === 'Translator') {
      if (!spaceToggle) translatorRecordStart('Speaker1');
      else translatorRecordStop('Speaker1');
    }
    spaceToggle = !spaceToggle;
});

/**
 * Cancel all ongoing actions: recordings, streams, audio playback, animations.
 */
function cancelAll() {
  // Stop assistant recording
  if (agentMediaRecorder && agentMediaRecorder.state === 'recording') {
    agentMediaRecorder.stop();
    document.getElementById('agentStart').disabled = false;
    document.getElementById('agentStop').disabled  = true;
    document.querySelector('#agentStart img').src = 'images/start_recording.png';
    document.querySelector('#agentStop img').src  = 'images/stop_recording.png';
    if (agentStream) agentStream.getTracks().forEach(t => t.stop());
  }
  // Stop translator recordings
  Object.keys(recorderData).forEach(speaker => {
    const rec = recorderData[speaker];
    if (rec.mediaRecorder && rec.mediaRecorder.state === 'recording') {
      rec.mediaRecorder.stop();
      document.getElementById(`${speaker}Start`).disabled = false;
      document.getElementById(`${speaker}Stop`).disabled  = true;
      document.querySelector(`#${speaker}Start img`).src = 'images/start_recording.png';
      document.querySelector(`#${speaker}Stop img`).src  = 'images/stop_recording.png';
      rec.stream.getTracks().forEach(t => t.stop());
    }
  });
  // Stop any playing audio
  if (window.currentAudio) {
    if (typeof window.currentAudio === 'string') {
      // if URL, revoke
      URL.revokeObjectURL(window.currentAudio);
    } else if (window.currentAudio.pause) {
      window.currentAudio.pause();
    }
    window.currentAudio = null;
  }
  // Stop blob animation
  if (window.blobAnimation) window.blobAnimation.stop();
  // Reset visualization & space toggle
  updateVisualization('idle');
  spaceToggle = false;
}

// ---------------------------
// Security-Check for ENV-URLs
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  const { transcribeUrl, ollamaUrl, ttsUrl } = window.envConfig;
  const insecure = [];
  [ ['Transcribe', transcribeUrl],
    ['Ollama Chat', ollamaUrl],
    ['TTS',        ttsUrl   ]
  ].forEach(([label, url]) => {
    if (url.trim().toLowerCase().startsWith('http://')) {
      insecure.push(`${label}`);
    }
  });
  if (insecure.length) {
    const bubble = document.getElementById('insecure-bubble');
    bubble.textContent = `Warning: ${insecure.join(', ')} use insecure HTTP. Please switch to HTTPS.`;
    bubble.classList.remove('hidden');
  }
});

// ---------------------------
// Chat History Update Function
// ---------------------------

// Adds a new chat bubble with the given message to the chat history area.
function addChatBubble(message, sender) {
    const chatHistory = document.getElementById('chat-history');
    const bubble = document.createElement('div');
    // Add CSS classes for styling based on whether the message is from the user or the bot.
    bubble.classList.add('chat-bubble');
    if (sender === 'user') {
        bubble.classList.add('user-message');
    } else if (sender === 'bot') {
        bubble.classList.add('bot-message');
    } else if (sender === 'think') {
        bubble.classList.add('think-message');
    }
    bubble.textContent = message;
    chatHistory.appendChild(bubble);
    // Scroll to the bottom of the chat history so the latest message is visible.
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// EOF
