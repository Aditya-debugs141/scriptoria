// main.js - Client-Side Logic for Functional Scriptoria

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
    isDirty: false
};

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
    bindEvents();
});

// 2. EVENT BINDING
function bindEvents() {
    if (els.ideaInput) {
        els.ideaInput.addEventListener('input', () => {
            appState.isDirty = true;
            updateScreenplayTabUI();
        });
    }

    // Tab Switching
    els.tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            els.tabs.forEach(b => b.classList.remove('active', 'border-cinematic-neon', 'text-cinematic-neon', 'bg-cinematic-neon/5'));
            els.tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active', 'border-cinematic-neon', 'text-cinematic-neon', 'bg-cinematic-neon/5');
            const targetId = btn.getAttribute('data-target');

            if (btn.id === 'regenerate-screenplay-btn' && appState.isDirty && appState.screenplay) {
                appState.screenplay = null;
                appState.characters = null;
                appState.soundPlan = null;
                appState.productionPlan = null;
                appState.metadata = null;

                document.getElementById('screenplay-text').innerHTML = "";
                document.getElementById('characters-out').innerHTML = resetTabUI("🧠", "Psychological profiles will generate automatically.");
                document.getElementById('sound-out').innerHTML = resetTabUI("🎵", "Layered scene audio design will compile here.");
                document.getElementById('production-out').innerHTML = resetTabUI("🎬", "Visual breakdown (runtime, cast sizes) will load here.");

                generateStreamingScript();
            }

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
}

function updateScreenplayTabUI() {
    const tabText = document.getElementById('screenplay-tab-text');
    if (!tabText) return;

    if (appState.screenplay && appState.screenplay.length > 0) {
        tabText.innerHTML = "↻ Regenerate Screenplay";
    } else {
        tabText.innerHTML = "Screenplay";
    }
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
    // If not in state, attempt to pull from UI if stream finished
    const scriptElem = document.getElementById('typewriter-area');
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

    // Reset Output UI
    document.getElementById('characters-out').innerHTML = resetTabUI("🧠", "Analyzing Script...");
    document.getElementById('sound-out').innerHTML = resetTabUI("🎵", "Analyzing Script...");
    document.getElementById('production-out').innerHTML = resetTabUI("🎬", "Analyzing Script...");

    els.generateBtn.disabled = true;
    els.generateBtn.innerHTML = `<span class="animate-pulse">🧠 Orchestrating Engines...</span>`;
    els.statusText.innerText = "Status: Analyzing Scene Context...";
    els.statusText.classList.add('text-cinematic-accent');

    try {
        await extractMetadata();
        els.statusText.innerText = "Status: Spawning Secondary Engines...";

        // Auto trigger secondary engines concurrently
        await Promise.all([
            generateCharacters(),
            generateSound(),
            generateProduction()
        ]);

        els.statusText.innerText = "Status: Production Plan Complete.";
        els.statusText.classList.remove('text-cinematic-accent');
        els.statusText.classList.add('text-cinematic-neon');
        showToast("Success", "Secondary tools generated successfully.", false);

        // Auto-switch to Character Lab tab to show the user the new data
        const charTab = document.querySelector('[data-target="characters-out"]');
        if (charTab) charTab.click();

    } catch (err) {
        els.statusText.innerText = "Error: " + err.message;
        showToast("Error", "Generation failed. " + err.message, true);
    } finally {
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

async function generateStreamingScript() {
    const promptValue = els.ideaInput.value.trim();
    if (!promptValue) {
        showToast("Missing Idea", "Please enter a logline or concept in the Spark section.", true);
        return;
    }

    const btn = document.getElementById('generate-master-btn');
    const placeholder = document.getElementById('screenplay-placeholder');
    const outText = document.getElementById('screenplay-text');

    // UI Locking
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙️</span> Connecting Neural Engine...`;

    // Reveal text area
    placeholder.classList.add('opacity-0');
    setTimeout(() => {
        placeholder.classList.add('hidden');
        outText.classList.remove('hidden');
    }, 300);

    outText.innerHTML = "Establishing cinematic stream...\n\n";

    try {
        const payload = {
            idea: promptValue,
            tone: appState.tone,
            intensity: appState.intensity,
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
                            // Finished
                            appState.screenplay = outText.innerText;
                            appState.idea = promptValue;
                            appState.isDirty = false;
                            updateScreenplayTabUI();
                            showToast("Success", "Master Screenplay streaming complete.", false);

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
        // Unlock UI
        btn.disabled = false;
        btn.innerHTML = `✨ Generate Master Screenplay`;
    }
}

// 4. SECONDARY GENERATIONS (Characters, Sound, Production)

async function extractMetadata() {
    if (!appState.screenplay) return;
    try {
        const res = await fetch('/api/generate/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: appState.screenplay })
        });
        const data = await res.json();
        if (res.ok) {
            appState.metadata = data.metadata;
        }
    } catch (e) { console.error("Metadata error", e); }
}

async function generateCharacters() {
    if (!appState.screenplay) return;
    try {
        const res = await fetch('/api/generate/characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: appState.idea, script: appState.screenplay, tone: appState.tone, intensity: appState.intensity, metadata: appState.metadata })
        });
        const data = await res.json();
        if (res.ok) {
            appState.characters = data.characters;
            renderCharacters();
        }
    } catch (e) { console.error("Char error", e); }
}

async function generateSound() {
    if (!appState.screenplay) return;
    try {
        const res = await fetch('/api/generate/sound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: appState.idea, script: appState.screenplay, tone: appState.tone, intensity: appState.intensity, metadata: appState.metadata })
        });
        const data = await res.json();
        if (res.ok) {
            appState.soundPlan = data.sound;
            renderSound();
        }
    } catch (e) { console.error("Sound error", e); }
}

async function generateProduction() {
    if (!appState.screenplay) return;
    try {
        const res = await fetch('/api/generate/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: appState.idea, script: appState.screenplay, tone: appState.tone, intensity: appState.intensity, metadata: appState.metadata })
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
                <h4 class="font-bold text-white uppercase tracking-wider text-sm mb-2">Scene ${i + 1} Audio Blueprint</h4>
                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div><span class="text-xs text-gray-500 uppercase">Ambiance</span><p class="text-sm text-gray-300 font-light">${scene.ambiance || ''}</p></div>
                    <div><span class="text-xs text-gray-500 uppercase">Score Style</span><p class="text-sm text-gray-300 font-light">${scene.score_style || ''}</p></div>
                    <div class="col-span-2"><span class="text-xs text-gray-500 uppercase">SFX</span><p class="text-sm text-cinematic-accent font-mono mt-1">${(scene.sfx_list || []).join(' • ')}</p></div>
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
    if (targetId === 'production-out' && appState.productionPlan) renderProduction();
    if (targetId === 'tab-pitch') updatePitchModeUI();
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

        // 2. Staggered Card Animation (How it Works / Output Tabs)
        gsap.from(".grid > div", {
            scrollTrigger: {
                trigger: ".grid",
                start: "top 75%",
            },
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2, // Delays each card slightly for a wave effect
            ease: "power2.out"
        });
    }
});
