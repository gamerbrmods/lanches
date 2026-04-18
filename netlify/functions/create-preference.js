const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token do Mercado Pago não configurado' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { type, amount, description, payer, paymentMethodId, token, installments, issuerId } = body;

    if (!amount || amount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valor inválido' }) };
    }

    // PAGAMENTO PIX
    if (type === 'pix') {
      const paymentData = {
        transaction_amount: Number(amount),
        description: description || 'Pedido Lanchão Caraguá',
        payment_method_id: 'pix',
        payer: {
          email: payer.email,
          first_name: payer.name?.split(' ')[0] || 'Cliente',
          last_name: payer.name?.split(' ')[1] || '',
        },
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Idempotency-Key': `${Date.now()}-${Math.random()}`,
          },
        }
      );

      const data = response.data;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
          status: data.status,
        }),
      };
    }

    // PAGAMENTO COM CARTÃO
    if (type === 'card') {
      if (!token || !paymentMethodId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Dados do cartão incompletos' }) };
      }

      const paymentData = {
        transaction_amount: Number(amount),
        description: description || 'Pedido Lanchão Caraguá',
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        installments: installments || 1,
        token: token,
        payer: {
          email: payer.email,
          first_name: payer.name?.split(' ')[0] || 'Cliente',
          last_name: payer.name?.split(' ')[1] || '',
          identification: payer.identification || { type: 'CPF', number: '00000000000' },
        },
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Idempotency-Key': `${Date.now()}-${Math.random()}`,
          },
        }
      );

      const data = response.data;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: data.status,
          id: data.id,
          status_detail: data.status_detail,
        }),
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Método de pagamento inválido' }) };
  } catch (error) {
    console.error('Erro detalhado:', error.response?.data || error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.message || error.message,
        details: error.response?.data || 'Erro interno',
      }),
    };
  }
};
