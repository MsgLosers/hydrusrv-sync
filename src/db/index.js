const Database = require('better-sqlite3')

const config = require('../config')

module.exports = {
  connect () {
    this.hydrusrv = new Database(config.hydrusrvContentDbPath, {
      fileMustExist: true
    })

    this.setWalMode()
    this.addFunctions()
  },
  close () {
    this.hydrusrv.close()
  },
  setWalMode () {
    this.hydrusrv.pragma('journal_mode = WAL')
  },
  addFunctions () {
    this.hydrusrv.function(
      'regexp', (pattern, string) => {
        if (pattern && string) {
          return string.match(new RegExp(pattern)) !== null ? 1 : 0
        }

        return null
      }
    )
  },
  attachHydrusDatabases () {
    this.hydrusrv.prepare(
      `ATTACH '${config.hydrusServerDbPath}' AS hydrus_server_db`
    ).run()
    this.hydrusrv.prepare(
      `ATTACH '${config.hydrusMasterDbPath}' AS hydrus_master_db`
    ).run()
    this.hydrusrv.prepare(
      `ATTACH '${config.hydrusMappingsDbPath}' AS hydrus_mappings_db`
    ).run()
  },
  detachHydrusDatabases () {
    this.hydrusrv.prepare('DETACH hydrus_server_db').run()
    this.hydrusrv.prepare('DETACH hydrus_master_db').run()
    this.hydrusrv.prepare('DETACH hydrus_mappings_db').run()
  }
}
