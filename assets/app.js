const INDEX_URL = "./data/index.json";

const CHAPTERS_PER_PAGE = 10;


let chapterFiles = [];

let currentPage = 1;

let totalPages = 1;


/* =====================================
   HELPER
===================================== */

function $(id) {
    return document.getElementById(id);
}


/* =====================================
   ESCAPE HTML
===================================== */

function escapeHtml(value) {

    return String(
        value == null ? "" : value
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================
   GET PAGE FROM URL
===================================== */

function getPageFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const value =
        Number(
            params.get("page")
        );

    if (
        Number.isInteger(value) &&
        value > 0
    ) {
        return value;
    }

    return 1;
}


/* =====================================
   LOAD INDEX
===================================== */

async function loadIndex() {

    try {

        const response =
            await fetch(
                INDEX_URL,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Không thể tải index.json. HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        /*
         * Hỗ trợ:
         *
         * {
         *   "chapters": [...]
         * }
         *
         * hoặc:
         *
         * [...]
         */

        if (Array.isArray(data)) {

            chapterFiles = data;

        } else if (
            Array.isArray(data.chapters)
        ) {

            chapterFiles =
                data.chapters;

        } else {

            throw new Error(
                "index.json không có danh sách chapters."
            );

        }


        if (chapterFiles.length === 0) {

            throw new Error(
                "Danh sách chapter đang trống."
            );

        }


        totalPages =
            Math.ceil(
                chapterFiles.length /
                CHAPTERS_PER_PAGE
            );


        currentPage =
            getPageFromUrl();


        if (currentPage > totalPages) {

            currentPage = totalPages;

        }


        $("year").textContent =
            new Date().getFullYear();


        /*
         * Nếu index.json có title
         */

        if (
            !Array.isArray(data) &&
            data.title
        ) {

            $("storyInfo").textContent =
                data.title +
                " · " +
                chapterFiles.length +
                " chương";

        } else {

            $("storyInfo").textContent =
                "Truyện · " +
                chapterFiles.length +
                " chương";

        }


        await loadCurrentPage();

    } catch (error) {

        showError(error.message);

    }

}


/* =====================================
   LOAD CURRENT PAGE
===================================== */

async function loadCurrentPage() {

    $("loading")
        .classList
        .remove("hidden");


    $("error")
        .classList
        .add("hidden");


    $("chapters").innerHTML = "";


    updatePagination();


    try {

        const start =
            (currentPage - 1) *
            CHAPTERS_PER_PAGE;


        const end =
            Math.min(
                start + CHAPTERS_PER_PAGE,
                chapterFiles.length
            );


        const files =
            chapterFiles.slice(
                start,
                end
            );


        /*
         * Tải 10 file JSON cùng lúc
         */

        const requests =
            files.map(
                function (filename) {

                    return fetchChapter(
                        filename
                    );

                }
            );


        const chapters =
            await Promise.all(
                requests
            );


        renderChapters(
            chapters
        );


        $("loading")
            .classList
            .add("hidden");


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    } catch (error) {

        $("loading")
            .classList
            .add("hidden");


        showError(
            error.message
        );

    }

}


/* =====================================
   LOAD ONE CHAPTER
===================================== */

async function fetchChapter(filename) {

    /*
     * Đảm bảo filename không bị
     * thêm / ở đầu
     */

    const cleanFilename =
        String(filename)
            .replace(/^\/+/, "");


    const url =
        "./data/" +
        encodeURI(cleanFilename);


    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            "Không thể tải chapter: " +
            filename +
            " (HTTP " +
            response.status +
            ")"
        );

    }


    return await response.json();

}


/* =====================================
   CREATE CHAPTER HTML
===================================== */

