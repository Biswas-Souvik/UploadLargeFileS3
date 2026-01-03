import fs from 'fs';
import path from 'path';
import { start } from 'repl';

const API_BASE_URL =
  'https://5qj1feret6.execute-api.ap-south-1.amazonaws.com/test';
const LOCAL_FILE_PATH = './files/SmallFile_1KB.yaml';

interface ResponseData {
  url: string;
  fields: Record<string, string>;
}

function getS3KeyFromUrl(s3Url: string): string {
  const url = new URL(s3Url);

  // remove leading "/" and decode %2F → /
  return decodeURIComponent(url.pathname.slice(1));
}

async function uploadFile() {
  try {
    console.log('🚀 Starting upload workflow');
    const fileName = path.basename(LOCAL_FILE_PATH);
    const uploadPath = 'presigned-url';

    const apiUrl = `${API_BASE_URL}/${uploadPath}?fileName=${fileName}`;

    console.log('📞 Calling API to get presigned POST');
    console.log('➡️ API URL:', apiUrl);

    const presignRes = await fetch(apiUrl);

    if (!presignRes.ok) {
      throw new Error(`Failed to get presigned URL: ${presignRes.status}`);
    }

    const data = (await presignRes.json()) as ResponseData;
    // const data = sample_data;
    const { url, fields } = data;

    console.log('✅ Received presigned POST');
    console.log('🔗 S3 URL:', url);
    console.log('🧾 Fields returned:', Object.keys(fields));

    // 2️⃣ Build multipart/form-data
    console.log('📦 Preparing multipart form-data');

    const form = new FormData();

    // IMPORTANT: append all fields first
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value as string);
    }

    // file MUST be last
    console.log('📤 Attaching file:', LOCAL_FILE_PATH);
    const buffer = fs.readFileSync(LOCAL_FILE_PATH);

    form.append('file', new Blob([buffer]), fileName);

    // 3️⃣ Upload file to S3
    console.log('⬆️ Uploading file to S3');
    const startTime = Date.now();
    const uploadRes = await fetch(url, {
      method: 'POST',
      body: form as any,
    });

    console.log('Upload Time: ', Date.now() - startTime, 'ms');

    // 4️⃣ Handle response
    if (uploadRes.status === 204) {
      console.log('🎉 Upload successful (204 No Content)');
      const location = uploadRes.headers.get('location')!;
      console.log('📍 Uploaded S3 Key: ', getS3KeyFromUrl(location));
    } else {
      console.error('❌ Upload failed');
      console.error('Status:', uploadRes.status);
      console.error('Response:', await uploadRes.text());
    }
  } catch (err: any) {
    console.error('💥 Error during upload');
    console.error(err.message);
  }
}

// Run
uploadFile();
