import { google } from 'googleapis';
import axios from 'axios';

export default async function handler(req, res) {
  const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2023-10`;
  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
  const SPREADSHEET_ID = process.env.SHEET_ID;

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });

  const shopifyRes = await axios.get(`${SHOPIFY_API_URL}/products.json?limit=250&fields=id,title,body_html,handle,variants,images,tags`, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN },
  });

  const products = shopifyRes.data.products.filter(p => p.tags.includes('bundle'));
  const rows = products.map(p => {
    const variant = p.variants[0];
    const image = p.images[0]?.src || '';
    return [
      variant.id.toString(),
      p.title,
      p.body_html.replace(/<[^>]*>?/gm, '').slice(0, 4990),
      `${variant.price}`,
      variant.inventory_quantity > 0 ? 'in stock' : 'out of stock',
      `https://${process.env.SHOPIFY_STORE}.myshopify.com/products/${p.handle}`,
      image,
      'TRUE',
    ];
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:H',
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  res.status(200).json({ message: `Synced ${rows.length} bundles to sheet.` });
}


  