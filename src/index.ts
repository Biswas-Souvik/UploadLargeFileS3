import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import 'dotenv/config';

interface IntiateResponseData {
  uploadId: string;
  key: string;
}

interface UrlResponseData {
  partNumber: number;
  url: string;
}

const API_BASE_URL = process.env.API_BASE_URL!;
const LOCAL_FILE_PATH_M = '.uploads/large_file_777.msi';
const LOCAL_FILE_PATH_S = '.uploads/large_file_755.msi';
const PART_SIZE = 20 * 1024 * 1024;

async function multiPartUpload(filePath: string) {
  try {
    const startTime = Date.now();
    const fileName = path.basename(filePath);
    const mimeType = mime.lookup(filePath);

    const fileSize = fs.statSync(filePath).size;

    const initiateResp = await fetch(`${API_BASE_URL}/multipart/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType,
      }),
    });

    if (!initiateResp.ok) {
      throw new Error('Initiate upload failed');
    }
    const initiateRespData = (await initiateResp.json()) as IntiateResponseData;
    // console.log('Initiate Upload Resp: ', initiateRespData);

    const { uploadId, key } = initiateRespData;
    if (!uploadId || !key) {
      throw new Error('Invalid initiate response');
    }
    const partCount = Math.ceil(fileSize / PART_SIZE);

    const urlResp = await fetch(`${API_BASE_URL}/multipart/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, partCount }),
    });

    if (!urlResp.ok) {
      throw new Error('Failed to get presigned URLs');
    }
    const urlRespData = (await urlResp.json()) as UrlResponseData[];
    // console.log('Presigned URLs: ', urlRespData);

    const totalParts = urlRespData.length;

    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: PART_SIZE,
    });

    let i = 0;
    const uploadedParts: { partNumber: number; ETag: string }[] = [];

    const CONCURRENCY = 50;
    let inFlight = [];

    for await (const chunk of fileStream) {
      const { partNumber, url } = urlRespData[i];

      const uploadPromise = fetch(url, {
        method: 'PUT',
        body: chunk,
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`Upload failed at part ${partNumber}`);
        }

        const etag = res.headers.get('ETag');
        if (!etag) throw new Error('ETag missing');

        uploadedParts.push({ partNumber, ETag: etag });
        console.log(`Uploaded part ${partNumber}/${totalParts}`);
      });

      inFlight.push(uploadPromise);

      if (inFlight.length === CONCURRENCY) {
        await Promise.all(inFlight);
        inFlight = [];
      }

      i++;
    }

    // wait for remaining uploads
    if (inFlight.length) {
      await Promise.all(inFlight);
    }
    uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
    const completeRes = await fetch(`${API_BASE_URL}/multipart/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, parts: uploadedParts }),
    });

    if (!completeRes.ok) {
      throw new Error(`Complete upload failed: ${await completeRes.text()}`);
    }
    const completeRespData = (await completeRes.json()) as { Location: string };

    console.log('Multipart Upload Completed');
    console.log('Time Taken: ', (Date.now() - startTime) / 1000, 'seconds');
    console.log(
      'Uploaded File Size: ',
      (fileSize / (1024 * 1024)).toFixed(2),
      'MB'
    );
    console.log('File Location: ', completeRespData.Location);
  } catch (err: unknown) {
    console.error('Error during upload: ', (err as Error).message);
  }
}

async function singleUpload(filePath: string) {
  try {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const uploadPath = `presigned-url?fileName=${fileName}`;
    console.log('API URL Path:', uploadPath);

    const apiUrl = `${API_BASE_URL}/${uploadPath}`;

    const presignRes = await fetch(apiUrl);

    if (!presignRes.ok) {
      throw new Error(`Failed to get presigned URL: ${presignRes.status}`);
    }

    const data = (await presignRes.json()) as {
      url: string;
      fields: Record<string, string>;
    };
    const { url, fields } = data;

    console.log('S3 URL:', url);
    console.log('Fields returned:', Object.keys(fields));

    const form = new FormData();

    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value as string);
    }

    console.log('Attaching file:', filePath);
    const buffer = fs.readFileSync(filePath);

    form.append('file', new File([buffer], fileName), fileName);

    console.log('Uploading file to S3');
    const startTime = Date.now();
    const uploadRes = await fetch(url, {
      method: 'POST',
      body: form as any,
    });

    console.log('Upload status:', uploadRes.status);
    if (!uploadRes.ok) {
      console.error(await uploadRes.text());
    }

    if (uploadRes.status === 204) {
      console.log('Single Upload Completed');
      console.log('Time Taken: ', (Date.now() - startTime) / 1000, 'seconds');
      console.log(
        'Uploaded File Size: ',
        (fileSize / (1024 * 1024)).toFixed(2),
        'MB'
      );
      console.log('File Location: ', uploadRes.headers.get('location'));
    } else {
      console.error('Upload failed: ', await uploadRes.text());
    }
  } catch (err: unknown) {
    console.error('Error during upload: ', (err as Error).message);
  }
}

async function automation() {
  await multiPartUpload(LOCAL_FILE_PATH_M);
  console.log(
    '\n\n-----------------------------------------------------------------------------------------------\n\n'
  );
  await singleUpload(LOCAL_FILE_PATH_S);
}

automation();
