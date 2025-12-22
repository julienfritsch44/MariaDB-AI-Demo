/**
 * POC 3 - SkyAI Copilot API Test
 * 
 * Objectif : Tester l'API Copilot MariaDB Cloud
 * 
 * Prérequis :
 * - API Key générée sur app.skysql.com/user-profile/api-keys
 * - Ajouter SKYSQL_API_KEY dans .env
 */

require('dotenv').config({ path: '../.env' });

const COPILOT_API_URL = 'https://api.skysql.com/copilot/v1/chat';

async function testCopilotAPI() {
    console.log('🔄 POC 3 - Test SkyAI Copilot API...\n');

    const apiKey = process.env.SKYSQL_API_KEY;

    if (!apiKey) {
        console.log('❌ SKYSQL_API_KEY non définie dans .env');
        console.log('\n📋 Pour obtenir une API Key:');
        console.log('   1. Va sur https://app.skysql.com/user-profile/api-keys');
        console.log('   2. Génère une nouvelle clé');
        console.log('   3. Ajoute dans .env: SKYSQL_API_KEY="ta-clé"');
        return false;
    }

    console.log('✅ API Key trouvée');

    try {
        // Test 1: Simple question au Developer Copilot
        console.log('\n📌 Test 1: Question au Copilot...');

        const response = await fetch(COPILOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({
                prompt: 'How can I optimize a slow query that does a full table scan?',
                // agent_id: 'developer-copilot' // À adapter selon l'ID réel
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Erreur HTTP:', response.status);
            console.log('   Détails:', errorText);

            if (response.status === 401) {
                console.log('\n💡 API Key invalide ou expirée');
            } else if (response.status === 404) {
                console.log('\n💡 Endpoint non trouvé - vérifier l\'URL');
            }
            return false;
        }

        const data = await response.json();
        console.log('✅ Réponse reçue!');
        console.log('\n📝 Réponse Copilot:');
        console.log('   Response:', data.response?.substring(0, 200) + '...');
        if (data.sql) {
            console.log('   SQL suggéré:', data.sql);
        }

        console.log('\n🎉 POC 3 RÉUSSI - Copilot API fonctionnel!\n');
        return true;

    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        return false;
    }
}

testCopilotAPI().then(success => process.exit(success ? 0 : 1));
