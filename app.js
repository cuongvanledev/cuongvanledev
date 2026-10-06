const MANGA_NAME = 'truyen-3268';
const ITEMS_PER_PAGE = 10;

let allChapters = [];
let currentPage = 1;
let currentChapData = null;

const listView = document.getElementById('chapter-list-view');
const readerView = document.getElementById('reader-view');
const chapterList = document.getElementById('chapter-list');
const pageInfo = document.getElementById('page-info');

const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');

const btnPrevChap = document.getElementById('btn-prev-chap');
const btnNextChap = document.getElementById('btn-next-chap');
const btnPrevChapBottom = document.getElementById('btn-prev-chap-bottom');
const btnNextChapBottom = document.getElementById('btn-next-chap-bottom');
const btnBack = document.getElementById('btn-back');

async function init() {
  try {
    const response = await fetch(`./data/${MANGA_NAME}/index.json`);
    allChapters = await response.json();
    renderPage(currentPage);
  } catch (error) {
    console.error("Không thể load danh sách chapter:", error);
  }
}

function renderPage(page) {
  chapterList.innerHTML = '';
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = allChapters.slice(start, end);

  pageItems.forEach(chapId => {
    const li = document.createElement('li');
    li.textContent = chapId;
    li.onclick = () => loadChapter(chapId);
    chapterList.appendChild(li);
  });

  const totalPages = Math.ceil(allChapters.length / ITEMS_PER_PAGE) || 1;
  pageInfo.textContent = `Trang ${page} / ${totalPages}`;
  btnPrevPage.disabled = page === 1;
  btnNextPage.disabled = page >= totalPages;
}

async function loadChapter(chapId) {
  if (!chapId) return;

  try {
    const response = await fetch(`./data/${MANGA_NAME}/${chapId}.json`);
    currentChapData = await response.json();

    document.getElementById('chap-title').textContent = currentChapData.title;
    document.getElementById('chap-date').textContent = `Ngày đăng: ${currentChapData.createdAt}`;
    
    const contentBox = document.getElementById('chap-content');
    contentBox.innerHTML = currentChapData.content.map(line => `<p>${line}</p>`).join('');

    updateNavButtons(btnPrevChap, btnPrevChapBottom, currentChapData.prevChapter);
    updateNavButtons(btnNextChap, btnNextChapBottom, currentChapData.nextChapter);

    listView.classList.add('hidden');
    readerView.classList.remove('hidden');
    window.scrollTo(0, 0);
  } catch (error) {
    alert("Không tìm thấy nội dung chapter này!");
  }
}

function updateNavButtons(btnTop, btnBottom, chapId) {
  const hasChap = Boolean(chapId);
  btnTop.disabled = !hasChap;
  btnBottom.disabled = !hasChap;
  btnTop.onclick = () => loadChapter(`chap-${chapId}`);
  btnBottom.onclick = () => loadChapter(`chap-${chapId}`);
}

btnPrevPage.addEventListener('click', () => {
  if (currentPage > 1) renderPage(--currentPage);
});

btnNextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(allChapters.length / ITEMS_PER_PAGE);
  if (currentPage < totalPages) renderPage(++currentPage);
});

btnBack.addEventListener('click', () => {
  readerView.classList.add('hidden');
  listView.classList.remove('hidden');
});

init();
