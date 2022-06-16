import express                                                        from 'express';
import asyncHandler                                                   from 'express-async-handler';
import { celebrate, Joi }                                             from 'celebrate';
import groupBy                                                        from 'lodash/groupBy';
import {
  EndUseReductionsProvider
}                                                                     from '../../../../utils/providers';
import { TYPES }                                                      from '../../../../utils/utilities';

import EndUseReductionsService                                        from '../services/endUseReductions.service';


const router = express.Router();

class EndUseReductionController {
  static get parseListArgs() {
    return (req, res, next) => {
      req.query.eemIds    = (req.query.eemId || '').split(',').filter(v => !!v);
      req.query.fuelTypes = req.query.fuelType.split(',');
      next();
    };
  }

  static get preGet() {
    return celebrate({
      params: Joi.object().keys({
        projectId: Joi.number().required()
      }),
      query: Joi.object().keys({
        fuelTypes: Joi.array().items(Joi.string()).default(Object.keys(TYPES)),
        brand:     Joi.string().default('WTA'),
        eemIds:    Joi.array().items(Joi.number()).default([])
      }).options({ stripUnknown: true })
    });
  }

  static async get({ params, query }, res) {
    const data     = await EndUseReductionsService.list(
      Object.assign(query, { projectIds: [ params.projectId ] })
    );

    res.json({
      exrta: Object.entries(groupBy(data, 'dataValues.name')),
      data:  Object.entries(groupBy(data, 'dataValues.name'))
        .reduce(EndUseReductionsService.endUseReductionReducer, [])
    });
  }

  static get preUpdate() {
    return celebrate({
      body: Joi.object().keys({
        brand:           Joi.string().required(),
        eemId:           Joi.number().required(),
        endUseFuelMapId: Joi.number().required(),
        projectId:       Joi.number().required(),
        reduction:       Joi.number().required()
      })
    });
  }

  // eslint-disable-next-line camelcase
  static async createOrUpdate({ body }, res) {
    await EndUseReductionsProvider.upsertRemote(body);
    res.json({ body });
  }
}

router.get(
  '/:projectId',
  [ EndUseReductionController.parseListArgs, EndUseReductionController.preGet ],
  asyncHandler(EndUseReductionController.get)
);
router.post('/', [ EndUseReductionController.preUpdate ], asyncHandler(EndUseReductionController.createOrUpdate));

export default router;
