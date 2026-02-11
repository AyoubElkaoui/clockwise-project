-- Migration: 021_CreateUserHourAllocationsTable
-- Stores per-user hour code allocations (e.g., vacation days, ATV, sick leave budgets)

CREATE TABLE IF NOT EXISTS user_hour_allocations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_code VARCHAR(20) NOT NULL,         -- e.g., "Z03", "Z04", "I02", "SLEEFTIJD"
    task_description VARCHAR(255),           -- cached description from Syntess
    annual_budget DECIMAL(10,2) NOT NULL DEFAULT 0,  -- allocated hours/days per year
    used DECIMAL(10,2) NOT NULL DEFAULT 0,           -- used so far this year
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_code, year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_hour_allocations_user_year
    ON user_hour_allocations(user_id, year);
