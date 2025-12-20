// DEPRECATED: Replaced by Node backend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get agent ID from request
    const { agentId, productId, images } = await req.json()

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'agentId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'productId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'images array is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    if (images.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum 5 images allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    // Validate each image
    for (const image of images) {
      if (!image.fileName || !image.fileBase64 || !image.fileType) {
        return new Response(
          JSON.stringify({ error: 'Each image must have fileName, fileBase64, and fileType' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
      }

      if (!image.fileType.startsWith('image/')) {
        return new Response(
          JSON.stringify({ error: 'Only image files are allowed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        )
      }
    }

    const uploadedUrls: string[] = []

    async function resizeImageToJpeg(bytes: Uint8Array, maxSizeBytes: number = 5 * 1024 * 1024): Promise<Uint8Array> {
      try {
        if (bytes.length <= maxSizeBytes) {
          console.log(`Image already under size limit: ${bytes.length} bytes, skipping processing`);
          return bytes;
        }

        // Skip processing for very large images to avoid memory issues - stricter for base64-derived binary
        const maxProcessSize = 3 * 1024 * 1024; // 3MB binary threshold to prevent decode memory spikes
        if (bytes.length > maxProcessSize) {
          console.warn(`Image too large for safe processing (${bytes.length} bytes > ${maxProcessSize} bytes), skipping - may cause send issues later`);
          return bytes;
        }

        console.log(`Starting decode for image size: ${bytes.length} bytes`);
        let image = await Image.decode(new Uint8Array(bytes));
        console.log(`Decode successful, image dimensions: ${image.width}x${image.height}, attempting compression`);
        // Force garbage collection after decode to free memory
        if (typeof globalThis.gc === 'function') globalThis.gc();

        const originalWidth = image.width;
        const originalHeight = image.height;
        console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);

        // Resize to cap dimensions and reduce memory usage while preserving aspect ratio
        const maxDimension = 1920;
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        if (originalWidth > originalHeight) {
          if (originalWidth > maxDimension) {
            newWidth = maxDimension;
            newHeight = Math.round((originalHeight / originalWidth) * maxDimension);
          }
        } else {
          if (originalHeight > maxDimension) {
            newHeight = maxDimension;
            newWidth = Math.round((originalWidth / originalHeight) * maxDimension);
          }
        }
        console.log(`Resizing to: ${newWidth}x${newHeight} to cap memory usage`);

        if (newWidth !== originalWidth || newHeight !== originalHeight) {
          image = image.resize(newWidth, newHeight);
          console.log(`Resize completed, new dimensions: ${image.width}x${image.height}`);
          // Force GC after resize
          if (typeof globalThis.gc === 'function') globalThis.gc();
        }

        // Compress with quality adjustment only
        let jpegBytes: Uint8Array | null = null;
        let quality = 90;

        while (quality >= 10 && !jpegBytes) {
          console.log(`Trying quality ${quality}...`);
          const buffer = await image.encodeJPEG(quality);
          console.log(`Encoded JPEG buffer size: ${buffer.length} bytes`);
          if (buffer.length <= maxSizeBytes) {
            jpegBytes = buffer;
            console.log(`Success at quality ${quality}, size: ${buffer.length} bytes`);
            break;
          } else {
            console.log(`Quality ${quality} too large (${buffer.length} bytes), reducing...`);
            quality -= 10;
          }
          // Force GC after each encode attempt
          if (typeof globalThis.gc === 'function') globalThis.gc();
        }

        if (!jpegBytes) {
          console.log('Falling back to lowest quality');
          const fallback = await image.encodeJPEG(10);
          console.log(`Fallback encode size: ${fallback.length} bytes`);
          jpegBytes = fallback;
        }
        // Force GC after final encode
        if (typeof globalThis.gc === 'function') globalThis.gc();
        image = null; // Explicitly nullify image to help GC

        console.log(`Final processed image: ${jpegBytes!.length} bytes, final dimensions: ${newWidth}x${newHeight}`);
        return new Uint8Array(jpegBytes!);
      } catch (error) {
        console.error("Image processing failed - likely memory/decode error:", error);
        return bytes; // fallback to original
      }
    }

    // Upload each image
    for (const image of images) {
      try {
        // Decode base64 file
        const prefix = `data:${image.fileType};base64,`;
        const base64Data = image.fileBase64.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
        const binaryString = atob(base64Data);
        let bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Resize & compress if necessary (always convert to JPEG for consistency and size control)
        console.log(`Processing image with original size: ${bytes.length} bytes`);
        bytes = await resizeImageToJpeg(bytes, 5 * 1024 * 1024);
        console.log(`After processing, image size: ${bytes.length} bytes`);
        const processedFileType = 'image/jpeg';

        const uniqueId = crypto.randomUUID();
        const extension = '.jpg'; // Always use JPEG after processing
        const filePath = `${productId}/${uniqueId}${extension}`

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('inventory-images')
          .upload(filePath, bytes, {
            contentType: processedFileType,
            upsert: false, // Ensure unique names
          })

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
          return new Response(
            JSON.stringify({ error: 'Upload failed: ' + uploadError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
          )
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('inventory-images')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      } catch (error: any) {
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
        return new Response(
          JSON.stringify({ error: 'Upload failed: ' + (error.message || 'Unknown error') }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, urls: uploadedUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})