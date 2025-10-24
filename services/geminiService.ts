// Fix: Create services/geminiService.ts to implement the Gemini API call for generating travel plans.
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { TravelPlan, PackingList, DailyPlan } from "../types";

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

const travelPlanSchema = {
    type: Type.OBJECT,
    properties: {
        city: { type: Type.STRING, description: "The city name." },
        country: { type: Type.STRING, description: "The country name." },
        startDate: { type: Type.STRING, description: "The start date of the trip." },
        endDate: { type: Type.STRING, description: "The end date of the trip." },
        weather: {
            type: Type.OBJECT,
            properties: {
                averageTemp: { type: Type.STRING, description: "Average temperature in Celsius." },
                description: { type: Type.STRING, description: "Brief weather description." },
            },
            required: ["averageTemp", "description"],
        },
        exchangeRate: {
            type: Type.OBJECT,
            properties: {
                from: { type: Type.STRING, description: "Currency converting from, e.g., 'KRW'." },
                to: { type: Type.STRING, description: "Local currency." },
                rate: { type: Type.STRING, description: "The exchange rate based on 1000 KRW, formatted as a complete string, e.g., '1000 KRW = 0.72 USD'." },
            },
            required: ["from", "to", "rate"],
        },
        culturalTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A few key cultural tips or local etiquette."
        },
        transportationInfo: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING, description: "A brief description of the main transportation methods." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Examples of transportation costs, like '1-day pass: ~$10' or 'Single ride: ~$2.50'." }
            },
            required: ["description", "options"],
        },
        priceInfo: {
            type: Type.OBJECT,
            properties: {
                level: { type: Type.STRING, description: "The general price level, e.g., 'Affordable', 'Moderate', 'Expensive'." },
                description: { type: Type.STRING, description: "A brief description of the local price level." },
                examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Examples of common costs, like 'Meal at a cheap restaurant: ~$15' or 'Coffee: ~$5'." }
            },
            required: ["level", "description", "examples"],
        },
        itinerary: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.INTEGER },
                    title: { type: Type.STRING, description: "A theme or title for the day." },
                    activities: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                time: { type: Type.STRING, description: "e.g., '오전 9시', '점심', '오후 3시'" },
                                description: { type: Type.STRING, description: "Description of the activity." },
                                icon: { type: Type.STRING, description: "An emoji or a keyword like 'restaurant', 'museum', 'park', 'cafe', 'shopping', 'transport', 'hotel'" },
                                latitude: { type: Type.NUMBER, description: "The latitude coordinate for the activity's location, if it's a specific place." },
                                longitude: { type: Type.NUMBER, description: "The longitude coordinate for the activity's location, if it's a specific place." },
                                klookUrl: { type: Type.STRING, description: "A Klook.com search URL for booking this activity or ticket, if applicable." },
                                bookingUrl: { type: Type.STRING, description: "A Booking.com search URL for this accommodation, if the activity is a hotel." },
                                tripAdvisorUrl: { type: Type.STRING, description: "A TripAdvisor.com search URL for this restaurant or cafe, if applicable." },
                            },
                             required: ["time", "description", "icon"],
                        },
                    },
                },
                 required: ["day", "title", "activities"],
            },
        },
        cityLatitude: { type: Type.NUMBER, description: "The central latitude coordinate for the destination city." },
        cityLongitude: { type: Type.NUMBER, description: "The central longitude coordinate for the destination city." },
        confirmationMessage: { type: Type.STRING, description: "A brief, friendly confirmation message in Korean acknowledging the user's request has been completed." },
    },
    required: ["city", "country", "startDate", "endDate", "weather", "exchangeRate", "culturalTips", "itinerary", "cityLatitude", "cityLongitude", "transportationInfo", "priceInfo"],
};

const getStreamingPrompt = (city: string, startDate: string, endDate: string, travelStyles: string[], budget: string): string => {
    const travelStyleText = travelStyles.length > 0 ? `My preferred travel styles are: ${travelStyles.join(', ')}.` : '';
    const budgetText = budget ? `My budget is '${budget}'.` : '';

    return `
        Create a detailed travel plan for a trip to ${city}.
        The trip is from ${startDate} to ${endDate}.
        ${travelStyleText}
        ${budgetText}

        Generate the response in Korean, piece by piece, using the following structure.
        First, provide the general information as a single JSON object wrapped in <general_info> tags. This JSON should not contain the itinerary.
        The general info JSON object must contain: city, country, startDate, endDate, weather, exchangeRate (the 'rate' field must be a string calculated for 1000 KRW, e.g., '1000 KRW = 0.72 USD'), culturalTips, transportationInfo, priceInfo, cityLatitude, and cityLongitude.

        Then, for each day of the trip, provide a detailed daily plan as a separate JSON object, each wrapped in <daily_plan> tags.
        Each daily plan JSON must contain: day, title, and a list of activities.
        For each activity, provide: time, description, icon, and if applicable, latitude, longitude, and booking URLs (klookUrl, bookingUrl, tripAdvisorUrl). You MUST provide latitude and longitude for any specific physical location.

        Finally, after all daily plans are generated, provide a friendly confirmation message as a JSON object wrapped in <confirmation> tags.
        The confirmation JSON object must contain one field: 'confirmationMessage'.

        Example output structure:
        <general_info>
        { "city": "...", "country": "...", ... }
        </end_info>
        <daily_plan>
        { "day": 1, "title": "...", "activities": [ ... ] }
        </daily_plan>
        <daily_plan>
        { "day": 2, "title": "...", "activities": [ ... ] }
        </daily_plan>
        <confirmation>
        { "confirmationMessage": "네, 요청하신 ${city} 여행 계획이 완성되었습니다!" }
        </confirmation>

        Do not add any other text, explanations, or markdown formatting outside of these tags. The content inside the tags must be valid JSON.
    `;
};


