// main.js - Client-Side Logic for Functional Scriptoria

// 0. AUTH STATE
let currentUser = null;
let sidebarOpen = false;

// 1. GLOBAL STATE ENGINE
const appState = {
    idea: "",
    tone: "A24 Indie",
    intensity: 85,
    variationSeed: Math.random(),
    screenplay: null,
    metadata: null,
    characters: null,
    soundPlan: null,
    productionPlan: null,
    projectId: null,
    isDirty: false
};

// Global flags to prevent ReferenceErrors
let isGenerating = false;
let isOrchestrating = false;
let isFetchingHistory = false;
let isSidebarLoading = false;
let currentHistoryList = [];
let sidebarHistoryData = [];

// UI Elements
const els = {
    ideaInput: document.getElementById('ideaInput'),
    generateBtn: document.getElementById('generateBtn'),
    statusText: document.getElementById('statusText'),
    toneButtons: document.querySelectorAll('.tone-btn'),
    intensitySlider: document.getElementById('intensitySlider'),
    intensityValue: document.getElementById('intensityValueDisplay'),
    tabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    videoModal: document.getElementById('videoModal'),
    toast: document.getElementById('toast'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon')
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Scriptoria AI Orchestration Engine (Fully Functional) Initialized.");
    checkAuth();
    bindEvents();
});

// ═══════════════════════════════════════════
// AUTH & SIDEBAR FUNCTIONS
// ═══════════════════════════════════════════

async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            showAuthUI();
            fetchSidebarHistory();
        }
        // If not logged in, page still works (hero, info sections visible)
        // Auth is only required for generation/history features
    } catch (e) {
        console.log("Auth check skipped:", e);
    }
}

function showAuthUI() {
    if (!currentUser) return;

    // Hide guest nav
    const guestInfo = document.getElementById('nav-guest-info');
    if (guestInfo) guestInfo.classList.add('hidden');

    // Navbar user info
    const navInfo = document.getElementById('nav-user-info');
    const navName = document.getElementById('nav-user-name');
    const navInitial = document.getElementById('nav-user-initial');

    if (navInfo) {
        navInfo.classList.remove('hidden');
        navInfo.classList.add('flex');
    }
    if (navName) navName.textContent = currentUser.display_name;
    if (navInitial) navInitial.textContent = currentUser.display_name.charAt(0).toUpperCase();

    // Sidebar user name
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = currentUser.display_name;
}

