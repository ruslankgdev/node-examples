import express                                                      from 'express';
import asyncHandler                                                 from 'express-async-handler';
import { celebrate, Joi }                                           from 'celebrate';
import { ProjectFuelRatesProvider }                                 from '../../../../utils/providers';

import ProjectFuelRatesService                                      from '../services/projectFuelRates.service';

const router = express.Router();

const payloadRules = Joi.object().keys({
  projectId:   Joi.number().required(),
  fuelType:    Joi.string().required(),
  rate:        Joi.number(),
  kWhModifier: Joi.number()
}).options({ stripUnknown: true, convert: true });

class ProjectFuelRatesController {
  static get preGet() {
    return celebrate({
      query: { fuelType: Joi.string().required() }
    });
  }

  static get prePatch() {
    return celebrate({
      body: payloadRules
    });
  }

  static async get({ params: { projectId }, user: { userId }, query: { fuelType } }, res) {
    res.json({
      data: await ProjectFuelRatesService.get(userId, projectId, fuelType)
    });
  }

  static async update({ body, params: { projectId } }, res) {
    await ProjectFuelRatesProvider.upsertRemote(Object.assign(body, { projectId }));
    res.json(body);
  }
}

router.get('/:projectId', [ ProjectFuelRatesController.preGet ], asyncHandler(ProjectFuelRatesController.get));
router.patch('/:projectId', [ ProjectFuelRatesController.prePatch ], asyncHandler(ProjectFuelRatesController.update));

export default router;
