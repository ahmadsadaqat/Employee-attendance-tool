import { GoogleGenAI } from "@google/genai";
import { CheckInRecord, DailyStats } from "../types";

const apiKey = process.env.API_KEY || ''; // In a real scenario, handle missing key gracefully
const ai = new GoogleGenAI({ apiKey });

export const generateAttendanceInsight = async (
  stats: DailyStats,
  recentCheckIns: CheckInRecord[]
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Analyze the following access control data for an ERP system dashboard.
      
      System Stats:
      - Active Exceptions/Alerts: ${stats.exceptions}
      - System Uptime: ${stats.uptime}%
      
      Recent Access Logs (sample):
      ${recentCheckIns.slice(0, 5).map(c => `- ${c.employeeName} (${c.type}) at ${c.location} - ${new Date(c.timestamp).toLocaleTimeString()}`).join('\n')}
      
      Provide a brief, 2-sentence executive summary of the security and access flow status. 
      Focus on system health and traffic flow. 
      Be professional and concise.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Unable to generate insight at this time.";
  } catch (error) {
    console.error("Error generating insight:", error);
    return "AI Insight currently unavailable. Please check your connection.";
  }
};