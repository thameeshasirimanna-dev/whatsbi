import { FastifyInstance } from 'fastify';
import { verifyJWT } from '../../utils/helpers';

export default async function uploadInvoiceRoutes(fastify: FastifyInstance, supabaseClient: any) {
  fastify.post('/upload-invoice', async (request, reply) => {
    try {
      // Verify JWT
      const authenticatedUser = await verifyJWT(request, supabaseClient);

      const body = request.body as any;
      const { orderId, invoiceName, agentPrefix, customerId, discountPercentage, pdfBase64 } = body;

      if (!orderId || !invoiceName || !agentPrefix || !customerId || !pdfBase64) {
        return reply.code(400).send({ error: 'Missing required fields' });
      }

      // Decode base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Generate filename
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      const fileName = `invoice_${orderId}${formattedDate}.pdf`;
      const storagePath = `${agentPrefix}/${customerId}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('invoices')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        return reply.code(500).send({ error: 'Failed to upload invoice' });
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage.from('invoices').getPublicUrl(storagePath);

      // Insert invoice record
      const invoicesTable = `${agentPrefix}_orders_invoices`;
      const { error: insertError } = await supabaseClient.from(invoicesTable).insert({
        order_id: orderId,
        name: invoiceName,
        pdf_url: publicUrl,
        status: 'generated',
        discount_percentage: discountPercentage,
      });

      if (insertError) {
        return reply.code(500).send({ error: 'Failed to save invoice record' });
      }

      return reply.code(200).send({ publicUrl });
    } catch (error) {
      console.error('Upload invoice error:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}