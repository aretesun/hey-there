import React, { useState, useEffect } from 'react';

interface TripInputProps {
    onPlanRequest: (city: string, startDate: string, endDate: string, travelStyles: string[], budget: string) => void;
    isLoading: boolean;
    error: string | null;
}

const travelStylesOptions = [
    '모험', '휴양', '문화/예술', '맛집 탐방', '쇼핑', '자연/풍경'
];

const budgetOptions = ['알뜰', '보통', '럭셔리'];

const TripInput: React.FC<TripInputProps> = ({ onPlanRequest, isLoading, error }) => {
    const today = new Date().toISOString().split('T')[0];
    const [city, setCity] = useState('');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState('');
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [budget, setBudget] = useState('보통');
    const [formError, setFormError] = useState<string | null>(null);
    const [maxEndDate, setMaxEndDate] = useState('');

    // Set and update the max end date based on the start date
    useEffect(() => {
        if (startDate) {
            const start = new Date(startDate);
            start.setDate(start.getDate() + 14); // A 15-day trip is start date + 14 days
            const newMaxEndDate = start.toISOString().split('T')[0];
            setMaxEndDate(newMaxEndDate);

            // If the current endDate is now beyond the new max, clamp it
            if (endDate && new Date(endDate) > start) {
                setEndDate(newMaxEndDate);
            }
        }
    }, [startDate]);


    const handleStyleChange = (style: string) => {
        setSelectedStyles(prev =>
            prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
        );
    };
    
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        // If endDate is before the new start date, reset it to the new start date
        if (endDate && new Date(endDate) < new Date(newStartDate)) {
            setEndDate(newStartDate);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!city || !startDate || !endDate) {
            setFormError('모든 필수 항목을 입력해주세요.');
            return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            setFormError('종료일은 시작일보다 이후여야 합니다.');
            return;
        }

        // The 15-day limit is now enforced by the date picker's 'max' attribute,
        // so the explicit check here is removed for a better UX.

        onPlanRequest(city, startDate, endDate, selectedStyles, budget);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">AI 여행 플래너</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                        어디로 떠나시나요?
                    </label>
                    <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="예: 파리, 프랑스"
                        className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">
                            여행 시작일
                        </label>
                        <input
                            type="date"
                            id="start-date"
                            value={startDate}
                            min={today}
                            onChange={handleStartDateChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">
                            여행 종료일
                        </label>
                        <input
                            type="date"
                            id="end-date"
                            value={endDate}
                            min={startDate}
                            max={maxEndDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        여행 스타일 (선택)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {travelStylesOptions.map(style => (
                            <button
                                key={style}
                                type="button"
                                onClick={() => handleStyleChange(style)}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                    selectedStyles.includes(style)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        예산
                    </label>
                    <div className="flex justify-center space-x-2 bg-slate-100 p-1 rounded-lg">
                        {budgetOptions.map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setBudget(option)}
                                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                    budget === option
                                        ? 'bg-white text-indigo-700 shadow'
                                        : 'text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {formError && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">
                        <p>{formError}</p>
                    </div>
                )}
                 {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">
                        <p className="font-bold">오류 발생:</p>
                        <p>{error}</p>
                    </div>
                )}


                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-all duration-300 flex items-center justify-center text-lg"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>여행 계획 생성 중...</span>
                        </>
                    ) : (
                        '나만의 여행 계획 만들기'
                    )}
                </button>
            </form>
        </div>
    );
};

export default TripInput;