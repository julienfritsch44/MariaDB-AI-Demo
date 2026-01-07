-- Initialisation de la base de données POC
-- Ce script génère des données de test et des requêtes lentes

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Stats table
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INT PRIMARY KEY,
    last_calculated DATETIME,
    total_spent DECIMAL(15, 2) DEFAULT 0.00,
    order_count INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- 4. Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 5. Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_name VARCHAR(255),
    quantity INT,
    price DECIMAL(10, 2),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Insert sample data
INSERT INTO categories (name) VALUES ('Electronics'), ('Apparel'), ('Home & Garden'), ('Sports'), ('Books');

INSERT INTO users (username, email, status, created_at) 
VALUES 
('john_doe', 'john@example.com', 'active', '2023-12-01'),
('jane_smith', 'jane@example.com', 'active', '2024-01-05'),
('bob_root', 'bob@example.com', 'inactive', '2023-10-20');

INSERT INTO user_stats (user_id, last_calculated)
SELECT id, NOW() FROM users;

-- Insérer des données de test (1000 lignes pour éviter timeout en demo)
DROP PROCEDURE IF EXISTS generate_test_data;
DELIMITER //
CREATE PROCEDURE generate_test_data()
BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= 1000 DO
        INSERT INTO orders (customer_id, product_name, quantity, price, status)
        VALUES (
            FLOOR(RAND() * 1000) + 1,
            CONCAT('Product_', FLOOR(RAND() * 100)),
            FLOOR(RAND() * 10) + 1,
            ROUND(RAND() * 1000, 2),
            ELT(FLOOR(RAND() * 4) + 1, 'pending', 'shipped', 'delivered', 'cancelled')
        );
        
        IF (i <= 100) THEN
            INSERT INTO products (category_id, name, price)
            VALUES (
                FLOOR(RAND() * 5) + 1,
                CONCAT('Item_', i),
                ROUND(RAND() * 500, 2)
            );
        END IF;
        
        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

-- Exécuter la procédure
CALL generate_test_data();

SELECT 'Test data generated successfully' AS message;

