import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

export function ensureUploadDir(uploadDir: string) {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
}

export function createMulterOptions(configService: ConfigService) {
  const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads');
  const maxSizeMb = Number(configService.get<string>('MAX_UPLOAD_SIZE_MB', '25'));

  ensureUploadDir(uploadDir);

  return {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        ensureUploadDir(uploadDir);
        callback(null, uploadDir);
      },
      filename: (
        _req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, filename: string) => void,
      ) => {
        const extension = extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: {
      fileSize: maxSizeMb * 1024 * 1024,
    },
    fileFilter: (
      _req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new BadRequestException('File type is not allowed'), false);
        return;
      }

      callback(null, true);
    },
  };
}

export function getStoredFilePath(uploadDir: string, storedFilename: string) {
  return join(uploadDir, storedFilename);
}
