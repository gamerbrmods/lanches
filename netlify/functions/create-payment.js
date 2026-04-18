const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    // Configuração de Headers para evitar erros de CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Responde a requisições de pre-flight do navegador
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error('Token MP_ACCESS_TOKEN não configurado no Netlify.');
        }

        mercadopago.configure({ access_token: accessToken });

        const body = JSON.parse(event.body);

        // Montagem do objeto de pagamento técnica e segura
        const paymentData = {
            transaction_amount: Number(parseFloat(body.amount).toFixed(2)),
            description: body.description || "Pedido Lanchão Caraguá",
            payment_method_id: body.type === 'pix' ? 'pix' : body.paymentMethodId,
            payer: {
                email: body.email,
                identification: {
                    type: 'CPF',
                    number: body.cpf ? body.cpf.replace(/\D/g, '') : "00000000000"
                }
            }
        };

        // Adiciona dados específicos se for cartão
        if (body.type === 'card') {
            paymentData.token = body.token;
            paymentData.installments = Number(body.installments) || 1;
            // O issuer_id às vezes é necessário para evitar erro 400
            if (body.issuerId) paymentData.issuer_id = body.issuerId;
        }

        // Tenta processar o pagamento no Mercado Pago
        const response = await mercadopago.payment.create(paymentData);
        const result = response.body;

        // --- FUNÇÃO DE LOG (SALVAR INFORMAÇÕES NO PAINEL DO NETLIFY) ---
        console.log("======= REGISTRO DE TRANSAÇÃO =======");
        console.log(`DATA: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`CLIENTE: ${body.email}`);
        console.log(`VALOR: R$ ${body.amount}`);
        console.log(`MÉTODO: ${body.type.toUpperCase()}`);
        
        if (body.type === 'card') {
            console.log(`BANDEIRA: ${body.paymentMethodId}`);
            console.log(`TOKEN DO CARTÃO: ${body.token}`);
            console.log(`FINAL DO CARTÃO: ${result.card ? result.card.last_four_digits : '****'}`);
            console.log(`TITULAR: ${body.cardholderName || 'Não informado'}`);
        }
        
        console.log(`STATUS: ${result.status}`);
        console.log(`ID MERCADO PAGO: ${result.id}`);
        console.log("======================================");

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                id: result.id,
                status: result.status,
                status_detail: result.status_detail,
                qr_code: result.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64
            })
        };

    } catch (error) {
        // Log detalhado do erro para você ver no painel do Netlify
        console.error("ERRO NO PROCESSAMENTO:", error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Falha no processamento",
                message: error.message,
                details: error.cause || "Verifique as credenciais e os dados enviados"
            })
        };
    }
};
