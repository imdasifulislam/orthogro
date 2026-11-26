import React, { useState } from 'react';
import { Delete, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from '../i18n';
import { safeEvaluateExpression } from '../utils/format';

interface CalculatorViewProps {
  isReadOnly?: boolean;
  onLogTransaction?: (type: 'income' | 'expense', amount: number) => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  isReadOnly = false,
  onLogTransaction,
}) => {
  const { t } = useTranslation();
  const [expression, setExpression] = useState('');
  const [currentVal, setCurrentVal] = useState('0');
  const [isCalculated, setIsCalculated] = useState(false);

  const calculatedAmount = React.useMemo(() => {
    if (!isCalculated || currentVal === 'Error') return null;
    const parsed = Number(currentVal);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100) / 100;
  }, [isCalculated, currentVal]);

  const livePreview = React.useMemo(() => {
    if (isCalculated || !expression) return null;
    const candidate = `${expression}${currentVal}`;
    const evaluated = safeEvaluateExpression(candidate);
    return evaluated !== null ? evaluated.toString() : null;
  }, [expression, currentVal, isCalculated]);

  const handleNum = (num: string) => {
    if (isCalculated || currentVal === 'Error') {
      setCurrentVal(num);
      setExpression('');
      setIsCalculated(false);
      return;
    }
    setCurrentVal((prev) => (prev === '0' ? num : prev + num));
  };

  const handleDecimal = () => {
    if (isCalculated || currentVal === 'Error') {
      setCurrentVal('0.');
      setExpression('');
      setIsCalculated(false);
      return;
    }
    if (!currentVal.includes('.')) {
      setCurrentVal((prev) => `${prev}.`);
    }
  };

  const handleOperator = (op: '+' | '-' | '×' | '÷') => {
    if (currentVal === 'Error') {
      setCurrentVal('0');
      setExpression('');
      setIsCalculated(false);
      return;
    }

    if (isCalculated) {
      setExpression(`${currentVal} ${op} `);
      setCurrentVal('0');
      setIsCalculated(false);
      return;
    }

    // If user presses an operator right after another operator while currentVal is untouched '0'
    if (expression && currentVal === '0') {
      setExpression((prev) => prev.replace(/\s[+\-×÷]\s$/, ` ${op} `));
      return;
    }

    setExpression((prev) => `${prev}${currentVal} ${op} `);
    setCurrentVal('0');
  };

  const handleEquals = () => {
    if (isCalculated || currentVal === 'Error') return;
    if (!expression && currentVal === '0') return;
    const fullExpr = `${expression}${currentVal}`;
    const result = safeEvaluateExpression(fullExpr);

    if (result === null) {
      setCurrentVal('Error');
      setExpression(`${fullExpr} =`);
      setIsCalculated(true);
      return;
    }

    setCurrentVal(result.toString());
    setExpression(`${fullExpr} =`);
    setIsCalculated(true);
  };

  const handleClear = () => {
    setCurrentVal('0');
    setExpression('');
    setIsCalculated(false);
  };

  const handleDelete = () => {
    if (isCalculated || currentVal === 'Error') {
      handleClear();
      return;
    }
    setCurrentVal((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const handlePercent = () => {
    if (currentVal === 'Error') return;
    const val = Number(currentVal);
    if (!Number.isFinite(val)) return;
    if (isCalculated) {
      setExpression('');
      setIsCalculated(false);
    }
    setCurrentVal(Number((val / 100).toPrecision(12)).toString());
  };

  return (
    <div className="my-auto mx-auto flex w-full max-w-md flex-col justify-center pt-4 pb-2 sm:py-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Display */}
        <div className="flex min-h-[132px] flex-col justify-end border-b border-slate-200 bg-slate-50 px-5 py-4 text-right dark:border-slate-800 dark:bg-slate-950/60">
          <div className="font-mono-num min-h-[22px] break-all text-sm text-slate-500 dark:text-slate-400">
            {expression}
          </div>
          <div className="font-mono-num mt-1 break-all text-4xl font-bold tracking-tight text-[#102A43] dark:text-slate-100">
            {currentVal}
          </div>
          <div className="mt-2 flex min-h-[36px] items-center justify-end">
            {calculatedAmount !== null && !isReadOnly && onLogTransaction ? (
              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onLogTransaction('income', calculatedAmount)}
                  className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#16845B] shadow-xs transition-colors hover:border-emerald-300 hover:bg-emerald-100/80 active:scale-[0.97] whitespace-nowrap dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950"
                >
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span>{t.common.income}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLogTransaction('expense', calculatedAmount)}
                  className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#D94848] shadow-xs transition-colors hover:border-rose-300 hover:bg-rose-100/80 active:scale-[0.97] whitespace-nowrap dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950"
                >
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  <span>{t.common.expense}</span>
                </button>
              </div>
            ) : (
              <div className="font-mono-num text-xs font-medium text-[#16845B] dark:text-emerald-400">
                {livePreview !== null ? `= ${livePreview}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2.5 p-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-600 transition-transform active:scale-95 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Backspace"
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 transition-transform active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Delete className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handlePercent}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-lg font-bold text-[#16845B] transition-transform active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-bold text-[#16845B] transition-transform active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            ÷
          </button>

          {['7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNum(num)}
              className="font-mono-num flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-[#102A43] transition-transform active:scale-95 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-bold text-[#16845B] transition-transform active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            ×
          </button>

          {['4', '5', '6'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNum(num)}
              className="font-mono-num flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-[#102A43] transition-transform active:scale-95 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-bold text-[#16845B] transition-transform active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            -
          </button>

          {['1', '2', '3'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleNum(num)}
              className="font-mono-num flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-[#102A43] transition-transform active:scale-95 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xl font-bold text-[#16845B] transition-transform active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
          >
            +
          </button>

          <button
            type="button"
            onClick={() => handleNum('0')}
            className="font-mono-num col-span-2 flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-[#102A43] transition-transform active:scale-95 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="font-mono-num flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-[#102A43] transition-transform active:scale-95 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="flex min-h-[54px] items-center justify-center rounded-2xl bg-[#16845B] text-xl font-bold text-white shadow-sm transition-transform hover:bg-[#126B4A] active:scale-95"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};
