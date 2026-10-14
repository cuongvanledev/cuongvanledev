const CHAPTERS_PER_PAGE = 10;

let storiesData = [];
let audioStoriesData = [];
let currentStory = null;
let currentAudioStory = null;
let currentPageIndex = 1;
let currentReaderFontSize = 19;
let currentFontFamilyMode = 0;

const fontFamilies = [
    "'Plus Jakarta Sans', sans-serif",
    "'Lora', Georgia, serif"
];
const fontFamilyNames = ["Sans", "Serif"];

let currentAudioIndex = 0;
let audioPlayerEl = null;
let autoNextEnabled = true;
let isFetchingNextPage = false;

const viewHome = document.getElementById('viewHome');
const viewAudioHome = document.getElementById('viewAudioHome');
const viewDetail = document.getElementById('viewDetail');
const viewReader = document.getElementById('viewReader');
const viewAudio = document.getElementById('viewAudio');

const storyGrid = document.getElementById('storyGrid');
const audioGrid = document.getElementById('audioGrid');
const searchInput = document.getElementById('searchInput');
const searchAudioInput = document.getElementById('searchAudioInput');
const genreContainer = document.getElementById('genreContainer');
const storyDetailContent = document.getElementById('storyDetailContent');
const storyCountBadge = document.getElementById('storyCountBadge');
const audioCountBadge = document.getElementById('audioCountBadge');

const chaptersContainer = document.getElementById('chapters');
const storyInfo = document.getElementById('storyInfo');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const prevButtonBottom = document.getElementById('prevButtonBottom');
const nextButtonBottom = document.getElementById('nextButtonBottom');
const chapterSelect = document.getElementById('chapterSelect');
const readerTopTitle = document.getElementById('readerTopTitle');

function getFirstChapNum(story) {
    if (!story || story.first_chap === undefined || story.first_chap === null) return 1;
    const parsed = parseInt(story.first_chap, 10);
    return isNaN(parsed) ? 1 : parsed;
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    audioPlayerEl = document.getElementById('htmlAudioPlayer');
    setupEventListeners();
    setupAudioEvents();
    setupAutoNextChapter();
    await loadStories();
    handleRouting();
});

window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const parts = hash.split('/');

    viewHome.classList.add('hidden');
    viewAudioHome.classList.add('hidden');
    viewDetail.classList.add('hidden');
    viewReader.classList.add('hidden');
    viewAudio.classList.add('hidden');

    document.getElementById('navHome').classList.remove('active');
    document.getElementById('navAudioHome').classList.remove('active');

    if (parts[0] === 'home' || parts[0] === '') {
        viewHome.classList.remove('hidden');
        document.getElementById('navHome').classList.add('active');
        document.title = "Đọc Truyện Chữ Online - TruyenPro";
        window.scrollTo(0, 0);
    }
    else if (parts[0] === 'audio-home') {
        viewAudioHome.classList.remove('hidden');
        document.getElementById('navAudioHome').classList.add('active');
        document.title = "Kho Audio .MP3 - TruyenPro";
        window.scrollTo(0, 0);
    }
    else if (parts[0] === 'story' && parts[1]) {
        showStoryDetail(parts[1]);
        window.scrollTo(0, 0);
    } 
    else if (parts[0] === 'read' && parts[1]) {
        const storyId = parts[1];
        if (parts[2] === 'page' && parts[3]) {
            showReader(storyId, parseInt(parts[3], 10));
        } else if (parts[2]) {
            const story = storiesData.find(s => s.id === storyId);
            if (story && story.chapters) {
                const chapIdx = story.chapters.indexOf(parts[2]);
                const pageNum = chapIdx !== -1 ? Math.floor(chapIdx / CHAPTERS_PER_PAGE) + 1 : 1;
                showReader(storyId, pageNum, parts[2]);
            }
        }
    }
    else if (parts[0] === 'audio' && parts[1]) {
        const storyId = parts[1];
        const trackIndex = parts[2] ? parseInt(parts[2], 10) : 0;
        showAudioPlayerView(storyId, trackIndex);
    }
}

async function loadStories() {
    try {
        const response = await fetch('./data/stories.json');
        if (!response.ok) throw new Error('Không thể tải file stories.json');
        const allData = await response.json();
        
        storiesData = allData.filter(s => s.chapters && s.chapters.length > 0);
        audioStoriesData = allData.filter(s => s.audioFiles && s.audioFiles.length > 0);

        renderGenres();
        renderStoryGrid(storiesData);
        renderAudioGrid(audioStoriesData);
    } catch (err) {
        console.error(err);
        storyGrid.innerHTML = `<p style="color: #ef4444; grid-column: 1/-1; text-align: center; padding: 30px;">Không tìm thấy dữ liệu truyện.</p>`;
    }
}

