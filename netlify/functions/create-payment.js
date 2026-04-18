const mercadopago = require('mercadopago');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    mercadopago.configure({
      access_token: process.env.MP_ACCESS_TOKEN 
    });

    const body = JSON.parse(event.body);
    const { type, amount, description, payer, token, installments, paymentMethodId } = body;

    const paymentData = {
      transaction_amount: Number(amount.toFixed(2)),
      description: description,
      payment_method_id: type === 'pix' ? 'pix' : paymentMethodId,
      payer: payer,
    };

    if (type === 'card') {
      paymentData.token = token;
      paymentData.installments = Number(installments);
    }

    const response = await mercadopago.payment.create(paymentData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        status: response.body.status,
        status_detail: response.body.status_detail,
        qr_code: response.body.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.body.point_of_interaction?.transaction_data?.qr_code_base64
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
