# Big Data Clickstream Analytics

Dự án mẫu xử lý dữ liệu clickstream thời gian thực, chạy hoàn toàn bằng Docker Compose.

```text
Synthetic Producer
       │ JSON events
       ▼
Redpanda (Kafka API) ─────► Redpanda Console
       │
       ▼
Spark Structured Streaming
       ├──► Data Lake: Parquet, phân vùng country/event_type
       └──► PostgreSQL: metrics theo cửa sổ 1 phút
                         │
                         ▼
                  Streamlit Dashboard
```

## Công nghệ

- Redpanda: message broker tương thích Kafka, topic gồm 3 partition.
- Spark Structured Streaming: parse schema, watermark 2 phút và tổng hợp cửa sổ 1 phút.
- Parquet: lưu raw events dưới dạng data lake, có partition.
- PostgreSQL: serving layer cho số liệu tổng hợp.
- Streamlit + Plotly: dashboard cập nhật mỗi 5 giây.
- Docker Compose: dựng toàn bộ hệ thống bằng một lệnh.

## Chạy nhanh

Yêu cầu: Docker Desktop với tối thiểu khoảng 4 GB RAM khả dụng.

```bash
cd big-data-clickstream
docker compose up --build
```

Lần chạy đầu Spark cần tải Kafka connector từ Maven nên có thể mất vài phút. Sau khi các service khởi động:

- Dashboard: http://localhost:8501
- Redpanda Console: http://localhost:8080
- Kafka từ máy host: `localhost:19092`
- PostgreSQL: `localhost:5432` (`bigdata` / `bigdata`)

Dữ liệu Parquet xuất hiện trong `data/raw/clickstream/`. Checkpoint của Spark nằm trong `checkpoints/`.

## Các lệnh hữu ích

```bash
# Theo dõi log toàn pipeline
docker compose logs -f producer spark

# Tăng tốc độ sinh dữ liệu lên 100 event/giây (PowerShell)
$env:EVENTS_PER_SECOND=100
docker compose up --build

# Dừng nhưng giữ Kafka/PostgreSQL volume
docker compose down

# Dừng và xóa volume (xóa dữ liệu Kafka/PostgreSQL)
docker compose down -v
```

## Kiểm tra dữ liệu

Xem metrics trực tiếp trong PostgreSQL:

```bash
docker compose exec postgres psql -U bigdata -d analytics -c \
  "SELECT * FROM clickstream_metrics ORDER BY window_start DESC LIMIT 10;"
```

Đếm file Parquet trên máy host (PowerShell):

```powershell
(Get-ChildItem -Recurse .\data\raw\clickstream\*.parquet).Count
```

## Cấu hình

Sao chép `.env.example` thành `.env` rồi chỉnh:

| Biến | Mặc định | Ý nghĩa |
|---|---:|---|
| `EVENTS_PER_SECOND` | `10` | Số event giả lập mỗi giây |
| `KAFKA_TOPIC` | `clickstream-events` | Topic đầu vào |
| `POSTGRES_DB` | `analytics` | Database metrics |
| `POSTGRES_USER` | `bigdata` | Tài khoản database |
| `POSTGRES_PASSWORD` | `bigdata` | Mật khẩu database |

## Kiểm thử producer

```bash
python -m pip install pytest confluent-kafka
python -m pytest tests -q
```

## Nâng cấp cho production

- Thay local Parquet bằng S3/MinIO/HDFS và dùng catalog như Apache Iceberg.
- Dùng Schema Registry, dead-letter topic và kiểm tra chất lượng dữ liệu.
- Chạy Spark trên Kubernetes/YARN thay cho `local[*]`.
- Thêm Prometheus/Grafana, alerting và orchestration bằng Airflow.
- Quản lý secret ngoài source code và bật TLS/SASL cho broker/database.

