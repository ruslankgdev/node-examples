import express                                                                           from 'express';
import asyncHandler                                                                      from 'express-async-handler';
import { celebrate, Joi }                                                                from 'celebrate';
import {
  ProjectEdBrandsProvider
}                                 from '../../../../utils/providers';

const router = express.Router();

class EdBrandController {
  static get preGet() {
    return celebrate({
      query: Joi.object().keys({
        projectId: Joi.number().required(),
        brand:     Joi.string().required()
      })
    });
  }

  static async get({ query }, res) {
    const data = await ProjectEdBrandsProvider.getRemote([], {
      where: query
    });
    res.json({ data: data || {} });
  }

  static get preUpdate() {
    return celebrate({
      body: Joi.object().keys({
        projectId: Joi.number().required(),
        brand:     Joi.string().required(),
        fileName:  Joi.string().required(),
        fileUrl:   Joi.string().required()
      })
    });
  }

  static async update({ body }, res) {
    await ProjectEdBrandsProvider.upsertRemote(body);
    res.json({ data: body });
  }
}

router.get('/', [ EdBrandController.preGet ], asyncHandler(EdBrandController.get));
router.patch('/', [ EdBrandController.preUpdate ], asyncHandler(EdBrandController.update));


export default router;
