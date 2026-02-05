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
