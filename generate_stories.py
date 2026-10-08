import os
import json
import re

DATA_DIR = './data'
STORIES_FILE = os.path.join(DATA_DIR, 'stories.json')

def natural_key(string):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', string)]

def main():
    existing_stories = {}

    if os.path.exists(STORIES_FILE):
        try:
            with open(STORIES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    existing_stories[item.get('id')] = item
        except Exception as e:
            print(f"⚠️ Không đọc được stories.json cũ: {e}")

    if not os.path.exists(DATA_DIR):
        print(f"❌ Thư mục {DATA_DIR} không tồn tại!")
        return

    entries = os.listdir(DATA_DIR)
    story_folders = [e for e in entries if os.path.isdir(os.path.join(DATA_DIR, e))]
    story_folders.sort(key=natural_key)

    updated_stories = []

    for folder in story_folders:
        folder_path = os.path.join(DATA_DIR, folder)
        files = [f for f in os.listdir(folder_path) if f.endswith('.json')]
        files.sort(key=natural_key)

        old_info = existing_stories.get(folder, {})

        story_item = {
            "id": folder,
            "title": old_info.get("title", f"Truyện {folder}"),
            "author": old_info.get("author", "Đang cập nhật"),
            "cover": old_info.get("cover", "https://picsum.photos/400/600"),
            "status": old_info.get("status", "Đang ra"),
            "genres": old_info.get("genres", ["Khác"]),
            "description": old_info.get("description", "Mô tả đang được cập nhật..."),
            "chapters": files
        }
        updated_stories.append(story_item)

    with open(STORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(updated_stories, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã cập nhật thành công {len(updated_stories)} truyện vào {STORIES_FILE}")

if __name__ == '__main__':
    main()