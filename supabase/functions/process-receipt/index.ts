
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createOCREngine } from "https://deno.land/x/ocrs@0.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    // Convert base64 to Uint8Array
    const binaryString = atob(image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Initialize OCR engine
    const engine = await createOCREngine();
    
    // Process the image
    const result = await engine.recognize(bytes);
    console.log('OCR result:', result);

    // Extract receipt information from OCR text
    const lines = result.text.split('\n');
    let totalAmount = 0;
    let date = '';
    let description = '';
    const items = [];

    // Simple parsing logic - can be improved based on receipt format
    for (const line of lines) {
      // Look for date in common formats (MM/DD/YYYY or YYYY-MM-DD)
      if (!date && (line.match(/\d{2}\/\d{2}\/\d{4}/) || line.match(/\d{4}-\d{2}-\d{2}/))) {
        date = line.trim();
        continue;
      }

      // Look for price patterns ($XX.XX)
      const priceMatch = line.match(/\$?\d+\.\d{2}/);
      if (priceMatch) {
        const amount = parseFloat(priceMatch[0].replace('$', ''));
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
      }
    }

    // If no date found, use current date
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }

    // Format the response
    const receiptData = {
      total_amount: totalAmount,
      date,
      description: description || 'Unknown Vendor',
      items: items.filter(item => item.amount < totalAmount) // Filter out the total from items
    };

    return new Response(JSON.stringify(receiptData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
