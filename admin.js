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

    // Sync videos to global cloud storage + localStorage on every change
    async function syncVideos() {
        localStorage.setItem('port_videos', JSON.stringify(videos));
        try {
            await fetch(CLOUD_JSON_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ videos: videos })
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
                <button class="btn-danger" onclick="deleteVideo(${index})" title="Remove Video">
                    <i class="fas fa-trash"></i>
                </button>
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
});
