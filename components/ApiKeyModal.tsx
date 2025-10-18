import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  initialKey?: string;
  isDismissible: boolean;
  onClose?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave, initialKey = '', isDismissible, onClose }) => {
  const [apiKey, setApiKey] = useState(initialKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
        <div className="flex items-center gap-3 mb-4">
            <KeyIcon className="h-6 w-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-slate-100">إعداد مفتاح Gemini API</h2>
        </div>
        
        <p className="text-slate-400 mb-4 text-sm">
            لأغراض التجربة، يمكنك إدخال مفتاح API الخاص بك هنا. سيتم تخزينه بشكل دائم في متصفحك. يمكنك مسحه في أي وقت من إعدادات المتصفح.
        </p>

        <form onSubmit={handleSave}>
          <label htmlFor="apiKeyInput" className="block text-sm font-medium text-slate-300 mb-2">
            مفتاح API الخاص بك
          </label>
          <input
            id="apiKeyInput"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="أدخل مفتاحك هنا"
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autoFocus
          />
          
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 text-xs rounded-lg">
            <strong>تحذير أمان:</strong> لا تستخدم هذه الميزة في بيئة إنتاجية أو تشارك مفتاحك مع أي شخص. الطريقة الموصى بها هي استخدام متغيرات البيئة على الخادم.
          </div>

          <div className="mt-6 flex justify-end gap-3">
              {isDismissible && (
                 <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors"
                >
                    إلغاء
                </button>
              )}
               <button 
                type="submit" 
                disabled={!apiKey.trim()}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                حفظ واستخدام المفتاح
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};