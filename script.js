// ==========================================
// Shanay Ambani Portfolio - Main Script
// ==========================================

// --- Resume Viewer Modal (rendered via PDF.js so hyperlinks work as real links) ---
const resumeModalOverlay = document.getElementById('resume-modal-overlay');
const resumeModalClose = document.getElementById('resume-modal-close');
const resumeModalViewer = document.getElementById('resume-modal-viewer');
const resumeViewTriggers = document.querySelectorAll('#nav-resume-download, #hero-resume-download');
let resumeRendered = false;

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function renderResumePdf() {
    if (resumeRendered || !resumeModalViewer || !window.pdfjsLib) return;
    resumeRendered = true;

    try {
        const url = resumeModalViewer.getAttribute('data-src');
        const pdf = await pdfjsLib.getDocument(url).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const naturalViewport = page.getViewport({ scale: 1 });
            const availableWidth = resumeModalViewer.clientWidth - 32; // minus padding
            const scale = Math.min(2, Math.max(0.5, availableWidth / naturalViewport.width));
            const viewport = page.getViewport({ scale });

            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'resume-pdf-page';
            pageWrapper.style.width = viewport.width + 'px';
            pageWrapper.style.height = viewport.height + 'px';

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            pageWrapper.appendChild(canvas);

            const linkLayer = document.createElement('div');
            linkLayer.className = 'resume-pdf-links';
            pageWrapper.appendChild(linkLayer);

            resumeModalViewer.appendChild(pageWrapper);

            await page.render({ canvasContext: ctx, viewport }).promise;

            function addLink(url, x1, y1, x2, y2) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'resume-pdf-link';
                link.style.left = Math.min(x1, x2) + 'px';
                link.style.top = Math.min(y1, y2) + 'px';
                link.style.width = Math.abs(x2 - x1) + 'px';
                link.style.height = Math.abs(y2 - y1) + 'px';
                linkLayer.appendChild(link);
            }

            // Real embedded PDF link annotations (if any)
            const annotations = await page.getAnnotations();
            annotations.forEach(annotation => {
                if (annotation.subtype !== 'Link' || !annotation.url) return;
                const rect = pdfjsLib.Util.normalizeRect(annotation.rect);
                const [x1, y1] = viewport.convertToViewportPoint(rect[0], rect[1]);
                const [x2, y2] = viewport.convertToViewportPoint(rect[2], rect[3]);
                addLink(annotation.url, x1, y1, x2, y2);
            });

            // Fallback: detect plain-text email/LinkedIn/URL strings that were
            // never embedded as real PDF link annotations, and make them clickable.
            const textContent = await page.getTextContent();
            const patterns = [
                { re: /^[\w.+-]+@[\w-]+\.[\w.-]+$/, toUrl: (s) => 'mailto:' + s },
                { re: /^(www\.)?linkedin\.com\/\S+$/i, toUrl: (s) => 'https://' + s.replace(/^www\./i, '') },
                { re: /^(https?:\/\/)?(www\.)?[\w-]+\.[a-z]{2,}(\/\S*)?$/i, toUrl: (s) => (/^https?:\/\//i.test(s) ? s : 'https://' + s) }
            ];
            textContent.items.forEach(item => {
                const str = item.str.trim();
                if (!str) return;
                const match = patterns.find(p => p.re.test(str));
                if (!match) return;

                // Standard PDF.js text-layer positioning: tx = viewport.transform * item.transform
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const width = item.width * Math.hypot(tx[0], tx[1]);
                const x1 = tx[4];
                const y1 = tx[5] - fontHeight;
                addLink(match.toUrl(str), x1, y1, x1 + width, tx[5]);
            });
        }
    } catch (err) {
        console.error('Resume PDF render failed:', err);
    }
}

function openResumeModal(e) {
    e.preventDefault();
    resumeModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderResumePdf();
}

function closeResumeModal() {
    resumeModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

resumeViewTriggers.forEach(trigger => {
    trigger.addEventListener('click', openResumeModal);
});

if (resumeModalClose) {
    resumeModalClose.addEventListener('click', closeResumeModal);
}

if (resumeModalOverlay) {
    resumeModalOverlay.addEventListener('click', (e) => {
        if (e.target === resumeModalOverlay) closeResumeModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resumeModalOverlay.classList.contains('open')) {
        closeResumeModal();
    }
});

// --- Smooth Scrolling for Navigation ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// --- Scrollspy: Highlight Active Nav Link ---
const navItems = document.querySelectorAll('.nav-links .nav-item');
const sections = document.querySelectorAll('section[id]');

const scrollSpyOptions = {
    root: null,
    rootMargin: '-30% 0px -50% 0px', // Highlight links based on middle viewport
    threshold: 0
};

const scrollSpyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navItems.forEach(item => {
                if (item.getAttribute('href') === `#${id}`) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    });
}, scrollSpyOptions);

sections.forEach(sec => {
    scrollSpyObserver.observe(sec);
});

// --- Scroll Animations (Fade In) ---
const scrollObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        }
    });
}, { root: null, rootMargin: '0px', threshold: 0.05 });