function renderStoryGrid(stories) {
    storyGrid.innerHTML = '';
    storyCountBadge.textContent = `${stories.length} truyện`;
    
    if (stories.length === 0) {
        storyGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 30px;">Không tìm thấy truyện chữ phù hợp.</p>';
        return;
    }

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.onclick = () => window.location.hash = `story/${story.id}`;

        const genresTags = Array.isArray(story.genres) ? story.genres.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('') : '';
        const totalChaps = story.chapters ? story.chapters.length : 0;

        card.innerHTML = `
            <img src="${story.cover}" alt="${story.title}" loading="lazy" onerror="this.src='https://picsum.photos/400/600'">
            <div class="story-card-body">
                <div style="margin-bottom: 4px;">${genresTags}</div>
                <div class="story-card-title">${story.title}</div>
                <div class="story-card-meta">
                    <span>${totalChaps} chương</span>
                    <span style="color: var(--accent); font-weight: 600;">${story.status}</span>
                </div>
            </div>
        `;
        storyGrid.appendChild(card);
    });
}

function renderAudioGrid(audioStories) {
    audioGrid.innerHTML = '';
    audioCountBadge.textContent = `${audioStories.length} bộ`;
    
    if (audioStories.length === 0) {
        audioGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 30px;">Chưa có bộ audio nào.</p>';
        return;
    }

    audioStories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.onclick = () => window.location.hash = `audio/${story.id}/0`;

        const totalTracks = story.audioFiles ? story.audioFiles.length : 0;

        card.innerHTML = `
            <img src="${story.cover}" alt="${story.title}" loading="lazy" onerror="this.src='https://picsum.photos/400/600'">
            <div class="story-card-body">
                <div style="margin-bottom: 4px;"><span class="tag" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">Audio .MP3</span></div>
                <div class="story-card-title">${story.title}</div>
                <div class="story-card-meta">
                    <span>${totalTracks} tập</span>
                    <span style="color: #10b981; font-weight: 600;">Nghe ngay</span>
                </div>
            </div>
        `;
        audioGrid.appendChild(card);
    });
}

function renderGenres() {
    const genresSet = new Set();
    storiesData.forEach(s => {
        if (Array.isArray(s.genres)) s.genres.forEach(g => genresSet.add(g));
    });
    
    genreContainer.innerHTML = '<button class="genre-btn active" data-genre="ALL">Tất cả</button>';
    genresSet.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'genre-btn';
        btn.dataset.genre = genre;
        btn.textContent = genre;
        btn.onclick = () => filterByGenre(genre, btn);
        genreContainer.appendChild(btn);
    });
}

function filterByGenre(genre, btnElement) {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    if (genre === 'ALL') renderStoryGrid(storiesData);
    else renderStoryGrid(storiesData.filter(s => Array.isArray(s.genres) && s.genres.includes(genre)));
}

function showStoryDetail(storyId) {
    currentStory = storiesData.find(s => s.id === storyId);
    if (!currentStory) return;

    viewDetail.classList.remove('hidden');
    document.title = `${currentStory.title} - Chi tiết`;

    const genresTags = Array.isArray(currentStory.genres) ? currentStory.genres.map(g => `<span class="tag">${g}</span>`).join('') : '';
    const firstChapNum = getFirstChapNum(currentStory);
    const totalChapters = currentStory.chapters ? currentStory.chapters.length : 0;

    storyDetailContent.innerHTML = `
        <img src="${currentStory.cover}" alt="${currentStory.title}" onerror="this.src='https://picsum.photos/400/600'">
        <div class="story-detail-info">
            <h2>${currentStory.title}</h2>
            <div class="story-meta-row">
                <span><strong>Tác giả:</strong> ${currentStory.author}</span>
                <span><strong>Trạng thái:</strong> <span style="color: var(--accent);">${currentStory.status}</span></span>
                <span><strong>Tổng chương:</strong> ${totalChapters}</span>
            </div>
            <div>${genresTags}</div>
            <div class="story-description">${currentStory.description}</div>
            ${totalChapters > 0 ? `
                <button class="btn-read-start" onclick="window.location.hash='read/\${currentStory.id}/page/1'">
                    🚀 Đọc Từ Chương \${firstChapNum}
                </button>
            ` : ''}
        </div>
    `;

    renderChapterGroups(totalChapters);
    renderChapterListForGroup(1);
}

