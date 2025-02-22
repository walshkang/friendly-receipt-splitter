
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createWorker } from 'https://esm.sh/tesseract.js@4.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting OCR processing...');
    const { image } = await req.json();
    
    if (!image) {
      console.error('No image data provided');
      throw new Error('No image data provided');
    }

    console.log('Initializing Tesseract worker...');
    const worker = await createWorker();
    console.log('Tesseract worker initialized');

    console.log('Starting image recognition...');
    const result = await worker.recognize(image);
    console.log('OCR completed, text length:', result.data.text.length);
    await worker.terminate();

    if (!result.data.text) {
      console.error('OCR processing returned no text');
      throw new Error('OCR processing failed to extract text');
    }

    // Extract receipt information from OCR text
    const lines = result.data.text.split('\n');
    let totalAmount = 0;
    let date = '';
    let description = '';
    const items = [];

    console.log('Parsing OCR text, number of lines:', lines.length);

    // Simple parsing logic - can be improved based on receipt format
    for (const line of lines) {
      console.log('Processing line:', line);
      
      // Look for date in common formats (MM/DD/YYYY or YYYY-MM-DD)
      if (!date && (line.match(/\d{2}\/\d{2}\/\d{4}/) || line.match(/\d{4}-\d{2}-\d{2}/))) {
        date = line.trim();
        console.log('Found date:', date);
        continue;
      }

      // Look for price patterns ($XX.XX)
      const priceMatch = line.match(/\$?\d+\.\d{2}/);
      if (priceMatch) {
        const amount = parseFloat(priceMatch[0].replace('$', ''));
        console.log('Found price:', amount, 'in line:', line);
        // If this is one of the largest numbers, it might be the total
        if (amount > totalAmount) {
          totalAmount = amount;
        }
        // Add as line item if it's not the total
        items.push({
          description: line.replace(priceMatch[0], '').trim(),
          amount
        });
      }

      // First non-date, non-amount line might be the vendor/description
      if (!description && !line.includes('$') && !line.match(/\d{2}\/\d{2}\/\d{4}/)) {
        description = line.trim();
        console.log('Found description:', description);
      }
    }

    // If no date found, use current date
    if (!date) {
      date = new Date().toISOString().split('T')[0];
      console.log('No date found, using current date:', date);
    }

    // Format the response
    const receiptData = {
      total_amount: totalAmount,
      date,
      description: description || 'Unknown Vendor',
      items: items.filter(item => item.amount < totalAmount) // Filter out the total from items
    };

    console.log('Final processed data:', receiptData);

    return new Response(JSON.stringify(receiptData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR Processing Error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'OCR Processing failed', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
