import os
import json
import re

DATA_DIR = './data'
AUDIO_DIR = './audio'
STORIES_FILE = os.path.join(DATA_DIR, 'stories.json')

def natural_key(string):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', string)]

def extract_number(filename):
    """Trích xuất số thứ tự từ tên file (chương hoặc tập)"""
    match = re.search(r'(?:chapter|tap|chap|phan|tuap)[_-]?(\d+)', filename, re.IGNORECASE)
    if match:
        return match.group(1)
    numbers = re.findall(r'\d+', filename)
    return numbers[-1] if numbers else ""

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

    all_stories = []

    # ==========================================
    # 1. QUÉT TRUYỆN CHỮ TỪ THƯ MỤC ./data/
    # ==========================================
    if os.path.exists(DATA_DIR):
        entries = os.listdir(DATA_DIR)
        story_folders = [e for e in entries if os.path.isdir(os.path.join(DATA_DIR, e)) and e.lower() != 'audio']
        story_folders.sort(key=natural_key)

        for folder in story_folders:
            folder_path = os.path.join(DATA_DIR, folder)
            
            # Quét tất cả file .json kể cả trong thư mục con (ví dụ: 596-700,...)
            files = []
            for root, dirs, filenames in os.walk(folder_path):
                if '_monica_debug' in root:
                    continue
                for f in filenames:
                    if f.endswith('.json'):
                        rel_path = os.path.relpath(os.path.join(root, f), folder_path)
                        files.append(rel_path.replace('\\', '/'))

            files.sort(key=natural_key)

            old_info = existing_stories.get(folder, {})
            first_chap_val = old_info.get("first_chap")
            if not first_chap_val and files:
                first_chap_val = extract_number(files[0])

            story_item = {
                "id": folder,
                "title": old_info.get("title", f"Truyện Chữ {folder}"),
                "author": old_info.get("author", "Đang cập nhật"),
                "cover": old_info.get("cover", "https://picsum.photos/400/600"),
                "status": old_info.get("status", "Đang ra"),
                "genres": old_info.get("genres", ["Khác"]),
                "description": old_info.get("description", "Mô tả đang được cập nhật..."),
                "first_chap": first_chap_val or "1",
                "chapters": files  # Chỉ chứa chapters, không dính audio
            }
            all_stories.append(story_item)

    # ==========================================
    # 2. QUÉT TRUYỆN AUDIO TỪ THƯ MỤC ./audio/
    # ==========================================
    if os.path.exists(AUDIO_DIR):
        audio_entries = os.listdir(AUDIO_DIR)
        audio_folders = [e for e in audio_entries if os.path.isdir(os.path.join(AUDIO_DIR, e))]
        audio_folders.sort(key=natural_key)

        for audio_folder in audio_folders:
            audio_folder_path = os.path.join(AUDIO_DIR, audio_folder)
            mp3_files = [f for f in os.listdir(audio_folder_path) if f.endswith('.mp3')]
            mp3_files.sort(key=natural_key)

            if not mp3_files:
                continue

            audio_id = audio_folder
            old_info = existing_stories.get(audio_id, {})

            audio_files_list = []
            for idx, mp3 in enumerate(mp3_files):
                num_match = extract_number(mp3)
                track_title = f"Tập {num_match}" if num_match else f"Tập {idx + 1}"
                
                audio_files_list.append({
                    "title": track_title,
                    "url": f"./audio/{audio_folder}/{mp3}"
                })

            audio_story_item = {
                "id": audio_id,
                "title": old_info.get("title", f"Audio {audio_folder}"),
                "author": old_info.get("author", "Đang cập nhật"),
                "cover": old_info.get("cover", "https://picsum.photos/400/600"),
                "status": old_info.get("status", "Đang ra"),
                "genres": old_info.get("genres", ["Audio"]),
                "description": old_info.get("description", "Mô tả audio đang được cập nhật..."),
                "audioFiles": audio_files_list  # Chỉ chứa audioFiles, không dính chapters
            }
            all_stories.append(audio_story_item)

    # Ghi dữ liệu ra file stories.json
    with open(STORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_stories, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã cập nhật thành công tổng số {len(all_stories)} mục vào {STORIES_FILE}")

if __name__ == '__main__':
    main()