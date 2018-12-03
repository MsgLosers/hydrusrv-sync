# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2018-12-03

### Changed

+ Added indexes on `mappings` fields for increased query performance in
  hydrusrv
+ Dropped `hydrusrv` prefix from tables to be consistent with the hydrusrv
  application database naming scheme
+ File hashes in hex form are now computed on sync via SQLite's `HEX()`
  function (in combination with `LOWER()`) for increased performance in
  hydrusrv
+ Updated dependencies

## [1.1.0] - 2018-12-02

### Changed

+ Reduced Docker image size

### Fixed

+ Fixed letter case in readme

## 1.0.0 - 2018-12-01

### Added

+ Initial release

[Unreleased]: https://github.com/mserajnik/hydrusrv-sync/compare/1.2.0...develop
[1.2.0]: https://github.com/mserajnik/hydrusrv-sync/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/mserajnik/hydrusrv-sync/compare/1.0.0...1.1.0
