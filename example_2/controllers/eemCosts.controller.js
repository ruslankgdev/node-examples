/* eslint-disable max-len */
import express                                                                        from 'express';
import asyncHandler                                                                   from 'express-async-handler';
import { celebrate, Joi }                                                             from 'celebrate';
import pick                                                                           from 'lodash/pick';
import {
  EEMCostsProvider
}                                 from '../../../../utils/providers';

const router = express.Router();

const pickedKeys = {
  commonKeys: [ 'id', 'name' ],
  design:     [ 'taskTotal' ],
  operation:  [ 'monthlyCost' ]
};

class EEMCostsController {
  static get preList() {
    return celebrate({
      params: Joi.object().keys({
        id: Joi.number().required()
      }),
      query: Joi.object().keys({
        brand:    Joi.string().required(),
        fuelType: Joi.string().required()
      })
    });
  }

  static async get({ params, user, query }, res) {
    const { rows }   = await EEMCostsProvider.listRemote([
      { method: [ 'byProjectId', params.id ] },
      { method: [ 'withProjectMapByUser', null, null, user.userId ] }
    ], {
      where: { brand: query.brand }
    }, false);
    res.json({
      data: rows.reduce((acc, c) => {
        const temp =  acc[ c.costKey ] || [];
        switch (c.costKey) {
          case 'design': return { ...acc, [ c.costKey ]: [ ...temp, pick(c, [ ...pickedKeys.commonKeys, ...pickedKeys.design ]) ] };
          case 'operation': return { ...acc, [ c.costKey ]: [ ...temp, pick(c, [ ...pickedKeys.commonKeys, ...pickedKeys.operation ]) ] };
          default: return acc;
        }
      }, {})
    });
  }

  static get preUpdate() {
    return celebrate({
      body: Joi.object().keys({
        projectId:   Joi.number().required(),
        brand:       Joi.string().required(),
        costKey:     Joi.string().required(),
        name:        Joi.string().required(),
        taskTotal:   Joi.number(),
        monthlyCost: Joi.number()
      })
    });
  }

  // eslint-disable-next-line camelcase
  static async createOrUpdate({ body }, res) {
    const payload = {
      ...body
    };
    await EEMCostsProvider.upsertRemote(payload, { returning: true });
    res.json({ payload });
  }
}

router.get('/:id', [ EEMCostsController.preList ], asyncHandler(EEMCostsController.get));
router.post('/', [ EEMCostsController.preUpdate ], asyncHandler(EEMCostsController.createOrUpdate));

export default router;
