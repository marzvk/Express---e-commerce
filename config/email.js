const nodemailer = require('nodemailer');


// CONFIGURAR TRANSPORTER (conexión a Gmail)
// ========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});


// VERIFICAR CONEXIÓN AL INICIAR
// ========================================
transporter.verify((error) => {
    if (error) {
        console.error('❌ Error de email:', error.message);
    } else {
        console.log('✅ Servidor de email listo y funcionando');
    }
});


module.exports = transporter;