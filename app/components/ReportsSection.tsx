'use client';

import { useState, useEffect, useCallback } from 'react';

import { InventoryRecord } from '../types/inventory';

interface ReportsSectionProps {
  records: InventoryRecord[];
}

interface ReportData {
  outOfStockProducts: Array<{
    item_name: string;
    last_stock: number;
    last_date: string;
    days_since_stock: number;
  }>;
  stockMovements: Array<{
    date: string;
    total_in: number;
    total_out: number;
    net_change: number;
    product_count: number;
    daily_activities: Array<{
      item_name: string;
      new_stock: number;
      issued_production: number;
      returns: number;
      rebagging: number;
      damaged: number;
      opening_stock: number;
      closing_stock: number;
      net_change: number;
    }>;
  }>;
  stockBalances: Array<{
    item_name: string;
    opening_stock: number;
    closing_stock: number;
    net_change: number;
    movement_type: string;
  }>;
  productionIssues: Array<{
    item_name: string;
    total_issued: number;
    avg_daily_usage: number;
    last_issued_date: string;
    stock_level: number;
  }>;
  returnsRebagging: Array<{
    item_name: string;
    total_returns: number;
    total_rebagging: number;
    return_rate: number;
    last_activity: string;
  }>;
  damagedStock: Array<{
    item_name: string;
    total_damaged: number;
    damage_percentage: number;
    last_damage_date: string;
    total_stock_in: number;
  }>;
  stockHistory: Array<{
    item_name: string;
    total_records: number;
    first_record: string;
    last_record: string;
    stock_trend: string;
  }>;
  weeklyReport: {
    week_start: string;
    week_end: string;
    total_products: number;
    total_movements: number;
    summary: {
      total_stock_in: number;
      total_stock_out: number;
      total_returns: number;
      total_rebagging: number;
      total_damaged: number;
      net_change: number;
    };
    product_movements: Array<{
      item_name: string;
      opening_stock: number;
      closing_stock: number;
      total_stock_in: number;
      total_stock_out: number;
      total_returns: number;
      total_rebagging: number;
      total_damaged: number;
      net_change: number;
      movement_percentage: number;
      activity_level: 'high' | 'medium' | 'low';
      days_active: number;
    }>;
    daily_summary: Array<{
      date: string;
      day_name: string;
      total_transactions: number;
      net_change: number;
      top_product: string;
      total_stock_in: number;
      total_stock_out: number;
      total_returns: number;
      total_rebagging: number;
      total_damaged: number;
      products_active: number;
      most_active_product: string;
      most_active_product_movements: number;
    }>;
    efficiency_metrics: {
      return_rate: number;
      damage_rate: number;
      rebagging_rate: number;
      stock_turnover: number;
    };
  };
}

