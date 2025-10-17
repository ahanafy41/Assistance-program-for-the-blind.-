import React from 'react';
import type { Insights, Entity, FactCheckResult, FactCheckClaim } from '../types';
import { SparklesIcon, TagIcon, BeakerIcon, UsersIcon, DocumentTextIcon, LocationMarkerIcon, OfficeBuildingIcon, TrendingUpIcon, ShieldCheckIcon, QuoteIcon, XCircleIcon } from './icons';

interface InsightsPanelProps {
  insights: Insights | null;
  isAnalyzing: boolean;
  onKeywordClick: (keyword: string) => void;
  factCheckData: FactCheckResult | null;
  isFactChecking: boolean;
  onFactCheck: () => void;
  isSearchComplete: boolean;
}

const sentimentStyles: { [key: string]: string } = {
  Positive: 'bg-green-500/20 text-green-400 dark:text-green-300 border-green-500/30',
  Neutral: 'bg-sky-500/20 text-sky-500 dark:text-sky-300 border-sky-500/30',
  Negative: 'bg-red-500/20 text-red-400 dark:text-red-300 border-red-500/30',
  Mixed: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-300 border-yellow-500/30',
};

const sentimentArabic: { [key: string]: string } = {
  Positive: 'إيجابي',
  Neutral: 'محايد',
  Negative: 'سلبي',
  Mixed: 'مختلط',
};

const trendinessStyles: { [key: string]: string } = {
  Trending: 'bg-teal-500/20 text-teal-400 dark:text-teal-300 border-teal-500/30',
  Stable: 'bg-blue-500/20 text-blue-400 dark:text-blue-300 border-blue-500/30',
  Niche: 'bg-purple-500/20 text-purple-400 dark:text-purple-300 border-purple-500/30',
  Unspecified: 'bg-slate-500/20 text-slate-400 dark:text-slate-300 border-slate-500/30',
};

const trendinessArabic: { [key: string]: string } = {
  Trending: 'رائج',
  Stable: 'مستقر',
  Niche: 'متخصص',
  Unspecified: 'غير محدد',
};

const entityIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    Person: UsersIcon,
    Organization: OfficeBuildingIcon,
    Location: LocationMarkerIcon,
    Other: TagIcon,
};

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="flex flex-wrap gap-2">
                <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-full w-20"></div>
                <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded-full w-24"></div>
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-12 bg-slate-300 dark:bg-slate-700 rounded-lg w-full"></div>
        </div>
    </div>
);

const InsightSection: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, extraClasses?: string }> = ({ title, icon, children, extraClasses = '' }) => (
    <div className={extraClasses}>
        <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
            {icon}
            {title}
        </h3>
        {children}
    </div>
);

const FactCheckDisplay: React.FC<{ data: FactCheckResult }> = ({ data }) => {
    const confidenceStyles: { [key: string]: string } = {
        High: 'bg-green-500/20 text-green-400 dark:text-green-300 border-green-500/30',
        Medium: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-300 border-yellow-500/30',
        Conflicting: 'bg-red-500/20 text-red-400 dark:text-red-300 border-red-500/30',
    };
    const confidenceArabic: { [key: string]: string } = {
        High: 'ثقة عالية',
        Medium: 'ثقة متوسطة',
        Conflicting: 'معلومات متضاربة',
    };
    const claimStatusStyles: { [key: string]: { icon: React.FC<any>, color: string, text: string } } = {
        'Well-supported': { icon: ShieldCheckIcon, color: 'text-green-400', text: 'مدعوم جيدًا' },
        'Single source': { icon: BeakerIcon, color: 'text-yellow-400', text: 'مصدر واحد' },
        'Conflicting': { icon: XCircleIcon, color: 'text-red-400', text: 'متضارب' },
    };

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">التقييم العام</h4>
                <div className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${confidenceStyles[data.overallConfidence]}`}>
                    {confidenceArabic[data.overallConfidence]}
                </div>
            </div>
            {data.claims.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">الادعاءات الرئيسية</h4>
                    <ul className="space-y-3">
                        {data.claims.map((item, index) => {
                            const StatusIcon = claimStatusStyles[item.status].icon;
                            const statusColor = claimStatusStyles[item.status].color;
                            const statusText = claimStatusStyles[item.status].text;
                            return (
                                <li key={index} className="flex items-start gap-3">
                                    <QuoteIcon className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                                    <div className="flex-grow">
                                        <p className="text-slate-700 dark:text-slate-200">{item.claim}</p>
                                        <div className={`flex items-center gap-1.5 text-xs font-semibold mt-1 ${statusColor}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            <span>{statusText}</span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};


