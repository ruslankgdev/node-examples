const mongoose = require('mongoose');

module.exports = function (owner, engine) {
    mongoose.model('Media', mongoose.Schema({
        creator_id: {type: Number},
        creator_display_name: {type: String},
        s3_url: {type: String},
        name: {type: String, required: true},
        description: {type: String},
        type: {type: String},
        chronicle_id: {type: mongoose.Schema.Types.ObjectId},
        character_id: {type: mongoose.Schema.Types.ObjectId},
        tags: {}
    }, {
        versionKey: false,
        timestamps: true,
        collection: 'user_media'
    }));
};