export default function ReportsSection({ records }: ReportsSectionProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReports = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      // Filter records by date range
      const filteredRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Generate all report data
      const data: ReportData = {
        outOfStockProducts: generateOutOfStockReport(filteredRecords),
        stockMovements: generateStockMovementReport(filteredRecords),
        stockBalances: generateStockBalanceReport(filteredRecords),
        productionIssues: generateProductionReport(filteredRecords),
        returnsRebagging: generateReturnsRebaggingReport(filteredRecords),
        damagedStock: generateDamagedStockReport(filteredRecords),
        stockHistory: generateStockHistoryReport(filteredRecords),
        weeklyReport: generateWeeklyReport(filteredRecords)
      };

      setReportData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating reports:', error);
      setIsLoading(false);
    } finally {
      setIsGenerating(false);
    }
  }, [records, dateRange]);

  useEffect(() => {
    if (records && records.length > 0) {
      generateReports();
    } else {
      setIsLoading(false);
    }
  }, [records, dateRange, generateReports]);



  const generateOutOfStockReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestRecord = sortedRecords[0];
        const lastDate = new Date(latestRecord.date);
        const today = new Date();
        const daysSinceStock = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          item_name: itemName,
          last_stock: latestRecord.closing_stock,
          last_date: latestRecord.date,
          days_since_stock: daysSinceStock
        };
      })
      .filter(item => item.last_stock === 0)
      .sort((a, b) => b.days_since_stock - a.days_since_stock);
  };

  const generateStockMovementReport = (filteredRecords: InventoryRecord[]) => {
    const dateGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!dateGroups.has(record.date)) {
        dateGroups.set(record.date, []);
      }
      dateGroups.get(record.date)!.push(record);
    });

    return Array.from(dateGroups.entries())
      .map(([date, records]) => {
        const totalIn = records.reduce((sum, r) => sum + r.new_stock + r.returns + r.rebagging, 0);
        const totalOut = records.reduce((sum, r) => sum + r.issued_production + r.damaged, 0);
        const netChange = totalIn - totalOut;

        // Create detailed daily activities
        const dailyActivities = records.map(record => {
          const stockIn = record.new_stock + record.returns + record.rebagging;
          const stockOut = record.issued_production + record.damaged;
          const recordNetChange = stockIn - stockOut;

          return {
            item_name: record.item_name,
            new_stock: record.new_stock,
            issued_production: record.issued_production,
            returns: record.returns,
            rebagging: record.rebagging,
            damaged: record.damaged,
            opening_stock: record.opening_stock,
            closing_stock: record.closing_stock,
            net_change: recordNetChange
          };
        });

        return {
          date,
          total_in: totalIn,
          total_out: totalOut,
          net_change: netChange,
          product_count: records.length,
          daily_activities: dailyActivities
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const generateStockBalanceReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const sortedRecords = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstRecord = sortedRecords[0];
        const lastRecord = sortedRecords[sortedRecords.length - 1];
        const netChange = lastRecord.closing_stock - firstRecord.opening_stock;
        
        let movementType = 'stable';
        if (netChange > 0) movementType = 'increasing';
        else if (netChange < 0) movementType = 'decreasing';

        return {
          item_name: itemName,
          opening_stock: firstRecord.opening_stock,
          closing_stock: lastRecord.closing_stock,
          net_change: netChange,
          movement_type: movementType
        };
      })
      .sort((a, b) => Math.abs(b.net_change) - Math.abs(a.net_change));
  };

  const generateProductionReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const totalIssued = records.reduce((sum, r) => sum + r.issued_production, 0);
        const avgDailyUsage = totalIssued / records.length;
        const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastRecord = sortedRecords[0];

        return {
          item_name: itemName,
          total_issued: totalIssued,
          avg_daily_usage: avgDailyUsage,
          last_issued_date: lastRecord.date,
          stock_level: lastRecord.closing_stock
        };
      })
      .filter(item => item.total_issued > 0)
      .sort((a, b) => b.total_issued - a.total_issued);
  };

  const generateReturnsRebaggingReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const totalReturns = records.reduce((sum, r) => sum + r.returns, 0);
        const totalRebagging = records.reduce((sum, r) => sum + r.rebagging, 0);
        const totalStockIn = records.reduce((sum, r) => sum + r.new_stock, 0);
        const returnRate = totalStockIn > 0 ? (totalReturns / totalStockIn) * 100 : 0;
        
        const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastRecord = sortedRecords[0];

        return {
          item_name: itemName,
          total_returns: totalReturns,
          total_rebagging: totalRebagging,
          return_rate: returnRate,
          last_activity: lastRecord.date
        };
      })
      .filter(item => item.total_returns > 0 || item.total_rebagging > 0)
      .sort((a, b) => (b.total_returns + b.total_rebagging) - (a.total_returns + a.total_rebagging));
  };

  const generateDamagedStockReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const totalDamaged = records.reduce((sum, r) => sum + r.damaged, 0);
        const totalStockIn = records.reduce((sum, r) => sum + r.new_stock, 0);
        const damagePercentage = totalStockIn > 0 ? (totalDamaged / totalStockIn) * 100 : 0;
        
        const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastRecord = sortedRecords[0];

        return {
          item_name: itemName,
          total_damaged: totalDamaged,
          damage_percentage: damagePercentage,
          last_damage_date: lastRecord.date,
          total_stock_in: totalStockIn
        };
      })
      .filter(item => item.total_damaged > 0)
      .sort((a, b) => b.damage_percentage - a.damage_percentage);
  };

  const generateStockHistoryReport = (filteredRecords: InventoryRecord[]) => {
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    return Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const sortedRecords = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstRecord = sortedRecords[0];
        const lastRecord = sortedRecords[sortedRecords.length - 1];
        
        let stockTrend = 'stable';
        if (lastRecord.closing_stock > firstRecord.opening_stock) stockTrend = 'increasing';
        else if (lastRecord.closing_stock < firstRecord.opening_stock) stockTrend = 'decreasing';

        return {
          item_name: itemName,
          total_records: records.length,
          first_record: firstRecord.date,
          last_record: lastRecord.date,
          stock_trend: stockTrend
        };
      })
      .sort((a, b) => b.total_records - a.total_records);
  };

  const generateWeeklyReport = (filteredRecords: InventoryRecord[]) => {
    if (filteredRecords.length === 0) {
      return {
        week_start: '',
        week_end: '',
        total_products: 0,
        total_movements: 0,
        summary: {
          total_stock_in: 0,
          total_stock_out: 0,
          total_returns: 0,
          total_rebagging: 0,
          total_damaged: 0,
          net_change: 0
        },
        product_movements: [],
        daily_summary: [],
        efficiency_metrics: {
          return_rate: 0,
          damage_rate: 0,
          rebagging_rate: 0,
          stock_turnover: 0
        }
      };
    }

    // Calculate week boundaries
    const sortedRecords = filteredRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const weekStart = sortedRecords[0].date;
    const weekEnd = sortedRecords[sortedRecords.length - 1].date;

    // Products will be counted after filtering for activity
    
    // Calculate summary metrics
    const summary = {
      total_stock_in: filteredRecords.reduce((sum, r) => sum + r.new_stock, 0),
      total_stock_out: filteredRecords.reduce((sum, r) => sum + r.issued_production, 0),
      total_returns: filteredRecords.reduce((sum, r) => sum + r.returns, 0),
      total_rebagging: filteredRecords.reduce((sum, r) => sum + r.rebagging, 0),
      total_damaged: filteredRecords.reduce((sum, r) => sum + r.damaged, 0),
      net_change: filteredRecords.reduce((sum, r) => sum + (r.new_stock - r.issued_production), 0)
    };

    // Generate comprehensive product movements
    const productGroups = new Map<string, InventoryRecord[]>();
    
    filteredRecords.forEach(record => {
      if (!productGroups.has(record.item_name)) {
        productGroups.set(record.item_name, []);
      }
      productGroups.get(record.item_name)!.push(record);
    });

    const productMovements = Array.from(productGroups.entries())
      .map(([itemName, records]) => {
        const sortedRecords = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const openingStock = sortedRecords[0].opening_stock;
        const closingStock = sortedRecords[sortedRecords.length - 1].closing_stock;
        
        const totals = {
          stock_in: records.reduce((sum, r) => sum + r.new_stock, 0),
          stock_out: records.reduce((sum, r) => sum + r.issued_production, 0),
          returns: records.reduce((sum, r) => sum + r.returns, 0),
          rebagging: records.reduce((sum, r) => sum + r.rebagging, 0),
          damaged: records.reduce((sum, r) => sum + r.damaged, 0)
        };
        
        const netChange = totals.stock_in - totals.stock_out;
        const totalActivity = totals.stock_in + totals.stock_out + totals.returns + totals.rebagging + totals.damaged;
        const movementPercentage = openingStock > 0 ? (Math.abs(netChange) / openingStock) * 100 : 0;
        
        // Calculate activity level based on total movements
        let activityLevel: 'high' | 'medium' | 'low' = 'low';
        if (totalActivity > 100) activityLevel = 'high';
        else if (totalActivity > 50) activityLevel = 'medium';
        
        // Count unique days with activity
        const uniqueDays = new Set(records.map(r => r.date)).size;
        
        return {
          item_name: itemName,
          opening_stock: openingStock,
          closing_stock: closingStock,
          total_stock_in: totals.stock_in,
          total_stock_out: totals.stock_out,
          total_returns: totals.returns,
          total_rebagging: totals.rebagging,
          total_damaged: totals.damaged,
          net_change: netChange,
          movement_percentage: movementPercentage,
          activity_level: activityLevel,
          days_active: uniqueDays
        };
      })
      .filter(product => {
        // Filter out products with no activity (all totals are zero)
        const totalActivity = product.total_stock_in + product.total_stock_out + product.total_returns + product.total_rebagging + product.total_damaged;
        return totalActivity > 0;
      })
      .sort((a, b) => {
        // Sort by total activity (stock in + stock out + returns + rebagging + damaged)
        const aActivity = a.total_stock_in + a.total_stock_out + a.total_returns + a.total_rebagging + a.total_damaged;
        const bActivity = b.total_stock_in + b.total_stock_out + b.total_returns + b.total_rebagging + b.total_damaged;
        return bActivity - aActivity;
      });

    // Generate daily summary
    const dailyGroups = new Map<string, InventoryRecord[]>();
    filteredRecords.forEach(record => {
      if (!dailyGroups.has(record.date)) {
        dailyGroups.set(record.date, []);
      }
      dailyGroups.get(record.date)!.push(record);
    });

    const dailySummary = Array.from(dailyGroups.entries())
      .map(([date, records]) => {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
        const total_transactions = records.length;
        
        // Calculate detailed daily metrics
        const dailyMetrics = {
          stock_in: records.reduce((sum, r) => sum + r.new_stock, 0),
          stock_out: records.reduce((sum, r) => sum + r.issued_production, 0),
          returns: records.reduce((sum, r) => sum + r.returns, 0),
          rebagging: records.reduce((sum, r) => sum + r.rebagging, 0),
          damaged: records.reduce((sum, r) => sum + r.damaged, 0)
        };
        
        const netChange = dailyMetrics.stock_in - dailyMetrics.stock_out;
        
        // Find products active on this day
        const uniqueProducts = new Set(records.map(r => r.item_name));
        
        // Find most active product (highest total movements)
        const productActivity = new Map<string, number>();
        records.forEach(record => {
          const activity = record.new_stock + record.issued_production + record.returns + record.rebagging + record.damaged;
          productActivity.set(record.item_name, (productActivity.get(record.item_name) || 0) + activity);
        });
        
        const mostActiveProduct = Array.from(productActivity.entries())
          .sort((a, b) => b[1] - a[1])[0];
        
        // Find top product by net change
        const productChanges = new Map<string, number>();
        records.forEach(record => {
          const change = record.new_stock - record.issued_production;
          productChanges.set(record.item_name, (productChanges.get(record.item_name) || 0) + change);
        });
        
        const topProduct = Array.from(productChanges.entries())
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0] || 'None';

        return {
          date,
          day_name: dayName,
          total_transactions: total_transactions,
          net_change: netChange,
          top_product: topProduct,
          total_stock_in: dailyMetrics.stock_in,
          total_stock_out: dailyMetrics.stock_out,
          total_returns: dailyMetrics.returns,
          total_rebagging: dailyMetrics.rebagging,
          total_damaged: dailyMetrics.damaged,
          products_active: uniqueProducts.size,
          most_active_product: mostActiveProduct?.[0] || 'None',
          most_active_product_movements: mostActiveProduct?.[1] || 0
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate efficiency metrics
    const totalStockIn = summary.total_stock_in;
    const efficiencyMetrics = {
      return_rate: totalStockIn > 0 ? (summary.total_returns / totalStockIn) * 100 : 0,
      damage_rate: totalStockIn > 0 ? (summary.total_damaged / totalStockIn) * 100 : 0,
      rebagging_rate: totalStockIn > 0 ? (summary.total_rebagging / totalStockIn) * 100 : 0,
      stock_turnover: summary.total_stock_out > 0 ? summary.total_stock_out / (summary.total_stock_in || 1) : 0
    };

    return {
      week_start: weekStart,
      week_end: weekEnd,
      total_products: productMovements.length, // Only count products with activity
      total_movements: filteredRecords.length,
      summary,
      product_movements: productMovements,
      daily_summary: dailySummary,
      efficiency_metrics: efficiencyMetrics
    };
  };

  const exportReport = (reportType: string) => {
    if (!reportData) return;

    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'outOfStock':
        csvContent = generateOutOfStockCSV(reportData.outOfStockProducts);
        filename = `out_of_stock_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'stockMovements':
        csvContent = generateStockMovementsCSV(reportData.stockMovements);
        filename = `stock_movements_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'stockBalances':
        csvContent = generateStockBalancesCSV(reportData.stockBalances);
        filename = `stock_balances_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'production':
        csvContent = generateProductionCSV(reportData.productionIssues);
        filename = `production_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'returnsRebagging':
        csvContent = generateReturnsRebaggingCSV(reportData.returnsRebagging);
        filename = `returns_rebagging_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'damagedStock':
        csvContent = generateDamagedStockCSV(reportData.damagedStock);
        filename = `damaged_stock_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'stockHistory':
        csvContent = generateStockHistoryCSV(reportData.stockHistory);
        filename = `stock_history_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        break;
      case 'weeklyReport':
        csvContent = generateWeeklyReportCSV(reportData.weeklyReport);
        filename = `weekly_report_${reportData.weeklyReport.week_start}_to_${reportData.weeklyReport.week_end}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // CSV generation functions
  const generateOutOfStockCSV = (data: ReportData['outOfStockProducts']) => {
    const headers = ['Product Name', 'Last Stock', 'Last Date', 'Days Since Stock'];
    const rows = data.map(item => [item.item_name, item.last_stock, item.last_date, item.days_since_stock]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateStockMovementsCSV = (data: ReportData['stockMovements']) => {
    const headers = ['Date', 'Total Stock In', 'Total Stock Out', 'Net Change', 'Product Count'];
    const rows = data.map(item => [item.date, item.total_in, item.total_out, item.net_change, item.product_count]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateDailyActivitiesCSV = (activities: ReportData['stockMovements'][0]['daily_activities']) => {
    const headers = ['Product Name', 'New Stock', 'Issued to Production', 'Returns', 'Rebagging', 'Damaged', 'Opening Stock', 'Closing Stock', 'Net Change'];
    const rows = activities.map(activity => [
      activity.item_name,
      activity.new_stock,
      activity.issued_production,
      activity.returns,
      activity.rebagging,
      activity.damaged,
      activity.opening_stock,
      activity.closing_stock,
      activity.net_change
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateStockBalancesCSV = (data: ReportData['stockBalances']) => {
    const headers = ['Product Name', 'Opening Stock', 'Closing Stock', 'Net Change', 'Movement Type'];
    const rows = data.map(item => [item.item_name, item.opening_stock, item.closing_stock, item.net_change, item.movement_type]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateProductionCSV = (data: ReportData['productionIssues']) => {
    const headers = ['Product Name', 'Total Issued', 'Average Daily Usage', 'Last Issued Date', 'Current Stock Level'];
    const rows = data.map(item => [item.item_name, item.total_issued, item.avg_daily_usage.toFixed(2), item.last_issued_date, item.stock_level]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateReturnsRebaggingCSV = (data: ReportData['returnsRebagging']) => {
    const headers = ['Product Name', 'Total Returns', 'Total Rebagging', 'Return Rate (%)', 'Last Activity'];
    const rows = data.map(item => [item.item_name, item.total_returns, item.total_rebagging, item.return_rate.toFixed(2), item.last_activity]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateDamagedStockCSV = (data: ReportData['damagedStock']) => {
    const headers = ['Product Name', 'Total Damaged', 'Damage Percentage (%)', 'Last Damage Date', 'Total Stock In'];
    const rows = data.map(item => [item.item_name, item.total_damaged, item.damage_percentage.toFixed(2), item.last_damage_date, item.total_stock_in]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateStockHistoryCSV = (data: ReportData['stockHistory']) => {
    const headers = ['Product Name', 'Total Records', 'First Record Date', 'Last Record Date', 'Stock Trend'];
    const rows = data.map(item => [item.item_name, item.total_records, item.first_record, item.last_record, item.stock_trend]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const generateWeeklyReportCSV = (data: ReportData['weeklyReport']) => {
    const csvSections = [];
    
    // Header section
    csvSections.push('WEEKLY INVENTORY REPORT');
    csvSections.push(`Week: ${data.week_start} to ${data.week_end}`);
    csvSections.push(`Generated: ${new Date().toLocaleDateString()}`);
    csvSections.push('');
    
    // Summary section
    csvSections.push('SUMMARY METRICS');
    csvSections.push('Metric,Value');
    csvSections.push(`Total Products,${data.total_products}`);
    csvSections.push(`Total Movements,${data.total_movements}`);
    csvSections.push(`Stock In,${data.summary.total_stock_in}`);
    csvSections.push(`Stock Out,${data.summary.total_stock_out}`);
    csvSections.push(`Returns,${data.summary.total_returns}`);
    csvSections.push(`Rebagging,${data.summary.total_rebagging}`);
    csvSections.push(`Damaged,${data.summary.total_damaged}`);
    csvSections.push(`Net Change,${data.summary.net_change}`);
    csvSections.push('');
    
    // Efficiency metrics
    csvSections.push('EFFICIENCY METRICS');
    csvSections.push('Metric,Percentage');
    csvSections.push(`Return Rate,${data.efficiency_metrics.return_rate.toFixed(2)}%`);
    csvSections.push(`Damage Rate,${data.efficiency_metrics.damage_rate.toFixed(2)}%`);
    csvSections.push(`Rebagging Rate,${data.efficiency_metrics.rebagging_rate.toFixed(2)}%`);
    csvSections.push(`Stock Turnover,${data.efficiency_metrics.stock_turnover.toFixed(2)}`);
    csvSections.push('');
    
    // Product movements
    csvSections.push('PRODUCT MOVEMENTS');
    csvSections.push('Product,Opening Stock,Closing Stock,Stock In,Stock Out,Returns,Rebagging,Damaged,Net Change,Current Stock,Movement %,Activity Level,Days Active');
    data.product_movements.forEach(item => {
      csvSections.push(`${item.item_name},${item.opening_stock},${item.closing_stock},${item.total_stock_in},${item.total_stock_out},${item.total_returns},${item.total_rebagging},${item.total_damaged},${item.net_change},${item.closing_stock},${item.movement_percentage.toFixed(2)}%,${item.activity_level},${item.days_active}`);
    });
    csvSections.push('');
    
    // Daily summary
    csvSections.push('DAILY SUMMARY');
    csvSections.push('Date,Day,Transactions,Net Change,Stock In,Stock Out,Returns,Rebagging,Damaged,Products Active,Top Product,Most Active Product,Most Active Movements');
    data.daily_summary.forEach(day => {
      csvSections.push(`${day.date},${day.day_name},${day.total_transactions},${day.net_change},${day.total_stock_in},${day.total_stock_out},${day.total_returns},${day.total_rebagging},${day.total_damaged},${day.products_active},${day.top_product},${day.most_active_product},${day.most_active_product_movements}`);
    });
    
    return csvSections.join('\n');
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2 mb-4"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Generating reports...</p>
            <p className="text-sm text-gray-500">Analyzing your inventory data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-800 mb-2">📊 Inventory Reports</h2>
        <p className="text-gray-600">Comprehensive insights and analytics for your inventory management</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">📅 Report Period</h3>
            <p className="text-sm text-gray-600">Select the date range for your reports</p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={generateReports}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:-translate-y-1 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? '🔄 Generating...' : '🔄 Refresh Reports'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setSelectedReport('overview')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'overview'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">📈</div>
          <div className="font-semibold">Overview</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('outOfStock')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'outOfStock'
              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">🔴</div>
          <div className="font-semibold">Out of Stock</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('stockMovements')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'stockMovements'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold">Stock Movements</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('production')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'production'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">🏭</div>
          <div className="font-semibold">Production</div>
        </button>
      </div>

      {/* Additional Report Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setSelectedReport('stockBalances')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'stockBalances'
              ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">⚖️</div>
          <div className="font-semibold">Stock Balances</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('returnsRebagging')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'returnsRebagging'
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">🔄</div>
          <div className="font-semibold">Returns/Rebagging</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('damagedStock')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'damagedStock'
              ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-semibold">Damaged Stock</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('stockHistory')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'stockHistory'
              ? 'bg-gradient-to-r from-teal-500 to-green-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">📚</div>
          <div className="font-semibold">Stock History</div>
        </button>
        
        <button
          onClick={() => setSelectedReport('weeklyReport')}
          className={`p-4 rounded-2xl text-center transition-all duration-300 ${
            selectedReport === 'weeklyReport'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:shadow-lg hover:-translate-y-1'
          }`}
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="font-semibold">Weekly Report</div>
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {selectedReport === 'overview' && (
          <div className="p-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">📈 Executive Summary</h3>
            
            {reportData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                  <div className="text-3xl font-bold text-red-600">{reportData.outOfStockProducts.length}</div>
                  <div className="text-red-700 font-semibold">Out of Stock Products</div>
                  <div className="text-red-600 text-sm mt-2">
                    {reportData.outOfStockProducts.length > 0 ? 
                      `${reportData.outOfStockProducts[0].item_name} (${reportData.outOfStockProducts[0].days_since_stock} days)` : 
                      'All products in stock'
                    }
                  </div>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.stockMovements.reduce((sum, m) => sum + m.total_in, 0)}
                  </div>
                  <div className="text-green-700 font-semibold">Total Stock In</div>
                  <div className="text-green-600 text-sm mt-2">Period total</div>
                </div>
                
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {reportData.stockMovements.reduce((sum, m) => sum + m.total_out, 0)}
                  </div>
                  <div className="text-orange-700 font-semibold">Total Stock Out</div>
                  <div className="text-orange-600 text-sm mt-2">Production + Damaged</div>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">
                    {reportData.productionIssues.length}
                  </div>
                  <div className="text-blue-700 font-semibold">Active Products</div>
                  <div className="text-blue-600 text-sm mt-2">With production activity</div>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">
                    {reportData.returnsRebagging.length}
                  </div>
                  <div className="text-purple-700 font-semibold">Returns/Rebagging</div>
                  <div className="text-purple-600 text-sm mt-2">Products with returns</div>
                </div>
                
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                  <div className="text-3xl font-bold text-yellow-600">
                    {reportData.damagedStock.length}
                  </div>
                  <div className="text-yellow-700 font-semibold">Damaged Stock</div>
                  <div className="text-yellow-600 text-sm mt-2">Products with damage</div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedReport === 'outOfStock' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">🔴 Out of Stock Products</h3>
              <button
                onClick={() => exportReport('outOfStock')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            {reportData?.outOfStockProducts.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <div className="text-6xl mb-4">✅</div>
                <h4 className="text-xl font-semibold mb-2">All Products In Stock!</h4>
                <p>Great job! No products are currently out of stock.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reportData?.outOfStockProducts.map((item) => (
                  <div key={item.item_name} className="border border-red-200 rounded-xl p-4 bg-red-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-semibold text-red-800">{item.item_name}</h4>
                        <p className="text-red-600">Last stock: {item.last_stock} on {item.last_date}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">{item.days_since_stock}</div>
                        <div className="text-red-600 text-sm">Days since stock</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedReport === 'stockMovements' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">📊 Stock Movement Analysis</h3>
              <div className="flex gap-2">
                {selectedDate && (
                  <button
                    onClick={() => {
                      const movement = reportData?.stockMovements.find(m => m.date === selectedDate);
                      if (movement) {
                        const csvContent = generateDailyActivitiesCSV(movement.daily_activities);
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `daily_activities_${selectedDate}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    📊 Export Daily Details
                  </button>
                )}
                <button
                  onClick={() => exportReport('stockMovements')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  📊 Export Summary CSV
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {reportData?.stockMovements.map((movement) => (
                <div key={movement.date} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedDate(selectedDate === movement.date ? '' : movement.date)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">{movement.date}</h4>
                        <p className="text-gray-600">{movement.product_count} products updated</p>
                      </div>
                      <div className="text-right">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-600">+{movement.total_in}</div>
                            <div className="text-green-600 text-sm">Stock In</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-600">-{movement.total_out}</div>
                            <div className="text-red-600 text-sm">Stock Out</div>
                          </div>
                          <div>
                            <div className={`text-lg font-bold ${
                              movement.net_change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movement.net_change > 0 ? '+' : ''}{movement.net_change}
                            </div>
                            <div className="text-gray-600 text-sm">Net Change</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-sm text-blue-600">
                        {selectedDate === movement.date ? '▼ Hide Details' : '▶ Click to view daily activities'}
                      </span>
                    </div>
                  </div>
                  
                  {selectedDate === movement.date && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h5 className="text-lg font-semibold text-gray-800 mb-4">📋 Daily Activities Breakdown</h5>
                      <div className="space-y-3">
                        {movement.daily_activities.map((activity, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h6 className="font-semibold text-gray-800">{activity.item_name}</h6>
                                <div className="text-sm text-gray-600">
                                  Opening: {activity.opening_stock} → Closing: {activity.closing_stock}
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                activity.net_change > 0 ? 'bg-green-100 text-green-800' :
                                activity.net_change < 0 ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {activity.net_change > 0 ? '+' : ''}{activity.net_change}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-semibold text-green-700">+{activity.new_stock}</div>
                                <div className="text-green-600">New Stock</div>
                              </div>
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="font-semibold text-blue-700">+{activity.returns}</div>
                                <div className="text-blue-600">Returns</div>
                              </div>
                              <div className="text-center p-2 bg-purple-50 rounded">
                                <div className="font-semibold text-purple-700">+{activity.rebagging}</div>
                                <div className="text-purple-600">Rebagging</div>
                              </div>
                              <div className="text-center p-2 bg-orange-50 rounded">
                                <div className="font-semibold text-orange-700">-{activity.issued_production}</div>
                                <div className="text-orange-600">Issued</div>
                              </div>
                              <div className="text-center p-2 bg-red-50 rounded">
                                <div className="font-semibold text-red-700">-{activity.damaged}</div>
                                <div className="text-red-600">Damaged</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'production' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">🏭 Production Usage Report</h3>
              <button
                onClick={() => exportReport('production')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {reportData?.productionIssues.map((item) => (
                <div key={item.item_name} className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-orange-800">{item.item_name}</h4>
                      <p className="text-orange-600">Last issued: {item.last_issued_date}</p>
                    </div>
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-orange-600">{item.total_issued}</div>
                          <div className="text-orange-600 text-sm">Total Issued</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-600">{item.avg_daily_usage.toFixed(1)}</div>
                          <div className="text-orange-600 text-sm">Avg Daily</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-600">{item.stock_level}</div>
                          <div className="text-orange-600 text-sm">Current Stock</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'stockBalances' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">⚖️ Stock Balance Report</h3>
              <button
                onClick={() => exportReport('stockBalances')}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {reportData?.stockBalances.map((item) => (
                <div key={item.item_name} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">{item.item_name}</h4>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Opening: {item.opening_stock}</span>
                        <span>Closing: {item.closing_stock}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        item.movement_type === 'increasing' ? 'bg-green-100 text-green-800' :
                        item.movement_type === 'decreasing' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.movement_type === 'increasing' ? '📈' : 
                         item.movement_type === 'decreasing' ? '📉' : '➡️'} 
                        {item.movement_type}
                      </div>
                      <div className={`text-lg font-bold mt-1 ${
                        item.net_change > 0 ? 'text-green-600' : 
                        item.net_change < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {item.net_change > 0 ? '+' : ''}{item.net_change}
                      </div>
                      <div className="text-gray-600 text-sm">Net Change</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'returnsRebagging' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">🔄 Returns & Rebagging Report</h3>
              <button
                onClick={() => exportReport('returnsRebagging')}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {reportData?.returnsRebagging.map((item) => (
                <div key={item.item_name} className="border border-purple-200 rounded-xl p-4 bg-purple-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-purple-800">{item.item_name}</h4>
                      <p className="text-purple-600">Last activity: {item.last_activity}</p>
                    </div>
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-purple-600">{item.total_returns}</div>
                          <div className="text-purple-600 text-sm">Returns</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">{item.total_rebagging}</div>
                          <div className="text-purple-600 text-sm">Rebagging</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">{item.return_rate.toFixed(1)}%</div>
                          <div className="text-purple-600 text-sm">Return Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'damagedStock' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">⚠️ Damaged Stock Report</h3>
              <button
                onClick={() => exportReport('damagedStock')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {reportData?.damagedStock.map((item) => (
                <div key={item.item_name} className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-yellow-800">{item.item_name}</h4>
                      <p className="text-yellow-600">Last damage: {item.last_damage_date}</p>
                    </div>
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-yellow-600">{item.total_damaged}</div>
                          <div className="text-yellow-600 text-sm">Damaged</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">{item.damage_percentage.toFixed(1)}%</div>
                          <div className="text-yellow-600 text-sm">Damage %</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">{item.total_stock_in}</div>
                          <div className="text-yellow-600 text-sm">Total Stock In</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'stockHistory' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">📚 Stock History Report</h3>
              <button
                onClick={() => exportReport('stockHistory')}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="space-y-4">
              {reportData?.stockHistory.map((item) => (
                <div key={item.item_name} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">{item.item_name}</h4>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>First: {item.first_record}</span>
                        <span>Last: {item.last_record}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                        item.stock_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                        item.stock_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.stock_trend === 'increasing' ? '📈' : 
                         item.stock_trend === 'decreasing' ? '📉' : '➡️'} 
                        {item.stock_trend}
                      </div>
                      <div className="text-lg font-bold text-gray-800">{item.total_records}</div>
                      <div className="text-gray-600 text-sm">Total Records</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedReport === 'weeklyReport' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">📋 Weekly Inventory Report</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🖨️ Print Report
                </button>
                <button
                  onClick={() => exportReport('weeklyReport')}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  📊 Export CSV
                </button>
              </div>
            </div>
            
            {reportData?.weeklyReport && (
              <div className="space-y-6 print:space-y-4">
                {/* Header Section */}
                <div className="text-center border-b-2 border-gray-200 pb-4 print:border-b print:pb-2">
                  <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">WEEKLY INVENTORY REPORT</h1>
                  <p className="text-lg text-gray-600 print:text-base">
                    Week of {new Date(reportData.weeklyReport.week_start).toLocaleDateString()} - {new Date(reportData.weeklyReport.week_end).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 print:text-xs">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </p>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 print:border print:p-2">
                    <div className="text-2xl font-bold text-blue-600 print:text-lg">{reportData.weeklyReport.total_products}</div>
                    <div className="text-blue-700 font-semibold text-sm print:text-xs">Total Products</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200 print:border print:p-2">
                    <div className="text-2xl font-bold text-green-600 print:text-lg">{reportData.weeklyReport.total_movements}</div>
                    <div className="text-green-700 font-semibold text-sm print:text-xs">Total Movements</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 print:border print:p-2">
                    <div className="text-2xl font-bold text-purple-600 print:text-lg">{reportData.weeklyReport.summary.total_stock_in}</div>
                    <div className="text-purple-700 font-semibold text-sm print:text-xs">Stock In</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 print:border print:p-2">
                    <div className="text-2xl font-bold text-orange-600 print:text-lg">{reportData.weeklyReport.summary.total_stock_out}</div>
                    <div className="text-orange-700 font-semibold text-sm print:text-xs">Stock Out</div>
                  </div>
                </div>

                {/* Efficiency Metrics */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 print:border print:p-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 print:text-base">📊 Efficiency Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-800 print:text-base">
                        {reportData.weeklyReport.efficiency_metrics.return_rate.toFixed(1)}%
                      </div>
                      <div className="text-gray-600 text-sm print:text-xs">Return Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-800 print:text-base">
                        {reportData.weeklyReport.efficiency_metrics.damage_rate.toFixed(1)}%
                      </div>
                      <div className="text-gray-600 text-sm print:text-xs">Damage Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-800 print:text-base">
                        {reportData.weeklyReport.efficiency_metrics.rebagging_rate.toFixed(1)}%
                      </div>
                      <div className="text-gray-600 text-sm print:text-xs">Rebagging Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-800 print:text-base">
                        {reportData.weeklyReport.efficiency_metrics.stock_turnover.toFixed(2)}
                      </div>
                      <div className="text-gray-600 text-sm print:text-xs">Stock Turnover</div>
                    </div>
                  </div>
                </div>

                {/* Product Movements Table */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 print:border print:p-2">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold text-blue-800 print:text-base">📦 Product Movements Summary</h4>
                    <div className="text-sm text-blue-600 print:text-xs">
                      Showing {reportData.weeklyReport.product_movements.length} products with activity
                    </div>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-sm print:text-xs">
                      <thead>
                        <tr className="border-b border-blue-200 print:border-b">
                          <th className="text-left py-2 font-semibold text-blue-800 print:py-1">Product</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Opening</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Closing</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Stock In</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Stock Out</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Returns</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Rebagging</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Damaged</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Net Change</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Current Stock</th>
                          <th className="text-center py-2 font-semibold text-blue-800 print:py-1">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.weeklyReport.product_movements.map((product, index) => (
                          <tr key={index} className="border-b border-blue-100 print:border-b hover:bg-blue-25">
                            <td className="py-2 text-gray-800 font-medium print:py-1">{product.item_name}</td>
                            <td className="py-2 text-center text-gray-700 print:py-1">{product.opening_stock}</td>
                            <td className="py-2 text-center text-gray-700 print:py-1">{product.closing_stock}</td>
                            <td className="py-2 text-center text-green-600 font-semibold print:py-1">{product.total_stock_in}</td>
                            <td className="py-2 text-center text-red-600 font-semibold print:py-1">{product.total_stock_out}</td>
                            <td className="py-2 text-center text-purple-600 print:py-1">{product.total_returns}</td>
                            <td className="py-2 text-center text-orange-600 print:py-1">{product.total_rebagging}</td>
                            <td className="py-2 text-center text-red-500 print:py-1">{product.total_damaged}</td>
                            <td className={`py-2 text-center font-bold print:py-1 ${
                              product.net_change > 0 ? 'text-green-600' : 
                              product.net_change < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {product.net_change > 0 ? '+' : ''}{product.net_change}
                            </td>
                            <td className="py-2 text-center text-gray-700 font-semibold print:py-1">
                              {product.closing_stock}
                            </td>
                            <td className="py-2 text-center print:py-1">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                product.activity_level === 'high' ? 'bg-green-100 text-green-800' :
                                product.activity_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              } print:text-xs`}>
                                {product.activity_level === 'high' ? '🔥' : 
                                 product.activity_level === 'medium' ? '⚡' : '📊'} {product.activity_level}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Activity Level Legend */}
                  <div className="mt-4 flex justify-center space-x-4 print:space-x-2">
                    <div className="flex items-center text-xs text-gray-600 print:text-xs">
                      <span className="w-3 h-3 bg-green-100 rounded-full mr-1"></span>
                      <span>High Activity (100+ movements)</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 print:text-xs">
                      <span className="w-3 h-3 bg-yellow-100 rounded-full mr-1"></span>
                      <span>Medium Activity (50-100 movements)</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 print:text-xs">
                      <span className="w-3 h-3 bg-gray-100 rounded-full mr-1"></span>
                      <span>Low Activity (&lt;50 movements)</span>
                    </div>
                  </div>
                </div>

                {/* Daily Summary */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200 print:border print:p-2">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 print:text-base">📅 Daily Activity Breakdown</h4>
                  
                  <div className="space-y-4 print:space-y-3">
                    {reportData.weeklyReport.daily_summary.map((day, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 print:border print:p-3">
                        {/* Day Header */}
                        <div className="flex justify-between items-center mb-3 print:mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-bold text-gray-800 print:text-base">{day.day_name}</div>
                            <div className="text-sm text-gray-600 print:text-xs">{day.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 print:text-xs">Products Active</div>
                            <div className="text-lg font-bold text-blue-600 print:text-base">{day.products_active}</div>
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2 mb-3 print:mb-2">
                          <div className="text-center bg-green-50 p-2 rounded-lg print:border print:p-1">
                            <div className="text-lg font-bold text-green-600 print:text-sm">{day.total_stock_in}</div>
                            <div className="text-xs text-green-700 print:text-xs">Stock In</div>
                          </div>
                          <div className="text-center bg-red-50 p-2 rounded-lg print:border print:p-1">
                            <div className="text-lg font-bold text-red-600 print:text-sm">{day.total_stock_out}</div>
                            <div className="text-xs text-red-700 print:text-xs">Stock Out</div>
                          </div>
                          <div className="text-center bg-purple-50 p-2 rounded-lg print:border print:p-1">
                            <div className="text-lg font-bold text-purple-600 print:text-sm">{day.total_returns}</div>
                            <div className="text-xs text-purple-700 print:text-xs">Returns</div>
                          </div>
                          <div className="text-center bg-orange-50 p-2 rounded-lg print:border print:p-1">
                            <div className="text-lg font-bold text-orange-600 print:text-sm">{day.total_rebagging}</div>
                            <div className="text-xs text-orange-700 print:text-xs">Rebagging</div>
                          </div>
                          <div className="text-center bg-red-50 p-2 rounded-lg print:border print:p-1">
                            <div className="text-lg font-bold text-red-500 print:text-sm">{day.total_damaged}</div>
                            <div className="text-xs text-red-600 print:text-xs">Damaged</div>
                          </div>
                        </div>

                        {/* Net Change and Transactions */}
                        <div className="flex justify-between items-center mb-3 print:mb-2">
                          <div className="flex items-center space-x-4">
                            <div>
                              <div className="text-sm text-gray-600 print:text-xs">Net Change</div>
                              <div className={`text-lg font-bold print:text-sm ${
                                day.net_change > 0 ? 'text-green-600' : 
                                day.net_change < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {day.net_change > 0 ? '+' : ''}{day.net_change}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 print:text-xs">Transactions</div>
                              <div className="text-lg font-bold text-gray-800 print:text-sm">{day.total_transactions}</div>
                            </div>
                          </div>
                        </div>

                        {/* Top Products */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
                          <div className="bg-blue-50 p-3 rounded-lg print:border print:p-2">
                            <div className="text-sm font-semibold text-blue-800 print:text-xs mb-1">📈 Top Product (Net Change)</div>
                            <div className="text-sm text-blue-700 print:text-xs">{day.top_product}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg print:border print:p-2">
                            <div className="text-sm font-semibold text-green-800 print:text-xs mb-1">🔥 Most Active Product</div>
                            <div className="text-sm text-green-700 print:text-xs">
                              {day.most_active_product} ({day.most_active_product_movements} movements)
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200 print:border print:p-2">
                    <div className="text-xl font-bold text-green-600 print:text-base">{reportData.weeklyReport.summary.total_returns}</div>
                    <div className="text-green-700 font-semibold text-sm print:text-xs">Total Returns</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 print:border print:p-2">
                    <div className="text-xl font-bold text-purple-600 print:text-base">{reportData.weeklyReport.summary.total_rebagging}</div>
                    <div className="text-purple-700 font-semibold text-sm print:text-xs">Total Rebagging</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200 print:border print:p-2">
                    <div className="text-xl font-bold text-red-600 print:text-base">{reportData.weeklyReport.summary.total_damaged}</div>
                    <div className="text-red-700 font-semibold text-sm print:text-xs">Total Damaged</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
