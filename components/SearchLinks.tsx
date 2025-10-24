import React from 'react';

interface SearchLinksProps {
    city: string;
}

const SearchLinks: React.FC<SearchLinksProps> = ({ city }) => {
    const searchCategories = [
        {
            label: '맛집',
            emoji: '🍴',
            queries: [
                `${city} 맛집`,
                `${city} 맛집 추천`,
                `${city} 로컬 맛집`
            ]
        },
        {
            label: '카페',
            emoji: '☕',
            queries: [
                `${city} 카페`,
                `${city} 예쁜 카페`,
                `${city} 분위기 좋은 카페`
            ]
        },
        {
            label: '관광지',
            emoji: '🏛️' ,
            queries: [
                `${city} 관광지`,
                `${city} 가볼만한 곳`,
                `${city} 여행 코스`
            ]
        },
        {
            label: '쇼핑',
            emoji: '🛍️' ,
            queries: [
                `${city} 쇼핑`,
                `${city} 쇼핑 명소`,
                `${city} 기념품`
            ]
        },
        {
            label: '숙소',
            emoji: '🏨',
            queries: [
                `${city} 호텔 추천`,
                `${city} 숙소`,
                `${city} 가성비 숙소`
            ]
        }
    ];

    const generateNaverBlogUrl = (query: string) => {
        return `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(query)}`;     
    };

    const generateNaverPlaceUrl = (query: string) => {
        return `https://map.naver.com/v5/search/${encodeURIComponent(query)}`;
    };

    return (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <span className="mr-2">🔍</span>
                네이버에서 더 알아보기
            </h3>
            <p className="text-sm text-slate-600 mb-4">
                실시간 블로그 후기와 최신 정보를 확인해보세요
            </p>

            <div className="space-y-4">
                {searchCategories.map((category, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                            <span className="text-2xl mr-2">{category.emoji}</span>
                            {category.label}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {category.queries.map((query, qIdx) => (
                                <React.Fragment key={qIdx}>
                                    <a
                                        href={generateNaverBlogUrl(query)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 text-sm rounded-full transition-colors"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                                        </svg>
                                        블로그: {query.replace(`${city} `, '')}
                                    </a>
                                    {qIdx === 0 && (
                                        <a
                                            href={generateNaverPlaceUrl(query)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm rounded-full transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                            </svg>
                                            지도
                                        </a>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SearchLinks;