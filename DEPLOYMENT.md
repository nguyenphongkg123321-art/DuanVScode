# Triển khai Mini Game Hub trên Ubuntu VPS

## Chuẩn bị biến môi trường

```bash
cp .env.example .env
openssl rand -base64 48
nano .env
```

Thay `POSTGRES_PASSWORD`, cập nhật cùng mật khẩu trong `DATABASE_URL`, đặt `JWT_SECRET`
bằng chuỗi ngẫu nhiên vừa tạo và đổi `APP_ORIGIN` thành domain HTTPS thật. Nếu mật khẩu
PostgreSQL có ký tự đặc biệt, phần mật khẩu trong `DATABASE_URL` phải được URL-encode.
Không commit `.env`.

## Khởi chạy

```bash
docker compose config
docker compose up -d --build --wait
docker compose ps
```

Backend tự chạy các file migration chưa áp dụng khi container khởi động. PostgreSQL lưu
dữ liệu trong named volume `mini_game_hub_postgres_data`.

Chép cấu hình `ops/nginx-vps.conf.example` vào `/etc/nginx/sites-available/`, thay domain,
bật site rồi kiểm tra và reload Nginx. Frontend chỉ publish ở `127.0.0.1:8080`; backend
và PostgreSQL không mở port trực tiếp ra Internet.

## Sao lưu và phục hồi PostgreSQL

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U mini_game -d mini_game_hub -Fc > backups/mini_game_hub_$(date +%F_%H-%M-%S).dump
```

Phục hồi vào database trống:

```bash
docker compose exec -T postgres pg_restore -U mini_game -d mini_game_hub --clean --if-exists < backups/ten-ban-sao.dump
```

Nên chép file backup sang máy hoặc kho lưu trữ khác, không chỉ giữ trên cùng VPS.

## Cập nhật mà không mất database

```bash
git pull --ff-only
docker compose config
docker compose up -d --build --remove-orphans --wait
```

Lệnh trên recreate container nhưng giữ named volume. Không dùng `docker compose down -v`
trong quy trình thông thường vì `-v` xóa volume PostgreSQL. Trước thay đổi lớn nên tạo
backup bằng `pg_dump`.
