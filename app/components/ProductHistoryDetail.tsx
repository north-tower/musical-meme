'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { InventoryRecord } from '../types/inventory';

interface ProductHistoryDetailProps {
  productName: string;
  onBack: () => void;
}

interface StockMovement {
  date: string;
  movement_type: string;
  stock_in: number;
  stock_out: number;
  net_change: number;
  opening_stock: number;
  closing_stock: number;
  details: {
    new_stock: number;
    issued_production: number;
    returns: number;
    rebagging: number;
    damaged: number;
  };
}

export default function ProductHistoryDetail({ productName, onBack }: ProductHistoryDetailProps) {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'date' | 'movement_type' | 'values'>('all');
  const [summary, setSummary] = useState<{
    total_stock_in: number;
    total_stock_out: number;
    total_damaged: number;
    total_returns: number;
    total_rebagging: number;
    average_daily_usage: number;
    stock_turnover_rate: number;
  } | null>(null);

  const processStockMovements = (productRecords: InventoryRecord[]) => {
    try {
      console.log('Processing stock movements for:', productRecords.length, 'records');
      
      const movements: StockMovement[] = productRecords.map(record => {
        const stockIn = (record.new_stock || 0) + (record.returns || 0) + (record.rebagging || 0);
        const stockOut = (record.issued_production || 0) + (record.damaged || 0);
        const netChange = stockIn - stockOut;
        
        let movementType = 'stable';
        if (stockIn > 0 && stockOut === 0) movementType = 'stock_in';
        else if (stockOut > 0 && stockIn === 0) movementType = 'stock_out';
        else if (stockIn > 0 && stockOut > 0) movementType = 'mixed';
        else if (netChange > 0) movementType = 'net_increase';
        else if (netChange < 0) movementType = 'net_decrease';

        return {
          date: record.date,
          movement_type: movementType,
          stock_in: stockIn,
          stock_out: stockOut,
          net_change: netChange,
          opening_stock: record.opening_stock || 0,
          closing_stock: record.closing_stock || 0,
          details: {
            new_stock: record.new_stock || 0,
            issued_production: record.issued_production || 0,
            returns: record.returns || 0,
            rebagging: record.rebagging || 0,
            damaged: record.damaged || 0
          }
        };
      });

      console.log('Processed movements:', movements.length);
      setStockMovements(movements);
    } catch (error) {
      console.error('Error processing stock movements:', error);
    }
  };

  const calculateSummary = (productRecords: InventoryRecord[]) => {
    try {
      const totalStockIn = productRecords.reduce((sum, record) => 
        sum + (record.new_stock || 0) + (record.returns || 0) + (record.rebagging || 0), 0
      );
      const totalStockOut = productRecords.reduce((sum, record) => 
        sum + (record.issued_production || 0) + (record.damaged || 0), 0
      );
      const totalReturns = productRecords.reduce((sum, record) => sum + (record.returns || 0), 0);
      const totalRebagging = productRecords.reduce((sum, record) => sum + (record.rebagging || 0), 0);
      const totalDamaged = productRecords.reduce((sum, record) => sum + (record.damaged || 0), 0);
      
      const daysWithActivity = productRecords.length;
      const averageDailyUsage = daysWithActivity > 0 ? totalStockOut / daysWithActivity : 0;
      const stockTurnoverRate = totalStockIn > 0 ? (totalStockOut / totalStockIn) * 100 : 0;

      setSummary({
        total_stock_in: totalStockIn,
        total_stock_out: totalStockOut,
        total_returns: totalReturns,
        total_rebagging: totalRebagging,
        total_damaged: totalDamaged,
        average_daily_usage: averageDailyUsage,
        stock_turnover_rate: stockTurnoverRate
      });
    } catch (error) {
      console.error('Error calculating summary:', error);
    }
  };

  const loadProductHistory = useCallback(async () => {
    try {
      console.log('Loading product history for:', productName);
      
      const { data: records, error } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('item_name', productName)
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Records received from Supabase:', records);
      setRecords(records || []);
      
      if (records && records.length > 0) {
        console.log('Processing records...');
        processStockMovements(records);
        calculateSummary(records);
      } else {
        console.log('No records found for product:', productName);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading product history:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      setIsLoading(false);
    }
  }, [productName, processStockMovements]);

  useEffect(() => {
    loadProductHistory();
  }, [loadProductHistory]);

  // Filter movements based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMovements(stockMovements);
      setCurrentPage(1);
      return;
    }

    let filtered: StockMovement[] = [];

    switch (searchFilter) {
      case 'date':
        // Search by date (partial match)
        filtered = stockMovements.filter(movement =>
          movement.date.toLowerCase().includes(searchTerm.toLowerCase())
        );
        break;
      case 'movement_type':
        // Search by movement type
        filtered = stockMovements.filter(movement =>
          movement.movement_type.toLowerCase().includes(searchTerm.toLowerCase())
        );
        break;
      case 'values':
        // Search by numeric values (opening, closing, net change)
        const searchNum = parseFloat(searchTerm);
        if (!isNaN(searchNum)) {
          filtered = stockMovements.filter(movement =>
            movement.opening_stock === searchNum ||
            movement.closing_stock === searchNum ||
            movement.net_change === searchNum ||
            movement.details.new_stock === searchNum ||
            movement.details.issued_production === searchNum ||
            movement.details.returns === searchNum ||
            movement.details.rebagging === searchNum ||
            movement.details.damaged === searchNum
          );
        }
        break;
      default:
        // Search across all fields
        filtered = stockMovements.filter(movement =>
          movement.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.movement_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          movement.opening_stock.toString().includes(searchTerm) ||
          movement.closing_stock.toString().includes(searchTerm) ||
          movement.net_change.toString().includes(searchTerm) ||
          movement.details.new_stock.toString().includes(searchTerm) ||
          movement.details.issued_production.toString().includes(searchTerm) ||
          movement.details.returns.toString().includes(searchTerm) ||
          movement.details.rebagging.toString().includes(searchTerm) ||
          movement.details.damaged.toString().includes(searchTerm)
        );
    }

    setFilteredMovements(filtered);
    setCurrentPage(1);
  }, [searchTerm, searchFilter, stockMovements]);


  const getMovementIcon = (movementType: string) => {
    switch (movementType) {
      case 'stock_in': return '📥';
      case 'stock_out': return '📤';
      case 'mixed': return '🔄';
      default: return '➡️';
    }
  };

  const getMovementColor = (movementType: string) => {
    switch (movementType) {
      case 'stock_in': return 'bg-green-100 text-green-800';
      case 'stock_out': return 'bg-red-100 text-red-800';
      case 'mixed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
    setTotalPages(Math.ceil(filteredMovements.length / newPageSize));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filter: 'all' | 'date' | 'movement_type' | 'values') => {
    setSearchFilter(filter);
    setSearchTerm(''); // Clear search when changing filter
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMovements.slice(startIndex, endIndex);
  };

  const currentPageData = getCurrentPageData();

  // Update total pages when filtered results change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredMovements.length / pageSize));
  }, [filteredMovements, pageSize]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2 mb-4"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading product history...</p>
            <p className="text-sm text-gray-500">Fetching stock movement data for {productName}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors mb-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </button>
          <h2 className="text-3xl font-semibold text-gray-800">📊 {productName}</h2>
          <p className="text-gray-600">Detailed stock movement history and analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold">{summary.total_stock_in}</div>
            <div className="text-green-100">Total Stock In</div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold">{summary.total_stock_out}</div>
            <div className="text-red-100">Total Stock Out</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl text-center">
            <div className="text-3xl font-bold">{records.length}</div>
            <div className="text-blue-100">Total Entries</div>
          </div>
        </div>
      )}

      {/* Stock Movement Timeline */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6">
          <h3 className="text-xl font-semibold">📈 Stock Movement Timeline</h3>
          <p className="text-gray-300">Chronological view of all stock movements</p>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search Bar */}
            <div className="flex-1 min-w-0">
              <label htmlFor="movementSearch" className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Search Movements
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="movementSearch"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by date, movement type, or values..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Filter Options */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by:</label>
              <select
                value={searchFilter}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'date' | 'movement_type' | 'values')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Fields</option>
                <option value="date">Date</option>
                <option value="movement_type">Movement Type</option>
                <option value="values">Numeric Values</option>
              </select>
              
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="px-3 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  🗑️ Clear
                </button>
              )}
            </div>
          </div>
          
          {/* Search Results Summary */}
          {searchTerm && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">
                  🔍 Search results for &quot;<strong>{searchTerm}</strong>&quot; in {searchFilter.replace('_', ' ')} field
                </span>
                <span className="text-blue-600 font-semibold">
                  {filteredMovements.length} of {stockMovements.length} movements found
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination Controls for Timeline */}
        {filteredMovements.length > 0 && (
          <div className="px-6 pt-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredMovements.length)} of {filteredMovements.length} movements
                {searchTerm && ` (filtered)`}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <div>
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-lg mb-2">No movements found matching your search</p>
                  <p className="text-sm mb-4">Try adjusting your search term or filter</p>
                  <button
                    onClick={clearSearch}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    🔄 Show All Movements
                  </button>
                </div>
              ) : (
                <p>No stock movements recorded for this product.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {currentPageData.map((movement) => (
                <div
                  key={movement.date}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMovementColor(movement.movement_type)}`}>
                        {getMovementIcon(movement.movement_type)} {movement.movement_type.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-gray-800">
                        {new Date(movement.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        {movement.closing_stock}
                      </div>
                      <div className="text-sm text-gray-500">Closing Stock</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <span className="block font-semibold text-gray-600">Opening</span>
                      <span className="text-gray-800">{movement.opening_stock}</span>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <span className="block font-semibold text-green-600">New</span>
                      <span className="text-green-800">+{movement.details.new_stock}</span>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <span className="block font-semibold text-red-600">Issued</span>
                      <span className="text-red-800">-{movement.details.issued_production}</span>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <span className="block font-semibold text-blue-600">Returns</span>
                      <span className="text-blue-800">+{movement.details.returns}</span>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <span className="block font-semibold text-purple-600">Rebagging</span>
                      <span className="text-purple-800">+{movement.details.rebagging}</span>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <span className="block font-semibold text-orange-600">Damaged</span>
                      <span className="text-orange-800">-{movement.details.damaged}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Net Change:</span>
                      <span className={`font-semibold ${
                        movement.net_change > 0 ? 'text-green-600' : 
                        movement.net_change < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {movement.net_change > 0 ? '+' : ''}{movement.net_change}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination Navigation for Timeline */}
        {totalPages > 1 && (
          <div className="px-6 pb-6 border-t border-gray-200">
            <div className="flex justify-center pt-4">
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
          </div>
        )}
      </div>

      {/* Additional Analytics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Stock Analytics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Average Daily Usage:</span>
                <span className="font-semibold">{summary.average_daily_usage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Stock Turnover Rate:</span>
                <span className="font-semibold">{summary.stock_turnover_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Returns:</span>
                <span className="font-semibold text-blue-600">+{summary.total_returns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Damaged:</span>
                <span className="font-semibold text-red-600">-{summary.total_damaged}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Insights</h3>
            <div className="space-y-3 text-sm">
              {summary.average_daily_usage > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="font-semibold text-blue-800">📈 Usage Pattern:</span>
                  <p className="text-blue-700">Average daily usage is {summary.average_daily_usage.toFixed(2)} units</p>
                </div>
              )}
              {summary.total_returns > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="font-semibold text-green-800">🔄 Returns:</span>
                  <p className="text-green-700">{summary.total_returns} units returned from production</p>
                </div>
              )}
              {summary.total_damaged > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <span className="font-semibold text-red-800">⚠️ Damaged Stock:</span>
                  <p className="text-red-700">{summary.total_damaged} units damaged ({(summary.total_damaged / summary.total_stock_in * 100).toFixed(1)}% of total stock in)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