function renderChapterGroups(totalChapters) {
    const groupContainer = document.getElementById('chapterGroupContainer');
    if (totalChapters <= CHAPTERS_PER_PAGE) {
        groupContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalChapters / CHAPTERS_PER_PAGE);
    const firstChapNum = getFirstChapNum(currentStory);
    let html = '';

    for (let p = 1; p <= totalPages; p++) {
        const startNum = (p - 1) * CHAPTERS_PER_PAGE + firstChapNum;
        const endNum = Math.min(p * CHAPTERS_PER_PAGE, totalChapters) + firstChapNum - 1;
        const label = startNum === endNum ? `Chương ${startNum}` : `${startNum}-${endNum}`;
        html += `<button class="group-tab-btn ${p === 1 ? 'active' : ''}" onclick="switchChapterGroup(${p})">${label}</button>`;
    }
    groupContainer.innerHTML = html;
}

window.switchChapterGroup = function(pageNum) {
    document.querySelectorAll('.group-tab-btn').forEach((btn, idx) => {
        if (idx + 1 === pageNum) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderChapterListForGroup(pageNum);
};

function renderChapterListForGroup(pageNum) {
    const totalChapters = currentStory.chapters ? currentStory.chapters.length : 0;
    const chapterListEl = document.getElementById('chapterList');
    if (totalChapters === 0) {
        chapterListEl.innerHTML = '<p style="color: var(--text-secondary);">Chưa có chương nào.</p>';
        return;
    }

    const firstChapNum = getFirstChapNum(currentStory);
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, totalChapters);
    const pageFiles = currentStory.chapters.slice(startIndex, endIndex);

    let listHTML = '';
    pageFiles.forEach((chapFile, idx) => {
        const globalNum = startIndex + idx + firstChapNum;
        listHTML += `
            <li class="chapter-item" onclick="window.location.hash='read/${currentStory.id}/page/${pageNum}'">
                <span>📖 Chương ${globalNum}</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Đọc ngay →</span>
            </li>
        `;
    });
    chapterListEl.innerHTML = listHTML;
}

async function showReader(storyId, pageNum = 1, targetChapFile = null) {
    viewReader.classList.remove('hidden');
    currentStory = storiesData.find(s => s.id === storyId);
    if (!currentStory || !currentStory.chapters) return;

    currentPageIndex = pageNum;
    readerTopTitle.textContent = currentStory.title;

    document.getElementById('btnBackToDetail').onclick = () => {
        window.location.hash = `story/${storyId}`;
    };

    await fetchPageContent(storyId, pageNum, targetChapFile);
    updateChapterSelect();
    updatePaginationButtons();
}

async function fetchPageContent(storyId, pageNum, targetChapFile = null) {
    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    chaptersContainer.innerHTML = '';

    const firstChapNum = getFirstChapNum(currentStory);
    const startIndex = (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = Math.min(startIndex + CHAPTERS_PER_PAGE, currentStory.chapters.length);
    const pageChapFiles = currentStory.chapters.slice(startIndex, endIndex);

    const startChapNum = startIndex + firstChapNum;
    const endChapNum = endIndex - 1 + firstChapNum;
    const pageTitleText = (startChapNum === endChapNum) ? `Chương ${startChapNum}` : `Chương ${startChapNum} - ${endChapNum}`;

    document.title = `${currentStory.title} - ${pageTitleText}`;
    storyInfo.innerHTML = `<h2>${currentStory.title}</h2><p>${pageTitleText}</p>`;

    try {
        const fetchPromises = pageChapFiles.map(chapFile =>
            fetch(`./data/${storyId}/${chapFile}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Không tải được: ${chapFile}`);
                    return res.json();
                })
                .catch(err => ({ error: true, file: chapFile, message: err.message }))
        );

        const results = await Promise.all(fetchPromises);
        loadingEl.classList.add('hidden');

        results.forEach((data, idx) => {
            const globalChapIndex = startIndex + idx + firstChapNum;
            const chapFile = pageChapFiles[idx];

            const chapterBlock = document.createElement('article');
            chapterBlock.className = 'single-chapter-block';
            chapterBlock.id = `chap-${chapFile.replace(/[^a-zA-Z0-9]/g, '-')}`;

            if (data.error) {
                chapterBlock.innerHTML = `
                    <div class="chapter-divider"><h3>Chương ${globalChapIndex}</h3></div>
                    <p style="color: #ef4444; text-align: center;">Không thể tải dữ liệu chương này.</p>
                `;
            } else {
                const chapTitle = data.title || `Chương ${globalChapIndex}`;
                let contentHTML = '';
                if (Array.isArray(data.content)) {
                    contentHTML = data.content.map(p => `<p>${p}</p>`).join('');
                } else if (data.content) {
                    contentHTML = `<p>${data.content}</p>`;
                }

                chapterBlock.innerHTML = `
                    <div class="chapter-divider"><h3>${chapTitle}</h3></div>
                    <div class="chapter-body">${contentHTML}</div>
                `;
            }
            chaptersContainer.appendChild(chapterBlock);
        });

        if (targetChapFile) {
            const targetId = `chap-${targetChapFile.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth' }), 150);
                return;
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorEl.textContent = `Lỗi hệ thống: ${err.message}`;
    }
}

function setupAutoNextChapter() {
    window.addEventListener('scroll', () => {
        if (viewReader.classList.contains('hidden') || !autoNextEnabled || isFetchingNextPage) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 150;

        if (scrollPosition >= threshold) {
            const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
            
            if (currentPageIndex < totalPages) {
                isFetchingNextPage = true;
                const nextPage = currentPageIndex + 1;
                window.location.hash = `read/${currentStory.id}/page/${nextPage}`;
                
                setTimeout(() => {
                    isFetchingNextPage = false;
                }, 1000);
            }
        }
    });
}

// ==========================================
// TRANG NGHE AUDIO ĐỘC LẬP (.MP3) & TỰ ĐỘNG PHÁT
// ==========================================
function showAudioPlayerView(storyId, trackIndex = 0) {
    viewAudio.classList.remove('hidden');
    currentAudioStory = audioStoriesData.find(s => s.id === storyId);
    if (!currentAudioStory) return;

    document.getElementById('audioStoryTitle').textContent = currentAudioStory.title;

    const audioFiles = currentAudioStory.audioFiles || [];
    if (audioFiles.length === 0) {
        document.getElementById('audioCurrentTrackTitle').textContent = "Chưa có file audio (.mp3).";
        document.getElementById('audioPlaylist').innerHTML = '';
        return;
    }

    currentAudioIndex = (trackIndex >= 0 && trackIndex < audioFiles.length) ? trackIndex : 0;
    renderAudioPlaylist(audioFiles);
    loadAndPlayAudioTrack(currentAudioIndex, false);
}

function renderAudioPlaylist(audioFiles) {
    const playlistEl = document.getElementById('audioPlaylist');
    let html = '';
    audioFiles.forEach((item, idx) => {
        const activeClass = idx === currentAudioIndex ? 'active' : '';
        html += `
            <li class="audio-item ${activeClass}" onclick="window.location.hash='audio/${currentAudioStory.id}/${idx}'">
                <span>🎧 ${item.title || ('Tập ' + (idx + 1))}</span>
                <span class="audio-item-sub">Phát ngay</span>
            </li>
        `;
    });
    playlistEl.innerHTML = html;
}

function loadAndPlayAudioTrack(index, autoPlay = true) {
    const audioFiles = currentAudioStory.audioFiles;
    if (!audioFiles || !audioFiles[index]) return;

    currentAudioIndex = index;
    const track = audioFiles[index];

    document.getElementById('audioCurrentTrackTitle').textContent = `Đang phát: ${track.title || ('Tập ' + (index + 1))}`;
    
    const items = document.querySelectorAll('.audio-item');
    items.forEach((el, i) => {
        if (i === index) el.classList.add('active');
        else el.classList.remove('active');
    });

    audioPlayerEl.src = track.url;
    audioPlayerEl.load();

    const storageKey = `audio_progress_${currentAudioStory.id}_${index}`;
    const savedTime = localStorage.getItem(storageKey);
    if (savedTime && !isNaN(savedTime)) {
        audioPlayerEl.currentTime = parseFloat(savedTime);
    }

    if (autoPlay) {
        const playPromise = audioPlayerEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Trình duyệt chặn tự động phát:", error);
                document.getElementById('audioCurrentTrackTitle').textContent = `Đã tải: ${track.title || ('Tập ' + (index + 1))} (Nhấn Play để nghe)`;
            });
        }
    }

    localStorage.setItem(`last_audio_${currentAudioStory.id}`, index);
}

function setupAudioEvents() {
    if (!audioPlayerEl) return;

    audioPlayerEl.addEventListener('timeupdate', () => {
        if (!currentAudioStory || !currentAudioStory.audioFiles) return;
        const storageKey = `audio_progress_${currentAudioStory.id}_${currentAudioIndex}`;
        localStorage.setItem(storageKey, audioPlayerEl.currentTime);
    });

    audioPlayerEl.addEventListener('ended', () => {
        if (!currentAudioStory || !currentAudioStory.audioFiles) return;
        const nextIndex = currentAudioIndex + 1;
        if (nextIndex < currentAudioStory.audioFiles.length) {
            localStorage.removeItem(`audio_progress_${currentAudioStory.id}_${currentAudioIndex}`);
            
            // Tự động chuyển và ép phát tiếp tục mượt mà
            loadAndPlayAudioTrack(nextIndex, true);
            history.replaceState(null, '', `#audio/${currentAudioStory.id}/${nextIndex}`);
            renderAudioPlaylist(currentAudioStory.audioFiles);
        } else {
            document.getElementById('audioCurrentTrackTitle').textContent = "Đã phát hết danh sách audio!";
        }
    });
}

