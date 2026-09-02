export {};

declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole: string;
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}