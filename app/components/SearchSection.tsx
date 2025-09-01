'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryRecord } from '../types/inventory';

interface SearchSectionProps {
  onLoadProduct?: (record: InventoryRecord) => void;
}

export default function SearchSection({ onLoadProduct }: SearchSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const { data: records, error } = await supabase
        .from('inventory_records')
        .select('*')
        .or(`item_name.ilike.%${searchTerm}%`)
        .order('date', { ascending: false });

      if (error) throw error;

      if (!records || records.length === 0) {
        setSearchResults([]);
        return;
      }

      // Get unique products that match the search term
      const uniqueProducts = new Map();
      records.forEach(record => {
        if (!uniqueProducts.has(record.item_name)) {
          uniqueProducts.set(record.item_name, record);
        } else {
          // Keep the most recent record for each product
          const existing = uniqueProducts.get(record.item_name);
          if (new Date(record.date) > new Date(existing.date)) {
            uniqueProducts.set(record.item_name, record);
          }
        }
      });

      // Convert to array and sort by most recent
      const sortedProducts = Array.from(uniqueProducts.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSearchResults(sortedProducts);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLoadProduct = (record: InventoryRecord) => {
    if (onLoadProduct) {
      onLoadProduct(record);
    }
  };

  return (
    <div className="p-8">
      <div className="bg-gray-50 p-6 rounded-2xl mb-8 shadow-inner">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">🔍 Search & View Products</h3>
        <p className="text-gray-600 mb-6">Find existing products and view their current status</p>
        
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label htmlFor="searchProduct" className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
              Search by Product Name/Code
            </label>
            <input
              type="text"
              id="searchProduct"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type to search products..."
              className="w-full p-4 border-2 border-gray-200 text-gray-700 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-white shadow-lg">
        {searchResults.length === 0 && searchTerm && !isSearching ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4">🔍</div>
            <h4 className="text-xl font-semibold mb-2">No matching products found</h4>
            <p>Try searching with different keywords or check the spelling.</p>
            <p className="text-sm mt-2">Tip: You can also create a new product entry in the &quot;New Entry&quot; tab.</p>
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((record) => (
            <div
              key={`${record.item_name}-${record.date}`}
              onClick={() => handleLoadProduct(record)}
              className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-all duration-200 cursor-pointer rounded-lg hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                <h5 className="text-lg font-semibold text-gray-800">{record.item_name}</h5>
                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                  👆 Click to load
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Last Updated:</span>
                  <p className="text-gray-800">{record.date}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Current Stock:</span>
                  <p className="text-gray-800">{record.closing_stock}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">New Stock:</span>
                  <p className="text-gray-800">{record.new_stock}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Issued:</span>
                  <p className="text-gray-800">{record.issued_production}</p>
                </div>
              </div>
              
              <div className="mt-3">
                <span className="font-semibold text-gray-600">Status:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                  record.closing_stock > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {record.closing_stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <p>Enter a search term to find products</p>
          </div>
        )}
      </div>
    </div>
  );
}
