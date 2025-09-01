'use client';

import { useState, useEffect } from 'react';

import { InventoryRecord } from '../types/inventory';
import InventoryForm from '../components/InventoryForm';
import SearchSection from '../components/SearchSection';
import HistorySection from '../components/HistorySection';
import ExportSection from '../components/ExportSection';
import ProductHistoryDetail from '../components/ProductHistoryDetail';
import ReportsSection from '../components/ReportsSection';

export default function InventoryPage() {
  const [activeSection, setActiveSection] = useState('search');
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InventoryRecord | null>(null);
  const [viewingProductHistory, setViewingProductHistory] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  // Load history when history tab is clicked
  useEffect(() => {
    if (activeSection === 'history') {
      loadHistory();
    }
  }, [activeSection]);

  const loadHistory = async () => {
    try {
      console.log('Loading history data...');
      const response = await fetch('/api/inventory/records');
      if (response.ok) {
        const data = await response.json();
        console.log('History data loaded:', data);
        setRecords(data.records || []);
      } else {
        console.error('Failed to load history:', response.status);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleLoadProduct = (record: InventoryRecord) => {
    setSelectedProduct(record);
    setActiveSection('entry');
  };

  const handleViewProductHistory = (productName: string) => {
    setViewingProductHistory(productName);
  };

  const handleBackToProducts = () => {
    setViewingProductHistory(null);
  };

  if (viewingProductHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4">
        <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
          <ProductHistoryDetail
            productName={viewingProductHistory}
            onBack={handleBackToProducts}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-4">📦 Inventory Management System</h1>
          <p className="text-xl text-gray-300">Track, manage, and analyze your inventory with precision</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-100 px-8 pt-6">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setActiveSection('entry')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeSection === 'entry'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              📝 New Entry
            </button>
            
            <button
              onClick={() => setActiveSection('search')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeSection === 'search'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              🔍 Search
            </button>
            
            <button
              onClick={() => setActiveSection('history')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeSection === 'history'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              📚 History
            </button>
            
            <button
              onClick={() => setActiveSection('reports')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeSection === 'reports'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              📊 Reports
            </button>
            
            <button
              onClick={() => setActiveSection('export')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeSection === 'export'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              📤 Export
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="min-h-[600px]">
          {activeSection === 'entry' && (
            <InventoryForm
              onRecordSaved={loadHistory}
              selectedProduct={selectedProduct}
              onProductLoaded={() => setSelectedProduct(null)}
            />
          )}
          
          {activeSection === 'search' && (
            <SearchSection onLoadProduct={handleLoadProduct} />
          )}
          
          {activeSection === 'history' && (
            <HistorySection
              records={records}
              onViewProductHistory={handleViewProductHistory}
            />
          )}
          
          {activeSection === 'reports' && (
            <ReportsSection records={records} />
          )}
          
          {activeSection === 'export' && (
            <ExportSection records={records} />
          )}
        </div>
      </div>
    </div>
  );
}
