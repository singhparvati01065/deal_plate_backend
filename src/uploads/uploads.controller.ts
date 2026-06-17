import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('uploads')
@UseGuards(FirebaseAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname) || '.jpg'}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
      fileFilter: (_req, file, cb) => {
        const ok =
          /image\/(jpe?g|png|webp|gif)/.test(file.mimetype) ||
          /application\/pdf/.test(file.mimetype) ||
          /\.(jpe?g|png|webp|gif|pdf)$/i.test(file.originalname);
        cb(
          ok
            ? null
            : new BadRequestException('Only image or PDF files allowed'),
          ok,
        );
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    // Relative URL; the app prepends the API base.
    return { url: `/uploads/${file.filename}` };
  }
}
