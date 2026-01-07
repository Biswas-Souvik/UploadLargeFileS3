export interface GetPresignedUrlEvent {
  queryStringParameters: { fileName: string };
}

export interface UploadEvent {
  body: string;
}

export interface MultipartUploadEventBody {
  fileName: string;
  mimeType: string;
}

export interface GenratePresignedUrlEventBody {
  key: string;
  uploadId: string;
  partCount: number;
}

export interface MultipartUploadPart {
  partNumber: number;
  ETag: string;
}

export interface CompleteMultipartUploadEventBody {
  key: string;
  uploadId: string;
  parts: MultipartUploadPart[];
}
