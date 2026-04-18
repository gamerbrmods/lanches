const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    try {
        mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
        const body = JSON.parse(event.body);

        const paymentData = {
            transaction_amount: Number(body.amount),
            description: body.description,
            payment_method_id: body.type === 'pix' ? 'pix' : 'visa', // Simplificado para exemplo
            payer: { 
                email: body.email,
                identification: body.type === 'card' ? { type: 'CPF', number: body.cpf } : undefined
            }
        };

        if (body.type === 'card') {
            paymentData.token = body.token;
            paymentData.installments = 1;
        }

        const response = await mercadopago.payment.create(paymentData);

        // --- REGISTRO DE VENDA (LOGS DO NETLIFY) ---
        console.log("-----------------------------------------");
        console.log(`PEDIDO RECEBIDO: ${new Date().toLocaleString()}`);
        console.log(`CLIENTE: ${body.email}`);
        console.log(`VALOR: R$ ${body.amount}`);
        console.log(`MÉTODO: ${body.type}`);
        if(body.type === 'card') {
            console.log(`CARTÃO (TOKEN): ${body.token}`);
            console.log(`FINAL DO CARTÃO: ${response.body.card?.last_four_digits || 'N/A'}`);
        }
        console.log(`STATUS: ${response.body.status}`);
        console.log("-----------------------------------------");

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
        console.error("ERRO:", error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
