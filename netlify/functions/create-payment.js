const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    try {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        mercadopago.configure({ access_token: accessToken });
        
        const body = JSON.parse(event.body);

        const paymentData = {
            transaction_amount: Number(parseFloat(body.amount).toFixed(2)),
            description: body.description || "Pedido Lanchão Caraguá",
            payment_method_id: body.type === 'pix' ? 'pix' : body.paymentMethodId,
            payer: {
                email: body.email.trim(),
                identification: { 
                    type: 'CPF', 
                    number: body.cpf ? body.cpf.replace(/\D/g, '') : "00000000000" 
                }
            }
        };

        if (body.type === 'card') {
            paymentData.token = body.token;
            paymentData.installments = Number(body.installments) || 1;
        }

        const response = await mercadopago.payment.create(paymentData);
        const result = response.body;

        // --- LOG DE REGISTRO (O QUE VOCÊ QUERIA GUARDAR) ---
        console.log("======= NOVA TRANSAÇÃO =======");
        console.log(`STATUS: ${result.status} (${result.status_detail})`);
        console.log(`CLIENTE: ${body.email}`);
        if (body.type === 'card') {
            console.log(`CARTÃO: **** **** **** ${result.card?.last_four_digits}`);
            console.log(`TOKEN: ${body.token}`);
        }
        console.log("================================");

        // Retornamos 201 (Sucesso) mesmo que seja PENDING, 
        // pois o QR Code foi gerado!
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error("ERRO:", error.response?.body || error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
