'use client';

import { InventoryRecord } from '../types/inventory';

interface ExportSectionProps {
  records: InventoryRecord[];
}

export default function ExportSection({ records }: ExportSectionProps) {
  const exportData = () => {
    if (!records || records.length === 0) {
      alert('No data to export. Please save some records first.');
      return;
    }

    try {
      // Create CSV content
      const headers = [
        'Date', 'Item Name', 'Opening Stock', 'New Stock', 'New Balance', 
        'Issued to Production', 'Returns', 'Rebagging', 'Damaged', 'Closing Stock'
      ];
      
      const csvContent = [
        headers.join(','),
        ...records.map(record => [
          record.date,
          `"${record.item_name}"`,
          record.opening_stock,
          record.new_stock,
          record.new_balance,
          record.issued_production,
          record.returns,
          record.rebagging,
          record.damaged,
          record.closing_stock
        ].join(','))
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_records_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('Data exported successfully! 📊');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const testDateChange = () => {
    console.log('🧪 Test Date Change button clicked');
    console.log('Current records count:', records.length);
    alert('🧪 Test function executed! Check console for details.');
  };

  const testTomorrow = () => {
    console.log('📅 Test Tomorrow button clicked');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    console.log('Tomorrow date:', tomorrow.toISOString().split('T')[0]);
    alert(`📅 Tomorrow's date: ${tomorrow.toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-2">📊 Export Data</h2>
        <p className="text-gray-600">Download your inventory data for analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export All Records */}
        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Export All Records</h3>
          <p className="text-gray-600 mb-6">Download complete inventory history as CSV</p>
          
          <button
            onClick={exportData}
            disabled={!records || records.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📊 Export All Data
          </button>
          
          {records && records.length > 0 && (
            <p className="text-sm text-gray-500 mt-3">
              {records.length} records available for export
            </p>
          )}
        </div>

        {/* Test Functions */}
        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-200 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">🧪 Test Functions</h3>
          <p className="text-gray-600 mb-6">Debug and test system functionality</p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={testDateChange}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-sm"
            >
              🧪 Test Date Change
            </button>
            
            <button
              onClick={testTomorrow}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 text-sm"
            >
              📅 Test Tomorrow
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            Check browser console for test results
          </p>
        </div>
      </div>

      {/* Data Summary */}
      {records && records.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Data Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <span className="block text-2xl font-bold text-blue-600">{records.length}</span>
              <span className="text-sm text-blue-800">Total Records</span>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <span className="block text-2xl font-bold text-green-600">
                {new Set(records.map(r => r.item_name)).size}
              </span>
              <span className="text-sm text-green-800">Unique Products</span>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <span className="block text-2xl font-bold text-purple-600">
                {records.reduce((sum, r) => sum + r.closing_stock, 0)}
              </span>
              <span className="text-sm text-purple-800">Total Closing Stock</span>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <span className="block text-2xl font-bold text-orange-600">
                {records[0]?.date} to {records[records.length - 1]?.date}
              </span>
              <span className="text-sm text-orange-800">Date Range</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Export Instructions</h3>
        <ul className="text-blue-700 space-y-2 text-sm">
          <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
          <li>• Data is exported in chronological order (newest first)</li>
          <li>• All numeric values are preserved as numbers for easy calculations</li>
          <li>• Product names are quoted to handle special characters</li>
        </ul>
      </div>
    </div>
  );
}






