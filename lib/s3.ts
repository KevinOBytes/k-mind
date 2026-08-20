import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const r2Endpoint = process.env.R2_ENDPOINT || '';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

let s3Client: S3Client | null = null;

export function getR2Client() {
  if (s3Client) return s3Client;

  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
    console.warn('Cloudflare R2 credentials are missing. Running without Object Storage capabilities.');
    return null;
  }

  s3Client = new S3Client({
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    region: 'auto',
    forcePathStyle: true,
  });

  return s3Client;
}

export async function uploadToR2(bucket: string, key: string, body: Buffer | string, contentType: string) {
  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    return await client.send(command);
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to R2');
  }
}

export async function getFromR2(bucket: string, key: string): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const response = await client.send(command);
    if (!response.Body) return null;
    return await response.Body.transformToString();
  } catch (error) {
    console.error('R2 read error:', error);
    return null;
  }
}
