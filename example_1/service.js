const _ = require('lodash'),
    request = require('request'),
    Q = require('q'),
    session = require('express-session'),
    parser = require('ua-parser-js'),
    DataHelpers = require('./helpers/helpers.data.js'),
    CreatorHelper = require('./helpers/character/creator');

let jsapiClient = null,
    kneMongo = null,
    kneRedis = null,
    Character = null,
    ExternalApiService = null,
    JsapiService = null,
    User = null,
    ChronicleService = null,
    SSDService = null,
    SocketService = null,
    io;

class CharacterService {
    init(defer) {
        kneMongo = this.engine.getSubmodule('kne-mongo');
        jsapiClient = this.engine.getSubmodule('kne-jsapi').getClient();
        kneRedis = this.engine.getSubmodule('kne-redis').getClient();
        SocketService = this.engine.getModule('socket-service');

        SocketService.registerEvents([
            {event: 'viewing:character', callback: this.onCharacterView.bind(this)},
            {event: 'leaving:character', callback: this.onLeaveCharacterView.bind(this)}
        ]);

        io = SocketService.getClient();

        DataHelpers = new DataHelpers;
        DataHelpers.setCache(kneRedis);
        defer.resolve();
    }

    postInit(defer) {
        const self = this;
        Character = kneMongo.getModel('Characters');
        User = kneMongo.getModel('users');
        ExternalApiService = this.engine.getModule('external-api-service');
        JsapiService = this.engine.getModule('jsapi-service');
        ChronicleService = this.engine.getModule('chronicles-service');
        SSDService = this.engine.getModule('ssd-service');

        defer.resolve();
    }

    /**
     *
     * @param character
     * @returns {*}
     */
    getModifier(character) {
        let modifier;
        switch (character.type) {
            case 'vampire':
                modifier = require('../vampire-larp-service/modifiers');
                break;
            case 'werewolf':
                modifier = require('../werewolf-larp-service/modifiers');
                break;
            default:
                modifier = require('./modifiers');
        }

        return new modifier(kneRedis);
    }

    /**
     *
     * @param user_id
     * @param display_name
     * @param chronicle
     * @param type
     * @param title
     * @param name
     * @param alias
     * @param extras
     */
    create(user_id, display_name, chronicle, type, title, name, alias, ssd_id, extras, state = {}) {
        const defer = Q.defer(),
            isError = false,
            self = this;

        if (!user_id || !name) {
            defer.reject('Bad or missing data sent to endpoint');
        }

        if (state != 'npc') {
            state = 'wizard';
        }

        const Creator = new CreatorHelper(kneMongo);

        const characterObj = {
            creator_id: user_id,
            creator_display_name: display_name,
            chronicle_id: chronicle || null,
            state: state,
            title: title,
            ssd: ssd_id,
            name: name,
            alias: alias || null,
            type: type,
            beast_traits: 0,
            attribute_bonus: 0,
            dmg_healthy: ['E', 'E', 'E'],
            dmg_injured: ['E', 'E', 'E'],
            dmg_incapacitated: ['E', 'E', 'E'],
            willpower_current: 6,
            willpower_max: 6,
            backgrounds: [],
            skills: [],
            disciplines: [],
            rituals: [],
            techniques: [],
            flaws: [],
            merits: [],
            change_log: [{name: 'Character Created', time: new Date()}],
        };

        Creator.setCharacterData(characterObj);
        Creator.setExtras(extras);

        return this.getCreatureTypes()
            .then(Creator.setCreatureTypes.bind(Creator))
            .then(creatures => User.findOne({user_id: user_id}))
            .then(user => Creator.setLocalUser(user))
            .then(() => SSDService.getSsdById([ssd_id]))
            .then(ssds => Creator.setSSDs(ssds))
            .then(() => DataHelpers.getSkills())
            .then(skills => Creator.setSkills(skills))
            .then(Creator.makeCharacter.bind(Creator))
            .then(character => {

                self.engine.emit('character:pre:create', character, type, Creator.getExtras());

                JsapiService.triggerEvent('character_created', {
                    user_id: user_id,
                    type: character.type
                });

                return character;
            });
    }

