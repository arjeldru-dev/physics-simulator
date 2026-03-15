import re

with open(r'd:\P6 SIMULATOR APP\simLogic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix resizing
js = re.sub(
    r'function resizeCanvas\(\) \{.*?\}',
    '''function resizeCanvas() {
            const container = canvas.parentElement;
            if(container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }
        }''',
    js,
    flags=re.DOTALL
)

# Fix clientX/Y to offsetX/Y
js = js.replace('e.clientX', 'e.offsetX').replace('e.clientY', 'e.offsetY')

# Fix active classes
js = js.replace("document.querySelectorAll('.panel:first-child .mode-btn, #moveLightBtn').forEach(b => b.classList.remove('active'));",
                "document.querySelectorAll('.mode-btn, #moveLightBtn, #moveObjBtn').forEach(b => b.classList.remove('active-btn'));")
js = js.replace("document.getElementById(m+'Btn').classList.add('active');",
                "document.getElementById(m+'Btn').classList.add('active-btn');")

# Fix light mode classes
js = js.replace("document.getElementById('pointLightBtn').classList.add('active');", "document.getElementById('pointLightBtn').classList.add('active-pill');")
js = js.replace("document.getElementById('laserBtn').classList.remove('active');", "document.getElementById('laserBtn').classList.remove('active-pill');")

js = js.replace("document.getElementById('laserBtn').classList.add('active');", "document.getElementById('laserBtn').classList.add('active-pill');")
js = js.replace("document.getElementById('pointLightBtn').classList.remove('active');", "document.getElementById('pointLightBtn').classList.remove('active-pill');")

# Fix laser controls display
js = js.replace("document.getElementById('laserControls').style.display = 'none';", "document.getElementById('laserControlsWrapper').classList.add('hidden');")
js = js.replace("document.getElementById('laserControls').style.display = 'block';", "document.getElementById('laserControlsWrapper').classList.remove('hidden');")

html = r'''<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>OpticSpace | Advanced Optics Simulator</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#06B6D4",
                        "background-light": "#f5f6f8",
                        "background-dark": "#0D0D0F",
                        "surface": "#141417",
                        "border-muted": "#2A2A2D"
                    },
                    fontFamily: {
                        "display": ["Inter", "sans-serif"]
                    },
                },
            },
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .dot-grid {
            background-image: radial-gradient(#2A2A2D 1px, transparent 1px);
            background-size: 24px 24px;
        }
        /* Custom ranges */
        input[type=range] {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 12px; width: 12px;
            border-radius: 50%;
            background: #06B6D4;
            cursor: pointer;
            margin-top: -4px;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%; height: 4px;
            cursor: pointer;
            background: #2A2A2D;
            border-radius: 2px;
        }
        /* Color input */
        input[type="color"] {
            -webkit-appearance: none;
            appearance: none;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            padding: 0;
            overflow: hidden;
            cursor: pointer;
        }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; }

        /* Active classes */
        .active-btn { border-color: #06B6D4 !important; color: #06B6D4 !important; background-color: #141A1F !important; box-shadow: inset 0 0 12px rgba(6,182,212,0.1) !important; }
        .active-btn .material-symbols-outlined { color: #06B6D4 !important; }
        .active-pill { background-color: #06B6D4 !important; color: white !important; box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important; }

            #mirror-tooltip {
                position: absolute;
                pointer-events: none;
                z-index: 50;
                background: rgba(20, 20, 23, 0.95);
                border: 1px solid #2A2A2D;
                backdrop-filter: blur(8px);
                padding: 12px;
                border-radius: 8px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                color: #e2e8f0;
                font-size: 11px;
                transform: translate(15px, 15px);
                opacity: 0;
                transition: opacity 0.15s ease-in-out;
                min-width: 200px;
            }
            #mirror-tooltip.visible { opacity: 1; }
            .tt-value { font-family: 'ui-monospace', 'SFMono-Regular', Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color: #06B6D4; }

    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-hidden h-screen flex flex-col">

<!-- Top Navigation -->
<header class="h-[56px] border-b border-border-muted bg-surface flex items-center justify-between px-4 z-20 shrink-0">
    <div class="flex items-center gap-3">
        <div class="flex items-center justify-center size-8 bg-primary/10 rounded">
            <span class="material-symbols-outlined text-primary text-xl">architecture</span>
        </div>
        <h1 class="text-[#FAFAFA] text-lg font-bold tracking-tight">OpticSpace</h1>
    </div>
    <nav class="flex items-center gap-1 bg-background-dark/50 p-1 rounded-lg border border-border-muted">
        <button id="moveLightBtn" class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-[#2A2A2D] transition-colors rounded group mode-btn">
            <span class="material-symbols-outlined text-sm">light_mode</span> Move Light
        </button>
        <button id="moveObjBtn" class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-[#2A2A2D] transition-colors rounded group mode-btn">
            <span class="material-symbols-outlined text-sm">open_with</span> Move Object
        </button>
            <button id="toggleTwoSidedBtn" class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-[#2A2A2D] transition-colors rounded group mode-btn">
                <span class="material-symbols-outlined text-sm">flip</span> Toggle 2-Sided
            </button>
    </nav>
    <div class="flex items-center gap-3">
        <button id="clearBtn" class="px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors rounded-lg bg-surface border border-border-muted hover:bg-border-muted">
            Clear Canvas
        </button>
    </div>
</header>

<div class="flex flex-1 overflow-hidden relative">
    <!-- Left Sidebar -->
    <aside class="w-[280px] bg-surface border-r border-border-muted flex flex-col overflow-y-auto z-10 shrink-0 select-none">
        
        <!-- Section: Light Source -->
        <div class="p-4 border-b border-border-muted">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-lg">lightbulb</span>
                <h3 class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Light Source</h3>
            </div>
            
            <div class="flex items-center justify-between mb-3 border-b border-border-muted/50 pb-3">
                <select id="lightSelect" class="bg-background-dark border border-border-muted text-[11px] font-bold text-primary rounded px-2 py-1 outline-none w-28 cursor-pointer">
                </select>
                <div class="flex gap-1 items-center">
                    <button id="delLightBtn" class="flex items-center gap-1 text-[10px] bg-border-muted hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors" title="Delete current light">
                        <span class="material-symbols-outlined text-[12px]">delete</span> Delete
                    </button>
                    <button id="addLightBtn" class="flex items-center gap-1 text-[10px] bg-border-muted hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors">
                        <span class="material-symbols-outlined text-[12px]">add</span> Add Light
                    </button>
                </div>
            </div>

            <div class="flex bg-background-dark p-1 rounded mb-4 border border-border-muted">
                <button id="pointLightBtn" class="flex-1 py-1 text-[11px] font-semibold text-slate-500 rounded transition-colors active-pill">Point</button>
                <button id="laserBtn" class="flex-1 py-1 text-[11px] font-semibold text-slate-500 rounded transition-colors">Laser</button>
            </div>

            <div id="laserControlsWrapper" class="space-y-4 hidden">
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-[11px] font-medium text-slate-400">Rays</label>
                        <span id="raysVal" class="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">1</span>
                    </div>
                    <input type="range" id="raysSlider" min="1" max="20" value="1">
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-[11px] font-medium text-slate-400">Spread</label>
                        <span id="spreadVal" class="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">5&deg;</span>
                    </div>
                    <input type="range" id="spreadSlider" min="1" max="90" value="5">
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="text-[11px] font-medium text-slate-400">Aim</label>
                    </div>
                    <input type="range" id="aimSlider" min="0" max="360" value="0">
                </div>
            </div>

            <div class="mt-4 flex justify-between items-center">
                <label class="text-[11px] font-medium text-slate-400">Beam Color</label>
                <div class="ring-2 ring-primary/20 rounded-full flex items-center justify-center p-0.5">
                    <input type="color" id="lightColor" value="#FFFFFF">
                </div>
            </div>
        </div>

        <!-- Section: Optical Elements -->
        <div class="p-4 border-b border-border-muted">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-lg">category</span>
                <h3 class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Optical Elements</h3>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button id="flatBtn" class="mode-btn flex flex-col items-center justify-center p-3 border rounded-lg group transition-all bg-background-dark border-border-muted hover:border-slate-600 text-slate-400 active-btn">
                    <span class="material-symbols-outlined mb-1 transition-colors">remove</span>
                    <span class="text-[10px] font-medium transition-colors">Flat Mirror</span>
                </button>
                <button id="concaveBtn" class="mode-btn flex flex-col items-center justify-center p-3 border rounded-lg group transition-all bg-background-dark border-border-muted hover:border-slate-600 text-slate-400">
                    <span class="material-symbols-outlined mb-1 transition-colors">circle</span>
                    <span class="text-[10px] font-medium transition-colors">Concave</span>
                </button>
                <button id="convexBtn" class="mode-btn flex flex-col items-center justify-center p-3 border rounded-lg group transition-all bg-background-dark border-border-muted hover:border-slate-600 text-slate-400">
                    <span class="material-symbols-outlined mb-1 transition-colors">blur_circular</span>
                    <span class="text-[10px] font-medium transition-colors">Convex</span>
                </button>
                <button id="freehandBtn" class="mode-btn flex flex-col items-center justify-center p-3 border rounded-lg group transition-all bg-background-dark border-border-muted hover:border-slate-600 text-slate-400">
                    <span class="material-symbols-outlined mb-1 transition-colors">gesture</span>
                    <span class="text-[10px] font-medium transition-colors">Freehand</span>
                </button>
            </div>
        </div>

        <!-- Section: Render Settings -->
        <div class="p-4 pb-8">
            <div class="flex items-center gap-2 mb-4">
                <span class="material-symbols-outlined text-primary text-lg">settings_suggest</span>
                <h3 class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Render Settings</h3>
            </div>
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">Show Normals</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="normalsToggle" class="sr-only peer">
                        <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">Diffuse Reflection</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="diffuseToggle" class="sr-only peer">
                        <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">Huygens Wavelets</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="huygensToggle" class="sr-only peer">
                        <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">Virtual Image</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="virtImgToggle" class="sr-only peer">
                        <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
                
                <div class="space-y-2 pt-2">
                    <div class="flex justify-between items-center">
                        <label class="text-[11px] font-medium text-slate-400">Max Bounces</label>
                        <span id="bouncesVal" class="text-[11px] font-mono text-slate-500">8</span>
                    </div>
                    <input type="range" id="bouncesSlider" min="1" max="15" value="8">
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Canvas -->
    <main class="flex-1 relative bg-background-dark dot-grid overflow-hidden">
        <canvas id="simCanvas" class="absolute inset-0 z-0 cursor-crosshair"></canvas>
        <div id="mirror-tooltip">
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-border-muted">
                <span class="material-symbols-outlined text-[14px] text-primary" id="tt-icon">category</span>
                <span class="font-bold tracking-wide uppercase text-[10px] text-slate-300" id="tt-type">Flat Mirror</span>
            </div>
            <div class="space-y-1.5" id="tt-content">
                <!-- Data injected here -->
            </div>
        </div>
    </main>
</div>

<script>
''' + js + '''
</script>
</body>
</html>'''

with open(r'd:\P6 SIMULATOR APP\index.html', 'w', encoding='utf-8') as f:
    f.write(html)
