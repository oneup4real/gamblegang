const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findBet() {
  console.log("Searching for Warriors bets...");
  const betsRef = db.collectionGroup('bets');
  const snapshot = await betsRef.get();
  
  let found = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const q = (data.question || "").toLowerCase();
    if (q.includes("warriors") || q.includes("golden state")) {
       console.log(`\nFOUND BET: ${doc.id}`);
       console.log(`Question: ${data.question}`);
       console.log(`Status: ${data.status}`);
       console.log(`DataSource: ${data.dataSource}`);
       console.log(`SportsDB Event ID: ${data.sportsDbEventId}`); // <--- THIS is what we need to check
       console.log(`LiveScore:`, data.liveScore);
       console.log(`EventDate:`, data.eventDate ? (data.eventDate.toDate ? data.eventDate.toDate().toISOString() : data.eventDate) : 'N/A');
       found++;
    }
  });
  
  if (found === 0) console.log("No bets found matching 'Warriors' or 'Golden State'");
}

findBet().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