    /**
     * Allows character creator to retrieve the character
     * If the character is assigned to a chronicle, allow any of the chronicle's storytellers to retrieve the character
     *
     * @param character_id
     * @param user_id
     * @returns the character object
     */
    findById(character_id, user_id) {

        const defer = Q.defer();

        return Character.findById(character_id).populate('ssd', 'name starting_xp').populate('chronicle_id').then(character => {

            switch (true) {
                case character.creator_id === user_id:
                case character.chronicle_id.storytellers.findIndex(s => s.user_id === user_id) !== -1:
                case character.chronicle_id.narrators.findIndex(n => n.user_id === user_id) !== -1:
                case character.chronicle_id.creator_id === user_id:
                    defer.resolve(character);
                    break;
                default:
                    defer.reject('Character query failed');
            }

            return defer.promise;
        });
    }

    /**
     *
     * @param user_id
     * @param character_id
     * @param attributes
     */
    setAttributes(user_id, character_id, attributes) {

        return Character.findById(character_id).exec().then(character => {

            attributes.forEach(attribute => {
                attribute.dots = [];
                character.helpers.attribute.set(attribute);
                _.times(attribute.current_value, function () {
                    character.helpers.dot.add('attributes', attribute.name, null);
                });
            });

            return character.save();
        });
    };

    /**
     *
     * @param user_id
     * @param character_id
     * @param backgrounds
     */
    setBackgrounds(user_id, character_id, backgrounds) {
        const defer = Q.defer();
        return Character.findById(character_id).exec().then(character => {

            switch (character.type) {
                case 'vampire':
                    if (backgrounds.find(b => b.name === 'Rank')) {
                        defer.reject({err: {message: 'Vampires cannot choose Rank', err: err}});
                        return defer.promise;
                    }
                    break;
                case 'werewolf':
                    if (backgrounds.find(b => b.name === 'Generation' || b.name === 'Diablerie')) {
                        defer.reject({err: {message: 'Werewolves cannot choose Generation or Diablerie', err: err}});
                        return defer.promise;
                    }
                    break;
            }
            character.backgrounds = [];
            // add each new background and set its dots
            backgrounds.forEach(background => {
                var newBackground = {
                    name: background.name,
                    current_value: background.current_value,
                    max_value: 5,
                    dots: [],
                    extra: background.extra
                };

                character.backgrounds.push(newBackground);
                _.times(newBackground.current_value, function () {
                    character.helpers.dot.add('backgrounds', newBackground.name, null);
                });
            });

            return character.save();
        });
    }

    /**
     *
     * @param user_id
     * @param character_id
     */
    saveCharacter(user_id, character_id) {
        return Character.findById(character_id).then(character => {
            if (character.creator_id === user_id) {
                _.forEach(character._doc, (value, key) => {
                    if (_.isArray(character[key]) && _.find(character[key], k => k.dots)) {
                        _.map(character[key], obj => _.map(obj.dots, dot => dot.cost = null))
                        character.markModified(key)
                    } else if (key == 'morality') {
                        _.map(character[key].dots, dot => dot.cost = null)
                        character.markModified(key)
                    }
                });
                character.unsaved = false;
                return character.save();
            } else {
                return Q.reject({err: {message: 'Access denied'}});
            }
        });
    }

    /**
     *
     * @param user_id
     * @param character_id
     * @param description
     * @param is_storyteller
     */
    setPublicHistory(user_id, character_id, public_history, is_storyteller) {
        const defer = Q.defer();

        return Character.findById(character_id).then(character => {

            if (character.creator_id !== user_id && is_storyteller === false) {
                defer.reject({err: {message: 'This is not your character.'}});
                return defer.promise;
            }

            character.public_history = public_history;
            return character.save();
        });
    }

    /**
     *
     * @returns {*}
     */
    getCreatureTypes() {
        return DataHelpers.getCreatureTypes();
    }

    /**
     *
     * @param socket
     * @param character_id
     */
    onCharacterView(socket, character_id) {
        Character.findById(character_id).populate('chronicle_id').then(character => {
            if (character.chronicle_id === null) {
                return;
            }

            // Join user to socket
            socket.join(`character:${character_id}`);

            io.to(`character:${character_id}`).emit('viewing:character', socket.userData);
        });
    }

    /**
     *
     * @param socket
     * @param character_id
     */
    onLeaveCharacterView(socket, character_id) {
        socket.leave(`character:${character_id}`);
        io.to(`character:${character_id}`).emit('leaving:character', socket.userData);
    }
}

module.exports = CharacterService;
module.exports.configs = {};
module.exports.submodules = [
    'kne-mongo',
    'kne-express',
];