function handleStartCreating() {
    if (currentUser) {
        window.location.href = '/dashboard';
    } else {
        // Scroll to demo if guest, or redirect to login? 
        // User said "entry login thing is not upto the point" 
        // Let's redirect to login to make it "crisp" and force them into the ecosystem
        window.location.href = '/login';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;

    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (e) {
        console.error("Logout error:", e);
    }
}

function startNewScreenplay() {
    // Clear state and reset UI
    appState.idea = "";
    appState.screenplay = null;
    appState.metadata = null;
    appState.characters = null;
    appState.soundPlan = null;
    appState.productionPlan = null;
    appState.isDirty = false;

    if (els.ideaInput) els.ideaInput.value = "";

    const placeholder = document.getElementById('screenplay-placeholder');
    const container = document.getElementById('screenplay-container');
    const outText = document.getElementById('screenplay-text');

    if (placeholder) { placeholder.classList.remove('hidden', 'opacity-0'); }
    if (container) { container.classList.add('hidden'); }
    if (outText) { outText.innerHTML = ""; }

    // Reset secondary tabs
    document.getElementById('characters-out').innerHTML = '<p class="text-center text-gray-500 p-10">Generate a screenplay first.</p>';
    document.getElementById('sound-out').innerHTML = '<p class="text-center text-gray-500 p-10">Generate a screenplay first.</p>';
    document.getElementById('production-out').innerHTML = '<p class="text-center text-gray-500 p-10">Generate a screenplay first.</p>';

    // Switch to screenplay tab
    const screenplayTab = document.querySelector('[data-target="screenplay-out"]');
    if (screenplayTab) screenplayTab.click();

    // Close sidebar on mobile
    if (sidebarOpen) toggleSidebar();

    // Scroll to studio
    scrollToDemo();
    showToast("Ready", "New screenplay canvas ready.", false);
}


// 2. SIDEBAR HISTORY

async function fetchSidebarHistory() {
    if (isSidebarLoading) return;
    const loading = document.getElementById('sidebar-history-loading');
    const empty = document.getElementById('sidebar-history-empty');
    const list = document.getElementById('sidebar-history-list');
    if (!loading || !list) return;

    isSidebarLoading = true;
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    list.innerHTML = '';

    try {
        const res = await fetch('/api/history');
        if (res.status === 401) {
            loading.classList.add('hidden');
            empty.classList.remove('hidden');
            empty.textContent = "Sign in to see history.";
            return;
        }
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch history");

        sidebarHistoryData = data.history || [];

        if (sidebarHistoryData.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        sidebarHistoryData.forEach(item => {
            const date = new Date(item.created_at);
            const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'sidebar-history-item group px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-800/60 transition-all';
            div.onclick = (e) => {
                e.preventDefault();
                loadFromSidebar(item.id);
            };
            div.innerHTML = `
                <p class="text-xs text-gray-300 font-medium truncate group-hover:text-cinematic-neon transition">${item.title}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] text-gray-600 font-mono">${item.tone}</span>
                    <span class="text-[10px] text-gray-700">·</span>
                    <span class="text-[10px] text-gray-600">${timeStr}</span>
                </div>
            `;
            list.appendChild(div);
        });

    } catch (e) {
        console.error("Sidebar history error:", e);
        empty.classList.remove('hidden');
        empty.textContent = "Error: " + e.message;
    } finally {
        isSidebarLoading = false;
        loading.classList.add('hidden');
    }
}

let isLoadingFromSidebar = false;

async function loadFromSidebar(id) {
    if (isGenerating || isOrchestrating || isLoadingFromSidebar) {
        showToast("Wait", "System busy. Please wait.", true);
        return;
    }

    isLoadingFromSidebar = true;
    showToast("Loading", "Retrieving project...", false);

    try {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to load screenplay.");
        }
        const item = await res.json();

        // Set state
        appState.idea = item.idea;
        appState.tone = item.tone;
        appState.intensity = item.intensity;
        appState.screenplay = item.screenplay_text;
        appState.metadata = null;
        appState.characters = null;
        appState.soundPlan = null;
        appState.productionPlan = null;
        appState.isDirty = false;

        // Update UI
        if (els.ideaInput) els.ideaInput.value = item.idea;

        const outText = document.getElementById('screenplay-text');
        const container = document.getElementById('screenplay-container');
        const placeholder = document.getElementById('screenplay-placeholder');

        if (outText) outText.innerHTML = item.screenplay_text;
        if (placeholder) placeholder.classList.add('hidden');
        if (container) container.classList.remove('hidden');

        updateScreenplayTabUI();

        // Switch to screenplay tab
        const screenplayTab = document.querySelector('[data-target="screenplay-out"]');
        if (screenplayTab) screenplayTab.click();

        // Close sidebar  
        if (sidebarOpen) toggleSidebar();

        // Scroll to studio
        scrollToDemo();
        showToast("Loaded", "Screenplay loaded from history.", false);

    } catch (e) {
        showToast("Error", e.message, true);
    } finally {
        isLoadingFromSidebar = false;
    }
}

// 2. EVENT BINDING
function bindEvents() {
    if (els.ideaInput) {
        els.ideaInput.addEventListener('input', (e) => {
            appState.idea = e.target.value.trim();
            appState.isDirty = true;
            updateScreenplayTabUI();
        });
    }

    // Tab Switching — tabs ONLY switch views, never trigger generation
    els.tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            els.tabs.forEach(b => b.classList.remove('active', 'border-cinematic-neon', 'text-cinematic-neon', 'bg-cinematic-neon/5'));
            els.tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active', 'border-cinematic-neon', 'text-cinematic-neon', 'bg-cinematic-neon/5');
            const targetId = btn.getAttribute('data-target');

            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');

            // Smooth Tab Reveal Animation
            if (typeof gsap !== "undefined") {
                gsap.fromTo(targetContent,
                    { opacity: 0, scale: 0.98 },
                    { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" }
                );
            }

            // Auto-fetch data for the tab if we have a script but haven't fetched the sub-data yet
            handleTabSwitch(targetId);
        });
    });

    // Tone Engine
    els.toneButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            els.toneButtons.forEach(b => {
                b.classList.remove('active', 'border-cinematic-accent', 'bg-cinematic-accent/10', 'text-white');
                b.classList.add('border-gray-700', 'text-gray-400');
            });
            const target = e.currentTarget;
            target.classList.remove('border-gray-700', 'text-gray-400');
            target.classList.add('active', 'border-cinematic-accent', 'bg-cinematic-accent/10', 'text-white');

            appState.tone = target.getAttribute('data-tone');
            appState.idea = els.ideaInput.value.trim(); // Ensure idea is captured
            console.log("Tone updated:", appState.tone);
            appState.isDirty = true;
            updateScreenplayTabUI();
        });
    });

    // Intensity Slider
    if (els.intensitySlider) {
        // Initial fill setup
        updateSliderFill(els.intensitySlider);

        els.intensitySlider.addEventListener('input', (e) => {
            appState.intensity = parseInt(e.target.value, 10);
            els.intensityValue.innerText = appState.intensity + "%";
            updateSliderFill(e.target);
            appState.isDirty = true;
            updateScreenplayTabUI();
        });
    }

    // Length Selector
    const lengthSelect = document.getElementById('lengthSelect');
    if (lengthSelect) {
        lengthSelect.addEventListener('change', () => {
            appState.isDirty = true;
            updateScreenplayTabUI();
        });
    }
}