function updateChapterSelect() {
    chapterSelect.innerHTML = '';
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    const firstChapNum = getFirstChapNum(currentStory);

    for (let i = 1; i <= totalPages; i++) {
        const startNum = (i - 1) * CHAPTERS_PER_PAGE + firstChapNum;
        const endNum = Math.min(i * CHAPTERS_PER_PAGE, currentStory.chapters.length) + firstChapNum - 1;

        const option = document.createElement('option');
        option.value = i;
        option.textContent = (startNum === endNum) ? `Chương ${startNum}` : `Phần ${i} (Chương ${startNum} - ${endNum})`;
        if (i === currentPageIndex) option.selected = true;
        chapterSelect.appendChild(option);
    }

    chapterSelect.onchange = (e) => {
        window.location.hash = `read/${currentStory.id}/page/${e.target.value}`;
    };
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    const isFirst = currentPageIndex === 1;
    const isLast = currentPageIndex === totalPages;

    prevButton.disabled = prevButtonBottom.disabled = isFirst;
    nextButton.disabled = nextButtonBottom.disabled = isLast;
    document.getElementById('pageInfoBottom').textContent = `Phần ${currentPageIndex} / ${totalPages}`;

    const navigateToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            window.location.hash = `read/${currentStory.id}/page/${page}`;
        }
    };

    prevButton.onclick = prevButtonBottom.onclick = () => navigateToPage(currentPageIndex - 1);
    nextButton.onclick = nextButtonBottom.onclick = () => navigateToPage(currentPageIndex + 1);
}

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = storiesData.filter(s => 
            s.title.toLowerCase().includes(term) || 
            s.author.toLowerCase().includes(term)
        );
        renderStoryGrid(filtered);
    });

    searchAudioInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const filtered = audioStoriesData.filter(s => 
            s.title.toLowerCase().includes(term)
        );
        renderAudioGrid(filtered);
    });

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('theme-light');
        const isLight = document.body.classList.contains('theme-light');
        themeToggleBtn.querySelector('.icon-theme').textContent = isLight ? '☀️' : '🌙';
    };

    document.getElementById('btnFontInc').onclick = () => {
        if (currentReaderFontSize < 26) {
            currentReaderFontSize += 2;
            document.documentElement.style.setProperty('--font-size-reader', `${currentReaderFontSize}px`);
            document.getElementById('fontSizeDisplay').textContent = `${currentReaderFontSize}px`;
        }
    };
    
    document.getElementById('btnFontDec').onclick = () => {
        if (currentReaderFontSize > 14) {
            currentReaderFontSize -= 2;
            document.documentElement.style.setProperty('--font-size-reader', `${currentReaderFontSize}px`);
            document.getElementById('fontSizeDisplay').textContent = `${currentReaderFontSize}px`;
        }
    };

    const btnFontFamily = document.getElementById('btnFontFamily');
    btnFontFamily.onclick = () => {
        currentFontFamilyMode = (currentFontFamilyMode + 1) % fontFamilies.length;
        document.documentElement.style.setProperty('--font-family-reader', fontFamilies[currentFontFamilyMode]);
        btnFontFamily.textContent = `Phông: ${fontFamilyNames[currentFontFamilyMode]}`;
    };

    document.querySelectorAll('.r-theme-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.r-theme-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const theme = e.target.dataset.rtheme;
            document.body.classList.remove('reader-theme-dark', 'reader-theme-sepia', 'reader-theme-light');
            document.body.classList.add(`reader-theme-${theme}`);
        };
    });
}