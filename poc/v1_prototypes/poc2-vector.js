/**
 * POC 2 - MariaDB Vector Search Test
 * 
 * Objectif : Tester création table VECTOR, insertion embeddings, recherche similarité
 */

require('dotenv').config({ path: '../.env' });
const mariadb = require('mariadb');

const EMBEDDING_DIM = 384; // Dimension pour all-MiniLM-L6-v2

const config = {
    host: process.env.SKYSQL_HOST,
    port: parseInt(process.env.SKYSQL_PORT || '3306'),
    user: process.env.SKYSQL_USERNAME,
    password: process.env.SKYSQL_PASSWORD,
    database: 'sky',
    ssl: { rejectUnauthorized: true }
};

// Générer un embedding mocké (pour le POC)
function generateMockEmbedding(seed = 0) {
    const embedding = [];
    for (let i = 0; i < EMBEDDING_DIM; i++) {
        embedding.push(Math.sin(seed + i * 0.1) * 0.5);
    }
    return embedding;
}

async function testVectorSearch() {
    console.log('🔄 POC 2 - Test Vector Search SkySQL...\n');

    let conn;
    try {
        conn = await mariadb.createConnection(config);
        console.log('✅ Connecté à SkySQL');

        // Test 1: Créer la table VECTOR
        console.log('\n📌 Test 1: Création table doc_embeddings...');
        await conn.query('DROP TABLE IF EXISTS doc_embeddings');
        await conn.query(`
      CREATE TABLE doc_embeddings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_title VARCHAR(255),
        doc_content TEXT,
        embedding VECTOR(${EMBEDDING_DIM}) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Table créée!');

        // Test 2: Insérer des documents
        console.log('\n📌 Test 2: Insertion de documents...');
        const docs = [
            { title: 'Create Index for Performance', content: 'Use CREATE INDEX on columns in WHERE clauses to speed up queries.' },
            { title: 'Avoid SELECT *', content: 'Always specify column names instead of SELECT * to reduce data transfer.' },
            { title: 'Full Table Scan Fix', content: 'Add an index on the filtered column to avoid full table scans.' },
            { title: 'Optimize JOINs', content: 'Ensure JOIN columns are indexed and use appropriate JOIN types.' },
            { title: 'Connection Pooling', content: 'Use connection pools to reduce connection overhead in applications.' }
        ];

        for (let i = 0; i < docs.length; i++) {
            const embedding = generateMockEmbedding(i);
            const vectorStr = `[${embedding.join(',')}]`;
            await conn.query(
                `INSERT INTO doc_embeddings (doc_title, doc_content, embedding) VALUES (?, ?, VEC_FromText(?))`,
                [docs[i].title, docs[i].content, vectorStr]
            );
            console.log(`   ✅ "${docs[i].title}"`);
        }

        // Test 3: Recherche par similarité
        console.log('\n📌 Test 3: Recherche par similarité cosinus...');
        const queryEmbedding = generateMockEmbedding(2.5); // Proche des docs 2 et 3
        const queryVectorStr = `[${queryEmbedding.join(',')}]`;

        const results = await conn.query(`
      SELECT 
        doc_title,
        doc_content,
        VEC_DISTANCE_COSINE(embedding, VEC_FromText(?)) AS distance
      FROM doc_embeddings
      ORDER BY distance ASC
      LIMIT 3
    `, [queryVectorStr]);

        console.log('✅ Top 3 résultats:');
        results.forEach((r, i) => {
            console.log(`   ${i + 1}. "${r.doc_title}" (distance: ${parseFloat(r.distance).toFixed(6)})`);
        });

        // Test 4: Vérifier le contenu
        console.log('\n📌 Test 4: Vérification des données...');
        const count = await conn.query('SELECT COUNT(*) as cnt FROM doc_embeddings');
        console.log(`✅ ${count[0].cnt} documents dans la table`);

        // Cleanup optionnel
        console.log('\n📌 Nettoyage...');
        await conn.query('DROP TABLE doc_embeddings');
        console.log('✅ Table supprimée');

        console.log('\n🎉 POC 2 RÉUSSI - Vector Search pleinement fonctionnel!\n');
        return true;

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('Code:', error.code);
        return false;
    } finally {
        if (conn) await conn.end();
    }
}

testVectorSearch().then(success => process.exit(success ? 0 : 1));
