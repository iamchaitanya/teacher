
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeProfile = async (rawText: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following teacher resume text and provide a concise 3-sentence professional bio and a list of 5 key skills. 
    Text: ${rawText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bio: { type: Type.STRING },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["bio", "skills"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const matchJobs = async (teacherProfile: any, jobs: any[]) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on the teacher's profile: ${JSON.stringify(teacherProfile)}, 
    rank these job listings by compatibility: ${JSON.stringify(jobs)}.
    Return an array of objects with jobId and a matchScore (0-100) and a brief reasoning string.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            jobId: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["jobId", "matchScore", "reasoning"]
        }
      }
    }
  });
  return JSON.parse(response.text);
};
