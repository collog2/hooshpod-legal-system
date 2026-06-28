import api from './client';
import type { Document, EntityType, PaginatedResponse } from '@/types';

export interface DocumentsQuery {
  page?: number;
  limit?: number;
  entityType?: EntityType;
  entityId?: string;
  search?: string;
}

export async function fetchDocuments(
  query: DocumentsQuery = {},
): Promise<PaginatedResponse<Document>> {
  const { data } = await api.get<PaginatedResponse<Document>>('/documents', { params: query });
  return data;
}

export async function fetchDocument(id: string): Promise<Document> {
  const { data } = await api.get<Document>(`/documents/${id}`);
  return data;
}

export async function uploadDocument(payload: {
  file: File;
  entityType: EntityType;
  entityId: string;
  description?: string;
}): Promise<Document> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('entityType', payload.entityType);
  formData.append('entityId', payload.entityId);

  if (payload.description) {
    formData.append('description', payload.description);
  }

  const { data } = await api.post<Document>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function deleteDocument(id: string): Promise<Document> {
  const { data } = await api.delete<Document>(`/documents/${id}`);
  return data;
}

export function getDocumentDownloadUrl(id: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return `${baseUrl}/documents/${id}/download`;
}

export async function downloadDocument(id: string, filename: string): Promise<void> {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
