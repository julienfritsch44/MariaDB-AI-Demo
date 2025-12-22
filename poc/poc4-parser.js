/**
 * POC 4 - Slow Query Log Parser Test
 * 
 * Objectif : Vérifier qu'on peut parser le format slow_query_log
 * 
 * Ce POC utilise un log de test intégré pour démontrer le parsing.
 */

// Sample slow query log (format MariaDB standard)
const SAMPLE_LOG = `
# Time: 2024-12-22T10:30:00.000000Z
# User@Host: app_user[app_user] @ localhost []
# Thread_id: 12345  Schema: orders_db  QC_hit: No
# Query_time: 5.512345  Lock_time: 0.000123 Rows_sent: 1  Rows_examined: 1000000
SET timestamp=1734864600;
SELECT * FROM orders WHERE customer_id = 12345;

# Time: 2024-12-22T10:31:15.000000Z
# User@Host: api_service[api_service] @ 10.0.0.5 []
# Thread_id: 12346  Schema: products_db  QC_hit: No
# Query_time: 3.245678  Lock_time: 0.000050 Rows_sent: 500  Rows_examined: 50000
SET timestamp=1734864675;
SELECT p.*, c.name as category_name 
FROM products p 
LEFT JOIN categories c ON p.category_id = c.id 
WHERE p.status = 'active';

# Time: 2024-12-22T10:32:00.000000Z
# User@Host: batch_job[batch_job] @ localhost []
# Thread_id: 12347  Schema: analytics_db  QC_hit: No
# Query_time: 12.876543  Lock_time: 0.001234 Rows_sent: 10  Rows_examined: 5000000
SET timestamp=1734864720;
UPDATE user_stats SET last_calculated = NOW() WHERE user_id IN (SELECT id FROM users WHERE created_at > '2024-01-01');
`;

/**
 * Parse une entrée du slow query log
 */
function parseSlowQueryEntry(entry) {
    const lines = entry.trim().split('\n');
    const result = {
        timestamp: null,
        user: null,
        host: null,
        schema: null,
        query_time: null,
        lock_time: null,
        rows_sent: null,
        rows_examined: null,
        sql: null,
        fingerprint: null
    };

    let sqlLines = [];

    for (const line of lines) {
        // Parse Time
        if (line.startsWith('# Time:')) {
            result.timestamp = line.replace('# Time:', '').trim();
        }

        // Parse User@Host
        if (line.startsWith('# User@Host:')) {
            const match = line.match(/# User@Host:\s+(\w+)\[.*?\]\s+@\s+(\S+)/);
            if (match) {
                result.user = match[1];
                result.host = match[2];
            }
        }

        // Parse Schema
        if (line.includes('Schema:')) {
            const match = line.match(/Schema:\s+(\S+)/);
            if (match) {
                result.schema = match[1];
            }
        }

        // Parse Query_time, Lock_time, Rows_sent, Rows_examined
        if (line.startsWith('# Query_time:')) {
            const queryTimeMatch = line.match(/Query_time:\s+([\d.]+)/);
            const lockTimeMatch = line.match(/Lock_time:\s+([\d.]+)/);
            const rowsSentMatch = line.match(/Rows_sent:\s+(\d+)/);
            const rowsExaminedMatch = line.match(/Rows_examined:\s+(\d+)/);

            if (queryTimeMatch) result.query_time = parseFloat(queryTimeMatch[1]);
            if (lockTimeMatch) result.lock_time = parseFloat(lockTimeMatch[1]);
            if (rowsSentMatch) result.rows_sent = parseInt(rowsSentMatch[1]);
            if (rowsExaminedMatch) result.rows_examined = parseInt(rowsExaminedMatch[1]);
        }

        // Skip SET timestamp line, collect SQL
        if (!line.startsWith('#') && !line.startsWith('SET timestamp=')) {
            sqlLines.push(line);
        }
    }

    result.sql = sqlLines.join(' ').trim();
    result.fingerprint = normalizeQuery(result.sql);

    return result;
}

/**
 * Normalise une requête SQL (remplace les valeurs par des placeholders)
 */
function normalizeQuery(sql) {
    if (!sql) return null;

    return sql
        // Remplacer les nombres par ?
        .replace(/\b\d+\b/g, '?')
        // Remplacer les strings entre quotes par ?
        .replace(/'[^']*'/g, '?')
        // Remplacer les strings entre double quotes par ?
        .replace(/"[^"]*"/g, '?')
        // Normaliser les espaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parse un fichier de slow query log complet
 */
function parseSlowQueryLog(logContent) {
    // Split par entrée (chaque entrée commence par # Time:)
    const entries = logContent.split(/(?=# Time:)/);

    const queries = [];
    for (const entry of entries) {
        if (entry.trim() && entry.includes('# Time:')) {
            const parsed = parseSlowQueryEntry(entry);
            if (parsed.sql) {
                queries.push(parsed);
            }
        }
    }

    return queries;
}

/**
 * Calcule un score d'impact simple
 */
function calculateImpactScore(query, allQueries) {
    // Facteurs : query_time (40%), rows_examined/rows_sent ratio (30%), rows_examined absolu (30%)
    const maxQueryTime = Math.max(...allQueries.map(q => q.query_time));
    const maxRowsExamined = Math.max(...allQueries.map(q => q.rows_examined));

    const timeScore = (query.query_time / maxQueryTime) * 40;

    const scanRatio = query.rows_sent > 0 ? query.rows_examined / query.rows_sent : query.rows_examined;
    const maxRatio = Math.max(...allQueries.map(q => q.rows_sent > 0 ? q.rows_examined / q.rows_sent : q.rows_examined));
    const ratioScore = (scanRatio / maxRatio) * 30;

    const rowsScore = (query.rows_examined / maxRowsExamined) * 30;

    return Math.round(timeScore + ratioScore + rowsScore);
}

// === EXÉCUTION DU POC ===

console.log('🔄 POC 4 - Test Parser Slow Query Log...\n');

console.log('📌 Test 1: Parsing du log de test...');
const queries = parseSlowQueryLog(SAMPLE_LOG);
console.log(`✅ ${queries.length} requêtes parsées\n`);

console.log('📌 Test 2: Détails des requêtes:');
queries.forEach((q, i) => {
    console.log(`\n--- Requête ${i + 1} ---`);
    console.log(`   Timestamp: ${q.timestamp}`);
    console.log(`   User: ${q.user}@${q.host}`);
    console.log(`   Schema: ${q.schema}`);
    console.log(`   Query Time: ${q.query_time}s`);
    console.log(`   Lock Time: ${q.lock_time}s`);
    console.log(`   Rows Sent/Examined: ${q.rows_sent} / ${q.rows_examined}`);
    console.log(`   SQL: ${q.sql.substring(0, 80)}...`);
    console.log(`   Fingerprint: ${q.fingerprint.substring(0, 80)}...`);
});

console.log('\n📌 Test 3: Calcul des scores d\'impact:');
queries.forEach((q, i) => {
    const score = calculateImpactScore(q, queries);
    console.log(`   Requête ${i + 1}: Score = ${score}/100`);
});

console.log('\n📌 Test 4: Classement par impact:');
const ranked = queries
    .map((q, i) => ({ ...q, index: i + 1, score: calculateImpactScore(q, queries) }))
    .sort((a, b) => b.score - a.score);

ranked.forEach((q, rank) => {
    console.log(`   ${rank + 1}. Requête ${q.index} (Score: ${q.score}) - ${q.query_time}s, ${q.rows_examined} rows examined`);
});

console.log('\n🎉 POC 4 RÉUSSI - Parser fonctionnel!\n');
