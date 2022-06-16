import express                                                     from 'express';
import asyncHandler                                                from 'express-async-handler';
// import { celebrate, Joi }                                          from 'celebrate';
import { EndUseFuelMapProvider }                                   from '../../../../utils/providers';

const router = express.Router();

class EndUseFuelMapController {
  static async list({ query }, res) {
    const { rows: data }   = await EndUseFuelMapProvider.listRemote([
      query.fuelType
        ? { method: [ 'byKeyInArray', 'fuelType', [ query.fuelType ] ] }
        : {}
    ], {}, false);
    res.json({ data: data.reduce((acc, c) => ({ ...acc, [ c.endUse ]: c.id }), {}) });
  }
}

router.get('/', asyncHandler(EndUseFuelMapController.list));

export default router;
