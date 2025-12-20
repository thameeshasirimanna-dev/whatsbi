import crypto from 'crypto';
import { verifyJWT } from '../utils/helpers';
export default async function uploadInventoryImagesRoutes(fastify, supabaseClient) {
    fastify.post('/upload-inventory-images', async (request, reply) => {
        try {
            // Verify JWT and get authenticated user
            const authenticatedUser = await verifyJWT(request, supabaseClient);
            const body = request.body;
            const { agentId, productId, images } = body;
            if (!agentId) {
                return reply.code(400).send({ error: 'agentId is required' });
            }
            if (!productId) {
                return reply.code(400).send({ error: 'productId is required' });
            }
            if (!images || !Array.isArray(images) || images.length === 0) {
                return reply.code(400).send({ error: 'images array is required' });
            }
            if (images.length > 5) {
                return reply.code(400).send({ error: 'Maximum 5 images allowed' });
            }
            // Validate each image
            for (const image of images) {
                if (!image.fileName || !image.fileBase64 || !image.fileType) {
                    return reply.code(400).send({
                        error: 'Each image must have fileName, fileBase64, and fileType',
                    });
                }
                if (!image.fileType.startsWith('image/')) {
                    return reply.code(400).send({ error: 'Only image files are allowed' });
                }
            }
            const uploadedUrls = [];
            // Upload each image
            for (const image of images) {
                try {
                    // Decode base64 file
                    const prefix = `data:${image.fileType};base64,`;
                    const base64Data = image.fileBase64.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
                    const binaryString = atob(base64Data);
                    let bytes = Buffer.alloc(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    // TODO: Add image resizing/compression using sharp or similar
                    // For now, upload as is
                    const processedFileType = image.fileType;
                    const uniqueId = crypto.randomUUID();
                    const extension = image.fileName.split('.').pop() || 'jpg';
                    const filePath = `${productId}/${uniqueId}.${extension}`;
                    // Upload to storage
                    const { error: uploadError } = await supabaseClient.storage
                        .from('inventory-images')
                        .upload(filePath, bytes, {
                        contentType: processedFileType,
                        upsert: false,
                    });
                    if (uploadError) {
                        // Rollback any successfully uploaded images if this fails
                        for (const uploadedUrl of uploadedUrls) {
                            const urlObj = new URL(uploadedUrl);
                            const pathname = urlObj.pathname;
                            const parts = pathname.split('/').slice(5);
                            if (parts.length > 1 && parts[0] === 'inventory-images') {
                                const pathToDelete = parts.slice(1).join('/');
                                await supabaseClient.storage.from('inventory-images').remove([pathToDelete]);
                            }
                        }
                        return reply.code(500).send({ error: 'Upload failed: ' + uploadError.message });
                    }
                    // Get public URL
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('inventory-images')
                        .getPublicUrl(filePath);
                    uploadedUrls.push(publicUrl);
                }
                catch (error) {
                    // Rollback on any error
                    for (const uploadedUrl of uploadedUrls) {
                        const urlObj = new URL(uploadedUrl);
                        const pathname = urlObj.pathname;
                        const parts = pathname.split('/').slice(5);
                        if (parts.length > 1 && parts[0] === 'inventory-images') {
                            const pathToDelete = parts.slice(1).join('/');
                            await supabaseClient.storage.from('inventory-images').remove([pathToDelete]);
                        }
                    }
                    return reply.code(500).send({
                        error: 'Upload failed: ' + (error.message || 'Unknown error'),
                    });
                }
            }
            return reply.code(200).send({ success: true, urls: uploadedUrls });
        }
        catch (error) {
            return reply.code(400).send({ error: error.message || 'Unknown error' });
        }
    });
}
