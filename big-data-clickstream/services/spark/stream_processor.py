import os

import psycopg2
from psycopg2.extras import execute_values
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import approx_count_distinct, col, count, from_json, window
from pyspark.sql.types import DoubleType, StringType, StructField, StructType, TimestampType


KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
KAFKA_TOPIC = os.getenv("KAFKA_TOPIC", "clickstream-events")
DATA_LAKE_PATH = os.getenv("DATA_LAKE_PATH", "./data/raw/clickstream")
CHECKPOINT_ROOT = os.getenv("CHECKPOINT_ROOT", "./checkpoints")

EVENT_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("user_id", StringType(), False),
        StructField("event_type", StringType(), False),
        StructField("page", StringType(), False),
        StructField("country", StringType(), False),
        StructField("device", StringType(), False),
        StructField("revenue", DoubleType(), True),
        StructField("event_time", TimestampType(), False),
    ]
)


def postgres_config() -> dict:
    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "dbname": os.getenv("POSTGRES_DB", "analytics"),
        "user": os.getenv("POSTGRES_USER", "bigdata"),
        "password": os.getenv("POSTGRES_PASSWORD", "bigdata"),
    }


def upsert_partition(rows) -> None:
    values = [
        (
            row.window_start,
            row.window_end,
            row.page,
            row.country,
            row.event_type,
            row.event_count,
            row.unique_users,
        )
        for row in rows
    ]
    if not values:
        return

    sql = """
        INSERT INTO clickstream_metrics (
            window_start, window_end, page, country, event_type,
            event_count, unique_users
        ) VALUES %s
        ON CONFLICT (window_start, page, country, event_type)
        DO UPDATE SET
            window_end = EXCLUDED.window_end,
            event_count = EXCLUDED.event_count,
            unique_users = EXCLUDED.unique_users,
            updated_at = NOW()
    """
    with psycopg2.connect(**postgres_config()) as connection:
        with connection.cursor() as cursor:
            execute_values(cursor, sql, values, page_size=500)


def write_metrics(batch: DataFrame, _batch_id: int) -> None:
    flattened = batch.select(
        col("window.start").alias("window_start"),
        col("window.end").alias("window_end"),
        "page",
        "country",
        "event_type",
        "event_count",
        "unique_users",
    )
    flattened.foreachPartition(upsert_partition)


def main() -> None:
    spark = (
        SparkSession.builder.appName("ClickstreamRealtimeAnalytics")
        .config("spark.sql.shuffle.partitions", "6")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    kafka = (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_SERVERS)
        .option("subscribe", KAFKA_TOPIC)
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )

    events = (
        kafka.select(from_json(col("value").cast("string"), EVENT_SCHEMA).alias("event"))
        .select("event.*")
        .filter(col("event_id").isNotNull() & col("event_time").isNotNull())
    )

    raw_query = (
        events.writeStream.format("parquet")
        .partitionBy("country", "event_type")
        .option("path", DATA_LAKE_PATH)
        .option("checkpointLocation", f"{CHECKPOINT_ROOT}/raw")
        .outputMode("append")
        .start()
    )

    metrics = (
        events.withWatermark("event_time", "2 minutes")
        .groupBy(window("event_time", "1 minute"), "page", "country", "event_type")
        .agg(
            count("event_id").alias("event_count"),
            approx_count_distinct("user_id").alias("unique_users"),
        )
    )

    metrics_query = (
        metrics.writeStream.foreachBatch(write_metrics)
        .option("checkpointLocation", f"{CHECKPOINT_ROOT}/metrics")
        .outputMode("update")
        .trigger(processingTime="10 seconds")
        .start()
    )

    print(f"Streaming {KAFKA_TOPIC} to {DATA_LAKE_PATH} and PostgreSQL")
    spark.streams.awaitAnyTermination()
    raw_query.stop()
    metrics_query.stop()


if __name__ == "__main__":
    main()

