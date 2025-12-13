"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// Mock response in case no API key is verified/present during dev to avoid breaking content
const MOCK_IDEAS = [
    { question: "Who will win the match?", type: "CHOICE", options: ["Team A", "Team B", "Draw"] },
    { question: "Total goals scored?", type: "RANGE", rangeMin: 0, rangeMax: 10, rangeUnit: "Goals" },
    { question: "Will there be a red card?", type: "CHOICE", options: ["Yes", "No"] }
];

export async function generateBetIdeas(topic: string) {
    if (!apiKey) {
        console.warn("No Gemini API Key found. Returning mock data.");
        // Simulate delay
        await new Promise(r => setTimeout(r, 1000));
        return MOCK_IDEAS;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Generate 3 creative and distinct betting questions for a social betting league based on the topic: "${topic}".
            
            Return ONLY a valid JSON array of objects with this structure:
            [
                { 
                    "question": "The bet question string", 
                    "type": "CHOICE" | "RANGE",
                    "options": ["Option 1", "Option 2"] (Only if type is CHOICE),
                    "rangeMin": 0 (Only if type is RANGE),
                    "rangeMax": 100 (Only if type is RANGE),
                    "rangeUnit": "Units" (Only if type is RANGE)
                }
            ]
            Do not include markdown formatting like \`\`\`json. Just the raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("AI Generation Error:", error);
        return MOCK_IDEAS; // Fallback
    }
}
