import express                                              from 'express';
import asyncHandler                                         from 'express-async-handler';
import { celebrate, Joi }                                   from 'celebrate';
import { EEMSurveyProvider }                                from '../../../../utils/providers';

const router = express.Router();

class EEMSurveyController {
  static get preUpdate() {
    return celebrate({
      body: Joi.object().keys({
        projectId: Joi.number().required()
      }).unknown()
    });
  }

  static async get({ params }, res) {
    const data   = await EEMSurveyProvider.getRemote([
      { method: [ 'byProjectId', params.id ] }
    ]);
    res.json({ data });
  }

  // eslint-disable-next-line camelcase
  static async createOrUpdate({ body: { project_id, ...rest } }, res) {
    const payload = {
      ...rest
    };
    await EEMSurveyProvider.upsertRemote(payload);
    res.json({ payload });
  }
}

router.get('/:id', asyncHandler(EEMSurveyController.get));
router.post('/', [ EEMSurveyController.preUpdate ], asyncHandler(EEMSurveyController.createOrUpdate));

export default router;
