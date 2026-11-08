# Cuong Van Le Dev

Web đọc truyện và nghe audio tĩnh, tối ưu cho desktop và điện thoại.

## Cấu trúc

cuongvanledev/
|-- index.html
|-- README.md
|-- assets/
|   |-- app.js
|   |-- style.css
|   `-- cover-placeholder.svg
`-- data/
    |-- stories.json
    `-- <story-id>/
        `-- chapter JSON files

## Chạy local

```
python -m http.server 8000
```

Sau đó mở:

http://localhost:8000

## Tính năng

- Tìm truyện theo tên hoặc tác giả, kết hợp lọc thể loại và sắp xếp danh sách.
- Chọn đọc theo nhóm 10 chương hoặc đọc từng chương; mục lục và nút điều hướng theo chế độ đã chọn.
- Nhảy tới chương theo số chương; chọn chương trong mục lục sẽ mở đúng chương.
- Lưu tiến độ đọc, vị trí trong chương và cài đặt đọc trên trình duyệt hiện tại.
- Tự tải tiếp chương mà không đưa người đọc về đầu trang.
- Nút chương trước/sau luôn có sẵn bên cạnh nút cài đặt; thanh nút tự ẩn khi cuộn xuống và hiện lại khi cuộn lên hoặc chạm nội dung. Bảng cài đặt chỉ chứa cỡ chữ, phông (Plus Jakarta Sans, Lora, Be Vietnam Pro) và màu nền (xám đen, xám vàng, sepia, sáng).
- Lưu tập audio gần nhất và vị trí nghe.
- Ở chế độ nhóm, mỗi lượt tải tối đa 10 chương; chế độ từng chương chỉ tải chương đang đọc.

Tiến độ và cài đặt được lưu bằng `localStorage` trên thiết bị/trình duyệt, không đồng bộ giữa các thiết bị.

## GitHub Pages

Repository:

cuongvanledev

Sau đó bật GitHub Pages từ branch main.
