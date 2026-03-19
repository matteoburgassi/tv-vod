/**
 * @format
 */

import {AppRegistry} from 'react-native';
import {configureApi} from 'tv-vod-api';
import {configure} from 'tv-vod-auth';
import App from './App';
import {name as appName} from './app.json';

configureApi({
  apiBaseUrl: 'https://galaxy-api.galaxydve.com',
  apiKey: 'api_key_iatest',
  apiSecret: 'GaLxAiDviTS12*',
  campaignId: '4679',
  countryCode: 'fr',
  languageCode: 'fr',
});

configure({
  serviceId: '39',
  authHost:
    'https://smartvideo-cors-proxy.matteoburgassi.workers.dev/auth',
  smartVideoHost:
    'https://smartvideo-cors-proxy.matteoburgassi.workers.dev/smartvideo',
  authLogin: 'PlayVodMax_Ios',
  authSecret: '912ai6xn',
  drmEnv: 'DRMtoday',
});

AppRegistry.registerComponent(appName, () => App);
