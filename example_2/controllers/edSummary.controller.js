/* eslint-disable camelcase */
/* eslint-disable max-len */
/* eslint-disable no-restricted-globals */
import express                                                       from 'express';
import asyncHandler                                                  from 'express-async-handler';
import { celebrate, Joi }                                            from 'celebrate';

import uniq                                                          from 'lodash/uniq';
import {
  ProjectFuelRatesProvider,
  EdVariationsProvider
}                                                                    from '../../../../utils/providers';
import { TYPES }                                                     from '../../../../utils/utilities';

import EdSummaryService                                              from '../services/edSummary.service.js';


const router = express.Router();

class EDSummaryController {
  static get parseListArgs() {
    return (req, res, next) => {
      req.query.eemIds    = req.query.eemId.split(',');
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

  static async get(req, res) {
    const data = await EdSummaryService.getSummary(Object.assign(req.params, req.query));

    res.json({
      data
    });
  }

  static async update({ body }, res) {
    await ProjectFuelRatesProvider.upsertRemote(body);
    res.json(body);
  }

  static get preOprions() {
    return celebrate({
      params: Joi.object().keys({
        projectId: Joi.number().required()
      }),
      query: Joi.object().keys({
        brand: Joi.string().required()
      })
    });
  }

  static async options({ params, query }, res) {
    const { rows } = await EdVariationsProvider.listRemote([
      { method: [ 'byKeyInArray', 'project_id', [ params.projectId ] ] },
      { method: [ 'groupConcat', [ 'variant', 'project_id' ], [ 'fuel_type', 'eem_id' ] ] }
    ], {
      where: { brand: query.brand }
    }, false);

    res.json({
      data: rows.map(({
        dataValues: {
          variant, fuel_type, eem_id, project_id, brand
        }
      }) => ({
        project_id,
        variant,
        brand,
        fuelTypes: uniq(fuel_type.split(',')),
        eemIds:    uniq(eem_id.split(',')).map(v => +v)
      }))
    });
  }

  static get preUpdateOptions() {
    return celebrate({
      body: Joi.array().items(
        Joi.object().keys({
          eemId:    Joi.number().required(),
          brand:    Joi.string().required(),
          fuelType: Joi.string().required()
        })
      )
    });
  }

  static async updateOptions({ body, params }, res) {
    const results = await Promise.all(body.map((record) => EdVariationsProvider.findOrCreate(Object.assign(record, params))));
    await Promise.all(results.map(([ model, isNew ]) => !isNew && EdVariationsProvider.delete([], { where: model.dataValues })));
    res.json({});
  }
}

router.get(
  '/options/:projectId',
  [  EDSummaryController.preOprions ],
  asyncHandler(EDSummaryController.options)
);

router.get(
  '/:projectId',
  [  EDSummaryController.parseListArgs, EDSummaryController.preGet ],
  asyncHandler(EDSummaryController.get)
);

router.patch(
  '/options/:projectId/variant/:variant',
  [  EDSummaryController.preUpdateOptions ],
  asyncHandler(EDSummaryController.updateOptions)
);

export default router;
