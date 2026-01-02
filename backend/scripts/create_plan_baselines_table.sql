-- Table pour stocker les baselines de plans d'exécution
-- Utilisée par le router plan_stability.py

CREATE TABLE IF NOT EXISTS query_plan_baselines (
    fingerprint VARCHAR(64) PRIMARY KEY,
    query_pattern TEXT NOT NULL,
    best_plan JSON NOT NULL,
    best_execution_time_ms INT NOT NULL,
    best_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_validated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_last_validated (last_validated),
    INDEX idx_execution_time (best_execution_time_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemple d'insertion
-- INSERT INTO query_plan_baselines 
-- (fingerprint, query_pattern, best_plan, best_execution_time_ms, best_cost)
-- VALUES 
-- ('abc123', 'SELECT * FROM orders WHERE customer_id = ?', '{"query_block": {...}}', 45, 12.5);
