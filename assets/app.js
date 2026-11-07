const CHAPTERS_PER_PAGE = 10;

let storiesData = [];
let audioStoriesData = [];
let currentStory = null;
let currentAudioStory = null;
let currentPageIndex = 1;
let currentReaderFontSize = 19;
let currentFontFamilyMode = 0;
let currentReaderMode = 'group';
let currentChapterIndex = 0;
let activeGenre = 'ALL';
let storySortMode = 'recent';

const fontFamilies = [
    "'Plus Jakarta Sans', sans-serif",
    "'Lora', Georgia, serif",
    "'Be Vietnam Pro', sans-serif"
];

let currentAudioIndex = 0;
let audioPlayerEl = null;
let autoNextEnabled = true;
let isFetchingNextPage = false;
let progressSaveTimer = null;
let autoNextBlockedUntil = 0;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

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
const storySort = document.getElementById('storySort');
const continueReading = document.getElementById('continueReading');
const continueAudio = document.getElementById('continueAudio');

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
    const firstChapterFile = story?.chapters?.[0] || '';
    const chapterNumber = firstChapterFile.match(/chapter_(\d+)/i);
    if (chapterNumber) return parseInt(chapterNumber[1], 10);
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
    setupReaderToolbar();
    restorePreferences();
    await loadStories();
    handleRouting();
});

