import express                                                  from 'express';
import cors                                                     from 'cors';
import bodyParser                                               from 'body-parser';
import eemSurvey                                                from './controllers/eemSurvey.controller';
import baselineProfile                                          from './controllers/baselineProfile.controller';
import endUses                                                  from './controllers/endUses.controller';
import eemCosts                                                 from './controllers/eemCosts.controller';
import endUseReductions                                         from './controllers/endUseReduction.controller';
import endUseFuelMap                                            from './controllers/endUsesFuelMap.controller';
import constructionEEMs                                         from './controllers/constructionEEMs.controller.js';
import constructionsCosts                                       from './controllers/constructionsCosts.controller';
import projectFuelRates                                         from './controllers/projectFuelRates.controller';
import edSummary                                                from './controllers/edSummary.controller';
import edBrands                                                 from './controllers/edBrands.controller';
import {
  authenticate, handleError
}                                                               from '../../../utils/middlewares';

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/ed-api/eem-survey', [ authenticate ], eemSurvey);
app.use('/ed-api/baseline-profiles', [ authenticate ], baselineProfile);
app.use('/ed-api/end-use-profiles', [ authenticate ], endUses);
app.use('/ed-api/eem-costs', [ authenticate ], eemCosts);
app.use('/ed-api/end-use-reductions', [ authenticate ], endUseReductions);
app.use('/ed-api/end-use-fuel', [ authenticate ], endUseFuelMap);
app.use('/ed-api/eems', [ authenticate ], constructionEEMs);
app.use('/ed-api/constructions-costs', [ authenticate ], constructionsCosts);
app.use('/ed-api/fuel-rates', [ authenticate ], projectFuelRates);
app.use('/ed-api/summary', [ authenticate ], edSummary);
app.use('/ed-api/brands', [ authenticate ], edBrands);


app.use(handleError);

export default app;
