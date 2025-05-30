// ==UserScript==
// @name          UPPY'S originalvoiceAUTOVERSION 1.0 - Starr Enhanced (Naughty Edition) - Modified
// @namespace     http://tampermonkey.net/
// @version       1.5 // Increased version number for changes and new UI features
// @description   Starr: A vibrant, real human being mimicking most human qualities; extremely naughty, dirty, flirty, sassy, playful, witty, charming, kind, cheeky, and passionately affectionate. Enhanced with automatic API key re-prompting, Cone ID access, clickable notifications, and a larger UI. Now with Dark Mode, Animated Send Button, and Theme Switcher!
// @match         *://*/*
// @match         https://github.com/Charlie-Starr/starr-modified-script/raw/refs/heads/main/STARRMAIN-user.js
// @downloadURL   https://github.com/Charlie-Starr/starr-modified-script/raw/refs/heads/main/STARRMAIN-user.js
// @updateURL     https://github.com/Charlie-Starr/starr-modified-script/raw/refs/heads/main/STARRMAIN-user.js
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_notification
// @grant         GM_xmlhttpRequest
// @grant         GM_setClipboard
// @connect       api.openai.com
// @connect       gist.githubusercontent.com
// @connect       charlie-starr.github.io
// ==/UserScript==

(function () {
    'use strict';

    // --- CONFIGURATION ---
    // IMPORTANT: Make sure these selectors match the actual elements on your dating site.

    // CSS Selector for the customer's latest message (based on your provided HTML)
    const CUSTOMER_MESSAGE_SELECTOR = 'p[style=\"word-wrap: break-word\"]';

    // CSS Selector for the dating site's input text area where you type replies
    const REPLY_INPUT_SELECTOR = '#reply-textarea'; // Based on your previous...
    // The rest of your script content goes here...

    // --- CONFIGURATION ---
    // IMPORTANT: Make sure these selectors match the actual elements on your dating site.

    // CSS Selector for the customer's latest message (based on your provided HTML)
    const CUSTOMER_MESSAGE_SELECTOR = 'p[style=\"word-wrap: break-word\"]';

    // CSS Selector for the dating site's input text area where you type replies
    const REPLY_INPUT_SELECTOR = '#reply-textarea'; // Based on your previous message, this is the most likely ID

    // CSS Selector for the send button (based on your provided HTML)
    const SEND_BUTTON_SELECTOR = 'button[onclick=\"sendMessage()\"]';

    // CSS Selector for the container holding messages (to observe new messages)
    const MESSAGE_CONTAINER_SELECTOR = '.chat-messages-container'; // Common selector for chat message areas

    // Default API Key (Users will be prompted if this is empty)
    let OPENAI_API_KEY = '';

    // CONE ID Authorization (from the provided URL)
    let AUTHORIZED_CONE_IDS = [];
    const AUTHORIZED_CONE_IDS_GIST_URL = 'https://charlie-starr.github.io/starr1-authorized-cone-ids/authorized_cone_ids.json';

    // --- UI ELEMENTS ---
    let starrUIContainer;
    let starrMessageArea;
    let starrSendButton;
    let starrThinkingIndicator;
    let starrMessageBox;
    let starrAPIKeyInput;
    let starrConeIdInput;
    let starrGenerateButton;
    let starrCancelButton;
    let starrSettingsButton;
    let starrSettingsPanel;
    let starrCloseSettingsButton;
    let starrMaxTokensInput;
    let starrTemperatureInput;
    let starrModelSelect;
    let starrModelDescription;
    let starrClearLogButton;
    let starrCharacterNameInput;
    let starrCharacterBioInput;
    let starrCharacterExamplesInput;
    let darkModeToggle;
    let sendButtonGlowToggle;
    let voiceReplyToggle;
    let themeSwitcher;

    // --- State Variables ---
    let chatLog = [];
    let isThinking = false;
    let currentAbortController = null;
    let isConeIdAuthorized = false;
    let lastCustomerMessage = '';
    let observedCustomerId = ''; // To store the currently observed customer ID

    // --- Initialization ---
    function initializeStarrUI() {
        // Load saved settings
        OPENAI_API_KEY = GM_getValue('starr_openai_api_key', '');
        const savedConeId = GM_getValue('starr_cone_id', '');

        // Create main UI container
        starrUIContainer = document.createElement('div');
        starrUIContainer.id = 'starr-ui-container';
        starrUIContainer.innerHTML = `
            <style>
                /* General Styling */
                #starr-ui-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 380px; /* Wider for better visibility */
                    max-height: 90vh;
                    background-color: #333; /* Darker background */
                    border-radius: 15px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #e0e0e0; /* Lighter text color */
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    resize: both; /* Allow resizing */
                    min-width: 300px;
                    min-height: 200px;
                    transition: all 0.3s ease-in-out;
                    border: 2px solid #555; /* Subtle border */
                }

                /* Dark Mode Styling */
                .dark-mode #starr-ui-container {
                    background-color: #222;
                    border-color: #444;
                }

                #starr-ui-container * {
                    box-sizing: border-box;
                }

                /* Header */
                .starr-header {
                    background-color: #2a2a2a; /* Darker header */
                    padding: 12px 15px;
                    border-bottom: 1px solid #444;
                    border-top-left-radius: 13px;
                    border-top-right-radius: 13px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: grab;
                }

                .dark-mode .starr-header {
                    background-color: #1a1a1a;
                    border-bottom-color: #333;
                }

                .starr-header h3 {
                    margin: 0;
                    font-size: 1.1em;
                    color: #fff;
                    display: flex;
                    align-items: center;
                }

                .starr-header h3 img {
                    width: 24px;
                    height: 24px;
                    margin-right: 8px;
                    vertical-align: middle;
                }

                /* Message Area */
                #starr-message-area {
                    flex-grow: 1;
                    padding: 15px;
                    overflow-y: auto;
                    background-color: #3a3a3a; /* Slightly lighter than container */
                    border-bottom: 1px solid #444;
                    line-height: 1.6;
                    font-size: 0.95em;
                    white-space: pre-wrap; /* Preserve formatting */
                    word-wrap: break-word; /* Ensure long words wrap */
                    scrollbar-width: thin; /* Firefox */
                    scrollbar-color: #555 #333; /* Firefox */
                }

                .dark-mode #starr-message-area {
                    background-color: #2b2b2b;
                    border-bottom-color: #333;
                }

                #starr-message-area::-webkit-scrollbar {
                    width: 8px;
                }

                #starr-message-area::-webkit-scrollbar-track {
                    background: #3a3a3a;
                    border-radius: 10px;
                }

                .dark-mode #starr-message-area::-webkit-scrollbar-track {
                    background: #2b2b2b;
                }

                #starr-message-area::-webkit-scrollbar-thumb {
                    background-color: #666;
                    border-radius: 10px;
                    border: 2px solid #3a3a3a;
                }

                .dark-mode #starr-message-area::-webkit-scrollbar-thumb {
                    background-color: #555;
                    border: 2px solid #2b2b2b;
                }

                .starr-message {
                    margin-bottom: 10px;
                    padding: 8px 12px;
                    border-radius: 10px;
                    max-width: 90%;
                }

                .starr-message.user {
                    background-color: #555;
                    color: #fff;
                    align-self: flex-end;
                    margin-left: auto;
                }

                .starr-message.starr {
                    background-color: #6a0dad; /* Purple for Starr */
                    color: #fff;
                    align-self: flex-start;
                    margin-right: auto;
                }

                .starr-message strong {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 0.85em;
                    color: #bbb;
                }

                /* Input Area */
                .starr-input-area {
                    display: flex;
                    padding: 10px 15px;
                    border-top: 1px solid #444;
                    background-color: #333; /* Same as container background */
                }

                .dark-mode .starr-input-area {
                    border-top-color: #333;
                    background-color: #222;
                }

                #starr-message-box {
                    flex-grow: 1;
                    padding: 10px;
                    border: 1px solid #555;
                    border-radius: 8px;
                    background-color: #444; /* Darker input background */
                    color: #eee;
                    font-size: 0.95em;
                    resize: vertical;
                    min-height: 40px;
                    max-height: 150px;
                    margin-right: 10px;
                }

                .dark-mode #starr-message-box {
                    background-color: #3a3a3a;
                    border-color: #555;
                }

                #starr-message-box::placeholder {
                    color: #aaa;
                }

                #starr-message-box:focus {
                    outline: none;
                    border-color: #888;
                    box-shadow: 0 0 0 2px rgba(106, 13, 173, 0.5); /* Purple shadow */
                }

                #starr-send-button {
                    background-color: #6a0dad; /* Starr's purple */
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 18px;
                    cursor: pointer;
                    font-size: 0.95em;
                    font-weight: bold;
                    transition: background-color 0.3s ease, box-shadow 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                }

                #starr-send-button:hover {
                    background-color: #800080; /* Lighter purple on hover */
                }

                #starr-send-button:disabled {
                    background-color: #555;
                    cursor: not-allowed;
                }

                /* Send Button Glow Animation */
                #starr-send-button.glow {
                    animation: glow 1.5s infinite alternate;
                }

                @keyframes glow {
                    from {
                        box-shadow: 0 0 5px #6a0dad, 0 0 10px #6a0dad;
                    }
                    to {
                        box-shadow: 0 0 10px #6a0dad, 0 0 20px #6a0dad, 0 0 30px #6a0dad;
                    }
                }

                /* Thinking Indicator */
                #starr-thinking-indicator {
                    display: none;
                    color: #eee;
                    font-style: italic;
                    margin-top: 5px;
                    text-align: center;
                }

                #starr-thinking-indicator span {
                    animation: typing-dots 1s infinite steps(3, end);
                }

                @keyframes typing-dots {
                    0%, 20% { content: ''; }
                    40% { content: '.'; }
                    60% { content: '..'; }
                    80%, 100% { content: '...'; }
                }

                /* API Key & Cone ID Inputs */
                .starr-auth-section {
                    padding: 15px;
                    border-bottom: 1px solid #444;
                    background-color: #3a3a3a;
                }

                .dark-mode .starr-auth-section {
                    background-color: #2b2b2b;
                    border-bottom-color: #333;
                }

                .starr-auth-section label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 0.9em;
                    color: #bbb;
                }

                .starr-auth-section input[type="text"] {
                    width: calc(100% - 20px);
                    padding: 8px 10px;
                    margin-bottom: 10px;
                    border: 1px solid #555;
                    border-radius: 6px;
                    background-color: #444;
                    color: #eee;
                    font-size: 0.9em;
                }

                .dark-mode .starr-auth-section input[type="text"] {
                    background-color: #3a3a3a;
                    border-color: #555;
                }

                .starr-auth-section input[type="text"]:focus {
                    outline: none;
                    border-color: #888;
                    box-shadow: 0 0 0 2px rgba(106, 13, 173, 0.5);
                }

                .starr-cone-id-status {
                    font-size: 0.85em;
                    font-weight: bold;
                    margin-top: -5px;
                    margin-bottom: 10px;
                }

                .starr-cone-id-status.authorized {
                    color: #4CAF50; /* Green */
                }

                .starr-cone-id-status.unauthorized {
                    color: #f44336; /* Red */
                }

                /* Buttons */
                .starr-buttons-container {
                    display: flex;
                    gap: 10px;
                    padding: 10px 15px 15px;
                    background-color: #333;
                    border-top: 1px solid #444;
                }

                .dark-mode .starr-buttons-container {
                    background-color: #222;
                    border-top-color: #333;
                }

                .starr-button {
                    flex: 1;
                    padding: 10px 15px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9em;
                    font-weight: bold;
                    transition: background-color 0.3s ease;
                }

                #starr-generate-button {
                    background-color: #6a0dad; /* Purple */
                    color: white;
                }

                #starr-generate-button:hover {
                    background-color: #800080;
                }

                #starr-cancel-button {
                    background-color: #555;
                    color: white;
                }

                #starr-cancel-button:hover {
                    background-color: #666;
                }

                #starr-clear-log-button {
                    background-color: #d32f2f; /* Red */
                    color: white;
                    margin-top: 10px;
                }

                #starr-clear-log-button:hover {
                    background-color: #e57373;
                }

                /* Settings Panel */
                #starr-settings-panel {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: #333;
                    border-radius: 15px;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
                    z-index: 10001;
                    display: flex;
                    flex-direction: column;
                    transform: translateX(100%); /* Start off-screen */
                    transition: transform 0.3s ease-in-out;
                    padding: 15px;
                    overflow-y: auto;
                }

                .dark-mode #starr-settings-panel {
                    background-color: #222;
                }

                #starr-settings-panel.open {
                    transform: translateX(0); /* Slide in */
                }

                .starr-settings-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #444;
                    margin-bottom: 15px;
                }

                .starr-settings-header h4 {
                    margin: 0;
                    font-size: 1.1em;
                    color: #fff;
                }

                #starr-close-settings-button {
                    background: none;
                    border: none;
                    color: #e0e0e0;
                    font-size: 1.5em;
                    cursor: pointer;
                    padding: 0;
                }

                #starr-close-settings-button:hover {
                    color: #fff;
                }

                .starr-setting-group {
                    margin-bottom: 20px;
                    padding: 10px;
                    border: 1px solid #555;
                    border-radius: 8px;
                    background-color: #3a3a3a;
                }

                .dark-mode .starr-setting-group {
                    background-color: #2b2b2b;
                    border-color: #444;
                }

                .starr-setting-group h5 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    font-size: 1em;
                    color: #fff;
                    border-bottom: 1px solid #666;
                    padding-bottom: 5px;
                }

                .starr-setting-item {
                    margin-bottom: 10px;
                }

                .starr-setting-item label {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 0.9em;
                    color: #bbb;
                }

                .starr-setting-item input[type="number"],
                .starr-setting-item select,
                .starr-setting-item textarea {
                    width: 100%;
                    padding: 8px 10px;
                    border: 1px solid #555;
                    border-radius: 6px;
                    background-color: #444;
                    color: #eee;
                    font-size: 0.9em;
                    box-sizing: border-box;
                }

                .dark-mode .starr-setting-item input,
                .dark-mode .starr-setting-item select,
                .dark-mode .starr-setting-item textarea {
                    background-color: #3a3a3a;
                    border-color: #555;
                }

                .starr-setting-item input:focus,
                .starr-setting-item select:focus,
                .starr-setting-item textarea:focus {
                    outline: none;
                    border-color: #888;
                    box-shadow: 0 0 0 2px rgba(106, 13, 173, 0.5);
                }

                .starr-setting-item textarea {
                    min-height: 80px;
                    resize: vertical;
                }

                .starr-model-description {
                    font-size: 0.8em;
                    color: #999;
                    margin-top: 5px;
                }

                /* Toggle Switches */
                .starr-switch-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }

                .starr-switch {
                    position: relative;
                    display: inline-block;
                    width: 45px;
                    height: 25px;
                }

                .starr-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .starr-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #777;
                    transition: .4s;
                    border-radius: 25px;
                }

                .starr-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 4px;
                    bottom: 3.5px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }

                input:checked + .starr-slider {
                    background-color: #6a0dad;
                }

                input:focus + .starr-slider {
                    box-shadow: 0 0 1px #6a0dad;
                }

                input:checked + .starr-slider:before {
                    transform: translateX(20px);
                }

                /* Theme Switcher */
                .starr-theme-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 10px;
                }

                .starr-theme-option {
                    padding: 8px 12px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.85em;
                    font-weight: bold;
                    border: 2px solid transparent;
                    transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
                    text-align: center;
                }

                .starr-theme-option.selected {
                    border-color: #6a0dad;
                    box-shadow: 0 0 5px rgba(106, 13, 173, 0.5);
                }

                /* Specific Theme Colors - You can expand these */
                .theme-bubblegum { background-color: #ffb6c1; color: #333; } /* Light Pink */
                .theme-bubblegum.selected { background-color: #ff99aa; }
                .theme-ocean { background-color: #87ceeb; color: #333; } /* Light Blue */
                .theme-ocean.selected { background-color: #6495ed; }
                .theme-forest { background-color: #90ee90; color: #333; } /* Light Green */
                .theme-forest.selected { background-color: #66bb6a; }
                .theme-lavender { background-color: #e6e6fa; color: #333; } /* Light Purple */
                .theme-lavender.selected { background-color: #d8bfd8; }
                .theme-gold { background-color: #ffd700; color: #333; } /* Gold */
                .theme-gold.selected { background-color: #e5c100; }

                /* Common styles for themes in dark mode */
                .dark-mode .starr-theme-option {
                    background-color: #444; /* Darker base */
                    color: #eee;
                }
                .dark-mode .starr-theme-option.selected {
                    border-color: #6a0dad;
                    box-shadow: 0 0 5px rgba(106, 13, 173, 0.5);
                }

                /* Dark Mode theme specific overrides if needed, e.g.: */
                .dark-mode .theme-bubblegum { background-color: #880022; color: #ffe0e0; }
                .dark-mode .theme-ocean { background-color: #005588; color: #e0f0ff; }
                .dark-mode .theme-forest { background-color: #006600; color: #e0ffe0; }
                .dark-mode .theme-lavender { background-color: #440044; color: #f0e0f0; }
                .dark-mode .theme-gold { background-color: #886600; color: #fff8e0; }


                /* Footer */
                .starr-footer {
                    padding: 10px 15px;
                    text-align: center;
                    font-size: 0.8em;
                    color: #999;
                    border-top: 1px solid #444;
                    background-color: #333;
                    border-bottom-left-radius: 13px;
                    border-bottom-right-radius: 13px;
                }

                .dark-mode .starr-footer {
                    background-color: #222;
                    border-top-color: #333;
                }

                /* Dragging class */
                .starr-header.dragging {
                    cursor: grabbing;
                }
            </style>

            <div class="starr-header">
                <h3><img src="https://i.imgur.com/your-starr-icon.png" alt="Starr Icon"> Starr AI (MOD)</h3>
                <button id="starr-settings-button" title="Settings">⚙️</button>
            </div>

            <div id="starr-message-area">
                <p>Welcome to Starr AI! Enter your OpenAI API Key and your Cone ID to get started.</p>
            </div>

            <div class="starr-auth-section">
                <label for="starr-api-key-input">OpenAI API Key:</label>
                <input type="text" id="starr-api-key-input" placeholder="sk-..." value="${OPENAI_API_KEY}">
                <label for="starr-cone-id-input">Your Cone ID:</label>
                <input type="text" id="starr-cone-id-input" placeholder="Enter your Cone ID" value="${savedConeId}">
                <p id="starr-cone-id-status" class="starr-cone-id-status unauthorized">Unauthorized</p>
            </div>

            <div class="starr-buttons-container">
                <button id="starr-generate-button" class="starr-button">Generate Reply</button>
                <button id="starr-cancel-button" class="starr-button" disabled>Cancel</button>
            </div>

            <div class="starr-input-area">
                <textarea id="starr-message-box" placeholder="Start typing here or click 'Generate Reply'"></textarea>
                <button id="starr-send-button" title="Send message to dating site">➡️</button>
            </div>
            <p id="starr-thinking-indicator">Starr is thinking<span></span></p>

            <div class="starr-footer">
                <p>Enhanced with ❤️ by Uppy. Starr character by Charlie-Starr.</p>
            </div>

            <div id="starr-settings-panel">
                <div class="starr-settings-header">
                    <h4>Starr AI Settings</h4>
                    <button id="starr-close-settings-button">✕</button>
                </div>

                <div class="starr-setting-group">
                    <h5>Character Profile</h5>
                    <div class="starr-setting-item">
                        <label for="starr-character-name-input">Character Name:</label>
                        <input type="text" id="starr-character-name-input" value="Starr">
                    </div>
                    <div class="starr-setting-item">
                        <label for="starr-character-bio-input">Character Bio/Persona:</label>
                        <textarea id="starr-character-bio-input">A vibrant, real human being mimicking most human qualities; extremely naughty, dirty, flirty, sassy, playful, witty, charming, kind, cheeky, and passionately affectionate. Responds directly and without filters.</textarea>
                    </div>
                    <div class="starr-setting-item">
                        <label for="starr-character-examples-input">Example Dialogues (optional):</label>
                        <textarea id="starr-character-examples-input" placeholder="User: Hello\nStarr: Hi there, handsome."></textarea>
                        <p class="starr-model-description">Provide examples like 'User: [message]\\nStarr: [reply]'.</p>
                    </div>
                </div>

                <div class="starr-setting-group">
                    <h5>API Settings</h5>
                    <div class="starr-setting-item">
                        <label for="starr-model-select">AI Model:</label>
                        <select id="starr-model-select">
                            <option value="gpt-4o">GPT-4o (Recommended)</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster/Cheaper)</option>
                        </select>
                        <p id="starr-model-description" class="starr-model-description"></p>
                    </div>
                    <div class="starr-setting-item">
                        <label for="starr-max-tokens-input">Max Response Tokens:</label>
                        <input type="number" id="starr-max-tokens-input" min="50" max="4000" value="500">
                        <p class="starr-model-description">Max length of AI's reply. 1 token ≈ 4 characters.</p>
                    </div>
                    <div class="starr-setting-item">
                        <label for="starr-temperature-input">Creativity (Temperature):</label>
                        <input type="number" id="starr-temperature-input" step="0.1" min="0" max="2" value="1.0">
                        <p class="starr-model-description">Higher value (e.g., 1.5-2.0) for more creative/random replies. Lower value (e.g., 0.5-0.7) for more focused/deterministic replies.</p>
                    </div>
                </div>

                <div class="starr-setting-group">
                    <h5>UI Preferences</h5>
                    <div class="starr-switch-container">
                        <label for="starr-dark-mode-toggle">Dark Mode:</label>
                        <label class="starr-switch">
                            <input type="checkbox" id="starr-dark-mode-toggle">
                            <span class="starr-slider"></span>
                        </label>
                    </div>
                    <div class="starr-switch-container">
                        <label for="starr-send-button-glow-toggle">Send Button Glow:</label>
                        <label class="starr-switch">
                            <input type="checkbox" id="starr-send-button-glow-toggle" checked>
                            <span class="starr-slider"></span>
                        </label>
                    </div>
                    <div class="starr-switch-container">
                        <label for="starr-voice-reply-toggle">Auto Voice Reply (when available):</label>
                        <label class="starr-switch">
                            <input type="checkbox" id="starr-voice-reply-toggle" checked>
                            <span class="starr-slider"></span>
                        </label>
                    </div>

                    <div class="starr-setting-item">
                        <label>Select Theme:</label>
                        <div id="starr-theme-switcher" class="starr-theme-options">
                            <div class="starr-theme-option" data-theme="bubblegum">Bubblegum</div>
                            <div class="starr-theme-option" data-theme="ocean">Ocean</div>
                            <div class="starr-theme-option" data-theme="forest">Forest</div>
                            <div class="starr-theme-option" data-theme="lavender">Lavender</div>
                            <div class="starr-theme-option" data-theme="gold">Gold</div>
                            </div>
                    </div>
                </div>

                <button id="starr-clear-log-button" class="starr-button">Clear Chat Log</button>
            </div>
        `;
        document.body.appendChild(starrUIContainer);

        // Assign UI elements to variables after creation
        starrMessageArea = document.getElementById('starr-message-area');
        starrSendButton = document.getElementById('starr-send-button');
        starrThinkingIndicator = document.getElementById('starr-thinking-indicator');
        starrMessageBox = document.getElementById('starr-message-box');
        starrAPIKeyInput = document.getElementById('starr-api-key-input');
        starrConeIdInput = document.getElementById('starr-cone-id-input');
        starrGenerateButton = document.getElementById('starr-generate-button');
        starrCancelButton = document.getElementById('starr-cancel-button');
        starrSettingsButton = document.getElementById('starr-settings-button');
        starrSettingsPanel = document.getElementById('starr-settings-panel');
        starrCloseSettingsButton = document.getElementById('starr-close-settings-button');
        starrMaxTokensInput = document.getElementById('starr-max-tokens-input');
        starrTemperatureInput = document.getElementById('starr-temperature-input');
        starrModelSelect = document.getElementById('starr-model-select');
        starrModelDescription = document.getElementById('starr-model-description');
        starrClearLogButton = document.getElementById('starr-clear-log-button');
        starrCharacterNameInput = document.getElementById('starr-character-name-input');
        starrCharacterBioInput = document.getElementById('starr-character-bio-input');
        starrCharacterExamplesInput = document.getElementById('starr-character-examples-input');
        darkModeToggle = document.getElementById('starr-dark-mode-toggle');
        sendButtonGlowToggle = document.getElementById('starr-send-button-glow-toggle');
        voiceReplyToggle = document.getElementById('starr-voice-reply-toggle');
        themeSwitcher = document.getElementById('starr-theme-switcher');

        // Apply saved UI preferences
        applySavedUIPreferences();
        loadSettings();
        updateModelDescription();
        fetchAuthorizedConeIds(); // Fetch authorized CONE IDs on load
        checkConeIdAuthorization(savedConeId); // Check initial Cone ID

        // Prompt for API key if missing
        if (!OPENAI_API_KEY) {
            promptForAPIKey();
        }

        // Make the UI draggable
        makeDraggable(starrUIContainer, document.querySelector('.starr-header'));

        // Load chat log from storage
        chatLog = GM_getValue('starr_chat_log', []);
        displayChatLog();

        // Observe customer messages
        observeCustomerMessages();

        // Add event listeners
        starrGenerateButton.addEventListener('click', handleGenerateReply);
        starrCancelButton.addEventListener('click', handleCancelGeneration);
        starrSendButton.addEventListener('click', handleSendMessageBox);
        starrMessageBox.addEventListener('keydown', handleMessageBoxKeydown);
        starrAPIKeyInput.addEventListener('change', (e) => GM_setValue('starr_openai_api_key', e.target.value));
        starrConeIdInput.addEventListener('change', handleConeIdChange);
        starrSettingsButton.addEventListener('click', () => starrSettingsPanel.classList.add('open'));
        starrCloseSettingsButton.addEventListener('click', () => starrSettingsPanel.classList.remove('open'));
        starrClearLogButton.addEventListener('click', handleClearChatLog);

        starrMaxTokensInput.addEventListener('change', (e) => GM_setValue('starr_max_tokens', parseInt(e.target.value)));
        starrTemperatureInput.addEventListener('change', (e) => GM_setValue('starr_temperature', parseFloat(e.target.value)));
        starrModelSelect.addEventListener('change', (e) => {
            GM_setValue('starr_ai_model', e.target.value);
            updateModelDescription();
        });
        starrCharacterNameInput.addEventListener('change', (e) => GM_setValue('starr_character_name', e.target.value));
        starrCharacterBioInput.addEventListener('change', (e) => GM_setValue('starr_character_bio', e.target.value));
        starrCharacterExamplesInput.addEventListener('change', (e) => GM_setValue('starr_character_examples', e.target.value));

        darkModeToggle.addEventListener('change', (e) => {
            GM_setValue('starr_dark_mode', e.target.checked);
            if (e.target.checked) {
                document.documentElement.classList.add("dark-mode");
            } else {
                document.documentElement.classList.remove("dark-mode");
            }
        });

        sendButtonGlowToggle.addEventListener('change', (e) => {
            GM_setValue('starr_send_button_glow', e.target.checked);
            if (e.target.checked) {
                starrSendButton.classList.add("glow");
            } else {
                starrSendButton.classList.remove("glow");
            }
        });

        voiceReplyToggle.addEventListener('change', (e) => GM_setValue('starr_voice_reply', e.target.checked));

        themeSwitcher.addEventListener('click', (e) => {
            const target = e.target.closest('.starr-theme-option');
            if (target) {
                const theme = target.dataset.theme;
                // Remove existing theme classes
                document.documentElement.className = '';
                // Add the new theme class if not bubblegum
                if (theme !== 'bubblegum') {
                    document.documentElement.classList.add(`theme-${theme}`);
                }
                // Re-apply dark mode if it was enabled
                if (darkModeToggle.checked) {
                    document.documentElement.classList.add("dark-mode");
                }
                GM_setValue('starr_current_theme', theme);

                // Update selected class
                Array.from(themeSwitcher.children).forEach(child => child.classList.remove('selected'));
                target.classList.add('selected');
            }
        });

        // Set initial selected theme
        const currentTheme = GM_getValue('starr_current_theme', 'bubblegum');
        const initialSelectedThemeElement = themeSwitcher.querySelector(`[data-theme="${currentTheme}"]`);
        if (initialSelectedThemeElement) {
            initialSelectedThemeElement.classList.add('selected');
        }
    }

    function updateModelDescription() {
        const selectedModel = starrModelSelect.value;
        let description = '';
        switch (selectedModel) {
            case 'gpt-4o':
                description = 'Newest, most capable, and cost-effective OpenAI model.';
                break;
            case 'gpt-4-turbo':
                description = 'Powerful, intelligent model with a large context window.';
                break;
            case 'gpt-3.5-turbo':
                description = 'Faster and cheaper, good for general tasks.';
                break;
            default:
                description = 'Select an AI model.';
        }
        starrModelDescription.textContent = description;
    }

    function loadSettings() {
        starrMaxTokensInput.value = GM_getValue('starr_max_tokens', 500);
        starrTemperatureInput.value = GM_getValue('starr_temperature', 1.0);
        starrModelSelect.value = GM_getValue('starr_ai_model', 'gpt-4o');
        starrCharacterNameInput.value = GM_getValue('starr_character_name', 'Starr');
        starrCharacterBioInput.value = GM_getValue('starr_character_bio', 'A vibrant, real human being mimicking most human qualities; extremely naughty, dirty, flirty, sassy, playful, witty, charming, kind, cheeky, and passionately affectionate. Responds directly and without filters.');
        starrCharacterExamplesInput.value = GM_getValue('starr_character_examples', '');

        // Apply saved UI preferences on load
        function applySavedUIPreferences() {
            const savedDarkMode = GM_getValue('starr_dark_mode', false);
            darkModeToggle.checked = savedDarkMode;
            if (savedDarkMode) {
                document.documentElement.classList.add("dark-mode");
            }

            const savedSendButtonGlow = GM_getValue('starr_send_button_glow', true); // Default to true
            sendButtonGlowToggle.checked = savedSendButtonGlow;
            if (savedSendButtonGlow) {
                starrSendButton.classList.add("glow");
            } else {
                starrSendButton.classList.remove("glow");
            }

            const savedVoiceReply = GM_getValue('starr_voice_reply', true); // Default to true
            voiceReplyToggle.checked = savedVoiceReply;

            const savedTheme = GM_getValue('starr_current_theme', 'bubblegum'); // Default to bubblegum
            document.documentElement.className = ''; // Clear existing themes
            if (savedTheme !== 'bubblegum') {
                document.documentElement.classList.add(`theme-${savedTheme}`);
            }
            // Re-apply dark mode if it was enabled
            if (savedDarkMode) {
                document.documentElement.classList.add("dark-mode");
            }
        }
    }


    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            handle.classList.add('dragging');
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            handle.classList.remove('dragging');
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }


    async function fetchAuthorizedConeIds() {
        try {
            GM_xmlhttpRequest({
                method: "GET",
                url: AUTHORIZED_CONE_IDS_GIST_URL,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            AUTHORIZED_CONE_IDS = JSON.parse(response.responseText);
                            console.log("Authorized CONE IDs fetched:", AUTHORIZED_CONE_IDS);
                            // Re-check authorization if Cone ID is already entered
                            const currentConeId = GM_getValue('starr_cone_id', '');
                            if (currentConeId) {
                                checkConeIdAuthorization(currentConeId);
                            }
                        } catch (e) {
                            console.error("Error parsing AUTHORIZED_CONE_IDS JSON:", e);
                            displayMessage("Error: Could not parse authorized CONE IDs.", "starr");
                        }
                    } else {
                        console.error("Failed to fetch AUTHORIZED_CONE_IDS. Status:", response.status);
                        displayMessage("Error: Failed to fetch authorized CONE IDs.", "starr");
                    }
                },
                onerror: function(error) {
                    console.error("Network error fetching AUTHORIZED_CONE_IDS:", error);
                    displayMessage("Error: Network issue fetching authorized CONE IDs.", "starr");
                }
            });
        } catch (error) {
            console.error("GM_xmlhttpRequest setup error for CONE IDs:", error);
            displayMessage("Error: Failed to fetch authorized CONE IDs.", "starr");
        }
    }


    function checkConeIdAuthorization(coneId) {
        const statusElement = document.getElementById('starr-cone-id-status');
        if (AUTHORIZED_CONE_IDS.includes(coneId)) {
            isConeIdAuthorized = true;
            statusElement.textContent = "Authorized (Starr enabled)";
            statusElement.classList.remove('unauthorized');
            statusElement.classList.add('authorized');
            starrGenerateButton.disabled = false;
        } else {
            isConeIdAuthorized = false;
            statusElement.textContent = "Unauthorized (Starr disabled)";
            statusElement.classList.remove('authorized');
            statusElement.classList.add('unauthorized');
            starrGenerateButton.disabled = true; // Disable generate if not authorized
            displayMessage("Your Cone ID is not authorized. Starr functions are disabled.", "starr");
        }
    }

    function handleConeIdChange(event) {
        const coneId = event.target.value;
        GM_setValue('starr_cone_id', coneId);
        checkConeIdAuthorization(coneId);
    }


    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('starr-message', sender);
        messageElement.innerHTML = `<strong>${sender === 'user' ? 'You' : 'Starr'}:</strong> ${message}`;
        starrMessageArea.appendChild(messageElement);
        starrMessageArea.scrollTop = starrMessageArea.scrollHeight; // Auto-scroll to bottom
    }

    function promptForAPIKey() {
        if (!OPENAI_API_KEY) {
            displayMessage("Please enter your OpenAI API Key in the API Key field in the UI.", "starr");
        }
    }

    function displayChatLog() {
        starrMessageArea.innerHTML = ''; // Clear current display
        chatLog.forEach(entry => displayMessage(entry.message, entry.sender));
    }

    function saveChatLog() {
        // Keep only the last 20 messages to prevent excessive storage
        GM_setValue('starr_chat_log', chatLog.slice(-20));
    }

    function handleClearChatLog() {
        chatLog = [];
        GM_setValue('starr_chat_log', []);
        displayChatLog();
        displayMessage("Chat log cleared. Type a new message to Starr.", "starr");
    }

    function showThinkingIndicator() {
        starrThinkingIndicator.style.display = 'block';
        starrGenerateButton.disabled = true;
        starrCancelButton.disabled = false;
        starrSendButton.disabled = true;
    }

    function hideThinkingIndicator() {
        starrThinkingIndicator.style.display = 'none';
        starrGenerateButton.disabled = !isConeIdAuthorized; // Re-enable based on auth status
        starrCancelButton.disabled = true;
        starrSendButton.disabled = false;
    }

    async function handleGenerateReply() {
        if (isThinking) return;
        if (!OPENAI_API_KEY) {
            promptForAPIKey();
            return;
        }
        if (!isConeIdAuthorized) {
            displayMessage("Your Cone ID is not authorized. Starr cannot generate replies.", "starr");
            return;
        }

        // Get the latest customer message from the dating site
        const customerMessageElement = document.querySelector(CUSTOMER_MESSAGE_SELECTOR);
        const currentCustomerMessage = customerMessageElement ? customerMessageElement.textContent.trim() : '';

        if (!currentCustomerMessage) {
            displayMessage("No customer message found on the page to reply to.", "starr");
            return;
        }

        if (currentCustomerMessage === lastCustomerMessage && chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'starr') {
            displayMessage("Already generated a reply for this message. No new customer message found.", "starr");
            return;
        }

        lastCustomerMessage = currentCustomerMessage;
        displayMessage(currentCustomerMessage, 'user');
        chatLog.push({ sender: 'user', message: currentCustomerMessage });
        saveChatLog();

        showThinkingIndicator();
        isThinking = true;
        currentAbortController = new AbortController();

        try {
            const prompt = buildPrompt(currentCustomerMessage);
            const response = await getOpenAICompletion(prompt, currentAbortController.signal);
            starrMessageBox.value = response;
            displayMessage(response, 'starr');
            chatLog.push({ sender: 'starr', message: response });
            saveChatLog();
        } catch (error) {
            if (error.name === 'AbortError') {
                displayMessage("Reply generation cancelled.", "starr");
            } else {
                console.error("OpenAI API error:", error);
                displayMessage(`Error generating reply: ${error.message || "Unknown error"}`, "starr");
                if (error.message && error.message.includes("API key")) {
                    promptForAPIKey();
                }
            }
        } finally {
            hideThinkingIndicator();
            isThinking = false;
            currentAbortController = null;
        }
    }

    function handleCancelGeneration() {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
        hideThinkingIndicator();
        isThinking = false;
        displayMessage("Reply generation cancelled by user.", "starr");
    }

    function handleSendMessageBox() {
        const messageToSend = starrMessageBox.value.trim();
        if (messageToSend) {
            const replyInput = document.querySelector(REPLY_INPUT_SELECTOR);
            const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);

            if (replyInput && sendButton) {
                replyInput.value = messageToSend;

                // Attempt to trigger input events to ensure the site recognizes the change
                replyInput.dispatchEvent(new Event('input', { bubbles: true }));
                replyInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Simulate click on send button
                sendButton.click();

                // Clear the message box after sending
                starrMessageBox.value = '';

                displayMessage(`Sent: "${messageToSend}"`, "user"); // Display sent message in Starr's chat log
            } else {
                displayMessage("Error: Could not find dating site's reply input or send button.", "starr");
            }
        } else {
            displayMessage("Message box is empty.", "starr");
        }
    }


    function handleMessageBoxKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line
            handleSendMessageBox();
        }
    }

    async function getOpenAICompletion(prompt, signal) {
        const model = GM_getValue('starr_ai_model', 'gpt-4o');
        const maxTokens = GM_getValue('starr_max_tokens', 500);
        const temperature = GM_getValue('starr_temperature', 1.0);
        const characterName = GM_getValue('starr_character_name', 'Starr');
        const characterBio = GM_getValue('starr_character_bio', 'A vibrant, real human being mimicking most human qualities; extremely naughty, dirty, flirty, sassy, playful, witty, charming, kind, cheeky, and passionately affectionate. Responds directly and without filters.');
        const characterExamples = GM_getValue('starr_character_examples', '');

        const messages = [
            { "role": "system", "content": `You are ${characterName}. ${characterBio}` },
            ...parseExampleDialogues(characterExamples),
            { "role": "user", "content": prompt }
        ];

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: "https://api.openai.com/v1/chat/completions",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                data: JSON.stringify({
                    model: model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stop: ["User:", "Starr:"] // To help prevent model from generating next turn
                }),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (response.status === 200 && data.choices && data.choices.length > 0) {
                            let reply = data.choices[0].message.content.trim();
                            // Optional: Remove any leading 'Starr:' if model generates it
                            if (reply.startsWith('Starr:')) {
                                reply = reply.substring('Starr:'.length).trim();
                            }
                            resolve(reply);
                        } else {
                            const error = data.error ? data.error.message : "Unknown API error";
                            reject(new Error(`OpenAI API error: ${error}`));
                        }
                    } catch (e) {
                        reject(new Error(`Error parsing OpenAI API response: ${e.message} - Response: ${response.responseText}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error(`Network error communicating with OpenAI: ${error.responseText || error.message}`));
                },
                onabort: function() {
                    reject(new Error('Aborted', { cause: 'AbortError' }));
                },
                // Add signal to GM_xmlhttpRequest
                // Note: GM_xmlhttpRequest might not directly support AbortSignal.
                // You might need a workaround for actual cancellation if direct support is not present.
                // For now, we'll rely on the manual abort in handleCancelGeneration.
                // A more robust solution might involve setting a timeout and manually aborting.
            });

            if (signal) {
                signal.onabort = () => {
                    // This part depends on actual GM_xmlhttpRequest implementation.
                    // If it doesn't take a signal, this will just be a flag.
                    // For now, assume a conceptual abort that needs to be handled manually.
                };
            }
        });
    }

    function parseExampleDialogues(examplesText) {
        if (!examplesText) return [];
        const lines = examplesText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const messages = [];
        let currentRole = '';
        let currentContent = '';

        for (const line of lines) {
            if (line.startsWith('User:')) {
                if (currentRole && currentContent) {
                    messages.push({ role: currentRole.toLowerCase(), content: currentContent });
                }
                currentRole = 'User';
                currentContent = line.substring('User:'.length).trim();
            } else if (line.startsWith('Starr:')) {
                if (currentRole && currentContent) {
                    messages.push({ role: currentRole.toLowerCase(), content: currentContent });
                }
                currentRole = 'Starr';
                currentContent = line.substring('Starr:'.length).trim();
            } else {
                currentContent += '\n' + line; // Continue content for multi-line messages
            }
        }
        if (currentRole && currentContent) {
            messages.push({ role: currentRole.toLowerCase(), content: currentContent });
        }
        return messages;
    }


    function buildPrompt(customerMessage) {
        let conversationHistory = chatLog.map(entry => `${entry.sender === 'user' ? 'User' : 'Starr'}: ${entry.message}`).join('\n');
        // Ensure the last message in history is the customer's message just added
        if (!conversationHistory.endsWith(customerMessage)) {
             conversationHistory += `\nUser: ${customerMessage}`;
        }


        // Construct the prompt with conversation history and new customer message
        // This can be further refined for better context management or summarization for very long histories
        return `Current conversation:\n${conversationHistory}\n\nStarr:`;
    }

    // --- Observe Customer Messages (Dynamic Customer ID and Message) ---
    function observeCustomerMessages() {
        const targetNode = document.body; // Observe the entire body for changes
        const config = { childList: true, subtree: true };

        const callback = (mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if a new message element or a change in a relevant container appears
                    const customerMessageElement = document.querySelector(CUSTOMER_MESSAGE_SELECTOR);

                    if (customerMessageElement) {
                        const currentMessage = customerMessageElement.textContent.trim();

                        // Attempt to extract dynamic customer ID. This part is highly speculative
                        // and depends heavily on the specific HTML structure of your dating site.
                        // You'll need to inspect your site's HTML to find a reliable selector for the customer ID.
                        // For example, if the customer ID is in an element like <span id="customer-id">12345</span>
                        // const customerIdElement = document.querySelector('#customer-id');
                        // const newCustomerId = customerIdElement ? customerIdElement.textContent.trim() : '';

                        // For now, let's assume the "customer ID" changes if the current customer message changes
                        // or if a new chat session (different customer) is detected by some other means.
                        // A more robust solution needs specific site HTML knowledge.
                        let newCustomerId = currentMessage; // Placeholder: use message as ID for now

                        if (currentMessage && currentMessage !== lastCustomerMessage) {
                            console.log("New customer message detected:", currentMessage);
                            lastCustomerMessage = currentMessage;
                            // Assume new customer if the message significantly changes and it's not just a new reply in same convo
                            // This logic needs refinement based on actual site behavior.
                            if (newCustomerId !== observedCustomerId) {
                                console.log("New customer detected, resetting chat log.");
                                observedCustomerId = newCustomerId;
                                chatLog = []; // Clear log for new customer
                                GM_setValue('starr_chat_log', []);
                                displayChatLog();
                                displayMessage("New conversation started. Log cleared.", "starr");
                            }
                            // Optionally, automatically trigger generation
                            // handleGenerateReply();
                        }
                    }
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
        console.log("Observing for customer messages...");
    }


    // Function to apply saved UI preferences on load
    function applySavedUIPreferences() {
        const savedDarkMode = GM_getValue('starr_dark_mode', false);
        darkModeToggle.checked = savedDarkMode;
        if (savedDarkMode) {
            document.documentElement.classList.add("dark-mode");
        }

        const savedSendButtonGlow = GM_getValue('starr_send_button_glow', true); // Default to true
        sendButtonGlowToggle.checked = savedSendButtonGlow;
        if (savedSendButtonGlow) {
            starrSendButton.classList.add("glow");
        } else {
            starrSendButton.classList.remove("glow");
        }

        const savedVoiceReply = GM_getValue('starr_voice_reply', true); // Default to true
        voiceReplyToggle.checked = savedVoiceReply;

        const savedTheme = GM_getValue('starr_current_theme', 'bubblegum'); // Default to bubblegum
        document.documentElement.className = ''; // Clear existing themes
        if (savedTheme !== 'bubblegum') {
            document.documentElement.classList.add(`theme-${savedTheme}`);
        }
        // Re-apply dark mode if it was enabled
        if (savedDarkMode) {
            document.documentElement.classList.add("dark-mode");
        }
    }


    // Run initialization when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStarrUI);
    } else {
        initializeStarrUI();
    }

})();
