const API_URL = "https://oculus-eight.vercel.app"; // Production URL

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const typing = document.getElementById('typing-indicator');
const sendBtn = document.getElementById('send-btn');
const playAgainBtn = document.getElementById('play-again-btn');

let history = [];

// Initial Message
setTimeout(() => {
    addMessage("bot", "Hello, this is Amazon Security. We noticed a suspicious transaction of $999 for an iPhone 15 Pro on your account. Did you authorize this? If not, please reply immediately with your Order ID or Credit Card last 4 digits for verification.");
}, 1000);

// Event Listeners
if (userInput) {
    userInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            sendMessage();
        }
    });
}

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => location.reload());
}

function addMessage(sender, text) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = text; // Safe here as we control text, but in prod use textContent for user input if responding
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage("user", text);
    userInput.value = "";
    history.push({ role: "user", content: text });

    // Show typing
    if (typing) typing.style.display = "block";

    try {
        // Call API
        const response = await fetch(`${API_URL}/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: history })
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
                    // confetti(); // If confetti lib is not present, this will error. Removing for safety.
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
