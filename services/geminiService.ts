import { GoogleGenAI } from "@google/genai";
import { Tick, Strategy } from "../types";

// Initialize the API client
// In a real app, ensure process.env.API_KEY is set. 
// Here we assume the environment provides it.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeMarketSentiment = async (ticks: Tick[], symbol: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) return "API Key missing for AI analysis.";

    // Sample the last 20 ticks to avoid token limits and reduce latency
    const recentTicks = ticks.slice(-20);
    const dataStr = recentTicks.map(t => `Time:${t.timestamp}, Price:${t.price}, Qty:${t.quantity}`).join('\n');

    const prompt = `
      Act as a High-Frequency Trading analyst. 
      Analyze the following recent tick data for ${symbol}.
      Identify any micro-trends, liquidity gaps, or potential volatility spikes.
      Keep the response concise (under 50 words) and actionable.
      
      Data:
      ${dataStr}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to analyze market data at this time.";
  }
};

export const optimizeStrategyCode = async (strategyName: string, codeSnippet: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) return "API Key missing.";

    const prompt = `
      You are an expert Low-Latency C++/Rust engineer for HFT systems.
      Review the following strategy code snippet for '${strategyName}'.
      Suggest optimizations for CPU cache locality, branch prediction, or memory safety.
      
      Code:
      \`\`\`
      ${codeSnippet}
      \`\`\`
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is suitable for code reasoning
      contents: prompt,
    });

    return response.text || "No optimization suggestions found.";
  } catch (error) {
    console.error("Gemini Code Analysis Error:", error);
    return "Error analyzing code.";
  }
};
