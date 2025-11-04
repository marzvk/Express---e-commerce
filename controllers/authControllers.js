// Mostrar los formularios de registro y login desde ruta /auth.
// Validar los datos enviados con bcrypt.
// Crear usuarios nuevos.
// Iniciar sesión con Passport.
// Cerrar sesión.

const User = require("../models/user");
const bcrypt = require('bcryptjs');
const passport = require('passport');


// ===========================
// MOSTRAR FORMULARIO DE LOGIN
exports.login_get = (req, res, next) => {
    res.render('login', {
        title: 'Iniciar Sesión',
        bodyClass: 'fondo-login',
    });
}


// PROCESAR LOGIN (usa Passport con estrategia local)
// =============================
exports.login_post = (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/posts',
        failureRedirect: '/auth/login',
        failureFlash: true
    })(req, res, next);
};

// LOGOUT
// =================================
exports.logout = (req, res, next) => {
    // logout es fn de passport
    req.logout((err) => {
        if (err) {
            return next(err)
        }
        req.flash('success_msg', 'Sesión cerrada exitosamente');
        res.redirect('/auth/login');
    });
};



// MOSTRAR FORMULARIO DE REGISTRO
exports.register_get = (req, res, next) => {
    res.render('register', {
        title: "Registro de Usuario",
        errors: [],
        bodyClass: 'fondo-registro'
    });
};



// PROCESAR REGISTRO
exports.register_post = async (req, res, next) => {
    const { username, email, password, password2, descripcion } = req.body;

    let errors = [];

    // Validaciones
    if (!username || !email || !password || !password2)
        errors.push({ msg: 'Por favor complete todos los campos' });
    if (password !== password2)
        errors.push({ msg: 'Las dos contraseñas deben ser iguales' });
    if (password.length < 6)
        errors.push({ msg: 'La contraseña debe tener al menos 6 caracteres' });
    if (username.length < 3)
        errors.push({ msg: 'El nombre de usuario debe tener al menos 3 caracteres' });
    if (descripcion && descripcion.length > 100)
        errors.push({ msg: 'La descripcion no puede superar los 100 caracteres' });

    // Si hay errores, volver a mostrar el formulario
    if (errors.length > 0) {
        return res.render('register', {
            title: 'Registro de usuario',
            errors,
            username,
            email,
            descripcion,
            bodyClass: 'fondo-registro',
        });
    }

    // Verificar si el usuario ya existe, hay alguien con este email o este nombre de usuario?
    try {
        const userCount = await User.countDocuments();

        const existeUser = await User.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existeUser) {
            errors.push({ msg: 'El email o nombre de usuario ya esta registrado' });
            return res.render('register', {
                title: 'Registro de usuario',
                errors,
                username,
                email,
                descripcion,
            });
        }

        // HASHEAR CONTRASEÑA CON BCRYPT
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        // nuevo usuario 
        const newUser = new User({
            username: username,
            email: email,
            password: hashedPassword,
            descripcion: descripcion || '',
            isAdmin: userCount === 0
        });

        // Guarda en MongoDB
        await newUser.save();

        req.flash('success_msg', 'Registro exitoso. Ahora puedes iniciar sesión');
        res.redirect('/auth/login');


    } catch (err) {
        console.error(err);
        errors.push({ msg: 'Error al registrar usuario' });
        res.render('register', {
            title: 'Registro de usuario',
            errors,
            username,
            email,
            descripcion
        });
    }

};
