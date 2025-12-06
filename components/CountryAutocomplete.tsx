import React, { useState, useEffect, useRef } from 'react';
import { COUNTRIES } from '../constants';

interface CountryAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  label,
  value,
  onChange,
  required = false,
  placeholder = "Select a country"
}) => {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Filter logic
  useEffect(() => {
    const lowerQuery = query.toLowerCase();
    const matches = COUNTRIES.filter(c => c.toLowerCase().includes(lowerQuery));
    
    // Sort logic: "Starts with" query comes first, then alphabetical
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.toLowerCase().startsWith(lowerQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    });
    
    setFiltered(matches);
    setActiveIndex(-1); // Reset active index on query change
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current && activeIndex >= 0) {
      const list = listRef.current;
      const element = list.children[activeIndex] as HTMLElement;
      if (element) {
        const { offsetTop, offsetHeight } = element;
        const { scrollTop, clientHeight } = list;
        
        if (offsetTop < scrollTop) {
          list.scrollTop = offsetTop;
        } else if (offsetTop + offsetHeight > scrollTop + clientHeight) {
          list.scrollTop = offsetTop + offsetHeight - clientHeight;
        }
      }
    }
  }, [activeIndex, isOpen]);

  const handleBlur = () => {
    // Timeout allows click events on dropdown items to process first
    setTimeout(() => {
        // If isOpen is false (e.g. closed by Enter or Escape), we skip the auto-snap
        if (!isOpen) return;

        setIsOpen(false);
        if (!query.trim()) {
            onChange("");
            return;
        }

        // 1. Exact match check
        const exact = COUNTRIES.find(c => c.toLowerCase() === query.toLowerCase());
        if (exact) {
            onChange(exact);
            return;
        }

        // 2. Intelligent Snap: Use the first filtered suggestion if available
        if (filtered.length > 0) {
            const snapped = filtered[0];
            onChange(snapped);
            setQuery(snapped);
        } else {
            // 3. No match, clear
            onChange("");
            setQuery("");
        }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filtered.length - 1);
      } else {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter') {
      // If valid selection highlighted, select it
      if (isOpen && activeIndex >= 0 && activeIndex < filtered.length) {
         e.preventDefault();
         const selected = filtered[activeIndex];
         onChange(selected);
         setQuery(selected);
         setIsOpen(false);
      } else if (isOpen && filtered.length > 0) {
         // Fallback: Select top option if menu is open but nothing highlighted
         e.preventDefault();
         const selected = filtered[0];
         onChange(selected);
         setQuery(selected);
         setIsOpen(false);
      }
      // If menu closed, standard behavior (form submit etc)
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
       <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        <input
            type="text"
            required={required}
            className="w-full rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:bg-slate-900 focus:text-white focus:ring-indigo-500 focus:border-indigo-500 p-2 border transition-colors"
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
        />
        
        {isOpen && filtered.length > 0 && (
            <ul 
                ref={listRef}
                className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
            >
                {filtered.map((country, idx) => (
                    <li
                        key={country}
                        className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                           idx === activeIndex 
                             ? 'bg-indigo-600 text-white' 
                             : 'text-slate-900 hover:bg-indigo-600 hover:text-white'
                        }`}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur so click registers
                            onChange(country);
                            setQuery(country);
                            setIsOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                    >
                        <span className="block truncate">{country}</span>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
};

export default CountryAutocomplete;