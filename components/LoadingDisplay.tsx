import React from 'react';

const LoadingDisplay: React.FC = () => {
  return (
    <div className="text-center py-20 animate-fade-in">
      <svg className="mx-auto h-12 w-12 text-indigo-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <h2 className="mt-6 text-2xl font-bold text-slate-800">여행 계획을 만들고 있습니다...</h2>
      <p className="mt-2 text-slate-500">AI가 당신만을 위한 완벽한 플랜을 짜고 있어요. 잠시만 기다려주세요!</p>
    </div>
  );
};

export default LoadingDisplay;