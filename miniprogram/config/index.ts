import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'
import path from 'path'
import { isIP } from 'node:net'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig(async (merge) => {
  const configuredApiBaseUrl = process.env.TARO_APP_API_BASE_URL?.trim()
  if (process.env.NODE_ENV === 'production' && !configuredApiBaseUrl) {
    throw new Error('TARO_APP_API_BASE_URL is required for production mini program builds')
  }

  const apiBaseUrl = (configuredApiBaseUrl || 'http://127.0.0.1:3001').replace(/\/+$/, '')
  if (process.env.NODE_ENV === 'production') {
    const apiUrl = new URL(apiBaseUrl)
    if (
      apiUrl.protocol !== 'https:'
      || isIP(apiUrl.hostname) !== 0
      || apiUrl.hostname === 'localhost'
    ) {
      throw new Error('Production mini program API URL must use an HTTPS domain name')
    }
  }

  const baseConfig = {
    projectName: 'miniprogram',
    date: '2026-8-20',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {
      __CANLIE_API_BASE_URL__: JSON.stringify(apiBaseUrl)
    },
    copy: {
      patterns: [],
      options: {}
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    // 全局注入 SCSS 设计令牌变量（所有组件/页面 scss 可直接使用 $primary 等）
    sass: {
      resource: path.resolve(__dirname, '..', 'src', 'styles', 'variables.scss'),
      projectDirectory: path.resolve(__dirname, '..')
    },
    mini: {
      miniCssExtractPluginOption: {
        ignoreOrder: true
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunk].[hash:8].js'
      },
      miniCssExtractPluginOption: {},
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false
        }
      }
    }
  }
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
