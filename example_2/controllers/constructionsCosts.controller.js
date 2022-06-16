/* eslint-disable max-len */
import express                                                                        from 'express';
import asyncHandler                                                                   from 'express-async-handler';
import { celebrate, Joi }                                                             from 'celebrate';
import {
  ConstructionsCostsProvider
}                                 from '../../../../utils/providers';

const router = express.Router();


class ConstructionsCostsController {
  static get preList() {
    return celebrate({
      params: Joi.object().keys({
        id: Joi.number().required()
      }),
      query: Joi.object().keys({
        brand: Joi.string().required()
      })
    });
  }

  static async get({ params, user, query }, res) {
    const { rows: data }   = await ConstructionsCostsProvider.listRemote([
      { method: [ 'byProjectId', params.id ] },
      { method: [ 'withProjectMapByUser', null, null, user.userId ] },
      { method: [ 'withEEM' ] },
      { method: [ 'withSystem' ] }
    ], {
      attributes: [ 'id', 'qty', 'pieceCost', 'installCost', 'eemSystemMapId' ],
      where:      { brand: query.brand }
    }, false);
    res.json({ data });
  }

  static get preUpdate() {
    return celebrate({
      body: Joi.object().keys({
        eemSystemMapId: Joi.number().required(),
        brand:          Joi.string().required(),
        projectId:      Joi.number(),
        qty:            Joi.number(),
        pieceCost:      Joi.number(),
        installCost:    Joi.number(),
        id:             Joi.number()
      }).options({ stripUnknown: true })
    });
  }

  // eslint-disable-next-line camelcase
  static async createOrUpdate({ body }, res) {
    const payload = {
      ...body
    };
    const isNew   = await ConstructionsCostsProvider.upsertRemote(payload, { returning: true, payload });
    if (isNew) {
      const { id: eemId } = await ConstructionsCostsProvider.getRemote([], { where: payload });
      return res.json({ data: { ...payload, id: eemId } });
    }
    res.json({ payload });
  }

  static async delete({ params: { id }, user }, res) {
    const countRemoved = await ConstructionsCostsProvider.deleteRemote([
      { method: [ 'withProjectMapByUser', null, null, user.userId ] }
    ], { where: { id } });
    res.json({ countRemoved });
  }
}

router.get('/:id', [ ConstructionsCostsController.preList ], asyncHandler(ConstructionsCostsController.get));
router.delete('/:id', asyncHandler(ConstructionsCostsController.delete));
router.post('/', [ ConstructionsCostsController.preUpdate ], asyncHandler(ConstructionsCostsController.createOrUpdate));

export default router;
