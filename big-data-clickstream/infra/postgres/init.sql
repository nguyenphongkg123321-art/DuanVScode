CREATE TABLE IF NOT EXISTS clickstream_metrics (
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    page TEXT NOT NULL,
    country CHAR(2) NOT NULL,
    event_type TEXT NOT NULL,
    event_count BIGINT NOT NULL,
    unique_users BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (window_start, page, country, event_type)
);

CREATE INDEX IF NOT EXISTS idx_clickstream_metrics_window
    ON clickstream_metrics (window_start DESC);

CREATE INDEX IF NOT EXISTS idx_clickstream_metrics_country
    ON clickstream_metrics (country);

