export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COUNSEL = 'COUNSEL',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export enum CaseType {
  LITIGATION = 'LITIGATION',
  ARBITRATION = 'ARBITRATION',
  REGULATORY = 'REGULATORY',
  ADVISORY = 'ADVISORY',
  OTHER = 'OTHER',
}

export enum CaseStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum EntityType {
  CASE = 'CASE',
  CONTRACT = 'CONTRACT',
  NOTICE = 'NOTICE',
}

export interface InvolvedParty {
  name: string;
  role?: string;
  contact?: string;
}

export interface CaseOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Case {
  id: string;
  title: string;
  referenceCode: string;
  type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  ownerId: string;
  involvedParties: InvolvedParty[];
  description?: string | null;
  openedDate?: string | null;
  closedDate?: string | null;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
  owner: CaseOwner;
}

export interface CreateCasePayload {
  title: string;
  referenceCode: string;
  type: CaseType;
  status?: CaseStatus;
  priority?: CasePriority;
  ownerId?: string;
  involvedParties?: InvolvedParty[];
  description?: string;
  openedDate?: string;
  closedDate?: string;
}

export type UpdateCasePayload = Partial<CreateCasePayload>;

export interface DocumentUploader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Document {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  entityType: EntityType;
  entityId: string;
  uploadedById: string;
  description?: string | null;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy: DocumentUploader;
}
