export interface SchemaField {
  fieldName: string;
  fieldType: 'string' | 'number' | 'boolean';
  description: string;
}

export type JobStatus = 'pending' | 'searching' | 'fetching' | 'normalizing' | 'completed' | 'failed';

export interface DatasetSource {
  url: string;
  title: string;
  snippet?: string;
  sourceTextLength?: number;
}

export interface DatasetJob {
  id: string;
  domain: string;
  taskType: string;
  schema: SchemaField[];
  sourceType: 'auto' | 'urls' | 'synthetic';
  customUrls: string[];
  quantity: number;
  status: JobStatus;
  progress: number;
  error?: string;
  sources: DatasetSource[];
  data: Record<string, any>[];
  createdAt: string;
}

export interface GenerateRequest {
  domain: string;
  taskType: string;
  schema: SchemaField[];
  sourceType: 'auto' | 'urls' | 'synthetic';
  customUrls: string[];
  quantity: number;
}
