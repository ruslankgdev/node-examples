import express                                                     from 'express';
import asyncHandler                                                from 'express-async-handler';
// import { celebrate, Joi }                                          from 'celebrate';
import { EndUseProfileProvider }                                   from '../../../../utils/providers';

const router = express.Router();

class EndUseProfileController {
  static async list({ user: { companyId } }, res) {
    const { rows: data }   = await EndUseProfileProvider.listRemote([
      { method: [ 'byKeyInArray', 'companyId', [ -1, companyId ] ] }
    ], {}, false);
    res.json({ data });
  }

  static async update({ body, user: { companyId } }, res) {
    const payload = await Promise.all(
      body.map((item) => EndUseProfileProvider.upsertRemote(Object.assign(item, { companyId })))
    );
    res.json(payload);
  }
}

router.get('/', asyncHandler(EndUseProfileController.list));
router.post('/', asyncHandler(EndUseProfileController.update));

export default router;
