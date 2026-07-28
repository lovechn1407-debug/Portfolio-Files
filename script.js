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
            const isExternal = vid.link.includes('drive.google') || vid.link.includes('youtube') || vid.link.includes('youtu.be');
            const iconClass = vid.link.includes('youtube') || vid.link.includes('youtu.be') ? 'fab fa-youtube' : 'fab fa-google-drive';
            const iconColor = vid.link.includes('youtube') || vid.link.includes('youtu.be') ? '#ef4444' : '#10b981';

            if (vid.format === 'shorts') {
                if (isExternal) {
                    shortsGrid.innerHTML += `
                        <a href="${vid.link}" target="_blank" class="external-link-card glass-card aspect-916" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem;text-decoration:none;">
                            <i class="${iconClass}" style="font-size:2.5rem;color:${iconColor};margin-bottom:1rem;"></i>
                            <h4 style="color:white;font-size:1.1rem;margin-bottom:0.5rem;">${vid.title}</h4>
                            <p style="color:var(--text-secondary);font-size:0.85rem;">Click to watch video link</p>
                        </a>
                    `;
                } else {
                    shortsGrid.innerHTML += `
                        <div class="video-card aspect-916" onmouseenter="let v=this.querySelector('video'); if(v){ v.muted=true; v.play().catch(()=>{}); }" onmouseleave="let v=this.querySelector('video'); if(v){ v.pause(); v.currentTime=0; }">
                            <div class="video-loader">
                                <i class="fas fa-spinner fa-spin"></i>
                                <div class="loader-progress-bar"><div class="loader-progress-fill"></div></div>
                            </div>
                            <div class="play-icon-center"><i class="fas fa-play"></i></div>
                            <video src="${vid.link}" loop muted playsinline poster="${vid.thumb || ''}" preload="none"></video>
                            <div class="video-overlay">
                                <h4 class="video-title">${vid.title}</h4>
                                <p class="video-desc">${vid.desc || ''}</p>
                            </div>
                        </div>
                    `;
                }
            } else if (vid.format === 'longform') {
                if (isExternal) {
                    longformGrid.innerHTML += `
                        <a href="${vid.link}" target="_blank" class="external-link-card glass-card aspect-169" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;text-decoration:none;">
                            <i class="${iconClass}" style="font-size:3rem;color:${iconColor};margin-bottom:1rem;"></i>
                            <h4 style="color:white;font-size:1.3rem;margin-bottom:0.5rem;">${vid.title}</h4>
                            <p style="color:var(--text-secondary);font-size:0.9rem;">Click to watch on Google Drive / YouTube</p>
                        </a>
                    `;
                } else {
                    longformGrid.innerHTML += `
                        <div class="video-card aspect-169" onmouseenter="let v=this.querySelector('video'); if(v){ v.muted=true; v.play().catch(()=>{}); }" onmouseleave="let v=this.querySelector('video'); if(v){ v.pause(); v.currentTime=0; }">
                            <div class="video-loader">
                                <i class="fas fa-spinner fa-spin"></i>
                                <div class="loader-progress-bar"><div class="loader-progress-fill"></div></div>
                            </div>
                            <div class="play-icon-center"><i class="fas fa-play"></i></div>
                            <video src="${vid.link}" loop muted playsinline poster="${vid.thumb || ''}" preload="none"></video>
                            <div class="video-overlay">
                                <h4 class="video-title">${vid.title}</h4>
                                <p class="video-desc">${vid.desc || ''}</p>
                            </div>
                        </div>
                    `;
                }
            }
        });

        // Initialize Native Video Loading Bars & Fix Initial Buffer State
        document.querySelectorAll('.video-card video').forEach(v => {
            const loader = v.parentElement.querySelector('.video-loader');
            const progressFill = v.parentElement.querySelector('.loader-progress-fill');
            if (loader && progressFill) {
                const hideLoader = () => {
                    loader.classList.remove('active');
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        if (!loader.classList.contains('active')) {
                            loader.style.display = 'none';
                        }
                    }, 300);
                };

                const showLoader = () => {
                    loader.style.display = 'flex';
                    setTimeout(() => loader.classList.add('active'), 10);
                };

                // Hide loader overlay by default so poster/preview and play icon show cleanly
                hideLoader();

                v.addEventListener('progress', () => {
                    if (v.buffered.length > 0 && v.duration > 0) {
                        const pct = (v.buffered.end(v.buffered.length - 1) / v.duration) * 100;
                        progressFill.style.width = pct + '%';
                        if (pct > 90) hideLoader();
                    }
                });

                v.addEventListener('canplay', hideLoader);
                v.addEventListener('loadeddata', hideLoader);
                v.addEventListener('loadedmetadata', hideLoader);
                v.addEventListener('playing', hideLoader);
                v.addEventListener('pause', hideLoader);
                v.addEventListener('waiting', showLoader);
            }
        });

        // Re-attach popup click events after dynamic render
        attachPopupEvents();
    }

    // Global shared cloud endpoint so all devices see added videos live
    const CLOUD_JSON_URL = 'https://jsonblob.com/api/jsonBlob/019fa880-a3ea-712e-9bf8-c5169520ad47';

    // Fetch videos from Global Cloud Storage, static videos.json, or fall back to localStorage
    async function loadVideos() {
        // 1. Primary: Global Shared Cloud Endpoint (Works across all devices)
        try {
            const resp = await fetch(CLOUD_JSON_URL, {
                headers: { 'Accept': 'application/json' }
            });
            if (resp.ok) {
                const json = await resp.json();
                const vids = json.videos || [];
                if (vids && vids.length > 0) {
                    localStorage.setItem('port_videos', JSON.stringify(vids));
                    renderVideos(vids);
                    return;
                }
            }
        } catch (e) {
            console.warn('Global Cloud fetch failed, trying local fallback:', e);
        }

        // 2. Secondary: Static videos.json file in repository
        try {
            const resp = await fetch('./videos.json');
            if (resp.ok) {
                const json = await resp.json();
                const vids = json.videos || [];
                if (vids && vids.length > 0) {
                    renderVideos(vids);
                    return;
                }
            }
        } catch (e) {
            console.warn('Static videos.json fetch failed:', e);
        }

        // 3. Fallback: Local Device Storage
        const localVids = JSON.parse(localStorage.getItem('port_videos')) || [];
        renderVideos(localVids);
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
                popupVideo.muted = false;
                popupVideo.play().catch(() => {});
            });
        });

        const closePopup = () => {
            popupOverlay.classList.remove('active');
            popupVideo.pause();
            popupVideo.removeAttribute('src');
            popupVideo.load();
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

    /* --- Reveal Elements on Scroll (IntersectionObserver - zero layout thrash) --- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.glass-card, .video-card').forEach(el => {
        el.classList.add('reveal-hidden');
        revealObserver.observe(el);
    });
});
