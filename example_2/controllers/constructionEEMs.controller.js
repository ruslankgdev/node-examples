import express                                                                           from 'express';
import asyncHandler                                                                      from 'express-async-handler';
import {
  EEMSystemsProvider,
  EEMSystemMapProvider
}                                            from '../../../../utils/providers';

const router = express.Router();

class ConstructionEEMsController {
  static async list({ query }, res) {
    const {
      offset = 0,
      limit = Number.MAX_SAFE_INTEGER,
      ...filters
    }                           = query || {};

    const scopes = [ { method: [ 'paginable', +limit, +offset ] } ];

    Object.entries(filters)
      .filter(([ , v ]) => v)
      .forEach(([ k, v ]) => {
        scopes.push({ method: [ 'searchable', k, v ] });
      }, {});

    const { rows: data, count } = await EEMSystemMapProvider.listRemote(scopes);
    res.json({ data, count });
  }

  static async listSystems(req, res) {
    const { rows: data } = await EEMSystemsProvider.listRemote([], {}, false);
    res.json({ data });
  }

  static async create({ body }, res) {
    await EEMSystemMapProvider.createRemote(body);
    res.json(body);
  }

  static async update({ body, params: { id } }, res) {
    await EEMSystemMapProvider.updateRemote(body, [
      { method: [ 'byKeyInArray', 'id', [ id ] ] }
    ]);
    res.json(body);
  }

  static async delete({ params: { id } }, res) {
    const countRemoved = await EEMSystemMapProvider.deleteRemote([
      { method: [ 'byKeyInArray', 'id', [ id ] ] }
    ], { where: { id } });
    res.json({ countRemoved });
  }
}

router.get('/', asyncHandler(ConstructionEEMsController.list));
router.post('/', asyncHandler(ConstructionEEMsController.create));
router.patch('/:id', asyncHandler(ConstructionEEMsController.update));
router.delete('/:id', asyncHandler(ConstructionEEMsController.delete));

router.get('/systems', asyncHandler(ConstructionEEMsController.listSystems));

export default router;
