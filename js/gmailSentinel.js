/**
 * Gmail Sentinel - AI-Powered Email Forensics
 * Part of Oculus Chrome Extension
 */

const GmailSentinel = {

    init: function () {
        console.log("🛡️ Oculus AI Gmail Sentinel Active");
        this.observeDOM();
    },

    observeDOM: function () {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    this.scanHeaders();
                    this.injectAttachmentScanners();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * AI-Powered Header Scan
     */
    scanHeaders: function () {
        // STRICT CHECK: Are we actually reading an email?
        // .a3s is the class for the message body content. If it's not there, we're likely in the list view.
        if (!document.querySelector('.a3s')) {
            return;
        }

        // Gmail Selectors Strategy (More Precise):
        // Only look for senders within the main role="main" container to avoid sidebars/chats
        const mainContainer = document.querySelector('div[role="main"]');
        if (!mainContainer) return;

        const senders = mainContainer.querySelectorAll('.gD');

        if (senders.length === 0) {
            // Fallback for popouts
            const fallback = document.querySelectorAll('.a3s');
            if (fallback.length > 0) {
                // Try to find header relative to body? Hard.
                // Stick to .gD for now as it's the standard for 'Card' header
            }
            return;
        }

        this.processSenders(senders);
    },

    processSenders: function (nodeList) {
        nodeList.forEach(sender => {
            // Avoid re-scanning same element
            if (sender.dataset.oculusScanned) return;

            // Validate it's a real email sender node
            const email = sender.getAttribute('email');
            const name = sender.textContent; // "Team Unstop"

            if (!email || !name) return;

            // Mark as scanned immediately to prevent double-fire
            sender.dataset.oculusScanned = "true";

            console.log(`[GmailSentinel] Found sender: ${name} <${email}>`);

            // Only analyze if the name looks like a brand Or if user forced "Analyze All" (future feature)
            // For hackathon: Analyze everything that isn't me
            if (this.looksLikeBrand(name)) {
                this.analyzeWithAI(sender, name, email);
            } else {
                // Add Manual Scan Button for "Other" senders
                const scanBtn = document.createElement('span');
                scanBtn.innerHTML = "🔍 Scan";
                scanBtn.style.cssText = "border: 1px solid #ccc; color: #555; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px; cursor: pointer; opacity: 0.7;";
                scanBtn.title = "Manually analyze this sender with Oculus AI";

                scanBtn.onmouseover = () => scanBtn.style.opacity = "1";
                scanBtn.onmouseout = () => scanBtn.style.opacity = "0.7";

                scanBtn.onclick = (e) => {
                    e.stopPropagation();
                    scanBtn.remove(); // Remove button to avoid double clicking
                    this.analyzeWithAI(sender, name, email);
                };

                sender.parentNode.appendChild(scanBtn);
            }
        });
    },

    // Simple heuristic to avoid checking "John Doe"
    looksLikeBrand: function (name) {
        // Expanded List + Generic terms
        const keywords = ["PayPal", "Google", "Amazon", "Microsoft", "Apple", "Support", "Team", "Security", "Bank", "Service", "Verify", "Alert", "Notification", "Unstop", "Hero", "Campus"];
        return keywords.some(k => name.includes(k));
    },

    analyzeWithAI: async function (element, name, email) {
        // 1. Get Email Body Content
        const emailContainer = element.closest('.gs') || document.body;
        const bodyElement = emailContainer.querySelector('.a3s.aiL');
        const bodyContent = bodyElement ? bodyElement.innerText : "No content found";

        // 2. Add "Analyzing" indicator (Persistent Element)
        // Check if one already exists to avoid duplicates
        if (element.parentNode.querySelector('.oculus-status-badge')) return;

        const badge = document.createElement('span');
        badge.className = 'oculus-status-badge';
        badge.innerHTML = " 🤖 Analyzing...";
        badge.style.cssText = "font-size:10px; color:#888; margin-left:5px; background:#f0f0f0; padding:2px 4px; border-radius:4px; cursor: wait;";
        element.parentNode.appendChild(badge);

        if (typeof ThreatIntel !== 'undefined') {
            const result = await ThreatIntel.analyzeEmail({
                senderName: name,
                senderEmail: email,
                content: bodyContent.substring(0, 500)
            });

            console.log("[GmailSentinel] Analysis Result:", result);

            if (result.success && result.analysis) {
                this.updateVerdictBadge(badge, element, result.analysis, email);
            } else {
                console.warn("[GmailSentinel] Failed:", result.error);
                badge.innerHTML = " ⚠️ Analysis Failed";
                badge.style.cursor = "help";
                badge.title = result.error || "Unknown error";
            }
        } else {
            badge.innerHTML = " ❌ ThreatEngine Missing";
        }
    },

    updateVerdictBadge: function (badge, element, analysis, realEmail) {
        // 1. Re-Verify Element Existence
        if (!badge.isConnected) {
            console.warn("[GmailSentinel] Badge lost. Attempting to re-inject...");
            // Try to find the sender element again
            const potentialMatches = document.querySelectorAll(`.gD[email="${realEmail}"]`);
            if (potentialMatches.length > 0) {
                const newParent = potentialMatches[0].parentNode;
                newParent.appendChild(badge); // Move badge to new live element
            }
        }

        const isRisk = analysis.is_spoofed || analysis.risk_score > 70;

        // Apply Styles
        if (isRisk) {
            // DANGER
            badge.innerHTML = `⚠️ <b>FAKE ${analysis.claimed_brand?.toUpperCase() || 'SENDER'}</b>`;
            badge.style.cssText = "background: #d9534f; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-left: 10px; font-size: 12px; cursor: pointer; box-shadow: 0 0 10px rgba(217, 83, 79, 0.5);";
            element.style.textDecoration = "line-through";
            element.style.color = "#d9534f";

            // Auto Popup
            this.showModal(analysis, realEmail, true);

        } else if (analysis.risk_score <= 30) {
            // SAFE / VERIFIED
            // Fix: ensure even subdomains get the checkmark
            badge.innerHTML = `✅ <b>Verified ${analysis.claimed_brand || ''}</b>`;
            badge.style.cssText = "background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; margin-left: 10px; font-size: 11px; cursor: pointer; opacity: 0.9;";

            // Auto Popup (Safe)
            this.showModal(analysis, realEmail, false);

        } else {
            // CAUTION (31-70)
            badge.innerHTML = `⚠️ <b>Suspicious (${analysis.risk_score}%)</b>`;
            badge.style.cssText = "background: #f0ad4e; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; margin-left: 10px; font-size: 11px; cursor: pointer;";

            // Auto Popup (Caution)
            this.showModal(analysis, realEmail, true);
        }

        // Add Click Listener
        badge.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.showModal(analysis, realEmail, isRisk || analysis.risk_score > 30);
        };
    },


    showModal: function (analysis, realEmail, isDanger) {
        // Prevent duplicates
        if (document.querySelector('.oculus-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'oculus-modal-overlay';

        const color = isDanger ? '#dc3545' : '#28a745';
        const title = isDanger ? '⚠️ Security Alert' : '🛡️ Authenticity Verified';
        const scoreColor = isDanger ? '#dc3545' : '#28a745';

        overlay.innerHTML = `
            <div class="oculus-modal" style="border-top: 5px solid ${color}">
                <h2>
                    <div class="score-circle" style="border-color: ${scoreColor}; color: ${scoreColor}">
                        ${analysis.risk_score}
                    </div>
                    ${title}
                </h2>
                
                <div class="details">
                    <div class="oculus-stat-row">
                        <span class="oculus-stat-label">CLAIMED ENTITY</span>
                        <span class="oculus-stat-val">${analysis.claimed_brand || 'Unknown'}</span>
                    </div>
                    <div class="oculus-stat-row">
                        <span class="oculus-stat-label">ACTUAL SENDER</span>
                        <span class="oculus-stat-val" style="color: ${isDanger ? '#ff6b6b' : '#fff'}">${realEmail}</span>
                    </div>
                    <div class="oculus-stat-row">
                        <span class="oculus-stat-label">DOMAIN CHECK</span>
                        <span class="oculus-tag ${isDanger ? 'danger' : 'safe'}">
                            ${isDanger ? '❌ MISMATCH' : '✅ LEGITIMATE'}
                        </span>
                    </div>
                    
                    <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
                        <span class="oculus-stat-label">AI FORENSIC ANALYSIS:</span>
                        <p style="margin-top: 5px; font-style: italic;">
                            "${analysis.analysis || analysis.reason || 'No analysis provided.'}"
                        </p>
                    </div>
                </div>

                <div style="text-align: right;">
                    ${isDanger ? `` : ''}
                    <button class="btn-close" id="ocCloseBtn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close Logic
        const close = () => overlay.remove();
        document.getElementById('ocCloseBtn').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
    },

    injectAttachmentScanners: function () {
        const attachments = document.querySelectorAll('a[href*="ui=2&ik="][href*="view=att"]:not([data-oculus-scan-btn])');

        attachments.forEach(att => {
            att.setAttribute('data-oculus-scan-btn', 'true');
            const btn = document.createElement('div');
            btn.innerHTML = "🛡️ Scan Virus";
            btn.style.cssText = "background: #333; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-top: 4px; text-align: center; display: inline-block; z-index: 999; position: relative;";
            btn.title = "Calculate Hash & Check VirusTotal";

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.scanFile(att.href, btn);
            });

            const container = att.closest('span[download_url]') || att.parentNode;
            container.appendChild(btn);
        });
    },

    scanFile: async function (downloadUrl, btnElement) {
        btnElement.innerHTML = "⏳ Downloading...";

        try {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();

            btnElement.innerHTML = "⚙️ Hashing...";
            const arrayBuffer = await blob.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            console.log("File Hash:", hashHex);
            btnElement.innerHTML = "☁️ Checking VT...";

            if (typeof ThreatIntel !== 'undefined') {
                const result = await ThreatIntel.scanResource(hashHex, 'file');

                if (result.success && result.result) {
                    const stats = result.result.last_analysis_stats;
                    const malicious = stats.malicious;

                    if (malicious > 0) {
                        btnElement.style.background = "#d9534f"; // Red
                        btnElement.innerHTML = `⛔ DANGER (${malicious}/60)`;
                        this.showFileModal(hashHex, malicious, stats, true);
                    } else {
                        btnElement.style.background = "#5cb85c"; // Green
                        btnElement.innerHTML = `✅ Safe (0/${stats.harmless + stats.undetected})`;
                        // SHOW SAFE MODAL AS REQUESTED
                        this.showFileModal(hashHex, malicious, stats, false);
                    }
                } else {
                    btnElement.innerHTML = "⚠️ Unknown File";
                    btnElement.title = "File not found in VirusTotal database.";
                    btnElement.style.background = "#f0ad4e";
                }
            } else {
                btnElement.innerHTML = "❌ Error (No Intel)";
            }
        } catch (error) {
            console.error(error);
            btnElement.innerHTML = "❌ Fail";
            alert("Could not scan file. " + error.message);
        }
    },


    showFileModal: function (hash, maliciousCount, stats, isDanger) {
        if (document.querySelector('.oculus-modal-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'oculus-modal-overlay';
        overlay.innerHTML = `
             <div class="oculus-modal" style="border-top: 5px solid ${isDanger ? '#dc3545' : '#28a745'}">
                <h2>${isDanger ? '⛔ MALWARE DETECTED' : '✅ FILE VERIFIED'}</h2>
                <div class="details">
                    <div class="oculus-stat-row"><span class="oculus-stat-label">SHA-256 HASH</span><span class="oculus-stat-val" style="font-size:10px">${hash}</span></div>
                    <div class="oculus-stat-row"><span class="oculus-stat-label">VENDORS FLAGGED</span><span class="oculus-stat-val" style="color: ${isDanger ? 'red' : 'green'}">${maliciousCount} / 60</span></div>
                </div>
                <div style="text-align: right;"><button class="btn-close" id="ocFileClose">Close</button></div>
             </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('ocFileClose').onclick = () => overlay.remove();
    }
};

// Start
setTimeout(() => GmailSentinel.init(), 2000);
