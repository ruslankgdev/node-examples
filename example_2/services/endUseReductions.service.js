import get                                                     from 'lodash/get';
import { EndUseReductionsProvider }                            from '../../../../utils/providers';


class EndUseReductionService {
  static endUseReductionReducer(acc, [ k, v ]) {
    return [
      ...acc,
      {
        eem: k,
        ...v.reduce((accc, c) => ({
          ...accc,
          eemCost:                         c.eem.qty * c.eem.pieceCost + c.eem.installCost,
          [ c.endUse || c.get('endUse') ]: c.reduction,
          eemId:                           get(c, 'eemId')
        }), {})
      }
    ];
  }

  static async list({
    brand, projectIds, fuelTypes, eemIds
  }) {
    const scopes = [
      { method: [ 'withEndUse' ] },
      { method: [ 'withEem' ] }
    ];

    eemIds.length && scopes.push({ method: [ 'byKeyInArray', 'eem_id', eemIds ] });
    projectIds.length && scopes.push({ method: [ 'byKeyInArray', 'project_id', projectIds ] });
    fuelTypes.length && scopes.push({ method: [ 'byFuelType', fuelTypes ] });

    const { rows }   = await EndUseReductionsProvider.listRemote(scopes, {
      where:      { brand },
      attributes: [ 'reduction', 'eemId', 'brand' ]
    }, false);

    return rows;
  }
}

export default EndUseReductionService;