function updateScreenplayTabUI() {
    // Tab label always stays "Screenplay" — regeneration is via the dedicated button
    const tabText = document.getElementById('screenplay-tab-text');
    if (!tabText) return;
    tabText.innerHTML = "Screenplay";
}

function updateSliderFill(slider) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    // Visually fills the track up to the thumb
    slider.style.background = `linear-gradient(to right, #00F0FF ${value}%, #374151 ${value}%)`;
}

function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal Logic
function openVideoModal() {
    if (els.videoModal) {
        els.videoModal.classList.remove('hidden');
        setTimeout(() => els.videoModal.classList.remove('opacity-0'), 10);
    }
}

function closeVideoModal() {
    if (els.videoModal) {
        els.videoModal.classList.add('opacity-0');
        setTimeout(() => els.videoModal.classList.add('hidden'), 300);
    }
}

// Toast Logic
function showToast(title, message, isError = false) {
    if (!els.toast) return;
    els.toastTitle.innerText = title;
    els.toastMessage.innerText = message;
    els.toastIcon.innerText = isError ? "⚠️" : "✨";
    if (isError) {
        els.toast.querySelector('div').classList.replace('border-cinematic-neon', 'border-red-500');
    } else {
        els.toast.querySelector('div').classList.replace('border-red-500', 'border-cinematic-neon');
    }

    els.toast.classList.remove('translate-y-20', 'opacity-0');

    setTimeout(() => {
        els.toast.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// 3. SECONDARY ENGINE ORCHESTRATOR
async function generateSecondaryEngines() {
    if (isOrchestrating) return; // Prevent double-click

    // If not in state, attempt to pull from UI if stream finished
    const scriptElem = document.getElementById('screenplay-text');
    if (!appState.screenplay && scriptElem && scriptElem.innerText.trim().length > 0) {
        appState.screenplay = scriptElem.innerText.trim();
    }

    if (!appState.screenplay) {
        showToast("Missing Script", "Please click 'Generate Master Screenplay' first to generate the script.", true);
        return;
    }

    if (!appState.idea) {
        appState.idea = els.ideaInput.value.trim() || "A cinematic masterclass in storytelling.";
    }

    isOrchestrating = true;

    // Reset Output UI
    document.getElementById('characters-out').innerHTML = resetTabUI("🧠", "Analyzing Script...");
    document.getElementById('sound-out').innerHTML = resetTabUI("🎵", "Analyzing Script...");
    document.getElementById('production-out').innerHTML = '<div class="flex flex-col items-center justify-center py-16 text-gray-500"><span class="text-4xl mb-3">🎬</span><p class="text-sm">Click the <strong>Planner</strong> tab to generate the production plan.</p></div>';

    els.generateBtn.disabled = true;
    els.generateBtn.innerHTML = `<span class="animate-pulse">🧠 Orchestrating Engines...</span>`;
    els.statusText.innerText = "Status: Analyzing Scene Context...";
    els.statusText.classList.add('text-cinematic-accent');

    try {
        const meta = await extractMetadata(appState.screenplay, appState.projectId);
        appState.metadata = meta;
        els.statusText.innerText = "Status: Generating Characters...";

        // SEQUENTIAL calls to avoid Groq 429 rate limits
        await generateCharacters(appState.idea, appState.screenplay, appState.tone, appState.intensity, meta, appState.projectId);
        els.statusText.innerText = "Status: Generating Sound Design...";
        await generateSound(appState.idea, appState.screenplay, appState.tone, appState.intensity, meta, appState.projectId);

        els.statusText.innerText = "Status: Characters & Sound Complete. Click Planner for Production Plan.";
        els.statusText.classList.remove('text-cinematic-accent');
        els.statusText.classList.add('text-cinematic-neon');
        showToast("Success", "Characters & Sound generated. Click Planner tab for Production Plan.", false);

        // Auto-switch to Character Lab tab to show the user the new data
        const charTab = document.querySelector('[data-target="characters-out"]');
        if (charTab) charTab.click();

    } catch (err) {
        els.statusText.innerText = "Error: " + err.message;
        showToast("Error", "Generation failed. " + err.message, true);
    } finally {
        isOrchestrating = false;
        els.generateBtn.disabled = false;
        els.generateBtn.innerHTML = `🎬 Generate Production Plan`;
    }
}

function resetTabUI(icon, text) {
    return `<div class="flex flex-col items-center justify-center h-full text-gray-500 opacity-50 absolute inset-0">
                <div class="w-8 h-8 rounded-full border-t-2 border-cinematic-neon animate-spin mb-4"></div>
                <span class="text-4xl mb-4">${icon}</span>
                <p class="text-sm font-light ai-generating-text">${text}</p>
            </div>`;
}

function typeWriter(text, elementId, speed) {
    let i = 0;
    const target = document.getElementById(elementId);
    if (!target) return;
    target.innerHTML = '';

    function type() {
        if (i < text.length) {
            target.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// --- NEW MODAL & REGENERATE LOGIC ---
async function fetchHistory() {
    if (isFetchingHistory) return;
    const loading = document.getElementById('history-loading');
    const empty = document.getElementById('history-empty');
    const list = document.getElementById('history-list');

    isFetchingHistory = true;
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    list.innerHTML = '';

    try {
        const res = await fetch('/api/screenplay-history');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to fetch history");

        currentHistoryList = data.history || [];

        if (currentHistoryList.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        currentHistoryList.forEach(item => {
            const date = new Date(item.created_at).toLocaleString();
            const div = document.createElement('div');
            div.className = "flex flex-col sm:flex-row gap-4 p-4 border border-gray-800 bg-gray-900/50 rounded-xl hover:border-cinematic-neon/50 transition items-start sm:items-center justify-between";
            div.innerHTML = `
                <div class="flex-grow">
                    <h4 class="text-cinematic-neon text-sm font-bold uppercase tracking-wider mb-1 line-clamp-1">${item.idea}</h4>
                    <p class="text-xs text-gray-400 mb-2 italic line-clamp-2">"${item.preview}"</p>
                    <div class="flex gap-3 text-[10px] text-gray-500 font-mono uppercase">
                        <span class="bg-gray-800 px-2 py-1 rounded border border-gray-700">${item.tone}</span>
                        <span class="bg-gray-800 px-2 py-1 rounded border border-gray-700">Int: ${item.intensity}%</span>
                        <span class="px-2 py-1">${date}</span>
                    </div>
                </div>
                <button onclick="loadPastScreenplay(${item.id})" class="shrink-0 px-4 py-2 bg-gray-800 hover:bg-cinematic-neon hover:text-black rounded text-white text-xs font-bold transition">Load &rarr;</button>
            `;
            list.appendChild(div);
        });

    } catch (e) {
        console.error("History fetch error:", e);
        empty.classList.remove('hidden');
        empty.innerText = "Error: " + e.message;
    } finally {
        isFetchingHistory = false;
        loading.classList.add('hidden');
    }
}

function loadPastScreenplay(id) {
    const item = currentHistoryList.find(x => x.id === id);
    if (!item) return;

    if (isGenerating) {
        showToast("Wait", "Cannot load while generating.", true);
        return;
    }

    // Set UI globals
    appState.idea = item.idea;
    appState.tone = item.tone;
    appState.intensity = item.intensity;
    appState.screenplay = item.screenplay_text;

    // Fill text area
    const outText = document.getElementById('screenplay-text');
    const container = document.getElementById('screenplay-container');
    const placeholder = document.getElementById('screenplay-placeholder');

    outText.innerHTML = item.screenplay_text;
    placeholder.classList.add('hidden');
    container.classList.remove('hidden');
    appState.isDirty = false;

    updateScreenplayTabUI();
    closeHistoryModal();
    showToast("Loaded", "Archive retrieved successfully.", false);
}

function regenerateScreenplay() {
    if (isGenerating) return;
    if (!appState.idea) {
        showToast("Error", "No original idea found to regenerate from.", true);
        return;
    }

    // Clear stale secondary data — a fresh screenplay needs fresh analysis
    appState.metadata = null;
    appState.characters = null;
    appState.soundPlan = null;
    appState.productionPlan = null;

    const uiBtn = document.getElementById('regenerate-btn-ui');
    const originalText = uiBtn.innerHTML;

    uiBtn.innerHTML = '<div class="w-4 h-4 rounded-full border-t-2 border-cinematic-neon animate-spin inline-block"></div> Regenerating...';
    uiBtn.classList.add('opacity-50', 'pointer-events-none');

    generateStreamingScript().finally(() => {
        uiBtn.innerHTML = originalText;
        uiBtn.classList.remove('opacity-50', 'pointer-events-none');
    });
}

async function generateStreamingScript() {
    if (isGenerating) return;

    const promptValue = appState.idea || els.ideaInput.value.trim();
    if (!promptValue) {
        showToast("Missing Idea", "Please enter a logline or concept in the Spark section.", true);
        return;
    }

    isGenerating = true;

    const btn = document.getElementById('generate-master-btn');
    const placeholder = document.getElementById('screenplay-placeholder');
    const container = document.getElementById('screenplay-container');
    const outText = document.getElementById('screenplay-text');

    // UI Locking
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Connecting Neural Engine...`;
    }

    // Reveal text area
    if (placeholder) {
        placeholder.classList.add('opacity-0');
        setTimeout(() => {
            placeholder.classList.add('hidden');
            if (container) container.classList.remove('hidden');
        }, 300);
    } else {
        if (container) container.classList.remove('hidden');
    }

    outText.innerHTML = "Establishing cinematic stream...\n\n";

    try {
        const lengthSelect = document.getElementById('lengthSelect');
        const lengthVal = lengthSelect ? lengthSelect.value : "Medium";
        const payload = {
            idea: promptValue,
            tone: appState.tone,
            intensity: appState.intensity,
            length: lengthVal,
            seed: Math.random()
        };

        const response = await fetch('/api/generate/screenplay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Generation Error");
        }

        outText.innerHTML = ""; // clear
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
                const msg = buffer.substring(0, boundary);
                buffer = buffer.substring(boundary + 2);

                if (msg.startsWith('data: ')) {
                    const dataStr = msg.substring(6);
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.status === 'DONE') {
                            // Finished — capture final screenplay text
                            appState.screenplay = outText.innerText;
                            appState.idea = promptValue;
                            appState.isDirty = false;

                            // Clear stale secondary data so Production Plan runs fresh
                            appState.metadata = null;
                            appState.characters = null;
                            appState.soundPlan = null;
                            appState.productionPlan = null;

                            if (data.project_id) {
                                appState.projectId = data.project_id;
                                console.log("DIAGNOSTIC - Saved project ID:", appState.projectId);
                            }

                            updateScreenplayTabUI();
                            showToast("Success", "Master Screenplay streaming complete.", false);

                            // Refresh sidebar history to show the new entry
                            if (currentUser) fetchSidebarHistory();

                            // Cinematic Completion Glow Pulse
                            if (typeof gsap !== "undefined") {
                                gsap.fromTo(outText.parentElement,
                                    { boxShadow: "0 0 0px rgba(0,240,255,0)" },
                                    { boxShadow: "0 0 40px rgba(0,240,255,0.4)", duration: 1, yoyo: true, repeat: 3, ease: "sine.inOut" }
                                );
                            }
                        } else if (data.text) {
                            outText.innerHTML += data.text;
                            outText.scrollTop = outText.scrollHeight; // Auto-scroll
                        } else if (data.error) {
                            outText.innerHTML += "\n\n[SERVER ERROR]: " + data.error;
                            showToast("Generation Error", data.error, true);
                        }
                    } catch (e) {
                        console.log("SSE JSON Parse Error", e, dataStr);
                    }
                }
                boundary = buffer.indexOf('\n\n');
            }
        }
    } catch (err) {
        console.error("Streaming failed:", err);
        outText.innerHTML += `\n\n[CONNECTION FAILED]: ${err.message}`;
        showToast("Error", err.message, true);
    } finally {
        isGenerating = false;
        // Unlock UI
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `✨ Generate Master Screenplay`;
        }
    }
}

// 4. SECONDARY GENERATIONS (Characters, Sound, Production)

async function extractMetadata(script, projectId = null) {
    try {
        const res = await fetch('/api/generate/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script, project_id: projectId })
        });
        const data = await res.json();
        return data.metadata || {};
    } catch (e) { return {}; }
}

async function generateCharacters(idea, script, tone, intensity, metadata, projectId = null) {
    try {
        const res = await fetch('/api/generate/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, script, tone, intensity, metadata, project_id: projectId })
        });
        const data = await res.json();
        if (res.ok) {
            appState.characters = data.characters;
            renderCharacters();
        } else {
            console.warn("Character API error:", data.error);
            document.getElementById('characters-out').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-10"><span class="text-4xl mb-3">⚠️</span><p class="text-sm">Character generation failed: ${data.error || 'Unknown error'}. Try again.</p></div>`;
        }
    } catch (e) {
        console.error("Char error", e);
        document.getElementById('characters-out').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-10"><span class="text-4xl mb-3">⚠️</span><p class="text-sm">Character generation failed. Check your connection.</p></div>`;
    }
}

async function generateSound(idea, script, tone, intensity, metadata, projectId = null) {
    try {
        const res = await fetch('/api/generate/sound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, script, tone, intensity, metadata, project_id: projectId })
        });
        const data = await res.json();
        if (res.ok) {
            appState.soundPlan = data.sound;
            renderSound();
        } else {
            console.warn("Sound API error:", data.error);
            document.getElementById('sound-out').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-10"><span class="text-4xl mb-3">⚠️</span><p class="text-sm">Sound generation failed: ${data.error || 'Unknown error'}. Try again.</p></div>`;
        }
    } catch (e) {
        console.error("Sound error", e);
        document.getElementById('sound-out').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-10"><span class="text-4xl mb-3">⚠️</span><p class="text-sm">Sound generation failed. Check your connection.</p></div>`;
    }
}

async function generateSecondaryEngines() {
    if (!appState.screenplay) {
        showToast("Error", "Please generate a screenplay first.", true);
        return;
    }

    const btn = document.getElementById('generateBtn');
    const statusText = document.getElementById('statusText');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Orchestrating...`;
    }

    try {
        if (statusText) statusText.textContent = "Status: Analyzing script metadata...";
        // 1. Metadata extraction
        const meta = await extractMetadata(appState.screenplay, appState.projectId);
        appState.metadata = meta;

        if (statusText) statusText.textContent = "Status: Generating secondary blueprints...";
        // 2. Parallel Generation (Characters, Sound, and Production)
        await Promise.all([
            generateCharacters(appState.idea, appState.screenplay, appState.tone, appState.intensity, meta, appState.projectId),
            generateSound(appState.idea, appState.screenplay, appState.tone, appState.intensity, meta, appState.projectId),
            generateProduction(appState.idea, appState.screenplay, appState.tone, appState.intensity, meta, appState.projectId)
        ]);

        if (statusText) statusText.textContent = "Status: All blueprints synchronized.";
        showToast("Success", "Full production suite generated successfully.", false);
    } catch (e) {
        console.error("Secondary engine generation failed:", e);
        showToast("Orchestration Error", "Failed to compile full suite.", true);
        if (statusText) statusText.textContent = "Status: Orchestration failed.";
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>🎬</span> Generate Production Plan`;
        }
    }
}

async function generateProduction(idea, script, tone, intensity, metadata, projectId = null) {
    try {
        const res = await fetch('/api/generate/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea, script, tone, intensity, metadata, project_id: projectId })
        });
        const data = await res.json();
        if (res.ok) {
            appState.productionPlan = data.production;
            renderProduction();
        } else {
            console.warn("Production API error:", data.error);
        }
    } catch (e) {
        console.error("Production error", e);
    }
}

async function generateDirectProduction() {
    const editorEl = document.getElementById('screenplay-text');
    let scriptText = "";
    if (editorEl) {
        scriptText = editorEl.innerText || editorEl.value || "";
    }

    if (!scriptText || scriptText.length < 300) {
        showToast("Error", "Please generate or paste a screenplay of at least 300 characters in the editor first.", true);
        return;
    }

    const btn = document.getElementById('direct-production-btn');
    if (btn) {
        if (btn.disabled) return; // Prevent double-click
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Processing...`;
    }

    try {
        // Ensure metadata is present (important after regeneration)
        if (!appState.metadata) {
            btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Analyzing Script...`;
            appState.metadata = await extractMetadata(scriptText, appState.projectId);
        }

        btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Compiling Production Plan...`;
        const res = await fetch('/api/generate/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: appState.idea || "Custom User Script",
                script: scriptText,
                tone: appState.tone,
                intensity: appState.intensity,
                metadata: appState.metadata || {},
                project_id: appState.projectId
            })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to generate plan");

        appState.productionPlan = data.production;
        renderProduction();
        showToast("Success", "Production plan generated successfully.", false);

    } catch (e) {
        console.error("Direct Prod error", e);
        showToast("Error", "Failed to generate: " + e.message, true);
        document.getElementById('production-out').innerHTML = `<div class="flex flex-col items-center justify-center h-full text-red-400 p-10"><span class="text-4xl mb-3">⚠️</span><p class="text-sm">Production plan failed: ${e.message}. Try again.</p></div>`;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `🎬 Direct Generate from Editor`;
        }
    }
}

async function generateProduction() {
    if (!appState.screenplay) return;
    try {
        const res = await fetch('/api/generate/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idea: appState.idea,
                script: appState.screenplay,
                tone: appState.tone,
                intensity: appState.intensity,
                metadata: appState.metadata,
                project_id: appState.projectId
            })
        });
        const data = await res.json();
        if (res.ok) {
            appState.productionPlan = data.production;
            renderProduction();
        }
    } catch (e) { console.error("Prod error", e); }
}

// Renders
function renderCharacters() {
    const el = document.getElementById('characters-out');
    if (!appState.characters || !Array.isArray(appState.characters)) {
        el.innerHTML = `<pre class="p-6 text-gray-300 font-mono whitespace-pre-wrap">${JSON.stringify(appState.characters, null, 2)}</pre>`;
        return;
    }

    let html = `<div class="p-6 space-y-6 overflow-y-auto h-[600px] custom-scrollbar">`;
    appState.characters.forEach(char => {
        html += `
        <div class="p-4 border border-gray-700 bg-gray-900/50 rounded-lg hover:border-cinematic-neon/30 transition">
            <div class="flex justify-between items-end mb-2">
                <h4 class="text-xl text-cinematic-neon font-bold uppercase tracking-wide">${char.name || 'Unknown'}</h4>
                <span class="text-xs text-gray-500">${char.role || ''}</span>
            </div>
            <p class="text-xs uppercase tracking-widest text-cinematic-accent mb-4">Psychological Profile Extract</p>
            <div class="space-y-3">
                <p class="text-sm text-gray-400 font-light leading-relaxed"><strong class="text-white">Backstory:</strong> ${char.backstory || ''}</p>
                <p class="text-sm text-gray-400 font-light leading-relaxed"><strong class="text-white">Motivation:</strong> ${char.motivation || ''}</p>
                <p class="text-sm text-gray-400 font-light leading-relaxed"><strong class="text-white">Arc:</strong> ${char.arc || ''}</p>
            </div>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

function renderSound() {
    const el = document.getElementById('sound-out');
    if (!appState.soundPlan || !Array.isArray(appState.soundPlan.scenes)) {
        el.innerHTML = `<pre class="p-6 text-gray-300 font-mono whitespace-pre-wrap">${JSON.stringify(appState.soundPlan, null, 2)}</pre>`;
        return;
    }

    let html = `<div class="p-6 space-y-6 overflow-y-auto h-[600px] custom-scrollbar">`;
    appState.soundPlan.scenes.forEach((scene, i) => {
        html += `
        <div class="flex items-start gap-4 p-4 border-l-2 border-cinematic-neon bg-gray-900/30 rounded">
            <div class="text-cinematic-neon text-2xl">🔊</div>
            <div class="w-full">
                <h4 class="font-bold text-white uppercase tracking-wider text-sm mb-2">${scene.scene_heading || `Scene ${i + 1} Audio Blueprint`}</h4>
                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div><span class="text-xs text-gray-500 uppercase">Ambiance</span><p class="text-sm text-gray-300 font-light">${scene.ambiance || 'N/A'}</p></div>
                    <div><span class="text-xs text-gray-500 uppercase">Score Style</span><p class="text-sm text-gray-300 font-light">${scene.score_style || 'N/A'}</p></div>
                    <div class="col-span-2">
                        <span class="text-xs text-gray-500 uppercase">SFX</span>
                        <p class="text-sm text-cinematic-accent font-mono mt-1">${(scene.sfx_list || []).join(' • ') || 'None'}</p>
                    </div>
                    <div class="col-span-2 mt-2">
                        <span class="text-xs text-gray-500 uppercase">Dramatic Silence Moments</span>
                        <p class="text-sm text-gray-400 italic">${scene.silence_moments || 'None identified.'}</p>
                    </div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
}

function renderProduction() {
    const el = document.getElementById('production-out');
    if (!appState.productionPlan) return;

    const p = appState.productionPlan;
    el.innerHTML = `
    <div class="p-6 space-y-6 overflow-y-auto h-[600px] custom-scrollbar">
        <h3 class="text-2xl font-serif text-white border-b border-gray-800 pb-2 mb-4">Production Breakdown</h3>
        <div class="grid grid-cols-2 gap-6">
            <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <h4 class="text-cinematic-neon uppercase text-xs tracking-widest mb-3">📍 Key Locations</h4>
                <ul class="text-sm text-gray-400 space-y-2 list-disc list-inside">
                    ${(p.locations || []).map(l => `<li>${l}</li>`).join('')}
                </ul>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                <h4 class="text-cinematic-accent uppercase text-xs tracking-widest mb-3">📦 Heavy Props</h4>
                <ul class="text-sm text-gray-400 space-y-2 list-disc list-inside">
                    ${(p.props || []).map(pr => `<li>${pr}</li>`).join('')}
                </ul>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <h4 class="text-gray-500 uppercase text-xs tracking-widest mb-1">Estimated Shoot Days</h4>
                    <span class="text-3xl font-bold text-white">${p.estimated_shoot_days || 'N/A'}</span>
                </div>
                <span class="text-4xl">🎥</span>
            </div>
            <div class="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <h4 class="text-gray-500 uppercase text-xs tracking-widest mb-1">Complexity Rating</h4>
                    <span class="text-3xl font-bold text-white">${p.scene_complexity_rating || 'N/A'}/10</span>
                </div>
                <span class="text-4xl">⚙️</span>
            </div>
        </div>
    </div>`;
}

function handleTabSwitch(targetId) {
    if (targetId === 'characters-out' && appState.characters) renderCharacters();
    if (targetId === 'sound-out' && appState.soundPlan) renderSound();
    if (targetId === 'production-out') {
        if (appState.productionPlan) {
            renderProduction();
        }
        // Don't auto-trigger production — let the user click the button
    }
    // Guard against missing pitch DOM elements
    if (targetId === 'tab-pitch' && document.getElementById('pitch-title')) {
        updatePitchModeUI();
    }
}

// 6. PITCH MODE UI
function updatePitchModeUI() {
    if (!appState.idea) return; // Nothing to show yet

    // Title & Logline (Default title until AI gives one, or extract from script)
    // A simple regex to extract fountain TITLE
    let extractedTitle = "UNTITLED PROJECT";
    if (appState.screenplay) {
        const titleMatch = appState.screenplay.match(/TITLE:\s*(.+)/i);
        if (titleMatch) extractedTitle = titleMatch[1].trim();
    }
    document.getElementById('pitch-title').innerText = extractedTitle;
    document.getElementById('pitch-logline').innerText = appState.idea;

    // Tone, Intensity, Budget
    document.getElementById('pitch-tone').innerText = appState.tone;
    const intensityEl = document.getElementById('pitch-intensity-bar');
    if (intensityEl) intensityEl.style.width = appState.intensity + "%";
    document.getElementById('pitch-intensity-text').innerText = appState.intensity + "%";

    if (appState.productionPlan && appState.productionPlan.estimated_budget) {
        document.getElementById('pitch-budget').innerText = appState.productionPlan.estimated_budget;
    } else {
        document.getElementById('pitch-budget').innerText = "Generating...";
    }

    // Characters
    const charContainer = document.getElementById('pitch-characters');
    if (appState.characters && appState.characters.length > 0) {
        charContainer.innerHTML = '';
        // Show max 4 leads
        appState.characters.slice(0, 4).forEach(char => {
            const charHTML = `
                <div class="flex gap-4 bg-[#0a0a0c] border border-gray-800 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div class="w-16 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                        ${char.role.toLowerCase().includes('antagonist') ? '🦹' : '🎭'}
                    </div>
                    <div>
                        <h4 class="text-cinematic-neon font-bold uppercase tracking-wider text-sm mb-1">${char.name}</h4>
                        <p class="text-xs text-gray-400 font-light leading-snug break-all line-clamp-2">${char.role}</p>
                    </div>
                </div>`;
            charContainer.insertAdjacentHTML('beforeend', charHTML);
        });
    }

    // Core Locations
    const locContainer = document.getElementById('pitch-locations');
    if (appState.productionPlan && appState.productionPlan.key_locations) {
        locContainer.innerHTML = '';
        appState.productionPlan.key_locations.forEach(loc => {
            locContainer.insertAdjacentHTML('beforeend', `
                <li class="flex items-start gap-3">
                    <div class="w-1.5 h-1.5 rounded-full bg-cinematic-neon mt-1.5"></div>
                    <span class="text-sm text-gray-400">${loc}</span>
                </li>
            `);
        });
    }

    // Soundscape
    if (appState.soundPlan && appState.soundPlan.global_soundscape) {
        document.getElementById('pitch-soundscape').innerText = `"${appState.soundPlan.global_soundscape}"`;
    }
}

// 5. EXPORT LOGIC
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.export-btn');
    if (!btn) return;

    console.log("DIAGNOSTIC - Export button clicked:", btn.getAttribute('data-type'));

    if (!appState.screenplay) {
        console.warn("DIAGNOSTIC - Export aborted: No screenplay generated yet.");
        showToast("Cannot Export", "Generate a master script first.", true);
        return;
    }

    const selectedType = btn.getAttribute('data-type');
    console.log(`DIAGNOSTIC - Preparing to export: ${selectedType}`);
    showToast("Exporting", `Compiling PDF (${selectedType})...`, false);

    const originalText = btn.innerHTML;
    btn.innerHTML = `⏳...`;

    const payload = {
        exportType: selectedType,
        screenplay: appState.screenplay,
        characters: appState.characters,
        soundPlan: appState.soundPlan,
        productionPlan: appState.productionPlan,
        idea: appState.idea,
        tone: appState.tone,
        intensity: appState.intensity
    };

    console.log("DIAGNOSTIC - Payload ready:", Object.keys(payload));

    try {
        console.log("DIAGNOSTIC - Fetching /api/export-pdf");
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log("DIAGNOSTIC - Response Status:", response.status, response.statusText);
        console.log("DIAGNOSTIC - Response Content-Type:", response.headers.get('content-type'));

        if (response.ok) {
            const blob = await response.blob();
            console.log("DIAGNOSTIC - Blob received, size:", blob.size);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `scriptoria_export_${selectedType}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("Success", "PDF Exported!", false);
        } else {
            const errText = await response.text();
            console.error("DIAGNOSTIC - Export failed with text:", errText);
            let err;
            try { err = JSON.parse(errText); } catch (e) { err = { error: errText }; }
            throw new Error(err.error || "Export failed.");
        }
    } catch (err) {
        console.error("DIAGNOSTIC - Export Catch Error:", err);
        showToast("Export Error", err.message, true);
    } finally {
        btn.innerHTML = originalText;
    }
});

// --- CINEMATIC ANIMATIONS (GSAP) ---
document.addEventListener("DOMContentLoaded", () => {
    // Only run if GSAP is loaded
    if (typeof gsap !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        // 1. Reveal Major Sections on Scroll
        gsap.utils.toArray("section").forEach(section => {
            gsap.from(section, {
                scrollTrigger: {
                    trigger: section,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                },
                y: 40,
                opacity: 0,
                duration: 1.2,
                ease: "power3.out"
            });
        });

        // Removed Staggered Card Animation to prevent glitching/lagging on Pipeline cards
    }
});
