document.addEventListener('DOMContentLoaded', async () => {

    /* --- ADMIN AUTHENTICATION GUARD & LOGIN UI --- */
    const adminLoginModal = document.getElementById('admin-login-modal');
    const adminLoginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error');
    const loginErrorMsg = document.getElementById('login-error-msg');
    const togglePassBtn = document.getElementById('toggle-pass-visibility');
    const passInput = document.getElementById('login-pass');
    const logoutBtn = document.getElementById('logout-btn');

    function checkAuthGuard() {
        const isAuth = sessionStorage.getItem('admin_auth') === 'true';
        if (!isAuth && adminLoginModal) {
            adminLoginModal.classList.add('active');
        } else if (isAuth && adminLoginModal) {
            adminLoginModal.classList.remove('active');
        }
    }

    // Toggle password visibility
    if (togglePassBtn && passInput) {
        togglePassBtn.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            togglePassBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Handle Login submission
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const idVal = document.getElementById('login-id').value.trim();
            const passVal = document.getElementById('login-pass').value.trim();

            if (idVal === "admin" && passVal === "lkl4inch") {
                sessionStorage.setItem('admin_auth', 'true');
                if (adminLoginModal) adminLoginModal.classList.remove('active');
                if (loginError) loginError.style.display = 'none';
            } else if (idVal !== "admin") {
                loginErrorMsg.textContent = "Incorrect Admin ID.";
                loginError.style.display = 'flex';
            } else {
                loginErrorMsg.textContent = "Incorrect Admin Password.";
                loginError.style.display = 'flex';
            }
        });
    }

    // Logout logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('admin_auth');
            window.location.href = 'index.html';
        });
    }

    checkAuthGuard();


    /* --- ADMIN DASHBOARD & VIDEO MANAGEMENT --- */
    const form = document.getElementById('add-video-form');
    const videoList = document.getElementById('admin-video-list');
    const countDisplay = document.getElementById('video-count');
    const clearBtn = document.getElementById('clear-all-btn');

    // Global shared cloud endpoint so all devices see added videos live
    const CLOUD_JSON_URL = 'https://jsonblob.com/api/jsonBlob/019fa880-a3ea-712e-9bf8-c5169520ad47';

    // Load from cloud storage (cross-device), else fall back to localStorage
    let videos = [];
    try {
        const resp = await fetch(CLOUD_JSON_URL, { headers: { 'Accept': 'application/json' } });
        if (resp.ok) {
            const json = await resp.json();
            videos = json.videos || [];
            localStorage.setItem('port_videos', JSON.stringify(videos));
        } else {
            videos = JSON.parse(localStorage.getItem('port_videos')) || [];
        }
    } catch(e) {
        console.warn('Could not load from cloud, using localStorage', e);
        videos = JSON.parse(localStorage.getItem('port_videos')) || [];
    }

    async function syncVideos() {
        localStorage.setItem('port_videos', JSON.stringify(videos));
        try {
            // Fetch current cloud blob to preserve siteData during video sync
            let currentSiteData = {};
            try {
                const cur = await fetch(CLOUD_JSON_URL, { headers: { 'Accept': 'application/json' } });
                if (cur.ok) { const j = await cur.json(); currentSiteData = j.siteData || {}; }
            } catch(e) {}

            await fetch(CLOUD_JSON_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ videos: videos, siteData: currentSiteData })
            });
            console.log('Successfully synced videos to global cloud.');
        } catch(e) {
            console.warn('Global cloud sync failed:', e);
        }
    }

    let draggedItemIdx = null;

    function renderAdminList() {
        videoList.innerHTML = '';
        countDisplay.textContent = videos.length;

        if (videos.length === 0) {
            videoList.innerHTML = '<p style="color:var(--text-secondary); font-size: 0.9rem;">No videos mapped yet. Add your first video above!</p>';
            return;
        }

        videos.forEach((vid, index) => {
            const row = document.createElement('div');
            row.className = 'admin-video-card';
            row.draggable = true;
            row.dataset.index = index;

            const thumbIcon = vid.format === 'shorts' ? '<i class="fab fa-instagram" style="color:#ec4899;"></i>' : '<i class="fab fa-youtube" style="color:#ef4444;"></i>';
            const isExternal = vid.link.includes('drive.google') || vid.link.includes('youtube') || !vid.link.includes('api.telegram.org');
            const linkBadge = isExternal ? '<i class="fas fa-link" style="color:#10b981; margin-left: 5px;" title="Direct/External Link"></i>' : '<i class="fab fa-telegram" style="color:#0088cc; margin-left: 5px;" title="Telegram Stream"></i>';

            row.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
                    <div class="admin-video-info">
                        <h4>${thumbIcon} ${vid.title} ${linkBadge}</h4>
                        <p>${vid.desc || 'No description'} | <span style="text-transform: capitalize; color: var(--accent-purple);">${vid.format}</span></p>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <button class="btn-edit" onclick="openEditVideoModal(${index})" title="Edit Video Details">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-danger" onclick="deleteVideo(${index})" title="Remove Video">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Drag and Drop Logic
            row.addEventListener('dragstart', () => {
                draggedItemIdx = index;
                setTimeout(() => row.classList.add('dragging'), 0);
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                draggedItemIdx = null;
                document.querySelectorAll('.admin-video-card').forEach(n => n.classList.remove('drag-over'));
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.classList.add('drag-over');
            });

            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });

            row.addEventListener('drop', async (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                if (draggedItemIdx === null || draggedItemIdx === index) return;

                const draggedVid = videos.splice(draggedItemIdx, 1)[0];
                videos.splice(index, 0, draggedVid);

                await syncVideos();
                renderAdminList();
            });

            videoList.appendChild(row);
        });
    }


    /* --- VIDEO SOURCE TAB TOGGLE (FILE UPLOAD VS DIRECT LINK) --- */
    const tabSourceFile = document.getElementById('tab-source-file');
    const tabSourceLink = document.getElementById('tab-source-link');
    const fileUploadGroup = document.getElementById('file-upload-group');
    const directLinkGroup = document.getElementById('direct-link-group');
    const fileInput = document.getElementById('v-file');
    const directLinkInput = document.getElementById('v-direct-link');

    if (tabSourceFile && tabSourceLink) {
        tabSourceFile.addEventListener('click', () => {
            tabSourceFile.classList.add('active');
            tabSourceLink.classList.remove('active');
            fileUploadGroup.style.display = 'block';
            directLinkGroup.style.display = 'none';
            fileInput.required = true;
            directLinkInput.required = false;
        });

        tabSourceLink.addEventListener('click', () => {
            tabSourceLink.classList.add('active');
            tabSourceFile.classList.remove('active');
            fileUploadGroup.style.display = 'none';
            directLinkGroup.style.display = 'block';
            fileInput.required = false;
            directLinkInput.required = true;
        });
    }


    /* --- FORM SUBMISSION --- */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titleVal = document.getElementById('v-title').value.trim();
        const descVal = document.getElementById('v-desc').value.trim();
        const format = document.getElementById('v-format').value;
        const thumbVal = document.getElementById('v-thumb').value.trim();
        const submitBtn = document.getElementById('submit-btn');

        const isDirectLinkMode = tabSourceLink && tabSourceLink.classList.contains('active');

        // Mode 1: Direct Video Link Submission
        if (isDirectLinkMode) {
            const linkVal = directLinkInput.value.trim();

            if (!linkVal) {
                alert('Please enter a valid video URL or link.');
                return;
            }

            const newVideo = {
                title: titleVal,
                desc: descVal,
                format: format,
                link: linkVal,
                thumb: thumbVal || (linkVal.includes('drive.google') ? 'https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png' : '')
            };

            videos.unshift(newVideo);
            await syncVideos();

            form.reset();
            // Reset to file tab by default
            tabSourceFile.click();
            renderAdminList();
            alert('Direct Video Link successfully added to portfolio!');
            return;
        }

        // Mode 2: File Upload (Telegram Server)
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a video file to upload.');
            return;
        }

        const videoFile = fileInput.files[0];
        const formData = new FormData();
        formData.append('video', videoFile);

        submitBtn.innerHTML = `Uploading to Server... <i class="fas fa-spinner fa-spin"></i>`;
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                throw new Error(rawText || 'Server returned an unexpected response.');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Server error uploading video.');
            }

            const newVideo = {
                title: titleVal,
                desc: descVal,
                format: format,
                link: data.url,
                thumb: thumbVal
            };

            videos.unshift(newVideo);
            await syncVideos();

            form.reset();
            tabSourceFile.click();
            renderAdminList();
            alert('Video successfully uploaded and added to portfolio!');

        } catch (error) {
            console.error(error);
            alert('Upload failed: ' + error.message);
        } finally {
            submitBtn.innerHTML = `Add to Portfolio <i class="fas fa-plus-circle"></i>`;
            submitBtn.style.opacity = '1';
            submitBtn.disabled = false;
        }
    });

    window.deleteVideo = async (index) => {
        if (confirm('Are you sure you want to delete this video?')) {
            videos.splice(index, 1);
            await syncVideos();
            renderAdminList();
        }
    };

    clearBtn.addEventListener('click', async () => {
        if (confirm('WARNING: This will delete ALL managed videos from your portfolio. Proceed?')) {
            videos = [];
            await syncVideos();
            renderAdminList();
        }
    });

    // Initial render
    renderAdminList();


    /* =====================================================
       ADMIN TAB SWITCHING
    ===================================================== */
    const tabVideosBtn = document.getElementById('tab-videos-btn');
    const tabSettingsBtn = document.getElementById('tab-settings-btn');
    const panelVideos = document.getElementById('panel-videos');
    const panelSettings = document.getElementById('panel-settings');

    if (tabVideosBtn && tabSettingsBtn) {
        tabVideosBtn.addEventListener('click', () => {
            tabVideosBtn.classList.add('active');
            tabSettingsBtn.classList.remove('active');
            panelVideos.classList.add('active');
            panelSettings.classList.remove('active');
        });
        tabSettingsBtn.addEventListener('click', () => {
            tabSettingsBtn.classList.add('active');
            tabVideosBtn.classList.remove('active');
            panelSettings.classList.add('active');
            panelVideos.classList.remove('active');
        });
    }


    /* =====================================================
       SITE SETTINGS — Load & Render
    ===================================================== */
    const DEFAULT_SITE_DATA = {
        location: 'Delhi, India',
        experience: '2 Years Experience',
        education: 'B.Tech Student',
        age: '18',
        profileImg: 'https://i.ibb.co/Tx8KS1Vf/IMG-20260210-164004.jpg',
        aboutText: `Hello! I'm <strong>Love Chauhan</strong>, a passionate 18-year-old video editor from <strong>Delhi</strong>. Currently pursuing my <strong>B.Tech</strong>, I balance my technical studies with my creative drive for video production.<br><br>With <strong>2 years of hands-on experience</strong>, I specialize in crafting engaging visual narratives.`,
        email: 'lovechn1407@gmail.com',
        instagram: 'love_chn.14',
        instagramUrl: 'https://www.instagram.com/love_chn.14/',
        works: [
            { icon: 'fab fa-youtube', iconBg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444', title: 'YouTube Channel', duration: '5 Months', desc: 'Managed post-production for an active channel.' },
            { icon: 'fas fa-school', iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6', title: 'The Sovereign School', duration: '1 Month', desc: 'Created educational and promotional video content for school events.' },
            { icon: 'fas fa-om', iconBg: 'rgba(139,92,246,0.1)', iconColor: '#8b5cf6', title: 'Iskcon Temple', duration: 'Project Basis', desc: 'Edited spiritual and event coverage content for social media outreach.' }
        ],
        skills: [
            { name: 'Premiere Pro', logoUrl: '', logoText: 'Pr', logoBg: '#00005b', logoColor: '#9999ff', level: 'Fluent' },
            { name: 'After Effects', logoUrl: '', logoText: 'Ae', logoBg: '#00005b', logoColor: '#d291ff', level: 'Intermediate' },
            { name: 'CapCut', logoUrl: '', logoText: 'CC', logoBg: '#000000', logoColor: '#ffffff', level: 'Fluent' },
            { name: 'Alight Motion', logoUrl: '', logoText: 'AM', logoBg: '#0d1117', logoColor: '#14b8a6', level: 'Fluent' },
            { name: 'After Motion', logoUrl: '', logoText: 'AM', logoBg: '#1a0a10', logoColor: '#ec4899', level: 'Intermediate' }
        ]
    };

    let siteData = { ...DEFAULT_SITE_DATA };

    // ---- imgbb Upload Utility ----
    const IMGBB_API_KEY = '83e3f88941efd1059a89f016ff302d9e';

    async function uploadToImgbb(file, statusEl) {
        if (statusEl) { statusEl.textContent = 'Uploading...'; }
        const formData = new FormData();
        formData.append('image', file);
        try {
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                if (statusEl) { statusEl.textContent = '✓ Uploaded!'; statusEl.style.color = '#4ade80'; setTimeout(() => { statusEl.textContent = ''; statusEl.style.color = ''; }, 3000); }
                return data.data.url;
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        } catch(e) {
            if (statusEl) { statusEl.textContent = '✗ ' + e.message; statusEl.style.color = '#ef4444'; }
            return null;
        }
    }

    // Wire Profile Photo imgbb upload
    const profileImgFileInput = document.getElementById('profile-img-file');
    const profileImgUrlInput = document.getElementById('sd-profile-img');
    const profileUploadStatus = document.getElementById('profile-upload-status');
    if (profileImgFileInput) {
        profileImgFileInput.addEventListener('change', async () => {
            const file = profileImgFileInput.files[0];
            if (!file) return;
            const url = await uploadToImgbb(file, profileUploadStatus);
            if (url) {
                if (profileImgUrlInput) profileImgUrlInput.value = url;
                const prev = document.getElementById('settings-profile-preview');
                if (prev) prev.src = url;
            }
        });
    }

    // Wire Thumbnail imgbb upload
    const thumbImgFileInput = document.getElementById('thumb-img-file');
    const thumbUrlInput = document.getElementById('v-thumb');
    const thumbUploadStatus = document.getElementById('thumb-upload-status');
    if (thumbImgFileInput) {
        thumbImgFileInput.addEventListener('change', async () => {
            const file = thumbImgFileInput.files[0];
            if (!file) return;
            const url = await uploadToImgbb(file, thumbUploadStatus);
            if (url && thumbUrlInput) thumbUrlInput.value = url;
        });
    }

    /* ---- Video Frame Grabber Utility ---- */
    async function captureVideoFrameToImgbb(videoElement, statusElement) {
        if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
            if (statusElement) {
                statusElement.textContent = '✗ Video frame is not ready. Play or scrub to a frame first.';
                statusElement.style.color = '#ef4444';
            }
            return null;
        }

        if (statusElement) {
            statusElement.textContent = '📸 Capturing frame & uploading to ImgBB...';
            statusElement.style.color = 'var(--accent-purple)';
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        let drawSuccess = false;
        try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            canvas.toDataURL('image/jpeg');
            drawSuccess = true;
        } catch (e) {
            drawSuccess = false;
        }

        // Fallback: If direct draw failed due to CORS on external URL, fetch via serverless CORS proxy
        if (!drawSuccess && videoElement.src && !videoElement.src.startsWith('blob:')) {
            try {
                if (statusElement) {
                    statusElement.textContent = '⏳ Processing external video via CORS proxy...';
                    statusElement.style.color = 'var(--accent-purple)';
                }
                const proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(videoElement.src)}`;
                const resp = await fetch(proxyUrl);
                if (resp.ok) {
                    const blob = await resp.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const tempVid = document.createElement('video');
                    tempVid.muted = true;
                    tempVid.src = blobUrl;
                    await new Promise(r => { tempVid.onloadeddata = r; tempVid.currentTime = videoElement.currentTime; });
                    await new Promise(r => { tempVid.onseeked = r; setTimeout(r, 200); });
                    ctx.drawImage(tempVid, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(blobUrl);
                    drawSuccess = true;
                }
            } catch (err) {
                console.warn('CORS Proxy fallback failed:', err);
                drawSuccess = false;
            }
        }

        if (!drawSuccess) {
            if (statusElement) {
                statusElement.textContent = '✗ Remote server restricts canvas frame extraction. Please upload an image file using the Upload button above.';
                statusElement.style.color = '#ef4444';
            }
            return null;
        }

        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    if (statusElement) {
                        statusElement.textContent = '✗ Failed to extract frame image.';
                        statusElement.style.color = '#ef4444';
                    }
                    resolve(null);
                    return;
                }

                const frameFile = new File([blob], `frame_${Date.now()}.jpg`, { type: 'image/jpeg' });
                const imageUrl = await uploadToImgbb(frameFile, statusElement);
                if (imageUrl && statusElement) {
                    statusElement.textContent = '✓ Frame captured & set as cover!';
                    statusElement.style.color = '#4ade80';
                }
                resolve(imageUrl);
            }, 'image/jpeg', 0.95);
        });
    }

    /* ---- Add Video Form Frame Grabber Wiring ---- */
    const addFrameGrabberBox = document.getElementById('add-frame-grabber-box');
    const addFrameVideo = document.getElementById('add-frame-video');
    const addCaptureFrameBtn = document.getElementById('add-capture-frame-btn');
    const addCaptureStatus = document.getElementById('add-capture-status');

    if (fileInput && addFrameVideo && addFrameGrabberBox) {
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                addFrameVideo.src = URL.createObjectURL(file);
                addFrameGrabberBox.style.display = 'block';
            }
        });
    }

    if (directLinkInput && addFrameVideo && addFrameGrabberBox) {
        const updateDirectVideoPreview = () => {
            const val = directLinkInput.value.trim();
            if (val && (val.includes('.mp4') || val.includes('api.telegram.org') || val.startsWith('http'))) {
                addFrameVideo.src = val;
                addFrameGrabberBox.style.display = 'block';
            }
        };
        directLinkInput.addEventListener('change', updateDirectVideoPreview);
        directLinkInput.addEventListener('blur', updateDirectVideoPreview);
    }

    if (addCaptureFrameBtn && addFrameVideo) {
        addCaptureFrameBtn.addEventListener('click', async () => {
            const imgUrl = await captureVideoFrameToImgbb(addFrameVideo, addCaptureStatus);
            if (imgUrl) {
                const thumbInput = document.getElementById('v-thumb');
                if (thumbInput) thumbInput.value = imgUrl;
            }
        });
    }

    /* ---- Edit Video Modal Logic ---- */
    const editVideoModal = document.getElementById('edit-video-modal');
    const closeEditVideoModalBtn = document.getElementById('close-edit-video-modal');
    const editVideoForm = document.getElementById('edit-video-form');
    const editVIndex = document.getElementById('edit-v-index');
    const editVTitle = document.getElementById('edit-v-title');
    const editVDesc = document.getElementById('edit-v-desc');
    const editVFormat = document.getElementById('edit-v-format');
    const editVLink = document.getElementById('edit-v-link');
    const editVThumb = document.getElementById('edit-v-thumb');
    const editThumbFile = document.getElementById('edit-thumb-file');
    const editThumbStatus = document.getElementById('edit-thumb-status');
    const editFrameVideo = document.getElementById('edit-frame-video');
    const editCaptureFrameBtn = document.getElementById('edit-capture-frame-btn');
    const editCaptureStatus = document.getElementById('edit-capture-status');
    const editSubmitBtn = document.getElementById('edit-submit-btn');

    window.openEditVideoModal = (index) => {
        const vid = videos[index];
        if (!vid) return;
        editVIndex.value = index;
        editVTitle.value = vid.title || '';
        editVDesc.value = vid.desc || '';
        editVFormat.value = vid.format || 'shorts';
        editVLink.value = vid.link || '';
        editVThumb.value = vid.thumb || '';

        if (editFrameVideo && vid.link) {
            editFrameVideo.src = vid.link;
        }

        if (editVideoModal) editVideoModal.classList.add('active');
    };

    if (closeEditVideoModalBtn && editVideoModal) {
        closeEditVideoModalBtn.addEventListener('click', () => {
            editVideoModal.classList.remove('active');
            if (editFrameVideo) editFrameVideo.pause();
        });
    }

    if (editVLink && editFrameVideo) {
        editVLink.addEventListener('change', () => {
            if (editVLink.value) editFrameVideo.src = editVLink.value;
        });
    }

    if (editThumbFile) {
        editThumbFile.addEventListener('change', async () => {
            const file = editThumbFile.files[0];
            if (!file) return;
            const url = await uploadToImgbb(file, editThumbStatus);
            if (url && editVThumb) editVThumb.value = url;
        });
    }

    if (editCaptureFrameBtn && editFrameVideo) {
        editCaptureFrameBtn.addEventListener('click', async () => {
            const imgUrl = await captureVideoFrameToImgbb(editFrameVideo, editCaptureStatus);
            if (imgUrl && editVThumb) editVThumb.value = imgUrl;
        });
    }

    if (editVideoForm) {
        editVideoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idx = parseInt(editVIndex.value, 10);
            if (isNaN(idx) || !videos[idx]) return;

            editSubmitBtn.disabled = true;
            editSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            videos[idx] = {
                title: editVTitle.value.trim(),
                desc: editVDesc.value.trim(),
                format: editVFormat.value,
                link: editVLink.value.trim(),
                thumb: editVThumb.value.trim()
            };

            await syncVideos();
            renderAdminList();
            editVideoModal.classList.remove('active');
            if (editFrameVideo) editFrameVideo.pause();
            editSubmitBtn.disabled = false;
            editSubmitBtn.innerHTML = '<i class="fas fa-save"></i> Save Video Changes';
            alert('✓ Video details updated successfully!');
        });
    }

    // Load siteData from cloud or localStorage
    try {
        const sdResp = await fetch(CLOUD_JSON_URL, { headers: { 'Accept': 'application/json' } });
        if (sdResp.ok) {
            const j = await sdResp.json();
            if (j.siteData) {
                siteData = Object.assign({}, DEFAULT_SITE_DATA, j.siteData);
                if (!siteData.works || !siteData.works.length) siteData.works = DEFAULT_SITE_DATA.works;
                if (!siteData.skills || !siteData.skills.length) siteData.skills = DEFAULT_SITE_DATA.skills;
                localStorage.setItem('port_sitedata', JSON.stringify(siteData));
            }
        }
    } catch(e) {
        const local = JSON.parse(localStorage.getItem('port_sitedata') || 'null');
        if (local) siteData = Object.assign({}, DEFAULT_SITE_DATA, local);
    }

    function populateSettingsForm() {
        const g = (id) => document.getElementById(id);
        const sd = siteData;
        if (g('sd-profile-img')) { g('sd-profile-img').value = sd.profileImg || ''; }
        if (g('sd-location')) g('sd-location').value = sd.location || '';
        if (g('sd-experience')) g('sd-experience').value = sd.experience || '';
        if (g('sd-education')) g('sd-education').value = sd.education || '';
        if (g('sd-age')) g('sd-age').value = sd.age || '';
        if (g('sd-about-text')) g('sd-about-text').value = sd.aboutText || '';
        if (g('sd-email')) g('sd-email').value = sd.email || '';
        if (g('sd-instagram')) g('sd-instagram').value = sd.instagram || '';
        if (g('sd-instagram-url')) g('sd-instagram-url').value = sd.instagramUrl || '';
        // Profile preview
        if (g('settings-profile-preview') && sd.profileImg) g('settings-profile-preview').src = sd.profileImg;
        renderWorkCards();
        renderSkillCards();
    }

    // Update profile preview live
    const sdProfileImgInput = document.getElementById('sd-profile-img');
    const profilePreview = document.getElementById('settings-profile-preview');
    if (sdProfileImgInput && profilePreview) {
        sdProfileImgInput.addEventListener('input', () => {
            if (sdProfileImgInput.value) profilePreview.src = sdProfileImgInput.value;
        });
    }

    /* --- Work Cards Renderer --- */
    function renderWorkCards() {
        const container = document.getElementById('work-cards-editor');
        if (!container) return;
        container.innerHTML = '';
        siteData.works.forEach((w, i) => {
            const card = document.createElement('div');
            card.className = 'work-editor-card';
            card.innerHTML = `
                <div class="work-editor-card-header">
                    <span class="work-editor-card-title"><i class="fas fa-briefcase" style="color:var(--accent-purple)"></i> Work Entry ${i + 1}</span>
                    <button type="button" class="btn-danger" onclick="removeWorkCard(${i})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
                <div class="work-fields-row">
                    <div class="form-group" style="margin:0;">
                        <label>Title</label>
                        <input type="text" class="form-control wc-title" data-idx="${i}" value="${escapeHtml(w.title)}" placeholder="YouTube Channel">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Duration</label>
                        <input type="text" class="form-control wc-duration" data-idx="${i}" value="${escapeHtml(w.duration)}" placeholder="5 Months">
                    </div>
                </div>
                <div class="form-group" style="margin-top:0.75rem;">
                    <label>Description</label>
                    <input type="text" class="form-control wc-desc" data-idx="${i}" value="${escapeHtml(w.desc)}" placeholder="What did you do?">
                </div>
                <div class="work-fields-row" style="margin-top:0;">
                    <div class="form-group" style="margin:0;">
                        <label>Icon Class (Font Awesome)</label>
                        <input type="text" class="form-control wc-icon" data-idx="${i}" value="${escapeHtml(w.icon)}" placeholder="fab fa-youtube">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Icon Color</label>
                        <div class="color-row">
                            <input type="color" class="wc-icon-color-picker" data-idx="${i}" value="${w.iconColor || '#8b5cf6'}">
                            <input type="text" class="form-control wc-icon-color" data-idx="${i}" value="${escapeHtml(w.iconColor)}" placeholder="#ef4444">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Sync color picker <-> text input
        container.querySelectorAll('.wc-icon-color-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = +picker.dataset.idx;
                const textInput = container.querySelector(`.wc-icon-color[data-idx="${idx}"]`);
                if (textInput) textInput.value = picker.value;
            });
        });
        container.querySelectorAll('.wc-icon-color').forEach(txt => {
            txt.addEventListener('input', () => {
                const idx = +txt.dataset.idx;
                const picker = container.querySelector(`.wc-icon-color-picker[data-idx="${idx}"]`);
                if (picker && /^#[0-9a-f]{6}$/i.test(txt.value)) picker.value = txt.value;
            });
        });
    }

    function escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    window.removeWorkCard = (idx) => {
        siteData.works.splice(idx, 1);
        renderWorkCards();
    };

    const addWorkBtn = document.getElementById('add-work-btn');
    if (addWorkBtn) {
        addWorkBtn.addEventListener('click', () => {
            siteData.works.push({ icon: 'fas fa-star', iconBg: 'rgba(139,92,246,0.1)', iconColor: '#8b5cf6', title: 'New Work', duration: '', desc: '' });
            renderWorkCards();
            const cards = document.querySelectorAll('.work-editor-card');
            if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    /* --- Skills Cards Renderer --- */
    function renderSkillCards() {
        const container = document.getElementById('skills-editor');
        if (!container) return;
        if (!siteData.skills) siteData.skills = [];
        container.innerHTML = '';
        siteData.skills.forEach((sk, i) => {
            const card = document.createElement('div');
            card.className = 'skill-editor-card';
            const logoPreviewHtml = sk.logoUrl
                ? `<img class="skill-preview-icon" src="${escapeHtml(sk.logoUrl)}" alt="logo">`
                : `<div class="skill-preview-icon" style="display:flex;align-items:center;justify-content:center;background:${escapeHtml(sk.logoBg||'#111')};color:${escapeHtml(sk.logoColor||'#fff')};font-weight:700;font-size:0.85rem;">${escapeHtml(sk.logoText||'?')}</div>`;
            card.innerHTML = `
                <div class="skill-editor-card-header">
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${logoPreviewHtml}
                        <span style="font-weight:700;color:white;font-size:0.95rem;">${escapeHtml(sk.name || 'Software ' + (i+1))}</span>
                    </div>
                    <button type="button" class="btn-danger" onclick="removeSkillCard(${i})" title="Remove"><i class="fas fa-trash"></i></button>
                </div>
                <div class="skill-fields-row">
                    <div class="form-group" style="margin:0;">
                        <label>App Name</label>
                        <input type="text" class="form-control sk-name" data-idx="${i}" value="${escapeHtml(sk.name)}" placeholder="Premiere Pro">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Experience Level</label>
                        <select class="form-control sk-level" data-idx="${i}">
                            <option value="Fluent" ${sk.level==='Fluent'?'selected':''}>Fluent</option>
                            <option value="Intermediate" ${sk.level==='Intermediate'?'selected':''}>Intermediate</option>
                            <option value="Beginner" ${sk.level==='Beginner'?'selected':''}>Beginner</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top:0.75rem;">
                    <label>App Logo (Upload or URL)</label>
                    <div class="imgbb-upload-row">
                        <input type="url" class="form-control sk-logo-url" data-idx="${i}" value="${escapeHtml(sk.logoUrl||'')}" placeholder="https://i.ibb.co/... (optional)">
                        <label class="btn-imgbb">
                            <i class="fas fa-image"></i> Upload
                            <input type="file" class="sk-logo-file" data-idx="${i}" accept="image/*">
                        </label>
                    </div>
                    <span class="sk-logo-status" data-idx="${i}" style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;display:block;"></span>
                </div>
                <div class="skill-fields-row" style="margin-top:0;">
                    <div class="form-group" style="margin:0;">
                        <label>Fallback Text (if no logo)</label>
                        <input type="text" class="form-control sk-logo-text" data-idx="${i}" value="${escapeHtml(sk.logoText||'')}" placeholder="Pr" maxlength="3">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Logo Background Color</label>
                        <div class="color-row">
                            <input type="color" class="sk-logobg-picker" data-idx="${i}" value="${sk.logoBg||'#111111'}">
                            <input type="text" class="form-control sk-logobg" data-idx="${i}" value="${escapeHtml(sk.logoBg||'#111111')}" placeholder="#00005b">
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Wire file inputs for logo upload
        container.querySelectorAll('.sk-logo-file').forEach(fileInput => {
            fileInput.addEventListener('change', async () => {
                const idx = +fileInput.dataset.idx;
                const file = fileInput.files[0];
                if (!file) return;
                const statusEl = container.querySelector(`.sk-logo-status[data-idx="${idx}"]`);
                const url = await uploadToImgbb(file, statusEl);
                if (url) {
                    const urlInput = container.querySelector(`.sk-logo-url[data-idx="${idx}"]`);
                    if (urlInput) urlInput.value = url;
                    // Re-render to update preview
                    siteData.skills[idx].logoUrl = url;
                    renderSkillCards();
                }
            });
        });

        // Sync color pickers
        container.querySelectorAll('.sk-logobg-picker').forEach(picker => {
            picker.addEventListener('input', () => {
                const idx = +picker.dataset.idx;
                const t = container.querySelector(`.sk-logobg[data-idx="${idx}"]`);
                if (t) t.value = picker.value;
            });
        });
        container.querySelectorAll('.sk-logobg').forEach(txt => {
            txt.addEventListener('input', () => {
                const idx = +txt.dataset.idx;
                const p = container.querySelector(`.sk-logobg-picker[data-idx="${idx}"]`);
                if (p && /^#[0-9a-f]{3,6}$/i.test(txt.value)) p.value = txt.value;
            });
        });
    }

    window.removeSkillCard = (idx) => {
        siteData.skills.splice(idx, 1);
        renderSkillCards();
    };

    const addSkillBtn = document.getElementById('add-skill-btn');
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', () => {
            if (!siteData.skills) siteData.skills = [];
            siteData.skills.push({ name: 'New App', logoUrl: '', logoText: 'A', logoBg: '#111111', logoColor: '#ffffff', level: 'Fluent' });
            renderSkillCards();
            const cards = document.querySelectorAll('.skill-editor-card');
            if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    /* --- Collect form values --- */
    function collectSettingsFromForm() {
        const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        // Collect work cards from DOM
        const container = document.getElementById('work-cards-editor');
        const works = siteData.works.map((w, i) => {
            const title = container.querySelector(`.wc-title[data-idx="${i}"]`);
            const duration = container.querySelector(`.wc-duration[data-idx="${i}"]`);
            const desc = container.querySelector(`.wc-desc[data-idx="${i}"]`);
            const icon = container.querySelector(`.wc-icon[data-idx="${i}"]`);
            const iconColor = container.querySelector(`.wc-icon-color[data-idx="${i}"]`);
            return {
                icon: icon ? icon.value.trim() : w.icon,
                iconBg: `rgba(${hexToRgb(iconColor ? iconColor.value : w.iconColor)},0.1)`,
                iconColor: iconColor ? iconColor.value.trim() : w.iconColor,
                title: title ? title.value.trim() : w.title,
                duration: duration ? duration.value.trim() : w.duration,
                desc: desc ? desc.value.trim() : w.desc
            };
        });

        // Collect skill cards from DOM
        const skillsContainer = document.getElementById('skills-editor');
        const skills = (siteData.skills || []).map((sk, i) => {
            const name = skillsContainer.querySelector(`.sk-name[data-idx="${i}"]`);
            const level = skillsContainer.querySelector(`.sk-level[data-idx="${i}"]`);
            const logoUrl = skillsContainer.querySelector(`.sk-logo-url[data-idx="${i}"]`);
            const logoText = skillsContainer.querySelector(`.sk-logo-text[data-idx="${i}"]`);
            const logoBg = skillsContainer.querySelector(`.sk-logobg[data-idx="${i}"]`);
            return {
                name: name ? name.value.trim() : sk.name,
                level: level ? level.value : sk.level,
                logoUrl: logoUrl ? logoUrl.value.trim() : sk.logoUrl,
                logoText: logoText ? logoText.value.trim() : sk.logoText,
                logoBg: logoBg ? logoBg.value.trim() : sk.logoBg,
                logoColor: sk.logoColor || '#ffffff'
            };
        });

        return {
            profileImg: g('sd-profile-img'),
            location: g('sd-location'),
            experience: g('sd-experience'),
            education: g('sd-education'),
            age: g('sd-age'),
            aboutText: g('sd-about-text'),
            email: g('sd-email'),
            instagram: g('sd-instagram'),
            instagramUrl: g('sd-instagram-url'),
            works,
            skills
        };
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}` : '139,92,246';
    }

    /* --- Save settings --- */
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const saveStatusMsg = document.getElementById('save-status-msg');

    function setStatus(msg, type) {
        if (!saveStatusMsg) return;
        saveStatusMsg.textContent = msg;
        saveStatusMsg.className = 'save-status ' + (type || '');
        if (type === 'ok') setTimeout(() => { saveStatusMsg.textContent = ''; saveStatusMsg.className = 'save-status'; }, 4000);
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            setStatus('Saving...', '');

            const newSiteData = collectSettingsFromForm();
            siteData = newSiteData;
            localStorage.setItem('port_sitedata', JSON.stringify(siteData));

            try {
                // Preserve existing videos on PUT
                let currentVideos = videos;
                await fetch(CLOUD_JSON_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ videos: currentVideos, siteData: siteData })
                });
                setStatus('✓ Saved & synced to live site!', 'ok');
            } catch(e) {
                setStatus('Cloud sync failed — saved locally only.', 'err');
            } finally {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save & Sync to Live Site';
            }
        });
    }

    populateSettingsForm();
});
