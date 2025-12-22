-- Initialisation de la base de données POC
-- Ce script génère des données de test et des requêtes lentes

-- Créer une table de test
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_name VARCHAR(255),
    quantity INT,
    price DECIMAL(10, 2),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'
);

-- Insérer des données de test (10000 lignes)
DELIMITER //
CREATE PROCEDURE generate_test_data()
BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= 10000 DO
        INSERT INTO orders (customer_id, product_name, quantity, price, status)
        VALUES (
            FLOOR(RAND() * 1000) + 1,
            CONCAT('Product_', FLOOR(RAND() * 100)),
            FLOOR(RAND() * 10) + 1,
            ROUND(RAND() * 1000, 2),
            ELT(FLOOR(RAND() * 4) + 1, 'pending', 'shipped', 'delivered', 'cancelled')
        );
        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

-- Exécuter la procédure
CALL generate_test_data();

-- Créer une requête lente volontairement (pas d'index sur customer_id)
-- Cette requête sera loguée dans slow_query_log

SELECT 'Test data generated successfully' AS message;
