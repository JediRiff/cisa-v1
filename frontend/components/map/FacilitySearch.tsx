'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS, EnergySector } from './types';

interface FacilityFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    id?: string;
    name: string;
    state?: string;
    county?: string;
    sector?: string;
    operator?: string;
    capacityMW?: number;
    capacity_mw?: number;
  };
}

interface SearchResult {
  name: string;
  state: string;
  county: string;
  sector: string;
  operator: string;
  capacityMW: number;
  coordinates: [number, number];
  properties: Record<string, unknown>;
}

interface FacilitySearchProps {
  onSelect: (result: SearchResult) => void;
}

export default function FacilitySearch({ onSelect }: FacilitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [features, setFeatures] = useState<FacilityFeature[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load power-plants.geojson once
  useEffect(() => {
    fetch('/data/power-plants.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.features) {
          setFeatures(data.features);
        }
      })
      .catch(() => {});
  }, []);

  // Search logic — debounced
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const q = query.toLowerCase().trim();
      const terms = q.split(/\s+/);
      const matched: SearchResult[] = [];

      for (const f of features) {
        if (matched.length >= 8) break;
        const p = f.properties;
        const name = (p.name || '').toLowerCase();
        const operator = (p.operator || '').toLowerCase();
        const state = (p.state || '').toLowerCase();
        const county = (p.county || '').toLowerCase();
        const sector = (p.sector || '').toLowerCase();

        const searchable = `${name} ${operator} ${state} ${county} ${sector}`;
        const matches = terms.every((t) => searchable.includes(t));

        if (matches) {
          matched.push({
            name: p.name || 'Unknown',
            state: p.state || '',
            county: p.county || '',
            sector: p.sector || 'other',
            operator: p.operator || '',
            capacityMW: Number(p.capacityMW ?? p.capacity_mw) || 0,
            coordinates: f.geometry.coordinates,
            properties: p as Record<string, unknown>,
          });
        }
      }

      setResults(matched);
      setSelectedIndex(-1);
      setIsOpen(matched.length > 0);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, features]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      setQuery(result.name);
      setIsOpen(false);
    },
    [onSelect],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function formatCapacity(mw: number): string {
    if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
    if (mw > 0) return `${Math.round(mw)} MW`;
    return '';
  }

  return (
    <div ref={containerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[340px] sm:w-[400px]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search facilities by name, location, or operator..."
          className="w-full pl-9 pr-8 py-2 bg-[#0a1628]/90 backdrop-blur-xl border border-white/[0.08] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 shadow-2xl"
          aria-label="Search facilities"
          aria-expanded={isOpen}
          role="combobox"
          aria-autocomplete="list"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="mt-1 max-h-[320px] overflow-y-auto bg-[#0a1628]/95 backdrop-blur-xl border border-white/[0.08] rounded-lg shadow-2xl divide-y divide-white/[0.04]"
        >
          {results.map((r, i) => {
            const sectorColor = SECTOR_COLORS[r.sector as EnergySector] ?? '#8A95A5';
            const sectorLabel = SECTOR_LABELS[r.sector as EnergySector] ?? r.sector;
            const cap = formatCapacity(r.capacityMW);

            return (
              <li
                key={`${r.coordinates[0]}-${r.coordinates[1]}-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => handleSelect(r)}
                className={`px-3 py-2.5 cursor-pointer transition-colors ${
                  i === selectedIndex
                    ? 'bg-blue-500/15'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <MapPin
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    style={{ color: sectorColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-200 truncate">
                      {r.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sectorColor }}
                      />
                      <span>{sectorLabel}</span>
                      {cap && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>{cap}</span>
                        </>
                      )}
                      {r.state && (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>
                            {r.county ? `${r.county}, ` : ''}
                            {r.state}
                          </span>
                        </>
                      )}
                    </div>
                    {r.operator && (
                      <div className="text-[10px] text-gray-600 mt-0.5 truncate">
                        {r.operator}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
