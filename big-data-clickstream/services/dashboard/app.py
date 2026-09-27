import os
import time

import pandas as pd
import plotly.express as px
import streamlit as st
from sqlalchemy import create_engine, text


def database_url() -> str:
    user = os.getenv("POSTGRES_USER", "bigdata")
    password = os.getenv("POSTGRES_PASSWORD", "bigdata")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    database = os.getenv("POSTGRES_DB", "analytics")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"


@st.cache_resource
def get_engine():
    return create_engine(database_url(), pool_pre_ping=True)


@st.cache_data(ttl=5)
def load_metrics(minutes: int) -> pd.DataFrame:
    query = text(
        """
        SELECT window_start, page, country, event_type, event_count, unique_users
        FROM clickstream_metrics
        WHERE window_start >= NOW() - (:minutes * INTERVAL '1 minute')
        ORDER BY window_start
        """
    )
    with get_engine().connect() as connection:
        return pd.read_sql(query, connection, params={"minutes": minutes})


st.set_page_config(page_title="Clickstream Analytics", page_icon="📊", layout="wide")
st.title("Clickstream Analytics — Realtime")
st.caption("Kafka-compatible Redpanda → Spark Structured Streaming → PostgreSQL + Parquet")

minutes = st.sidebar.slider("Khoảng thời gian (phút)", 5, 120, 30, 5)
auto_refresh = st.sidebar.toggle("Tự động cập nhật", value=True)

try:
    data = load_metrics(minutes)
except Exception as exc:
    st.warning(f"Đang chờ dữ liệu từ pipeline: {exc}")
    time.sleep(5)
    st.rerun()

if data.empty:
    st.info("Pipeline đang khởi động. Dữ liệu thường xuất hiện sau 20–60 giây.")
else:
    total_events = int(data["event_count"].sum())
    total_users = int(data["unique_users"].sum())
    purchases = int(data.loc[data["event_type"] == "purchase", "event_count"].sum())

    col1, col2, col3 = st.columns(3)
    col1.metric("Sự kiện", f"{total_events:,}")
    col2.metric("Người dùng (ước tính)", f"{total_users:,}")
    col3.metric("Lượt mua", f"{purchases:,}")

    timeline = data.groupby(["window_start", "event_type"], as_index=False)["event_count"].sum()
    st.plotly_chart(
        px.line(
            timeline,
            x="window_start",
            y="event_count",
            color="event_type",
            markers=True,
            title="Số sự kiện theo thời gian",
        ),
        use_container_width=True,
    )

    left, right = st.columns(2)
    by_country = data.groupby("country", as_index=False)["event_count"].sum()
    left.plotly_chart(
        px.bar(by_country, x="country", y="event_count", title="Sự kiện theo quốc gia"),
        use_container_width=True,
    )
    by_page = (
        data.groupby("page", as_index=False)["event_count"]
        .sum()
        .sort_values("event_count", ascending=False)
    )
    right.plotly_chart(
        px.bar(by_page, x="page", y="event_count", title="Trang được truy cập"),
        use_container_width=True,
    )

if auto_refresh:
    time.sleep(5)
    st.rerun()

