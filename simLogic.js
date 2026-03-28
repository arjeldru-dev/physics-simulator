
        const canvas = document.getElementById('simCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        let mirrors = [];
        let mirrorIdCounter = 0;
        let lightIdCounter = 0;
        let activeLightId = null;
        let lights = [];
        
        // UI State
        let drawMode = 'flat'; // flat, concave, convex, prism, moveLight
        let showNormals = false;
        let diffuseRefl = false;
        let showHuygens = false;
        let showVirtImage = false;
        let maxBounces = 8;

        let drawingStart = null;
        let drawingEnd = null;
        let currentPath = null;
        let hoveredId = null;
        let hoveredRotationHandle = null;
        
        let isMovingObj = false;
        let isRotatingObj = false;
        let movingObjId = null;
        let lastMousePos = null;

        let timeOffset = 0; // For Huygens animation

        // Measurement tool state
        let rulerPairs = [];
        let protractorPairs = [];
        let rulerFirstObj = null;
        let protractorFirstObj = null;
        let unitScale = 1;

        // Ray measurement data (refreshed each frame)
        let lastFrameRayData = []; // [{segments: [{x1,y1,x2,y2,len}], bounces: [{x,y,nx,ny,theta,inDx,inDy,outDx,outDy}]}]
        let rulerRaySegments = [];    // Selected ray segments to measure
        let protractorBounces = [];   // Selected bounce points to annotate

        // Problem challenge state
        let activeProblemId = null;
        let lockedMirrorIds = [];
        let lockedLightIds = [];
        let problemAnswers = {};
        let toastMessage = null;
        let toastTimer = null;

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : {r: 255, g: 255, b: 255};
        }

        // DOM Listeners
        const modes = ['flat', 'concave', 'convex', 'prism', 'freehand', 'moveLight', 'moveObj', 'toggleTwoSided', 'ruler', 'protractor'];
        function setDrawMode(m) {
            // Clear measurement state when leaving measurement modes
            if (drawMode === 'ruler' && m !== 'ruler') {
                rulerPairs = [];
                rulerFirstObj = null;
                rulerRaySegments = [];
            }
            if (drawMode === 'protractor' && m !== 'protractor') {
                protractorPairs = [];
                protractorFirstObj = null;
                protractorBounces = [];
            }
            // Also clear pending selection when switching between measurement modes
            if (m === 'ruler') { rulerFirstObj = null; }
            if (m === 'protractor') { protractorFirstObj = null; }
            drawMode = m;
            document.querySelectorAll('.mode-btn, #moveLightBtn, #moveObjBtn, #toggleTwoSidedBtn').forEach(b => b.classList.remove('active-btn'));
            document.getElementById(m+'Btn').classList.add('active-btn');
        }

        document.getElementById('flatBtn').onclick = () => setDrawMode('flat');
        document.getElementById('concaveBtn').onclick = () => setDrawMode('concave');
        document.getElementById('convexBtn').onclick = () => setDrawMode('convex');
        // document.getElementById('prismBtn').onclick = () => setDrawMode('prism');
        document.getElementById('freehandBtn').onclick = () => setDrawMode('freehand');
        document.getElementById('moveObjBtn').onclick = () => setDrawMode('moveObj');
        document.getElementById('moveLightBtn').onclick = () => setDrawMode('moveLight');
        document.getElementById('toggleTwoSidedBtn').onclick = () => setDrawMode('toggleTwoSided');
        document.getElementById('rulerBtn').onclick = () => setDrawMode('ruler');
        document.getElementById('protractorBtn').onclick = () => setDrawMode('protractor');

        // Unit scale input
        document.getElementById('unitScaleInput').oninput = e => {
            let v = parseFloat(e.target.value);
            if (isNaN(v) || v < 0.01) v = 0.01;
            if (v > 100) v = 100;
            unitScale = v;
        };

        // Clear measurements button
        document.getElementById('clearMeasurementsBtn').onclick = () => {
            rulerPairs = [];
            protractorPairs = [];
            rulerFirstObj = null;
            protractorFirstObj = null;
            rulerRaySegments = [];
            protractorBounces = [];
        };

        function updateLightUI() {
            const select = document.getElementById('lightSelect');
            if (select) {
                select.innerHTML = '';
                if (lights.length === 0) {
                    const opt = document.createElement('option');
                    opt.value = "";
                    opt.innerText = 'No Lights placed';
                    select.appendChild(opt);
                } else {
                    for (let i = 0; i < lights.length; i++) {
                        const opt = document.createElement('option');
                        opt.value = lights[i].id;
                        opt.innerText = 'Light ' + lights[i].id;
                        if (lights[i].id === activeLightId) opt.selected = true;
                        select.appendChild(opt);
                    }
                }
            }
            
            const l = lights.find(l => l.id === activeLightId);
            if (!l) {
                // Disable UI if no lights
                document.getElementById('pointLightBtn').classList.remove('active-pill');
                document.getElementById('laserBtn').classList.remove('active-pill');
                document.getElementById('laserControlsWrapper').classList.add('hidden');
                document.getElementById('raysVal').innerText = '1';
                document.getElementById('spreadVal').innerText = '5°';
                return;
            }
            
            if (l.mode === 'point') {
                document.getElementById('pointLightBtn').classList.add('active-pill');
                document.getElementById('laserBtn').classList.remove('active-pill');
                document.getElementById('laserControlsWrapper').classList.add('hidden');
            } else {
                document.getElementById('laserBtn').classList.add('active-pill');
                document.getElementById('pointLightBtn').classList.remove('active-pill');
                document.getElementById('laserControlsWrapper').classList.remove('hidden');
            }
            document.getElementById('raysSlider').value = l.rays;
            document.getElementById('raysVal').innerText = l.rays;
            document.getElementById('spreadSlider').value = l.spread;
            document.getElementById('spreadVal').innerText = l.spread + '°';
            document.getElementById('aimSlider').value = l.aim;
            document.getElementById('lightColor').value = l.color;
        }

        const addLightBtn = document.getElementById('addLightBtn');
        if (addLightBtn) {
            addLightBtn.onclick = () => {
                lightIdCounter++;
                const newLight = { id: lightIdCounter, x: window.innerWidth/4 + Math.random()*50, y: window.innerHeight/2 + Math.random()*50, mode: 'point', rays: 1, spread: 5, aim: 0, color: '#FFFFFF', colorRgb: {r: 255, g: 255, b: 255} };
                lights.push(newLight);
                activeLightId = newLight.id;
                updateLightUI();
            };
        }

        const delLightBtn = document.getElementById('delLightBtn');
        if (delLightBtn) {
            delLightBtn.onclick = () => {
                if (lights.length > 0) {
                    lights = lights.filter(l => l.id !== activeLightId);
                    if (lights.length > 0) {
                        activeLightId = lights[0].id;
                    } else {
                        activeLightId = null;
                    }
                    updateLightUI();
                }
            };
        }

        document.getElementById('pointLightBtn').onclick = () => {
            const l = lights.find(l => l.id === activeLightId);
            if(l) { l.mode = 'point'; updateLightUI(); }
        };
        document.getElementById('laserBtn').onclick = () => {
            const l = lights.find(l => l.id === activeLightId);
            if(l) { l.mode = 'laser'; updateLightUI(); }
        };

        document.getElementById('raysSlider').oninput = e => { const l = lights.find(l => l.id === activeLightId); if(l) { l.rays = parseInt(e.target.value); document.getElementById('raysVal').innerText = l.rays; } };
        document.getElementById('spreadSlider').oninput = e => { const l = lights.find(l => l.id === activeLightId); if(l) { l.spread = parseInt(e.target.value); document.getElementById('spreadVal').innerText = l.spread + '°'; } };
        document.getElementById('aimSlider').oninput = e => { const l = lights.find(l => l.id === activeLightId); if(l) l.aim = parseInt(e.target.value); };

        const lightSelect = document.getElementById('lightSelect');
        if (lightSelect) {
            lightSelect.addEventListener('change', (e) => {
                activeLightId = parseInt(e.target.value);
                updateLightUI();
            });
        }
        // Initialize UI safely on load bounds
        updateLightUI();

        document.getElementById('normalsToggle').onchange = e => showNormals = e.target.checked;
        document.getElementById('diffuseToggle').onchange = e => diffuseRefl = e.target.checked;
        document.getElementById('huygensToggle').onchange = e => showHuygens = e.target.checked;
        document.getElementById('virtImgToggle').onchange = e => showVirtImage = e.target.checked;

        document.getElementById('bouncesSlider').oninput = e => { maxBounces = parseInt(e.target.value); document.getElementById('bouncesVal').innerText = maxBounces; };

        document.getElementById('lightColor').oninput = e => { const l = lights.find(l => l.id === activeLightId); if(l) { l.color = e.target.value; l.colorRgb = hexToRgb(l.color); } };
        document.getElementById('clearBtn').onclick = () => { mirrors = []; lights = [{ id: 1, x: window.innerWidth / 2, y: window.innerHeight / 2, mode: 'point', rays: 1, spread: 5, aim: 0, color: '#FFFFFF', colorRgb: {r: 255, g: 255, b: 255} }]; activeLightId = 1; updateLightUI(); };

        // --- Guide & Tour Logic ---
        const GuideManager = {
            currentStep: 0,
            steps: [
                {
                    title: "Light Source",
                    text: "Configure your light here. You can add multiple lights, change their type to Laser, and delete the active light to start fresh.",
                    target: "#addLightBtn",
                    position: "right"
                },
                {
                    title: "Optical Elements",
                    text: "Choose between flat mirrors, curved lenses, or even freehand drawing. Each element reacts differently to light!",
                    target: "#flatBtn",
                    position: "right"
                },
                {
                    title: "The Workshop",
                    text: "Click and drag anywhere here to place your elements. You can move or rotate them later using the 'Move' modes in the top bar.",
                    target: "#canvas-container",
                    position: "center"
                },
                {
                    title: "Cleanup & Reset",
                    text: "Use 'Clear Canvas' at any time to remove all placed mirrors and reset to the default workspace.",
                    target: "#clearBtn",
                    position: "bottom"
                },
                {
                    title: "Physics Engine",
                    text: "Toggle advanced simulations like Huygens Wavelets or Virtual Image tracing to see the true nature of light propagation.",
                    target: "#normalsToggle",
                    position: "right"
                }
            ],

            init() {
                this.modal = document.getElementById('welcomeModal');
                this.overlay = document.getElementById('tourOverlay');
                this.highlight = document.getElementById('tourHighlight');
                this.popover = document.getElementById('tourPopover');
                
                // Event Listeners
                document.getElementById('helpBtn').onclick = () => this.showWelcome();
                document.getElementById('startTourBtn').onclick = () => this.startTour();
                document.getElementById('skipTourBtn').onclick = () => this.hideWelcome();
                document.getElementById('tourNext').onclick = () => this.nextStep();
                document.getElementById('tourPrev').onclick = () => this.prevStep();
                
                document.getElementById('toggleSidebarHelp').onclick = () => {
                    const content = document.getElementById('sidebar-help-content');
                    const chevron = document.getElementById('helpChevron');
                    content.classList.toggle('expanded');
                    chevron.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
                };

                // Check first visit
                if (!localStorage.getItem('opticspace_visited')) {
                    setTimeout(() => this.showWelcome(), 1000);
                    localStorage.setItem('opticspace_visited', 'true');
                }
            },

            showWelcome() {
                this.modal.classList.add('active');
            },

            hideWelcome() {
                this.modal.classList.remove('active');
            },

            startTour() {
                this.hideWelcome();
                this.overlay.classList.remove('hidden');
                this.currentStep = 0;
                this.showStep();
            },

            showStep() {
                const step = this.steps[this.currentStep];
                const targetEl = document.querySelector(step.target);
                const rect = targetEl.getBoundingClientRect();
                
                // Highlight
                this.highlight.style.top = (rect.top - 5) + 'px';
                this.highlight.style.left = (rect.left - 5) + 'px';
                this.highlight.style.width = (rect.width + 10) + 'px';
                this.highlight.style.height = (rect.height + 10) + 'px';
                this.highlight.classList.add('active');

                // Popover Position
                let popTop = rect.top;
                let popLeft = rect.right + 20;

                if (step.position === "center") {
                    popLeft = rect.left + (rect.width / 2) - 130;
                    popTop = rect.top + (rect.height / 2) - 50;
                } else if (popLeft + 260 > window.innerWidth) {
                    popLeft = rect.left - 280;
                }

                this.popover.style.top = popTop + 'px';
                this.popover.style.left = popLeft + 'px';
                this.popover.classList.add('active');

                // Content
                document.getElementById('tourTitle').innerText = step.title;
                document.getElementById('tourText').innerText = step.text;
                document.getElementById('tourProgress').innerText = `${this.currentStep + 1} / ${this.steps.length}`;
            },

            nextStep() {
                if (this.currentStep < this.steps.length - 1) {
                    this.currentStep++;
                    this.showStep();
                } else {
                    this.endTour();
                }
            },

            prevStep() {
                if (this.currentStep > 0) {
                    this.currentStep--;
                    this.showStep();
                }
            },

            endTour() {
                this.overlay.classList.add('hidden');
                this.highlight.classList.remove('active');
                this.popover.classList.remove('active');
            }
        };

        // Initialize Guide
        GuideManager.init();

        // === PROBLEM CHALLENGE SYSTEM ===

        function showToast(msg) {
            toastMessage = msg;
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { toastMessage = null; }, 2500);
        }

        function isElementLocked(type, id) {
            if (!activeProblemId) return false;
            if (type === 'mirror') return lockedMirrorIds.includes(id);
            if (type === 'light') return lockedLightIds.includes(id);
            return false;
        }

        function createFlatMirrorByAngle(cx, cy, length, angleDeg, twoSided) {
            const angleRad = angleDeg * Math.PI / 180;
            const halfLen = length / 2;
            mirrorIdCounter++;
            return {
                id: mirrorIdCounter, type: 'flat',
                x1: cx - halfLen * Math.cos(angleRad), y1: cy + halfLen * Math.sin(angleRad),
                x2: cx + halfLen * Math.cos(angleRad), y2: cy - halfLen * Math.sin(angleRad),
                twoSided: twoSided || false
            };
        }

        function createConcaveMirrorByDrag(startX, startY, endX, endY) {
            const dx = endX - startX, dy = endY - startY;
            const len = Math.hypot(dx, dy);
            const r = len * 0.8;
            const midX = (startX + endX) / 2, midY = (startY + endY) / 2;
            let nx = -dy / len, ny = dx / len;
            const h = Math.sqrt(r * r - (len / 2) * (len / 2));
            const cx = midX + nx * h, cy = midY + ny * h;
            let a1 = Math.atan2(startY - cy, startX - cx);
            let a2 = Math.atan2(endY - cy, endX - cx);
            if (a1 < 0) a1 += 2 * Math.PI;
            if (a2 < 0) a2 += 2 * Math.PI;
            mirrorIdCounter++;
            return { id: mirrorIdCounter, type: 'arc', concave: true, cx, cy, r, a1, a2, len };
        }

        const PROBLEMS = [
            {
                id: 1,
                title: "LAW OF REFLECTION",
                icon: "bolt",
                description: "A laser beam strikes a flat mirror at an angle. Use the protractor tool to click the bounce point and measure the angles of incidence and reflection. Verify: θᵢ = θᵣ.",
                objectives: ["Measure θᵢ at the bounce point", "Measure θᵣ at the bounce point", "Confirm the law: θᵢ = θᵣ"],
                setup: function(cw, ch) {
                    mirrorIdCounter = 0;
                    const mirror = createFlatMirrorByAngle(cw * 0.5, ch * 0.55, Math.min(280, cw * 0.35), 35, true);
                    return {
                        mirrors: [mirror],
                        lights: [{ id: 1, x: cw * 0.5, y: ch * 0.12, mode: 'laser', rays: 1, spread: 5, aim: 90, color: '#FFFFFF', colorRgb: { r: 255, g: 255, b: 255 } }],
                        renderSettings: { showNormals: true, diffuseRefl: false, showHuygens: false, showVirtImage: false, maxBounces: 2 },
                        lockedMirrorIds: [mirror.id], lockedLightIds: []
                    };
                },
                questions: [
                    { type: 'numeric', prompt: "Click the bounce point with the Protractor tool (P). What is the angle of incidence (θᵢ) in degrees?", hint: "Press P to activate Protractor, then click where the laser hits the mirror. The yellow arc shows θᵢ.", expected: 35, tolerance: 3, unit: '°' },
                    { type: 'numeric', prompt: "What is the angle of reflection (θᵣ) in degrees?", hint: "The cyan arc at the same bounce point shows θᵣ.", expected: 35, tolerance: 3, unit: '°' },
                    { type: 'multiple_choice', prompt: "Based on your measurements, what is the relationship between θᵢ and θᵣ?", options: ["θᵢ is always larger than θᵣ", "θᵢ equals θᵣ", "θᵢ is always smaller than θᵣ", "There is no fixed relationship"], correctIndex: 1, explanation: "The Law of Reflection states that the angle of incidence always equals the angle of reflection (θᵢ = θᵣ)." }
                ]
            },
            {
                id: 2,
                title: "THE CORNER REFLECTOR",
                icon: "corners",
                description: "Two flat mirrors are arranged at 90° forming an L-shape. A laser enters at an angle. Use the measurement tools to analyze the reflection behavior and discover the retroreflection property.",
                objectives: ["Measure the angle between mirrors", "Count the bounces", "Determine exit ray direction"],
                setup: function(cw, ch) {
                    mirrorIdCounter = 0;
                    const horizMirror = { id: ++mirrorIdCounter, type: 'flat', x1: cw * 0.3, y1: ch * 0.65, x2: cw * 0.65, y2: ch * 0.65, twoSided: true };
                    const vertMirror = { id: ++mirrorIdCounter, type: 'flat', x1: cw * 0.65, y1: ch * 0.65, x2: cw * 0.65, y2: ch * 0.3, twoSided: true };
                    return {
                        mirrors: [horizMirror, vertMirror],
                        lights: [{ id: 1, x: cw * 0.2, y: ch * 0.35, mode: 'laser', rays: 1, spread: 5, aim: 30, color: '#FFFFFF', colorRgb: { r: 255, g: 255, b: 255 } }],
                        renderSettings: { showNormals: true, diffuseRefl: false, showHuygens: false, showVirtImage: false, maxBounces: 4 },
                        lockedMirrorIds: [1, 2], lockedLightIds: []
                    };
                },
                questions: [
                    { type: 'numeric', prompt: "Use the Protractor tool to measure the angle between the two mirrors (click one mirror, then the other). What angle do they form?", hint: "Press P, click the horizontal mirror, then click the vertical mirror.", expected: 90, tolerance: 3, unit: '°' },
                    { type: 'numeric', prompt: "How many times does the laser beam bounce inside the corner reflector?", hint: "Count the number of reflection points. Toggle Normals ON to see them clearly.", expected: 2, tolerance: 0, unit: '' },
                    { type: 'multiple_choice', prompt: "Try aiming the laser at different angles (adjust the AIM slider). The exiting ray always travels:", options: ["At 90° to the incoming ray", "Parallel to the incoming ray but opposite direction", "Along the surface of one of the mirrors", "At a random angle each time"], correctIndex: 1, explanation: "A corner reflector (two mirrors at 90°) always sends light back parallel to its entry direction. This is called retroreflection — used in road signs and lunar reflectors!" }
                ]
            },
            {
                id: 3,
                title: "CONCAVE MIRROR FOCUS",
                icon: "filter_center_focus",
                description: "A concave mirror is hit by multiple parallel laser rays. Observe how the reflected rays converge and use the ruler tool to measure the focal length — the distance from the mirror surface to where the rays meet.",
                objectives: ["Observe ray convergence", "Measure the focal length", "Understand concave vs convex"],
                setup: function(cw, ch) {
                    mirrorIdCounter = 0;
                    const mirror = createConcaveMirrorByDrag(cw * 0.65, ch * 0.2, cw * 0.65, ch * 0.8);
                    return {
                        mirrors: [mirror],
                        lights: [{ id: 1, x: cw * 0.1, y: ch * 0.5, mode: 'laser', rays: 5, spread: 8, aim: 0, color: '#FFFFFF', colorRgb: { r: 255, g: 255, b: 255 } }],
                        renderSettings: { showNormals: false, diffuseRefl: false, showHuygens: false, showVirtImage: false, maxBounces: 1 },
                        lockedMirrorIds: [mirror.id], lockedLightIds: [],
                        dynamicExpected: function(mirror) { return { 1: Math.round(mirror.r / 2) }; }
                    };
                },
                questions: [
                    { type: 'multiple_choice', prompt: "After hitting the concave mirror, do the reflected rays converge or diverge?", options: ["They converge (meet at a point)", "They diverge (spread apart)", "They remain parallel", "They scatter randomly"], correctIndex: 0, explanation: "A concave mirror focuses incoming parallel rays to a single point called the focal point (F), shown as the red dot." },
                    { type: 'numeric', prompt: "Use the Ruler tool (R) to click the red focal point (F), then click the mirror surface. What is the focal length in pixels?", hint: "Press R to activate Ruler. Click the red F dot, then click the mirror. The measurement label shows the distance.", expected: 0, tolerance: 20, unit: 'px', isDynamic: true, dynamicKey: 1 },
                    { type: 'multiple_choice', prompt: "If this concave mirror were replaced with a convex mirror, the reflected rays would:", options: ["Still converge at the same point", "Converge at twice the distance", "Diverge (spread apart)", "Be absorbed completely"], correctIndex: 2, explanation: "A convex mirror causes parallel rays to diverge after reflection. The focal point of a convex mirror is virtual (behind the mirror)." }
                ]
            }
        ];

        const ProblemManager = {
            currentProblem: null,
            scene: null,
            questionStates: [],
            wrongCounts: [],

            init() {
                this.renderProblemList();
                const resetBtn = document.getElementById('resetProblemBtn');
                const exitBtn = document.getElementById('exitProblemBtn');
                if (resetBtn) resetBtn.onclick = () => this.resetProblem();
                if (exitBtn) exitBtn.onclick = () => this.exitProblem();
            },

            renderProblemList() {
                const container = document.getElementById('problemList');
                if (!container) return;
                container.innerHTML = '';
                PROBLEMS.forEach(p => {
                    const completed = problemAnswers[p.id] && problemAnswers[p.id].every(a => a === true);
                    const btn = document.createElement('button');
                    btn.className = 'w-full flex items-center gap-3 px-3 py-2.5 border text-left transition-all duration-200 ' +
                        (activeProblemId === p.id ? 'border-[#00f0ff] bg-[#00f0ff]/5 text-[#00f0ff]' : 'border-[#3b494b]/50 hover:border-[#3b494b] text-[#849495] hover:text-[#b9cacb]');
                    btn.innerHTML = '<span class="material-symbols-outlined text-sm">' + p.icon + '</span>' +
                        '<span class="text-[9px] font-[\'IBM_Plex_Mono\'] tracking-wider flex-1">' + p.title + '</span>' +
                        (completed ? '<span class="material-symbols-outlined text-xs text-green-400">check_circle</span>' : '');
                    btn.onclick = () => this.loadProblem(p.id);
                    container.appendChild(btn);
                });
            },

            loadProblem(id) {
                const problem = PROBLEMS.find(p => p.id === id);
                if (!problem) return;
                this.currentProblem = problem;
                activeProblemId = id;
                const cw = canvas.width, ch = canvas.height;
                const scene = problem.setup(cw, ch);
                this.scene = scene;

                // Apply scene
                mirrors = [...scene.mirrors];
                lights = scene.lights.map(l => ({...l}));
                mirrorIdCounter = Math.max(...mirrors.map(m => m.id), 0);
                lightIdCounter = Math.max(...lights.map(l => l.id), 0);
                activeLightId = lights.length > 0 ? lights[0].id : null;
                lockedMirrorIds = scene.lockedMirrorIds || [];
                lockedLightIds = scene.lockedLightIds || [];

                // Apply render settings
                const rs = scene.renderSettings;
                showNormals = rs.showNormals; document.getElementById('normalsToggle').checked = showNormals;
                diffuseRefl = rs.diffuseRefl; document.getElementById('diffuseToggle').checked = diffuseRefl;
                showHuygens = rs.showHuygens; document.getElementById('huygensToggle').checked = showHuygens;
                showVirtImage = rs.showVirtImage; document.getElementById('virtImgToggle').checked = showVirtImage;
                maxBounces = rs.maxBounces; document.getElementById('bouncesSlider').value = maxBounces; document.getElementById('bouncesVal').innerText = maxBounces;

                // Compute dynamic expected values
                if (scene.dynamicExpected) {
                    const dynVals = scene.dynamicExpected(mirrors[0]);
                    problem.questions.forEach((q, i) => {
                        if (q.isDynamic && dynVals[q.dynamicKey] !== undefined) {
                            q.expected = dynVals[q.dynamicKey];
                        }
                    });
                }

                // Reset answers
                if (!problemAnswers[id]) problemAnswers[id] = problem.questions.map(() => false);
                this.questionStates = problemAnswers[id];
                this.wrongCounts = problem.questions.map(() => 0);

                // Clear measurement state
                rulerPairs = []; protractorPairs = []; rulerFirstObj = null; protractorFirstObj = null;
                rulerRaySegments = []; protractorBounces = [];

                updateLightUI();
                this.renderProblemList();
                this.renderProblemDetail();

                // Open right sidebar if closed
                const rs2 = document.getElementById('rightSidebar');
                if (rs2 && rs2.classList.contains('collapsed')) {
                    document.getElementById('toggleRightBtn')?.click();
                }
            },

            renderProblemDetail() {
                const problem = this.currentProblem;
                if (!problem) return;
                document.getElementById('noProblemSelected')?.classList.add('hidden');
                document.getElementById('activeProblemView')?.classList.remove('hidden');
                document.getElementById('problemActions')?.classList.remove('hidden');
                document.getElementById('problemTitle').innerText = problem.title;
                document.getElementById('problemDescription').innerText = problem.description;

                // Objectives
                const objContainer = document.getElementById('problemObjectives');
                objContainer.innerHTML = '';
                problem.objectives.forEach((obj, i) => {
                    const done = this.questionStates[i];
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 text-[9px] font-[\'IBM_Plex_Mono\']';
                    div.innerHTML = '<span class="material-symbols-outlined text-xs ' + (done ? 'text-green-400' : 'text-[#3b494b]') + '">' + (done ? 'check_box' : 'check_box_outline_blank') + '</span>' +
                        '<span class="' + (done ? 'text-green-400 line-through' : 'text-[#849495]') + '">' + obj + '</span>';
                    objContainer.appendChild(div);
                });

                // Questions
                const qContainer = document.getElementById('problemQuestions');
                qContainer.innerHTML = '';
                problem.questions.forEach((q, i) => {
                    const answered = this.questionStates[i];
                    const div = document.createElement('div');
                    div.className = 'p-3 border border-[#3b494b]/50 bg-[#0d0e10]/50 space-y-2';
                    let html = '<div class="flex items-center gap-2 mb-1"><span class="text-[8px] font-[\'IBM_Plex_Mono\'] tracking-widest text-[#3b494b]">Q' + (i + 1) + '/' + problem.questions.length + '</span></div>';
                    html += '<p class="text-[10px] font-[\'IBM_Plex_Mono\'] text-[#b9cacb] leading-relaxed">' + q.prompt + '</p>';

                    if (answered) {
                        html += '<div class="flex items-center gap-2 p-2 border border-green-500/30 bg-green-500/5"><span class="material-symbols-outlined text-green-400 text-sm">check_circle</span><span class="text-[9px] font-[\'IBM_Plex_Mono\'] text-green-400">CORRECT</span></div>';
                        if (q.explanation) html += '<p class="text-[9px] font-[\'IBM_Plex_Mono\'] text-[#849495] italic leading-relaxed">' + q.explanation + '</p>';
                    } else if (q.type === 'numeric') {
                        html += '<div class="flex items-center gap-2"><input type="number" id="q' + i + 'Input" class="w-20 bg-[#0d0e10] border border-[#3b494b] text-[11px] font-[\'IBM_Plex_Mono\'] p-1.5 text-center text-[#e3e2e5] focus:outline-none focus:border-[#00f0ff]" placeholder="..." />';
                        if (q.unit) html += '<span class="text-[10px] font-[\'IBM_Plex_Mono\'] text-[#3b494b]">' + q.unit + '</span>';
                        html += '<button onclick="ProblemManager.submitAnswer(' + i + ')" class="px-3 py-1.5 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[9px] font-[\'IBM_Plex_Mono\'] text-[#00f0ff] tracking-wider hover:bg-[#00f0ff]/20 transition-all">CHECK</button></div>';
                        html += '<div id="q' + i + 'Feedback" class="hidden"></div>';
                        if (this.wrongCounts[i] >= 2 && q.hint) html += '<p class="text-[9px] font-[\'IBM_Plex_Mono\'] text-[#ffc832] flex items-center gap-1"><span class="material-symbols-outlined text-xs">lightbulb</span>' + q.hint + '</p>';
                    } else if (q.type === 'multiple_choice') {
                        q.options.forEach((opt, oi) => {
                            html += '<button onclick="ProblemManager.submitMC(' + i + ',' + oi + ')" class="w-full text-left px-3 py-2 border border-[#3b494b]/50 text-[9px] font-[\'IBM_Plex_Mono\'] text-[#849495] hover:border-[#00f0ff]/50 hover:text-[#b9cacb] hover:bg-[#00f0ff]/5 transition-all mb-1" id="q' + i + 'opt' + oi + '">' + String.fromCharCode(65 + oi) + ') ' + opt + '</button>';
                        });
                        html += '<div id="q' + i + 'Feedback" class="hidden"></div>';
                    }
                    div.innerHTML = html;
                    qContainer.appendChild(div);
                });

                // Progress
                const answered = this.questionStates.filter(s => s).length;
                const total = problem.questions.length;
                document.getElementById('progressText').innerText = answered + '/' + total;
                document.getElementById('progressBar').style.width = (answered / total * 100) + '%';
                const banner = document.getElementById('completionBanner');
                if (answered === total) { banner?.classList.remove('hidden'); } else { banner?.classList.add('hidden'); }
            },

            submitAnswer(qIndex) {
                const q = this.currentProblem.questions[qIndex];
                const input = document.getElementById('q' + qIndex + 'Input');
                const feedback = document.getElementById('q' + qIndex + 'Feedback');
                if (!input || !feedback) return;
                const val = parseFloat(input.value);
                if (isNaN(val)) { showToast('Enter a number'); return; }
                if (Math.abs(val - q.expected) <= q.tolerance) {
                    this.questionStates[qIndex] = true;
                    problemAnswers[this.currentProblem.id] = [...this.questionStates];
                    this.renderProblemDetail();
                    this.renderProblemList();
                } else {
                    this.wrongCounts[qIndex]++;
                    feedback.className = 'flex items-center gap-2 p-2 border border-red-500/30 bg-red-500/5';
                    feedback.innerHTML = '<span class="material-symbols-outlined text-red-400 text-sm">close</span><span class="text-[9px] font-[\'IBM_Plex_Mono\'] text-red-400">Incorrect — try again' + (this.wrongCounts[qIndex] >= 2 && q.hint ? '' : '') + '</span>';
                    if (this.wrongCounts[qIndex] >= 2) this.renderProblemDetail();
                }
            },

            submitMC(qIndex, optIndex) {
                const q = this.currentProblem.questions[qIndex];
                const feedback = document.getElementById('q' + qIndex + 'Feedback');
                if (optIndex === q.correctIndex) {
                    this.questionStates[qIndex] = true;
                    problemAnswers[this.currentProblem.id] = [...this.questionStates];
                    this.renderProblemDetail();
                    this.renderProblemList();
                } else {
                    const btn = document.getElementById('q' + qIndex + 'opt' + optIndex);
                    if (btn) { btn.style.borderColor = 'rgba(239,68,68,0.5)'; btn.style.color = '#ef4444'; btn.style.backgroundColor = 'rgba(239,68,68,0.05)'; }
                    if (feedback) {
                        feedback.className = 'flex items-center gap-2 p-2 border border-red-500/30 bg-red-500/5 mt-1';
                        feedback.innerHTML = '<span class="material-symbols-outlined text-red-400 text-sm">close</span><span class="text-[9px] font-[\'IBM_Plex_Mono\'] text-red-400">Not quite — try another option</span>';
                    }
                }
            },

            resetProblem() {
                if (!this.currentProblem) return;
                problemAnswers[this.currentProblem.id] = this.currentProblem.questions.map(() => false);
                this.loadProblem(this.currentProblem.id);
            },

            exitProblem() {
                activeProblemId = null;
                lockedMirrorIds = [];
                lockedLightIds = [];
                this.currentProblem = null;
                this.scene = null;
                document.getElementById('noProblemSelected')?.classList.remove('hidden');
                document.getElementById('activeProblemView')?.classList.add('hidden');
                document.getElementById('problemActions')?.classList.add('hidden');
                this.renderProblemList();
            }
        };

        // Interaction
        canvas.addEventListener('mousedown', e => {
            if (e.target !== canvas) return;
            const mouseX = e.offsetX; const mouseY = e.offsetY;
            
            if (drawMode === 'ruler') {
                // First: check if click is near a ray segment (single-click measure)
                let hitRaySeg = null;
                const rayMinDist = 8;
                for (const rayData of lastFrameRayData) {
                    for (const seg of rayData.segments) {
                        const d = distToSegment(mouseX, mouseY, seg.x1, seg.y1, seg.x2, seg.y2);
                        if (d < rayMinDist) {
                            hitRaySeg = seg;
                            break;
                        }
                    }
                    if (hitRaySeg) break;
                }
                if (hitRaySeg) {
                    // Toggle: if already selected, deselect; else add
                    const existing = rulerRaySegments.findIndex(s => s.x1 === hitRaySeg.x1 && s.y1 === hitRaySeg.y1 && s.x2 === hitRaySeg.x2 && s.y2 === hitRaySeg.y2);
                    if (existing >= 0) {
                        rulerRaySegments.splice(existing, 1);
                    } else {
                        rulerRaySegments.push({...hitRaySeg});
                    }
                    return;
                }
                // Second: fall through to object-to-object measurement
                const hit = hitTestObject(mouseX, mouseY);
                if (!hit) return;
                if (!rulerFirstObj) {
                    rulerFirstObj = hit;
                } else {
                    if (rulerFirstObj.type === hit.type && rulerFirstObj.id === hit.id) return;
                    rulerPairs.push({ objA: rulerFirstObj, objB: hit });
                    rulerFirstObj = null;
                }
            } else if (drawMode === 'protractor') {
                // First: check if click is near a bounce point (single-click annotate)
                let hitBounce = null;
                const bounceMinDist = 12;
                for (const rayData of lastFrameRayData) {
                    for (const bounce of rayData.bounces) {
                        const d = Math.hypot(mouseX - bounce.x, mouseY - bounce.y);
                        if (d < bounceMinDist) {
                            hitBounce = bounce;
                            break;
                        }
                    }
                    if (hitBounce) break;
                }
                if (hitBounce) {
                    // Toggle: if already annotated, remove; else add
                    const existing = protractorBounces.findIndex(b => Math.hypot(b.x - hitBounce.x, b.y - hitBounce.y) < 2);
                    if (existing >= 0) {
                        protractorBounces.splice(existing, 1);
                    } else {
                        protractorBounces.push({...hitBounce});
                    }
                    return;
                }
                // Second: fall through to mirror-to-mirror measurement
                const hit = hitTestObject(mouseX, mouseY);
                if (!hit || hit.type !== 'mirror') return;
                if (!protractorFirstObj) {
                    protractorFirstObj = hit;
                } else {
                    if (protractorFirstObj.id === hit.id) return;
                    protractorPairs.push({ mirrorA: protractorFirstObj, mirrorB: hit });
                    protractorFirstObj = null;
                }
            } else if (drawMode === 'moveLight') {
                let clickedLight = null;
                for (const l of lights) {
                    if (Math.hypot(mouseX - l.x, mouseY - l.y) < 15) {
                        clickedLight = l;
                        break;
                    }
                }
                if (clickedLight) {
                    activeLightId = clickedLight.id;
                    updateLightUI();
                } else {
                    const l = lights.find(l => l.id === activeLightId);
                    if (l) {
                        if (isElementLocked('light', l.id)) { showToast('⊘ LOCKED — This light is fixed for this challenge'); return; }
                        l.x = mouseX; l.y = mouseY;
                    }
                }
            } else if (drawMode === 'moveObj') {
                if (hoveredRotationHandle !== null) {
                    if (isElementLocked('mirror', hoveredRotationHandle)) { showToast('⊘ LOCKED — This element is fixed for this challenge'); return; }
                    isRotatingObj = true;
                    movingObjId = hoveredRotationHandle;
                    lastMousePos = {x: mouseX, y: mouseY};
                } else if (hoveredId !== null) {
                    if (isElementLocked('mirror', hoveredId)) { showToast('⊘ LOCKED — This element is fixed for this challenge'); return; }
                    isMovingObj = true;
                    movingObjId = hoveredId;
                    lastMousePos = {x: mouseX, y: mouseY};
                }
            } else if (drawMode === 'toggleTwoSided') {
                if (hoveredId !== null) {
                    if (isElementLocked('mirror', hoveredId)) { showToast('⊘ LOCKED — This element is fixed for this challenge'); return; }
                    const m = mirrors.find(m => m.id === hoveredId);
                    if (m && m.type !== 'arc') {
                        m.twoSided = !m.twoSided;
                    }
                }
            } else if (drawMode === 'freehand') {
                currentPath = [{x: mouseX, y: mouseY}];
            } else {
                drawingStart = {x: mouseX, y: mouseY};
                drawingEnd = {x: mouseX, y: mouseY};
            }
        });

        canvas.addEventListener('mousemove', e => {
            const mouseX = e.offsetX; const mouseY = e.offsetY;
            
            // Highlight hover targets
            hoveredId = null;
            hoveredRotationHandle = null;
            const tooltip = document.getElementById('mirror-tooltip');
            
            if (!isMovingObj && !isRotatingObj && !drawingStart && drawMode !== 'moveLight') {
                const minDist = 15;
                for (const m of mirrors) {
                    // Check rotation handle first
                    let hx, hy;
                    if (m.type === 'flat') {
                        hx = (m.x1 + m.x2) / 2; hy = (m.y1 + m.y2) / 2;
                        const dx = m.x2 - m.x1; const dy = m.y2 - m.y1;
                        const len = Math.hypot(dx, dy);
                        hx += (-dy / len) * 20; hy += (dx / len) * 20;
                    } else if (m.type === 'arc') {
                        let midAng = getArcMidAng(m);
                        const hr = m.concave ? m.r - 20 : m.r + 20;
                        hx = m.cx + Math.cos(midAng) * hr;
                        hy = m.cy + Math.sin(midAng) * hr;
                    } else if (m.type === 'freehand') {
                        let cx = 0, cy = 0;
                        for (let pt of m.points) { cx += pt.x; cy += pt.y; }
                        cx /= m.points.length; cy /= m.points.length;
                        hx = cx; hy = cy - 30;
                    }
                    if (Math.hypot(mouseX - hx, mouseY - hy) < 12) {
                        hoveredRotationHandle = m.id;
                        break;
                    }
                    
                    if (m.type === 'flat') {
                        if (distToSegment(mouseX, mouseY, m.x1, m.y1, m.x2, m.y2) < minDist) hoveredId = m.id;
                    } else if (m.type === 'arc') {
                        const d = Math.hypot(mouseX-m.cx, mouseY-m.cy);
                        if (Math.abs(d - m.r) < minDist) hoveredId = m.id;
                    } else if (m.type === 'freehand') {
                        for (let i = 0; i < m.points.length - 1; i++) {
                            if (distToSegment(mouseX, mouseY, m.points[i].x, m.points[i].y, m.points[i+1].x, m.points[i+1].y) < minDist) {
                                hoveredId = m.id;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Tooltip Update Logic
            if (hoveredId !== null && !isMovingObj && !isRotatingObj) {
                const m = mirrors.find(m => m.id === hoveredId);
                if (m && tooltip) {
                    tooltip.classList.add('visible');
                    tooltip.style.left = e.offsetX + 'px';
                    tooltip.style.top = e.offsetY + 'px';
                    
                    const iconEl = document.getElementById('tt-icon');
                    const typeEl = document.getElementById('tt-type');
                    const contentEl = document.getElementById('tt-content');
                    
                    if (contentEl) {
                        let typeName = ''; let icon = ''; let dimText = '';
                        if (m.type === 'flat') {
                            typeName = 'Flat Mirror'; icon = 'remove';
                            dimText = `Length: <span class="tt-value">${Math.round(Math.hypot(m.x2-m.x1, m.y2-m.y1))}px</span>`;
                        } else if (m.type === 'arc') {
                            typeName = m.concave ? 'Concave Mirror' : 'Convex Mirror'; icon = m.concave ? 'circle' : 'blur_circular';
                            dimText = `Radius: <span class="tt-value">${Math.round(m.r)}px</span>`;
                        } else if (m.type === 'freehand') {
                            typeName = 'Freehand Mirror'; icon = 'gesture';
                            let len = 0;
                            for(let i=0; i<m.points.length-1; i++) len += Math.hypot(m.points[i+1].x-m.points[i].x, m.points[i+1].y-m.points[i].y);
                            dimText = `Length: <span class="tt-value">${Math.round(len)}px</span>`;
                        }
                        
                        if(iconEl) iconEl.innerText = icon; 
                        if(typeEl) typeEl.innerText = typeName;
                        
                        let html = `<div class="flex justify-between"><span>${dimText}</span></div>`;
                        if (m.type !== 'arc') html += `<div class="flex justify-between"><span>Sides:</span> <span class="tt-value">${m.twoSided ? 'Two-Sided' : 'One-Sided'}</span></div>`;
                        
                        let hitCount = m.hitCount || 0;
                        if (hitCount > 0) {
                            html += `<div class="mt-2 pt-2 border-t border-border-muted text-[#facc15] font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-[12px]">bolt</span> Active (${hitCount} Rays)</div>`;
                            if (showNormals) html += `<div class="text-slate-400 text-[10px]">&bull; Rendering Normal Vectors</div>`;
                            if (diffuseRefl) html += `<div class="text-slate-400 text-[10px]">&bull; Scattering Light (Diffuse)</div>`;
                            if (showVirtImage && m.type === 'flat') html += `<div class="text-slate-400 text-[10px]">&bull; Tracing Virtual Image</div>`;
                            if (showHuygens) html += `<div class="text-slate-400 text-[10px]">&bull; Propagating Wavelets</div>`;
                        } else {
                            html += `<div class="mt-2 pt-2 border-t border-border-muted text-slate-500 font-medium flex items-center gap-1.5"><span class="material-symbols-outlined text-[12px]">bedtime</span> Inactive</div>`;
                        }
                        
                        contentEl.innerHTML = html;
                    }
                }
            } else if (tooltip) {
                tooltip.classList.remove('visible');
            }

            if (drawMode === 'moveLight' && e.buttons === 1) {
                const l = lights.find(l => l.id === activeLightId);
                if (l) { l.x = mouseX; l.y = mouseY; }
            } else if (isRotatingObj && e.buttons === 1) {
                for (const m of mirrors) {
                    if (m.id === movingObjId) {
                        if (m.type === 'flat') {
                            const cx = (m.x1 + m.x2) / 2; const cy = (m.y1 + m.y2) / 2;
                            const startAng = Math.atan2(lastMousePos.y - cy, lastMousePos.x - cx);
                            const endAng = Math.atan2(mouseY - cy, mouseX - cx);
                            const dTheta = endAng - startAng;
                            
                            // Rotate ends about center
                            const rotatePt = (px, py, cx, cy, th) => {
                                const dx = px - cx; const dy = py - cy;
                                return { x: cx + dx*Math.cos(th) - dy*Math.sin(th), y: cy + dx*Math.sin(th) + dy*Math.cos(th) };
                            };
                            const p1 = rotatePt(m.x1, m.y1, cx, cy, dTheta);
                            const p2 = rotatePt(m.x2, m.y2, cx, cy, dTheta);
                            m.x1 = p1.x; m.y1 = p1.y; m.x2 = p2.x; m.y2 = p2.y;
                        } else if (m.type === 'arc') {
                            const startAng = Math.atan2(lastMousePos.y - m.cy, lastMousePos.x - m.cx);
                            const endAng = Math.atan2(mouseY - m.cy, mouseX - m.cx);
                            const dTheta = endAng - startAng;
                            m.a1 = (m.a1 + dTheta) % (2*Math.PI);
                            m.a2 = (m.a2 + dTheta) % (2*Math.PI);
                            if (m.a1 < 0) m.a1 += 2*Math.PI;
                            if (m.a2 < 0) m.a2 += 2*Math.PI;
                        } else if (m.type === 'freehand') {
                            let cx = 0, cy = 0;
                            for (let pt of m.points) { cx += pt.x; cy += pt.y; }
                            cx /= m.points.length; cy /= m.points.length;
                            const startAng = Math.atan2(lastMousePos.y - cy, lastMousePos.x - cx);
                            const endAng = Math.atan2(mouseY - cy, mouseX - cx);
                            const dTheta = endAng - startAng;
                            const rotatePt = (px, py, cx, cy, th) => {
                                const dx = px - cx; const dy = py - cy;
                                return { x: cx + dx*Math.cos(th) - dy*Math.sin(th), y: cy + dx*Math.sin(th) + dy*Math.cos(th) };
                            };
                            for (let pt of m.points) {
                                const rp = rotatePt(pt.x, pt.y, cx, cy, dTheta);
                                pt.x = rp.x; pt.y = rp.y;
                            }
                        }
                    }
                }
                lastMousePos = {x: mouseX, y: mouseY};
            } else if (drawMode === 'freehand' && currentPath && e.buttons === 1) {
                const dist = Math.hypot(currentPath[currentPath.length-1].x - mouseX, currentPath[currentPath.length-1].y - mouseY);
                if (dist > 5) {
                    currentPath.push({x: mouseX, y: mouseY});
                }
            } else if (isMovingObj && e.buttons === 1) {
                const dx = mouseX - lastMousePos.x;
                const dy = mouseY - lastMousePos.y;
                for (const m of mirrors) {
                    if (m.id === movingObjId) {
                        if (m.type === 'flat') { m.x1 += dx; m.y1 += dy; m.x2 += dx; m.y2 += dy; }
                        else if (m.type === 'arc') { m.cx += dx; m.cy += dy; }
                        else if (m.type === 'freehand') { for (let pt of m.points) { pt.x += dx; pt.y += dy; } }
                    }
                }
                lastMousePos = {x: mouseX, y: mouseY};
            } else if (drawingStart && e.buttons === 1) {
                drawingEnd = {x: mouseX, y: mouseY};
            }
        });

        canvas.addEventListener('mouseup', e => {
            if (currentPath) {
                if (currentPath.length > 1) {
                    mirrorIdCounter++;
                    mirrors.push({
                        id: mirrorIdCounter,
                        type: 'freehand',
                        points: currentPath,
                        twoSided: false
                    });
                }
                currentPath = null;
            } else if (isRotatingObj) {
                isRotatingObj = false;
                movingObjId = null;
                lastMousePos = null;
            } else if (isMovingObj) {
                isMovingObj = false;
                movingObjId = null;
                lastMousePos = null;
            } else if (drawingStart && drawingEnd) {
                if (Math.hypot(drawingEnd.x - drawingStart.x, drawingEnd.y - drawingStart.y) > 10) {
                    mirrorIdCounter++;
                    if (drawMode === 'flat') {
                        mirrors.push({ id: mirrorIdCounter, type: 'flat', x1: drawingStart.x, y1: drawingStart.y, x2: drawingEnd.x, y2: drawingEnd.y, twoSided: false });
                    } else if (drawMode === 'concave' || drawMode === 'convex') {
                        // Create an arc
                        const dx = drawingEnd.x - drawingStart.x;
                        const dy = drawingEnd.y - drawingStart.y;
                        const len = Math.hypot(dx, dy);
                        // Radius proportional to length
                        const r = len * 0.8; 
                        const midX = (drawingStart.x + drawingEnd.x) / 2;
                        const midY = (drawingStart.y + drawingEnd.y) / 2;
                        // normal to line
                        let nx = -dy / len;
                        let ny = dx / len;
                        
                        // Bulge direction
                        if (drawMode === 'convex') { nx = -nx; ny = -ny; }
                        
                        // Center of the circle
                        const h = Math.sqrt(r*r - (len/2)*(len/2)); // distance from mid to center
                        const cx = midX + nx * h;
                        const cy = midY + ny * h;
                        
                        let a1 = Math.atan2(drawingStart.y - cy, drawingStart.x - cx);
                        let a2 = Math.atan2(drawingEnd.y - cy, drawingEnd.x - cx);
                        if (a1 < 0) a1 += 2*Math.PI;
                        if (a2 < 0) a2 += 2*Math.PI;
                        
                        // Ensure a1 < a2 by swapping or adding 2PI
                        let diff = a2 - a1;
                        if (diff < 0) diff += 2*Math.PI;
                        let midAngle = a1 + diff/2;
                        
                        mirrors.push({ id: mirrorIdCounter, type: 'arc', concave: drawMode==='concave', cx, cy, r, a1, a2, len });
                    }
                }
                drawingStart = null; drawingEnd = null;
            }
        });

        window.addEventListener('keydown', e => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && hoveredId !== null) {
                if (isElementLocked('mirror', hoveredId)) { showToast('⊘ LOCKED — Cannot delete challenge elements'); return; }
                mirrors = mirrors.filter(m => m.id !== hoveredId);
                hoveredId = null;
            }
            // Keyboard shortcuts for measurement tools
            if (e.key === 'r' || e.key === 'R') {
                if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) return;
                setDrawMode('ruler');
            }
            if (e.key === 'p' || e.key === 'P') {
                if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT')) return;
                setDrawMode('protractor');
            }
        });

        function distToSegment(px, py, x1, y1, x2, y2) {
            const l2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
            if (l2 === 0) return Math.hypot(px-x1, py-y1);
            let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
        }

        // Ray Math
        function getLineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
            const den = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
            if (den === 0) return null;
            const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
            const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
            if (uA > 0 && uB >= 0 && uB <= 1) {
                return { x: x1 + uA*(x2-x1), y: y1 + uA*(y2-y1), dist: uA*Math.hypot(x2-x1, y2-y1) };
            }
            return null;
        }

        function getArcMidAng(m) {
            let mina = Math.min(m.a1, m.a2); let maxa = Math.max(m.a1, m.a2);
            let diff = maxa - mina;
            if (diff > Math.PI) return maxa + (2*Math.PI - diff)/2;
            return mina + diff/2;
        }

        // --- Measurement tool helpers ---
        function getMirrorCenter(m) {
            if (m.type === 'flat') {
                return { x: (m.x1 + m.x2) / 2, y: (m.y1 + m.y2) / 2 };
            } else if (m.type === 'arc') {
                return { x: m.cx, y: m.cy };
            } else if (m.type === 'freehand') {
                let cx = 0, cy = 0;
                for (let pt of m.points) { cx += pt.x; cy += pt.y; }
                return { x: cx / m.points.length, y: cy / m.points.length };
            }
            return { x: 0, y: 0 };
        }

        function getMirrorDirection(m) {
            if (m.type === 'flat') {
                return { dx: m.x2 - m.x1, dy: m.y2 - m.y1 };
            } else if (m.type === 'arc') {
                let midAng = getArcMidAng(m);
                return { dx: -Math.sin(midAng), dy: Math.cos(midAng) };
            } else if (m.type === 'freehand') {
                if (m.points.length < 2) return { dx: 1, dy: 0 };
                const first = m.points[0];
                const last = m.points[m.points.length - 1];
                return { dx: last.x - first.x, dy: last.y - first.y };
            }
            return { dx: 1, dy: 0 };
        }

        function getAngleBetweenMirrors(mA, mB) {
            const dA = getMirrorDirection(mA);
            const dB = getMirrorDirection(mB);
            const magA = Math.hypot(dA.dx, dA.dy);
            const magB = Math.hypot(dB.dx, dB.dy);
            if (magA === 0 || magB === 0) return 0;
            const dot = (dA.dx * dB.dx + dA.dy * dB.dy) / (magA * magB);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
            return Math.min(angle, 180 - angle); // Always return acute angle
        }

        function hitTestObject(mouseX, mouseY) {
            // Check lights first
            for (const l of lights) {
                if (Math.hypot(mouseX - l.x, mouseY - l.y) < 15) {
                    return { type: 'light', id: l.id };
                }
            }
            // Then check mirrors
            const minDist = 15;
            for (const m of mirrors) {
                if (m.type === 'flat') {
                    if (distToSegment(mouseX, mouseY, m.x1, m.y1, m.x2, m.y2) < minDist) return { type: 'mirror', id: m.id };
                } else if (m.type === 'arc') {
                    const d = Math.hypot(mouseX - m.cx, mouseY - m.cy);
                    if (Math.abs(d - m.r) < minDist) return { type: 'mirror', id: m.id };
                } else if (m.type === 'freehand') {
                    for (let i = 0; i < m.points.length - 1; i++) {
                        if (distToSegment(mouseX, mouseY, m.points[i].x, m.points[i].y, m.points[i+1].x, m.points[i+1].y) < minDist) {
                            return { type: 'mirror', id: m.id };
                        }
                    }
                }
            }
            return null;
        }

        function resolveObjCenter(obj) {
            if (obj.type === 'light') {
                const l = lights.find(l => l.id === obj.id);
                return l ? { x: l.x, y: l.y } : null;
            } else {
                const m = mirrors.find(m => m.id === obj.id);
                return m ? getMirrorCenter(m) : null;
            }
        }

        function getArcIntersect(rx, ry, dx, dy, m) {
            // Ray: P = R + t*D
            // Circle: (x-cx)^2 + (y-cy)^2 = r^2
            const fx = rx - m.cx; const fy = ry - m.cy;
            const a = dx*dx + dy*dy;
            const b = 2 * (fx*dx + fy*dy);
            const c = fx*fx + fy*fy - m.r*m.r;
            const det = b*b - 4*a*c;
            if (det < 0) return null;
            const t1 = (-b - Math.sqrt(det)) / (2*a);
            const t2 = (-b + Math.sqrt(det)) / (2*a);
            
            // Find valid positive t that is on the bounded arc portion
            let bestT = Infinity;
            for (let t of [t1, t2]) {
                if (t > 0.01) {
                    const hitX = rx + dx*t; const hitY = ry + dy*t;
                    let ang = Math.atan2(hitY - m.cy, hitX - m.cx);
                    if (ang < 0) ang += 2*Math.PI;
                    // Check if between a1 and a2 (considering wrap around)
                    let inBody = false;
                    let mina = Math.min(m.a1, m.a2); let maxa = Math.max(m.a1, m.a2);
                    let diff = maxa - mina;
                    if (diff > Math.PI) {
                        if (ang >= maxa || ang <= mina) inBody = true;
                    } else {
                        if (ang >= mina && ang <= maxa) inBody = true;
                    }
                    if (inBody && t < bestT) bestT = t;
                }
            }
            if (bestT !== Infinity && bestT > 0.01) {
                return { x: rx + dx*bestT, y: ry + dy*bestT, dist: bestT * Math.hypot(dx,dy) };
            }
            return null;
        }

        function loop() {
            timeOffset += 0.5;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Virtual Image for Flat Mirrors
            if (showVirtImage) {
                for (const m of mirrors) {
                    if (m.type === 'flat') {
                        for (const l of lights) {
                            // Reflect light source across line
                            const dx = m.x2 - m.x1; const dy = m.y2 - m.y1;
                            const l2 = dx*dx + dy*dy;
                            const t = ((l.x - m.x1)*dx + (l.y - m.y1)*dy) / l2;
                            const px = m.x1 + t*dx; const py = m.y1 + t*dy;
                            const vx = px + (px - l.x);
                            const vy = py + (py - l.y);
                            
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${l.colorRgb.r}, ${l.colorRgb.g}, ${l.colorRgb.b}, 0.4)`;
                            ctx.setLineDash([5, 5]);
                            ctx.moveTo(l.x, l.y);
                            ctx.lineTo(vx, vy);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            
                            ctx.beginPath();
                            ctx.fillStyle = l.color;
                            ctx.arc(vx, vy, 4, 0, Math.PI*2);
                            ctx.fill();
                        }
                    }
                }
            }

            // Draw Mirrors
            ctx.lineCap = 'round';
            for (const m of mirrors) {
                const isHoveredOrActive = m.id === hoveredId || (isMovingObj && movingObjId === m.id) || (isRotatingObj && movingObjId === m.id) || m.id === hoveredRotationHandle;
                
                if (m.hitCount > 0) {
                    ctx.shadowColor = 'rgba(6, 182, 212, 0.6)';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.beginPath();
                ctx.strokeStyle = isHoveredOrActive ? '#F44' : (m.hitCount > 0 ? '#0ff' : '#FFF');
                ctx.lineWidth = m.type === 'flat' ? 2 : 3;
                if (m.type === 'flat') {
                    ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2);
                } else if (m.type === 'arc') {
                    ctx.arc(m.cx, m.cy, m.r, m.a1, m.a2, (m.a2<m.a1 && m.a2-m.a1 > -Math.PI) ? true : false);
                    // Draw F focal point
                    let midAng = getArcMidAng(m);
                    const fx = m.cx + Math.cos(midAng) * (m.r / 2);
                    const fy = m.cy + Math.sin(midAng) * (m.r / 2);
                    ctx.fillStyle = 'red';
                    ctx.arc(fx, fy, 2, 0, Math.PI*2);
                    ctx.fill();
                } else if (m.type === 'freehand') {
                    ctx.moveTo(m.points[0].x, m.points[0].y);
                    for (let i = 1; i < m.points.length; i++) {
                        ctx.lineTo(m.points[i].x, m.points[i].y);
                    }
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow for hatching
                
                // Draw non-reflective hatching
                if (m.type === 'arc' || !m.twoSided) {
                    ctx.beginPath();
                    ctx.strokeStyle = isHoveredOrActive ? 'rgba(255, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    if (m.type === 'flat') {
                        const dx = m.x2 - m.x1; const dy = m.y2 - m.y1;
                        const len = Math.hypot(dx, dy);
                        const nx = -dy / len; const ny = dx / len; 
                        const bx = -nx * 6; const by = -ny * 6; // Back vector
                        const tx = dx / len * 4; const ty = dy / len * 4; // Slant vector
                        const hatches = Math.floor(len / 6);
                        for (let i = 0; i <= hatches; i++) {
                            const px = m.x1 + dx * (i/hatches);
                            const py = m.y1 + dy * (i/hatches);
                            ctx.moveTo(px, py);
                            ctx.lineTo(px + bx + tx, py + by + ty);
                        }
                    } else if (m.type === 'arc') {
                        let mina = Math.min(m.a1, m.a2); let maxa = Math.max(m.a1, m.a2);
                        let diff = maxa - mina;
                        let sweepStart;
                        if (diff > Math.PI) {
                            diff = 2*Math.PI - diff;
                            sweepStart = maxa;
                        } else {
                            sweepStart = mina;
                        }
                        const hatches = Math.floor((m.r * diff) / 6);
                        for (let i = 0; i <= hatches; i++) {
                            const ang = sweepStart + diff * (i/hatches);
                            const px = m.cx + Math.cos(ang) * m.r;
                            const py = m.cy + Math.sin(ang) * m.r;
                            let bx = Math.cos(ang) * 6; let by = Math.sin(ang) * 6;
                            let tx = -Math.sin(ang) * 4; let ty = Math.cos(ang) * 4;
                            if (!m.concave) { bx = -bx; by = -by; tx = -tx; ty = -ty; } // Flip for convex
                            ctx.moveTo(px, py);
                            ctx.lineTo(px + bx + tx, py + by + ty);
                        }
                    } else if (m.type === 'freehand') {
                        const hatches = 3;
                        for (let n = 0; n < m.points.length - 1; n++) {
                            const p1 = m.points[n]; const p2 = m.points[n+1];
                            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                            const len = Math.hypot(dx, dy);
                            if (len === 0) continue;
                            const nx = -dy / len; const ny = dx / len; 
                            const bx = -nx * 6; const by = -ny * 6;
                            const tx = dx / len * 4; const ty = dy / len * 4;
                            for (let i = 0; i <= hatches; i++) {
                                const px = p1.x + dx * (i/hatches);
                                const py = p1.y + dy * (i/hatches);
                                ctx.moveTo(px, py);
                                ctx.lineTo(px + bx + tx, py + by + ty);
                            }
                        }
                    }
                    ctx.stroke();
                }
                
                // Draw rotation handle
                if (m.id === hoveredRotationHandle || (isRotatingObj && movingObjId === m.id) || (m.id === hoveredId && drawMode === 'moveObj')) {
                    let hx, hy;
                    if (m.type === 'flat') {
                        hx = (m.x1 + m.x2) / 2; hy = (m.y1 + m.y2) / 2;
                        const dx = m.x2 - m.x1; const dy = m.y2 - m.y1;
                        const len = Math.hypot(dx, dy);
                        hx += (-dy / len) * 20; hy += (dx / len) * 20;
                    } else if (m.type === 'arc') {
                        let midAng = getArcMidAng(m);
                        const hr = m.concave ? m.r - 20 : m.r + 20;
                        hx = m.cx + Math.cos(midAng) * hr;
                        hy = m.cy + Math.sin(midAng) * hr;
                    } else if (m.type === 'freehand') {
                        let cx = 0, cy = 0;
                        for (let pt of m.points) { cx += pt.x; cy += pt.y; }
                        cx /= m.points.length; cy /= m.points.length;
                        hx = cx; hy = cy - 30;
                    }
                    ctx.beginPath();
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = '#06B6D4';
                    ctx.lineWidth = 2;
                    ctx.arc(hx, hy, 6, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                    
                    // Connection line
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
                    ctx.setLineDash([2, 2]);
                    if (m.type === 'flat') {
                        ctx.moveTo((m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2);
                    } else if (m.type === 'arc') {
                        let midAng = getArcMidAng(m);
                        ctx.moveTo(m.cx + Math.cos(midAng) * m.r, m.cy + Math.sin(midAng) * m.r);
                    } else if (m.type === 'freehand') {
                        let cx = 0, cy = 0;
                        for (let pt of m.points) { cx += pt.x; cy += pt.y; }
                        cx /= m.points.length; cy /= m.points.length;
                        ctx.moveTo(cx, cy);
                    }
                    ctx.lineTo(hx, hy);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            if (currentPath && currentPath.length > 1) {
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(currentPath[0].x, currentPath[0].y);
                for (let i=1; i<currentPath.length; i++) {
                    ctx.lineTo(currentPath[i].x, currentPath[i].y);
                }
                ctx.stroke();
            }

            if (drawingStart && drawingEnd) {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.moveTo(drawingStart.x, drawingStart.y);
                ctx.lineTo(drawingEnd.x, drawingEnd.y);
                ctx.stroke();
            }

            for (const m of mirrors) {
                m.hitCount = 0; // Reset hits for this frame's raytracing
            }

            // Reset ray data collection for this frame
            lastFrameRayData = [];

            // Raytracing for all lights
            for (const l of lights) {
                const rays = [];
                if (l.mode === 'point') {
                    for (let i = 0; i < 36; i++) {
                        const angle = (i * 10) * Math.PI / 180;
                        rays.push({ rx: l.x, ry: l.y, dx: Math.cos(angle), dy: Math.sin(angle), distTravel: 0 });
                    }
                } else {
                    const centerAngle = l.aim * Math.PI / 180;
                    const spreadAngle = l.spread * Math.PI / 180;
                    const startAngle = centerAngle - spreadAngle / 2;
                    let sprayStep = 0;
                    for (let i = 0; i < l.rays; i++) {
                        const angle = l.rays > 1 ? startAngle + i * (sprayStep = spreadAngle / (l.rays - 1)) : centerAngle;
                        rays.push({ rx: l.x, ry: l.y, dx: Math.cos(angle), dy: Math.sin(angle), distTravel: 0 });
                    }
                }

                const maxRayDist = 3000;
                const colors = ['#f00', '#f80', '#ff0', '#0f0', '#0ff', '#00f', '#80f', '#f0f'];
                
                for (let i = 0; i < rays.length; i++) {
                    let r = rays[i];
                    const myColor = l.mode === 'laser' && l.rays > 1 ? colors[i % colors.length] : `rgba(${l.colorRgb.r}, ${l.colorRgb.g}, ${l.colorRgb.b}, 1)`;
                    
                    // Collect ray data for measurement tools
                    const currentRayData = { segments: [], bounces: [] };

                    ctx.beginPath(); // Start ray path
                    ctx.moveTo(r.rx, r.ry);

                    let points = [{x: r.rx, y: r.ry}];

                    for (let b = 0; b <= maxBounces; b++) {
                        let bestHit = null;
                        let hitNormal = null;

                        const farX = r.rx + r.dx * maxRayDist;
                        const farY = r.ry + r.dy * maxRayDist;

                        // Intersect Flat Mirrors
                        for (const m of mirrors) {
                            if (m.type === 'flat') {
                                const hit = getLineIntersect(r.rx, r.ry, farX, farY, m.x1, m.y1, m.x2, m.y2);
                                if (hit && hit.dist > 0.1 && (!bestHit || hit.dist < bestHit.dist)) {
                                    let nx = -(m.y2 - m.y1); let ny = (m.x2 - m.x1);
                                    const mag = Math.hypot(nx, ny);
                                    nx /= mag; ny /= mag;
                                    const isBack = (r.dx * nx + r.dy * ny > 0);
                                    hitNormal = {nx: isBack ? -nx : nx, ny: isBack ? -ny : ny};
                                    hit.isBack = isBack;
                                    hit.m = m;
                                    bestHit = hit;
                                }
                            } else if (m.type === 'arc') {
                                const hit = getArcIntersect(r.rx, r.ry, r.dx, r.dy, m);
                                if (hit && (!bestHit || hit.dist < bestHit.dist)) {
                                    let nx = hit.x - m.cx; let ny = hit.y - m.cy;
                                    const mag = Math.hypot(nx, ny);
                                    nx /= mag; ny /= mag;
                                    if (m.concave) { nx = -nx; ny = -ny; } // Front normal
                                    const isBack = (r.dx * nx + r.dy * ny > 0);
                                    hitNormal = {nx: isBack ? -nx : nx, ny: isBack ? -ny : ny};
                                    hit.isBack = isBack;
                                    hit.m = m;
                                    bestHit = hit;
                                }
                            } else if (m.type === 'freehand') {
                                for (let n = 0; n < m.points.length - 1; n++) {
                                    const p1 = m.points[n]; const p2 = m.points[n+1];
                                    const hit = getLineIntersect(r.rx, r.ry, farX, farY, p1.x, p1.y, p2.x, p2.y);
                                    if (hit && hit.dist > 0.1 && (!bestHit || hit.dist < bestHit.dist)) {
                                        let nx = -(p2.y - p1.y); let ny = (p2.x - p1.x);
                                        const mag = Math.hypot(nx, ny);
                                        if (mag === 0) continue;
                                        nx /= mag; ny /= mag;
                                        const isBack = (r.dx * nx + r.dy * ny > 0);
                                        hitNormal = {nx: isBack ? -nx : nx, ny: isBack ? -ny : ny};
                                        hit.isBack = isBack;
                                        hit.m = m;
                                        bestHit = hit;
                                    }
                                }
                            }
                        }

                        if (bestHit) {
                            ctx.lineTo(bestHit.x, bestHit.y);
                            points.push({x: bestHit.x, y: bestHit.y});
                            
                            // Modified the back reflection behaviour for twoSidedFlat
                            if (bestHit.isBack && !bestHit.m.twoSided) {
                                // Store the absorbed segment before breaking
                                currentRayData.segments.push({x1: points[points.length-2].x, y1: points[points.length-2].y, x2: bestHit.x, y2: bestHit.y, len: Math.hypot(bestHit.x - points[points.length-2].x, bestHit.y - points[points.length-2].y)});
                                break;
                            }
                            
                            bestHit.m.hitCount++; // Register hit on the mirror object

                            // Save incident direction before reflection
                            const inDx = r.dx;
                            const inDy = r.dy;

                            if (diffuseRefl) {
                                // Introduce some random scattering
                                const scatter = (Math.random() - 0.5) * 0.5;
                                const currentAngle = Math.atan2(hitNormal.ny, hitNormal.nx);
                                hitNormal.nx = Math.cos(currentAngle + scatter);
                                hitNormal.ny = Math.sin(currentAngle + scatter);
                            }

                            // Reflection Math
                            const dot = r.dx * hitNormal.nx + r.dy * hitNormal.ny;
                            r.dx = r.dx - 2 * dot * hitNormal.nx;
                            r.dy = r.dy - 2 * dot * hitNormal.ny;
                            
                            r.rx = bestHit.x;
                            r.ry = bestHit.y;

                            // Store segment data
                            currentRayData.segments.push({x1: points[points.length-2].x, y1: points[points.length-2].y, x2: bestHit.x, y2: bestHit.y, len: Math.hypot(bestHit.x - points[points.length-2].x, bestHit.y - points[points.length-2].y)});

                            // Store bounce data for protractor
                            const theta = Math.acos(Math.max(-1, Math.min(1, -dot))) * 180 / Math.PI;
                            currentRayData.bounces.push({
                                x: bestHit.x, y: bestHit.y,
                                nx: hitNormal.nx, ny: hitNormal.ny,
                                theta: theta,
                                inDx: inDx, inDy: inDy,
                                outDx: r.dx, outDy: r.dy
                            });

                            if (showNormals) {
                                ctx.save();
                                ctx.beginPath();
                                ctx.setLineDash([4, 4]);
                                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                                ctx.moveTo(bestHit.x, bestHit.y);
                                ctx.lineTo(bestHit.x + hitNormal.nx * 40, bestHit.y + hitNormal.ny * 40);
                                ctx.stroke();
                                
                                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                                ctx.font = '11px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(Math.round(theta) + '°', bestHit.x + hitNormal.nx * 55, bestHit.y + hitNormal.ny * 55);
                                
                                ctx.restore();
                            }

                        } else {
                            ctx.lineTo(farX, farY);
                            points.push({x: farX, y: farY});
                            // Store final (infinite) segment — cap length for display
                            const lastPt = points[points.length - 2];
                            if (lastPt) {
                                currentRayData.segments.push({x1: lastPt.x, y1: lastPt.y, x2: farX, y2: farY, len: Math.hypot(farX - lastPt.x, farY - lastPt.y)});
                            }
                            break;
                        }
                    }

                    // Store this ray's data for measurement hit-testing
                    lastFrameRayData.push(currentRayData);
                    
                    ctx.strokeStyle = myColor;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    if (showHuygens) {
                        for (let p=0; p<points.length-1; p++) {
                            let len = Math.hypot(points[p+1].x - points[p].x, points[p+1].y - points[p].y);
                            if (len > 0) {
                                let n = Math.floor(len / 40);
                                for (let j=1; j<n; j++) {
                                    let hx = points[p].x + (points[p+1].x - points[p].x) * (j/n);
                                    let hy = points[p].y + (points[p+1].y - points[p].y) * (j/n);
                                    ctx.beginPath();
                                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                                    let r2 = (timeOffset + j*10) % 30;
                                    ctx.arc(hx, hy, r2, 0, Math.PI*2);
                                    ctx.stroke();
                                }
                            }
                        }
                    }
                }
            }

            // Light Sources Graphics
            for (const l of lights) {
                if (l.id === activeLightId) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.arc(l.x, l.y, 14, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.fillStyle = l.color;
                ctx.beginPath();
                ctx.arc(l.x, l.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }

            // === MEASUREMENT TOOLS RENDERING ===

            // --- Selection highlight (pulsing cyan outline for first-selected object) ---
            const pulseAlpha = 0.5 + 0.3 * Math.sin(timeOffset * 0.1);
            if (drawMode === 'ruler' && rulerFirstObj) {
                ctx.save();
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 3;
                ctx.globalAlpha = pulseAlpha;
                if (rulerFirstObj.type === 'light') {
                    const l = lights.find(l => l.id === rulerFirstObj.id);
                    if (l) { ctx.beginPath(); ctx.arc(l.x, l.y, 20, 0, Math.PI * 2); ctx.stroke(); }
                } else {
                    const m = mirrors.find(m => m.id === rulerFirstObj.id);
                    if (m) {
                        ctx.beginPath();
                        if (m.type === 'flat') { ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); }
                        else if (m.type === 'arc') { ctx.arc(m.cx, m.cy, m.r, m.a1, m.a2); }
                        else if (m.type === 'freehand') { ctx.moveTo(m.points[0].x, m.points[0].y); for (let i=1;i<m.points.length;i++) ctx.lineTo(m.points[i].x, m.points[i].y); }
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }
            if (drawMode === 'protractor' && protractorFirstObj) {
                ctx.save();
                ctx.strokeStyle = '#00f0ff';
                ctx.lineWidth = 3;
                ctx.globalAlpha = pulseAlpha;
                const m = mirrors.find(m => m.id === protractorFirstObj.id);
                if (m) {
                    ctx.beginPath();
                    if (m.type === 'flat') { ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); }
                    else if (m.type === 'arc') { ctx.arc(m.cx, m.cy, m.r, m.a1, m.a2); }
                    else if (m.type === 'freehand') { ctx.moveTo(m.points[0].x, m.points[0].y); for (let i=1;i<m.points.length;i++) ctx.lineTo(m.points[i].x, m.points[i].y); }
                    ctx.stroke();
                }
                ctx.restore();
            }

            // --- Ruler measurements ---
            for (let ri = rulerPairs.length - 1; ri >= 0; ri--) {
                const pair = rulerPairs[ri];
                const cA = resolveObjCenter(pair.objA);
                const cB = resolveObjCenter(pair.objB);
                if (!cA || !cB) { rulerPairs.splice(ri, 1); continue; } // Object deleted

                const dist = Math.hypot(cB.x - cA.x, cB.y - cA.y);
                const displayDist = (dist * unitScale).toFixed(1) + ' cm';

                // Dashed measurement line
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.setLineDash([6, 4]);
                ctx.lineWidth = 1;
                ctx.moveTo(cA.x, cA.y);
                ctx.lineTo(cB.x, cB.y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Diamond endpoint markers
                for (const pt of [cA, cB]) {
                    ctx.beginPath();
                    ctx.fillStyle = '#00f0ff';
                    ctx.save();
                    ctx.translate(pt.x, pt.y);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillRect(-3, -3, 6, 6);
                    ctx.restore();
                }

                // Label at midpoint
                const midX = (cA.x + cB.x) / 2;
                const midY = (cA.y + cB.y) / 2;
                // Offset perpendicular to the line
                const ldx = cB.x - cA.x; const ldy = cB.y - cA.y;
                const llen = Math.hypot(ldx, ldy) || 1;
                const offX = (-ldy / llen) * 12;
                const offY = (ldx / llen) * 12;

                ctx.font = '10px "IBM Plex Mono", monospace';
                const textW = ctx.measureText(displayDist).width;
                ctx.fillStyle = 'rgba(13, 14, 16, 0.9)';
                ctx.fillRect(midX + offX - textW / 2 - 4, midY + offY - 7, textW + 8, 16);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(midX + offX - textW / 2 - 4, midY + offY - 7, textW + 8, 16);
                ctx.fillStyle = '#00f0ff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(displayDist, midX + offX, midY + offY);

                ctx.restore();
            }

            // --- Protractor measurements ---
            for (let pi = protractorPairs.length - 1; pi >= 0; pi--) {
                const pair = protractorPairs[pi];
                const mA = mirrors.find(m => m.id === pair.mirrorA.id);
                const mB = mirrors.find(m => m.id === pair.mirrorB.id);
                if (!mA || !mB) { protractorPairs.splice(pi, 1); continue; } // Deleted

                const angle = getAngleBetweenMirrors(mA, mB);
                const displayAngle = angle.toFixed(1) + '°';

                const cA = getMirrorCenter(mA);
                const cB = getMirrorCenter(mB);
                const vertexX = (cA.x + cB.x) / 2;
                const vertexY = (cA.y + cB.y) / 2;

                // Direction angles for drawing the arc
                const dA = getMirrorDirection(mA);
                const dB = getMirrorDirection(mB);
                let angA = Math.atan2(dA.dy, dA.dx);
                let angB = Math.atan2(dB.dy, dB.dx);

                // Normalize so the arc sweeps the acute angle
                let sweep = angB - angA;
                if (sweep < -Math.PI) sweep += 2 * Math.PI;
                if (sweep > Math.PI) sweep -= 2 * Math.PI;
                // Pick the shorter sweep
                let startAng = angA;
                let endAng = angA + sweep;
                if (Math.abs(sweep) > Math.PI / 2) {
                    // Flip one direction to get the acute angle representation
                    let altAngB = angB + Math.PI;
                    sweep = altAngB - angA;
                    if (sweep < -Math.PI) sweep += 2 * Math.PI;
                    if (sweep > Math.PI) sweep -= 2 * Math.PI;
                    endAng = angA + sweep;
                }

                ctx.save();

                // Extension lines from mirrors to vertex
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1;
                ctx.moveTo(cA.x, cA.y); ctx.lineTo(vertexX, vertexY);
                ctx.moveTo(cB.x, cB.y); ctx.lineTo(vertexX, vertexY);
                ctx.stroke();
                ctx.setLineDash([]);

                // Direction indicator lines from vertex
                const arcRadius = 30;
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                ctx.lineWidth = 1;
                ctx.moveTo(vertexX, vertexY);
                ctx.lineTo(vertexX + Math.cos(startAng) * (arcRadius + 10), vertexY + Math.sin(startAng) * (arcRadius + 10));
                ctx.moveTo(vertexX, vertexY);
                ctx.lineTo(vertexX + Math.cos(endAng) * (arcRadius + 10), vertexY + Math.sin(endAng) * (arcRadius + 10));
                ctx.stroke();

                // Angle arc
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.lineWidth = 1.5;
                const ccw = sweep < 0;
                ctx.arc(vertexX, vertexY, arcRadius, startAng, endAng, ccw);
                ctx.stroke();

                // Angle label along the bisector
                const bisector = startAng + sweep / 2;
                const labelX = vertexX + Math.cos(bisector) * (arcRadius + 18);
                const labelY = vertexY + Math.sin(bisector) * (arcRadius + 18);

                ctx.font = 'bold 11px "IBM Plex Mono", monospace';
                const textW = ctx.measureText(displayAngle).width;
                ctx.fillStyle = 'rgba(13, 14, 16, 0.9)';
                ctx.fillRect(labelX - textW / 2 - 4, labelY - 7, textW + 8, 16);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(labelX - textW / 2 - 4, labelY - 7, textW + 8, 16);
                ctx.fillStyle = '#00f0ff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(displayAngle, labelX, labelY);

                ctx.restore();
            }

            // --- Ray Segment Ruler Measurements ---
            for (const seg of rulerRaySegments) {
                ctx.save();

                // Highlight the ray segment with a thicker cyan glow
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 8;
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Diamond markers at endpoints
                for (const pt of [{x: seg.x1, y: seg.y1}, {x: seg.x2, y: seg.y2}]) {
                    ctx.beginPath();
                    ctx.fillStyle = '#00f0ff';
                    ctx.save();
                    ctx.translate(pt.x, pt.y);
                    ctx.rotate(Math.PI / 4);
                    ctx.fillRect(-3, -3, 6, 6);
                    ctx.restore();
                }

                // Label at midpoint
                const midX = (seg.x1 + seg.x2) / 2;
                const midY = (seg.y1 + seg.y2) / 2;
                const displayDist = (seg.len * unitScale).toFixed(1) + ' cm';
                const ldx = seg.x2 - seg.x1; const ldy = seg.y2 - seg.y1;
                const llen = Math.hypot(ldx, ldy) || 1;
                const offX = (-ldy / llen) * 14;
                const offY = (ldx / llen) * 14;

                ctx.font = '10px "IBM Plex Mono", monospace';
                const tw = ctx.measureText(displayDist).width;
                ctx.fillStyle = 'rgba(13, 14, 16, 0.95)';
                ctx.fillRect(midX + offX - tw / 2 - 5, midY + offY - 8, tw + 10, 18);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(midX + offX - tw / 2 - 5, midY + offY - 8, tw + 10, 18);
                ctx.fillStyle = '#00f0ff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(displayDist, midX + offX, midY + offY);

                ctx.restore();
            }

            // --- Bounce Point Protractor Annotations ---
            for (const bounce of protractorBounces) {
                ctx.save();

                const bx = bounce.x;
                const by = bounce.y;
                const arcR = 35;

                // Normal line (dashed white)
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.lineWidth = 1;
                ctx.moveTo(bx - bounce.nx * 50, by - bounce.ny * 50);
                ctx.lineTo(bx + bounce.nx * 50, by + bounce.ny * 50);
                ctx.stroke();
                ctx.setLineDash([]);

                // "N" label at end of normal
                ctx.font = 'bold 9px "IBM Plex Mono", monospace';
                ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('N', bx + bounce.nx * 58, by + bounce.ny * 58);

                // Incident ray direction line (extend back from bounce point)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx - bounce.inDx * 60, by - bounce.inDy * 60);
                ctx.stroke();

                // Reflected ray direction line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(50, 200, 255, 0.5)';
                ctx.lineWidth = 1.5;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + bounce.outDx * 60, by + bounce.outDy * 60);
                ctx.stroke();

                // Compute angles for arcs
                const normalAng = Math.atan2(bounce.ny, bounce.nx);
                const inAng = Math.atan2(-bounce.inDy, -bounce.inDx); // Reverse incident direction (pointing toward bounce)
                const outAng = Math.atan2(bounce.outDy, bounce.outDx);

                // Incidence angle arc (yellow-ish)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.7)';
                ctx.lineWidth = 1.5;
                // Draw arc from normal to incident ray direction
                let inSweep = inAng - normalAng;
                if (inSweep > Math.PI) inSweep -= 2 * Math.PI;
                if (inSweep < -Math.PI) inSweep += 2 * Math.PI;
                ctx.arc(bx, by, arcR, normalAng, inAng, inSweep > 0);
                ctx.stroke();

                // Reflection angle arc (cyan-ish)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(50, 200, 255, 0.7)';
                ctx.lineWidth = 1.5;
                let outSweep = outAng - normalAng;
                if (outSweep > Math.PI) outSweep -= 2 * Math.PI;
                if (outSweep < -Math.PI) outSweep += 2 * Math.PI;
                ctx.arc(bx, by, arcR, normalAng, outAng, outSweep > 0);
                ctx.stroke();

                // Angle labels
                const thetaStr = bounce.theta.toFixed(1) + '°';

                // Incidence angle label
                const inBisector = normalAng + inSweep / 2;
                const inLabelX = bx + Math.cos(inBisector) * (arcR + 16);
                const inLabelY = by + Math.sin(inBisector) * (arcR + 16);

                ctx.font = 'bold 10px "IBM Plex Mono", monospace';
                let tw = ctx.measureText('θᵢ=' + thetaStr).width;
                ctx.fillStyle = 'rgba(13, 14, 16, 0.95)';
                ctx.fillRect(inLabelX - tw / 2 - 4, inLabelY - 7, tw + 8, 16);
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(inLabelX - tw / 2 - 4, inLabelY - 7, tw + 8, 16);
                ctx.fillStyle = '#ffc832';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('θᵢ=' + thetaStr, inLabelX, inLabelY);

                // Reflection angle label
                const outBisector = normalAng + outSweep / 2;
                const outLabelX = bx + Math.cos(outBisector) * (arcR + 16);
                const outLabelY = by + Math.sin(outBisector) * (arcR + 16);

                tw = ctx.measureText('θᵣ=' + thetaStr).width;
                ctx.fillStyle = 'rgba(13, 14, 16, 0.95)';
                ctx.fillRect(outLabelX - tw / 2 - 4, outLabelY - 7, tw + 8, 16);
                ctx.strokeStyle = 'rgba(50, 200, 255, 0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(outLabelX - tw / 2 - 4, outLabelY - 7, tw + 8, 16);
                ctx.fillStyle = '#32c8ff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('θᵣ=' + thetaStr, outLabelX, outLabelY);

                // Bounce point marker (brighter dot)
                ctx.beginPath();
                ctx.fillStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10;
                ctx.arc(bx, by, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.restore();
            }

            // === LOCK ICONS for challenge-locked elements ===
            if (activeProblemId) {
                ctx.save();
                for (const m of mirrors) {
                    if (lockedMirrorIds.includes(m.id)) {
                        const c = getMirrorCenter(m);
                        // Lock icon background
                        ctx.fillStyle = 'rgba(13, 14, 16, 0.8)';
                        ctx.fillRect(c.x - 9, c.y - 16, 18, 18);
                        ctx.strokeStyle = 'rgba(255, 180, 171, 0.5)';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(c.x - 9, c.y - 16, 18, 18);
                        // Lock body
                        ctx.fillStyle = 'rgba(255, 180, 171, 0.7)';
                        ctx.fillRect(c.x - 5, c.y - 6, 10, 7);
                        // Shackle
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 180, 171, 0.7)';
                        ctx.lineWidth = 1.5;
                        ctx.arc(c.x, c.y - 8, 3.5, Math.PI, 0);
                        ctx.stroke();
                    }
                }
                for (const l of lights) {
                    if (lockedLightIds.includes(l.id)) {
                        ctx.fillStyle = 'rgba(255, 180, 171, 0.7)';
                        ctx.fillRect(l.x + 12, l.y - 14, 10, 7);
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(255, 180, 171, 0.7)';
                        ctx.lineWidth = 1.5;
                        ctx.arc(l.x + 17, l.y - 16, 3.5, Math.PI, 0);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

            // === TOAST NOTIFICATION ===
            if (toastMessage) {
                ctx.save();
                ctx.font = '11px "IBM Plex Mono", monospace';
                const tw = ctx.measureText(toastMessage).width;
                const tx = canvas.width / 2;
                const ty = 50;
                ctx.fillStyle = 'rgba(147, 0, 10, 0.9)';
                ctx.fillRect(tx - tw / 2 - 12, ty - 12, tw + 24, 26);
                ctx.strokeStyle = 'rgba(255, 180, 171, 0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(tx - tw / 2 - 12, ty - 12, tw + 24, 26);
                ctx.fillStyle = '#ffb4ab';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(toastMessage, tx, ty);
                ctx.restore();
            }

            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    