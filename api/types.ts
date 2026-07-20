export interface SchemaField {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean';
  description: string;
}

export interface DiscoveredSource {
  url: string;
  title: string;
  sourceTextLength?: number;
}

export interface DatasetJob {
  id: string;
  domain: string;
  taskType: string;
  schema: SchemaField[];
  sourceType: 'auto' | 'urls' | 'none';
  customUrls: string[];
  quantity: number;
  status: 'pending' | 'searching' | 'fetching' | 'normalizing' | 'completed' | 'failed';
  progress: number;
  sources: DiscoveredSource[];
  data: any[];
  error?: string;
  createdAt: string;
}