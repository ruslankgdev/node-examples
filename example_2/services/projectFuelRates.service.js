import { ProjectFuelRatesProvider }                                 from '../../../../utils/providers';

const attributes = Object.keys(ProjectFuelRatesProvider.model.rawAttributes);

class ProjectFuelRateService {
  static async get(userId, projectId, fuelType) {
    const { rows: [ data ] }   = await ProjectFuelRatesProvider.listRemote([
      { method: [ 'withProjectMapByUser', null, null, userId ] },
      { method: [ 'withFuelMetric' ] }
    ], { where: { projectId,  fuelType }, attributes });

    return data || (() => ProjectFuelRatesProvider
      .upsertRemote({ projectId,  fuelType })
      .then(() => ProjectFuelRateService.get(userId, projectId, fuelType)))();
  }
}

export default ProjectFuelRateService;
