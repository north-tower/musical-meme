'use client';

import { useState, useEffect, useCallback } from 'react';
import { InventoryRecord } from '../types/inventory';

interface HistorySectionProps {
  records: InventoryRecord[];
  onViewProductHistory?: (productName: string) => void;
}

interface ProductSummary {
  item_name: string;
  latest_record: InventoryRecord;
  total_records: number;
  current_stock: number;
  last_updated: string;
  stock_trend: 'increasing' | 'decreasing' | 'stable';
}

export default function HistorySection({ records, onViewProductHistory }: HistorySectionProps) {
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const generateProductSummaries = useCallback(() => {
    console.log('HistorySection: Generating product summaries from', records.length, 'records');
    
    // Group records by product name
    const productGroups = new Map<string, InventoryRecord[]>();
    
    records.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    console.log('HistorySection: Found', productGroups.size, 'unique products');

    // Create product summaries
    const summaries: ProductSummary[] = Array.from(productGroups.entries()).map(([itemName, productRecords]) => {
      // Sort by date to get latest and calculate trends
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
        total_records: productRecords.length,
        current_stock: latestRecord.closing_stock,
        last_updated: latestRecord.date,
        stock_trend: stockTrend
      };
    });

    // Sort by most recently updated
    summaries.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
    
    console.log('HistorySection: Generated', summaries.length, 'product summaries');
    
    setProductSummaries(summaries);
    setFilteredSummaries(summaries);
    setTotalPages(Math.ceil(summaries.length / pageSize));
    setIsLoading(false);
  }, [records, pageSize]);

  useEffect(() => {
    if (records && records.length > 0) {
      console.log('HistorySection: Records received:', records.length);
      generateProductSummaries();
    } else {
      console.log('HistorySection: No records or empty records array');
      setIsLoading(false);
    }
  }, [records, generateProductSummaries]);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSummaries(productSummaries);
      setCurrentPage(1);
      return;
    }

    // Simple fuzzy search - check if search term appears in product name
    const filtered = productSummaries.filter(summary =>
      summary.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredSummaries(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, productSummaries]);

  const handleProductClick = (productName: string) => {
    if (onViewProductHistory) {
      onViewProductHistory(productName);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
    setTotalPages(Math.ceil(filteredSummaries.length / newPageSize));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSummaries.slice(startIndex, endIndex);
  };

  const currentPageData = getCurrentPageData();

  // Update total pages when filtered results change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredSummaries.length / pageSize));
  }, [filteredSummaries, pageSize]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product summaries...</p>
        </div>
      </div>
    );
  }

  if (!productSummaries || productSummaries.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-16 text-gray-500">
          <div className="text-6xl mb-6">📚</div>
          <h2 className="text-3xl font-semibold mb-4">📚 Product History</h2>
          <p className="text-xl mb-4">View stock movement history for your products</p>
          <p className="text-lg">No products found. Start by adding your first inventory entry!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-2">📚 Product History</h2>
        <p className="text-gray-600">Click on any product to view its detailed stock movement history</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl text-center">
          <div className="text-3xl font-bold">{productSummaries.length}</div>
          <div className="text-blue-100">Total Products</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl text-center">
          <div className="text-3xl font-bold">
            {productSummaries.filter(p => p.current_stock > 0).length}
          </div>
          <div className="text-green-100">In Stock</div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-2xl text-center">
          <div className="text-3xl font-bold">
            {productSummaries.filter(p => p.current_stock === 0).length}
          </div>
          <div className="text-orange-100">Out of Stock</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl text-center">
          <div className="text-3xl font-bold">
            {productSummaries.reduce((sum, p) => sum + p.total_records, 0)}
          </div>
          <div className="text-purple-100">Total Records</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <label htmlFor="productSearch" className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Products
            </label>
            <div className="relative">
              <input
                type="text"
                id="productSearch"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Type product name to search..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 text-gray-700
                 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              🗑️ Clear
            </button>
          )}
        </div>
        
        {/* Search Results Summary */}
        {searchTerm && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-800">
                🔍 Search results for &quot;<strong>{searchTerm}</strong>&quot;
              </span>
              <span className="text-blue-600 font-semibold">
                {filteredSummaries.length} of {productSummaries.length} products found
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Show:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700that can show sccording to the dates selected 
             text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSummaries.length)} of {filteredSummaries.length} products
          {searchTerm && ` (filtered)`}
        </div>
      </div>

      {/* Product List */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-6xl mb-6">🔍</div>
          <h3 className="text-2xl font-semibold mb-4">No products found</h3>
          {searchTerm ? (
            <p className="text-lg">No products match your search for &quot;<strong>{searchTerm}</strong>&quot;</p>
          ) : (
            <p className="text-lg">No products available</p>
          )}
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              🔄 Show All Products
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentPageData.map((summary) => (
            <div
              key={summary.item_name}
              onClick={() => handleProductClick(summary.item_name)}
              className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {summary.item_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(summary.last_updated).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Stock Trend Indicator */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    summary.stock_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                    summary.stock_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {summary.stock_trend === 'increasing' ? '📈' : 
                     summary.stock_trend === 'decreasing' ? '📉' : '➡️'} 
                    {summary.stock_trend}
                  </div>
                  
                  {/* Current Stock Status */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    summary.current_stock > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {summary.current_stock > 0 ? '🟢 In Stock' : '🔴 Out of Stock'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="block text-sm font-semibold text-gray-600 uppercase tracking-wide">Current Stock</span>
                  <span className="text-2xl font-bold text-gray-800">{summary.current_stock}</span>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="block text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Records</span>
                  <span className="text-2xl font-bold text-gray-800">{summary.total_records}</span>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="block text-sm font-semibold text-gray-600 uppercase tracking-wide">Latest Entry</span>
                  <span className="text-lg font-bold text-gray-800">
                    {summary.latest_record.new_stock > 0 ? `+${summary.latest_record.new_stock}` : '0'}
                  </span>
                  <span className="block text-xs text-gray-500">New Stock</span>
                </div>
                
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="block text-sm font-semibold text-gray-600 uppercase tracking-wide">Latest Usage</span>
                  <span className="text-lg font-bold text-gray-800">
                    {summary.latest_record.issued_production > 0 ? `-${summary.latest_record.issued_production}` : '0'}
                  </span>
                  <span className="block text-xs text-gray-500">Issued</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Click to view detailed stock movement history →
                </span>
                
                <div className="flex items-center gap-2 text-blue-600 group-hover:text-blue-700 transition-colors">
                  <span className="text-sm font-semibold">View History</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Navigation */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center gap-2">
            {/* Previous Page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                return null;
              })}
            </div>
            
            {/* Next Page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </nav>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <p className="text-gray-600">
          {searchTerm 
            ? `Showing ${filteredSummaries.length} products matching &quot;${searchTerm}&quot;`
            : `Showing ${productSummaries.length} products with inventory history`
          }
        </p>
      </div>
    </div>
  );
}
