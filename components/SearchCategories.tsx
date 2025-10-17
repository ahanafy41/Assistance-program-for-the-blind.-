import React from 'react';
import { SparklesIcon } from './icons';

interface SearchCategoriesProps {
  onCategorySelect: (category: string) => void;
}

const categories = [
  'أخبار مصر',
  'أحدث التكنولوجيا',
  'رياضة عالمية',
  'اقتصاد وبورصة'
];

export const SearchCategories: React.FC<SearchCategoriesProps> = ({ onCategorySelect }) => {
  return (
    <div className="w-full max-w-4xl mx-auto my-6 non-printable">
      <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400 mb-3 text-center">أو جرب البحث في هذه الفئات</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className="bg-slate-200/50 dark:bg-slate-800/50 border border-transparent hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full transition-all duration-200 ease-in-out flex items-center gap-2 group"
          >
            <SparklesIcon className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};
