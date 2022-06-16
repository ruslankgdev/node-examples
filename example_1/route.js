module.exports = (owner, engine, app) => {
    app.get('/api/store', (req, res, next) => {
        owner.getItems().then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.get('/api/store/troupe/:id', app.isAuth, (req, res, next) => {
        owner.getItems(req.params.id, req.session.jsapi_user.id).then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.get('/api/store/:id', (req, res, next) => {
        owner.getItem(req.session.jsapi_user ? req.session.jsapi_user.id : null, req.params.id).then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.get('/api/store/coupons/:coupon_id/oneTimeUse/:how_many', (req, res, next) => {
        owner.getCouponCodes(req.params.coupon_id, req.params.how_many).then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.post('/api/store/:id', app.isAuth, (req, res, next) => {
        owner.createItem(req.session.jsapi_user.id, req.params.id, req.body).then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.put('/api/store/:id', app.isAuth, (req, res, next) => {
        owner.updateItem(req.session.jsapi_user.id, req.params.id, req.body).then(
            response => res.json(response),
            error => res.status(error.statusCode).json(error.result)
        );
    });

    app.delete('/api/store/:id', app.isAuth, (req, res, next) => {
        owner.deleteItem(req.session.jsapi_user.id, req.params.id).then(
            response => res.json(response.result),
            error => res.status(error.statusCode).json(error.result)
        );
    });
};