window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'home';
    const parts = hash.split('/');
    document.body.classList.toggle('reading-mode', parts[0] === 'read');

    if (!viewReader.classList.contains('hidden')) {
        if (progressSaveTimer) clearTimeout(progressSaveTimer);
        saveReadingProgress();
    }
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
        renderContinueAudio();
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
            currentReaderMode = 'group';
            showReader(storyId, parseInt(parts[3], 10), null, false, 'group');
        } else if (parts[2] === 'resume' && parts[3]) {
            const story = storiesData.find(s => s.id === storyId);
            const chapterFile = decodeURIComponent(parts[3]);
            const chapterIndex = story ? story.chapters.indexOf(chapterFile) : -1;
            const pageNum = chapterIndex >= 0 ? Math.floor(chapterIndex / CHAPTERS_PER_PAGE) + 1 : 1;
            const progress = getReadingProgress(storyId);
            currentReaderMode = progress?.readerMode === 'single' ? 'single' : 'group';
            showReader(storyId, pageNum, chapterFile, true, currentReaderMode);
        } else if (parts[2] === 'chapter' && parts[3]) {
            const story = storiesData.find(s => s.id === storyId);
            const chapterFile = decodeURIComponent(parts[3]);
            const chapterIndex = story ? story.chapters.indexOf(chapterFile) : -1;
            const pageNum = chapterIndex >= 0 ? Math.floor(chapterIndex / CHAPTERS_PER_PAGE) + 1 : 1;
            currentReaderMode = 'single';
            showReader(storyId, pageNum, chapterFile, false, 'single');
        } else if (parts[2]) {
            const story = storiesData.find(s => s.id === storyId);
            if (story && story.chapters) {
                const chapterFile = decodeURIComponent(parts[2]);
                const chapIdx = story.chapters.indexOf(chapterFile);
                const pageNum = chapIdx !== -1 ? Math.floor(chapIdx / CHAPTERS_PER_PAGE) + 1 : 1;
                currentReaderMode = 'group';
                showReader(storyId, pageNum, chapterFile, false, 'group');
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
        renderStoryGrid(getFilteredStories());
        renderAudioGrid(audioStoriesData);
        renderContinueReading();
        renderContinueAudio();
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
        const card = document.createElement('a');
        card.className = 'story-card';
        card.href = `#story/${encodeURIComponent(story.id)}`;

        const genresTags = Array.isArray(story.genres) ? story.genres.slice(0, 2).map(g => `<span class="tag">${g}</span>`).join('') : '';
        const totalChaps = story.chapters ? story.chapters.length : 0;
        const cover = getCoverUrl(story);

        card.innerHTML = `
            <img src="${cover}" alt="Bìa truyện ${story.title}" loading="lazy" onerror="this.onerror=null;this.src='./assets/cover-placeholder.svg'">
            <div class="story-card-body">
                <div style="margin-bottom: 4px;">${genresTags}</div>
                <div class="story-card-title">${story.title}</div>
                <div class="story-card-author">${story.author || 'Chưa rõ tác giả'}</div>
                <div class="story-card-meta">
                    <span>${totalChaps} chương</span>
                    <span>${story.status || 'Đang cập nhật'}</span>
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
        const card = document.createElement('a');
        card.className = 'story-card';
        const lastTrack = Number(localStorage.getItem(`last_audio_${story.id}`));
        card.href = `#audio/${encodeURIComponent(story.id)}/${Number.isInteger(lastTrack) && lastTrack >= 0 ? lastTrack : 0}`;

        const totalTracks = story.audioFiles ? story.audioFiles.length : 0;
        const cover = getCoverUrl(story);

        card.innerHTML = `
            <img src="${cover}" alt="Bìa audio ${story.title}" loading="lazy" onerror="this.onerror=null;this.src='./assets/cover-placeholder.svg'">
            <div class="story-card-body">
                <div style="margin-bottom: 4px;"><span class="tag audio-tag">Audio .MP3</span></div>
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
    
    genreContainer.innerHTML = '<button class="genre-btn" type="button" data-genre="ALL" aria-pressed="true">Tất cả</button>';
    genreContainer.querySelector('[data-genre="ALL"]').classList.add('active');
    genresSet.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'genre-btn';
        btn.type = 'button';
        btn.dataset.genre = genre;
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = genre;
        btn.onclick = () => filterByGenre(genre, btn);
        genreContainer.appendChild(btn);
    });
}

function filterByGenre(genre, btnElement) {
    activeGenre = genre;
    genreContainer.querySelectorAll('.genre-btn').forEach(b => {
        b.classList.toggle('active', b === btnElement);
        b.setAttribute('aria-pressed', String(b === btnElement));
    });
    renderStoryGrid(getFilteredStories());
}

function getFilteredStories() {
    const term = searchInput.value.toLocaleLowerCase().trim();
    const filtered = storiesData.filter(story => {
        const matchesGenre = activeGenre === 'ALL' ||
            (Array.isArray(story.genres) && story.genres.includes(activeGenre));
        const matchesSearch = `${story.title || ''} ${story.author || ''}`
            .toLocaleLowerCase()
            .includes(term);
        return matchesGenre && matchesSearch;
    });

    if (storySortMode === 'title') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
    } else if (storySortMode === 'chapters') {
        filtered.sort((a, b) => (b.chapters?.length || 0) - (a.chapters?.length || 0));
    }

    return filtered;
}

function getCoverUrl(story) {
    const cover = story.cover || '';
    return cover && !cover.includes('picsum.photos') ? cover : './assets/cover-placeholder.svg';
}

function getReadingProgress(storyId) {
    try {
        const value = localStorage.getItem(`reading_progress_${storyId}`);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error('Không thể đọc tiến độ truyện đã lưu:', error);
        return null;
    }
}

function setStoredJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Không thể lưu cài đặt hoặc tiến độ đọc:', error);
    }
}

function renderContinueReading() {
    const progress = storiesData
        .map(story => ({ story, progress: getReadingProgress(story.id) }))
        .filter(item => item.progress && item.story.chapters.includes(item.progress.chapterFile))
        .sort((a, b) => (b.progress.updatedAt || 0) - (a.progress.updatedAt || 0))[0];

    if (!progress) {
        continueReading.classList.add('hidden');
        continueReading.innerHTML = '';
        return;
    }

    const { story, progress: saved } = progress;
    const index = story.chapters.indexOf(saved.chapterFile);
    const chapterNumber = getFirstChapNum(story) + index;
    const resumeRoute = `#read/${encodeURIComponent(story.id)}/resume/${encodeURIComponent(saved.chapterFile)}`;
    continueReading.classList.remove('hidden');
    continueReading.innerHTML = `
        <div>
            <span class="eyebrow">ĐỌC TIẾP</span>
            <h2>${story.title}</h2>
            <p>Chương ${chapterNumber} · Tiếp tục từ vị trí đã lưu</p>
        </div>
        <a class="btn-read-start" href="${resumeRoute}">Tiếp tục đọc →</a>
    `;
}

function renderContinueAudio() {
    const recent = audioStoriesData
        .map(story => {
            const storedIndex = localStorage.getItem(`last_audio_${story.id}`);
            return {
                story,
                index: storedIndex === null ? -1 : Number(storedIndex),
                updatedAt: Number(localStorage.getItem(`last_audio_time_${story.id}`)) || 0
            };
        })
        .filter(item => Number.isInteger(item.index) && item.index >= 0 && item.index < item.story.audioFiles.length)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (!recent) {
        continueAudio.classList.add('hidden');
        continueAudio.innerHTML = '';
        return;
    }

    const track = recent.story.audioFiles[recent.index];
    continueAudio.classList.remove('hidden');
    continueAudio.innerHTML = `
        <div>
            <span class="eyebrow">NGHE TIẾP</span>
            <h2>${recent.story.title}</h2>
            <p>${track.title || `Tập ${recent.index + 1}`}</p>
        </div>
        <a class="btn-read-start" href="#audio/${encodeURIComponent(recent.story.id)}/${recent.index}">Mở trình phát →</a>
    `;
}

function saveReadingProgress() {
    if (viewReader.classList.contains('hidden') || !currentStory) return;
    const blocks = Array.from(chaptersContainer.querySelectorAll('.single-chapter-block'));
    const currentBlock = blocks.find(block => block.getBoundingClientRect().bottom > window.innerHeight * 0.3);
    if (!currentBlock) return;

    const progress = {
        chapterFile: currentBlock.dataset.chapterFile,
        readerMode: currentReaderMode,
        offset: Math.max(0, window.scrollY - (currentBlock.getBoundingClientRect().top + window.scrollY)),
        updatedAt: Date.now()
    };
    setStoredJson(`reading_progress_${currentStory.id}`, progress);
    updateReaderChapterTitle();
}

function scheduleProgressSave() {
    if (progressSaveTimer) clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(() => {
        saveReadingProgress();
        renderContinueReading();
    }, 500);
}

function restorePreferences() {
    const theme = localStorage.getItem('site_theme');
    if (theme === 'light') document.body.classList.add('theme-light');
    document.querySelector('.icon-theme').textContent = theme === 'light' ? '☀️' : '🌙';

    const savedSettings = getReadingSettings();
    currentReaderFontSize = savedSettings.fontSize;
    currentFontFamilyMode = savedSettings.fontFamilyMode;
    document.body.classList.remove('reader-theme-dark', 'reader-theme-gray', 'reader-theme-sepia', 'reader-theme-light');
    document.body.classList.add(`reader-theme-${savedSettings.readerTheme}`);
    document.querySelectorAll('.r-theme-btn').forEach(btn => {
        const active = btn.dataset.rtheme === savedSettings.readerTheme;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
    document.documentElement.style.setProperty('--font-size-reader', `${currentReaderFontSize}px`);
    document.documentElement.style.setProperty('--font-family-reader', fontFamilies[currentFontFamilyMode]);
    document.getElementById('fontSizeDisplay').textContent = `${currentReaderFontSize}px`;
    document.getElementById('btnFontDec').disabled = currentReaderFontSize <= 14;
    document.getElementById('btnFontInc').disabled = currentReaderFontSize >= 26;
    updateReaderFontChoice();
}

function getReadingSettings() {
    const defaults = { fontSize: 19, fontFamilyMode: 0, readerTheme: 'dark' };
    try {
        const value = JSON.parse(localStorage.getItem('reader_settings') || '{}');
        return {
            fontSize: Number.isInteger(value.fontSize) && value.fontSize >= 14 && value.fontSize <= 26 ? value.fontSize : defaults.fontSize,
            fontFamilyMode: Number.isInteger(value.fontFamilyMode) && value.fontFamilyMode >= 0 && value.fontFamilyMode < fontFamilies.length ? value.fontFamilyMode : defaults.fontFamilyMode,
            readerTheme: ['dark', 'gray', 'sepia', 'light'].includes(value.readerTheme) ? value.readerTheme : defaults.readerTheme
        };
    } catch (error) {
        console.error('Không thể đọc cài đặt đọc đã lưu:', error);
        return defaults;
    }
}

function saveReadingSettings() {
    const activeTheme = document.querySelector('.r-theme-btn.active')?.dataset.rtheme || 'dark';
    setStoredJson('reader_settings', {
        fontSize: currentReaderFontSize,
        fontFamilyMode: currentFontFamilyMode,
        readerTheme: activeTheme
    });
}

function showStoryDetail(storyId) {
    currentStory = storiesData.find(s => s.id === storyId);
    if (!currentStory) return;

    viewDetail.classList.remove('hidden');
    document.title = `${currentStory.title} - Chi tiết`;

    const genresTags = Array.isArray(currentStory.genres) ? currentStory.genres.map(g => `<span class="tag">${g}</span>`).join('') : '';
    const firstChapNum = getFirstChapNum(currentStory);
    const totalChapters = currentStory.chapters ? currentStory.chapters.length : 0;
    const savedProgress = getReadingProgress(currentStory.id);
    const savedIndex = savedProgress ? currentStory.chapters.indexOf(savedProgress.chapterFile) : -1;
    const cover = getCoverUrl(currentStory);
    currentReaderMode = getStoredReaderMode(currentStory.id);
    const firstChapter = currentStory.chapters[0];
    const startRoute = getReaderRoute(currentStory.id, firstChapter, currentReaderMode);

    storyDetailContent.innerHTML = `
        <img src="${cover}" alt="Bìa truyện ${currentStory.title}" onerror="this.onerror=null;this.src='./assets/cover-placeholder.svg'">
        <div class="story-detail-info">
            <h2>${currentStory.title}</h2>
            <div class="story-meta-row">
                <span><strong>Tác giả:</strong> ${currentStory.author || 'Chưa rõ'}</span>
                <span><strong>Trạng thái:</strong> <span style="color: var(--accent);">${currentStory.status || 'Đang cập nhật'}</span></span>
                <span><strong>Tổng chương:</strong> ${totalChapters}</span>
            </div>
            <div>${genresTags}</div>
            <div class="story-description">${currentStory.description || 'Chưa có giới thiệu cho truyện này.'}</div>
            ${totalChapters > 0 ? `
                <div class="story-actions">
                    <a class="btn-read-start" href="${startRoute}">🚀 Bắt đầu đọc</a>
                    ${savedIndex >= 0 ? `<a class="btn-secondary" href="#read/${encodeURIComponent(currentStory.id)}/resume/${encodeURIComponent(savedProgress.chapterFile)}">Đọc tiếp chương ${firstChapNum + savedIndex}</a>` : ''}
                </div>
            ` : ''}
        </div>
    `;

    renderChapterGroups(totalChapters);
    renderChapterListForGroup(1);
    updateReadingModeChoices();
    document.querySelectorAll('.reading-mode-btn').forEach(button => {
        button.onclick = () => {
            currentReaderMode = button.dataset.readingMode;
            try {
                localStorage.setItem(`reader_mode_${currentStory.id}`, currentReaderMode);
            } catch (error) {
                console.error('Không thể lưu chế độ đọc:', error);
            }
            updateReadingModeChoices();
            renderChapterGroups(totalChapters);
            renderChapterListForGroup(1);
            const firstChapter = currentStory.chapters[0];
            const startLink = storyDetailContent.querySelector('.btn-read-start');
            startLink.href = getReaderRoute(currentStory.id, firstChapter, currentReaderMode);
        };
    });
    const jumpInput = document.getElementById('chapterJumpInput');
    jumpInput.min = firstChapNum;
    jumpInput.max = firstChapNum + totalChapters - 1;
    jumpInput.value = '';
    document.getElementById('chapterJumpForm').onsubmit = event => {
        event.preventDefault();
        const chapterNumber = Number(jumpInput.value);
        const chapterIndex = chapterNumber - firstChapNum;
        if (!Number.isInteger(chapterNumber) || chapterIndex < 0 || chapterIndex >= totalChapters) {
            jumpInput.setCustomValidity(`Nhập số chương từ ${firstChapNum} đến ${firstChapNum + totalChapters - 1}.`);
            jumpInput.reportValidity();
            return;
        }
        jumpInput.setCustomValidity('');
        const targetPage = Math.floor(chapterIndex / CHAPTERS_PER_PAGE) + 1;
        const chapterFile = currentStory.chapters[chapterIndex];
        window.location.hash = getReaderRoute(currentStory.id, chapterFile, currentReaderMode).slice(1);
        if (currentReaderMode === 'group' && targetPage !== 1) {
            const groupButton = document.querySelectorAll('.group-tab-btn')[targetPage - 1];
            if (groupButton) window.switchChapterGroup(targetPage);
        }
    };
}

function getStoredReaderMode(storyId) {
    try {
        return localStorage.getItem(`reader_mode_${storyId}`) === 'single' ? 'single' : 'group';
    } catch (error) {
        console.error('Không thể đọc chế độ đọc đã lưu:', error);
        return 'group';
    }
}

function getReaderRoute(storyId, chapterFile, mode) {
    const encodedStoryId = encodeURIComponent(storyId);
    const encodedChapter = encodeURIComponent(chapterFile);
    return mode === 'single'
        ? `#read/${encodedStoryId}/chapter/${encodedChapter}`
        : `#read/${encodedStoryId}/${encodedChapter}`;
}

function updateReadingModeChoices() {
    document.querySelectorAll('.reading-mode-btn').forEach(button => {
        const active = button.dataset.readingMode === currentReaderMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

function renderChapterGroups(totalChapters) {
    const groupContainer = document.getElementById('chapterGroupContainer');
    groupContainer.classList.toggle('hidden', currentReaderMode === 'single');
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
        html += `<button class="group-tab-btn ${p === 1 ? 'active' : ''}" type="button" aria-pressed="${p === 1}" onclick="switchChapterGroup(${p})">${label}</button>`;
    }
    groupContainer.innerHTML = html;
}

window.switchChapterGroup = function(pageNum) {
    if (currentReaderMode === 'single') return;
    document.querySelectorAll('.group-tab-btn').forEach((btn, idx) => {
        const active = idx + 1 === pageNum;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
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
    const startIndex = currentReaderMode === 'single' ? 0 : (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = currentReaderMode === 'single' ? totalChapters : Math.min(startIndex + CHAPTERS_PER_PAGE, totalChapters);
    const pageFiles = currentStory.chapters.slice(startIndex, endIndex);

    let listHTML = '';
    pageFiles.forEach((chapFile, idx) => {
        const globalNum = startIndex + idx + firstChapNum;
        const route = getReaderRoute(currentStory.id, chapFile, currentReaderMode);
        listHTML += `
            <li class="chapter-item">
                <a class="chapter-link" href="${route}">
                    <span>📖 Chương ${globalNum}</span>
                    <span class="chapter-link-action">Đọc ngay →</span>
                </a>
            </li>
        `;
    });
    chapterListEl.innerHTML = listHTML;
}

async function showReader(storyId, pageNum = 1, targetChapFile = null, resumeProgress = false, readerMode = 'group') {
    viewReader.classList.remove('hidden');
    currentStory = storiesData.find(s => s.id === storyId);
    if (!currentStory || !currentStory.chapters) return;
    currentReaderMode = readerMode;
    const targetIndex = targetChapFile ? currentStory.chapters.indexOf(targetChapFile) : -1;
    currentChapterIndex = targetIndex >= 0 ? targetIndex : (pageNum - 1) * CHAPTERS_PER_PAGE;
    window.scrollTo(0, 0);
    autoNextBlockedUntil = Number.POSITIVE_INFINITY;
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    pageNum = Number.isInteger(pageNum) ? Math.min(Math.max(pageNum, 1), totalPages) : 1;

    currentPageIndex = pageNum;
    readerTopTitle.textContent = 'Đang tải chương...';

    document.getElementById('btnBackToDetail').onclick = () => {
        window.location.hash = `story/${storyId}`;
    };

    await fetchPageContent(storyId, pageNum, targetChapFile, false, resumeProgress, currentReaderMode === 'single');
    autoNextBlockedUntil = Date.now() + 1000;
    updateChapterSelect();
    updatePaginationButtons();
    updateReaderChapterTitle();
}

function setupReaderToolbar() {
    const controls = document.getElementById('readerMiniToolbar');
    const toggle = document.getElementById('readerControlsToggle');
    const panel = document.getElementById('readerControlsPanel');

    toggle.addEventListener('click', () => setReaderControlsOpen(panel.hidden));
    document.getElementById('readerControlsClose').addEventListener('click', () => setReaderControlsOpen(false));
    document.getElementById('miniPrevChapter').addEventListener('click', () => navigateReader(-1));
    document.getElementById('miniNextChapter').addEventListener('click', () => navigateReader(1));
    document.addEventListener('click', event => {
        if (!panel.hidden && !controls.contains(event.target)) setReaderControlsOpen(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) {
            setReaderControlsOpen(false);
            toggle.focus();
        }
    });
}

function setReaderControlsOpen(isOpen) {
    const panel = document.getElementById('readerControlsPanel');
    const toggle = document.getElementById('readerControlsToggle');
    panel.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
}

function updateReaderFontChoice() {
    document.querySelectorAll('.reader-font-option').forEach(button => {
        const isSelected = Number(button.dataset.fontMode) === currentFontFamilyMode;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    });
}

function setReaderFontSize(size) {
    currentReaderFontSize = Math.max(14, Math.min(26, size));
    document.documentElement.style.setProperty('--font-size-reader', `${currentReaderFontSize}px`);
    document.getElementById('fontSizeDisplay').textContent = `${currentReaderFontSize}px`;
    document.getElementById('btnFontDec').disabled = currentReaderFontSize <= 14;
    document.getElementById('btnFontInc').disabled = currentReaderFontSize >= 26;
    saveReadingSettings();
}

function updateReaderChapterTitle() {
    const blocks = Array.from(chaptersContainer.querySelectorAll('.single-chapter-block'));
    if (!blocks.length) return;
    const activeBlock = blocks.find(block => block.getBoundingClientRect().bottom > window.innerHeight * 0.3) || blocks[0];
    const heading = activeBlock.querySelector('.chapter-divider h3');
    if (heading) readerTopTitle.textContent = heading.textContent;
}

function navigateReader(direction) {
    if (!currentStory || !currentStory.chapters.length) return;
    setReaderControlsOpen(false);
    if (currentReaderMode === 'single') {
        const nextIndex = currentChapterIndex + direction;
        if (nextIndex < 0 || nextIndex >= currentStory.chapters.length) return;
        const nextChapter = currentStory.chapters[nextIndex];
        window.location.hash = `read/${encodeURIComponent(currentStory.id)}/chapter/${encodeURIComponent(nextChapter)}`;
        return;
    }

    const nextPage = currentPageIndex + direction;
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    if (nextPage >= 1 && nextPage <= totalPages) {
        window.location.hash = `read/${encodeURIComponent(currentStory.id)}/page/${nextPage}`;
    }
}

async function fetchPageContent(storyId, pageNum, targetChapFile = null, append = false, resumeProgress = false, singleChapter = false) {
    if (!append) {
        loadingEl.classList.remove('hidden');
        chaptersContainer.innerHTML = '';
    }
    errorEl.classList.add('hidden');

    const firstChapNum = getFirstChapNum(currentStory);
    const startIndex = singleChapter ? currentChapterIndex : (pageNum - 1) * CHAPTERS_PER_PAGE;
    const endIndex = singleChapter
        ? Math.min(startIndex + 1, currentStory.chapters.length)
        : Math.min(startIndex + CHAPTERS_PER_PAGE, currentStory.chapters.length);
    const pageChapFiles = singleChapter
        ? [targetChapFile || currentStory.chapters[startIndex]].filter(Boolean)
        : currentStory.chapters.slice(startIndex, endIndex);

    const startChapNum = startIndex + firstChapNum;
    const endChapNum = endIndex - 1 + firstChapNum;
    const pageTitleText = singleChapter || startChapNum === endChapNum
        ? `Chương ${startChapNum}`
        : `Chương ${startChapNum} - ${endChapNum}`;

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
        if (!append) loadingEl.classList.add('hidden');

        results.forEach((data, idx) => {
            const globalChapIndex = startIndex + idx + firstChapNum;
            const chapFile = pageChapFiles[idx];

            const chapterBlock = document.createElement('article');
            chapterBlock.className = 'single-chapter-block';
            chapterBlock.id = `chap-${chapFile.replace(/[^a-zA-Z0-9]/g, '-')}`;
            chapterBlock.dataset.chapterFile = chapFile;

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
                    <div class="chapter-divider">
                        <span class="chapter-story-name">${currentStory.title}</span>
                        <h3>${chapTitle}</h3>
                    </div>
                    <div class="chapter-body">${contentHTML}</div>
                `;
            }
            chaptersContainer.appendChild(chapterBlock);
            if (!data.error) {
                if (singleChapter) storyInfo.innerHTML = `<h2>${currentStory.title}</h2><p>${data.title || `Chương ${globalChapIndex}`}</p>`;
                if (!append && idx === 0) readerTopTitle.textContent = data.title || `Chương ${globalChapIndex}`;
            }
        });

        if (targetChapFile) {
            const targetId = `chap-${targetChapFile.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const savedProgress = resumeProgress ? getReadingProgress(storyId) : null;
                const offset = savedProgress && savedProgress.chapterFile === targetChapFile ? savedProgress.offset : 0;
                setTimeout(() => {
                    window.scrollTo({
                        top: targetEl.getBoundingClientRect().top + window.scrollY + offset,
                        behavior: 'smooth'
                    });
                    updateReaderChapterTitle();
                }, 150);
                return true;
            }
        }
        if (!append) window.scrollTo({ top: 0, behavior: 'smooth' });
        return true;

    } catch (err) {
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorEl.textContent = `Lỗi hệ thống: ${err.message}`;
        return false;
    }
}

function setupAutoNextChapter() {
    window.addEventListener('scroll', () => {
        if (viewReader.classList.contains('hidden') || !autoNextEnabled || isFetchingNextPage) return;
        scheduleProgressSave();
        updateReaderChapterTitle();
        if (currentReaderMode === 'single') return;
        if (Date.now() < autoNextBlockedUntil || !currentStory || !chaptersContainer.children.length || !loadingEl.classList.contains('hidden')) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 150;

        if (scrollPosition >= threshold) {
            const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
            
            if (currentPageIndex < totalPages) {
                isFetchingNextPage = true;
                const nextPage = currentPageIndex + 1;
                currentPageIndex = nextPage;
                fetchPageContent(currentStory.id, nextPage, null, true)
                    .then(loaded => {
                        if (loaded) {
                            history.replaceState(null, '', `#read/${encodeURIComponent(currentStory.id)}/page/${nextPage}`);
                            updateChapterSelect();
                            updatePaginationButtons();
                        } else {
                            currentPageIndex = nextPage - 1;
                        }
                    })
                    .finally(() => {
                        isFetchingNextPage = false;
                    });
            }
        }
    });
    window.addEventListener('pagehide', saveReadingProgress);
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
            <li>
                <a class="audio-item ${activeClass}" aria-current="${idx === currentAudioIndex ? 'true' : 'false'}" href="#audio/${encodeURIComponent(currentAudioStory.id)}/${idx}">
                    <span>🎧 ${item.title || ('Tập ' + (idx + 1))}</span>
                    <span class="audio-item-sub">${idx === currentAudioIndex ? 'Đang chọn' : 'Phát ngay'}</span>
                </a>
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
        const active = i === index;
        el.classList.toggle('active', active);
        el.setAttribute('aria-current', String(active));
        el.querySelector('.audio-item-sub').textContent = active ? 'Đang chọn' : 'Phát ngay';
    });

    const storageKey = `audio_progress_${currentAudioStory.id}_${index}`;
    const savedTime = localStorage.getItem(storageKey);
    const savedPosition = savedTime && !isNaN(savedTime) ? parseFloat(savedTime) : 0;
    audioPlayerEl.onloadedmetadata = () => {
        if (currentAudioIndex === index && savedPosition > 0 && savedPosition < audioPlayerEl.duration) {
            audioPlayerEl.currentTime = savedPosition;
        }
    };
    audioPlayerEl.src = track.url;
    audioPlayerEl.load();

    try {
        localStorage.setItem(`last_audio_${currentAudioStory.id}`, index);
        localStorage.setItem(`last_audio_time_${currentAudioStory.id}`, Date.now());
    } catch (error) {
        console.error('Không thể lưu tiến độ audio:', error);
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

}

function setupAudioEvents() {
    if (!audioPlayerEl) return;

    audioPlayerEl.addEventListener('timeupdate', () => {
        if (!currentAudioStory || !currentAudioStory.audioFiles) return;
        const storageKey = `audio_progress_${currentAudioStory.id}_${currentAudioIndex}`;
        try {
            localStorage.setItem(storageKey, audioPlayerEl.currentTime);
            localStorage.setItem(`last_audio_time_${currentAudioStory.id}`, Date.now());
        } catch (error) {
            console.error('Không thể lưu tiến độ audio:', error);
        }
        renderContinueAudio();
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
    audioPlayerEl.addEventListener('play', renderContinueAudio);
}

function updateChapterSelect() {
    chapterSelect.innerHTML = '';
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    const firstChapNum = getFirstChapNum(currentStory);

    if (currentReaderMode === 'single') {
        currentStory.chapters.forEach((chapterFile, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Chương ${firstChapNum + index}`;
            option.selected = index === currentChapterIndex;
            chapterSelect.appendChild(option);
        });
    } else {
        for (let i = 1; i <= totalPages; i++) {
            const startNum = (i - 1) * CHAPTERS_PER_PAGE + firstChapNum;
            const endNum = Math.min(i * CHAPTERS_PER_PAGE, currentStory.chapters.length) + firstChapNum - 1;

            const option = document.createElement('option');
            option.value = i;
            option.textContent = (startNum === endNum) ? `Chương ${startNum}` : `Phần ${i} (Chương ${startNum} - ${endNum})`;
            option.selected = i === currentPageIndex;
            chapterSelect.appendChild(option);
        }
    }

    chapterSelect.onchange = (e) => {
        if (currentReaderMode === 'single') {
            const chapterFile = currentStory.chapters[Number(e.target.value)];
            window.location.hash = `read/${encodeURIComponent(currentStory.id)}/chapter/${encodeURIComponent(chapterFile)}`;
        } else {
            window.location.hash = `read/${encodeURIComponent(currentStory.id)}/page/${e.target.value}`;
        }
    };
}

function updatePaginationButtons() {
    const totalPages = Math.ceil(currentStory.chapters.length / CHAPTERS_PER_PAGE);
    const isSingle = currentReaderMode === 'single';
    const isFirst = isSingle ? currentChapterIndex === 0 : currentPageIndex === 1;
    const isLast = isSingle ? currentChapterIndex === currentStory.chapters.length - 1 : currentPageIndex === totalPages;
    const previousLabel = isSingle ? '← Chương trước' : '← Phần trước';
    const nextLabel = isSingle ? 'Chương sau →' : 'Phần sau →';

    prevButton.disabled = prevButtonBottom.disabled = isFirst;
    nextButton.disabled = nextButtonBottom.disabled = isLast;
    prevButton.textContent = prevButtonBottom.textContent = previousLabel;
    nextButton.textContent = nextButtonBottom.textContent = nextLabel;
    const pageInfo = document.getElementById('pageInfoBottom');
    pageInfo.textContent = isSingle
        ? `Chương ${getFirstChapNum(currentStory) + currentChapterIndex} / ${getFirstChapNum(currentStory) + currentStory.chapters.length - 1}`
        : `Phần ${currentPageIndex} / ${totalPages}`;
    document.getElementById('miniPrevChapter').disabled = isFirst;
    document.getElementById('miniNextChapter').disabled = isLast;
    document.getElementById('readerControlsPosition').textContent = isSingle
        ? `Chương ${getFirstChapNum(currentStory) + currentChapterIndex} / ${getFirstChapNum(currentStory) + currentStory.chapters.length - 1}`
        : `Phần ${currentPageIndex} / ${totalPages}`;

    prevButton.onclick = prevButtonBottom.onclick = () => navigateReader(-1);
    nextButton.onclick = nextButtonBottom.onclick = () => navigateReader(1);
}

function setupEventListeners() {
    searchInput.addEventListener('input', (e) => {
        renderStoryGrid(getFilteredStories());
    });

    searchAudioInput.addEventListener('input', (e) => {
        const term = e.target.value.toLocaleLowerCase().trim();
        const filtered = audioStoriesData.filter(s => (s.title || '').toLocaleLowerCase().includes(term));
        renderAudioGrid(filtered);
    });

    storySort.addEventListener('change', event => {
        storySortMode = event.target.value;
        renderStoryGrid(getFilteredStories());
    });

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.onclick = () => {
        document.body.classList.toggle('theme-light');
        const isLight = document.body.classList.contains('theme-light');
        themeToggleBtn.querySelector('.icon-theme').textContent = isLight ? '☀️' : '🌙';
        localStorage.setItem('site_theme', isLight ? 'light' : 'dark');
    };

    document.getElementById('btnFontInc').onclick = () => setReaderFontSize(currentReaderFontSize + 2);
    document.getElementById('btnFontDec').onclick = () => setReaderFontSize(currentReaderFontSize - 2);

    document.querySelectorAll('.reader-font-option').forEach(button => {
        button.onclick = () => {
            currentFontFamilyMode = Number(button.dataset.fontMode);
            document.documentElement.style.setProperty('--font-family-reader', fontFamilies[currentFontFamilyMode]);
            updateReaderFontChoice();
            saveReadingSettings();
        };
    });

    document.querySelectorAll('.r-theme-btn').forEach(btn => {
        btn.onclick = (e) => {
            const theme = e.currentTarget.dataset.rtheme;
            document.querySelectorAll('.r-theme-btn').forEach(b => {
                const active = b === e.currentTarget;
                b.classList.toggle('active', active);
                b.setAttribute('aria-pressed', String(active));
            });
            document.body.classList.remove('reader-theme-dark', 'reader-theme-gray', 'reader-theme-sepia', 'reader-theme-light');
            document.body.classList.add(`reader-theme-${theme}`);
            saveReadingSettings();
        };
    });
}