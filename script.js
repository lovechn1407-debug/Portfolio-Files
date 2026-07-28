document.addEventListener('DOMContentLoaded', () => {

    /* --- Navbar Scroll Effect --- */
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* --- Mobile Menu Toggle --- */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    /* --- Dynamic Videos from JSONBin.io Cloud Storage --- */
    const shortsGrid = document.getElementById('shorts-grid');
    const longformGrid = document.getElementById('longform-grid');

    // Read JSONBin credentials (set once via admin panel)
    const JSONBIN_BIN_ID = localStorage.getItem('jsonbin_bin_id') || '';
    const JSONBIN_API_KEY = localStorage.getItem('jsonbin_api_key') || '';

    function renderVideos(managedVideos) {
        if (!shortsGrid || !longformGrid) return;
        shortsGrid.innerHTML = '';
        longformGrid.innerHTML = '';

        if (!managedVideos || managedVideos.length === 0) {
            shortsGrid.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-film" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.3;"></i><p>Videos coming soon!</p></div>`;
            longformGrid.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-secondary);"><i class="fas fa-film" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:0.3;"></i><p>Videos coming soon!</p></div>`;
            return;
        }

        managedVideos.forEach(vid => {
            if (vid.format === 'shorts') {
                shortsGrid.innerHTML += `
                    <div class="video-card aspect-916" onmouseenter="let v=this.querySelector('video'); v.muted=false; v.play();" onmouseleave="let v=this.querySelector('video'); v.pause(); v.muted=true;">
                        <div class="video-loader">
                            <i class="fas fa-spinner fa-spin"></i>
                            <div class="loader-progress-bar"><div class="loader-progress-fill"></div></div>
                        </div>
                        <div class="play-icon-center"><i class="fas fa-play"></i></div>
                        <video src="${vid.link}" loop muted playsinline poster="${vid.thumb || ''}" preload="auto"></video>
                        <div class="video-overlay">
                            <h4 class="video-title">${vid.title}</h4>
                            <p class="video-desc">${vid.desc}</p>
                        </div>
                    </div>
                `;
            } else if (vid.format === 'longform') {
                if (vid.link.includes('drive.google') || vid.link.includes('youtube')) {
                    longformGrid.innerHTML += `
                        <a href="${vid.link}" target="_blank" class="external-link-card glass-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;">
                            <i class="fab fa-google-drive" style="font-size:2rem;color:#10b981;margin-bottom:1rem;"></i>
                            <h4>${vid.title}</h4>
                            <p>Click to watch on Google Drive / YouTube</p>
                        </a>
                    `;
                } else {
                    longformGrid.innerHTML += `
                        <div class="video-card aspect-169" onmouseenter="let v=this.querySelector('video'); v.muted=false; v.play();" onmouseleave="let v=this.querySelector('video'); v.pause(); v.muted=true;">
                            <div class="video-loader">
                                <i class="fas fa-spinner fa-spin"></i>
                                <div class="loader-progress-bar"><div class="loader-progress-fill"></div></div>
                            </div>
                            <div class="play-icon-center"><i class="fas fa-play"></i></div>
                            <video src="${vid.link}" loop muted playsinline poster="${vid.thumb || ''}" preload="auto"></video>
                            <div class="video-overlay">
                                <h4 class="video-title">${vid.title}</h4>
                                <p class="video-desc">${vid.desc}</p>
                            </div>
                        </div>
                    `;
                }
            }
        });

        // Initialize Native Video Loading Bars
        document.querySelectorAll('.video-card video').forEach(v => {
            const loader = v.parentElement.querySelector('.video-loader');
            const progressFill = v.parentElement.querySelector('.loader-progress-fill');
            if (loader && progressFill) {
                v.addEventListener('progress', () => {
                    if (v.buffered.length > 0 && v.duration > 0) {
                        const pct = (v.buffered.end(v.buffered.length - 1) / v.duration) * 100;
                        progressFill.style.width = pct + '%';
                        if (pct > 99) loader.style.opacity = '0';
                    }
                });
                const hideLoader = () => { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 300); };
                v.addEventListener('canplay', hideLoader);
                v.addEventListener('playing', hideLoader);
                v.addEventListener('waiting', () => { loader.style.display = 'flex'; setTimeout(() => loader.style.opacity = '1', 10); });
            }
        });

        // Re-attach popup click events after dynamic render
        attachPopupEvents();
    }

    // Fetch videos from JSONBin.io (shared cloud) or fall back to localStorage
    async function loadVideos() {
        if (JSONBIN_BIN_ID && JSONBIN_API_KEY) {
            try {
                const resp = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
                    headers: { 'X-Master-Key': JSONBIN_API_KEY }
                });
                const json = await resp.json();
                renderVideos(json.record?.videos || []);
                return;
            } catch (e) {
                console.warn('JSONBin fetch failed, falling back to localStorage:', e);
            }
        }
        // Fallback: localStorage (local device only)
        renderVideos(JSON.parse(localStorage.getItem('port_videos')) || []);
    }

    loadVideos();


    /* --- Video Filter Logic (Tabs) --- */
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            if (filterValue === 'shorts') {
                shortsGrid.style.display = 'grid';
                longformGrid.style.display = 'none';
            } else if (filterValue === 'longform') {
                shortsGrid.style.display = 'none';
                longformGrid.style.display = 'grid';
            }
        });
    });

    /* --- Video Popup Logic --- */
    const popupOverlay = document.getElementById('video-popup');
    const popupVideo = document.getElementById('popup-video-player');
    const closePopupBtn = document.getElementById('close-popup');

    function attachPopupEvents() {
        if (!popupOverlay || !popupVideo || !closePopupBtn) return;

        document.querySelectorAll('.video-card').forEach(card => {
            // Remove any previously attached listener to avoid duplicates
            card.replaceWith(card.cloneNode(true));
        });

        document.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const vNode = card.querySelector('video');
                if (!vNode) return;
                const videoSource = vNode.getAttribute('src');
                if (!videoSource) return;

                popupVideo.src = videoSource;
                popupVideo.currentTime = vNode.currentTime || 0;

                const container = popupOverlay.querySelector('.video-popup-container');
                if (card.classList.contains('aspect-169')) {
                    container.style.aspectRatio = '16/9';
                    container.style.maxWidth = '800px';
                } else {
                    container.style.aspectRatio = '9/16';
                    container.style.maxWidth = '450px';
                }

                vNode.pause();
                popupOverlay.classList.add('active');
                popupVideo.play();
            });
        });

        const closePopup = () => {
            popupOverlay.classList.remove('active');
            popupVideo.pause();
            popupVideo.src = '';
        };

        closePopupBtn.onclick = closePopup;
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) closePopup();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePopup();
        });
    }

    // Attach on first load (for any statically rendered cards)
    attachPopupEvents();

    /* --- Reveal Elements on Scroll --- */
    const revealElements = document.querySelectorAll('.glass-card, .video-card');

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 50;

        revealElements.forEach(el => {
            const elTop = el.getBoundingClientRect().top;
            if (elTop < windowHeight - revealPoint) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger on load
});
