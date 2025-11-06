const { body, validationResult } = require("express-validator");

const Post = require("../models/post");
const Categoria = require("../models/categoria");
const Comentario = require("../models/comentario");
const user = require("../models/user");


// Lista de todos los posts
exports.post_list = async (req, res, next) => {
    const allPosts = await Post.find({})
        .sort({ createdAt: -1 })
        .populate("category")
        .populate("author", "username")
        .exec();

    res.render("posts/post_list", {
        title: "Posts del Blog",
        post_list: allPosts,
        user: req.user || null,
    });
};

// Detalle de cada post
exports.post_detail = async (req, res, next) => {
    try {
        const postId = req.params.postId;

        const post = await Post.findById(postId)
            .populate('author', 'username')
            .populate('category', 'name')
            .exec();

        const comentarios = await Comentario.find({
            post: postId
        })
            .populate('author', 'username icono')
            .sort({ createdAt: -1 })
            .exec();

        if (!post) {
            const err = new Error('Post no encontrado');
            err.status = 404;
            return next(err);
        }

        res.render('posts/post_detail', {
            title: post.title,
            post: post,
            comentarios: comentarios,
            user: req.user || null,
        });

    } catch (err) {
        next(err);
    }

};

// En el GET se cargan los datos necesarios para mostrar el formulario, 
// y en el POST procesas lo que el usuario envió.

// GET - Mostrar formulario de crear post
exports.post_create_get = async (req, res, next) => {
    // Cargar datos necesarios para el formulario
    const categorias = await Categoria.find().sort({ name: 1 }).exec();

    // Si solo admins pueden crear posts:
    // const autores = await User.find({ isAdmin: true }).exec();

    if (categorias === null) {
        const err = new Error('categoria not found');
        err.status = 404;
        return next(err);
    }

    res.render("posts/post_form", {
        title: "Create Post",
        categorias,
    });
};

// POST - Procesar el formulario
exports.post_create_post = [
    // Validación con express-validator
    body('title', 'El título es requerido')
        .trim()
        .isLength({ min: 1, max: 100 })
        .escape(),
    body('content', 'El contenido es requerido')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('category', 'La categoría es requerida')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('image')
        .optional({ checkFalsy: true })
        .trim()
        .isURL()
        .withMessage('Debe ser una URL válida'),

    async (req, res, next) => {
        const errors = validationResult(req);

        // Crear objeto Post con los datos del formulario
        const post = new Post({
            title: req.body.title,
            content: req.body.content,
            author: req.user._id, // Del usuario logueado
            category: req.body.category,
            image: req.body.image || null
        });

        if (!errors.isEmpty()) {
            // Hay errores - volver a mostrar el formulario
            const categorias = await Categoria.find().sort({ name: 1 }).exec();

            res.render('posts/post_form', {
                title: 'Crear Post',
                categorias: categorias,
                post: post, // Para mantener los datos ingresados
                errors: errors.array()
            });
            return;
        }

        // No hay errores - guardar
        await post.save();
        // Redirect a post detail
        res.redirect(post.url);
    }
];

// DELETE
exports.post_delete_get = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId).exec();

        if (post === null) {
            res.redirect("/posts");
            return;
        }

        res.render("posts/post_delete", {
            title: "Delete Post",
            post: post,
        });
    } catch (err) {
        return next(err)
    };
};

exports.post_delete_post = async (req, res, next) => {
    try {
        const postId = req.body.postId;

        await Post.findByIdAndDelete(postId);
        res.redirect("/posts");
    } catch (err) {
        return next(err)
    };
};

// UPDATE
exports.post_update_get = async (req, res, next) => {
    try {
        const [post, categorias] = await Promise.all([
            Post.findById(req.params.postId).populate("category").exec(),
            Categoria.find().sort({ name: 1 }).exec()]);

        if (post === null) {
            const error = new Error("Post not found");
            error.status = 404
            return next(error)
        }

        res.render("posts/post_form", {
            title: "Update Post",
            post: post,
            categorias: categorias,
        })
    } catch (error) {
        return next(error)
    };
};

exports.post_update_post = [
    // Validación con express-validator
    body('title', 'El título es requerido')
        .trim()
        .isLength({ min: 1, max: 100 })
        .escape(),
    body('content', 'El contenido es requerido')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('category', 'La categoría es requerida')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('image')
        .optional({ checkFalsy: true })
        .trim()
        .isURL()
        .withMessage('Debe ser una URL válida'),


    async (req, res, next) => {
        // Errores de validacion de la request
        const errors = validationResult(req);

        // Luego corregir el author en linea 227 con la authentication
        const originalPost = await Post.findById(req.params.postId).exec();

        if (!originalPost) {
            const err = new Error("Post no encontrado");
            err.status = 404;
            return next(err);
        }

        // req.body porq va a llegar del form
        const post = new Post({
            title: req.body.title,
            content: req.body.content,
            author: originalPost.author, // usuario logueado
            category: req.body.category,
            image: req.body.image || null,
            _id: req.params.postId, // si no esta se creara con un nuevo id
        });

        if (!errors.isEmpty()) {
            // Hay errores - volver a mostrar el formulario
            const categorias = await Categoria.find().sort({ name: 1 }).exec();

            res.render("posts/post_form", {
                title: "Update Post",
                post: post,
                categorias: categorias,
                errors: errors.array(),
            });
            return;
        }

        // Data from form is valid
        const updatedPost = await Post.findByIdAndUpdate(req.params.postId, post, {});

        res.redirect(updatedPost.url);

    },
];


