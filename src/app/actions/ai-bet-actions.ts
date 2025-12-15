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

export async function generateBulkBets(topic: string, timeframe: string, type: "CHOICE" | "MATCH") {
    if (!apiKey) {
        console.warn("No Gemini API Key found. Returning mock bulk data.");
        await new Promise(r => setTimeout(r, 1000));
        return [
            { question: "Arsenal vs Chelsea", type: "MATCH", matchHome: "Arsenal", matchAway: "Chelsea", date: new Date().toISOString() },
            { question: "Man Utd vs Liverpool", type: "MATCH", matchHome: "Man Utd", matchAway: "Liverpool", date: new Date().toISOString() }
        ];
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are a betting scheduling assistant.
            Current Date: ${new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

            Generate a list of strictly REAL confirmed matches/events for the topic: "${topic}" occurring in the timeframe: "${timeframe}".
            
            The user wants bets of type: "${type}".
            
            - If type is "MATCH", generate Match Prediction bets (Exact Score / Winner).
            - If type is "CHOICE", generate 1x2 (Home/Draw/Away) bets.

            Return ONLY a valid JSON array of objects.
            JSON Structure:
            [
                {
                    "question": "HomeTeam vs AwayTeam",
                    "type": "${type}",
                    "matchHome": "HomeTeamName",
                    "matchAway": "AwayTeamName",
                    "date": "ISO8601 Date String (e.g. 2024-03-20T20:00:00.000Z)",
                    "options": ["HomeTeam", "AwayTeam", "Draw"] (ONLY IF type is CHOICE)
                }
            ]
            
            IMPORTANT:
            - Verify dates are accurate for the timeframe relative to the Current Date.
            - Provide at least 5-10 matches if available.
            - Do not include markdown formatting. Just the raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("AI Bulk Generation Error:", error);
        return [];
    }
}

export async function verifyBetResult(question: string, context?: any) {
    if (!apiKey) {
        // Mock response
        await new Promise(r => setTimeout(r, 1000));
        return "Mock Result: Team A won 2-1";
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Act as a sports/events judge. 
            Question: "${question}"
            Context: ${JSON.stringify(context || {})}
            Time: ${new Date().toISOString()}

            Based on your knowledge, determine the outcome of this event. 
            If the event is in the future or you don't know, state "Unknown" or "Pending".
            If you are reasonably sure, provide the result concisely.
            
            Format: "Winner: [Name]" or "Score: [Home] - [Away]" or "Yes/No".
            Keep it short.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI Verification Error:", error);
        return "Error determining result.";
    }
}
