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

// --- TABS & MODES LOGIC ---
const navChat = document.getElementById('nav-chat');
const navTraining = document.getElementById('nav-training');
const navDomain = document.getElementById('nav-domain');

const chatArea = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input-area');
const trainingArea = document.getElementById('training-dojo');
const domainArea = document.getElementById('domain-dojo');

const domainInput = document.getElementById('domain-input');
const analyzeBtn = document.getElementById('analyze-btn');

function switchTab(tab) {
    // Reset all
    [navChat, navTraining, navDomain].forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = '#8b949e';
        }
    });

    [chatArea, chatInput, trainingArea, domainArea].forEach(el => {
        if (el) el.style.display = 'none';

        // Chat elements are flex/block specific
        if (el === chatInput && tab === 'chat') el.style.display = 'flex';
        if (el === chatArea && tab === 'chat') el.style.display = 'block';
    });

    // Activate specific
    if (tab === 'chat') {
        navChat.classList.add('active');
        navChat.style.background = '#238636'; navChat.style.color = 'white';
        chatArea.style.display = 'block';
        chatInput.style.display = 'flex';
    }
    else if (tab === 'training') {
        if (navTraining) {
            navTraining.classList.add('active');
            navTraining.style.background = '#238636'; navTraining.style.color = 'white';
        }
        trainingArea.style.display = 'flex'; // It's flex for centering
        initTraining(); // Start game
    }
    else if (tab === 'domain') {
        navDomain.classList.add('active');
        navDomain.style.background = '#238636'; navDomain.style.color = 'white';
        domainArea.style.display = 'block';
    }

    // Overlay Handling
    const startOverlay = document.getElementById('start-overlay');
    if (tab !== 'chat') {
        if (startOverlay) startOverlay.style.display = 'none';
    }
}

// Event Listeners for Tabs
if (navChat) navChat.addEventListener('click', () => switchTab('chat'));
if (navTraining) navTraining.addEventListener('click', () => switchTab('training'));
if (navDomain) navDomain.addEventListener('click', () => switchTab('domain'));

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

// --- SPOT THE PHISH GAME LOGIC ---
const trainingCases = [
    { url: "https://linkedin-jobs-apply.com", isPhish: true, reason: "Phishing: Contains hyphenated look-alike domain." },
    { url: "https://accounts.google.com", isPhish: false, reason: "Safe: Official Google accounts domain." },
    { url: "http://paypal-support-center.net", isPhish: true, reason: "Phishing: 'http' (insecure) and fake support domain." },
    { url: "https://amazon.com", isPhish: false, reason: "Safe: Official Amazon domain." },
    { url: "https://aple-id-recover.com", isPhish: true, reason: "Phishing: Misspelled 'aple' (Typosquatting)." },
    { url: "https://microsoft.com/en-us/microsoft-365", isPhish: false, reason: "Safe: Valid Microsoft subdirectory." },
    { url: "https://chaseweb.online-banking-secure.com", isPhish: true, reason: "Phishing: Uses long subdomain to hide real domain." },
    { url: "https://github.com", isPhish: false, reason: "Safe: Official GitHub domain." }
];

let currentQuiz = null;
let quizScore = 0;
let quizStreak = 0;

function initTraining() {
    if (!currentQuiz) nextQuiz();
}

function nextQuiz() {
    // Pick random case
    currentQuiz = trainingCases[Math.floor(Math.random() * trainingCases.length)];

    // Update UI
    document.getElementById('quiz-domain').textContent = currentQuiz.url;
    document.getElementById('quiz-domain').style.color = currentQuiz.isPhish ? "#fca5a5" : "#86efac"; // subtle hint color? No, keep it white for challenge.
    document.getElementById('quiz-domain').style.color = "white";

    // Hide Feedback
    document.getElementById('quiz-feedback').style.display = 'none';
}

function checkQuiz(userSaysSafe) {
    if (!currentQuiz) return;

    const isCorrect = (userSaysSafe && !currentQuiz.isPhish) || (!userSaysSafe && currentQuiz.isPhish);

    // Update Score
    if (isCorrect) {
        quizScore += 100;
        quizStreak++;
        document.getElementById('quiz-title').textContent = "CORRECT! 🎉";
        document.getElementById('quiz-title').style.color = "#4ade80";
        document.getElementById('quiz-icon').textContent = "🛡️";
    } else {
        quizStreak = 0;
        document.getElementById('quiz-title').textContent = "WRONG! 💀";
        document.getElementById('quiz-title').style.color = "#ef4444";
        document.getElementById('quiz-icon').textContent = "❌";
    }

    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-streak').textContent = quizStreak;
    document.getElementById('quiz-reason').textContent = currentQuiz.reason;

    // Show Feedback
    document.getElementById('quiz-feedback').style.display = 'flex';
}

// Quiz Listeners
const btnSafe = document.getElementById('btn-safe');
const btnPhish = document.getElementById('btn-phish');
const btnNext = document.getElementById('btn-next-quiz');

if (btnSafe) btnSafe.addEventListener('click', () => checkQuiz(true));
if (btnPhish) btnPhish.addEventListener('click', () => checkQuiz(false));
if (btnNext) btnNext.addEventListener('click', nextQuiz);
