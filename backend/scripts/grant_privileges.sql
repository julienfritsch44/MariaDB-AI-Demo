-- DBA Copilot Privilege Grants
-- User: dbpgf35856331
-- Description: Grants required privileges for DBA Copilot to analyze slow queries and manage system catalog.

-- 1. General privileges for slow query analysis and metadata inspection
GRANT SELECT, PROCESS, SHOW VIEW, SHOW DATABASES ON *.* TO `dbpgf35856331`@`%`;

-- 2. Privileges for DBA Copilot system catalog (required for specialized analysis features)
CREATE DATABASE IF NOT EXISTS `sky_sys_catalog`;
GRANT CREATE, DROP, CREATE VIEW ON `sky_sys_catalog`.* TO `dbpgf35856331`@`%`;

-- Apply changes
FLUSH PRIVILEGES;

-- Verification commands:
-- SHOW GRANTS FOR 'dbpgf35856331'@'%';
