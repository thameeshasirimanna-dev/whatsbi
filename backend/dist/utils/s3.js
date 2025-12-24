import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
const s3Client = new S3Client({
    region: 'auto', // For R2
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
export async function uploadMediaToR2(agentPrefix, mediaBuffer, originalFilename, contentType, folder = 'incoming', customKey) {
    try {
        let key;
        if (customKey) {
            key = customKey;
        }
        else {
            const timestamp = Date.now();
            const fileExt = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
            const fileName = `${timestamp}_${crypto.randomUUID()}.${fileExt}`;
            key = `${agentPrefix}/${folder}/${fileName}`;
        }
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: mediaBuffer,
            ContentType: contentType,
        });
        await s3Client.send(command);
        // Construct public URL
        const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
        return publicUrl;
    }
    catch (error) {
        console.error('Error uploading media to R2:', error);
        return null;
    }
}
