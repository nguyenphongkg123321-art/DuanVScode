import importlib.util
from datetime import datetime
from pathlib import Path


PRODUCER_PATH = Path(__file__).parents[1] / "services" / "producer" / "producer.py"
spec = importlib.util.spec_from_file_location("producer", PRODUCER_PATH)
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


def test_generated_event_has_valid_contract():
    event = producer.build_event()

    assert set(event) == {
        "event_id",
        "user_id",
        "event_type",
        "page",
        "country",
        "device",
        "revenue",
        "event_time",
    }
    assert event["event_type"] in producer.EVENT_TYPES
    assert event["country"] in producer.COUNTRIES
    assert event["device"] in producer.DEVICES
    assert datetime.fromisoformat(event["event_time"]).tzinfo is not None
    assert event["revenue"] >= 0


def test_only_purchase_events_have_revenue():
    for _ in range(500):
        event = producer.build_event()
        if event["event_type"] == "purchase":
            assert event["revenue"] > 0
        else:
            assert event["revenue"] == 0

