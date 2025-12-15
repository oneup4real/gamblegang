
import * as fs from 'fs';
import * as path from 'path';

// Manual .env.local parsing to avoid dotenv dependency
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.warn("Could not load .env.local manually", e);
  }
}

loadEnv();

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERROR: No Gemini API Key found in environment variables.");
  process.exit(1);
}

async function run() {
  console.log("Initializing Gemini Client (via REST)...");

  const topic = "Swiss Super League";
  const timeframe = "Remaining matches for 2025";
  const type = "MATCH";

  console.log(`Generating matches for ${topic} (${timeframe})...`);

  const promptText = `
        You are a betting scheduling assistant.
        Current Date: ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

        Generate a list of confirmed Swiss Super League matches scheduled between December 15, 2025 and December 31, 2025.
        
        The user wants bets of type: "${type}".
        
        - If type is "MATCH", generate Match Prediction bets (Exact Score / Winner).
        
        Return ONLY a valid JSON array of objects.
        
        IMPORTANT:
        - There ARE matches in this period (Matchday 19 etc). Find them.
        - Do not return an empty list.
        - JSON format only.
        `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No content generated.");
    }
    console.log("Raw AI response:", text);

    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const matches = JSON.parse(cleanText);

    console.log("Successfully generated matches:");
    console.log(JSON.stringify(matches, null, 2));

    const outputPath = path.join(process.cwd(), 'swiss_matches_2025.json');
    fs.writeFileSync(outputPath, JSON.stringify(matches, null, 2));
    console.log(`\nSaved matches to ${outputPath}`);
  } catch (error) {
    console.error("Error generating matches:", error);
  }
}

run();