export const startChatSession = (): Chat => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: [],
    });
    return chat;
};

export const generateInitialTravelPlanStream = async (
    chat: Chat,
    city: string,
    startDate: string,
    endDate: string,
    travelStyles: string[],
    budget: string
) => {
    const prompt = getStreamingPrompt(city, startDate, endDate, travelStyles, budget);
    return chat.sendMessageStream({ message: prompt });
}

export const updateTravelPlan = async (
    chatHistory: { role: 'user' | 'model', parts: { text: string }[] }[],
    updateRequest: string
): Promise<TravelPlan> => {
    const systemInstruction = `You are a travel plan assistant. Your ONLY job is to modify a travel plan based on user requests.
1.  For every valid modification request, you MUST respond with ONLY the complete, updated travel plan in the same JSON format as the original. You must also update the 'confirmationMessage' field with a user-friendly message in Korean that confirms the specific change you made.
2.  If the user's request is NOT related to modifying the travel plan (e.g., asking about history, politics, or random facts), you MUST respond with the original, unmodified travel plan JSON and set the 'confirmationMessage' field to '주제와 관련있는 질문만 해주세요.'.
3.  Do not add any other text, explanations, or markdown formatting. The entire response must be a single, valid JSON object that adheres to the provided schema.`;
    
    // Create a new chat session specifically for the update with the strict schema.
    const updateChat = ai.chats.create({
         model: 'gemini-2.5-flash',
         config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: travelPlanSchema,
        },
        history: chatHistory,
    });

     try {
        const response = await updateChat.sendMessage({ message: updateRequest });
        const jsonText = response.text.trim();
        const plan = JSON.parse(jsonText);
        return plan as TravelPlan;
    } catch (error) {
        console.error("Error updating travel plan:", error);
        throw new Error("AI 여행 계획 업데이트에 실패했습니다. 다시 시도해주세요.");
    }
}


const packingListSchema = {
    type: Type.OBJECT,
    properties: {
        packing_list: {
            type: Type.ARRAY,
            description: "An array of packing list categories.",
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: "The category name, e.g., '필수품', '의류', '전자기기'." },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                item: { type: Type.STRING, description: "The name of the item to pack." },
                                note: { type: Type.STRING, description: "Optional notes about the item, like quantity or type." }
                            },
                            required: ["item"]
                        }
                    }
                },
                required: ["category", "items"]
            }
        }
    },
    required: ["packing_list"]
};

export const generatePackingList = async (plan: TravelPlan): Promise<PackingList> => {
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

    const getSampledActivities = (itinerary: DailyPlan[]): string => {
        const allActivities = itinerary.flatMap(day => day.activities);
        if (allActivities.length === 0) return "특별한 활동 없음";

        const activitiesByIcon = allActivities.reduce((acc, activity) => {
            const iconKey = activity.icon.toLowerCase();
            if (!acc[iconKey]) {
                acc[iconKey] = [];
            }
            acc[iconKey].push(activity.description);
            return acc;
        }, {} as Record<string, string[]>);

        const sampled: string[] = [];
        for (const icon in activitiesByIcon) {
            sampled.push(activitiesByIcon[icon][0]);
        }

        return sampled.slice(0, 20).join(', ');
    };
    
    const activitiesSummary = getSampledActivities(plan.itinerary);


    const prompt = `
        Based on the following travel plan, create a personalized packing list in Korean.

        - **Destination:** ${plan.city}, ${plan.country}
        - **Trip Duration:** ${duration} days (${plan.startDate} to ${plan.endDate})
        - **Expected Weather:** ${plan.weather.averageTemp}, ${plan.weather.description}
        - **Planned Activities Summary:** ${activitiesSummary}.

        Please organize the list into logical categories like '필수품' (Essentials), '의류' (Clothing), '전자기기' (Electronics), '세면도구' (Toiletries), and '기타' (Miscellaneous).
        For each item, provide a name and an optional short note (e.g., quantity, specific type).
        Return the entire list as a a single JSON object that strictly adheres to the provided schema. Do not include any markdown formatting or any other text outside the JSON object.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: packingListSchema,
            },
        });

        const jsonText = response.text.trim();
        const packingList = JSON.parse(jsonText);
        return packingList as PackingList;
    } catch (error) {
        console.error("Error generating packing list:", error);
        throw new Error("AI 준비물 리스트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
};