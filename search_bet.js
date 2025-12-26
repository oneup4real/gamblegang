const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'gamblegang-926e3'
});
const db = admin.firestore();
async function run() {
  try {
    const snapshot = await db.collectionGroup('bets').get();
    let found = false;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.question && (data.question.includes('Warriors') || data.question.includes('GoldenState'))) {
        found = true;
        console.log('ID:', doc.id);
        console.log('Status:', data.status);
        console.log('DataSource:', data.dataSource);
        console.log('sportsDbEventId:', data.sportsDbEventId);
        console.log('EventDate:', data.eventDate ? (data.eventDate.toDate ? data.eventDate.toDate().toISOString() : data.eventDate) : 'N/A');
        console.log('Question:', data.question);
        console.log('Verification:', JSON.stringify(data.verification));
        console.log('---');
      }
    });
    if (!found) console.log('No Warriors bets found.');
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
