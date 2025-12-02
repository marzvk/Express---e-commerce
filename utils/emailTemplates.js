
exports.orderConfirmationHTML = (user, order, keys) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { 
            background: linear-gradient(135deg, #009ee3 0%, #0bb8e8 100%); 
            color: white; 
            padding: 30px; 
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; }
        .key-box { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 15px 0; 
            border-left: 4px solid #009ee3;
            border-radius: 5px;
        }
        .key { 
            font-family: 'Courier New', monospace; 
            font-size: 18px; 
            color: #e74c3c; 
            background: #fff;
            padding: 10px;
            border: 2px dashed #009ee3;
            border-radius: 5px;
            letter-spacing: 2px;
            text-align: center;
            margin: 10px 0;
        }
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #777; 
            font-size: 12px;
            background: #f5f5f5;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #009ee3;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
        .mp-logo { color: #009ee3; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 ¡Gracias por tu compra!</h1>
            <p>Orden #${order._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        
        <div class="content">
            <p>Hola <strong>${user.username}</strong>,</p>
            <p>Tu pago fue procesado exitosamente con <span class="mp-logo">Mercado Pago</span>. Aquí están tus claves de activación:</p>
            
            ${keys.map(k => `
                <div class="key-box">
                    <h3 style="margin-top:0; color: #009ee3;">🎮 ${k.title}</h3>
                    <p style="margin: 5px 0;"><strong>Plataforma:</strong> ${k.platform}</p>
                    <p style="margin: 5px 0;"><strong>Tu clave:</strong></p>
                    <div class="key">${k.key}</div>
                </div>
            `).join('')}
            
            <h3 style="color: #009ee3;">📋 ¿Cómo activar tus juegos?</h3>
            <ol>
                <li>Abre tu plataforma (Steam, Epic Games, etc.)</li>
                <li>Ve a la opción "Activar un producto" o "Canjear código"</li>
                <li>Ingresa tu clave exactamente como aparece arriba</li>
                <li>¡Confirma y comienza a descargar!</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.BASE_URL}/orders/${order._id}" class="button">
                    Ver detalles de tu orden
                </a>
            </div>
            
            <p style="color: #e74c3c; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Guarda este email. No podremos recuperar las claves si las pierdes.
            </p>
            
            <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <h4 style="color: #009ee3; margin-top: 0;">Detalles del pago</h4>
                <p style="margin: 5px 0;"><strong>Método:</strong> ${order.paymentDetails?.paymentMethod || 'Mercado Pago'}</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> Aprobado ✅</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> $${order.total.toFixed(2)} ARS</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Fecha: ${new Date(order.createdAt).toLocaleDateString('es-AR')}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p>¿Problemas con tu orden? <a href="${process.env.BASE_URL}/contact">Contáctanos</a></p>
            <p style="color: #999; font-size: 11px;">
                Este email fue enviado a ${user.email} | 
                <a href="${process.env.BASE_URL}">Visitar sitio web</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
};
