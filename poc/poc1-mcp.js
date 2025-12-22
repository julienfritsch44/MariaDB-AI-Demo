/**
 * POC 1 - MariaDB SkySQL Connection Test
 * 
 * Objectif : Vérifier la connexion à SkySQL et les capacités
 */

require('dotenv').config({ path: '../.env' });
const mariadb = require('mariadb');

const config = {
    host: process.env.SKYSQL_HOST,
    port: parseInt(process.env.SKYSQL_PORT || '3306'),
    user: process.env.SKYSQL_USERNAME,
    password: process.env.SKYSQL_PASSWORD,
    ssl: { rejectUnauthorized: true },
    connectTimeout: 10000
};

async function testConnection() {
    console.log('🔄 POC 1 - Test connexion SkySQL...\n');
    console.log('Configuration:', {
        host: config.host,
        port: config.port,
        user: config.user
    });

    let conn;
    try {
        // Test 1: Connexion
        console.log('\n📌 Test 1: Connexion...');
        conn = await mariadb.createConnection(config);
        console.log('✅ Connexion réussie!');

        // Test 2: Version
        console.log('\n📌 Test 2: Version MariaDB...');
        const versionResult = await conn.query('SELECT VERSION() as version');
        console.log('✅ Version:', versionResult[0].version);

        // Test 3: Databases
        console.log('\n📌 Test 3: Bases de données...');
        const databases = await conn.query('SHOW DATABASES');
        console.log('✅ Bases:', databases.map(d => d.Database).join(', '));

        // Test 4: Slow query log status
        console.log('\n📌 Test 4: Statut slow_query_log...');
        try {
            const slowLog = await conn.query("SHOW GLOBAL VARIABLES LIKE 'slow_query_log'");
            const longQuery = await conn.query("SHOW GLOBAL VARIABLES LIKE 'long_query_time'");
            console.log('✅ slow_query_log:', slowLog[0]?.Value || 'N/A');
            console.log('✅ long_query_time:', longQuery[0]?.Value || 'N/A');
        } catch (e) {
            console.log('⚠️ Impossible de lire les variables (permissions)');
        }

        // Test 5: Vector support check
        console.log('\n📌 Test 5: Support VECTOR...');
        try {
            await conn.query('CREATE TEMPORARY TABLE vector_test (v VECTOR(3))');
            await conn.query('DROP TEMPORARY TABLE vector_test');
            console.log('✅ Type VECTOR supporté!');
        } catch (e) {
            if (e.message.includes('VECTOR')) {
                console.log('❌ Type VECTOR non supporté (nécessite MariaDB 11.7+)');
            } else {
                console.log('❌ Erreur:', e.message);
            }
        }

        console.log('\n🎉 POC 1 RÉUSSI!\n');
        return true;

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Vérifier que le service SkySQL est actif');
        }
        return false;
    } finally {
        if (conn) await conn.end();
    }
}

testConnection().then(success => process.exit(success ? 0 : 1));
