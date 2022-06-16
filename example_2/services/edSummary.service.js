/* eslint-disable no-restricted-globals */
import groupBy                                                                     from 'lodash/groupBy';
import sumBy                                                                       from 'lodash/sumBy';
import sum                                                                         from 'lodash/sum';
import pick                                                                        from 'lodash/pick';
import max                                                                         from 'lodash/max';
import {
  ProjectFuelRatesProvider
}            from '../../../../utils/providers';

import BaselineProfilesService                                              from './baselineProfiles.service';
import EndUseReductionsService                                              from './endUseReductions.service.js';


const groupByFuel        = ({ rows }) => groupBy(rows.map(({ dataValues }) => dataValues), 'fuelType');
const groupByFuelRaw     = (rows) => groupBy(rows.map((dataValues) => dataValues), 'fuelType');
const groupByFuelRawData = (rows) => groupBy(rows.map(({ dataValues }) => dataValues), 'fuelType');


function getFuelSummary(
  reductionData,
  endUsesByFuel,
  endUsesData,
  getSavingsMetatata
) {
  return reductionData.map(({
    eem, eemId, eemCost, ...rest
  }) => ({
    eem,
    eemCost,
    ...Object.entries(rest).reduce((accRoot, [ k, v ]) => {
      const sumKey             = endUsesByFuel.find(rawKey => rawKey === k);
      const reductionSum       = sumBy(reductionData, k);
      const interactiveEffects = reductionData.reduce((acc, c, i) => {
        if (i === 0) {
          return [ ...acc, c[ k ] ];
        }
        return [
          ...acc,
          ((acc[ i - 1 ] / 100) + ((reductionData[ i ][ k ] / 100) * ((100 -  acc[ i - 1 ]) / 100))) * 100
        ];
      }, []);

      const {
        calculatedConsumption: normalizedConsumptions = 0
      } = endUsesData.find(({ endUse }) => endUse === sumKey) || {};

      const maxEffect           = max(interactiveEffects);
      const normalizedReduction = (v / 100) / (reductionSum / 100) * (maxEffect / 100);

      const sumR = isNaN(normalizedReduction)
        ? 0
        : normalizedConsumptions * normalizedReduction;

      return {
        ...accRoot,
        [ k ]: sumR
      };
    }, {})
  })).map((row) => Object.assign(row, {
    ...getSavingsMetatata(row)
  }), 0).sort(({ payback: a }, { payback: b }) => a - b).map((row, i, source) => Object.assign(row, {
    cummulative: source.slice(0, i + 1)
      .reduce((acc, c) => +acc + c.eemCost, 0) / sumBy(source.slice(0, i + 1), 'totalCost')
  }));
}


class EdSummaryService {
  static async getSummary({
    projectId, fuelTypes, brand, eemIds
  }) {
    const [
      baselineProfiles,
      fuelRates,
      endUseReductions
    ]               = await Promise.all([
      BaselineProfilesService.list({ projectIds: [ projectId ], fuelTypes, brand })
        .then(groupByFuelRaw),
      ProjectFuelRatesProvider.listRemote([
        { method: [ 'withFuelMetric' ] },
        { method: [ 'byKeyInArray', 'fuelType', fuelTypes ] },
        { method: [ 'byKeyInArray', 'projectId', [ projectId ] ] }
      ], { attributes: Object.keys(ProjectFuelRatesProvider.model.rawAttributes) }, false)
        .then(groupByFuel),
      EndUseReductionsService.list({
        projectIds: [ projectId ], fuelTypes, brand, eemIds
      }).then(groupByFuelRawData)
    ]);

    const fuelSummaries = fuelTypes
      .filter((fuelType) => Object.keys(baselineProfiles).includes(fuelType) && Object.keys(endUseReductions).includes(fuelType))
      .reduce((acc, fuelType) => {
        const endUsesData        = baselineProfiles[ fuelType ].map(({ endUse }) => endUse);
        const getSavingsMetatata = (item) => {
          const totalConsumption = sum(Object.values(pick(item, endUsesData)));
          const totalCost        = totalConsumption * (fuelRates[ fuelType ][ 0 ] || {}).rate;
          const payback          = totalCost > 0 && item.eemCost > 0 ? item.eemCost / totalCost : 0;

          return {
            totalCost,
            totalConsumption,
            totalConsumptionKwh: totalConsumption *  (fuelRates[ fuelType ][ 0 ] || {}).kWhModifier,
            payback,
            eemCost:             item.eemCost
          };
        };

        return {
          ...acc,
          [ fuelType ]: getFuelSummary(
            Object.entries(groupBy(endUseReductions[ fuelType ], 'name'))
              .reduce(EndUseReductionsService.endUseReductionReducer, []),
            endUsesData,
            baselineProfiles[ fuelType ],
            getSavingsMetatata
          )
        };
      }, {});

    const totalSummary = Object.entries(groupBy(Object.values(fuelSummaries).reduce((acc, c) => [ ...acc, ...c ], []), 'eem'))
      .reduce((acc, [ k, v ]) => [ ...acc, {
        eem:            k,
        eem_savings:    sumBy(v, 'totalCost'),
        eem_savingsKwh: sumBy(v, 'totalConsumptionKwh'),
        eemCost:        (v[ 0 ] || {}).eemCost,
        payback:        sumBy(v, 'totalCost') > 0 && (v[ 0 ] || {}).eemCost > 0 ? (v[ 0 ] || {}).eemCost / sumBy(v, 'totalCost') : 0
      } ], [])
      .sort(({ payback: a }, { payback: b }) => a - b).map((row, i, source) => Object.assign(row, {
        cummulative: source.slice(0, i + 1)
          .reduce((acc, c) => +acc + c.eemCost, 0) / sumBy(source.slice(0, i + 1), 'eem_savings')
      }));

    return {
      ...fuelSummaries,
      totalSummary,
      baselineProfiles
    };
  }
}

export default EdSummaryService;
