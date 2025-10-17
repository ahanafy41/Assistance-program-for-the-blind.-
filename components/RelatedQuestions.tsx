import React from 'react';
import { SparklesIcon } from './icons';

interface RelatedQuestionsProps {
    questions: string[];
    onQuestionClick: (question: string) => void;
}

export const RelatedQuestions: React.FC<RelatedQuestionsProps> = ({ questions, onQuestionClick }) => {
    if (questions.length === 0) {
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto my-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg non-printable">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
                أسئلة مشابهة
            </h3>
            <div className="flex flex-col items-start gap-2">
                {questions.map((q, index) => (
                    <button
                        key={index}
                        onClick={() => onQuestionClick(q)}
                        className="text-right text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );
};
