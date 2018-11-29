const availableMimeTypes = {
  1: 'image/jpeg',
  2: 'image/png',
  3: 'image/gif',
  4: 'image/bmp',
  9: 'video/x-flv',
  14: 'video/mp4',
  18: 'video/x-ms-wmv',
  20: 'video/x-matroska',
  21: 'video/webm',
  23: 'image/apng',
  25: 'video/mpeg',
  26: 'video/quicktime',
  27: 'video/x-msvideo'
}

const hydrusTagRepository = process.env.HYDRUS_TAG_REPOSITORY
const hydrusFileRepository = process.env.HYDRUS_FILE_REPOSITORY

module.exports = {
  hydrusrvDb: {
    contentDbPath: process.env.HYDRUSRV_CONTENT_DB_PATH
  },
  hydrus: {
    filesPath: process.env.HYDRUS_FILES_PATH,
    availableMimeTypes: availableMimeTypes,
    supportedMimeTypes: process.env.HYDRUS_SUPPORTED_MIME_TYPES
      .split(',')
      .filter(mimeType => (parseInt(mimeType) in availableMimeTypes))
  },
  hydrusDb: {
    serverDbPath: process.env.HYDRUS_SERVER_DB_PATH,
    masterDbPath: process.env.HYDRUS_MASTER_DB_PATH,
    mappingsDbPath: process.env.HYDRUS_MAPPINGS_DB_PATH
  },
  hydrusDbTables: {
    currentFiles: `hydrus_server_db.current_files_${hydrusFileRepository}`,
    filesInfo: 'hydrus_server_db.files_info',
    tags: 'hydrus_master_db.tags',
    hashes: 'hydrus_master_db.hashes',
    currentMappings:
      `hydrus_mappings_db.current_mappings_${hydrusTagRepository}`,
    repositoryTagIdMap:
      `hydrus_master_db.repository_tag_id_map_${hydrusTagRepository}`,
    repositoryHashIdMapTags:
      `hydrus_master_db.repository_hash_id_map_${hydrusTagRepository}`,
    repositoryHashIdMapFiles:
      `hydrus_master_db.repository_hash_id_map_${hydrusFileRepository}`
  }
}
