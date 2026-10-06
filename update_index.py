from pathlib import Path
import json
import re


# ==========================================
# CONFIG
# ==========================================

BASE_DIR = Path(__file__).parent

DATA_DIR = BASE_DIR / "data"

INDEX_FILE = DATA_DIR / "index.json"

MANGA_ID = "truyen-3268"

STORY_TITLE = "Dịch Tiếng Hoa"


# ==========================================
# LẤY SỐ CHAPTER
# ==========================================

def get_chapter_number(filename):
    """
    Ví dụ:

    chap-3337907_chapter_200.json

    trả về:

    200
    """

    match = re.search(
        r"_chapter_(\d+)\.json$",
        filename
    )

    if match:
        return int(match.group(1))

    return None


# ==========================================
# MAIN
# ==========================================

def main():

    # Kiểm tra thư mục data

    if not DATA_DIR.exists():

        print(
            "ERROR: Không tìm thấy thư mục data/"
        )

        return


    # ======================================
    # Tìm tất cả file chapter
    # ======================================

    files = []

    for file in DATA_DIR.glob(
        "chap-*_chapter_*.json"
    ):

        chapter_number = get_chapter_number(
            file.name
        )

        if chapter_number is None:

            print(
                "Bỏ qua:",
                file.name
            )

            continue


        files.append(
            (
                chapter_number,
                file.name
            )
        )


    # ======================================
    # Sắp xếp theo số chapter
    # ======================================

    files.sort(
        key=lambda item: item[0]
    )


    # ======================================
    # Lấy danh sách filename
    # ======================================

    chapter_files = [
        filename
        for chapter_number, filename
        in files
    ]


    # ======================================
    # Tạo index.json
    # ======================================

    index_data = {

        "mangaId": MANGA_ID,

        "title": STORY_TITLE,

        "totalChapters": len(
            chapter_files
        ),

        "chapters": chapter_files

    }


    # ======================================
    # Ghi file
    # ======================================

    with open(
        INDEX_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            index_data,
            f,
            ensure_ascii=False,
            indent=4
        )


    # ======================================
    # OUTPUT
    # ======================================

    print()

    print("=" * 50)

    print(
        "UPDATE INDEX SUCCESS"
    )

    print("=" * 50)

    print()

    print(
        "Tổng số chapter:",
        len(chapter_files)
    )

    print()

    if chapter_files:

        print(
            "Chapter đầu:",
            chapter_files[0]
        )

        print(
            "Chapter cuối:",
            chapter_files[-1]
        )

    print()

    print(
        "Đã cập nhật:",
        INDEX_FILE
    )

    print()


if __name__ == "__main__":

    main()