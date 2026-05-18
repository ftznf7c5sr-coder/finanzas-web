import { configure } from 'quasar/wrappers'

export default configure(function () {
  return {
    boot: ['pinia', 'firebase', 'apexcharts', 'seed'],

    css: ['app.scss'],

    extras: ['material-icons'],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20'
      },
      vueRouterMode: 'hash',
      publicPath: process.env.PUBLIC_PATH || '/'
    },

    devServer: {
      open: true
    },

    framework: {
      config: {
        notify: { position: 'top' }
      },
      plugins: ['Notify', 'Dialog', 'Loading']
    },

    animations: [],

    capacitor: {
      hideSplashScreenOnAppLoad: true
    }
  }
})
