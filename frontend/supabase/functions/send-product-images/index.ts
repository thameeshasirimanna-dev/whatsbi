import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function resizeImageToJpeg(blob: Blob, maxSizeBytes: number = 5 * 1024 * 1024): Promise<Blob> {
  try {
    if (blob.size <= maxSizeBytes) {
      console.log(`Image already under size limit: ${blob.size} bytes, skipping processing`);
      return blob;
    }

    // Since images are pre-processed upstream to <5MB, use conservative threshold to avoid memory issues
    const maxProcessSize = 5 * 1024 * 1024; // 5MB threshold for processing
    if (blob.size > maxProcessSize) {
      console.error(`Unexpected: Image exceeds 5MB (${blob.size} bytes) despite upstream processing, skipping - upload will fail`);
      return blob;
    }
    console.log(`Image size ${blob.size} bytes is within limit, performing light compression if needed for WhatsApp`);

    console.log(`Starting decode for image size: ${blob.size} bytes`);
    const arrayBuffer = await blob.arrayBuffer();
    console.log(`ArrayBuffer created, size: ${arrayBuffer.byteLength} bytes`);
    let image = await Image.decode(arrayBuffer);
    console.log(`Decode successful, image dimensions: ${image.width}x${image.height}, attempting compression`);
    // Force garbage collection after decode to free memory
    if (typeof globalThis.gc === 'function') globalThis.gc();

    const originalWidth = image.width;
    const originalHeight = image.height;
    console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);

    // Resize to cap dimensions and reduce memory usage
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
    let jpegBlob: Blob | null = null;
    let quality = 90;

    while (quality >= 10 && !jpegBlob) {
      console.log(`Trying quality ${quality}...`);
      const buffer = await image.encodeJPEG(quality);
      console.log(`Encoded JPEG buffer size: ${buffer.byteLength} bytes`);
      if (buffer.byteLength <= maxSizeBytes) {
        jpegBlob = new Blob([buffer], { type: "image/jpeg" });
        console.log(`Success at quality ${quality}, size: ${buffer.byteLength} bytes`);
        break;
      } else {
        console.log(`Quality ${quality} too large (${buffer.byteLength} bytes), reducing...`);
        quality -= 10;
      }
      // Force GC after each encode attempt
      if (typeof globalThis.gc === 'function') globalThis.gc();
    }

    if (!jpegBlob) {
      console.log('Falling back to lowest quality');
      const fallback = await image.encodeJPEG(10);
      console.log(`Fallback encode size: ${fallback.byteLength} bytes`);
      jpegBlob = new Blob([fallback], { type: "image/jpeg" });
    }
    // Force GC after final encode
    if (typeof globalThis.gc === 'function') globalThis.gc();
    image = null; // Explicitly nullify image to help GC

    console.log(`Final processed image: ${jpegBlob.size} bytes, final dimensions: ${newWidth}x${newHeight}`);
    return jpegBlob;
  } catch (error) {
    console.error("Image processing failed - likely memory/decode error:", error);
    return blob; // fallback to original
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    } as any);

    const body = await req.json();
    const { user_id, customer_phone, product_id, caption = "" } = body;

    if (!user_id || !customer_phone || !product_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();
    if (userError || !user)
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Get WhatsApp config
    const { data: whatsappConfig, error: configError } = await supabase
      .from("whatsapp_configuration")
      .select("api_key, phone_number_id")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();
    if (configError || !whatsappConfig)
      return new Response(JSON.stringify({ error: "WhatsApp configuration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, agent_prefix")
      .eq("user_id", user_id)
      .single();
    if (agentError || !agent)
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const customersTable = `${agent.agent_prefix}_customers`;
    const messagesTable = `${agent.agent_prefix}_messages`;
    const inventoryTable = `${agent.agent_prefix}_inventory_items`;

    // Find customer
    const { data: customer, error: customerError } = await supabase
      .from(customersTable)
      .select("id, phone")
      .eq("phone", customer_phone)
      .single();
    if (customerError || !customer)
      return new Response(JSON.stringify({ error: "Customer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Normalize phone number
    let normalizedPhone = customer.phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("1") && normalizedPhone.length === 10) normalizedPhone = "1" + normalizedPhone;
    normalizedPhone = "+" + normalizedPhone;
    if (!/^\+\d{10,15}$/.test(normalizedPhone))
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from(inventoryTable)
      .select("*")
      .eq("id", product_id)
      .eq("agent_id", agent.id)
      .single();
    if (productError || !product)
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    console.log("Fetched product:", { id: product.id, name: product.name, image_urls: product.image_urls });

    const accessToken = whatsappConfig.api_key;
    const phoneNumberId = whatsappConfig.phone_number_id;

    let allMessageIds: string[] = [];
    let storedMessagesCount = 0;
    const now = new Date().toISOString();

    if (Array.isArray(product.image_urls) && product.image_urls.length > 0) {
      console.log(`Processing ${product.image_urls.length} images for product ${product_id}`);
      // Force GC before starting loop
      if (typeof globalThis.gc === 'function') globalThis.gc();
      for (let i = 0; i < product.image_urls.length; i++) {
        const imageUrl = product.image_urls[i];
        try {
          console.log(`Fetching image ${i + 1} from: ${imageUrl}`);
          const mediaResponse = await fetch(imageUrl);
          if (!mediaResponse.ok) {
            console.error(`Fetch failed for image ${i + 1}: ${mediaResponse.status}`);
            continue;
          }
          console.log(`Fetched image ${i + 1}, content-length: ${mediaResponse.headers.get('content-length')} bytes`);

          let mediaBlob = await mediaResponse.blob();
          console.log(`Blob created for image ${i + 1}, size: ${mediaBlob.size} bytes, type: ${mediaBlob.type}`);
          const mimeType = mediaResponse.headers.get("content-type") || "image/jpeg";
          if (!mimeType.startsWith("image/")) {
            console.log(`Non-image MIME type for ${i + 1}: ${mimeType}, skipping`);
            continue;
          }

          // Resize & compress
          console.log(`Starting resize/compress for image ${i + 1}, original size: ${mediaBlob.size} bytes`);
          mediaBlob = await resizeImageToJpeg(mediaBlob, 5 * 1024 * 1024);
          console.log(`After resize/compress, image ${i + 1} size: ${mediaBlob.size} bytes`);
          if (mediaBlob.size > 5 * 1024 * 1024) {
            console.error(`Warning: Processed image ${i + 1} still exceeds 5MB limit (${mediaBlob.size} bytes), upload will fail`);
          } else {
            console.log(`Processed image ${i + 1} is under 5MB limit: ${mediaBlob.size} bytes, ready for upload`);
          }
          const filename = `product_${product_id}_${i + 1}.jpg`;
          const file = new File([mediaBlob], filename, { type: "image/jpeg" });
          // Force GC after processing
          if (typeof globalThis.gc === 'function') globalThis.gc();

          // Upload to WhatsApp
          console.log(`Uploading processed image ${i + 1} (${mediaBlob.size} bytes) to WhatsApp media endpoint`);
          const formData = new FormData();
          formData.append("messaging_product", "whatsapp");
          formData.append("type", "image");
          formData.append("file", file);

          const uploadResponse = await fetch(
            `https://graph.facebook.com/v23.0/${phoneNumberId}/media`,
            { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: formData }
          );

          if (!uploadResponse.ok) {
            console.error(`Upload failed for image ${i + 1}:`, await uploadResponse.text());
            continue;
          }

          const uploadData = await uploadResponse.json();
          const mediaId = uploadData.id;
          if (!mediaId) continue;

          // Send image message
          const whatsappPayload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: normalizedPhone,
            type: "image",
            image: { id: mediaId },
          };

          console.log(`Sending image message ${i + 1} to ${normalizedPhone}`);
          const sendResponse = await fetch(
            `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(whatsappPayload),
            }
          );

          const sendText = await sendResponse.text();
          console.log(`Send response for image ${i + 1}: ${sendResponse.status} - ${sendText}`);
          let sendResult;
          try {
            sendResult = JSON.parse(sendText);
          } catch (parseErr) {
            console.error(`Failed to parse send response for image ${i + 1}:`, parseErr, sendText);
            continue;
          }

          if (sendResponse.ok && sendResult.messages?.[0]?.id) {
            const messageId = sendResult.messages[0].id;
            allMessageIds.push(messageId);
            console.log(`Successfully sent image ${i + 1}, message ID: ${messageId}`);

            const effectiveMessage = caption.trim() ? caption : `[Product Image: ${product.name}]`;
            console.log(`Inserting message record for image ${i + 1} into ${messagesTable} with message: "${effectiveMessage}"`);
            const { error: msgError } = await supabase.from(messagesTable).insert({
              customer_id: customer.id,
              message: effectiveMessage,
              direction: "outbound",
              timestamp: now,
              is_read: true,
              media_type: "image",
              media_url: imageUrl,
              caption: caption || null,
            });

            if (msgError) {
              console.error(`DB insert failed for image ${i + 1}:`, msgError);
            } else {
              storedMessagesCount++;
              console.log(`Successfully stored message for image ${i + 1}`);
            }
          } else {
            console.error(`Failed to send image ${i + 1}:`, sendResult);
          }
        } catch (imgError) {
          console.error(`Error processing image ${i + 1}:`, imgError);
        }
      }
    } else {
      console.log("No images found in product");
      return new Response(JSON.stringify({ success: true, message: "No images found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Total stored messages: ${storedMessagesCount}, all message IDs: ${JSON.stringify(allMessageIds)}`);

    if (storedMessagesCount === 0)
      return new Response(JSON.stringify({ error: "Failed to store any messages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message_ids: allMessageIds,
        stored_messages: storedMessagesCount,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send product images error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
