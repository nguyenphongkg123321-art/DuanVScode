import json
import os
import random
import signal
import time
import uuid
from datetime import datetime, timezone

from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic
from confluent_kafka.error import KafkaException


BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:19092")
TOPIC = os.getenv("KAFKA_TOPIC", "clickstream-events")
EVENTS_PER_SECOND = max(float(os.getenv("EVENTS_PER_SECOND", "10")), 0.1)

PAGES = ["/", "/products", "/search", "/cart", "/checkout", "/support"]
COUNTRIES = ["VN", "US", "SG", "TH", "JP"]
DEVICES = ["mobile", "desktop", "tablet"]
EVENT_TYPES = ["page_view", "click", "add_to_cart", "purchase"]
EVENT_WEIGHTS = [0.58, 0.28, 0.10, 0.04]

running = True


def stop(*_args):
    global running
    running = False


def ensure_topic() -> None:
    admin = AdminClient({"bootstrap.servers": BOOTSTRAP_SERVERS})
    for attempt in range(30):
        try:
            metadata = admin.list_topics(timeout=5)
            if TOPIC not in metadata.topics:
                futures = admin.create_topics(
                    [NewTopic(TOPIC, num_partitions=3, replication_factor=1)]
                )
                futures[TOPIC].result(timeout=10)
                print(f"Created topic {TOPIC}")
            return
        except (KafkaException, RuntimeError) as exc:
            if attempt == 29:
                raise
            print(f"Kafka is not ready ({exc}); retrying...")
            time.sleep(2)


def build_event() -> dict:
    event_type = random.choices(EVENT_TYPES, weights=EVENT_WEIGHTS, k=1)[0]
    return {
        "event_id": str(uuid.uuid4()),
        "user_id": f"user-{random.randint(1, 5000):05d}",
        "event_type": event_type,
        "page": random.choice(PAGES),
        "country": random.choice(COUNTRIES),
        "device": random.choice(DEVICES),
        "revenue": round(random.uniform(10, 500), 2) if event_type == "purchase" else 0.0,
        "event_time": datetime.now(timezone.utc).isoformat(),
    }


def delivery_report(error, message) -> None:
    if error is not None:
        print(f"Delivery failed: {error}")


def main() -> None:
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    ensure_topic()
    producer = Producer(
        {
            "bootstrap.servers": BOOTSTRAP_SERVERS,
            "client.id": "clickstream-generator",
            "compression.type": "snappy",
            "linger.ms": 20,
        }
    )
    delay = 1.0 / EVENTS_PER_SECOND
    produced = 0

    print(f"Producing {EVENTS_PER_SECOND:g} events/s to {TOPIC}")
    while running:
        event = build_event()
        producer.produce(
            TOPIC,
            key=event["user_id"],
            value=json.dumps(event),
            callback=delivery_report,
        )
        producer.poll(0)
        produced += 1
        if produced % 100 == 0:
            print(f"Produced {produced} events")
        time.sleep(delay)

    producer.flush(10)
    print("Producer stopped cleanly")


if __name__ == "__main__":
    main()

