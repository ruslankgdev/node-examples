import groupBy                                                                    from 'lodash/groupBy';
import get                                                                        from 'lodash/get';
import isFinite                                                                   from 'lodash/isFinite';
import {
  BaselineProfilesProvider,
  ConsumptionsBaselineProvider,
  BuildingsProvider
}            from '../../../../utils/providers';

const groupByProject = (items) => groupBy(items.map(({ dataValues }) => dataValues), 'project_id');

const groupByProjectAndFuel = ({ rows }) => Object.entries(groupByProject(rows)).reduce(
  (acc, [ k, v ]) => ({ ...acc, [ k ]: groupBy(v, 'fuelType') }),
  {}
);

function getUIValue(value, [ area ] = [ {} ]) {
  const conditionedUi =     value / +area.conditioned_area_m2;
  const gfaUi         =     value / +area.gfa;

  return (isFinite(conditionedUi) && conditionedUi) || (isFinite(gfaUi) && gfaUi) || 0;
}

class BaselineProfilesService {
  static async list({
    projectIds, fuelTypes, brand
  }) {
    const [
      baselineData,
      baselineProfiles,
      areasData
    ] = await Promise.all([
      ConsumptionsBaselineProvider.listRemote([
        { method: [ 'byKeyInArray', 'project_id', projectIds ] },
        { method: [ 'byProjectFuelBaselineFullJoin', fuelTypes ] },
        {
          method: [
            'sumGroupBy',
            [ 'ConsumptionsBaseline.project_id', 'targetConsumption.invoice_type' ],
            [ 'consumption_raw' ]
          ]
        }
      ], {
        attributes: [ 'project_id', 'month' ]
      }, false).then(groupByProjectAndFuel),
      BaselineProfilesProvider.listRemote([
        { method: [ 'byKeyInArray', 'project_id', projectIds ] },
        { method: [ 'byFuelType', fuelTypes ] },
        { method: [ 'withEndUse' ] }
      ], {
        attributes: [ 'proportion', 'endUseProfileId', 'id', 'project_id' ],
        where:      { brand }
      }, false).then(groupByProjectAndFuel),
      BuildingsProvider.listRemote([
        { method: [ 'byKeyInArray', 'project_id', projectIds ] },
        { method: [ 'sumGroupBy', [ 'project_id' ], [ 'gfa', 'conditioned_area_m2' ] ] }
      ]).then(({ rows }) => groupByProject(rows))
    ]);

    // magic here
    const actualValues = Object.entries(baselineProfiles).reduce((acc, [ k, v ]) => {
      const l = Object.entries(v).reduce((acc2, [ k2, v2 ]) => {
        const d = v2.map((item) => {
          const calculatedConsumption = get(baselineData, `${ k }.${ k2 }`, [])
            .reduce((acc3, c) => +acc3 + c.consumption_raw, 0) * item.proportion / 100;
          return {
            ...item,
            ui: getUIValue(calculatedConsumption, areasData[ k ]),
            calculatedConsumption
          };
        });
        return [
          ...acc2, ...d
        ];
      }, []);
      return [
        ...acc, ...l
      ];
    }, []);

    return actualValues;
  }
}

export default BaselineProfilesService;
