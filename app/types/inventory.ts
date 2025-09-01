export interface InventoryRecord {
  id?: number;
  item_name: string;
  date: string;
  opening_stock: number;
  new_stock: number;
  new_balance: number;
  issued_production: number;
  returns: number;
  rebagging: number;
  damaged: number;
  closing_stock: number;
  timestamp: string;
}

export interface FormData {
  itemName: string;
  date: string;
  openingStock: number;
  newStock: number;
  newBalance: number;
  issuedProduction: number;
  returns: number;
  rebagging: number;
  damaged: number;
  closingStock: number;
}

export type StatusMessageType = 'info' | 'success' | 'warning' | 'error';




