import React from 'react';
import type { SearchFilters, SummaryLength } from '../types';
import { XCircleIcon } from './icons';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  onClose: () => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ filters, setFilters, onClose }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['minSources'].includes(name);
    setFilters(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg relative non-printable">
      <button onClick={onClose} className="absolute top-3 left-3 text-slate-400 hover:text-slate-200" title="إغلاق الفلاتر">
        <XCircleIcon className="h-6 w-6" />
      </button>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">فلاتر البحث المتقدم</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exact Phrase */}
        <div className="flex flex-col">
          <label htmlFor="exactPhrase" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">عبارة دقيقة</label>
          <input
            type="text"
            id="exactPhrase"
            name="exactPhrase"
            value={filters.exactPhrase}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
            placeholder="مثال: رؤية مصر 2030"
          />
        </div>
        {/* Exclude Word */}
        <div className="flex flex-col">
          <label htmlFor="excludeWord" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">استبعاد كلمة</label>
          <input
            type="text"
            id="excludeWord"
            name="excludeWord"
            value={filters.excludeWord}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
            placeholder="مثال: رياضة"
          />
        </div>
        {/* Site Search */}
        <div className="flex flex-col">
          <label htmlFor="siteSearch" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">البحث في موقع</label>
          <input
            type="text"
            id="siteSearch"
            name="siteSearch"
            value={filters.siteSearch}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
            placeholder="مثال: wikipedia.org"
          />
        </div>
        {/* Source Type */}
        <div className="flex flex-col">
          <label htmlFor="sourceType" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">نوع المصدر</label>
          <select
            id="sourceType"
            name="sourceType"
            value={filters.sourceType}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="any">أي نوع</option>
            <option value="news">مواقع إخبارية</option>
            <option value="academic">أبحاث علمية</option>
            <option value="government">مواقع حكومية</option>
          </select>
        </div>
        {/* Location */}
        <div className="flex flex-col">
          <label htmlFor="location" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">الموقع الجغرافي</label>
          <input
            type="text"
            id="location"
            name="location"
            value={filters.location}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
            placeholder="مثال: القاهرة"
          />
        </div>
        {/* Time Range */}
        <div className="flex flex-col">
          <label htmlFor="timeRange" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">النطاق الزمني</label>
          <select
            id="timeRange"
            name="timeRange"
            value={filters.timeRange}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="">أي وقت</option>
            <option value="day">آخر 24 ساعة</option>
            <option value="week">آخر أسبوع</option>
            <option value="month">آخر شهر</option>
          </select>
        </div>
        {/* Summary Length */}
        <div className="flex flex-col">
          <label htmlFor="summaryLength" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">طول الملخص</label>
          <select
            id="summaryLength"
            name="summaryLength"
            value={filters.summaryLength}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="brief">موجز</option>
            <option value="normal">عادي</option>
            <option value="detailed">مفصل</option>
          </select>
        </div>
        {/* Result Language */}
        <div className="flex flex-col">
          <label htmlFor="resultLanguage" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">لغة النتيجة</label>
          <select
            id="resultLanguage"
            name="resultLanguage"
            value={filters.resultLanguage}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
        {/* Min Sources */}
        <div className="flex flex-col">
          <label htmlFor="minSources" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">الحد الأدنى للمصادر</label>
          <select
            id="minSources"
            name="minSources"
            value={filters.minSources}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="0">أي عدد</option>
            <option value="3">3 مصادر على الأقل</option>
            <option value="5">5 مصادر على الأقل</option>
            <option value="10">10 مصادر على الأقل</option>
          </select>
        </div>
        {/* Result Tone */}
        <div className="flex flex-col">
          <label htmlFor="resultTone" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">نبرة الإجابة</label>
          <select
            id="resultTone"
            name="resultTone"
            value={filters.resultTone}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="">تلقائي</option>
            <option value="professional">احترافية</option>
            <option value="casual">ودودة</option>
            <option value="academic">أكاديمية</option>
            <option value="simple">بسيطة</option>
          </select>
        </div>
         {/* Result Format */}
        <div className="flex flex-col">
          <label htmlFor="resultFormat" className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">تنسيق النتيجة</label>
          <select
            id="resultFormat"
            name="resultFormat"
            value={filters.resultFormat}
            onChange={handleChange}
            className="p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
          >
            <option value="paragraphs">فقرات نصية</option>
            <option value="bullets">نقاط موجزة</option>
            <option value="table">جدول مقارنة</option>
          </select>
        </div>
      </div>
    </div>
  );
};