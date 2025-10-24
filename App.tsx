import React, { useState, useRef, useEffect } from 'react';
import TripInput from './components/TripInput';
import ResultsDisplay from './components/ResultsDisplay';
import ChatPanel from './components/ChatPanel';
import LoadingDisplay from './components/LoadingDisplay';
import { generateInitialTravelPlanStream, updateTravelPlan, startChatSession } from './services/geminiService';
import { TravelPlan, ChatMessage, DailyPlan } from './types';
import { Chat } from '@google/genai';
import { ChatBubbleIcon } from './components/IconComponents';


function App() {
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'input' | 'results'>('input');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Use a ref for conversational history sent to the API. This will not contain the large plan JSON.
  const chatHistoryRef = useRef<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  
  // Refs for debouncing UI updates during streaming to prevent excessive re-renders.
  const planBufferRef = useRef<TravelPlan | null>(null);
  const debounceTimerRef = useRef<number | null>(null);


  const processStreamedBuffer = (
    buffer: string,
    tagName: string,
    processor: (json: string) => void
  ): string => {
      const startTag = `<${tagName}>`;
      const endTag = `</${tagName}>`;
      let currentBuffer = buffer;
      
      while (true) {
          const startIndex = currentBuffer.indexOf(startTag);
          const endIndex = currentBuffer.indexOf(endTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
              const jsonStr = currentBuffer.substring(startIndex + startTag.length, endIndex);
              try {
                  processor(jsonStr);
                  currentBuffer = currentBuffer.substring(endIndex + endTag.length);
              } catch (e) {
                  console.error(`Failed to parse JSON for tag ${tagName}:`, e, "JSON string:", jsonStr);
                  // Break on parsing error to wait for more data, maybe it's incomplete
                  break; 
              }
          } else {
              break; // Not a complete tag found, wait for more chunks
          }
      }
      return currentBuffer;
  }

  const handlePlanRequest = async (
    city: string,
    startDate: string,
    endDate: string,
    travelStyles: string[],
    budget: string
  ) => {
    setView('results');
    setIsLoading(true);
    setError(null);
    setTravelPlan(null);
    setChatMessages([]);
    setIsChatOpen(false);
    chatHistoryRef.current = [];
    planBufferRef.current = null;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    const chat = startChatSession();
    
    const streamPromise = async () => {
      const stream = await generateInitialTravelPlanStream(chat, city, startDate, endDate, travelStyles, budget);
      let buffer = '';
      
      for await (const chunk of stream) {
          buffer += chunk.text;

          let generalInfoUpdate: Partial<TravelPlan> | null = null;
          const dailyPlanUpdates: DailyPlan[] = [];

          buffer = processStreamedBuffer(buffer, 'general_info', (json) => {
              try { generalInfoUpdate = JSON.parse(json); } 
              catch (e) { console.error("Failed to parse general_info", e, json); }
          });

          buffer = processStreamedBuffer(buffer, 'daily_plan', (json) => {
              try { dailyPlanUpdates.push(JSON.parse(json)); } 
              catch (e) { console.error("Failed to parse daily_plan", e, json); }
          });

          // Update a buffer ref frequently, but the state only on a debounced timer
          if (generalInfoUpdate || dailyPlanUpdates.length > 0) {
              const newPlan = planBufferRef.current ? { ...planBufferRef.current } : { itinerary: [] } as Partial<TravelPlan>;
              if (generalInfoUpdate) {
                  Object.assign(newPlan, generalInfoUpdate);
              }
              if (dailyPlanUpdates.length > 0) {
                  if (!Array.isArray(newPlan.itinerary)) newPlan.itinerary = [];
                  // Combine and sort new and existing activities to handle them correctly
                  const existingActivities = new Map(newPlan.itinerary.map(p => [p.day, p]));
                  dailyPlanUpdates.forEach(p => existingActivities.set(p.day, p));
                  newPlan.itinerary = Array.from(existingActivities.values()).sort((a, b) => a.day - b.day);
              }
              planBufferRef.current = newPlan as TravelPlan;

              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = window.setTimeout(() => {
                  setTravelPlan(planBufferRef.current);
              }, 300);
          }

          buffer = processStreamedBuffer(buffer, 'confirmation', (json) => {
              const data = JSON.parse(json);
              const confirmationMsg = data.confirmationMessage || '여행 계획이 생성되었습니다. 변경하고 싶은 점이 있다면 말씀해주세요!';
              setChatMessages([{ role: 'model', text: confirmationMsg }]);
              // Only store the conversational part in history, not the massive plan object.
              chatHistoryRef.current.push({ role: 'model', parts: [{ text: confirmationMsg }] });
               if(planBufferRef.current) {
                planBufferRef.current.confirmationMessage = confirmationMsg;
              }
          });
      }

      // Final update after stream ends
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setTravelPlan(planBufferRef.current);
    };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('요청 시간이 30초를 초과했습니다. 네트워크 연결을 확인하거나 다시 시도해주세요.')), 30000)
    );
    
    try {
      await Promise.race([streamPromise(), timeoutPromise]);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const MAX_HISTORY_TURNS = 3; // 3 pairs of user/model messages = 6 items

  const handleSendMessage = async (message: string) => {
    if (!travelPlan) return;

    const userMessage: ChatMessage = { role: 'user', text: message };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    setError(null);

    // Construct a minimal history for the API call, containing the latest plan
    // and the recent conversation turns for context.
    // Fix: Explicitly type historyForAPI to prevent TypeScript from widening the 'role' property to a generic string.
    const historyForAPI: { role: 'user' | 'model', parts: { text: string }[] }[] = [
      { role: 'model', parts: [{ text: JSON.stringify(travelPlan) }] },
      ...chatHistoryRef.current
    ];

    try {
      const updatedPlan = await updateTravelPlan(historyForAPI, message);
      setTravelPlan(updatedPlan);
      const modelResponseMsg = updatedPlan.confirmationMessage || '계획이 업데이트되었습니다.';
      setChatMessages(prev => [...prev, { role: 'model', text: modelResponseMsg }]);
      
      // Update conversation history for the next turn
      chatHistoryRef.current.push({ role: 'user', parts: [{ text: message }] });
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: modelResponseMsg }] });

      // Prune history to prevent it from growing indefinitely
      if (chatHistoryRef.current.length > MAX_HISTORY_TURNS * 2) {
        chatHistoryRef.current = chatHistoryRef.current.slice(-MAX_HISTORY_TURNS * 2);
      }

    } catch (err: any) {
       const errorMessage = err.message || 'An unknown error occurred.';
       setError(errorMessage);
       const errorMsg: ChatMessage = { role: 'model', text: `오류가 발생했습니다: ${errorMessage}` };
       setChatMessages(prev => [...prev, errorMsg]);
       chatHistoryRef.current.push({ role: 'user', parts: [{ text: message }] });
       chatHistoryRef.current.push({ role: 'model', parts: [{ text: `Error: ${errorMessage}` }] });
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleReset = () => {
    setView('input');
    setTravelPlan(null);
    setError(null);
    setChatMessages([]);
    chatHistoryRef.current = [];
    setIsChatOpen(false);
  }

  return (
    <div className="bg-slate-50 min-h-screen font-sans antialiased">
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                Gemini AI 여행 플래너
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">
                가고 싶은 도시와 날짜를 알려주세요. AI가 완벽한 여행 계획을 만들어 드립니다.
            </p>
        </div>

        {view === 'input' ? (
          <TripInput 
            onPlanRequest={handlePlanRequest}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <div className="w-full max-w-7xl mx-auto">
             <div className="text-center mb-6">
                <button 
                    onClick={handleReset}
                    className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    새로운 계획 만들기
                </button>
            </div>
            {isLoading && !travelPlan ? (
              <LoadingDisplay />
            ) : travelPlan ? (
              <ResultsDisplay plan={travelPlan} isLoading={isLoading} />
            ) : error ? (
                 <div className="mt-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-center" role="alert">
                    <p className="font-bold">오류 발생:</p>
                    <p>{error}</p>
                </div>
            ) : null}
          </div>
        )}

      </main>

        {travelPlan && !(isLoading && !travelPlan) && (
            <>
                {!isChatOpen && (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all transform hover:scale-110 z-40"
                        aria-label="Open chat"
                    >
                        <ChatBubbleIcon className="w-8 h-8" />
                    </button>
                )}

                <div 
                    className={`fixed top-0 right-0 h-full w-full max-w-md bg-transparent transition-transform duration-300 ease-in-out z-50 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="h-full p-4">
                        <ChatPanel
                            messages={chatMessages}
                            isLoading={isChatLoading}
                            onSendMessage={handleSendMessage}
                            onClose={() => setIsChatOpen(false)}
                        />
                    </div>
                </div>
            </>
        )}


        <footer className="text-center py-6 text-sm text-slate-500">
            Powered by Google Gemini.
        </footer>
    </div>
  );
}

export default App;
