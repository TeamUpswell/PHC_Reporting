import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { HealthcareCenter, MonthlyReport } from '../types';

/**
 * Export healthcare centers to CSV
 */
export const exportCentersToCSV = async () => {
  try {
    // Fetch all healthcare centers
    const { data: centers, error } = await supabase
      .from('healthcare_centers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    if (!centers || centers.length === 0) {
      throw new Error('No healthcare centers found to export');
    }
    
    // Define CSV headers based on your center data structure
    const headers = [
      'ID',
      'Name',
      'State',
      'LGA',
      'Ward',
      'Type',
      'Category',
      'Is Treatment Area',
      'Longitude',
      'Latitude',
      'Created At'
    ];
    
    // Convert data to CSV rows
    const rows = centers.map(center => [
      center.id,
      `"${center.name?.replace(/"/g, '""') || ''}"`, // Handle quotes in names
      `"${center.state?.replace(/"/g, '""') || ''}"`,
      `"${center.lga?.replace(/"/g, '""') || ''}"`,
      `"${center.ward?.replace(/"/g, '""') || ''}"`,
      `"${center.type?.replace(/"/g, '""') || ''}"`,
      `"${center.category?.replace(/"/g, '""') || ''}"`,
      center.is_treatment_area ? 'Yes' : 'No',
      center.longitude || '',
      center.latitude || '',
      center.created_at ? format(new Date(center.created_at), 'yyyy-MM-dd') : ''
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob and save the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const fileName = `healthcare-centers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    saveAs(blob, fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting centers:', error);
    return { success: false, error };
  }
};

/**
 * Export monthly reports to CSV
 */
export const exportReportsToCSV = async (dateRange?: { start: Date, end: Date }) => {
  try {
    console.log('Starting export of reports with date range:', dateRange);
    
    // Build the Supabase query
    let query = supabase
      .from('monthly_reports')
      .select(`
        id,
        center_id,
        center_name,
        report_month,
        fixed_doses,
        outreach_doses,
        total_doses,
        female_doses,
        male_doses,
        stock_at_hand,
        has_stockout,
        stockout_days,
        created_at
      `);
    
    // Apply date range filter if provided
    if (dateRange) {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');
      console.log(`Filtering reports from ${startStr} to ${endStr}`);
      
      // Use gte/lte for date range
      query = query.gte('report_month', startStr).lte('report_month', endStr);
    }
    
    const { data: reports, error } = await query;
    
    if (error) {
      console.error('Supabase error fetching reports:', error);
      throw error;
    }
    
    if (!reports || reports.length === 0) {
      console.warn('No reports found to export');
      throw new Error('No reports found to export');
    }
    
    console.log(`Successfully fetched ${reports.length} reports for export`);

    // Define CSV headers
    const headers = [
      'ID',
      'Center ID',
      'Center Name',
      'Report Month',
      'Fixed Doses',
      'Outreach Doses',
      'Total Doses',
      'Female Doses',
      'Male Doses',
      'Stock at Hand',
      'Had Stockout',
      'Stockout Days',
      'Created At'
    ];
    
    // Convert data to CSV rows
    const rows = reports.map(report => [
      report.id,
      report.center_id,
      `"${(report.center_name || '').replace(/"/g, '""')}"`,
      report.report_month || '',
      report.fixed_doses ?? '',
      report.outreach_doses ?? '',
      report.total_doses ?? '',
      report.female_doses ?? '',
      report.male_doses ?? '',
      report.stock_at_hand ?? '',
      report.has_stockout ? 'Yes' : 'No',
      report.stockout_days ?? '',
      report.created_at || ''
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob and save the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Include date range in filename if provided
    const fileName = `monthly-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    saveAs(blob, fileName);
    
    return { 
      success: true, 
      fileName,
      count: reports.length 
    };
  } catch (error) {
    console.error('Error in exportReportsToCSV:', error);
    return { success: false, error };
  }
};

/**
 * Export combined data to Excel (XLSX)
 * Note: This requires xlsx package to be installed
 */
export const exportToExcel = async () => {
  try {
    // This is a placeholder in case you want to implement Excel export later
    // You would need to install the xlsx package: npm install xlsx
    throw new Error('Excel export not implemented yet');
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error };
  }
};