function createChapterHtml(chapter) {

    let lines = [];


    /*
     * content là array
     */

    if (
        Array.isArray(
            chapter.content
        )
    ) {

        lines =
            chapter.content;

    }

    /*
     * content là string
     */

    else {

        lines =
            String(
                chapter.content || ""
            )
            .split(/\r?\n/);

    }


    let contentHtml = "";


    for (
        const line of lines
    ) {

        const text =
            String(
                line == null ? "" : line
            );


        /*
         * Bỏ dòng trống
         */

        if (
            text.trim() === ""
        ) {

            continue;

        }


        contentHtml +=
            "<p>" +
            escapeHtml(text) +
            "</p>";

    }


    /*
     * Tiêu đề
     */

    const title =
        chapter.title ||
        (
            "Chương " +
            (
                chapter.chapterNumber ||
                ""
            )
        );


    /*
     * Ngày
     */

    const createdAt =
        chapter.createdAt || "";


    /*
     * ID chapter
     */

    const chapterId =
        chapter.id || "";


    /*
     * Số chapter
     */

    const chapterNumber =
        chapter.chapterNumber || "";


    return (
        '<article class="chapter">' +

            '<h2 class="chapter-title">' +

                escapeHtml(title) +

            "</h2>" +


            '<div class="chapter-date">' +

                "Chương " +

                escapeHtml(
                    chapterNumber
                ) +

                (
                    createdAt
                        ? " · " +
                          escapeHtml(
                              createdAt
                          )
                        : ""
                ) +

            "</div>" +


            (
                chapterId
                    ? '<div class="chapter-id">' +
                      escapeHtml(
                          chapterId
                      ) +
                      "</div>"
                    : ""
            ) +


            '<div class="chapter-content">' +

                contentHtml +

            "</div>" +

        "</article>"
    );

}


/* =====================================
   RENDER CHAPTERS
===================================== */

function renderChapters(chapters) {

    let html = "";


    for (
        const chapter of chapters
    ) {

        html +=
            createChapterHtml(
                chapter
            );

    }


    $("chapters").innerHTML =
        html;

}


/* =====================================
   PAGINATION UI
===================================== */

function updatePagination() {

    const text =
        "Trang " +
        currentPage +
        " / " +
        totalPages;


    $("pageInfo").textContent =
        text;


    $("pageInfoBottom").textContent =
        text;


    const isFirst =
        currentPage <= 1;


    const isLast =
        currentPage >= totalPages;


    $("prevButton").disabled =
        isFirst;


    $("prevButtonBottom").disabled =
        isFirst;


    $("nextButton").disabled =
        isLast;


    $("nextButtonBottom").disabled =
        isLast;

}


/* =====================================
   GO TO PAGE
===================================== */

async function goToPage(page) {

    if (
        page < 1 ||
        page > totalPages
    ) {

        return;

    }


    currentPage = page;


    window.history.pushState(
        {},
        "",
        "?page=" + currentPage
    );


    await loadCurrentPage();

}


/* =====================================
   ERROR
===================================== */

function showError(message) {

    $("loading")
        .classList
        .add("hidden");


    $("error").textContent =
        message;


    $("error")
        .classList
        .remove("hidden");

}


/* =====================================
   BUTTON EVENTS
===================================== */

$("prevButton").onclick =
    function () {

        goToPage(
            currentPage - 1
        );

    };


$("prevButtonBottom").onclick =
    function () {

        goToPage(
            currentPage - 1
        );

    };


$("nextButton").onclick =
    function () {

        goToPage(
            currentPage + 1
        );

    };


$("nextButtonBottom").onclick =
    function () {

        goToPage(
            currentPage + 1
        );

    };


/* =====================================
   BROWSER BACK / FORWARD
===================================== */

window.addEventListener(
    "popstate",
    function () {

        currentPage =
            getPageFromUrl();


        if (
            currentPage < 1
        ) {

            currentPage = 1;

        }


        if (
            currentPage > totalPages
        ) {

            currentPage =
                totalPages;

        }


        loadCurrentPage();

    }
);


/* =====================================
   START
===================================== */

loadIndex();