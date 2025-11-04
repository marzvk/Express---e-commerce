var express = require('express');
var router = express.Router();

const auth_controller = require("../controllers/authControllers");
const {loginLimiter} = require("../middleware/auth")

// LOGIN ROUTES  //

// Get for login, mostrar formulario
router.get('/login', auth_controller.login_get);

// Post for login, procesar formulario login
router.post('/login',
    loginLimiter,
     auth_controller.login_post);


//  Logout
router.post('/logout', auth_controller.logout);

// ========== REGISTER ROUTES ========== //

// GET - Mostrar formulario de registro
router.get('/register', auth_controller.register_get);

// POST - Procesar registro
router.post('/register', auth_controller.register_post);


module.exports = router;
