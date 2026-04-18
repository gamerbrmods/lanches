const mercadopago = require('mercadopago');

exports.handler = async (event) => {
  // Habilita CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // Obter access token da variável de ambiente configurada no Netlify
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado no ambiente do Netlify.');
    }

    mercadopago.configure({ access_token: accessToken });

    const { items, payer, metadata, external_reference } = JSON.parse(event.body);

    // Validação básica
    if (!items || !items.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: 'Carrinho vazio' }) };
    }

    const preference = {
      items,
      payer,
      back_urls: {
        success: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=sucesso`,
        failure: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=falha`,
        pending: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=pending`
      },
      auto_return: 'approved',
      external_reference: external_reference || `pedido_${Date.now()}`,
      metadata: metadata || {},
      notification_url: `${process.env.URL || 'https://' + event.headers.host}/.netlify/functions/webhook` // opcional
    };

    const response = await mercadopago.preferences.create(preference);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: response.body.init_point })
    };
  } catch (error) {
    console.error('Erro no Mercado Pago:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message || 'Erro interno ao criar preferência' })
    };
  }
};