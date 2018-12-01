const config = require('./src/config')
const db = require('./src/db')
const profiler = require('./src/util/profiler')

module.exports = {
  runSync () {
    profiler.init()

    profiler.log('{datetime}: running sync...\n\n')

    db.connect()

    this.createTables(true)
    profiler.log('create initial tables (if necessary): {dt}\n')

    this.dropZombieTables()
    profiler.log('drop zombie tables: {dt}\n')

    db.attachHydrusDatabases()
    profiler.log('attach hydrus databases: {dt}\n')

    const namespaces = this.getNamespaces()
    profiler.log('get namespaces: {dt}\n')

    this.createTables(false, namespaces)
    profiler.log('create new tables: {dt}\n')

    this.fillNewNamespacesTable(namespaces)
    profiler.log('fill new namespaces table: {dt}\n')

    this.fillNewTagsTable()
    profiler.log('fill new tags table: {dt}\n')

    this.fillNewFilesTable(namespaces)
    profiler.log('fill new files table: {dt}\n')

    this.fillNewMappingsTable()
    profiler.log('fill new mappings table: {dt}\n')

    db.detachHydrusDatabases()
    profiler.log('detach hydrus databases: {dt}\n')

    this.replaceCurrentTables()
    profiler.log('replace current tables: {dt}\n')

    this.vacuum()
    profiler.log('vacuuming: {dt}\n')

    profiler.log(`total: {t}\n\n`)

    console.info(db.hydrusrv.prepare(
      `SELECT COUNT(*) FROM hydrusrv_namespaces
        UNION
      SELECT COUNT(*) FROM hydrusrv_tags
        UNION
      SELECT COUNT(*) FROM hydrusrv_files
        UNION
      SELECT COUNT(*) FROM hydrusrv_mappings`
    ).pluck().all().map(
      (count, i) => ['namespaces: ', 'tag: ', 'files: ', 'mappings: '][i] +
        count
    ).join(', '))
  },
  abortSync () {
    process.nextTick(() => {
      db.close()
    })
  },
  createTables (initial = true, namespaces) {
    const suffix = initial ? '' : '_new'

    db.hydrusrv.prepare(
      `CREATE TABLE IF NOT EXISTS hydrusrv_namespaces${suffix} (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        name TEXT NOT NULL UNIQUE
      )`
    ).run()

    db.hydrusrv.prepare(
      `CREATE TABLE IF NOT EXISTS hydrusrv_tags${suffix} (
        id INTEGER NOT NULL PRIMARY KEY UNIQUE,
        name TEXT NOT NULL UNIQUE,
        file_count INTEGER NOT NULL,
        random TEXT NOT NULL
      )`
    ).run()

    const namespaceColumns = []

    if (Array.isArray(namespaces)) {
      for (const namespace of namespaces) {
        namespaceColumns.push(
          `namespace_${namespace.split(' ').join('_')} TEXT`
        )
      }
    }

    db.hydrusrv.prepare(
      `CREATE TABLE IF NOT EXISTS hydrusrv_files${suffix} (
        id INTEGER NOT NULL PRIMARY KEY UNIQUE,
        tags_id INTEGER UNIQUE DEFAULT NULL,
        hash BLOB_BYTES UNIQUE NOT NULL,
        mime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        random TEXT NOT NULL
        ${namespaceColumns.length ? ',' + namespaceColumns.join(',') : ''}
      )`
    ).run()

    db.hydrusrv.prepare(
      `CREATE TABLE IF NOT EXISTS hydrusrv_mappings${suffix} (
        file_tags_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY(file_tags_id) REFERENCES hydrusrv_files${suffix}(tags_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES hydrusrv_tags${suffix}(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`
    ).run()
  },
  dropZombieTables () {
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_namespaces_new').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_mappings_new').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_tags_new').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_files_new').run()
  },
  getNamespaces () {
    return db.hydrusrv.prepare(
      `SELECT name FROM (
        SELECT DISTINCT SUBSTR(
          ${config.hydrusDbTables.tags}.tag,
          0,
          INSTR(${config.hydrusDbTables.tags}.tag, ':')
        ) AS name
        FROM
          ${config.hydrusDbTables.currentMappings}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryTagIdMap}
        NATURAL JOIN
          ${config.hydrusDbTables.tags}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryHashIdMapTags}
        NATURAL JOIN
          ${config.hydrusDbTables.filesInfo}
        WHERE
          ${config.hydrusDbTables.tags}.tag LIKE '%_:_%'
        AND
          ${config.hydrusDbTables.filesInfo}.mime IN (
            ${config.hydrus.supportedMimeTypes}
          )
      )
      WHERE
        name REGEXP '^[a-zA-Z0-9_]+$'
      ORDER BY
        name`
    ).pluck().all()
  },
  fillNewNamespacesTable (namespaces) {
    for (const namespace of namespaces) {
      db.hydrusrv.prepare(
        'INSERT INTO hydrusrv_namespaces_new (name) VALUES (?)'
      ).run(namespace)
    }
  },
  fillNewTagsTable () {
    db.hydrusrv.prepare(
      `INSERT INTO hydrusrv_tags_new
        SELECT
          ${config.hydrusDbTables.currentMappings}.service_tag_id,
          ${config.hydrusDbTables.tags}.tag,
          COUNT(*),
          SUBSTR(''||RANDOM(), -4)
        FROM
          ${config.hydrusDbTables.currentMappings}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryTagIdMap}
        NATURAL JOIN
          ${config.hydrusDbTables.tags}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryHashIdMapTags}
        NATURAL JOIN
          ${config.hydrusDbTables.filesInfo}
        WHERE
          ${config.hydrusDbTables.filesInfo}.mime IN (
            ${config.hydrus.supportedMimeTypes}
          )
        GROUP BY
          ${config.hydrusDbTables.tags}.tag`
    ).run()
  },
  fillNewFilesTable (namespaces) {
    const namespaceColumns = []

    for (const namespace of namespaces) {
      namespaceColumns.push(
        `namespace_${namespace.split(' ').join('_')}`
      )
    }

    db.hydrusrv.prepare(
      `INSERT INTO hydrusrv_files_new (
        id,
        tags_id,
        hash,
        mime,
        size,
        width,
        height,
        random
        ${namespaceColumns.length ? ',' + namespaceColumns.join(',') : ''}
      )
        SELECT
          ${config.hydrusDbTables.currentFiles}.service_hash_id,
          ${config.hydrusDbTables.repositoryHashIdMapTags}.service_hash_id,
          ${config.hydrusDbTables.hashes}.hash,
          ${config.hydrusDbTables.filesInfo}.mime,
          ${config.hydrusDbTables.filesInfo}.size,
          ${config.hydrusDbTables.filesInfo}.width,
          ${config.hydrusDbTables.filesInfo}.height,
          SUBSTR(''||random(), -4)
          ${namespaceColumns.length ? ', null AS ' + namespaceColumns.join(', null AS ') : ''}
        FROM
          ${config.hydrusDbTables.hashes}
        NATURAL JOIN
          ${config.hydrusDbTables.filesInfo}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryHashIdMapFiles}
        LEFT JOIN
          ${config.hydrusDbTables.repositoryHashIdMapTags}
          ON ${config.hydrusDbTables.repositoryHashIdMapTags}.master_hash_id =
            ${config.hydrusDbTables.hashes}.master_hash_id
        NATURAL JOIN
          ${config.hydrusDbTables.currentFiles}
        WHERE
          ${config.hydrusDbTables.filesInfo}.mime IN (
            ${config.hydrus.supportedMimeTypes}
          )`
    ).run()

    db.hydrusrv.prepare(
      `CREATE TEMP TABLE temp_namespaces_reduced AS
        SELECT
          master_tag_id, tag
        FROM
          ${config.hydrusDbTables.tags}
        WHERE
          tag LIKE '%_:_%'`
    ).run()

    const selectStatement = db.hydrusrv.prepare(
      `SELECT
        REPLACE(temp_namespaces_reduced.tag, :namespace, '') AS tag,
        ${config.hydrusDbTables.repositoryHashIdMapTags}.service_hash_id AS tags_id
      FROM
        ${config.hydrusDbTables.currentMappings}
      NATURAL JOIN
        ${config.hydrusDbTables.repositoryTagIdMap}
      NATURAL JOIN
        temp_namespaces_reduced
      NATURAL JOIN
        ${config.hydrusDbTables.repositoryHashIdMapTags}
      WHERE
        temp_namespaces_reduced.tag LIKE :namespace || '_%'
      GROUP BY tags_id`
    )

    const updateStatements = []

    namespaces.map((namespace, i) => {
      updateStatements[namespaces[i]] = db.hydrusrv.prepare(
        `UPDATE hydrusrv_files_new
          SET
            namespace_${namespace.replace(' ', '_')} = :tag
          WHERE
            tags_id = :tags_id`
      )
    })

    db.hydrusrv.transaction(namespaces => {
      for (const namespace of namespaces) {
        const tags = selectStatement.all({
          namespace: `${namespace}:`
        })

        db.hydrusrv.transaction(tags => {
          for (const tag of tags) {
            updateStatements[namespace].run(tag)
          }
        })(tags)
      }
    })(namespaces)

    db.hydrusrv.prepare('DROP TABLE temp_namespaces_reduced').run()
  },
  fillNewMappingsTable () {
    db.hydrusrv.prepare(
      `INSERT INTO hydrusrv_mappings_new
        SELECT
          ${config.hydrusDbTables.currentMappings}.service_hash_id,
          ${config.hydrusDbTables.currentMappings}.service_tag_id
        FROM
          ${config.hydrusDbTables.currentMappings}
        NATURAL JOIN
          ${config.hydrusDbTables.repositoryHashIdMapTags}
        NATURAL JOIN
          ${config.hydrusDbTables.filesInfo}
        INNER JOIN
          ${config.hydrusDbTables.repositoryHashIdMapFiles}
          ON ${config.hydrusDbTables.repositoryHashIdMapFiles}.master_hash_id =
            ${config.hydrusDbTables.filesInfo}.master_hash_id
        INNER JOIN
          ${config.hydrusDbTables.currentFiles}
          ON ${config.hydrusDbTables.currentFiles}.service_hash_id =
            ${config.hydrusDbTables.repositoryHashIdMapFiles}.service_hash_id
        WHERE
          ${config.hydrusDbTables.filesInfo}.mime IN (
            ${config.hydrus.supportedMimeTypes}
          )`
    ).run()
  },
  replaceCurrentTables () {
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_namespaces').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_mappings').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_tags').run()
    db.hydrusrv.prepare('DROP TABLE IF EXISTS hydrusrv_files').run()

    db.hydrusrv.prepare(
      'ALTER TABLE hydrusrv_namespaces_new RENAME TO hydrusrv_namespaces'
    ).run()

    db.hydrusrv.prepare(
      'ALTER TABLE hydrusrv_tags_new RENAME TO hydrusrv_tags'
    ).run()

    db.hydrusrv.prepare(
      'ALTER TABLE hydrusrv_files_new RENAME TO hydrusrv_files'
    ).run()

    db.hydrusrv.prepare(
      'ALTER TABLE hydrusrv_mappings_new RENAME TO hydrusrv_mappings'
    ).run()
  },
  vacuum () {
    db.hydrusrv.prepare('VACUUM').run()
  }
}
