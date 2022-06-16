import express                                                     from 'express';
import asyncHandler                                                from 'express-async-handler';
import { celebrate, Joi }                                          from 'celebrate';
import { BaselineProfilesProvider }                                from '../../../../utils/providers';
import BaselineProfilesService                                     from '../services/baselineProfiles.service';
import { TYPES }                                                   from '../../../../utils/utilities';

const router = express.Router();

class BaselineProfileController {
  static get parseListArgs() {
    return (req, res, next) => {
      req.query.projectIds = req.query.projectIds.split(',');
      req.query.fuelTypes  = req.query.fuelTypes.split(',');
      next();
    };
  }

  static get preList() {
    return celebrate({
      query: Joi.object().keys({
        fuelTypes:  Joi.array().items(Joi.string()).default(Object.keys(TYPES)),
        brand:      Joi.string().default('WTA'),
        projectIds: Joi.array().min(1).required()
      })
    });
  }

  static async list(req, res) {
    const data   = await BaselineProfilesService.list(req.query);
    res.json({ data });
  }

  static get preUpdate() {
    return celebrate({
      params: Joi.object().keys({
        id: Joi.number().required()
      }),
      body: Joi.object().keys({
        endUseFuelMapId: Joi.number().required(),
        endUseProfileId: Joi.number().required(),
        brand:           Joi.string().required(),
        id:              Joi.number(),
        projectId:       Joi.number(),
        proportion:      Joi.number()
      })
    });
  }

  // eslint-disable-next-line camelcase
  static async update({ body }, res) {
    const entity = {
      ...body
    };
    const isNew  = await BaselineProfilesProvider.upsertRemote(entity, { payload: entity });
    const result = isNew
      ? await BaselineProfilesProvider.getRemote([], { where: entity })
      : entity;
    // const payload = await BaselineProfilesProvider.getRemote([], { where: entity });
    res.json({ result });
  }

  static async delete({ params: { id }, user }, res) {
    const countRemoved = await BaselineProfilesProvider.deleteRemote([
      { method: [ 'withProjectMapByUser', null, null, user.userId ] }
    ], { where: { id } });
    res.json({ countRemoved });
  }
}

router.get(
  '/',
  [ BaselineProfileController.parseListArgs, BaselineProfileController.preList ],
  asyncHandler(BaselineProfileController.list)
);

router.post(
  '/:id',
  [ BaselineProfileController.update ],
  asyncHandler(BaselineProfileController.update)
);

router.delete('/:id', asyncHandler(BaselineProfileController.delete));

export default router;
