'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FormData, StatusMessageType, InventoryRecord } from '../types/inventory';

interface InventoryFormProps {
  onRecordSaved: () => void;
  selectedProduct?: InventoryRecord | null;
  onProductLoaded?: () => void;
}

export default function InventoryForm({ onRecordSaved, selectedProduct, onProductLoaded }: InventoryFormProps) {
  const [formData, setFormData] = useState<FormData>({
    itemName: '',
    date: '',
    openingStock: 0,
    newStock: 0,
    newBalance: 0,
    issuedProduction: 0,
    returns: 0,
    rebagging: 0,
    damaged: 0,
    closingStock: 0
  });

  const [statusMessage, setStatusMessage] = useState<{ message: string; type: StatusMessageType } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openingStockReadOnly, setOpeningStockReadOnly] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  // Set today's date by default
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, date: today }));
  }, []);

  // Handle loading product from search
  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({
        ...prev,
        itemName: selectedProduct.item_name,
        date: new Date().toISOString().split('T')[0], // Set to today for new entry
        openingStock: selectedProduct.closing_stock, // Use previous closing stock as opening
        newStock: 0,
        issuedProduction: 0,
        returns: 0,
        rebagging: 0,
        damaged: 0
      }));
      
      setOpeningStockReadOnly(true);
      showStatus(`✅ Product "${selectedProduct.item_name}" loaded successfully!`, 'success');
      
      // Notify parent that product has been loaded
      if (onProductLoaded) {
        onProductLoaded();
      }
    }
  }, [selectedProduct, onProductLoaded]);

  const showStatus = (message: string, type: StatusMessageType = 'info') => {
    setStatusMessage({ message, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const calculateValues = useCallback(() => {
    const { openingStock, newStock, issuedProduction, returns, rebagging, damaged } = formData;
    
    const newBalance = openingStock + newStock;
    const closingStock = Math.max(0, newBalance - issuedProduction + returns + rebagging - damaged);
    
    setFormData(prev => ({
      ...prev,
      newBalance,
      closingStock
    }));
  }, [formData]);

  const isDateInPast = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const getLatestClosingStock = async (productName: string) => {
    try {
      const { data: records, error } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('item_name', productName)
        .order('date', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return records && records.length > 0 ? records[0].closing_stock : null;
    } catch (error) {
      console.error('Error fetching latest closing stock:', error);
      return null;
    }
  };

  const getDataForDate = async (productName: string, targetDate: string) => {
    try {
      const { data: records, error } = await supabase
        .from('inventory_records')
        .select('*')
        .eq('item_name', productName)
        .eq('date', targetDate)
        .single();
      
      if (error) throw error;
      return records;
    } catch (error) {
      console.error('Error fetching data for date:', error);
      return null;
    }
  };





  const toggleFormFieldsForDate = (selectedDate: string) => {
    const isPastDate = isDateInPast(selectedDate);
    
    if (isPastDate) {
      setDateWarning('⚠️ Read-Only Mode: This date is in the past. You cannot modify data for previous days.');
    } else {
      setDateWarning(null);
    }
  };

  const checkProductAndFillOpeningStock = async () => {
    const { itemName } = formData;
    if (!itemName) return;

    try {
      const latestClosingStock = await getLatestClosingStock(itemName);
      
      if (latestClosingStock !== null) {
        setFormData(prev => ({ ...prev, openingStock: latestClosingStock }));
        setOpeningStockReadOnly(true);
        showStatus('✅ Opening stock loaded from previous day', 'success');
      } else {
        setOpeningStockReadOnly(false);
        showStatus('🆕 New product detected - set opening stock manually', 'info');
      }
      
      calculateValues();
      
      const { date } = formData;
      if (date) {
        toggleFormFieldsForDate(date);
      }
    } catch (error) {
      console.error('Error checking product:', error);
      setOpeningStockReadOnly(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRecord = async () => {
    const { itemName, date } = formData;
    
    if (!itemName.trim()) {
      showStatus('Please enter an item name or product code.', 'error');
      return;
    }
    
    if (!date) {
      showStatus('Please select a date.', 'error');
      return;
    }
    
    if (isDateInPast(date)) {
      showStatus('❌ Cannot modify data for past dates. Please select today or a future date.', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      const record = {
        item_name: itemName.trim(),
        date: date,
        opening_stock: formData.openingStock,
        new_stock: formData.newStock,
        new_balance: formData.newBalance,
        issued_production: formData.issuedProduction,
        returns: formData.returns,
        rebagging: formData.rebagging,
        damaged: formData.damaged,
        closing_stock: formData.closingStock,
        timestamp: new Date().toISOString()
      };

      // Check if record already exists
      const existingRecord = await getDataForDate(itemName, date);
      
      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('inventory_records')
          .update(record)
          .eq('id', existingRecord.id);
        
        if (error) throw error;
        showStatus('Record updated successfully! 🎉', 'success');
      } else {
        // Insert new record
        const { error } = await supabase
          .from('inventory_records')
          .insert([record]);
        
        if (error) throw error;
        showStatus('Record saved successfully! 🎉', 'success');
      }
      
      onRecordSaved();
      clearForm();
      
    } catch (error) {
      console.error('Error saving record:', error);
      showStatus('Error saving record. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    if (confirm('Are you sure you want to clear all fields?')) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        itemName: '',
        date: today,
        openingStock: 0,
        newStock: 0,
        newBalance: 0,
        issuedProduction: 0,
        returns: 0,
        rebagging: 0,
        damaged: 0,
        closingStock: 0
      });
      setOpeningStockReadOnly(false);
      setDateWarning(null);
    }
  };

  // Calculate values whenever form data changes
  useEffect(() => {
    calculateValues();
  }, [calculateValues]);

  return (
    <div className="p-8">
      {/* Status Message */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          statusMessage.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
          statusMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
          statusMessage.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
          'bg-blue-50 border-blue-500 text-blue-700'
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex justify-center gap-5 mb-8 flex-wrap">
        <div className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
          formData.itemName && formData.date 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-105' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          1. Product & Date
        </div>
        <div className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
          formData.openingStock || formData.newStock || formData.issuedProduction || formData.returns || formData.rebagging || formData.damaged
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-105' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          2. Stock Details
        </div>
        <div className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
          formData.itemName && formData.date && (formData.openingStock || formData.newStock || formData.issuedProduction || formData.returns || formData.rebagging || formData.damaged)
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-105' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          3. Save Record
        </div>
      </div>

      {/* Step 1: Product & Date */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center gap-4">
          <span className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">1</span>
          <h3 className="text-xl font-semibold">🎯 Select Product & Date</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Product Name / Code
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => handleInputChange('itemName', e.target.value)}
                onBlur={checkProductAndFillOpeningStock}
                placeholder="Enter product name or code"
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-gray-700
                text-lg transition-all duration-300 focus:border-blue-500 
                focus:bg-white focus:-translate-y-1 focus:shadow-lg"
              />
              <small className="text-gray-500 text-sm">Start typing to see existing products</small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Entry Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-4 border-2 border-gray-200 text-gray-700 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg"
              />
              <small className="text-gray-500 text-sm">Today or future dates only</small>
            </div>
          </div>
          
          {dateWarning && (
            <div className="mt-4 p-3 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-700">
              {dateWarning}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Stock Input */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center gap-4">
          <span className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">2</span>
          <h3 className="text-xl font-semibold">📦 Enter Stock Details</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Opening Stock
              </label>
              <input
                type="number"
                value={formData.openingStock}
                onChange={(e) => handleInputChange('openingStock', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                readOnly={openingStockReadOnly}
                className={`w-full p-4 border-2 border-gray-200 text-gray-700 rounded-xl text-lg transition-all duration-300 ${
                  openingStockReadOnly 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : 'focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg'
                }`}
              />
              <small className="text-gray-500 text-sm">
                {openingStockReadOnly ? 'Auto-filled from previous data' : 'Set once for new product'}
              </small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                New Stock Added
              </label>
              <input
                type="number"
                value={formData.newStock}
                onChange={(e) => handleInputChange('newStock', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isDateInPast(formData.date)}
                className="w-full p-4 border-2 border-gray-200 text-gray-700 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <small className="text-gray-500 text-sm">Stock received today</small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Issued to Production
              </label>
              <input
                type="number"
                value={formData.issuedProduction}
                onChange={(e) => handleInputChange('issuedProduction', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isDateInPast(formData.date)}
                className="w-full p-4 border-2 text-gray-700 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <small className="text-gray-500 text-sm">Stock used in production</small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Returns
              </label>
              <input
                type="number"
                value={formData.returns}
                onChange={(e) => handleInputChange('returns', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isDateInPast(formData.date)}
                className="w-full p-4 border-2 text-gray-700 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <small className="text-sm text-gray-500">Stock returned from production</small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Rebagging
              </label>
              <input
                type="number"
                value={formData.rebagging}
                onChange={(e) => handleInputChange('rebagging', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isDateInPast(formData.date)}
                className="w-full p-4 border-2 text-gray-700 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <small className="text-sm text-gray-500">Stock moved to different packaging</small>
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Damaged Stock
              </label>
              <input
                type="number"
                value={formData.damaged}
                onChange={(e) => handleInputChange('damaged', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                disabled={isDateInPast(formData.date)}
                className="w-full p-4 border-2 text-gray-700 border-gray-200 rounded-xl text-lg transition-all duration-300 focus:border-blue-500 focus:bg-white focus:-translate-y-1 focus:shadow-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <small className="text-sm text-gray-500">Stock that cannot be used</small>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Results & Actions */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center gap-4">
          <span className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl">3</span>
          <h3 className="text-xl font-semibold">📊 Results & Actions</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                New Balance
              </label>
              <input
                type="number"
                value={formData.newBalance}
                className="w-full p-4 bg-gradient-to-r from-pink-400 to-red-500 text-white font-bold text-xl rounded-xl cursor-not-allowed text-center"
                readOnly
              />
              <small className="text-gray-500 text-sm">Opening + New Stock</small>
            </div>
            
            <div className="text-center">
              <label className="block mb-2 font-semibold text-gray-700 uppercase tracking-wide text-sm">
                Closing Stock
              </label>
              <input
                type="number"
                value={formData.closingStock}
                className={`w-full p-4 font-bold text-xl rounded-xl cursor-not-allowed text-center ${
                  formData.closingStock < 0 
                    ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' 
                    : 'bg-gradient-to-r from-pink-400 to-red-500 text-white'
                }`}
                readOnly
              />
              <small className="text-gray-500 text-sm">Final stock level</small>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleSaveRecord}
              disabled={isLoading || isDateInPast(formData.date)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '💾 Saving...' : '💾 Save Record'}
            </button>
            
            <button
              onClick={clearForm}
              className="px-8 py-4 bg-gradient-to-r from-pink-400 to-red-500 text-white font-semibold rounded-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              🗑️ Clear Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
