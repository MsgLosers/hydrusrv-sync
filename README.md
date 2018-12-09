# hydrusrv-sync [![Build status][travis-badge]][travis] [![Docker Hub build][docker-hub-badge]][docker-hub] [![Known vulnerabilities][snyk-badge]][snyk] [![JavaScript Standard Style][standardjs-badge]][standardjs] [![FOSSA status][fossa-badge]][fossa]

> A tool to sync content from [hydrus server][hydrus-server] to
> [hydrusrv][hydrusrv]

hydrusrv-sync is a tool to sync content from [hydrus server][hydrus-server]'s
databases to [hydrusrv][hydrusrv]'s content database. It can be run manually
or automated (e.g., via cron job), depending on your needs.

## Table of contents

+ [Install](#install)
  + [Dependencies](#dependencies)
  + [Updating](#updating)
    + [Upgrading from 1.x to 2.x](#upgrading-from-1x-to-2x)
+ [Usage](#usage)
  + [Configuration](#configuration)
  + [Run](#run)
    + [Running with Docker](#running-with-docker)
+ [Caveats](#caveats)
+ [Maintainer](#maintainer)
+ [Contribute](#contribute)
+ [License](#license)

## Install

The easiest way to install is via cloning this repository:

```zsh
user@local:~$ git clone https://github.com/mserajnik/hydrusrv-sync.git
user@local:~$ cd hydrusrv-sync
user@local:hydrusrv-sync$ yarn
```

If you encounter any errors during installation, those are likely caused by
packages hydrusrv uses that utilize native bindings (e.g.,
[better-sqlite3][better-sqlite3]).

Please check the error message and contact the maintainers of those packages
directly if you cannnot resolve your issues.

### Dependencies

+ [hydrusrv][hydrusrv] (`5.x` for hydrusrv-sync `2.x`)
+ [hydrus server][hydrus-server] (installing and running the server is quite
  difficult and not recommended for people who have no prior experience with
  hydrus; see [here][hydrus-server-installation] for installation instructions)
+ [Node.js][node-js]
+ [Yarn][yarn]

I usually use the latest versions of Node.js and Yarn; if there has not been an
update to this repository in a while and something breaks on the latest
Node/Yarn version, please [let me know][issues].

### Updating

If you have installed via cloning the repository, you can update via Git:

```zsh
user@local:hydrusrv-sync$ git pull
user@local:hydrusrv-sync$ yarn
```

Always make sure to run `yarn` after updating to install any packages you might
be missing.

hydrusrv-sync follows [semantic versioning][semantic-versioning] and any
breaking changes that require additional attention will be released under a new
major version (e.g., `2.0.0`). Minor version updates (e.g., `1.1.0` or `1.2.0`)
are therefore always safe to simply install via the routine mentioned before.

When necessary, this section will be expanded with upgrade guides to new major
versions.

#### Upgrading from 1.x to 2.x

Upgrading from `1.x` to `2.x` can be done via `git pull && yarn`.

The major version bump was made due to the incompatibility of `1.x` with
hydrusrv `5.x`. So if you are using that, you need to upgrade hydrusrv-sync to
`2.x`.

## Usage

### Configuration

Duplicate `.env.example` as `.env`. Make use of the following options to
configure your installation:

+ `HYDRUSRV_CONTENT_DB_PATH=`: sets the path to hydrusrv's content database.
  __Absolute path required.__
+ `HYDRUS_SERVER_DB_PATH=`: sets the path to the hydrus server main database
  (called `server.db`). __Absolute path required.__
+ `HYDRUS_MASTER_DB_PATH=`: sets the path to the hydrus server master database
  (called `server.master.db`). __Absolute path required.__
+ `HYDRUS_MAPPINGS_DB_PATH=`: sets the path to the hydrus server mappings
  database (called `server.mappings.db`). __Absolute path required.__
+ `HYDRUS_TAG_REPOSITORY=2`: the ID of the hydrus server tag repository
  hydrusrv-sync should use.
+ `HYDRUS_FILE_REPOSITORY=3`: the ID of the hydrus server file repository
  hydrusrv-sync should use.
+ `HYDRUS_SUPPORTED_MIME_TYPES=1,2,3,4,9,14,18,20,21,23,25,26,27`: the IDs of
  the MIME types hydrusrv-sync should support. See [here][supported-mime-types]
  for the complete list of MIME types you can choose from.

### Run

You can run hydrusrv-sync manually:

```zsh
user@local:hydrusrv-sync$ ./bin/sync
```

hydrusrv-sync will output information about how long the different steps take
and how many files, tags and mappings are synced.

Generally, a sync should be really fast (a few seconds) on small databases with
only a few thousand files/tags. It will slow down considerably on large
databases, but if you only intend to sync once or twice a day, this should not
become an issue unless we are talking about tens of millions of files/tags.

Here is an example of a sync with a fairly large database:

```
12/09/2018, 12:50:17 AM: running sync...

create initial tables (if necessary): 0.003s
drop zombie tables: 0.000s
attach hydrus databases: 0.004s
get namespaces: 5.758s
create new tables: 0.001s
fill new namespaces table: 0.001s
fill new tags table: 18.181s
fill new files table: 17.492s
fill new mappings table: 32.228s
detach hydrus databases: 0.015s
replace current tables: 0.006s
clean up: 2.360s
total: 76.059s

[ namespaces: 15, tag: 73240, files: 216822, mappings: 7655592 ]
```

hydrusrv-sync always copies over all the data without comparing changes. This
is because due to the nature of how hydrus server stores its data, running
comparisons would have been very unefficient and slow.

Drive longevity should generally not become an issue since you would have to
run syncs with enormous databases very frequently. E.g., even a hydrusrv
content dabase that contains a million files should typically only be around
1-3 GB in size, depending on the amount of tags and mappings. Running a sync
that fills this database in shorter intervals (let us say every two hours) will
only result in 12-36 GB written every day.

To quote [Ontrack's article on SSD lifetime][ontrack-ssd-lifetime]:

> "A typical TBW figure for a 250 GB SSD lies between 60 and 150 terabytes
> written. That means: To get over a guaranteed TBW of 70, a user would have to
> write 190(!) GB daily over a period of one year (In other words, to fill two
> thirds of the SSD with new data every day)."

However, if you are still worried and have enough RAM available, you can also
put the hydrusrv content database on a [tmpfs][tmpfs] or any other kind of
RAM-based storage; since all the data is copied over with every sync anyway
there is no actual need to persist the data between reboots.

Depending on your use case, setting up a cron job or using other tools to run
hydrusrv-sync automatically might make more sense that doing so manually.

When hydrusrv-sync runs it creates a `.sync-lock` file. This file is used to
determine if a sync is already in progress and hydrusrv-sync will exit early
if that is the case. Therefore, trying to run it in very short intervals will
usually not cause any issues, even if a previous sync has not yet been
completed.

The `.sync-lock` file will be deleted if a sync successfully completes or on
error, but if something should unexpectedly cause this not to happen, you can
of course also delete it manually.

### Running with Docker

You can also run hydrusrv-sync with [Docker][docker] if you want to. A
[Docker image][docker-hub] is available on Docker Hub. The image is set up
to run hydrusrv-sync once on container startup and via a configurable cron job
afterwards.

See [here][hydrusrv-docker] for a [Docker Compose][docker-compose] setup that
combines hydrus server, hydrusrv and hydrusrv-sync into an easy to use package.

If you want to create your own setup, please take a look at the
[Dockerfile](Dockerfile) and the
[entrypoint file](.docker/docker-entrypoint.sh) to figure out how to configure
it.

## Caveats

hydrusrv was mainly developed for my personal use and might therefore lack some
features others might want to see. Some of these could be:

+ hydrusrv-sync __needs__ one tag and one file repository to work. Trying to
  run it without either will result in errors. It also cannot support
  additional repositories.
+ hydrusrv-sync discards namespaces containing other characters than
  alphanumerics and underscores to not falsely assume emote tags like `>:)`
  have a namespace and to prevent errors (namespaces are used as column names
  and SQLite does not allow most characters aside from alphanumerics in those;
  mapping such special characters would have been possible, but did not seem
  worth the effort).
+ hydrus server supports many more MIME types than the ones I have limited
  hydrusrv-sync to. It only supports major image and video formats hydrusrv is
  supposed to serve.

In addition, you might run into issues or limitations when using hydrusrv-sync.
Here are the ones I am currently aware of:

+ When hydrusrv-sync copies the hydrus server data, it does so without locking
  the database to prevent issues in hydrus server (which most likely does not
  expect another application to randomly lock the database when it is trying to
  write). The update can also take a while on larger databases, which might
  lead to hydrus server changing or adding data while hydrusrv-sync is still
  running. When this happens, hydrusrv-sync will leave the existing data in
  hydrusrv's content database as it is and you will have to run it again.
+ hydrus client/server is updated frequently (usually once a week) and while I
  try to keep hydrusrv-sync up-to-date with any database changes (that
  thankfully do not occur very frequently), I suggest keeping an old copy of
  hydrus server when updating in case anything breaks. In addition, please
  [let me know][issues] if that happens.

## Maintainer

[mserajnik][maintainer]

## Contribute

You are welcome to help out!

[Open an issue][issues] or submit a pull request.

## License

[MIT](LICENSE.md) © Michael Serajnik

[travis]: https://travis-ci.com/mserajnik/hydrusrv-sync
[travis-badge]: https://travis-ci.com/mserajnik/hydrusrv-sync.svg

[docker-hub-badge]: https://img.shields.io/docker/automated/mserajnik/hydrusrv-sync.svg

[snyk]: https://snyk.io/test/github/mserajnik/hydrusrv-sync
[snyk-badge]: https://snyk.io/test/github/mserajnik/hydrusrv-sync/badge.svg

[standardjs]: https://standardjs.com
[standardjs-badge]: https://img.shields.io/badge/code_style-standard-brightgreen.svg

[fossa]: https://app.fossa.io/projects/git%2Bgithub.com%2Fmserajnik%2Fhydrusrv-sync
[fossa-badge]: https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmserajnik%2Fhydrusrv-sync.svg?type=shield

[hydrus-server]: http://hydrusnetwork.github.io/hydrus
[hydrusrv]: https://github.com/mserajnik/hydrusrv
[better-sqlite3]: https://github.com/JoshuaWise/better-sqlite3/wiki/Troubleshooting-installation
[hydrus-server-installation]: http://hydrusnetwork.github.io/hydrus/help/server.html
[node-js]: https://nodejs.org/en/
[yarn]: https://yarnpkg.com/
[semantic-versioning]: https://semver.org/
[ontrack-ssd-lifetime]: https://www.ontrack.com/blog/2018/02/07/how-long-do-ssds-really-last/
[tmpfs]: http://man7.org/linux/man-pages/man5/tmpfs.5.html
[docker]: https://www.docker.com/
[docker-hub]: https://hub.docker.com/r/mserajnik/hydrusrv-sync/
[hydrusrv-docker]: https://github.com/mserajnik/hydrusrv-docker
[docker-compose]: https://docs.docker.com/compose/
[supported-mime-types]: https://github.com/mserajnik/hydrusrv-sync/blob/master/src/config/index.js#L5-L17

[maintainer]: https://github.com/mserajnik
[issues]: https://github.com/mserajnik/hydrusrv-sync/issues/new
