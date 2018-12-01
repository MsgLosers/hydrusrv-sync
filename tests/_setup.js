const path = require('path')

module.exports = {
  setTestEnvironment () {
    process.env.NODE_ENV = 'test'

    process.env.HYDRUSRV_CONTENT_DB_PATH = path.resolve(
      __dirname, 'storage/content.db'
    )

    process.env.HYDRUS_SERVER_DB_PATH = path.resolve(
      __dirname, 'hydrus-server-dummy/server.db'
    )
    process.env.HYDRUS_MASTER_DB_PATH = path.resolve(
      __dirname, 'hydrus-server-dummy/server.master.db'
    )
    process.env.HYDRUS_MAPPINGS_DB_PATH = path.resolve(
      __dirname, 'hydrus-server-dummy/server.mappings.db'
    )

    process.env.HYDRUS_TAG_REPOSITORY = 2
    process.env.HYDRUS_FILE_REPOSITORY = 3
    process.env.HYDRUS_SUPPORTED_MIME_TYPES = '1,2,3,4,14,21,23'
  }
}
