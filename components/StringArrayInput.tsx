
import React, { useState, useEffect } from 'react';
import { Plus, X, List } from 'lucide-react';
import { useLanguage } from '../i18n';

interface StringArrayInputProps {
  value: string | number | boolean | object;
  onChange: (value: string) => void;
}

const StringArrayInput: React.FC<StringArrayInputProps> = ({ value, onChange }) => {
  const { t } = useLanguage();
  
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // Fallback to single item
      }
      return [value];
    }
    return [''];
  });

  useEffect(() => {
    // Determine how to save back to the param value
    // We always save as a JSON string to ensure RequestPanel can parse it back as an array
    const cleanItems = items;
    // If empty, save as empty array string
    onChange(JSON.stringify(cleanItems));
  }, [items, onChange]);

  const handleChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index] = val;
    setItems(newItems);
  };

  const handleAdd = () => {
    setItems([...items, '']);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems.push(''); // Keep at least one input
    setItems(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
            <div className="relative flex-1">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                    <List size={12} />
                </div>
                <input
                    type="text"
                    value={item}
                    onChange={(e) => handleChange(index, e.target.value)}
                    className="w-full text-sm text-slate-800 border border-gray-200 rounded p-1.5 pl-7 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
                    placeholder={`Item ${index + 1}`}
                />
            </div>
            {(items.length > 1) && (
                <button
                    onClick={() => handleRemove(index)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
      >
        <Plus size={12} /> {t.common.add}
      </button>
    </div>
  );
};

export default StringArrayInput;