document.querySelectorAll('.fade-in-scroll').forEach(el => {
    scrollObserver.observe(el);
});

// --- Interactive Skill Postcards (Expandable Cards) ---
const skillCards = document.querySelectorAll('.skill-card');
skillCards.forEach(card => {
    card.addEventListener('click', () => {
        const isExpanded = card.getAttribute('aria-expanded') === 'true';
        
        // Collapse all other skill cards in this category to keep layout clean
        const siblingCards = card.closest('.skill-list').querySelectorAll('.skill-card');
        siblingCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.setAttribute('aria-expanded', 'false');
                otherCard.classList.remove('expanded');
            }
        });

        // Toggle state of current card
        card.setAttribute('aria-expanded', !isExpanded);
        card.classList.toggle('expanded', !isExpanded);
    });

    // Add keyboard interaction (Space/Enter)
    card.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            card.click();
        }
    });
});

// --- Technical Details Drawer Toggles ---
const techToggles = document.querySelectorAll('.tech-toggle');
techToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const targetId = toggle.getAttribute('aria-controls');
        const panel = document.getElementById(targetId);
        
        if (panel) {
            toggle.setAttribute('aria-expanded', !isExpanded);
            if (!isExpanded) {
                panel.classList.add('open');
                toggle.querySelector('.toggle-text').innerText = 'HIDE TECHNICAL DETAILS';
            } else {
                panel.classList.remove('open');
                toggle.querySelector('.toggle-text').innerText = 'SHOW TECHNICAL DETAILS';
            }
        }
    });
});

// --- 3D STL Viewers (Three.js) ---
const stlContainers = document.querySelectorAll('.stl-viewer');

function initAllSTLViewers() {
    if (typeof THREE === 'undefined') {
        console.warn("THREE.js is not loaded. Retrying in 500ms...");
        setTimeout(initAllSTLViewers, 500);
        return;
    }

    console.log("Initializing " + stlContainers.length + " CAD models.");

    const viewerObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                obs.unobserve(entry.target);
                createSTLViewer(entry.target);
            }
        });
    }, { rootMargin: '300px' });

    stlContainers.forEach(c => {
        viewerObserver.observe(c);
    });
}

function createSTLViewer(container) {
    const modelUrl = container.getAttribute('data-model');
    if (!modelUrl) return;
    console.log("Loading CAD Model:", modelUrl);

    // Clear loading text or previous objects
    container.innerHTML = '';

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 350;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Match alternating light sections background

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio to 2 for performance
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;

    // --- Enhanced CAD Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.65)); // Ambient base

    // Primary Directional Light (Top-Right-Front)
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight1.position.set(100, 150, 100);
    scene.add(dirLight1);

    // Secondary Accent Fill Light (Bottom-Left-Back)
    const dirLight2 = new THREE.DirectionalLight(0xff5722, 0.35); // Safety orange fill tint
    dirLight2.position.set(-100, -100, -100);
    scene.add(dirLight2);

    // Overhead Fill Light (Top-Left)
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight3.position.set(-100, 150, 0);
    scene.add(dirLight3);

    // --- Loading Indicator Element ---
    const loadingDiv = document.createElement('div');
    loadingDiv.innerText = 'LOADING_3D_CAD_GEOMETRY...';
    loadingDiv.style.cssText = 'position:absolute;color:#ff5722;top:50%;left:50%;transform:translate(-50%,-50%);font-family:"Space Mono",monospace;z-index:5;font-size:0.7rem;font-weight:700;';
    container.style.position = 'relative';
    container.appendChild(loadingDiv);

    // --- STL Loader ---
    const loader = new THREE.STLLoader();
    loader.load(modelUrl, function (geometry) {
        console.log("Geometry parsed successfully for:", modelUrl);
        loadingDiv.style.display = 'none';

        // Material (Light Silver-Gray for edge visibility)
        const material = new THREE.MeshStandardMaterial({
            color: 0xc8d0d8, 
            roughness: 0.45,
            metalness: 0.2,
            flatShading: false // Smooth out surface normals
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Center Model Geometry
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox;
        const center = new THREE.Vector3();
        bb.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        // Fit Camera Viewport dynamically based on bounding box size
        const size = new THREE.Vector3();
        bb.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.45;

        camera.far = dist * 100;
        camera.near = dist * 0.01;
        camera.updateProjectionMatrix();

        // High-angle 3/4 isometric perspective
        camera.position.set(dist * 0.7, dist * 0.9, dist * 0.7);
        camera.lookAt(0, 0, 0);

        controls.target.set(0, 0, 0);
        controls.minDistance = maxDim * 0.2;
        controls.maxDistance = maxDim * 6;

        scene.add(mesh);
    }, undefined, function (error) {
        loadingDiv.innerText = 'ERROR_PARSING_CAD_DATA';
        loadingDiv.style.color = '#ef4444';
        console.error("Three.js STLLoader error on path:", modelUrl, error);
    });

    // --- Resize handler ---
    function handleResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animationFrameId;
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Clean up resources if element gets removed (prevents memory leak)
    container.addEventListener('destroy', () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
    });
}

// Fire initial loader
initAllSTLViewers();
