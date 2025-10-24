// Fix: Create ResultsDisplay.tsx to render the generated travel plan.
import React, { useState, useRef, useEffect } from 'react';
import { TravelPlan, DailyPlan, PackingList, Activity } from '../types';
import { ActivityIcon, PackingIcon, MapPinIcon, ExternalLinkIcon, PdfDownloadIcon, TransportPriceIcon, PriceIcon } from './IconComponents';
import { generatePackingList } from '../services/geminiService';
import { downloadPlanAsPdf } from '../services/pdfGenerator';


interface ResultsDisplayProps {
    plan: TravelPlan;
    isLoading: boolean;
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode, icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center text-center h-full">
        <div className="text-3xl mb-2">{icon}</div>
        <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
        <div className="text-slate-600 text-sm">{children}</div>
    </div>
);

const DailyPlanCard: React.FC<{ dayPlan: DailyPlan; onActivityClick: (activity: Activity) => void; }> = ({ dayPlan, onActivityClick }) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-indigo-100 p-4">
            <h4 className="text-xl font-bold text-indigo-800">Day {dayPlan.day}</h4>
            <p className="text-indigo-600 font-semibold">{dayPlan.title}</p>
        </div>
        <ul className="divide-y divide-slate-200">
            {(Array.isArray(dayPlan.activities) ? dayPlan.activities : []).map((activity, index) => {
                const hasCoordinates = activity.latitude && activity.longitude;
                return (
                    <li key={index} className="p-4 flex flex-col transition-colors hover:bg-slate-50">
                        <div
                            className={`flex items-start space-x-4 ${hasCoordinates ? 'cursor-pointer' : ''}`}
                            onClick={() => hasCoordinates && onActivityClick(activity)}
                            role={hasCoordinates ? 'button' : 'listitem'}
                            aria-label={hasCoordinates ? `지도에서 ${activity.description} 보기` : activity.description}
                        >
                            <div className="flex-shrink-0 pt-1 text-indigo-500">
                                <ActivityIcon icon={activity.icon} className="w-6 h-6" />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800">{activity.time}</p>
                                <p className="text-slate-600">{activity.description}</p>
                            </div>
                            {hasCoordinates && (
                                <div className="flex-shrink-0 pt-1 text-indigo-500">
                                    <MapPinIcon className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        {(activity.tripAdvisorUrl || activity.klookUrl || activity.bookingUrl) && (
                            <div className="pt-3 pl-10 flex flex-wrap gap-x-4 gap-y-2">
                                {activity.tripAdvisorUrl && (
                                    <a
                                        href={activity.tripAdvisorUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm font-semibold text-green-600 hover:text-green-800 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        TripAdvisor에서 보기
                                        <ExternalLinkIcon className="w-4 h-4 ml-1" />
                                    </a>
                                )}
                                {activity.klookUrl && (
                                    <a
                                        href={activity.klookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm font-semibold text-amber-600 hover:text-amber-800 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Klook에서 예약하기
                                        <ExternalLinkIcon className="w-4 h-4 ml-1" />
                                    </a>
                                )}
                                {activity.bookingUrl && (
                                    <a
                                        href={activity.bookingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Booking.com에서 예약
                                        <ExternalLinkIcon className="w-4 h-4 ml-1" />
                                    </a>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    </div>
);


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ plan, isLoading }) => {
    const [packingList, setPackingList] = useState<PackingList | null>(null);
    const [isPackingListLoading, setIsPackingListLoading] = useState(false);
    const [packingListError, setPackingListError] = useState<string | null>(null);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);

    const getMapUrl = (lat: number, lon: number) => `https://www.google.com/maps?q=${lat},${lon}&output=embed&z=13`;
    
    const [currentMapUrl, setCurrentMapUrl] = useState('');
    const mapSectionRef = useRef<HTMLElement>(null);
    
    useEffect(() => {
        // When the plan's location is available, set the initial map URL to the city center.
        // This also resets the map if a new plan for a different city is loaded.
        if (plan.cityLatitude && plan.cityLongitude) {
            setCurrentMapUrl(getMapUrl(plan.cityLatitude, plan.cityLongitude));
        }
    }, [plan.cityLatitude, plan.cityLongitude]);


    const totalDays = plan.startDate && plan.endDate
        ? Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / (1000 * 3600 * 24)) + 1
        : 0;


    const handleActivityMapClick = (activity: Activity) => {
        if (activity.latitude && activity.longitude) {
            const newUrl = getMapUrl(activity.latitude, activity.longitude);
            setCurrentMapUrl(newUrl);
            mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };


    const handleGeneratePackingList = async () => {
        setIsPackingListLoading(true);
        setPackingListError(null);
        setPackingList(null);

        try {
            const list = await generatePackingList(plan);
            setPackingList(list);
        } catch (err: any) {
            setPackingListError(err.message || '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsPackingListLoading(false);
        }
    };
    
    const handleDownloadPdf = async () => {
        setIsPdfLoading(true);
        setPdfError(null);
        try {
            // Give the UI a moment to update to the loading state
            await new Promise(resolve => setTimeout(resolve, 50)); 
            await downloadPlanAsPdf(plan, packingList);
        } catch (err: any) {
            console.error("PDF 생성에 실패했습니다.", err);
            setPdfError(err.message || "PDF 생성 중 알 수 없는 오류가 발생했습니다.");
        } finally {
            setIsPdfLoading(false);
        }
    };

    return (
        <div className="mt-8 animate-fade-in w-full max-w-4xl mx-auto">
            <div id="travel-plan-content">
                <header className="mb-8 text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{plan.city || '...'}, {plan.country || '...'} 여행 계획</h2>
                    <p className="text-lg text-slate-500 mt-2">{plan.startDate} ~ {plan.endDate}</p>
                </header>

                 <div className="text-center mb-8">
                    <button
                        id="pdf-download-button"
                        onClick={handleDownloadPdf}
                        disabled={isPdfLoading || isLoading}
                        className="bg-gray-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-800 disabled:bg-slate-400 transition-all duration-300 flex items-center justify-center text-base mx-auto"
                    >
                        {isPdfLoading ? (
                             <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>PDF 생성 중...</span>
                            </>
                        ) : (
                             <>
                                <PdfDownloadIcon className="w-5 h-5 mr-2" />
                                <span>PDF로 다운로드</span>
                            </>
                        )}
                    </button>
                    {pdfError && (
                        <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">
                            <p className="font-bold">PDF 생성 오류:</p>
                            <p>{pdfError}</p>
                        </div>
                    )}
                </div>

                { plan.weather && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        <InfoCard title="예상 날씨" icon="🌦️">
                            <p>{plan.weather.averageTemp}</p>
                            <p>{plan.weather.description}</p>
                        </InfoCard>
                        <InfoCard title="환율 정보" icon="💹">
                            <p>{plan.exchangeRate?.rate}</p>
                            <p className="text-sm">({plan.exchangeRate?.from} to {plan.exchangeRate?.to})</p>
                        </InfoCard>
                        <InfoCard title="문화 팁" icon="💡">
                            <ul className="list-none text-left space-y-1">
                                {(Array.isArray(plan.culturalTips) ? plan.culturalTips : []).slice(0, 3).map((tip, index) => <li key={index}>- {tip}</li>)}
                            </ul>
                        </InfoCard>
                        <InfoCard title="교통 정보" icon={<TransportPriceIcon className="w-8 h-8"/>}>
                            <p className="font-semibold">{plan.transportationInfo?.description}</p>
                            <ul className="list-none mt-2 space-y-1">
                                {(Array.isArray(plan.transportationInfo?.options) ? plan.transportationInfo.options : []).map((opt, index) => <li key={index}>- {opt}</li>)}
                            </ul>
                        </InfoCard>
                        <InfoCard title="현지 물가" icon={<PriceIcon className="w-8 h-8"/>}>
                            <p className="font-semibold">{plan.priceInfo?.level}: {plan.priceInfo?.description}</p>
                            <ul className="list-none mt-2 space-y-1">
                                {(Array.isArray(plan.priceInfo?.examples) ? plan.priceInfo.examples : []).map((ex, index) => <li key={index}>- {ex}</li>)}
                            </ul>
                        </InfoCard>
                    </section>
                )}
                
                {currentMapUrl && (
                    <section ref={mapSectionRef} className="mb-10 scroll-mt-8">
                         <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">도시 지도</h3>
                         <div className="rounded-xl shadow-lg overflow-hidden">
                            <iframe
                                src={currentMapUrl}
                                key={currentMapUrl}
                                className="w-full h-96 md:h-[450px]"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title={`Map of ${plan.city}`}
                            ></iframe>
                         </div>
                    </section>
                )}

                <section>
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">상세 일정</h3>
                    <div className="space-y-6">
                        {(Array.isArray(plan.itinerary) ? plan.itinerary : []).map(dayPlan => (
                            <DailyPlanCard key={dayPlan.day} dayPlan={dayPlan} onActivityClick={handleActivityMapClick}/>
                        ))}
                    </div>

                    {isLoading && (!plan.itinerary || plan.itinerary.length < totalDays) && (
                         <div className="mt-6 text-center text-slate-500 flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Day {(plan.itinerary?.length || 0) + 1} / {totalDays} 일정 생성 중...</span>
                        </div>
                    )}

                </section>

                <section className="mt-12">
                    <div className="text-center">
                        {!packingList && (
                            <button
                                onClick={handleGeneratePackingList}
                                disabled={isPackingListLoading || isLoading}
                                className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-slate-400 transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center text-lg mx-auto"
                            >
                                {isPackingListLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>리스트 생성 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <PackingIcon className="w-6 h-6 mr-2" />
                                        <span>AI 준비물 리스트 만들기</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {packingListError && (
                        <div className="mt-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-center" role="alert">
                            <p className="font-bold">오류 발생:</p>
                            <p>{packingListError}</p>
                        </div>
                    )}

                    {packingList && (
                        <div className="mt-6 animate-fade-in">
                            <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                                <PackingIcon className="w-8 h-8 inline-block mr-2 align-middle text-purple-600" />
                                나만의 준비물 리스트
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {packingList.packing_list.map((category, index) => (
                                    <div key={index} className="bg-white rounded-xl shadow-md p-5">
                                        <h4 className="text-lg font-bold text-purple-800 border-b-2 border-purple-100 pb-2 mb-3">{category.category}</h4>
                                        <ul className="space-y-2">
                                            {category.items.map((item, itemIndex) => (
                                                <li key={itemIndex} className="flex items-start text-slate-700">
                                                    <svg className="w-4 h-4 mr-3 mt-1 flex-shrink-0 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                                                    </svg>
                                                    <div>
                                                        <span className="font-semibold">{item.item}</span>
                                                        {item.note && <span className="text-sm text-slate-500 ml-2">({item.note})</span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ResultsDisplay;