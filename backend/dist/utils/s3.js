import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, } from "@aws-sdk/client-s3";
import crypto from "crypto";
const s3Client = new S3Client({
    region: "auto", // For R2
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});
export async function uploadMediaToR2(agentPrefix, mediaBuffer, originalFilename, contentType, folder = "incoming", customKey) {
    try {
        let key;
        if (customKey) {
            key = customKey;
        }
        else {
            const timestamp = Date.now();
            const fileExt = originalFilename.split(".").pop()?.toLowerCase() || "bin";
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
        console.error("Error uploading media to R2:", error);
        return null;
    }
}
export async function downloadMediaFromR2(key) {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            return null;
        }
        // Convert stream to buffer
        const stream = response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        return buffer;
    }
    catch (error) {
        console.error("Error downloading media from R2:", error);
        return null;
    }
}
export async function deleteMediaFromR2(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    }
    catch (error) {
        console.error("Error deleting media from R2:", error);
        return false;
    }
}
