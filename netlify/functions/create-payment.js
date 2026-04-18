const axios = require('axios');
const crypto = require('crypto');

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
    if (!accessToken) throw new Error('Token não configurado');

    const body = JSON.parse(event.body || '{}');
    const { type, amount, description, payer, paymentMethodId, token, installments, issuerId } = body;

    if (!amount || amount <= 0) throw new Error('Valor inválido');
    if (!payer || !payer.email) throw new Error('E-mail do pagador é obrigatório');

    // Gera uma chave de idempotência única para cada requisição
    const idempotencyKey = crypto.randomBytes(16).toString('hex');

    if (type === 'pix') {
      const paymentData = {
        transaction_amount: Number(amount),
        description: description || 'Pedido Lanchão Caraguá',
        payment_method_id: 'pix',
        payer: {
          email: payer.email,
          first_name: payer.first_name || (payer.name?.split(' ')[0] || 'Cliente'),
          last_name: payer.last_name || (payer.name?.split(' ')[1] || ''),
        },
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Idempotency-Key': idempotencyKey,
          },
        }
      );

      const data = response.data;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: data.status,
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
          payment_id: data.id,
        }),
      };
    }

    if (type === 'card') {
      if (!paymentMethodId || !token) throw new Error('Dados de cartão incompletos');

      const paymentData = {
        transaction_amount: Number(amount),
        description: description || 'Pedido Lanchão Caraguá',
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        installments: installments || 1,
        token: token,
        payer: {
          email: payer.email,
          first_name: payer.first_name || (payer.name?.split(' ')[0] || 'Cliente'),
          last_name: payer.last_name || (payer.name?.split(' ')[1] || ''),
          identification: payer.identification || { type: 'CPF', number: '00000000000' },
        },
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Idempotency-Key': idempotencyKey,
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

    throw new Error('Método de pagamento inválido');
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
            
