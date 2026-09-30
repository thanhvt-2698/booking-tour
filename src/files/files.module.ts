import { Module } from '@nestjs/common';
import { FileStorageService } from './file-storage.service';

@Module({ exports: [FileStorageService], providers: [FileStorageService] })
export class FilesModule {}
