'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryRecord } from '../types/inventory';

interface SearchSectionProps {
  onLoadProduct?: (record: InventoryRecord) => void;
}

interface ProductSummary {
  item_name: string;
  latest_record: InventoryRecord;
  current_stock: number;
  last_updated: string;
  total_records: number;
  stock_trend: 'increasing' | 'decreasing' | 'stable';
}

export default function SearchSection({ onLoadProduct }: SearchSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [viewMode, setViewMode] = useState<'search' | 'table'>('table');

  // Load all products on component mount
  useEffect(() => {
    loadAllProducts();
  }, []);

  const loadAllProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const { data: records, error } = await supabase
        .from('inventory_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (!records || records.length === 0) {
        setAllProducts([]);
        return;
      }

      // Group records by product name and get latest record for each
      const productGroups = new Map<string, InventoryRecord[]>();
      records.forEach(record => {
        if (!productGroups.has(record.item_name)) {
          productGroups.set(record.item_name, []);
        }
        productGroups.get(record.item_name)!.push(record);
      });

      // Create product summaries
      const productSummaries: ProductSummary[] = Array.from(productGroups.entries()).map(([itemName, productRecords]) => {
        const sortedRecords = productRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestRecord = sortedRecords[0];
        
        // Calculate stock trend (compare last 2 records if available)
        let stockTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (sortedRecords.length >= 2) {
          const currentStock = sortedRecords[0].closing_stock;
          const previousStock = sortedRecords[1].closing_stock;
          if (currentStock > previousStock) stockTrend = 'increasing';
          else if (currentStock < previousStock) stockTrend = 'decreasing';
        }

        return {
          item_name: itemName,
          latest_record: latestRecord,
          current_stock: latestRecord.closing_stock,
          last_updated: latestRecord.date,
          total_records: productRecords.length,
          stock_trend: stockTrend
        };
      });

      // Sort by most recently updated
      productSummaries.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
      
      setAllProducts(productSummaries);
    } catch (error) {
      console.error('Error loading products:', error);
      setAllProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">📦 Product Management</h3>
            <p className="text-sm sm:text-base text-gray-600">View all products or search for specific ones</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-white rounded-lg p-1 shadow-sm mt-4 sm:mt-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📋 All Products
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'search'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🔍 Search
            </button>
          </div>
        </div>
        
        {/* Search Section - Only show when in search mode */}
        {viewMode === 'search' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <label htmlFor="searchProduct" className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-xs sm:text-sm">
                Search by Product Name/Code
              </label>
              <input
                type="text"
                id="searchProduct"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type to search products..."
                className="w-full p-3 sm:p-4 border-2 border-gray-200 text-gray-700 rounded-xl text-base sm:text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[48px] sm:min-h-[56px]"
            >
              {isSearching ? '🔍 Searching...' : '🔍 Search'}
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="max-h-80 sm:max-h-96 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-lg">
        {viewMode === 'table' ? (
          // Product Table View
          <div className="p-3 sm:p-4">
            {isLoadingProducts ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 mx-auto mb-4"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2 mb-4"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">Loading products...</p>
                  <p className="text-sm text-gray-500">Fetching your inventory data</p>
                </div>
              </div>
            ) : allProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl sm:text-5xl mb-4">📦</div>
                <h4 className="text-lg sm:text-xl font-semibold mb-2">No products found</h4>
                <p className="text-sm sm:text-base">Start by adding your first inventory entry in the &quot;New Entry&quot; tab.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allProducts.map((product) => (
                  <div
                    key={product.item_name}
                    onClick={() => handleLoadProduct(product.latest_record)}
                    className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-md active:bg-gray-100"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                      <h5 className="text-base sm:text-lg font-semibold text-gray-800 break-words">{product.item_name}</h5>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          product.stock_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                          product.stock_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.stock_trend === 'increasing' ? '📈' : 
                           product.stock_trend === 'decreasing' ? '📉' : '➡️'} 
                          {product.stock_trend}
                        </span>
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold animate-pulse">
                          👆 Tap to load
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Current Stock:</span>
                        <p className="text-gray-800 sm:mt-1 font-semibold">{product.current_stock}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Last Updated:</span>
                        <p className="text-gray-800 sm:mt-1">{new Date(product.last_updated).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Total Records:</span>
                        <p className="text-gray-800 sm:mt-1">{product.total_records}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold self-start ${
                          product.current_stock > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.current_stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Search Results View
          <div className="p-3 sm:p-4">
            {isSearching ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 mx-auto mb-4"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2 mb-4"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">Searching products...</p>
                  <p className="text-sm text-gray-500">Finding matches for &quot;{searchTerm}&quot;</p>
                </div>
              </div>
            ) : searchResults.length === 0 && searchTerm && !isSearching ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🔍</div>
                <h4 className="text-lg sm:text-xl font-semibold mb-2">No matching products found</h4>
                <p className="text-sm sm:text-base">Try searching with different keywords or check the spelling.</p>
                <p className="text-xs sm:text-sm mt-2">Tip: You can also create a new product entry in the &quot;New Entry&quot; tab.</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((record) => (
                  <div
                    key={`${record.item_name}-${record.date}`}
                    onClick={() => handleLoadProduct(record)}
                    className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-md active:bg-gray-100"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                      <h5 className="text-base sm:text-lg font-semibold text-gray-800 break-words">{record.item_name}</h5>
                      <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold animate-pulse self-start sm:self-auto">
                        👆 Tap to load
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Last Updated:</span>
                        <p className="text-gray-800 sm:mt-1">{record.date}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Current Stock:</span>
                        <p className="text-gray-800 sm:mt-1">{record.closing_stock}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">New Stock:</span>
                        <p className="text-gray-800 sm:mt-1">{record.new_stock}</p>
                      </div>
                      <div className="flex flex-col sm:block">
                        <span className="font-semibold text-gray-600">Issued:</span>
                        <p className="text-gray-800 sm:mt-1">{record.issued_production}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-semibold text-gray-600 text-xs sm:text-sm">Status:</span>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold self-start ${
                        record.closing_stock > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.closing_stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
                <p className="text-sm sm:text-base">Enter a search term to find products</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
