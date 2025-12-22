
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();
const LEAGUE_ID = 'qiImzBTNoMKdjjgso7eM';

async function checkBets() {
    console.log(`Checking bets for league: ${LEAGUE_ID}`);
    const betsRef = db.collection('leagues').doc(LEAGUE_ID).collection('bets');
    const snapshot = await betsRef.get();

    if (snapshot.empty) {
        console.log('No bets found.');
        return;
    }

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Bet ${doc.id}:`);
        console.log(`- Status: ${data.status}`);
        console.log(`- AutoConfirm: ${data.autoConfirm}`);
        console.log(`- DataSource: ${data.dataSource}`);
        console.log(`- LiveScore: ${JSON.stringify(data.liveScore)}`);
        console.log(`- EventDate: ${data.eventDate?.toDate?.() || data.eventDate}`);
        console.log('---');
    });
}

checkBets().catch(console.error);
