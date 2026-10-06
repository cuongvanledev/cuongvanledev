const fs = require('fs');
const path = require('path');

// Cấu hình đường dẫn
const TARGET_DIR = './truyen-3268'; // Đường dẫn thư mục chứa các tệp chương
const OUTPUT_FILE = './truyen-3268/index.json'; // Đường dẫn tệp index đầu ra

function updateIndex() {
  try {
    const files = fs.readdirSync(TARGET_DIR);

    // Lọc tệp có tiền tố 'chap-' và đuôi '.json' (bỏ qua chính tệp index.json)
    const chapterIds = files
      .filter(file => file.startsWith('chap-') && file.endsWith('.json') && file !== 'index.json')
      .map(file => {
        console.log(`Đang xử lý tệp: ${file}`);
        // Trích xuất phần ID dạng "chap-123456"
        const match = file.match(/^(chap-\d+)/);
        return match ? {
          id: match[1],
          name: file
        } : null;
      })
      .filter(Boolean)
      // Loại bỏ ID trùng lặp nếu có
      .filter((item, index, self) => self.findIndex(i => i.id === item.id) === index)
      // Sắp xếp tăng dần theo phần số ID
      .sort((a, b) => {
        const numA = parseInt(a.id.replace('chap-', ''), 10);
        const numB = parseInt(b.id.replace('chap-', ''), 10);
        return numA - numB;
      }).map(item => item.name); // Chỉ giữ lại phần ID dạng "chap-123456"

    // Ghi vào tệp index.json với định dạng mảng đẹp
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chapterIds, null, 2), 'utf-8');

    console.log(`✅ Đã cập nhật thành công ${OUTPUT_FILE}`);
    console.log(`📊 Tổng số chương: ${chapterIds.length}`);
  } catch (error) {
    console.error('❌ Có lỗi xảy ra:', error.message);
  }
}

updateIndex();