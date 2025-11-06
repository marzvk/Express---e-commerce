
const Comentario = require("../models/comentario");
const Post = require("../models/post");
const { body, validationResult } = require("express-validator");


exports.create_post = [
    body('content', 'El contenido es requerido')
        .trim()
        .isLength({ min: 1 })
        .withMessage('El comentario no puede estar vacio')
        .isLength({ max: 200 })
        .withMessage('El comentario no puede superar los 200 caracteres')
        .escape(),

    async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Usaremos flash para simplificar la redirección:
            // Concatenamos todos los mensajes de error en un solo string
            const errorMessages = errors.array().map(err => err.msg).join(', ');
            req.flash('error_msg', errorMessages);

            return res.redirect(`/posts/${req.params.postId}`);
        }

        try {
            // hasta implementar auth user 
            const originalPost = await Post.findById(req.params.postId).exec();

            if (!originalPost) {
                const err = new Error("Post no encontrado");
                err.status = 404;
                return next(err);
            }

            const { content } = req.body;
            const { postId } = req.params;
            const userId = req.user._id; // usuario logueado

            // instancia del comentario
            const comentario = new Comentario({
                content: content,
                author: userId,
                post: postId
            });


            await comentario.save();
            res.redirect(`/posts/${postId}#comentario-${comentario._id}`);
            // La redirección usa el ancla para saltar al nuevo comentario.

            req.flash('success_msg', 'Comentario publicado exitosamente');


        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error al publicar el comentario');
            res.redirect(`/posts/${req.params.postId}`);
        }
    }]

//    UPDATE ******
exports.update_get = async (req, res, next) => {
    try {
        const comentario = await Comentario.findById(req.params.comentarioId);


        if (!comentario) {
            req.flash('error_msg', 'Comentario no encontrado');
            return res.redirect(`/posts/${req.params.postId}`);
        }

        if (comentario.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            req.flash('error_msg', 'No tienes permisos para editar este comentario');
            return res.redirect(`/posts/${req.params.postId}`);
        }

        res.render('posts/comentario_form', {
            title: 'Editar Comentario',
            post_id: req.params.postId,
            comentario: comentario,
            errors: []
        });

    } catch (error) {
        next(error);
    }
}

exports.update_post = [
    body('content', 'El contenido es requerido')
        .trim()
        .isLength({ min: 1 })
        .withMessage('El comentario no puede estar vacio')
        .isLength({ max: 200 })
        .withMessage('El comentario no puede superar los 200 caracteres')
        .escape(),

    async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // Usaremos flash para simplificar la redirección:
            // Concatenamos todos los mensajes de error en un solo string
            comentarioInvalido.content = req.body.content;

            res.render('posts/comentario_form', {
                title: 'Editar Comentario',
                post_id: req.params.postId,
                comentario: comentarioInvalido,
                _id: comentarioId,// Pasamos el objeto con el texto inválido
                errors: errors.array() // Pasamos el array de errores
            });
            return;
        }

        try {

            const { content } = req.body;
            const { postId, comentarioId } = req.params;
            // const userId = req.user._id; // usuario logueado

            const comentario = new Comentario({
                content: content,
                // author: userId,
                post: postId,
                _id: comentarioId,
            });

            const updatedComentario = await Comentario.findByIdAndUpdate(
                comentarioId,
                comentario,
                {}
            );

            if (!updatedComentario) {
                req.flash('error_msg', 'Comentario a actualizar no encontrado');
                return res.redirect(`/posts/${postId}`);
            }

            req.flash('success_msg', 'Comentario actualizado exitosamente');
            // Redirección al post, apuntando al comentario modificado
            res.redirect(`/posts/${postId}#comentario-${comentarioId}`);

        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error al publicar el comentario');
            res.redirect(`/posts/${req.params.postId}`);
        }
    }]


//   DELETE  *****
exports.delete_post = async (req, res, next) => {
    try {
        const comentario = await Comentario.findById(req.params.comentarioId);

        if (!comentario) {
            req.flash('error_msg', 'Comentario no encontrado');
            return res.redirect('/posts');
        }

        // verificar que sea el autor o el admin
        if (comentario.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            req.flash('error_msg', 'No tienes permisos para eliminar comentario')
            return res.redirect(`/posts/${comentario.post}`);
        }

        await Comentario.findByIdAndDelete(req.params.comentarioId);
        req.flash('success_msg', 'Comentario elimindo');
        res.redirect(`/posts/${comentario.post}`);

    } catch (error) {
        return next(error);
    }
};