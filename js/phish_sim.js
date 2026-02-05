const API_URL = "https://oculus-eight.vercel.app"; // Production URL

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const typing = document.getElementById('typing-indicator');
const sendBtn = document.getElementById('send-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const tryAgainFailBtn = document.getElementById('try-again-fail-btn');
const startBtn = document.getElementById('start-sim-btn');
const loadingText = document.getElementById('loading-text');

let history = [];
let currentSystemPrompt = "";

// START SIMULATION
if (startBtn) {
    startBtn.addEventListener('click', async () => {
        startBtn.style.display = 'none';
        loadingText.style.display = 'block';

        try {
            // Request new scenario from AI
            const res = await fetch(`${API_URL}/api/ai/chat/start`, { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                // Apply Scenario
                document.querySelector('.status').textContent = `LIVE SCENARIO: ${data.scenario_title}`;
                currentSystemPrompt = data.system_instruction;

                // Hide Overlay
                document.getElementById('start-overlay').style.display = 'none';

                // Initial Message
                addMessage("bot", data.opening_line);
            } else {
                alert("Failed to generate scenario. Try again.");
                loadingText.style.display = 'none';
                startBtn.style.display = 'block';
            }
        } catch (e) {
            console.error(e);
            alert("Connection Error. Is the backend running?");
            loadingText.style.display = 'none';
            startBtn.style.display = 'block';
        }
    });
}

// Event Listeners
if (userInput) {
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
}

if (sendBtn) sendBtn.addEventListener("click", sendMessage);
if (playAgainBtn) playAgainBtn.addEventListener("click", () => location.reload());
if (tryAgainFailBtn) tryAgainFailBtn.addEventListener("click", () => location.reload());

function addMessage(sender, text) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage("user", text);
    userInput.value = "";
    history.push({ role: "user", content: text });

    if (typing) typing.style.display = "block";

    try {
        // Call API
        const response = await fetch(`${API_URL}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: history,
                systemPrompt: currentSystemPrompt // Send strict context
            })
        });

        const data = await response.json();
        if (typing) typing.style.display = "none";

        if (data.reply) {
            addMessage("bot", data.reply);
            history.push({ role: "assistant", content: data.reply });

            // Check for Win Condition
            if (data.reply.includes("TRAINING COMPLETE") || data.reply.includes("caught me")) {
                setTimeout(() => {
                    const overlay = document.getElementById('win-overlay');
                    if (overlay) overlay.style.display = 'flex';
                }, 1000);
            }
            // Check for Fail Condition
            else if (data.reply.includes("SIMULATION FAILED") || data.reply.includes("SCAMMED")) {
                setTimeout(() => {
                    const overlay = document.getElementById('fail-overlay');
                    if (overlay) overlay.style.display = 'flex';
                }, 1000);
            }

        } else {
            addMessage("bot", "[Connection Error] The scammer disconnected.");
        }

    } catch (error) {
        if (typing) typing.style.display = "none";
        addMessage("bot", "Error connecting to AI Server.");
        console.error(error);
    }
}

// --- DOMAIN DOJO LOGIC ---
const navChat = document.getElementById('nav-chat');
const navDomain = document.getElementById('nav-domain');
const chatArea = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input-area');
const domainArea = document.getElementById('domain-dojo');

const domainInput = document.getElementById('domain-input');
const analyzeBtn = document.getElementById('analyze-btn');

// Tab Switching
if (navChat && navDomain) {
    navChat.addEventListener('click', () => {
        navChat.classList.add('active');
        navChat.style.background = '#238636';
        navChat.style.color = 'white';

        navDomain.classList.remove('active');
        navDomain.style.background = 'transparent';
        navDomain.style.color = '#8b949e';

        chatArea.style.display = 'block';
        chatInput.style.display = 'flex';
        domainArea.style.display = 'none';

        // Restore Overlay if needed
        if (history.length === 0 && document.getElementById('start-overlay').style.display === 'none') {
            // keep hidden
        }
    });

    navDomain.addEventListener('click', () => {
        navDomain.classList.add('active');
        navDomain.style.background = '#238636';
        navDomain.style.color = 'white';

        navChat.classList.remove('active');
        navChat.style.background = 'transparent';
        navChat.style.color = '#8b949e';

        chatArea.style.display = 'none';
        chatInput.style.display = 'none';
        domainArea.style.display = 'block';

        // Hide Start Overlay temporarily if open to see tool
        document.getElementById('start-overlay').style.display = 'none';
    });
}

// Domain Analysis
if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
        const url = domainInput.value.trim();
        if (!url) return;

        // Show Loading
        document.getElementById('ai-analysis-text').textContent = "Running heuristic & AI scan...";
        document.getElementById('domain-result').style.display = 'block';

        // 1. Calculate Entropy
        const entropy = calculateEntropy(url);
        document.getElementById('entropy-score').textContent = entropy.toFixed(2);

        // 2. Check Typosquatting
        const typos = checkTyposquat(url);
        const typoEl = document.getElementById('typo-detected');
        if (typos) {
            typoEl.textContent = "YES";
            typoEl.style.color = "#ef4444";
        } else {
            typoEl.textContent = "No";
            typoEl.style.color = "#4ade80";
        }

        // 3. AI Analysis
        try {
            const prompt = `Analyze this URL for phishing risk: "${url}". Be technical. Mention if it looks like a fake login or safe. Keep it under 30 words.`;

            const response = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    history: [],
                    systemPrompt: "You are a Cyber Forensic Analyst. Analyze the URLs provided. Be concise."
                })
            });
            const data = await response.json();
            if (data.reply) {
                document.getElementById('ai-analysis-text').textContent = data.reply;
            }
        } catch (e) {
            document.getElementById('ai-analysis-text').textContent = "AI Analysis Failed (Offline).";
        }
    });
}

function calculateEntropy(str) {
    const len = str.length;
    const frequencies = {};
    for (let i = 0; i < len; i++) {
        const char = str[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in frequencies) {
        const p = frequencies[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function checkTyposquat(url) {
    const targets = ['google', 'amazon', 'facebook', 'twitter', 'apple', 'microsoft'];
    const clean = url.replace(/https?:\/\//, '').replace('www.', '');

    for (let t of targets) {
        if (clean.includes(t) && !clean.startsWith(t + '.')) return true;
    }
    return false;
}
