-- Migration 008: Setup vacation/leave balances for 2026
-- Based on Excel data showing leave types per employee

-- First, ensure vacation_balance table exists (should be from migration 004)
-- Then populate with initial balances for all employees

-- Insert or update vacation balance for year 2026
-- Calculate vacation hours: (contract_hours_per_week / 40) * 200 standard vacation hours
-- Note: available_hours is GENERATED column - auto-calculated as (total - used - pending)
INSERT INTO vacation_balance (medew_gc_id, year, total_hours, used_hours, pending_hours)
SELECT 
    u.medew_gc_id,
    2026 as year,
    ROUND((u.contract_hours_per_week / 40.0) * 200, 2) as total_hours,
    0 as used_hours,
    0 as pending_hours
FROM users u
WHERE u.contract_hours_per_week > 0
ON CONFLICT (medew_gc_id, year) 
DO UPDATE SET
    total_hours = EXCLUDED.total_hours,
    used_hours = EXCLUDED.used_hours,
    pending_hours = EXCLUDED.pending_hours,
    updated_at = CURRENT_TIMESTAMP;

-- Verification query
SELECT 
    u.first_name || ' ' || u.last_name as employee_name,
    u.contract_hours_per_week,
    vb.year,
    vb.total_hours,
    vb.used_hours,
    vb.pending_hours,
    vb.available_hours
FROM vacation_balance vb
JOIN users u ON u.medew_gc_id = vb.medew_gc_id
WHERE vb.year = 2026
ORDER BY u.last_name;

-- Note: Additional leave types from Excel (Erkende feestdag, Bijzonder verlof, etc.)
-- are tracked via leave_requests_workflow table when employees request them.
-- Those are NOT pre-allocated vacation hours but separate leave categories.