export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, isAnalyzing, onKeywordClick, factCheckData, isFactChecking, onFactCheck, isSearchComplete }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-lg h-full non-printable">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">تحليلات</h2>
      </div>

      <div className="space-y-6">
          {isAnalyzing && !insights ? <LoadingSkeleton /> : (
            <>
                {!insights && !isAnalyzing && (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                        <BeakerIcon className="h-12 w-12 mx-auto mb-2" />
                        <p>سيظهر التحليل هنا بعد اكتمال البحث.</p>
                    </div>
                )}
                {insights && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <InsightSection title="الشعور العام" icon={<SparklesIcon className="h-5 w-5" />}>
                            <div title={`Sentiment: ${insights.sentiment}`} className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${sentimentStyles[insights.sentiment] || sentimentStyles['Neutral']}`}>
                                {sentimentArabic[insights.sentiment] || insights.sentiment}
                            </div>
                        </InsightSection>
                        
                        <InsightSection title="رواج الموضوع" icon={<TrendingUpIcon className="h-5 w-5" />}>
                            <div title={`Trendiness: ${insights.trendiness}`} className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${trendinessStyles[insights.trendiness] || trendinessStyles['Unspecified']}`}>
                                {trendinessArabic[insights.trendiness] || insights.trendiness}
                            </div>
                        </InsightSection>
                    </div>

                    <InsightSection title="الكلمات المفتاحية (انقر للبحث)" icon={<TagIcon className="h-5 w-5" />}>
                        <div className="flex flex-wrap gap-2">
                        {insights.keywords.map((keyword, index) => (
                            <button 
                                key={index} 
                                onClick={() => onKeywordClick(keyword)}
                                className="bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
                            >
                               {keyword}
                            </button>
                        ))}
                        </div>
                    </InsightSection>
                    
                    {insights.entities.length > 0 && (
                         <InsightSection title="الكيانات المذكورة" icon={<UsersIcon className="h-5 w-5" />}>
                            <div className="flex flex-wrap gap-2">
                                {insights.entities.map((entity, index) => {
                                    const Icon = entityIcons[entity.type] || entityIcons['Other'];
                                    return (
                                        <div key={index} title={`Entity: ${entity.type}`} className="flex items-center bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm">
                                           <Icon className="h-4 w-4 ml-1.5 text-slate-500" />
                                           {entity.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </InsightSection>
                    )}

                    {insights.summaryPoints.length > 0 && (
                        <InsightSection title="نقاط رئيسية" icon={<DocumentTextIcon className="h-5 w-5" />}>
                            <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">
                                {insights.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                        </InsightSection>
                    )}
                </>
                )}
            </>
          )}

            <InsightSection 
                title="تدقيق الحقائق" 
                icon={<ShieldCheckIcon className="h-5 w-5" />}
                extraClasses="pt-6 border-t border-slate-200 dark:border-slate-700"
            >
                {!isSearchComplete && !factCheckData ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">أكمل البحث أولاً لتفعيل هذه الميزة.</p>
                ) : isFactChecking ? (
                     <div className="space-y-3 animate-pulse">
                        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-full"></div>
                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-5/6"></div>
                    </div>
                ) : factCheckData ? (
                    <FactCheckDisplay data={factCheckData} />
                ) : (
                    <button
                        onClick={onFactCheck}
                        disabled={!isSearchComplete || isFactChecking}
                        className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ShieldCheckIcon className="h-5 w-5" />
                        تحليل مصداقية الإجابة
                    </button>
                )}
            </InsightSection>
      </div>
    </div>
  );
};